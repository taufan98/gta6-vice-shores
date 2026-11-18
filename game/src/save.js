// Saving: one localStorage key holds the campaign — cash, the job you are on, health,
// ammo and where you stood. The city itself comes back from the same seed, so a save
// always reloads into the Vice Shores you left.

import { SAVE_KEY } from './config.js';
import { startMission } from './missions.js';

export function hasSave() {
  try {
    return window.localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}

export function saveGame(state) {
  try {
    const data = {
      seed: state.seed,
      cash: state.cash,
      missionIndex: state.mission ? state.mission.index : state.missionIndex,
      missionsDone: state.missionsDone,
      health: Math.max(1, Math.ceil(state.player.health)),
      ammo: state.player.ammo,
      weapon: state.player.weapon,
      x: state.player.x,
      y: state.player.y,
      stats: state.stats,
      gameWon: state.gameWon,
      muted: state.muted,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage can be off: nothing to clear.
  }
}

/** Apply a loaded save to a fresh state (same seed, so the city matches). */
export function applySave(state, data) {
  state.cash = data.cash || 0;
  state.missionsDone = Array.isArray(data.missionsDone) ? data.missionsDone : [];
  state.stats = { ...state.stats, ...(data.stats || {}) };
  state.gameWon = !!data.gameWon;
  state.muted = !!data.muted;
  state.player.health = data.health || 100;
  state.player.ammo = data.ammo ?? 24;
  state.player.weapon = data.weapon || 'fists';
  if (typeof data.x === 'number' && typeof data.y === 'number') {
    state.player.x = data.x;
    state.player.y = data.y;
  }
  startMission(state, data.missionIndex || 0);
}
