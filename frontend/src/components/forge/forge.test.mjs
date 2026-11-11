// Zero-dependency unit tests for the pure parts of the forge (math, IK, physics, grading).
// Run:  node src/components/forge/forge.test.mjs      (Node ≥ 20.19 / 22.7)
import assert from 'node:assert/strict';
import * as G from './geometry.js';
import * as P from './physics.js';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ✓', name); };

t('clamp / ss / easing bounds', () => {
  assert.equal(G.clamp(5), 1); assert.equal(G.clamp(-5), 0);
  assert.equal(G.ss(0), 0); assert.equal(G.ss(1), 1); assert.equal(G.ss(0.5), 0.5);
  assert.equal(G.easeOut(1), 1); assert.equal(G.easeIn(0), 0);
});

t('IK: bone lengths are preserved and the hand is reach-clamped', () => {
  for (const [tx, ty] of [[40, 30], [10, 5], [300, 200], [-60, 10], [0, 80]]) {
    const r = G.ik(0, 0, tx, ty, 30, 28, 1);
    assert.ok(Math.abs(Math.hypot(r.ex, r.ey) - 30) < 1e-6, 'upper arm length');
    assert.ok(Math.abs(Math.hypot(r.hx - r.ex, r.hy - r.ey) - 28) < 0.6, 'forearm length');
    assert.ok(Math.hypot(r.hx, r.hy) <= 57.5 + 1e-9, 'never over-extends');
  }
  const a = G.ik(0, 0, 40, 0, 30, 28, 1), b = G.ik(0, 0, 40, 0, 30, 28, -1);
  assert.ok(a.ey > 0 && b.ey < 0, 'bend flips the elbow');
  assert.ok(Number.isFinite(G.ik(5, 5, 5, 5, 30, 28).ex), 'zero distance is safe');
});

t('weaponFor: rating and difficulty ladders', () => {
  assert.equal(G.weaponFor({ rating: 800 }), 'tanto'); assert.equal(G.weaponFor({ rating: 1299 }), 'tanto');
  assert.equal(G.weaponFor({ rating: 1300 }), 'katana'); assert.equal(G.weaponFor({ rating: 1900 }), 'odachi');
  assert.equal(G.weaponFor({ rating: 2400 }), 'naginata');
  assert.equal(G.weaponFor({ difficulty: 'easy' }), 'tanto'); assert.equal(G.weaponFor({ difficulty: 'hard' }), 'odachi');
  assert.equal(G.weaponFor({}), 'katana');
});

t('expectedMinutes', () => {
  assert.equal(G.expectedMinutes({ rating: 800 }), 10); assert.equal(G.expectedMinutes({ rating: 1800 }), 60);
  assert.equal(G.expectedMinutes({ rating: 5000 }), 100);
  assert.equal(G.expectedMinutes({ difficulty: 'medium' }), 30);
});

t('gradeFor: thresholds, manual cap, failed-strike penalty', () => {
  const lc = { difficulty: 'medium' };                         // 30 min budget
  assert.equal(G.gradeFor(lc, 10 * 60), 'masterwork');
  assert.equal(G.gradeFor(lc, 10 * 60, true), 'fine');          // self-reported never masterwork
  assert.equal(G.gradeFor(lc, 30 * 60), 'fine');
  assert.equal(G.gradeFor(lc, 50 * 60), 'tempered');
  assert.equal(G.gradeFor(lc, 90 * 60), 'rough');
  assert.equal(G.gradeFor(lc, 17 * 60, false, 0), 'masterwork'); // 17/30 = 0.57
  assert.equal(G.gradeFor(lc, 17 * 60, false, 1), 'fine');       // ×1.1 → 0.62
  assert.equal(G.gradeFor(lc, 60, false, 99), 'masterwork');     // penalty is capped (max ×2)
});

t('stageIndex + fmtTime', () => {
  assert.deepEqual([0, 0.07, 0.08, 0.34, 0.35, 0.7, 5].map(G.stageIndex), [0, 0, 1, 1, 2, 3, 3]);
  assert.equal(G.fmtTime(0), '0:00'); assert.equal(G.fmtTime(75), '1:15'); assert.equal(G.fmtTime(3725), '1:02:05');
  assert.equal(G.fmtTime(-4), '0:00');
});

t('blade paths: valid SVG numbers for every weapon, no NaN', () => {
  for (const [k, w] of Object.entries(G.WEAPONS)) {
    for (const s of [0.1, 0.5, 1]) for (const d of [G.bladeD(w.L, w.h, s, w.curve), G.hamonD(w.L, w.h, w.curve), G.shinogiD(w.L, w.h, w.curve)])
      assert.ok(typeof d === 'string' && d.startsWith('M') && !/NaN|undefined|Infinity/.test(d), `${k} ${s}`);
  }
});

t('heatColor is defined across the whole range', () => {
  for (const h of [-1, 0, 0.25, 0.5, 0.75, 1, 2]) assert.ok(/NaN|undefined/.test(String(G.heatColor(h))) === false);
});

t('rope: anchor pinned, segment lengths ≈ rest length, settles under gravity, wind pushes sideways', () => {
  const r = P.createRope(7, 6);
  for (let i = 0; i < 240; i++) P.stepRope(r, 100, 50, 1 / 60, { wind: 0 });
  assert.equal(r.p[0].x, 100); assert.equal(r.p[0].y, 50);
  for (let i = 1; i < r.n; i++) {
    const d = Math.hypot(r.p[i].x - r.p[i - 1].x, r.p[i].y - hY(r, i - 1));
    assert.ok(Math.abs(d - 6) < 1.5, `seg ${i} = ${d.toFixed(2)}`);
  }
  assert.ok(r.p[6].y > 50 + 20, 'hangs down');
  const w = P.createRope(7, 6);
  for (let i = 0; i < 240; i++) P.stepRope(w, 100, 50, 1 / 60, { wind: 900 });
  assert.ok(w.p[6].x > r.p[6].x + 3, 'wind blows it sideways');
  for (const p of w.p) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
  function hY(rr, i) { return rr.p[i].y; }
});

t('springStep: converges, no NaN, bounded overshoot', () => {
  const s = { x: 0, v: 0 }; let peak = 0;
  for (let i = 0; i < 600; i++) { P.springStep(s, 10, 1 / 60); peak = Math.max(peak, s.x); }
  assert.ok(Math.abs(s.x - 10) < 0.01 && Math.abs(s.v) < 0.01); assert.ok(peak < 14);
  const z = { x: 0, v: 0 }; for (let i = 0; i < 100; i++) P.springStep(z, 5, 1 / 30, 400, 30);   // worst documented case
  assert.ok(Number.isFinite(z.x));
});

t('approach is frame-rate independent', () => {
  let a = 0, b = 0;
  for (let i = 0; i < 60; i++) a = P.approach(a, 1, 1 / 60, 8);
  for (let i = 0; i < 30; i++) b = P.approach(b, 1, 1 / 30, 8);
  assert.ok(Math.abs(a - b) < 1e-9);
});

console.log(`\nALL ${n} FORGE UNIT TESTS PASSED`);
