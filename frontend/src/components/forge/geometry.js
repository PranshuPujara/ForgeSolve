/* Pure helpers for the Forge scene: math, weapons, grading. No React here. */

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ss = t => { t = clamp(t); return t * t * (3 - 2 * t); };            // smoothstep
export const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = t => Math.pow(clamp(t), 3);

/** Two-bone IK in 2D. Returns elbow + the (reach-clamped) hand. bend: +1 elbow below, -1 above. */
export function ik(sx, sy, tx, ty, l1, l2, bend = 1) {
  let dx = tx - sx, dy = ty - sy;
  let d = Math.hypot(dx, dy) || 0.001;
  const reach = l1 + l2 - 0.5;
  const dd = Math.min(d, reach);
  const ux = dx / d, uy = dy / d;
  const a = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd);
  const h = Math.sqrt(Math.max(l1 * l1 - a * a, 0));
  return {
    ex: sx + ux * a - uy * h * bend, ey: sy + uy * a + ux * h * bend,
    hx: sx + ux * dd, hy: sy + uy * dd,
  };
}

/** Heated-steel colour: grey → dull red → orange → yellow-white. Theme tokens only. */
export function heatColor(h) {
  h = clamp(h);
  if (h < 0.03) return 'var(--t3)';
  if (h < 0.45) return `color-mix(in srgb, var(--red) ${Math.round((h / 0.45) * 100)}%, var(--t3))`;
  if (h < 0.8) return `color-mix(in srgb, var(--orange) ${Math.round(((h - 0.45) / 0.35) * 100)}%, var(--red))`;
  const k = (h - 0.8) / 0.2;
  return `color-mix(in srgb, color-mix(in srgb, var(--yellow) ${Math.round(k * 100)}%, var(--orange)) ${Math.round(100 - k * 28)}%, var(--t1))`;
}

/* ── Weapons (local space: origin at the tang, blade points +x) ─────────────────── */
export const WEAPONS = {
  tanto:    { label: 'Tantō',    L: 64,  curve: 2,  h: 5,   pole: 0,  guard: 8  },
  katana:   { label: 'Katana',   L: 112, curve: 9,  h: 5.5, pole: 0,  guard: 10 },
  odachi:   { label: 'Ōdachi',   L: 132, curve: 11, h: 6,   pole: 0,  guard: 12 },
  naginata: { label: 'Naginata', L: 104, curve: 15, h: 8,   pole: 30, guard: 9  },
};

/** s: 0 = raw bar, 1 = finished blade. curve: sori in px. */
export function bladeD(L, h0, s, curve) {
  const h = lerp(h0 * 1.25, h0, s);
  const tipTop = lerp(-h, -curve, s);
  const tipBot = lerp(h, -curve, s);
  const f = n => n.toFixed(2);
  return `M0 ${f(-h)} Q${f(L * 0.55)} ${f(-h - curve * 0.5)} ${f(L)} ${f(tipTop)} `
       + `L${f(L)} ${f(tipBot)} Q${f(L * 0.55)} ${f(h - curve * 0.7)} 0 ${f(h)} Z`;
}

/** Wavy hamon line following the edge. */
export function hamonD(L, h0, curve) {
  const pts = [];
  const N = 26;
  for (let i = 0; i <= N; i++) {
    const t = 0.06 + (i / N) * 0.86;           // along the blade
    const x = L * t;
    const edge = (1 - t) * (1 - t) * h0 + 2 * (1 - t) * t * (h0 - curve * 0.7) + t * t * -curve; // quad bezier (edge side)
    const y = edge - 3.2 + Math.sin(i * 1.15) * 1.3;
    pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return `M${pts.join(' L')}`;
}

export const GRADES = {
  masterwork: { label: 'Masterwork', color: 'var(--yellow)',  line: 'Masterwork. My teacher would weep.' },
  fine:       { label: 'Fine',       color: 'var(--primary)', line: 'A fine blade. Well struck.' },
  tempered:   { label: 'Tempered',   color: 'var(--green)',   line: 'Honest steel. Properly tempered.' },
  rough:      { label: 'Rough',      color: 'var(--t2)',      line: 'Rough — but a blade is a blade. It cut.' },
};

/** Minutes a typical solver needs. CF scales with rating; LC/GFG with difficulty. */
export function expectedMinutes(problem) {
  if (problem?.rating) return clamp(10 + (problem.rating - 800) * 0.05, 10, 100);
  return { easy: 15, medium: 30, hard: 50 }[problem?.difficulty] || 30;
}

export function weaponFor(problem) {
  if (problem?.rating) {
    if (problem.rating >= 2400) return 'naginata';
    if (problem.rating >= 1900) return 'odachi';
    if (problem.rating >= 1300) return 'katana';
    return 'tanto';
  }
  return { easy: 'tanto', medium: 'katana', hard: 'odachi' }[problem?.difficulty] || 'katana';
}

/** Each failed submission ("failed strike") costs 10 % of the time budget; self-reported solves can't be Masterwork. */
export function gradeFor(problem, seconds, manual = false, attempts = 0) {
  const r = (seconds * (1 + 0.1 * Math.min(attempts, 10))) / 60 / expectedMinutes(problem);
  let g = r <= 0.6 ? 'masterwork' : r <= 1.2 ? 'fine' : r <= 2.5 ? 'tempered' : 'rough';
  if (manual && g === 'masterwork') g = 'fine';   // self-reported solves can't be masterwork
  return g;
}

/** Forging stage from fraction of expected time. */
export const STAGES = [
  { id: 'heat',   label: 'Heat',   from: 0,    hint: 'Heating the steel. Read the statement slowly.' },
  { id: 'fold',   label: 'Fold',   from: 0.08, hint: 'Folding the steel. Break the problem into pieces.' },
  { id: 'shape',  label: 'Shape',  from: 0.35, hint: 'Shaping the edge. Does your idea survive the samples?' },
  { id: 'refine', label: 'Refine', from: 0.7,  hint: 'Refining. Check edge cases — off-by-one, overflow.' },
];
export const stageIndex = prog => STAGES.reduce((acc, s, i) => (prog >= s.from ? i : acc), 0);

export const fmtTime = s => {
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + `:${String(x).padStart(2, '0')}`;
};

/** Thin ridge line (shinogi) following the spine of a finished blade. */
export function shinogiD(L, h0, curve) {
  const f = n => n.toFixed(2);
  return `M${f(L * 0.08)} ${f(-h0 * 0.35)} Q${f(L * 0.55)} ${f(-h0 * 0.35 - curve * 0.5)} ${f(L * 0.97)} ${f(-curve + 0.6)}`;
}
