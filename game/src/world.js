// One fixed step of the living city: the player, the cars, the pedestrians, the police,
// the mission and the particles, in that order. The live loop calls this every 1/60 s;
// the screenshot scenes call it to play a scene forward.

import { STEP } from './config.js';
import { ACTION_ENTER, ACTION_PUNCH, ACTION_RELOAD } from './input.js';
import { updatePlayer } from './player.js';
import { updateVehicles } from './vehicles.js';
import { updatePeds } from './peds.js';
import { updatePolice } from './police.js';
import { updateMission } from './missions.js';
import { updateParticles } from './particles.js';
import { pruneSubtitles } from './state.js';

/** Decode the one-shot action flags into a plain object for the player update. */
export function decodeActions(flags) {
  return {
    enter: !!(flags & ACTION_ENTER),
    punch: !!(flags & ACTION_PUNCH),
    reload: !!(flags & ACTION_RELOAD),
  };
}

/** Advance the world one fixed step. `input` is the live input or an autopilot stub.
 *  `actionFlags` (optional) are the one-shot flags already read this frame — without it
 *  the step reads them itself, which is what the screenshot scenes do. */
export function stepWorld(state, input, audio, dt, actionFlags) {
  state.time += dt;
  const flags = actionFlags !== undefined ? actionFlags : (input.takeActions ? input.takeActions() : 0);
  const actions = decodeActions(flags);
  updatePlayer(state, input, actions, audio, dt);
  updateVehicles(state, input, audio, dt);
  updatePeds(state, dt);
  updatePolice(state, audio, dt);
  const missionResult = updateMission(state, dt, input, audio);
  updateParticles(state, dt);
  pruneSubtitles(state);
  return missionResult;
}

export { STEP };
