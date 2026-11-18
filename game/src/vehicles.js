// Cars: the player's arcade driving, traffic that follows the road grid, collisions and
// explosions. Police cars are cars too, but police.js steers them.

import { CAR, CRIME, PLAYER, WORLD } from './config.js';
import { ROAD_LINES, collideCircle, nearestRoadPoint } from './city.js';
import { addSkid, spawnExplosion, spawnSmoke, spawnSparks } from './particles.js';
import { addFloat, makeCar, say, addHeat } from './state.js';
import { damageCar } from './player.js';

function carCircles(car) {
  const fx = Math.cos(car.angle);
  const fy = Math.sin(car.angle);
  return [
    { x: car.x + fx * 15, y: car.y + fy * 15, r: 14 },
    { x: car.x - fx * 15, y: car.y - fy * 15, r: 14 },
  ];
}

/** Push a car out of buildings it overlaps; heavy hits cost hp and speed. */
export function crashIntoBuildings(state, car, audio) {
  const circles = carCircles(car);
  let hit = false;
  for (const c of circles) {
    const fixed = collideCircle(state.city, c.x, c.y, c.r);
    if (fixed.x !== c.x || fixed.y !== c.y) {
      hit = true;
      // Push the whole car back along the correction.
      car.x += fixed.x - c.x;
      car.y += fixed.y - c.y;
    }
  }
  if (hit && Math.abs(car.speed) > 120) {
    const damage = Math.min(24, Math.abs(car.speed) * 0.05);
    car.hp -= damage;
    car.speed *= 0.45;
    spawnSparks(state, car.x, car.y, 8, '#ffd166');
    if (audio) audio.crash();
    if (car === state.player.inCar) {
      state.shake = Math.max(state.shake || 0, 5);
    }
    if (car.hp <= 0) damageCar(state, car, audio);
  } else if (hit) {
    car.speed *= 0.7;
  }
  return hit;
}

function updatePlayerCar(state, input, audio, dt) {
  const car = state.player.inCar;
  if (!car || car.dead) return;
  const move = input.move();
  const throttle = -move.y; // W/up accelerates, S/down brakes and reverses.
  const steer = move.x;
  const top = car.topSpeed;
  if (throttle > 0) car.speed += CAR.accel * throttle * dt;
  else if (throttle < 0) {
    if (car.speed > 5) car.speed -= CAR.brake * dt; // braking
    else car.speed -= CAR.reverseAccel * dt; // reversing
  }
  // Drag and rolling resistance.
  car.speed -= car.speed * 0.55 * dt;
  if (Math.abs(car.speed) < 4 && throttle === 0) car.speed = 0;
  car.speed = Math.max(-CAR.maxReverse, Math.min(top, car.speed));
  // Steering bites harder as you go faster, and reverses when reversing.
  const steerAuthority = Math.min(1, Math.abs(car.speed) / 160);
  car.angle += steer * CAR.steer * steerAuthority * Math.sign(car.speed || 1) * dt;
  const fx = Math.cos(car.angle);
  const fy = Math.sin(car.angle);
  car.x += fx * car.speed * dt;
  car.y += fy * car.speed * dt;
  // Drifting: hard steering at speed leaves marks and smoke.
  if (Math.abs(steer) > 0.6 && Math.abs(car.speed) > 260) {
    addSkid(state, car.x - fx * 15, car.y - fy * 15, car.angle);
    if (Math.random() < 0.4) spawnSmoke(state, car.x - fx * 18, car.y - fy * 18, 1, '#cfcfcf');
  }
  crashIntoBuildings(state, car, audio);
  // Repair pickups work from the car.
  for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
    const pk = state.pickups[i];
    if (pk.kind !== 'repair') continue;
    if (Math.hypot(pk.x - car.x, pk.y - car.y) < 34) {
      car.hp = Math.min(CAR.hp, car.hp + pk.amount);
      addFloat(state, car.x, car.y - 26, `+${pk.amount} REPAIR`, '#58b368');
      if (audio) audio.pickup();
      state.pickups.splice(i, 1);
    }
  }
  // Burning car: smoke, then it blows.
  if (car.hp < 35 && Math.random() < 0.3) {
    spawnSmoke(state, car.x, car.y - 6, 1, '#3a3a3a');
  }
  if (audio) audio.engine(Math.abs(car.speed) / top, car === state.player.inCar);
}

function updateTrafficCar(state, car, dt) {
  // Position is derived from the road the car is on, so traffic never leaves the grid.
  const prevAlong = car.along;
  let target = car.cruise || 180;
  // Slow for the car ahead on the same lane.
  for (const other of state.cars) {
    if (other === car || other.dead || other.traffic !== true) continue;
    if (other.axis !== car.axis || other.line !== car.line || other.dir !== car.dir) continue;
    const gap = (other.along - car.along) * car.dir;
    if (gap > 0 && gap < 78) target = Math.min(target, Math.max(0, other.speed ?? 0));
  }
  // Hesitate at intersections sometimes, like a red light.
  if (car.wait > 0) {
    car.wait -= dt;
    target = 0;
  }
  car.speed += (target - car.speed) * Math.min(1, 2.2 * dt);
  car.along += car.dir * car.speed * dt;
  // Crossing a road line: maybe turn onto it.
  for (const line of ROAD_LINES) {
    const crossed = (prevAlong - line) * (car.along - line) < 0;
    if (!crossed) continue;
    if (state.random() < 0.28) {
      car.along = line;
      if (car.axis === 'x') {
        car.axis = 'y';
        car.line = line;
        car.along = car.y;
        car.dir = state.random() < 0.5 ? 1 : -1;
      } else {
        car.axis = 'x';
        car.line = line;
        car.along = car.x;
        car.dir = state.random() < 0.5 ? 1 : -1;
      }
      if (state.random() < 0.2) car.wait = 0.6 + state.random() * 1.2;
    }
    break;
  }
  if (car.axis === 'x') {
    car.angle = car.dir > 0 ? 0 : Math.PI;
    car.x = car.along;
    car.y = car.line + (car.dir > 0 ? 12 : -12);
  } else {
    car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    car.x = car.line + (car.dir > 0 ? 12 : -12);
    car.y = car.along;
  }
  // Wrap around the far edge so traffic never runs out.
  if (car.along < 40) { car.along = WORLD.size - 60; car.dir = -1; }
  if (car.along > WORLD.size - 40) { car.along = 60; car.dir = 1; }
}

function collideCars(state, audio, dt) {
  const cars = state.cars;
  for (let i = 0; i < cars.length; i += 1) {
    for (let j = i + 1; j < cars.length; j += 1) {
      const a = cars[i];
      const b = cars[j];
      if (a.dead || b.dead) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d >= 44 || d === 0) continue;
      const push = (44 - d) / 2;
      const nx = dx / d;
      const ny = dy / d;
      // Traffic cars are glued to their road: only shove the player's car and parked ones.
      if (!(a.traffic && a.kind !== 'police')) { a.x -= nx * push; a.y -= ny * push; }
      if (!(b.traffic && b.kind !== 'police')) { b.x += nx * push; b.y += ny * push; }
      const impact = Math.abs((a.speed || 0) - (b.speed || 0));
      // One hard hit per half second per car: without this, two cars grinding
      // against each other apply the impact damage every single step.
      if (impact > 90 && (a.hitCd || 0) <= 0 && (b.hitCd || 0) <= 0) {
        a.hp -= impact * 0.02;
        b.hp -= impact * 0.02;
        a.hitCd = 0.5;
        b.hitCd = 0.5;
        spawnSparks(state, (a.x + b.x) / 2, (a.y + b.y) / 2, 6, '#ffd166');
        if (audio) audio.crash();
        if ((a === state.player.inCar || b === state.player.inCar) && impact > 200) {
          addHeat(state, CRIME.damageCar);
        }
        if (a.hp <= 0) damageCar(state, a, audio);
        if (b.hp <= 0) damageCar(state, b, audio);
      }
      if (a === state.player.inCar) a.speed *= 0.6;
      if (b === state.player.inCar) b.speed *= 0.6;
    }
  }
}

function hitPeds(state, audio, dt) {
  const playerCar = state.player.inCar;
  const cars = state.cars;
  for (const car of cars) {
    if (car.dead || Math.abs(car.speed || 0) < 60) continue;
    for (const ped of state.peds) {
      if (ped.state === 'down' || ped.state === 'drive') continue;
      const d = Math.hypot(ped.x - car.x, ped.y - car.y);
      if (d > 26) continue;
      ped.state = 'down';
      ped.downTimer = 2.5;
      ped.x += (ped.x - car.x) * 0.6 + (Math.random() - 0.5) * 20;
      ped.y += (ped.y - car.y) * 0.6 + (Math.random() - 0.5) * 20;
      spawnSparks(state, ped.x, ped.y, 6, '#e5534b');
      state.stats.pedsHit += 1;
      if (car === playerCar) {
        addHeat(state, CRIME.hitPed);
        addFloat(state, ped.x, ped.y - 20, 'HIT!', '#e5534b');
        if (audio) audio.thud();
        car.speed *= 0.85;
      }
    }
  }
}

function updateExplosions(state, audio, dt) {
  for (let i = state.cars.length - 1; i >= 0; i -= 1) {
    const car = state.cars[i];
    if (!car.dead) continue;
    car.deadTimer -= dt;
    if (Math.random() < 0.5) spawnSmoke(state, car.x, car.y, 1, '#2a2a2a');
    if (car.deadTimer > 0) continue;
    // It blows: hurt whatever is close, then the wreck is gone.
    spawnExplosion(state, car.x, car.y);
    if (audio) audio.explosion();
    const hurt = (x, y) => Math.hypot(x - car.x, y - car.y) < 90;
    const p = state.player;
    if (!p.inCar && hurt(p.x, p.y)) {
      p.health -= 45;
      if (p.health <= 0) { p.health = 0; p.dead = true; }
    }
    for (const ped of state.peds) {
      if (ped.state !== 'down' && hurt(ped.x, ped.y)) { ped.state = 'down'; ped.downTimer = 999; }
    }
    for (const other of state.cars) {
      if (other !== car && !other.dead && hurt(other.x, other.y)) {
        other.hp -= 60;
        if (other.hp <= 0) damageCar(state, other, audio);
      }
    }
    if (car === p.inCar) {
      p.inCar = null;
      p.x = car.x + 40;
      p.y = car.y + 40;
      say(state, 'Your car blew up!', 3);
    }
    state.cars.splice(i, 1);
  }
}

function keepTrafficAlive(state) {
  const p = state.player;
  let traffic = 0;
  for (const car of state.cars) if (car.traffic && !car.dead) traffic += 1;
  if (traffic >= CAR.trafficCount) return;
  // Replace a far-away traffic car with a fresh one near the player.
  const far = state.cars.findIndex((c) => c.traffic && Math.hypot(c.x - p.x, c.y - p.y) > 1500);
  if (far !== -1) state.cars.splice(far, 1);
  const near = { x: p.x + (state.random() - 0.5) * 1200, y: p.y + (state.random() - 0.5) * 1200 };
  const pt = nearestRoadPoint(Math.max(80, Math.min(2520, near.x)), Math.max(80, Math.min(2460, near.y)));
  const car = makeCar(state.random, pt.x, pt.y, 0, state.random() < 0.08 ? 'taxi' : 'sedan', true);
  // Align it to the road it sits on.
  const onHorizontal = ROAD_LINES.includes(Math.round(pt.y));
  car.axis = onHorizontal ? 'x' : 'y';
  if (car.axis === 'x') {
    car.line = pt.y;
    car.along = pt.x;
    car.angle = car.dir > 0 ? 0 : Math.PI;
    car.y = car.line + (car.dir > 0 ? 12 : -12);
    car.x = car.along;
  } else {
    car.line = pt.x;
    car.along = pt.y;
    car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    car.x = car.line + (car.dir > 0 ? 12 : -12);
    car.y = car.along;
  }
  state.cars.push(car);
}

export function updateVehicles(state, input, audio, dt) {
  updatePlayerCar(state, input, audio, dt);
  for (const car of state.cars) {
    if (car.hitCd > 0) car.hitCd -= dt;
    if (car.dead || car.kind === 'police' || car === state.player.inCar) continue;
    if (car.traffic) updateTrafficCar(state, car, dt);
  }
  collideCars(state, audio, dt);
  hitPeds(state, audio, dt);
  updateExplosions(state, audio, dt);
  keepTrafficAlive(state);
}
