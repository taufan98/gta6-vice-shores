// Pedestrians: they stroll the sidewalks, cross the roads now and then, and run when
// things get loud — a gunshot, a speeding car, or a wanted level climbing.

import { PED } from './config.js';
import { collideCircle, randomSidewalkPoint } from './city.js';
import { makePed } from './state.js';

function pickTarget(state, ped) {
  const p = randomSidewalkPoint(state.random);
  ped.target = p;
  ped.wait = 0;
}

export function updatePeds(state, dt) {
  const p = state.player;
  for (let i = state.peds.length - 1; i >= 0; i -= 1) {
    const ped = state.peds[i];
    if (ped.state === 'down') {
      ped.downTimer -= dt;
      if (ped.downTimer >= 900) {
        // Killed outright: the body stays a while, then the street clears it.
        ped.removeTimer = (ped.removeTimer ?? 15) - dt;
        if (ped.removeTimer <= 0) state.peds.splice(i, 1);
        continue;
      }
      if (ped.downTimer <= 0) {
        ped.state = 'flee';
        ped.panic = 3;
      }
      continue;
    }
    // Fear: gunfire nearby, a speeding car closing in, or a hot wanted level.
    let danger = null;
    if (state.lastShotAt && state.time - state.lastShotAt < 0.6 && Math.hypot(ped.x - p.x, ped.y - p.y) < 320) danger = p;
    for (const car of state.cars) {
      if (car.dead || Math.abs(car.speed || 0) < 140) continue;
      if (Math.hypot(ped.x - car.x, ped.y - car.y) < 90) { danger = car; break; }
    }
    if (danger) {
      ped.state = 'flee';
      ped.panic = Math.max(ped.panic, 2.5);
      ped.fleeFrom = { x: danger.x, y: danger.y };
    }
    if (ped.state === 'flee') {
      ped.panic -= dt;
      const away = Math.atan2(ped.y - (ped.fleeFrom?.y ?? p.y), ped.x - (ped.fleeFrom?.x ?? p.x));
      ped.angle = away;
      const speed = PED.runSpeed;
      const pos = collideCircle(state.city, ped.x + Math.cos(away) * speed * dt, ped.y + Math.sin(away) * speed * dt, PED.radius);
      ped.x = pos.x;
      ped.y = pos.y;
      if (ped.panic <= 0) { ped.state = 'walk'; ped.target = null; }
      continue;
    }
    // Strolling.
    if (!ped.target || Math.hypot(ped.x - ped.target.x, ped.y - ped.target.y) < 14) {
      if (ped.wait > 0) {
        ped.wait -= dt;
      } else {
        pickTarget(state, ped);
        ped.wait = Math.random() < 0.25 ? 1 + Math.random() * 2 : 0;
      }
      continue;
    }
    const ang = Math.atan2(ped.target.y - ped.y, ped.target.x - ped.x);
    ped.angle = ang;
    const pos = collideCircle(state.city, ped.x + Math.cos(ang) * PED.walkSpeed * dt, ped.y + Math.sin(ang) * PED.walkSpeed * dt, PED.radius);
    ped.x = pos.x;
    ped.y = pos.y;
  }
  // Keep the sidewalks full.
  let alive = 0;
  for (const ped of state.peds) if (ped.state !== 'down') alive += 1;
  while (state.peds.length < PED.count) {
    const sp = randomSidewalkPoint(state.random);
    // Spawn out of the player's sight when possible.
    if (Math.hypot(sp.x - p.x, sp.y - p.y) < 500 && state.peds.length > 10) break;
    state.peds.push(makePed(state.random, sp.x, sp.y));
  }
}
