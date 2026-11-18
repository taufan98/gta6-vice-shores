// Leo on foot: walking and running, stealing cars, fists and the pistol, picking things up.
// Driving itself lives in vehicles.js; this module owns the person, not the car.

import { CRIME, PLAYER } from './config.js';
import { collideCircle } from './city.js';
import { spawnSmoke, spawnSparks } from './particles.js';
import { addFloat, makePed, nearestStealableCar, say, addHeat } from './state.js';

export function takeDamage(state, amount, audio) {
  const p = state.player;
  if (p.invuln > 0 || p.dead || p.inCar) return;
  p.health -= amount;
  p.invuln = 0.6;
  state.shake = Math.max(state.shake || 0, 6);
  if (audio) audio.hurt();
  if (p.health <= 0) {
    p.health = 0;
    p.dead = true;
  }
}

function tryEnterCar(state, audio) {
  const p = state.player;
  const car = nearestStealableCar(state, 64);
  if (!car) return;
  if (car.traffic && !car.parked) {
    // Jack it: the driver bails out and runs.
    const driver = makePed(state.random, car.x + 30, car.y + 30);
    driver.state = 'flee';
    driver.panic = 6;
    state.peds.push(driver);
    addHeat(state, CRIME.stealCar);
    say(state, 'You jacked the car! The driver ran off.', 3);
  }
  car.traffic = false;
  car.parked = false;
  p.inCar = car;
  p.x = car.x;
  p.y = car.y;
  state.stats.carsStolen += 1;
  if (audio) audio.door();
}

function tryExitCar(state, audio) {
  const p = state.player;
  const car = p.inCar;
  if (!car) return;
  // Step out on the car's left side, clear of walls.
  const side = car.angle + Math.PI / 2;
  const pos = collideCircle(state.city, car.x + Math.cos(side) * 34, car.y + Math.sin(side) * 34, PLAYER.radius);
  p.x = pos.x;
  p.y = pos.y;
  p.angle = car.angle;
  p.vx = 0;
  p.vy = 0;
  p.inCar = null;
  if (audio) audio.door();
}

function punch(state, audio) {
  const p = state.player;
  if (p.punchCooldown > 0) return;
  p.punchCooldown = 0.38;
  p.punchAnim = 0.22;
  if (audio) audio.punch();
  const reach = PLAYER.punchRange + PLAYER.radius;
  for (const ped of state.peds) {
    if (ped.state === 'down') continue;
    const dx = ped.x - p.x;
    const dy = ped.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d > reach + 10) continue;
    const ang = Math.atan2(dy, dx);
    let diff = Math.abs(ang - p.angle);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    if (diff > PLAYER.punchArc) continue;
    ped.state = 'down';
    ped.downTimer = 2.2;
    ped.x += Math.cos(ang) * 26;
    ped.y += Math.sin(ang) * 26;
    spawnSparks(state, ped.x, ped.y, 6, '#ffd166');
    addHeat(state, CRIME.hitPed);
    addFloat(state, ped.x, ped.y - 18, 'WHAM', '#ffd166');
  }
  for (const cop of state.cops) {
    const dx = cop.x - p.x;
    const dy = cop.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d > reach + 10) continue;
    const ang = Math.atan2(dy, dx);
    let diff = Math.abs(ang - p.angle);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    if (diff > PLAYER.punchArc) continue;
    cop.hp -= PLAYER.punchDamage;
    cop.x += Math.cos(ang) * 20;
    cop.y += Math.sin(ang) * 20;
    addHeat(state, CRIME.hitCop);
    if (cop.hp <= 0) cop.down = true;
  }
}

function shoot(state, audio) {
  const p = state.player;
  if (p.fireCooldown > 0 || p.ammo <= 0) return;
  p.fireCooldown = PLAYER.fireInterval;
  p.ammo -= 1;
  state.stats.shotsFired += 1;
  const target = state.mouseWorld || { x: p.x + Math.cos(p.angle) * 100, y: p.y + Math.sin(p.angle) * 100 };
  const aim = Math.atan2(target.y - p.y, target.x - p.x);
  p.angle = aim;
  const muzzleX = p.x + Math.cos(aim) * 20;
  const muzzleY = p.y + Math.sin(aim) * 20;
  spawnSparks(state, muzzleX, muzzleY, 5, '#ffe08a');
  if (audio) audio.shot();
  addHeat(state, CRIME.shoot);
  // Nearest living thing on the aim line, inside range.
  let best = null;
  let bestD = PLAYER.pistolRange;
  const consider = (x, y, radius, ref) => {
    const dx = x - p.x;
    const dy = y - p.y;
    const along = dx * Math.cos(aim) + dy * Math.sin(aim);
    if (along < 0 || along > bestD) return;
    const across = Math.abs(-dx * Math.sin(aim) + dy * Math.cos(aim));
    if (across < radius + 8) { bestD = along; best = ref; }
  };
  for (const ped of state.peds) if (ped.state !== 'down') consider(ped.x, ped.y, 12, { kind: 'ped', ref: ped });
  for (const cop of state.cops) if (!cop.down) consider(cop.x, cop.y, 12, { kind: 'cop', ref: cop });
  for (const car of state.cars) {
    if (car.dead || car === p.inCar) continue;
    consider(car.x, car.y, 24, { kind: 'car', ref: car });
  }
  if (!best) return;
  if (best.kind === 'ped') {
    best.ref.state = 'down';
    best.ref.downTimer = 999;
    spawnSparks(state, best.ref.x, best.ref.y, 10, '#e5534b');
    addHeat(state, CRIME.killPed);
  } else if (best.kind === 'cop') {
    best.ref.hp -= PLAYER.pistolDamage;
    spawnSparks(state, best.ref.x, best.ref.y, 10, '#e5534b');
    if (best.ref.hp <= 0) {
      best.ref.down = true;
      addHeat(state, CRIME.killCop);
    } else {
      addHeat(state, CRIME.hitCop);
    }
  } else if (best.kind === 'car') {
    const car = best.ref;
    car.hp -= PLAYER.pistolDamage;
    spawnSparks(state, car.x, car.y, 8, '#ffd166');
    if (car.hp <= 0) damageCar(state, car, audio);
  }
}

/** A car whose hp has hit 0 burns and blows up. The caller reduces hp first. */
export function damageCar(state, car, audio) {
  if (car.dead || car.hp > 0) return;
  car.dead = true;
  car.deadTimer = 1.4;
  if (audio) audio.explosion();
}

function collectPickups(state, audio) {
  const p = state.player;
  if (p.inCar) return;
  for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
    const pk = state.pickups[i];
    if (Math.hypot(pk.x - p.x, pk.y - p.y) > 30) continue;
    if (pk.kind === 'health') {
      p.health = Math.min(PLAYER.health, p.health + pk.amount);
      addFloat(state, p.x, p.y - 22, `+${pk.amount} HP`, '#58b368');
    } else if (pk.kind === 'ammo') {
      p.ammo = Math.min(PLAYER.maxAmmo, p.ammo + pk.amount);
      addFloat(state, p.x, p.y - 22, `+${pk.amount} AMMO`, '#ffd166');
    } else if (pk.kind === 'cash') {
      state.cash += pk.amount;
      addFloat(state, p.x, p.y - 22, `+$${pk.amount}`, '#58b368');
    } else if (pk.kind === 'repair' && p.inCar) {
      p.inCar.hp = Math.min(100, p.inCar.hp + pk.amount);
    }
    if (audio) audio.pickup();
    state.pickups.splice(i, 1);
  }
}

export function updatePlayer(state, input, actions, audio, dt) {
  const p = state.player;
  if (p.dead) return;
  p.fireCooldown = Math.max(0, p.fireCooldown - dt);
  p.punchCooldown = Math.max(0, p.punchCooldown - dt);
  p.punchAnim = Math.max(0, p.punchAnim - dt);
  p.invuln = Math.max(0, p.invuln - dt);

  if (actions.enter) {
    if (p.inCar) tryExitCar(state, audio);
    else tryEnterCar(state, audio);
  }
  if (p.inCar) {
    // The car carries the player; driving lives in vehicles.js.
    p.x = p.inCar.x;
    p.y = p.inCar.y;
    p.angle = p.inCar.angle;
    return;
  }

  const move = input.move();
  const speed = input.run() ? PLAYER.runSpeed : PLAYER.walkSpeed;
  const targetVx = move.x * speed;
  const targetVy = move.y * speed;
  const accel = move.x !== 0 || move.y !== 0 ? PLAYER.accel : PLAYER.friction;
  const step = (v, t) => (v < t ? Math.min(t, v + accel * dt) : Math.max(t, v - accel * dt));
  p.vx = step(p.vx, targetVx);
  p.vy = step(p.vy, targetVy);
  p.moving = Math.hypot(p.vx, p.vy) > 20;
  const pos = collideCircle(state.city, p.x + p.vx * dt, p.y + p.vy * dt, PLAYER.radius);
  p.x = pos.x;
  p.y = pos.y;

  // Face where you walk; face the mouse while the pistol is out.
  if (p.weapon === 'pistol' && state.mouseWorld) {
    p.angle = Math.atan2(state.mouseWorld.y - p.y, state.mouseWorld.x - p.x);
  } else if (p.moving) {
    p.angle = Math.atan2(p.vy, p.vx);
  }

  if (actions.punch || (input.mouse.down && p.weapon === 'fists')) punch(state, audio);
  if (input.takeClick() && p.weapon === 'pistol') shoot(state, audio);
  if (p.weapon === 'pistol' && input.mouse.down && p.fireCooldown <= 0) shoot(state, audio);
  if (actions.reload && p.weapon === 'pistol') {
    p.ammo = Math.min(PLAYER.maxAmmo, p.ammo + 12);
    addFloat(state, p.x, p.y - 22, 'RELOADED', '#ffd166');
  }
  collectPickups(state, audio);
}
