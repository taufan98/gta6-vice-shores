// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there, with the HUD and the menu screens on top. Screens: title, play, paused,
// busted, wasted, ending.
//
// ?seed=N fixes the city. ?shot=start|drive|mission|chase (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady.

import { STEP } from './config.js';
import { createState } from './state.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_WEAPON_FISTS, ACTION_WEAPON_PISTOL, createInput } from './input.js';
import { createRenderer, SCREEN_BUSTED, SCREEN_ENDING, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WASTED } from './render.js';
import { drawBusted, drawEnding, drawHUD, drawPaused, drawTitle, drawWasted } from './hud.js';
import { stageShot } from './shots.js';
import { stepWorld } from './world.js';
import { createAudio } from './audio.js';
import { startMission } from './missions.js';
import { applySave, clearSave, hasSave, loadSave, saveGame } from './save.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
document.title = 'Vice Shores';
canvas.setAttribute('aria-label', 'Vice Shores: an open-world crime game. Drive, steal cars, dodge the police and finish five jobs for Rosa.');

const renderer = createRenderer(canvas);
const audio = createAudio();

/** The title screen's backdrop: the city lives, the player just stands there. */
const titleInput = {
  mouse: { x: 0, y: 0, down: false, clicked: false },
  move: () => ({ x: 0, y: 0 }),
  run: () => false,
  takeActions: () => 0,
  takeClick: () => false,
  holdE: false,
};

function runShot(name) {
  const scene = stageShot(name, seed);
  // The camera lerps toward the player over frames; a screenshot only paints twice,
  // so snap it straight onto the player first.
  renderer.camera.x = scene.state.player.x;
  renderer.camera.y = scene.state.player.y;
  renderer.camera.zoom = scene.state.player.inCar ? 0.92 : 1.05;
  let painted = 0;
  function paint() {
    renderer.draw(scene.state, scene.screen);
    if (scene.screen === SCREEN_TITLE) drawTitle(renderer, scene.state, false);
    else drawHUD(renderer, scene.state, scene.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let state = createState(seed);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();
  let saved = hasSave();

  function announce(message) {
    status.textContent = message;
  }

  function newGame() {
    state = createState(seed);
    startMission(state, 0);
    screen = SCREEN_PLAY;
    accumulator = 0;
    announce('Playing. Rosa has five jobs for you, Leo.');
  }

  function continueGame() {
    const data = loadSave();
    if (!data) { newGame(); return; }
    state = createState(data.seed ?? seed);
    applySave(state, data);
    screen = SCREEN_PLAY;
    accumulator = 0;
    announce(`Back in Vice Shores. Job ${state.mission ? state.mission.index + 1 : '?'} of 5.`);
  }

  function toTitle() {
    state = createState(seed);
    screen = SCREEN_TITLE;
    accumulator = 0;
    saved = hasSave();
    announce('Vice Shores. Press Enter or click to start.');
  }

  function handleActions() {
    const flags = input.takeActions();
    if (flags & ACTION_MUTE) {
      state.muted = !state.muted;
      audio.setMuted(state.muted);
    }
    if (flags & ACTION_WEAPON_FISTS) state.player.weapon = 'fists';
    if (flags & ACTION_WEAPON_PISTOL) state.player.weapon = 'pistol';
    const clicked = input.takeClick();
    if (screen === SCREEN_TITLE) {
      if ((flags & ACTION_CONFIRM) || clicked) {
        audio.unlock();
        audio.startMusic();
        newGame();
      }
      return flags;
    }
    if (screen === SCREEN_PLAY) {
      if (flags & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      }
      return flags;
    }
    if (screen === SCREEN_PAUSED) {
      if (flags & ACTION_PAUSE || flags & ACTION_CONFIRM) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
      return flags;
    }
    // Busted / wasted / ending: confirm (or click) goes back to play.
    if ((flags & ACTION_CONFIRM) || clicked) {
      state.busted = false;
      state.wasted = false;
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    return flags;
  }

  function step(flags) {
    const result = stepWorld(state, input, audio, STEP, flags);
    if (state.busted) {
      state.busted = false;
      screen = SCREEN_BUSTED;
      announce(`Busted. You paid $${state.lastFine || 0}.`);
      return;
    }
    if (state.wasted) {
      state.wasted = false;
      screen = SCREEN_WASTED;
      announce(`Wasted. The bill was $${state.lastFine || 0}.`);
      return;
    }
    if (result && result.type === 'complete') {
      saveGame(state);
      if (state.gameWon) {
        screen = SCREEN_ENDING;
        announce('The Big Score — you beat Vice Shores!');
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const flags = handleActions();
    if (screen === SCREEN_TITLE) {
      while (accumulator >= STEP) {
        stepWorld(state, titleInput, null, STEP);
        accumulator -= STEP;
      }
    } else if (screen === SCREEN_PLAY) {
      let first = true;
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step(first ? flags : 0);
        first = false;
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(state, screen);
    if (screen === SCREEN_TITLE) drawTitle(renderer, state, saved);
    else if (screen === SCREEN_PAUSED) { drawHUD(renderer, state, screen); drawPaused(renderer); }
    else if (screen === SCREEN_BUSTED) { drawHUD(renderer, state, screen); drawBusted(renderer, state.lastFine || 0); }
    else if (screen === SCREEN_WASTED) { drawHUD(renderer, state, screen); drawWasted(renderer, state.lastFine || 0); }
    else if (screen === SCREEN_ENDING) { drawHUD(renderer, state, screen); drawEnding(renderer, state); }
    else drawHUD(renderer, state, screen);
  }

  // Leaving the tab pauses a running game rather than letting the city move unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  // C on the title screen continues a saved campaign; S on pause saves and quits.
  window.addEventListener('keydown', (event) => {
    audio.unlock();
    if (event.repeat) return;
    if (screen === SCREEN_TITLE && (event.key === 'c' || event.key === 'C') && saved) continueGame();
    if (screen === SCREEN_PAUSED && (event.key === 's' || event.key === 'S')) {
      saveGame(state);
      toTitle();
    }
    if (screen === SCREEN_TITLE && (event.key === 'n' || event.key === 'N')) {
      clearSave();
      saved = false;
      newGame();
    }
  });
  canvas.addEventListener('pointerdown', () => audio.unlock());

  announce('Vice Shores. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
