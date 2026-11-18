// The story of Leo Vasquez, a wheelman in Vice Shores, told in five jobs for Rosa.
// Each mission is a small state machine: a target marker, stages, and a payoff. The
// main loop starts the next job when one is done; being busted or wasted restarts the
// job you were on.

import { MISSION_REWARDS, PLACES } from './config.js';
import { addHeat, makeCar, say } from './state.js';

export const MISSIONS = [
  {
    id: 'first-fare',
    title: 'First Fare',
    briefing: [
      "ROSA: Leo, you need wheels. Take any car on the street — press E next to one.",
      'ROSA: Then drive it to my garage. Try not to scratch it. Much.',
    ],
    reward: MISSION_REWARDS[0],
    setup(state, m) {
      m.stage = 0;
      m.target = { x: PLACES.garage.x, y: PLACES.garage.y, label: "Rosa's Garage" };
      state.objective = 'Steal a car (walk up to one and press E)';
    },
    update(state, m) {
      const p = state.player;
      if (m.stage === 0) {
        if (p.inCar) {
          m.stage = 1;
          state.objective = "Drive to Rosa's Garage";
          say(state, "ROSA: Good. Now bring it to the garage.", 3);
        }
        return false;
      }
      const d = Math.hypot(p.x - m.target.x, p.y - m.target.y);
      if (d < 70) return true;
      return false;
    },
  },
  {
    id: 'the-package',
    title: 'The Package',
    briefing: [
      "ROSA: A package is waiting in Palm Park. Walk it to the docks.",
      "ROSA: On foot is safer. The cops watch the roads, not the grass.",
    ],
    reward: MISSION_REWARDS[1],
    setup(state, m) {
      m.stage = 0;
      m.timer = 0;
      m.target = { x: PLACES.park.x, y: PLACES.park.y, label: 'Palm Park' };
      state.objective = 'Pick up the package in Palm Park';
    },
    update(state, m, dt) {
      const p = state.player;
      if (m.stage === 0) {
        const d = Math.hypot(p.x - m.target.x, p.y - m.target.y);
        if (d < 55) {
          m.timer += dt;
          state.objective = 'Picking up the package...';
          if (m.timer > 1) {
            m.stage = 1;
            m.target = { x: PLACES.docks.x, y: PLACES.docks.y, label: 'Portside Docks' };
            state.objective = 'Deliver the package to the docks';
            say(state, 'Package secured. Now to the docks.', 3);
          }
        } else {
          m.timer = 0;
        }
        return false;
      }
      const d = Math.hypot(p.x - m.target.x, p.y - m.target.y);
      return d < 70;
    },
  },
  {
    id: 'hot-wheels',
    title: 'Hot Wheels',
    briefing: [
      "ROSA: A red sports car is parked on the Strip. The owner is... attached to it.",
      'ROSA: Bring it to the chop shop. The cops will not love you for it.',
    ],
    reward: MISSION_REWARDS[2],
    setup(state, m) {
      m.stage = 0;
      // The mark: a red sports car waiting on the Strip.
      const car = makeCar(state.random, PLACES.strip.x + 30, PLACES.strip.y, 0, 'sports', false);
      car.color = '#e5534b';
      car.parked = true;
      car.marked = true;
      state.cars.push(car);
      m.data.car = car;
      m.target = { x: PLACES.strip.x, y: PLACES.strip.y, label: 'The Strip — red sports car' };
      state.objective = 'Steal the red sports car on the Strip';
    },
    update(state, m) {
      const p = state.player;
      const car = m.data.car;
      if (m.stage === 0) {
        if (p.inCar === car) {
          m.stage = 1;
          addHeat(state, 40);
          m.target = { x: PLACES.chopShop.x, y: PLACES.chopShop.y, label: 'Chop Shop' };
          state.objective = 'Lose the cops — deliver the car to the Chop Shop';
          say(state, 'ROSA: The owner called the cops! Lose them and bring the car in.', 4);
        }
        return false;
      }
      if (car.dead) return false;
      const d = Math.hypot(car.x - m.target.x, car.y - m.target.y);
      return d < 80;
    },
  },
  {
    id: 'shore-bank',
    title: 'Shore Bank',
    briefing: [
      "ROSA: Shore Bank. The vault, the cash, the alarm. You know the drill.",
      'ROSA: Stand at the vault and it cracks itself. Then run — the whole city will be looking.',
    ],
    reward: MISSION_REWARDS[3],
    setup(state, m) {
      m.stage = 0;
      m.timer = 0;
      m.target = { x: PLACES.bank.x, y: PLACES.bank.y, label: 'Shore Bank vault' };
      state.objective = 'Get to Shore Bank';
    },
    update(state, m, dt, input) {
      const p = state.player;
      if (m.stage === 0) {
        const d = Math.hypot(p.x - m.target.x, p.y - m.target.y);
        if (d < 80 && !p.inCar) {
          m.stage = 1;
          m.timer = 0;
          state.objective = 'Cracking the vault — stand here';
        }
        return false;
      }
      if (m.stage === 1) {
        const d = Math.hypot(p.x - m.target.x, p.y - m.target.y);
        if (d < 80 && !p.inCar) {
          m.timer += dt;
          state.objective = `Cracking the vault... ${Math.ceil(3 - m.timer)}s`;
          if (m.timer >= 3) {
            m.stage = 2;
            addHeat(state, 60);
            m.target = { x: PLACES.garage.x, y: PLACES.garage.y, label: "Rosa's Garage" };
            state.objective = 'Escape with the cash — get to the garage!';
            say(state, 'ROSA: Alarms everywhere! Get back to the garage, Leo!', 4);
          }
        } else {
          m.timer = Math.max(0, m.timer - dt);
        }
        return false;
      }
      const d = Math.hypot(p.x - m.target.x, p.y - m.target.y);
      return d < 70;
    },
  },
  {
    id: 'the-big-score',
    title: 'The Big Score',
    briefing: [
      "ROSA: One last job, Leo. A van full of the bank's money, a yacht waiting at the marina.",
      'ROSA: The whole PD will be on you. Drive like the shore is on fire.',
    ],
    reward: MISSION_REWARDS[4],
    setup(state, m) {
      m.stage = 0;
      const van = makeCar(state.random, PLACES.garage.x + 60, PLACES.garage.y + 40, 0, 'van', false);
      van.color = '#e8e3d3';
      van.parked = true;
      van.marked = true;
      state.cars.push(van);
      m.data.van = van;
      m.target = { x: PLACES.garage.x, y: PLACES.garage.y, label: 'Getaway van' };
      state.objective = 'Get in the getaway van at the garage';
    },
    update(state, m) {
      const p = state.player;
      const van = m.data.van;
      if (m.stage === 0) {
        if (p.inCar === van) {
          m.stage = 1;
          addHeat(state, 80);
          m.target = { x: PLACES.yacht.x, y: PLACES.yacht.y, label: 'Yacht Marina' };
          state.objective = 'Outrun the police — reach the Yacht Marina!';
          say(state, 'ROSA: Go! The yacht leaves at dawn!', 4);
        }
        return false;
      }
      if (van.dead) return false;
      const d = Math.hypot(van.x - m.target.x, van.y - m.target.y);
      return d < 90;
    },
  },
];

/** Begin mission `index` on the state. */
export function startMission(state, index) {
  const def = MISSIONS[index];
  if (!def) {
    state.mission = null;
    state.objective = 'Free roam — Vice Shores is yours.';
    return;
  }
  const m = { def, index, stage: 0, timer: 0, data: {}, target: null };
  state.mission = m;
  state.missionIndex = index;
  def.setup(state, m);
  for (const line of def.briefing) say(state, line, 5);
  state.objective = state.objective || def.title;
}

/** Advance the active mission; returns 'done' when it completes. */
export function updateMission(state, dt, input, audio) {
  const m = state.mission;
  if (!m) return 'none';
  const done = m.def.update(state, m, dt, input);
  if (!done) return 'active';
  state.cash += m.def.reward;
  state.missionsDone.push(m.def.id);
  state.stats.missionsDone += 1;
  say(state, `JOB DONE: ${m.def.title} — +$${m.def.reward}`, 5);
  if (audio) audio.mission();
  const next = m.index + 1;
  if (next >= MISSIONS.length) {
    state.mission = null;
    state.gameWon = true;
    state.objective = 'You beat Vice Shores. Free roam!';
    return 'won';
  }
  startMission(state, next);
  return 'done';
}

/** A bust or a hospital visit restarts the job you were on. */
export function failMission(state) {
  if (state.mission) {
    const index = state.mission.index;
    say(state, 'The job fell through. Rosa gives you another shot.', 4);
    startMission(state, index);
  }
}
