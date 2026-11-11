/* Synthesised forge sounds (Web Audio, zero assets). Created lazily after a user gesture; silent by default. */
export function createForgeAudio() {
  let ctx = null, master = null, noiseBuf = null;
  const ensure = () => {
    if (ctx) return ctx;
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return null;
    try {
      ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch { ctx = null; }
    return ctx;
  };
  const env = (g, t, peak, dur) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); };
  const tone = (type, f, t, peak, dur, f2) => {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    env(g, t, peak, dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  };
  const noise = (t, peak, dur, lo, hi) => {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = (lo + hi) / 2; f.Q.value = 0.8;
    const g = ctx.createGain(); env(g, t, peak, dur); s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.02);
  };
  return {
    enable() { const c = ensure(); if (c && c.state === 'suspended') c.resume(); return !!c; },
    clink(power = 1) { if (!ctx) return; const t = ctx.currentTime, j = 1 + Math.random() * 0.06;
      tone('sine', 1900 * j, t, 0.12 * power, 0.22); tone('triangle', 3100 * j, t, 0.06 * power, 0.12); tone('sine', 140, t, 0.2 * power, 0.09, 70); noise(t, 0.05 * power, 0.03, 3000, 9000); },
    hiss(dur = 1.7) { if (!ctx) return; noise(ctx.currentTime, 0.14, dur, 4500, 9000); },
    chime(grade = 'fine') { if (!ctx) return; const t = ctx.currentTime;
      const notes = grade === 'masterwork' ? [784, 988, 1175, 1568] : grade === 'rough' ? [523, 659] : [659, 880, 1175];
      notes.forEach((f, i) => { tone('sine', f, t + i * 0.12, 0.09, 0.9); tone('triangle', f * 2, t + i * 0.12, 0.02, 0.6); }); },
    buzz() { if (!ctx) return; tone('sawtooth', 120, ctx.currentTime, 0.08, 0.2, 70); },
  };
}
