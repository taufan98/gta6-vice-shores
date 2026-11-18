// The HUD: health, cash, wanted stars, the minimap, the objective and the subtitles —
// plus every menu screen (title, pause, busted, wasted, the ending). The world itself
// is drawn by render.js; this is everything drawn on top of it.

import { PALETTE, WORLD } from './config.js';
import { ROAD_LINES } from './city.js';
import { nearestStealableCar } from './state.js';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(244,241,232,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w, h);
}

function drawStars(ctx, stars, x, y, size) {
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < stars ? '#ffd166' : 'rgba(244,241,232,0.3)';
    ctx.fillText('★', x + i * (size + 2), y);
  }
}

function drawMinimap(ctx, state, x, y, size) {
  const scale = size / WORLD.size;
  panel(ctx, x - 6, y - 6, size + 12, size + 12);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, size, size);
  ctx.clip();
  // Water and sand.
  ctx.fillStyle = '#2e7fb8';
  ctx.fillRect(x, y + state.city.waterY * scale, size, size - state.city.waterY * scale);
  ctx.fillStyle = '#e8d29a';
  ctx.fillRect(x, y + state.city.sandY * scale, size, (state.city.waterY - state.city.sandY) * scale);
  // Land.
  ctx.fillStyle = '#5d7a4a';
  ctx.fillRect(x, y, size, state.city.sandY * scale);
  // Roads.
  ctx.fillStyle = '#3a3f4a';
  for (const line of ROAD_LINES) {
    ctx.fillRect(x, y + line * scale - 2, size, 4);
    ctx.fillRect(x + line * scale - 2, y, 4, size);
  }
  // Buildings.
  ctx.fillStyle = 'rgba(20,22,28,0.55)';
  for (const b of state.city.buildings) {
    ctx.fillRect(x + b.x * scale, y + b.y * scale, Math.max(2, b.w * scale), Math.max(2, b.h * scale));
  }
  // Cars.
  ctx.fillStyle = '#c9c2b2';
  for (const car of state.cars) {
    if (car.dead) continue;
    ctx.fillRect(x + car.x * scale - 1, y + car.y * scale - 1, 3, 3);
  }
  // Cops.
  ctx.fillStyle = '#2f6df6';
  for (const cop of state.cops) {
    if (cop.down) continue;
    ctx.beginPath();
    ctx.arc(x + cop.x * scale, y + cop.y * scale, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Mission marker.
  if (state.mission?.target) {
    const pulse = 1 + 0.3 * Math.sin(state.time * 4);
    ctx.fillStyle = '#f2c94c';
    ctx.beginPath();
    ctx.arc(x + state.mission.target.x * scale, y + state.mission.target.y * scale, 4 * pulse, 0, Math.PI * 2);
    ctx.fill();
  }
  // The player, always in the middle of the action.
  const px = x + state.player.x * scale;
  const py = y + state.player.y * scale;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(state.player.angle);
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, -5);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
  ctx.fillStyle = PALETTE.text;
  ctx.font = `11px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('VICE SHORES', x, y + size + 18);
}

export function drawHUD(renderer, state, screen) {
  const ctx = renderer.ctx;
  const { width, height } = renderer;
  const p = state.player;

  // Top-left: health, cash, weapon.
  panel(ctx, 12, 12, 250, 86);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 15px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`$${state.cash}`, 24, 34);
  ctx.fillStyle = '#3a3f4a';
  ctx.fillRect(24, 44, 150, 12);
  ctx.fillStyle = p.health > 30 ? '#58b368' : '#e5534b';
  ctx.fillRect(24, 44, 150 * Math.max(0, p.health / 100), 12);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `13px ${FONT}`;
  ctx.fillText(`HP ${Math.ceil(p.health)}`, 180, 55);
  const weapon = p.inCar ? 'DRIVING' : p.weapon === 'pistol' ? `PISTOL  ${p.ammo}` : 'FISTS';
  ctx.fillText(weapon, 24, 78);
  if (p.inCar) {
    ctx.fillStyle = p.inCar.hp > 30 ? '#58b368' : '#e5534b';
    ctx.fillRect(120, 66, 130 * Math.max(0, p.inCar.hp / 100), 12);
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(`CAR ${Math.ceil(p.inCar.hp)}`, 120, 64);
  }

  // Top-centre: wanted stars and the objective.
  drawStars(ctx, state.wanted.stars, width / 2 - 70, 40, 26);
  if (state.objective) {
    ctx.font = `bold 14px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(12,14,20,0.7)';
    const w = ctx.measureText(state.objective).width + 24;
    ctx.fillRect(width / 2 - w / 2, 48, w, 26);
    ctx.fillStyle = '#f2c94c';
    ctx.fillText(state.objective, width / 2, 66);
  }

  // Top-right: the minimap.
  drawMinimap(ctx, state, width - 206, 12, 188);

  // Subtitles, bottom centre.
  ctx.font = `16px ${FONT}`;
  ctx.textAlign = 'center';
  const subs = state.subtitles.slice(-2);
  subs.forEach((s, i) => {
    const y = height - 92 + i * 24;
    ctx.fillStyle = 'rgba(12,14,20,0.7)';
    const w = ctx.measureText(s.text).width + 20;
    ctx.fillRect(width / 2 - w / 2, y - 18, w, 24);
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(s.text, width / 2, y);
  });

  // "Press E" prompt next to a stealable car.
  if (!p.inCar && !p.dead) {
    const car = nearestStealableCar(state, 64);
    if (car) {
      ctx.font = `bold 15px ${FONT}`;
      ctx.textAlign = 'center';
      const label = car.traffic ? 'Press E to jack this car' : 'Press E to get in';
      ctx.fillStyle = 'rgba(12,14,20,0.75)';
      const w = ctx.measureText(label).width + 20;
      ctx.fillRect(width / 2 - w / 2, height - 140, w, 28);
      ctx.fillStyle = '#ffd166';
      ctx.fillText(label, width / 2, height - 120);
    }
  }

  // Arrest progress: a cop is grabbing you.
  const arresting = state.cops.find((c) => c.state === 'arrest' && !c.down);
  if (arresting) {
    ctx.fillStyle = 'rgba(12,14,20,0.8)';
    ctx.fillRect(width / 2 - 130, height / 2 - 90, 260, 34);
    ctx.fillStyle = '#e5534b';
    ctx.fillRect(width / 2 - 122, height / 2 - 82, 244 * Math.min(1, arresting.arrestTimer / 1.2), 18);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 14px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('THE COP IS GRABBING YOU — FIGHT BACK!', width / 2, height / 2 - 60);
  }

  // Controls hint, early on.
  if (state.time < 20 && screen === 'play') {
    ctx.font = `13px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(244,241,232,0.75)';
    ctx.fillText('WASD move · E car · Click shoot · F punch · Shift run · P pause · M mute', 14, height - 14);
  }
}

function drawMenuPanel(renderer, title, lines, prompt, accent) {
  const ctx = renderer.ctx;
  const { width, height } = renderer;
  ctx.fillStyle = 'rgba(8,10,16,0.72)';
  ctx.fillRect(0, 0, width, height);
  const panelW = Math.min(680, width - 60);
  const panelH = 150 + lines.length * 30;
  const x = (width - panelW) / 2;
  const y = (height - panelH) / 2;
  panel(ctx, x, y, panelW, panelH);
  ctx.fillStyle = accent || '#f2c94c';
  ctx.font = `bold 44px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(title, width / 2, y + 74);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `17px ${FONT}`;
  lines.forEach((line, i) => ctx.fillText(line, width / 2, y + 118 + i * 30));
  ctx.fillStyle = '#ffd166';
  ctx.font = `bold 18px ${FONT}`;
  ctx.fillText(prompt, width / 2, y + panelH - 28);
}

export function drawTitle(renderer, state, hasSave) {
  const ctx = renderer.ctx;
  const { width, height } = renderer;
  // The city behind the title keeps moving: the title is a live postcard of Vice Shores.
  ctx.fillStyle = 'rgba(8,10,16,0.45)';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#f2c94c';
  ctx.font = `bold ${Math.min(96, width / 9)}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('VICE SHORES', width / 2, height / 2 - 90);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `italic 22px ${FONT}`;
  ctx.fillText('An open-world crime story in a sun-soaked city', width / 2, height / 2 - 52);
  ctx.font = `17px ${FONT}`;
  ctx.fillText('Leo Vasquez came back to Vice Shores for one last score.', width / 2, height / 2 - 8);
  ctx.fillText('Rosa has five jobs for him. The cops have other plans.', width / 2, height / 2 + 20);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `15px ${FONT}`;
  ctx.fillText('WASD move · E steal & drive · Mouse aim, click shoot · F punch · Shift run', width / 2, height / 2 + 64);
  ctx.fillText('P pause · M mute · Your progress saves after every job', width / 2, height / 2 + 88);
  ctx.fillStyle = '#ffd166';
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillText(hasSave ? 'ENTER — New game      C — Continue' : 'ENTER or CLICK — Start', width / 2, height / 2 + 132);
}

export function drawPaused(renderer) {
  drawMenuPanel(renderer, 'PAUSED', [
    'The city waits for you.',
    'WASD move · E car · Click shoot · F punch · Shift run',
    'S — Save and quit to the title screen',
  ], 'P or ENTER — Resume', '#f4f1e8');
}

export function drawBusted(renderer, fine) {
  drawMenuPanel(renderer, 'BUSTED!', [
    'Vice Shores PD took your cash and your ride.',
    `You paid $${fine}. The job starts over.`,
  ], 'ENTER — Walk out and try again', '#2f6df6');
}

export function drawWasted(renderer, fine) {
  drawMenuPanel(renderer, 'WASTED!', [
    'Shore General patched you up.',
    `The bill was $${fine}. The job starts over.`,
  ], 'ENTER — Get up and try again', '#e5534b');
}

export function drawEnding(renderer, state) {
  drawMenuPanel(renderer, 'THE BIG SCORE', [
    'Leo made the yacht. The money is gone, the sun is up, and Vice Shores is his.',
    `Jobs done: ${state.stats.missionsDone} · Cars stolen: ${state.stats.carsStolen} · Cash: $${state.cash}`,
    'Free roam continues — the city never sleeps.',
  ], 'ENTER — Keep playing Vice Shores', '#58b368');
}
