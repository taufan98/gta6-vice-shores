// The whole game in one object: player, cars, pedestrians, police, pickups, particles,
// the wanted level, cash and the active mission. Every other module reads and writes it;
// nothing else keeps game state.

import { CAR, PED, PLAYER, PLACES } from './config.js';
import { buildCity, randomRoadPoint, randomSidewalkPoint } from './city.js';
import { randomInt, randomPick, randomRange } from './random.js';

const CAR_COLORS = ['#c94f42', '#4f7ec9', '#e8e3d3', '#5a5f6b', '#7a9e3f', '#c98f2e', '#8a5a9e'];
const PED_SHIRTS = ['#ef476f', '#06d6a0', '#118ab2', '#f78c6b', '#9b5de5', '#f15bb5', '#e8e3d3', '#5a8f3c'];

/** Raise the wanted heat; stars follow from it. Lives in state.js so every module can use it. */
export function addHeat(state, amount) {
  const w = state.wanted;
  w.heat = Math.min(100, w.heat + amount);
  w.lastCrime = state.time;
  w.stars = Math.min(5, Math.floor(w.heat / 20));
}

/** A fresh car. `traffic` cars drive the roads; parked ones wait to be stolen. */
export function makeCar(random, x, y, angle, kind, traffic) {
  const kinds = {
    sedan: { color: randomPick(random, CAR_COLORS), top: 330 },
    taxi: { color: '#f2c94c', top: 330 },
    sports: { color: randomPick(random, ['#e5534b', '#f2c94c', '#118ab2']), top: 430 },
    truck: { color: randomPick(random, ['#8a7a5a', '#5a5f6b']), top: 250 },
    van: { color: '#e8e3d3', top: 280 },
    police: { color: '#e8e8f0', top: 380 },
  };
  const spec = kinds[kind] || kinds.sedan;
  return {
    id: Math.floor(random() * 1e9),
    x, y, angle, speed: 0,
    kind, color: spec.color, topSpeed: spec.top,
    hp: CAR.hp, traffic: !!traffic, parked: !traffic,
    driver: null, dead: false, smoke: 0, siren: kind === 'police',
    // Traffic state: which road the car is on and where it is going.
    axis: 'x', line: y, along: x, dir: random() < 0.5 ? 1 : -1,
    wait: randomRange(random, 0, 2), honk: 0,
  };
}

export function makePed(random, x, y) {
  return {
    x, y, angle: randomRange(random, 0, Math.PI * 2), speed: 0,
    state: 'walk', // walk | flee | down | drive
    target: null, wait: randomRange(random, 0, 3),
    shirt: randomPick(random, PED_SHIRTS),
    skin: randomPick(random, ['#e8b98a', '#c98a5a', '#8a5a3a', '#f0c8a0']),
    downTimer: 0, panic: 0, car: null,
  };
}

export function makePickup(kind, x, y, amount) {
  return { kind, x, y, amount, bob: Math.random() * Math.PI * 2 };
}

/** A brand-new game state, seeded. */
export function createState(seed) {
  const random = (() => {
    let a = seed | 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })();
  const city = buildCity(random);
  const state = {
    seed,
    random,
    city,
    time: 0,
    player: {
      x: PLACES.garage.x + 40, y: PLACES.garage.y + 60, angle: -Math.PI / 2,
      vx: 0, vy: 0, health: PLAYER.health,
      weapon: 'fists', ammo: PLAYER.startAmmo,
      inCar: null, fireCooldown: 0, punchCooldown: 0, punchAnim: 0,
      invuln: 0, dead: false, moving: false,
    },
    cars: [],
    peds: [],
    cops: [],
    pickups: [],
    particles: [],
    skidmarks: [],
    floats: [],
    wanted: { heat: 0, stars: 0, lastCrime: -999, busted: 0 },
    cash: 0,
    missionIndex: 0,
    mission: null,
    missionsDone: [],
    subtitles: [],
    objective: '',
    stats: { carsStolen: 0, pedsHit: 0, shotsFired: 0, missionsDone: 0 },
    gameWon: false,
    muted: false,
  };
  spawnTraffic(state, CAR.trafficCount);
  spawnParked(state, CAR.parkedCount);
  spawnPeds(state, PED.count);
  spawnPickups(state);
  return state;
}

export function spawnTraffic(state, count) {
  const { random } = state;
  for (let i = 0; i < count; i += 1) {
    const p = randomRoadPoint(random);
    const kind = random() < 0.08 ? 'taxi' : random() < 0.06 ? 'truck' : random() < 0.1 ? 'sports' : 'sedan';
    const car = makeCar(random, p.x, p.y, 0, kind, true);
    // Drive along the road the car spawned on, in its right-hand lane.
    car.axis = p.axis;
    if (car.axis === 'x') {
      car.line = p.y;
      car.along = p.x;
      car.angle = car.dir > 0 ? 0 : Math.PI;
      car.y = car.line + (car.dir > 0 ? 12 : -12);
      car.x = car.along;
    } else {
      car.line = p.x;
      car.along = p.y;
      car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      car.x = car.line + (car.dir > 0 ? 12 : -12);
      car.y = car.along;
    }
    state.cars.push(car);
  }
}

export function spawnParked(state, count) {
  const { random } = state;
  for (let i = 0; i < count; i += 1) {
    const p = randomRoadPoint(random);
    const off = randomPick(random, [-54, 54]);
    const x = p.axis === 'x' ? p.x : p.x + off;
    const y = p.axis === 'x' ? p.y + off : p.y;
    const kind = random() < 0.12 ? 'sports' : random() < 0.1 ? 'van' : 'sedan';
    const car = makeCar(random, x, y, random() < 0.5 ? 0 : Math.PI / 2, kind, false);
    car.parked = true;
    state.cars.push(car);
  }
}

export function spawnPeds(state, count) {
  const { random } = state;
  for (let i = 0; i < count; i += 1) {
    const p = randomSidewalkPoint(random);
    state.peds.push(makePed(random, p.x, p.y));
  }
}

export function spawnPickups(state) {
  const { random } = state;
  const kinds = ['health', 'ammo', 'cash', 'cash', 'repair', 'ammo'];
  for (let i = 0; i < 14; i += 1) {
    const p = randomSidewalkPoint(random);
    const kind = randomPick(random, kinds);
    const amount = kind === 'cash' ? randomInt(random, 10, 60) : kind === 'health' ? 40 : kind === 'ammo' ? 24 : 50;
    state.pickups.push(makePickup(kind, p.x, p.y, amount));
  }
}

/** A car the player can steal right now, nearest to the player. */
export function nearestStealableCar(state, maxDist) {
  const p = state.player;
  let best = null;
  let bestD = maxDist;
  for (const car of state.cars) {
    if (car.dead || car === p.inCar) continue;
    const d = Math.hypot(car.x - p.x, car.y - p.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

export function addFloat(state, x, y, text, color) {
  state.floats.push({ x, y, text, life: 1.2, color: color || '#f4f1e8' });
}

/** Show a subtitle line (dialogue, a tip, a result) for a few seconds. */
export function say(state, text, seconds) {
  state.subtitles.push({ text, until: state.time + (seconds || 4) });
  if (state.subtitles.length > 3) state.subtitles.shift();
}

/** Drop subtitles whose time is up. */
export function pruneSubtitles(state) {
  while (state.subtitles.length > 0 && state.subtitles[0].until < state.time) state.subtitles.shift();
}

/** Reset a state to a fresh game with the same seed (new game). */
export function resetState(state) {
  const fresh = createState(state.seed);
  for (const key of Object.keys(fresh)) state[key] = fresh[key];
}
