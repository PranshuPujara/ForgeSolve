/* Tiny game-physics helpers: verlet rope (headband), damped spring (lantern, soft follow). Pure, testable. */

export function createRope(n, seg) {
  return { n, seg, p: Array.from({ length: n }, (_, i) => ({ x: 0, y: i * seg, px: 0, py: i * seg })) };
}

/** One fixed step. Anchor pins node 0. Gravity/wind in px/s². */
export function stepRope(rope, ax, ay, dt, { gravity = 420, damping = 0.985, wind = 0, iterations = 5 } = {}) {
  const P = rope.p;
  for (let i = 1; i < P.length; i++) {
    const p = P[i];
    const vx = (p.x - p.px) * damping, vy = (p.y - p.py) * damping;
    p.px = p.x; p.py = p.y;
    p.x += vx + wind * dt * dt; p.y += vy + gravity * dt * dt;
  }
  P[0].x = P[0].px = ax; P[0].y = P[0].py = ay;
  for (let it = 0; it < iterations; it++) {
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-6;
      const k = (d - rope.seg) / d;
      if (i - 1 === 0) { b.x -= dx * k; b.y -= dy * k; }
      else { a.x += dx * k * 0.5; a.y += dy * k * 0.5; b.x -= dx * k * 0.5; b.y -= dy * k * 0.5; }
    }
  }
}

/** Semi-implicit damped spring toward `target`. s = { x, v }. Stable for dt ≤ 1/30 with k ≤ 400. */
export function springStep(s, target, dt, k = 120, c = 18) {
  s.v += ((target - s.x) * k - s.v * c) * dt;
  s.x += s.v * dt;
  return s.x;
}

/** Frame-rate independent exponential smoothing. */
export const approach = (cur, target, dt, rate = 10) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
