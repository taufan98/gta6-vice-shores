// Every sound in Vice Shores is synthesized with WebAudio: no audio files, no network.
// Engine hum, sirens, gunshots, a bassline — all oscillators and filtered noise.

export function createAudio() {
  let ctx = null;
  let master = null;
  let noiseBuffer = null;
  let engineOsc = null;
  let engineGain = null;
  let engineFilter = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenLfo = null;
  let musicTimer = null;
  let musicStep = 0;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      const len = ctx.sampleRate;
      noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
      // Engine: a sawtooth through a lowpass, pitch and loudness follow speed.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 50;
      engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 320;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      // Siren: two tones alternating, driven by an LFO.
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 700;
      sirenLfo = ctx.createOscillator();
      sirenLfo.type = 'square';
      sirenLfo.frequency.value = 1.6;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 140;
      sirenLfo.connect(lfoGain);
      lfoGain.connect(sirenOsc.frequency);
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      sirenLfo.start();
      startMusic();
    } catch {
      ctx = null;
      return false;
    }
    return true;
  }

  function tone(freq, duration, type, volume, slideTo) {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume || 0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  }

  function noise(duration, filterFreq, volume, type) {
    if (!ctx || muted) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type || 'lowpass';
    filter.frequency.value = filterFreq || 1000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume || 0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
    src.stop(ctx.currentTime + duration + 0.02);
  }

  // A slow synthwave bassline: Am – F – C – G, one note per eighth, plus a hat tick.
  const BASS = [55, 55, 65.41, 55, 43.65, 43.65, 55, 49];
  function startMusic() {
    if (musicTimer || !ctx) return;
    musicTimer = window.setInterval(() => {
      if (muted || !ctx) return;
      const step = musicStep % 8;
      const freq = BASS[step];
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.09, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      osc.stop(ctx.currentTime + 0.24);
      if (step % 2 === 0) noise(0.03, 6000, 0.03, 'highpass');
      musicStep += 1;
    }, 240);
  }

  return {
    /** Call from the first user gesture; browsers block audio before one. */
    init() {
      if (ensure() && ctx.state === 'suspended') ctx.resume();
    },
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = value ? 0 : 0.5;
    },
    isMuted() { return muted; },
    engine(ratio, active) {
      if (!ctx || muted) return;
      const target = active ? 0.05 + ratio * 0.06 : 0;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(46 + ratio * 130, ctx.currentTime, 0.08);
    },
    siren(on) {
      if (!ctx) return;
      sirenGain.gain.setTargetAtTime(on && !muted ? 0.045 : 0, ctx.currentTime, 0.2);
    },
    shot() { noise(0.12, 2400, 0.4, 'bandpass'); tone(180, 0.08, 'square', 0.12, 60); },
    punch() { tone(120, 0.12, 'sine', 0.35, 55); noise(0.08, 500, 0.2); },
    thud() { tone(90, 0.18, 'sine', 0.3, 45); },
    crash() { noise(0.25, 900, 0.4); tone(70, 0.2, 'sawtooth', 0.15, 40); },
    explosion() { noise(0.9, 700, 0.6); tone(55, 0.8, 'sine', 0.5, 28); },
    pickup() { tone(880, 0.09, 'sine', 0.18); window.setTimeout(() => tone(1318, 0.12, 'sine', 0.18), 70); },
    door() { tone(300, 0.06, 'square', 0.1, 180); },
    hurt() { tone(220, 0.25, 'sawtooth', 0.2, 90); },
    mission() { [523, 659, 784, 1046].forEach((f, i) => window.setTimeout(() => tone(f, 0.16, 'triangle', 0.2), i * 110)); },
    busted() { [392, 330, 262, 196].forEach((f, i) => window.setTimeout(() => tone(f, 0.22, 'triangle', 0.2), i * 160)); },
  };
}
