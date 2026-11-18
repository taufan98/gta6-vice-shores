// The wanted system and the Vice Shores PD. Heat climbs with every crime and cools when
// you lie low; stars decide how many cops chase you, on foot and in patrol cars. Get
// caught and you are busted; get killed and you wake up at Shore General.

import { POLICE } from './config.js';
import { collideCircle, randomRoadPoint } from './city.js';
import { spawnSparks } from './particles.js';
import { makeCar, say } from './state.js';
import { takeDamage, damageCar } from './player.js';
import { crashIntoBuildings } from './vehicles.js';

function starsFor(heat) {
  return Math.min(POLICE.maxStars, Math.floor(heat / POLICE.heatPerStar));
}

export function spawnFootCop(state) {
  const p = state.player;
  const a = state.random() * Math.PI * 2;
  const d = 420 + state.random() * 260;
  const pos = collideCircle(state.city, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 12);
  state.cops.push({
    x: pos.x, y: pos.y, angle: 0, hp: 50,
    state: 'chase', arrestTimer: 0, inCar: null, down: false, removeTimer: 0,
  });
}

export function spawnPoliceCar(state) {
  const p = state.player;
  const pt = randomRoadPoint(state.random);
  // Put it on a road within reach of the player.
  let x = pt.x;
  let y = pt.y;
  for (let tries = 0; tries < 6; tries += 1) {
    const q = randomRoadPoint(state.random);
    if (Math.hypot(q.x - p.x, q.y - p.y) > 380 && Math.hypot(q.x - p.x, q.y - p.y) < 900) { x = q.x; y = q.y; break; }
  }
  const car = makeCar(state.random, x, y, 0, 'police', false);
  car.traffic = false;
  car.parked = false;
  car.police = true;
  state.cars.push(car);
  const cop = {
    x, y, angle: 0, hp: 50,
    state: 'drive', arrestTimer: 0, inCar: car, down: false, removeTimer: 0,
  };
  state.cops.push(cop);
}

function bustPlayer(state, audio) {
  const p = state.player;
  const fine = Math.min(state.cash, POLICE.bustedFine);
  state.cash -= fine;
  state.lastFine = fine;
  state.wanted.heat = 0;
  state.wanted.stars = 0;
  state.cops.length = 0;
  // Tow the player's car away; the player walks out of the station.
  if (p.inCar) {
    const idx = state.cars.indexOf(p.inCar);
    if (idx !== -1) state.cars.splice(idx, 1);
    p.inCar = null;
  }
  p.x = 1462 + 60;
  p.y = 1462 + 60;
  p.health = 100;
  p.vx = 0;
  p.vy = 0;
  state.busted = true;
  say(state, `BUSTED! You paid $${fine} and walked out of Vice Shores PD.`, 5);
  if (audio) audio.busted();
}

function wastePlayer(state, audio) {
  const p = state.player;
  const fine = Math.min(state.cash, POLICE.wastedFine);
  state.cash -= fine;
  state.lastFine = fine;
  state.wanted.heat = 0;
  state.wanted.stars = 0;
  state.cops.length = 0;
  if (p.inCar) {
    const idx = state.cars.indexOf(p.inCar);
    if (idx !== -1) state.cars.splice(idx, 1);
    p.inCar = null;
  }
  p.x = 1787 + 60;
  p.y = 487 + 60;
  p.health = 100;
  p.dead = false;
  p.vx = 0;
  p.vy = 0;
  state.wasted = true;
  say(state, `WASTED! Shore General patched you up for $${fine}.`, 5);
  if (audio) audio.busted();
}

export function updatePolice(state, audio, dt) {
  const p = state.player;
  const w = state.wanted;

  if (p.dead) {
    wastePlayer(state, audio);
    return;
  }
  // Heat cools when you have been clean a while and no cop is close.
  const copNear = state.cops.some((c) => !c.down && Math.hypot(c.x - p.x, c.y - p.y) < 320);
  if (state.time - w.lastCrime > POLICE.decayDelay && !copNear && w.heat > 0) {
    w.heat = Math.max(0, w.heat - POLICE.decayRate * dt);
    w.stars = starsFor(w.heat);
  }

  // Reinforcements to match the stars.
  const footWant = Math.min(4, w.stars);
  const carWant = w.stars >= 2 ? Math.min(3, w.stars - 1) : 0;
  let foot = 0;
  let cars = 0;
  for (const cop of state.cops) {
    if (cop.down) continue;
    if (cop.inCar) cars += 1;
    else foot += 1;
  }
  if (foot < footWant && Math.random() < 0.5) spawnFootCop(state);
  if (cars < carWant && Math.random() < 0.3) spawnPoliceCar(state);

  for (let i = state.cops.length - 1; i >= 0; i -= 1) {
    const cop = state.cops[i];
    if (cop.down) {
      cop.removeTimer -= dt;
      if (cop.removeTimer <= 0) state.cops.splice(i, 1);
      continue;
    }
    if (cop.hp <= 0) {
      cop.down = true;
      cop.removeTimer = 12;
      if (cop.inCar) { cop.inCar.police = false; cop.inCar = null; }
      continue;
    }
    if (cop.inCar) {
      // Drive the patrol car at the player; get out and chase on foot when close.
      const car = cop.inCar;
      const dist = Math.hypot(p.x - car.x, p.y - car.y);
      if (!p.inCar && dist < 70) {
        cop.inCar = null;
        car.police = false;
        car.speed = 0;
        cop.x = car.x + 30;
        cop.y = car.y + 30;
        cop.state = 'chase';
        continue;
      }
      const want = Math.atan2(p.y - car.y, p.x - car.x);
      let diff = want - car.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
      const target = Math.min(POLICE.carSpeed, 240 + w.stars * 70);
      car.speed += (target - car.speed) * Math.min(1, 1.6 * dt);
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      crashIntoBuildings(state, car, audio);
      cop.x = car.x;
      cop.y = car.y;
      cop.angle = car.angle;
      // Ramming the player's car hurts it.
      if (p.inCar && dist < 52 && car.speed > 200) {
        p.inCar.hp -= 6 * dt;
        spawnSparks(state, p.inCar.x, p.inCar.y, 3, '#ffd166');
        if (p.inCar.hp <= 0) damageCar(state, p.inCar, audio);
      }
      continue;
    }
    // On foot: run the player down and try to arrest them.
    const dist = Math.hypot(p.x - cop.x, p.y - cop.y);
    if (p.inCar) {
      // A foot cop cannot catch a car: run to the nearest road and wait for a patrol car.
      const target = { x: cop.x, y: cop.y };
      cop.angle = Math.atan2(p.y - cop.y, p.x - cop.x);
      const pos = collideCircle(state.city, cop.x + Math.cos(cop.angle) * POLICE.footSpeed * 0.7 * dt, cop.y + Math.sin(cop.angle) * POLICE.footSpeed * 0.7 * dt, 12);
      cop.x = pos.x;
      cop.y = pos.y;
      continue;
    }
    if (dist < POLICE.arrestRange) {
      cop.arrestTimer += dt;
      cop.state = 'arrest';
      if (cop.arrestTimer >= POLICE.arrestTime) {
        bustPlayer(state, audio);
        return;
      }
    } else {
      cop.arrestTimer = Math.max(0, cop.arrestTimer - dt * 2);
      cop.state = 'chase';
      cop.angle = Math.atan2(p.y - cop.y, p.x - cop.x);
      const pos = collideCircle(state.city, cop.x + Math.cos(cop.angle) * POLICE.footSpeed * dt, cop.y + Math.sin(cop.angle) * POLICE.footSpeed * dt, 12);
      cop.x = pos.x;
      cop.y = pos.y;
    }
    // A cop that catches the player on foot lands a baton hit.
    if (dist < 24 && p.invuln <= 0) {
      takeDamage(state, 8, audio);
    }
  }
  if (audio) audio.siren(w.stars > 0 && state.cops.some((c) => !c.down && Math.hypot(c.x - p.x, c.y - p.y) < 700));
}
