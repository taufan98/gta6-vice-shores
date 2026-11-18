// Particles, skid marks and floating text: the juice. Particles live in state.particles
// and are drawn by the renderer; skid marks fade slowly on the asphalt.

export function spawnSmoke(state, x, y, count, color) {
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const speed = 20 + Math.random() * 60;
    state.particles.push({
      x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      life: 0.5 + Math.random() * 0.5, maxLife: 1,
      size: 3 + Math.random() * 5, color: color || '#9a9a9a', kind: 'smoke',
    });
  }
}

export function spawnSparks(state, x, y, count, color) {
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const speed = 120 + Math.random() * 220;
    state.particles.push({
      x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      life: 0.2 + Math.random() * 0.25, maxLife: 0.45,
      size: 2 + Math.random() * 2, color: color || '#ffd166', kind: 'spark',
    });
  }
}

export function spawnExplosion(state, x, y) {
  spawnSmoke(state, x, y, 26, '#3a3a3a');
  spawnSparks(state, x, y, 30, '#ff9f1c');
  spawnSparks(state, x, y, 14, '#e5534b');
  state.shake = Math.max(state.shake || 0, 14);
}

export function addSkid(state, x, y, angle) {
  state.skidmarks.push({ x, y, angle, life: 6 });
  if (state.skidmarks.length > 220) state.skidmarks.shift();
}

export function updateParticles(state, dt) {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.life -= dt;
    if (p.life <= 0) { state.particles.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.94;
    p.vy *= 0.94;
    if (p.kind === 'smoke') p.size += 14 * dt;
  }
  for (let i = state.skidmarks.length - 1; i >= 0; i -= 1) {
    state.skidmarks[i].life -= dt;
    if (state.skidmarks[i].life <= 0) state.skidmarks.splice(i, 1);
  }
  for (let i = state.floats.length - 1; i >= 0; i -= 1) {
    const f = state.floats[i];
    f.life -= dt;
    f.y -= 28 * dt;
    if (f.life <= 0) state.floats.splice(i, 1);
  }
  if (state.shake) state.shake = Math.max(0, state.shake - 40 * dt);
}
