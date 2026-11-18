// The screenshot scenes behind ?shot=start|drive|mission|chase. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a simple
// autopilot (hold W and drive straight down the road), so the frame is what a short
// game really looks like and the same seed always gives the same frame.

import { STEP } from './config.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createState, makeCar, say } from './state.js';
import { startMission } from './missions.js';
import { spawnFootCop, spawnPoliceCar } from './police.js';
import { stepWorld } from './world.js';

function autopilotInput(drive) {
  return {
    mouse: { x: 0, y: 0, down: false, clicked: false },
    move: () => (drive ? { x: 0, y: -1 } : { x: 0, y: 0 }),
    run: () => false,
    takeActions: () => 0,
    takeClick: () => false,
    holdE: false,
  };
}

function simulate(state, seconds, drive) {
  const input = autopilotInput(drive);
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) stepWorld(state, input, null, STEP);
}

/** Set `state` to the named scene and return the screen to draw over it. */
export function stageShot(name, seed) {
  const state = createState(seed);
  if (name === 'drive') {
    // Leo in a sports car, rolling down Shore Drive with the city around him.
    const car = makeCar(state.random, 600, 487, 0, 'sports', false);
    car.color = '#e5534b';
    car.parked = false;
    car.traffic = false;
    state.cars.push(car);
    state.player.inCar = car;
    state.player.x = car.x;
    state.player.y = car.y;
    state.cash = 1250;
    startMission(state, 0);
    simulate(state, 3, true);
    return { state, screen: SCREEN_PLAY };
  }
  if (name === 'mission') {
    // On foot at Shore Bank, mid-vault-crack, with the cops closing in.
    startMission(state, 3);
    const m = state.mission;
    m.stage = 1;
    m.timer = 1.5;
    m.target = { x: 1137, y: 1137, label: 'Shore Bank — cracking the vault' };
    state.objective = 'Cracking the vault... 2s';
    state.player.x = 1137;
    state.player.y = 1137;
    state.player.weapon = 'pistol';
    state.player.ammo = 48;
    state.wanted.heat = 40;
    state.wanted.stars = 2;
    state.wanted.lastCrime = 0;
    spawnFootCop(state);
    spawnFootCop(state);
    simulate(state, 1.8, false);
    return { state, screen: SCREEN_PLAY };
  }
  if (name === 'chase') {
    // Three stars, two patrol cars on your tail, foot to the floor.
    const car = makeCar(state.random, 600, 812, 0, 'sports', false);
    car.color = '#118ab2';
    car.parked = false;
    car.traffic = false;
    state.cars.push(car);
    state.player.inCar = car;
    state.player.x = car.x;
    state.player.y = car.y;
    state.cash = 2400;
    state.wanted.heat = 60;
    state.wanted.stars = 3;
    state.wanted.lastCrime = 0;
    state.objective = 'Outrun the police — reach the Yacht Marina!';
    spawnPoliceCar(state);
    spawnPoliceCar(state);
    simulate(state, 3.5, true);
    return { state, screen: SCREEN_PLAY };
  }
  // Default: the title screen over a living city.
  startMission(state, 0);
  simulate(state, 5, false);
  return { state, screen: SCREEN_TITLE };
}
