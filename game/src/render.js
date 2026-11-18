// The camera and everything the eye sees: the city, the cars, the people, the effects.
// The HUD and the menu screens are drawn by hud.js on top of this.

import { PALETTE, WORLD } from './config.js';
import { ROAD_LINES } from './city.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_WASTED = 'wasted';
export const SCREEN_ENDING = 'ending';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const camera = { x: 1300, y: 1300, zoom: 1 };
  let width = 0;
  let height = 0;
  let dpr = 1;
  let now = 0;

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }
  window.addEventListener('resize', resize);
  resize();

  function screenToWorld(sx, sy) {
    return {
      x: camera.x + (sx - width / 2) / camera.zoom,
      y: camera.y + (sy - height / 2) / camera.zoom,
    };
  }

  function worldRect(x, y, w, h) {
    return {
      x: (x - camera.x) * camera.zoom + width / 2,
      y: (y - camera.y) * camera.zoom + height / 2,
      w: w * camera.zoom,
      h: h * camera.zoom,
    };
  }

  function worldPoint(x, y) {
    return { x: (x - camera.x) * camera.zoom + width / 2, y: (y - camera.y) * camera.zoom + height / 2 };
  }

  function drawGround(state) {
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(0, 0, width, height);
    const sand = worldRect(0, state.city.sandY, WORLD.size, WORLD.size - state.city.sandY);
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(sand.x, sand.y, sand.w, sand.h);
    const water = worldRect(0, state.city.waterY, WORLD.size, WORLD.size - state.city.waterY);
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(water.x, water.y, water.w, water.h);
    ctx.fillStyle = PALETTE.waterDeep;
    for (let i = 0; i < 8; i += 1) {
      const wy = water.y + 14 + i * 8 + Math.sin(now * 1.4 + i) * 3;
      ctx.fillRect(water.x, wy, water.w, 3);
    }
    const park = state.city.park;
    const pr = worldRect(park.x, park.y, park.w, park.h);
    ctx.fillStyle = PALETTE.parkGrass;
    ctx.fillRect(pr.x, pr.y, pr.w, pr.h);
    const pond = worldPoint(park.x + park.w / 2, park.y + park.h / 2);
    ctx.fillStyle = PALETTE.water;
    ctx.beginPath();
    ctx.ellipse(pond.x, pond.y, 34 * camera.zoom, 22 * camera.zoom, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRoads() {
    ctx.fillStyle = PALETTE.road;
    for (const line of ROAD_LINES) {
      const v = worldRect(line - WORLD.roadHalf, 0, WORLD.roadHalf * 2, WORLD.size);
      ctx.fillRect(v.x, v.y, v.w, v.h);
      const h = worldRect(0, line - WORLD.roadHalf, WORLD.size, WORLD.roadHalf * 2);
      ctx.fillRect(h.x, h.y, h.w, h.h);
    }
    ctx.fillStyle = PALETTE.sidewalk;
    for (const line of ROAD_LINES) {
      const v1 = worldRect(line - WORLD.roadHalf - 12, 0, 12, WORLD.size);
      const v2 = worldRect(line + WORLD.roadHalf, 0, 12, WORLD.size);
      ctx.fillRect(v1.x, v1.y, v1.w, v1.h);
      ctx.fillRect(v2.x, v2.y, v2.w, v2.h);
      const h1 = worldRect(0, line - WORLD.roadHalf - 12, WORLD.size, 12);
      const h2 = worldRect(0, line + WORLD.roadHalf, WORLD.size, 12);
      ctx.fillRect(h1.x, h1.y, h1.w, h1.h);
      ctx.fillRect(h2.x, h2.y, h2.w, h2.h);
    }
    ctx.fillStyle = PALETTE.lane;
    for (const line of ROAD_LINES) {
      for (let s = 40; s < WORLD.size; s += 90) {
        const d1 = worldRect(s, line - 2, 44, 4);
        const d2 = worldRect(line - 2, s, 4, 44);
        ctx.fillRect(d1.x, d1.y, d1.w, d1.h);
        ctx.fillRect(d2.x, d2.y, d2.w, d2.h);
      }
    }
  }

  function drawBuildings(state) {
    for (const b of state.city.buildings) {
      const r = worldRect(b.x, b.y, b.w, b.h);
      if (r.x > width || r.y > height || r.x + r.w < 0 || r.y + r.h < 0) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(r.x + 5, r.y + 6, r.w, r.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(r.x + 5, r.y + 5, r.w - 10, r.h - 10);
      ctx.fillStyle = b.color;
      ctx.fillRect(r.x + 8, r.y + 8, r.w - 16, r.h - 16);
      if (b.floors > 3) {
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        const rows = Math.min(b.floors, 8);
        for (let f = 0; f < rows; f += 1) {
          ctx.fillRect(r.x + 10, r.y + 10 + f * ((r.h - 20) / rows), r.w - 20, 2);
        }
      }
      if (b.name) {
        ctx.fillStyle = 'rgba(12,14,20,0.65)';
        ctx.font = `bold ${Math.max(10, 12 * camera.zoom)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(b.name, r.x + r.w / 2, r.y + r.h + 14);
      }
    }
    for (const c of state.city.containers) {
      const r = worldRect(c.x, c.y, c.w, c.h);
      ctx.save();
      ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
      ctx.rotate(c.angle);
      ctx.fillStyle = c.color;
      ctx.fillRect(-r.w / 2, -r.h / 2, r.w, r.h);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(-r.w / 2, -r.h / 2, r.w, 4);
      ctx.restore();
    }
    for (const boat of state.city.boats) {
      const p = worldPoint(boat.x, boat.y + Math.sin(now + boat.x) * 2);
      ctx.fillStyle = boat.color;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 26 * camera.zoom, 9 * camera.zoom, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const tree of state.city.trees) {
      const p = worldPoint(tree.x, tree.y);
      if (p.x < -30 || p.y < -30 || p.x > width + 30 || p.y > height + 30) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.arc(p.x + 3, p.y + 4, tree.r * camera.zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.tree;
      ctx.beginPath();
      ctx.arc(p.x, p.y, tree.r * camera.zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.arc(p.x - 3, p.y - 3, tree.r * 0.45 * camera.zoom, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCar(car, isPlayer) {
    const p = worldPoint(car.x, car.y);
    const len = 46 * camera.zoom;
    const wid = 24 * camera.zoom;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(car.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    roundRect(ctx, -len / 2 + 3, -wid / 2 + 4, len, wid, 7);
    ctx.fill();
    ctx.fillStyle = car.dead ? '#3a3a3a' : car.color;
    roundRect(ctx, -len / 2, -wid / 2, len, wid, 7);
    ctx.fill();
    if (!car.dead) {
      ctx.fillStyle = 'rgba(20,30,44,0.85)';
      roundRect(ctx, len * 0.08, -wid / 2 + 3, len * 0.22, wid - 6, 4);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      roundRect(ctx, -len * 0.28, -wid / 2 + 3, len * 0.3, wid - 6, 4);
      ctx.fill();
      ctx.fillStyle = '#14161a';
      const wy = wid / 2 - 1;
      ctx.fillRect(-len * 0.32, -wy - 3, 10, 4);
      ctx.fillRect(len * 0.2, -wy - 3, 10, 4);
      ctx.fillRect(-len * 0.32, wy - 1, 10, 4);
      ctx.fillRect(len * 0.2, wy - 1, 10, 4);
      if (car.kind === 'police') {
        const on = Math.floor(now * 6) % 2 === 0;
        ctx.fillStyle = on ? '#ff3b30' : '#2f6df6';
        ctx.fillRect(-4, -wid / 2 - 2, 8, 5);
        ctx.fillStyle = on ? '#2f6df6' : '#ff3b30';
        ctx.fillRect(-4, wid / 2 - 3, 8, 5);
        ctx.fillStyle = '#14161a';
        ctx.font = `bold ${10 * camera.zoom}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('PD', 0, 3);
      }
      if (car.kind === 'taxi') {
        ctx.fillStyle = '#14161a';
        ctx.font = `bold ${9 * camera.zoom}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('TAXI', 0, 3);
      }
      if (isPlayer) {
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 2;
        roundRect(ctx, -len / 2 - 3, -wid / 2 - 3, len + 6, wid + 6, 9);
        ctx.stroke();
      }
    }
    ctx.restore();
    if (car.marked && !car.dead) {
      ctx.strokeStyle = `rgba(242, 201, 76, ${0.6 + 0.4 * Math.sin(now * 5)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 34 * camera.zoom, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawPerson(x, y, angle, shirt, skin, isPlayer, punchAnim, down) {
    const p = worldPoint(x, y);
    const r = 13 * camera.zoom;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (down) {
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillStyle = shirt;
      roundRect(ctx, -r, -r * 0.6, r * 2, r * 1.2, 5);
      ctx.fill();
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(r + 4, 0, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(2, 3, r, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(angle);
    ctx.fillStyle = shirt;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    const reach = punchAnim > 0 ? r + 10 : r + 3;
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(reach, -r * 0.45, r * 0.32, 0, Math.PI * 2);
    ctx.arc(reach, r * 0.45, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(r * 0.35, 0, r * 0.62, 0, Math.PI * 2);
    ctx.fill();
    if (isPlayer) {
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPickups(state) {
    for (const pk of state.pickups) {
      const bob = Math.sin(now * 3 + pk.bob) * 3;
      const p = worldPoint(pk.x, pk.y + bob);
      const r = 13 * camera.zoom;
      ctx.save();
      ctx.translate(p.x, p.y);
      if (pk.kind === 'health') {
        ctx.fillStyle = '#f4f1e8';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e5534b';
        ctx.fillRect(-2, -8, 4, 16);
        ctx.fillRect(-8, -2, 16, 4);
      } else if (pk.kind === 'ammo') {
        ctx.fillStyle = '#2b2f38';
        roundRect(ctx, -r, -r * 0.7, r * 2, r * 1.4, 4);
        ctx.fill();
        ctx.fillStyle = '#ffd166';
        ctx.font = `bold ${11 * camera.zoom}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('AMMO', 0, 4);
      } else if (pk.kind === 'cash') {
        ctx.fillStyle = '#58b368';
        roundRect(ctx, -r, -r * 0.6, r * 2, r * 1.2, 3);
        ctx.fill();
        ctx.fillStyle = '#f4f1e8';
        ctx.font = `bold ${12 * camera.zoom}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('$', 0, 4);
      } else {
        ctx.fillStyle = '#118ab2';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f4f1e8';
        ctx.font = `bold ${12 * camera.zoom}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('FIX', 0, 4);
      }
      ctx.restore();
    }
  }

  function drawMarker(state) {
    const m = state.mission;
    if (!m || !m.target) return;
    const p = worldPoint(m.target.x, m.target.y);
    const pulse = 1 + 0.15 * Math.sin(now * 4);
    const r = 16 * camera.zoom * pulse;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#f2c94c';
    ctx.fillRect(-r * 0.6, -r * 0.6, r * 1.2, r * 1.2);
    ctx.fillStyle = '#14161a';
    ctx.font = `bold ${12 * camera.zoom}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.rotate(-Math.PI / 4);
    ctx.fillText('!', 0, 4);
    ctx.restore();
    ctx.fillStyle = 'rgba(12,14,20,0.65)';
    ctx.font = `bold ${12 * camera.zoom}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(m.target.label, p.x, p.y - 30);
  }

  function drawSkids(state) {
    ctx.strokeStyle = 'rgba(20,20,24,0.35)';
    ctx.lineWidth = 4 * camera.zoom;
    for (const s of state.skidmarks) {
      const p = worldPoint(s.x, s.y);
      ctx.globalAlpha = Math.min(0.5, s.life / 6);
      ctx.beginPath();
      ctx.moveTo(p.x - Math.cos(s.angle) * 12, p.y - Math.sin(s.angle) * 12);
      ctx.lineTo(p.x + Math.cos(s.angle) * 12, p.y + Math.sin(s.angle) * 12);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawParticles(state) {
    for (const pt of state.particles) {
      const p = worldPoint(pt.x, pt.y);
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, pt.size * camera.zoom, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.font = `bold ${14 * camera.zoom}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    for (const f of state.floats) {
      const p = worldPoint(f.x, f.y);
      ctx.globalAlpha = Math.min(1, f.life);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  function draw(state, screen) {
    resize();
    now = state.time;
    const p = state.player;
    const targetZoom = p.inCar ? 0.92 : 1.05;
    camera.zoom += (targetZoom - camera.zoom) * 0.04;
    camera.x += (p.x - camera.x) * 0.12;
    camera.y += (p.y - camera.y) * 0.12;
    camera.x = Math.max(width / 2 / camera.zoom - 100, Math.min(WORLD.size - width / 2 / camera.zoom + 100, camera.x));
    camera.y = Math.max(height / 2 / camera.zoom - 100, Math.min(WORLD.size - height / 2 / camera.zoom + 100, camera.y));
    const shakeX = state.shake ? (Math.random() - 0.5) * state.shake : 0;
    const shakeY = state.shake ? (Math.random() - 0.5) * state.shake : 0;
    ctx.setTransform(dpr, 0, 0, dpr, shakeX * dpr, shakeY * dpr);
    ctx.clearRect(-20, -20, width + 40, height + 40);

    drawGround(state);
    drawRoads();
    drawBuildings(state);
    drawSkids(state);
    drawPickups(state);
    drawMarker(state);
    for (const car of state.cars) drawCar(car, car === p.inCar);
    for (const ped of state.peds) {
      drawPerson(ped.x, ped.y, ped.angle, ped.shirt, ped.skin, false, 0, ped.state === 'down');
    }
    for (const cop of state.cops) {
      if (cop.inCar) continue;
      drawPerson(cop.x, cop.y, cop.angle, '#2b4c9b', '#e8b98a', false, 0, cop.down);
      if (cop.state === 'arrest') {
        const cp = worldPoint(cop.x, cop.y - 26);
        ctx.fillStyle = '#e5534b';
        ctx.font = `bold ${12 * camera.zoom}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('BUSTED?', cp.x, cp.y);
      }
    }
    if (!p.inCar && !p.dead) drawPerson(p.x, p.y, p.angle, '#ef476f', '#e8b98a', true, p.punchAnim, false);
    drawParticles(state);
    if (p.health < 30 && !p.dead) {
      const g = ctx.createRadialGradient(width / 2, height / 2, height * 0.35, width / 2, height / 2, height * 0.75);
      g.addColorStop(0, 'rgba(229,83,75,0)');
      g.addColorStop(1, `rgba(229,83,75,${0.35 + 0.15 * Math.sin(now * 5)})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
    }
    return { width, height };
  }

  return { draw, camera, screenToWorld, get ctx() { return ctx; }, get width() { return width; }, get height() { return height; } };
}
