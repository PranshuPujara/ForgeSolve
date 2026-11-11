import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { WEAPONS, GRADES, STAGES, stageIndex, bladeD, hamonD, shinogiD, heatColor, ik, lerp, ss, easeOut, easeIn, clamp } from './geometry';
import { createRope, stepRope, springStep, approach } from './physics';
import { createForgeAudio } from './forgeAudio';
import './scene.css';

/*
  ForgeScene — "Tetsuji", the swordsmith.
  phase: cold | heating | strike | ready | forging | accepted
  Drawn once by React; everything that moves is driven imperatively by ONE rAF loop (no per-frame renders).
  Game-feel layer: hit-stop, camera shake, squash/stretch, spring-smoothed targets, verlet headband,
  pendulum lantern, bouncing spark streaks, cooling/reheating billet, parallax depth, flickering firelight.
*/

const W = 560, H = 300, FLOOR = 252;
const SHX = 268, SHY = 130, HIPX = 250, HIPY = 192;
const TIP = { x: 308, y: 199 };
const STRIKE_HAND = { x: 316, y: 178 };
const IMPACT = { x: 350, y: 194 };
const QUENCH = { x: 418, y: 242 };
const SKIN = 'color-mix(in srgb, var(--orange) 26%, var(--t2))';
const CLOTH = 'color-mix(in srgb, var(--blue) 22%, var(--bg-press))';
const APRON = 'color-mix(in srgb, var(--orange) 28%, var(--bg-el))';
const OBI = 'color-mix(in srgb, var(--red) 70%, var(--bg-el))';
const SPARK_COL = ['var(--yellow)', 'var(--orange)', 'var(--t1)', 'var(--red)'];
const N_SPARK = 40, N_STEAM = 18, N_PETAL = 26;

const cycleB = u => {                  // 0 = hammer raised, 1 = on the anvil
  if (u < 0.35) return -0.06 * Math.sin((u / 0.35) * Math.PI);          // wind-up (anticipation)
  if (u < 0.5) return easeIn((u - 0.35) / 0.15) * 1.04;                  // smash (slight overshoot)
  if (u < 0.6) return 1.04 - 0.26 * Math.sin(((u - 0.5) / 0.1) * Math.PI) - 0.04 * ((u - 0.5) / 0.1); // rebound
  return 1 - ss((u - 0.6) / 0.4);                                        // recover
};
const frac = x => x - Math.floor(x);
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function ForgeScene({
  phase = 'cold', heat = 0, progress = 0, weapon = 'katana', name = '', stage = null,
  result = null, trophies = [], accent = 'var(--primary)', flinch = 0,
  onReveal, _t = null, _u = null, className = '',
}) {
  const uid = useId().replace(/:/g, '');
  const R = useRef({ sparks: [], steam: [], petals: [] });
  const P = useRef({});
  const ptr = useRef({ x: 0, y: 0 });
  const audioRef = useRef(null);
  const [revealed, setRevealed] = useState(false);
  const [tipIdx, setTipIdx] = useState(0);
  const [hurt, setHurt] = useState(false);
  const [sound, setSound] = useState(() => { try { return localStorage.getItem('fs_forge_sound') === '1'; } catch { return false; } });
  const wp = WEAPONS[weapon] || WEAPONS.katana;

  if (sound && !audioRef.current) audioRef.current = createForgeAudio();
  P.current = {
    phase, heat, progress, weapon, accent, flinch, grade: result?.grade, _t, _u,
    audio: sound ? audioRef.current : null,
    onReveal: () => { setRevealed(true); onReveal && onReveal(); },
  };
  useEffect(() => { if (phase !== 'accepted') setRevealed(false); }, [phase]);
  useEffect(() => { const id = setInterval(() => setTipIdx(i => i + 1), 6500); return () => clearInterval(id); }, []);
  const firstFlinch = useRef(true);
  useEffect(() => {
    if (firstFlinch.current) { firstFlinch.current = false; return undefined; }
    if (!flinch) return undefined;
    setHurt(true); const id = setTimeout(() => setHurt(false), 6000); return () => clearTimeout(id);
  }, [flinch]);
  const toggleSound = () => {
    const next = !sound; setSound(next);
    try { localStorage.setItem('fs_forge_sound', next ? '1' : '0'); } catch { /* private mode */ }
    if (next) { audioRef.current = audioRef.current || createForgeAudio(); audioRef.current.enable(); audioRef.current.clink(0.8); }
  };

  /* ── animation loop ── */
  useEffect(() => {
    const reduce = reducedMotion();
    const st = {
      phase: null, t: 0, time: 0, u: 0, freeze: 0, shake: 0, squash: 0, flinchV: 0, lastFlinch: P.current.flinch || 0, revealed: false,
      heat: 0.95, reheat: 0, flare: 0, blink: 2.5, blinkT: 0, stride: 0, prevOx: 0, acc: 0, visible: true, hissed: false,
      sm: {}, sp: Array.from({ length: N_SPARK }, () => ({ on: false })), st2: Array.from({ length: N_STEAM }, () => ({ on: false })),
      pt: Array.from({ length: N_PETAL }, () => ({ on: false })), smAcc: 0, ptAcc: 0, fountAcc: 0, bx: -1,
      ropes: [createRope(6, 5), createRope(6, 6)], ropeInit: false, lan: { x: 0, v: 0 }, par: { x: 0, y: 0 },
    };
    const root = R.current.root;
    let io;
    if (root && 'IntersectionObserver' in window) { io = new IntersectionObserver(([e]) => { st.visible = e.isIntersecting; }, { threshold: 0.01 }); io.observe(root); }

    let raf, last = performance.now();
    const set = (el, a, v) => el && el.setAttribute(a, v);
    const poly = (el, ...pts) => set(el, 'points', pts.map(n => n.toFixed(1)).join(' '));
    const sm = (k, v, rate, dt) => (st.sm[k] = approach(st.sm[k] === undefined ? v : st.sm[k], v, dt, rate));
    const spawnSpark = (x, y, a, v, life, c, big) => {
      const s = st.sp.find(q => !q.on); if (!s) return;
      Object.assign(s, { on: true, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, c, w: big ? 2.4 : 1.4 });
    };

    const frame = now => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!st.visible) return;
      const p = P.current, r = R.current, ph = p.phase;
      const Wp = WEAPONS[p.weapon] || WEAPONS.katana;
      if (ph !== st.phase) {
        st.phase = ph; st.t = 0; st.revealed = false; st.u = 0; st.heat = 0.95; st.reheat = 0; st.hissed = false; st.ptAcc = 0; st.fountAcc = 0;
        if (reduce && ph === 'accepted') st.t = 5.3;
      }
      st.t += dt; st.time += dt;
      if (p._t != null) st.t = p._t;
      const t = st.t, prog = clamp(p.progress || 0, 0, 1.6);
      const audio = p.audio;

      /* wrong-answer flinch */
      if (p.flinch !== st.lastFlinch) {
        if (p.flinch > st.lastFlinch && !reduce) {
          st.flinchV = 1; st.shake = 2;
          for (let i = 0; i < 9; i++) spawnSpark(TIP.x + 20 + Math.random() * 30, 192, (-160 + Math.random() * 140) * Math.PI / 180, 60 + Math.random() * 120, 0.5 + Math.random() * 0.4, 3);
          audio && audio.buzz();
        }
        st.lastFlinch = p.flinch;
      }
      st.flinchV = Math.max(0, st.flinchV - dt * 2.2);
      const fl = st.flinchV * st.flinchV;

      /* hammer cycle (with hit-stop) */
      const hammering = !reduce && (ph === 'strike' || (ph === 'forging' && st.reheat <= 0) || (ph === 'accepted' && t < 0.7));
      const hdt = st.freeze > 0 ? 0 : dt; st.freeze = Math.max(0, st.freeze - dt);
      let impact = false, bRaw;
      if (hammering) {
        const per = ph === 'strike' ? 0.55 : ph === 'forging' ? (prog > 1 ? 1.5 : lerp(1.25, 0.9, prog)) : 0.9;
        const prev = st.u;
        st.u = p._u != null ? p._u : (st.u + hdt / per) % 1;
        if (p._u == null && prev < 0.5 && st.u >= 0.5) impact = true;
        bRaw = cycleB(st.u);
      } else { st.u = 0; bRaw = reduce ? 0 : Math.sin(st.time * 1.6) * 0.02; }
      const b = sm('b', bRaw, hammering ? 90 : 9, dt);

      /* cooling / reheating (forging only) */
      if (ph === 'forging') {
        if (st.reheat > 0) {
          st.reheat -= dt; st.heat = Math.min(0.97, st.heat + dt * 0.36);
          st.flare = Math.sin(Math.PI * clamp(1 - st.reheat / 1.3));
        } else { st.heat -= dt * 0.012; st.flare = approach(st.flare, 0, dt, 5); if (st.heat < 0.5) st.reheat = 1.3; }
      } else st.flare = approach(st.flare, 0, dt, 5);

      /* weapon state per phase */
      let wL = 52, ws = 0, wc = 0, wHeat = 0, tx = TIP.x, ty = TIP.y, wAng = 0;
      let handleOp = 0, hamonOp = 0, tongsOp = 1, fin = 0, glint = -1;
      let ox = 0, low = 0, walk = 0, rays = 0;
      const accepted = ph === 'accepted';
      if (ph === 'cold') { wHeat = p.heat * 0.12; tongsOp = 0; }
      else if (ph === 'heating') wHeat = 0.1 + p.heat * 0.85;
      else if (ph === 'strike') { wHeat = 0.95; wL = 60; }
      else if (ph === 'ready') { wHeat = 0.85; wL = 60; }
      else if (ph === 'forging') {
        wL = lerp(46, Wp.L * 0.92, easeOut(Math.min(prog / 0.75, 1)));
        ws = ss((prog - 0.25) / 0.6); wc = Wp.curve * 0.25 * ws; wHeat = st.heat;
        ty = TIP.y - 6 * Math.sin(Math.PI * clamp(st.flare));           // lifted toward the fire while reheating
      } else if (accepted) {
        wL = Wp.L; ws = 1;
        walk = ss((t - 0.7) / 1.1);
        low = ss((t - 1.8) / 0.7) - ss((t - 3.6) / 1.0);
        fin = ss((t - 3.6) / 1.1);
        ox = t < 3.6 ? 80 * walk : lerp(80, 40, ss((t - 3.6) / 1.2));
        wc = Wp.curve * (0.25 + 0.75 * ss((t - 2.0) / 1.2));
        wHeat = 0.85 * (1 - ss((t - 2.0) / 1.2));
        hamonOp = ss((t - 3.4) / 1.0); handleOp = ss((t - 3.6) / 0.8); tongsOp = 1 - fin; rays = ss((t - 4.4) / 0.6);
        tx = lerp(TIP.x, QUENCH.x, walk);
        ty = lerp(TIP.y, 205, walk) - 26 * Math.sin(Math.PI * walk) + (QUENCH.y - 205) * low;
        if (t > 4.2) glint = clamp((t - 4.2) / 1.0);
      }
      if (!accepted) { tx = sm('tx', tx, 12, dt); ty = sm('ty', ty, 12, dt); wL = sm('wL', wL, 9, dt); }
      else { st.sm.tx = tx; st.sm.ty = ty; st.sm.wL = wL; }
      wHeat = sm('wHeat', wHeat, 5, dt);

      /* body */
      const walkV = Math.abs(ox - st.prevOx) / Math.max(dt, 1e-3); st.stride += Math.abs(ox - st.prevOx) * 0.17; st.prevOx = ox;
      const walking = walkV > 8;
      const breathe = reduce ? 0 : Math.sin(st.time * 2) * 0.8 + (walking ? Math.abs(Math.sin(st.stride)) * -1.6 : 0);
      const lx = 12 * low - 9 * fl + b * 3, ly = 34 * low + b * 2.5;
      const S = { x: SHX + ox + lx, y: SHY + ly + breathe };
      const finHand = { x: S.x + 50, y: S.y - 8 };
      if (accepted && fin > 0) { tx = lerp(tx, finHand.x, fin); ty = lerp(ty, finHand.y, fin); wAng = lerp(0, -52, fin); }

      /* right arm + hammer */
      const raised = { x: S.x + 34, y: S.y - 30, a: -75 };
      let hx = lerp(raised.x, STRIKE_HAND.x, b), hy = lerp(raised.y, STRIKE_HAND.y, b), ha = lerp(raised.a, 8, b);
      if (accepted) { const hh = ss((t - 0.7) / 0.3); hx = lerp(hx, S.x + 16, hh); hy = lerp(hy, S.y + 54, hh); ha = lerp(ha, 100, hh); }
      const ra = ik(S.x, S.y, hx, hy, 36, 36, 1);
      poly(r.armRu, S.x, S.y, ra.ex, ra.ey); poly(r.armRf, ra.ex, ra.ey, ra.hx, ra.hy);
      set(r.handR, 'cx', ra.hx); set(r.handR, 'cy', ra.hy);
      set(r.hammer, 'transform', `translate(${ra.hx.toFixed(1)} ${ra.hy.toFixed(1)}) rotate(${ha.toFixed(1)})`);

      /* left arm + tongs */
      let tgt = ph === 'cold' ? { x: S.x - 4, y: S.y + 58 } : { x: tx - 36, y: ty - 16 };
      if (accepted && fin > 0) tgt = { x: tx, y: ty };
      const tgx = accepted ? tgt.x : sm('tgx', tgt.x, 14, dt), tgy = accepted ? tgt.y : sm('tgy', tgt.y, 14, dt);
      const la = ik(S.x, S.y, tgx, tgy, 36, 36, 1);
      poly(r.armLu, S.x, S.y, la.ex, la.ey); poly(r.armLf, la.ex, la.ey, la.hx, la.hy);
      set(r.handL, 'cx', la.hx); set(r.handL, 'cy', la.hy);
      set(r.tongs, 'opacity', sm('tongsOp', tongsOp, 12, dt));
      set(r.tongA, 'x1', la.hx); set(r.tongA, 'y1', la.hy); set(r.tongA, 'x2', tx); set(r.tongA, 'y2', ty - 2);
      set(r.tongB, 'x1', la.hx + 1); set(r.tongB, 'y1', la.hy + 4); set(r.tongB, 'x2', tx); set(r.tongB, 'y2', ty + 3);

      /* torso / head / legs / feet / shadow */
      const hip = { x: HIPX + ox, y: HIPY };
      for (const k of ['torso', 'apron']) {
        const e = r[k], o = k === 'apron' ? 8 : 0;
        set(e, 'x1', hip.x + o * 0.4); set(e, 'y1', hip.y); set(e, 'x2', S.x + o); set(e, 'y2', S.y + 4);
      }
      set(r.legs, 'transform', `translate(${ox.toFixed(1)} 0)`);
      const sw = walking ? Math.sin(st.stride) * 6 : 0, lf = walking ? Math.max(0, Math.cos(st.stride)) * 3.5 : 0, lf2 = walking ? Math.max(0, -Math.cos(st.stride)) * 3.5 : 0;
      set(r.footA, 'transform', `translate(${sw.toFixed(1)} ${(-lf).toFixed(1)})`); set(r.footB, 'transform', `translate(${(-sw).toFixed(1)} ${(-lf2).toFixed(1)})`);
      set(r.shadow, 'cx', 250 + ox + (S.x - SHX - ox) * 0.5); set(r.shadow, 'rx', 40 + Math.abs(lx) * 0.4);
      const headX = S.x + 8 + lx * 0.4, headY = S.y - 27 + ly * 0.1;
      const nod = low * 16 - st.flinchV * 10 + b * 6;
      set(r.head, 'transform', `translate(${headX.toFixed(1)} ${headY.toFixed(1)}) rotate(${nod.toFixed(1)})`);
      /* blink + squint */
      st.blink -= dt; if (st.blink < 0) { st.blinkT = 0.13; st.blink = 2.4 + Math.random() * 3.2; }
      st.blinkT -= dt;
      const eyeS = st.blinkT > 0 ? 0.08 : fl > 0.05 ? 0.45 : 1;
      set(r.eye, 'transform', `translate(8.5 3.5) scale(1 ${eyeS}) translate(-8.5 -3.5)`);

      /* verlet headband tails (fixed 60 Hz sub-steps) */
      if (!st.ropeInit) { st.ropes.forEach((rp, k) => rp.p.forEach((q, i) => { q.x = q.px = headX - 14 - i * 4; q.y = q.py = headY + 1 + k * 4; })); st.ropeInit = true; }
      st.acc += dt;
      const wind = -45 + Math.sin(st.time * 1.3) * 28 - walkV * 2.2 - (impact ? 400 : 0);
      while (st.acc >= 1 / 60) {
        st.acc -= 1 / 60;
        if (!reduce) st.ropes.forEach((rp, k) => stepRope(rp, headX - 14 - k, headY + 1 + k * 4, 1 / 60, { gravity: 380, wind }));
      }
      st.ropes.forEach((rp, k) => { if (reduce) rp.p.forEach((q, i) => { q.x = headX - 14 - i * 4; q.y = headY + 2 + k * 4 + i * 2; }); poly(r['tail' + k], ...rp.p.flatMap(q => [q.x, q.y])); });

      /* weapon */
      const sy = 1 - st.squash * 0.14;
      set(r.wpn, 'transform', `translate(${tx.toFixed(1)} ${ty.toFixed(1)}) rotate(${wAng.toFixed(1)}) scale(1 ${sy.toFixed(3)})`);
      const d = bladeD(wL, Wp.h, ws, wc);
      set(r.body, 'd', d); set(r.clip, 'd', d); set(r.shade, 'd', d);
      if (r.body) r.body.style.fill = wHeat > 0.03 ? heatColor(wHeat) : `url(#${r.steelId})`;
      set(r.shade, 'opacity', (0.28 + (wHeat < 0.03 ? 0.3 : 0)) * (0.4 + ws * 0.6));
      const shinOp = ss((ws - 0.6) / 0.4) * (wHeat < 0.2 ? 0.7 : 0.25);
      set(r.shin, 'opacity', shinOp); if (shinOp > 0.01) set(r.shin, 'd', shinogiD(wL, Wp.h, wc));
      set(r.hamon, 'opacity', hamonOp); if (hamonOp > 0.01) set(r.hamon, 'd', hamonD(wL, Wp.h, wc));
      set(r.extras, 'opacity', handleOp);
      if (glint >= 0) { set(r.glint, 'opacity', glint < 1 ? 0.9 : 0); set(r.glint, 'x', lerp(-20, wL + 10, glint).toFixed(1)); } else set(r.glint, 'opacity', 0);
      const ca = Math.cos(wAng * Math.PI / 180), sa = Math.sin(wAng * Math.PI / 180);
      const cx = tx + ca * wL * 0.5, cy = ty + sa * wL * 0.5;
      set(r.glow, 'cx', cx); set(r.glow, 'cy', cy); set(r.glow, 'rx', wL * 0.62 + 10);
      set(r.glow, 'opacity', wHeat > 0.2 ? Math.min(0.75, wHeat * 0.75) : 0);
      set(r.shimmer, 'transform', `translate(${(tx + wL * 0.45).toFixed(1)} ${(ty - 12).toFixed(1)})`);
      set(r.shimmer, 'opacity', accepted ? 0 : clamp((wHeat - 0.55) * 1.6, 0, 0.55));
      set(r.rays, 'transform', `translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${(st.time * 6).toFixed(1)})`);
      set(r.rays, 'opacity', rays * 0.8);

      /* impact */
      if (impact) {
        st.freeze = 0.045; st.shake = 2.6; st.squash = 1; st.heat -= 0.045; st.lan.v += 14;
        const power = clamp((wHeat - 0.35) / 0.65, 0.15, 1);
        audio && audio.clink(0.45 + power * 0.7);
        const n = 5 + Math.round(power * 10);
        for (let i = 0; i < n; i++) spawnSpark(IMPACT.x + (Math.random() * 16 - 8), IMPACT.y, (-172 + Math.random() * 164) * Math.PI / 180, 80 + Math.random() * 210 * (0.5 + power * 0.5), 0.5 + Math.random() * 0.55, (Math.random() * 3) | 0);
      }
      st.shake = Math.max(0, st.shake - dt * 13); st.squash = Math.max(0, st.squash - dt * 8);
      const shk = reduce ? 0 : st.shake;
      set(r.scene, 'transform', `translate(${(Math.sin(st.time * 71) * shk * 0.35).toFixed(2)} ${(Math.sin(st.time * 93) * shk * 0.6).toFixed(2)})`);

      /* sparks: gravity, drag, floor bounce, streak rendering */
      st.sp.forEach((s, i) => {
        const el = r.sparks[i]; if (!el) return;
        if (!s.on) { el.style.opacity = 0; return; }
        s.life -= dt; if (s.life <= 0) { s.on = false; el.style.opacity = 0; return; }
        s.vy += 560 * dt; s.vx *= 1 - 1.1 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.y > FLOOR - 2 && s.vy > 0) { s.y = FLOOR - 2; s.vy *= -0.38; s.vx *= 0.7; }
        set(el, 'x1', s.x); set(el, 'y1', s.y); set(el, 'x2', s.x - s.vx * 0.028); set(el, 'y2', s.y - s.vy * 0.028);
        el.style.strokeWidth = s.w * (0.5 + 0.5 * (s.life / s.max)); el.style.opacity = Math.min(1, s.life / 0.25); el.style.stroke = SPARK_COL[s.c];
      });

      /* quench steam + sound */
      if (accepted && t > 2.0 && !st.hissed) { st.hissed = true; audio && audio.hiss(); }
      if (accepted && t > 2.0 && t < 3.9 && !reduce) {
        st.smAcc += dt * 46;
        while (st.smAcc >= 1) { st.smAcc -= 1; const s = st.st2.find(q => !q.on); if (!s) break;
          Object.assign(s, { on: true, x: QUENCH.x + 6 + Math.random() * (Wp.L - 6), y: 238, vx: Math.random() * 14 - 7, vy: -(22 + Math.random() * 26), life: 1.2 + Math.random() * 0.7, max: 1.9, r: 3 + Math.random() * 3 }); }
      }
      st.st2.forEach((s, i) => {
        const el = r.steam[i]; if (!el) return;
        if (!s.on) { el.style.opacity = 0; return; }
        s.life -= dt; if (s.life <= 0) { s.on = false; el.style.opacity = 0; return; }
        s.x += s.vx * dt; s.y += s.vy * dt; s.r += dt * 9; set(el, 'cx', s.x); set(el, 'cy', s.y); set(el, 'r', s.r); el.style.opacity = 0.3 * (s.life / s.max);
      });

      /* finale: rings, gold fountain (masterwork), sakura petals */
      const grade = p.grade;
      const ringT = accepted ? (t - 4.55) : -1;
      for (const [k, delay, base] of [['ring', 0, 1], ['ring2', 0.18, grade === 'masterwork' ? 1 : 0]]) {
        const x = (ringT - delay) / 1.0;
        set(r[k], 'opacity', x > 0 && x < 1 && base ? (1 - x) * 0.8 : 0);
        if (x > 0 && x < 1) { set(r[k], 'r', lerp(8, 160, easeOut(x))); set(r[k], 'cx', cx); set(r[k], 'cy', cy); }
      }
      if (accepted && !reduce && t > 4.8 && t < 6.4 && grade === 'masterwork') {
        st.fountAcc += dt * 70;
        while (st.fountAcc >= 1) { st.fountAcc -= 1; spawnSpark(tx + ca * wL, ty + sa * wL, (-110 + Math.random() * 40) * Math.PI / 180, 90 + Math.random() * 130, 0.8 + Math.random() * 0.6, Math.random() < 0.7 ? 0 : 2, true); }
      }
      if (accepted && !reduce && t > 4.7 && t < 9 && grade !== 'rough') {
        st.ptAcc += dt * (grade === 'masterwork' ? 12 : 7);
        while (st.ptAcc >= 1) { st.ptAcc -= 1; const s = st.pt.find(q => !q.on); if (!s) break;
          Object.assign(s, { on: true, x: Math.random() * W, y: -8, vy: 26 + Math.random() * 28, ph: Math.random() * 6, rot: Math.random() * 360, vr: (Math.random() - 0.5) * 160, life: 7 }); }
      }
      st.pt.forEach((s, i) => {
        const el = r.petals[i]; if (!el) return;
        if (!s.on) { el.style.opacity = 0; return; }
        s.life -= dt; s.y += s.vy * dt; s.x += Math.sin(st.time * 1.8 + s.ph) * 22 * dt - 6 * dt; s.rot += s.vr * dt;
        if (s.y > H + 6 || s.life <= 0) { s.on = false; el.style.opacity = 0; return; }
        set(el, 'transform', `translate(${s.x.toFixed(1)} ${s.y.toFixed(1)}) rotate(${s.rot.toFixed(0)})`); el.style.opacity = 0.85;
      });
      if (accepted && t >= 5.0 && !st.revealed) { st.revealed = true; audio && audio.chime(grade); p.onReveal(); }

      /* lantern pendulum, firelight, parallax, bubble anchor */
      springStep(st.lan, reduce ? 0 : Math.sin(st.time * 1.1) * 2, Math.min(dt, 1 / 30), 18, 1.1);
      set(r.lantern, 'transform', `rotate(${st.lan.x.toFixed(2)} 230 22)`);
      const fh0 = ['forging', 'strike', 'ready', 'accepted'].includes(ph) ? 1 : clamp(0.12 + p.heat * 0.88);
      const fh = clamp(sm('fh', fh0, 4, dt) + st.flare * 0.5 - fl * 0.45, 0, 1.4);
      const nz = reduce ? 0.5 : 0.5 + 0.25 * Math.sin(st.time * 11) + 0.15 * Math.sin(st.time * 17.3 + 1) + 0.1 * Math.sin(st.time * 5.1);
      set(r.room, 'opacity', fh * (0.8 + 0.2 * nz));
      set(r.fire, 'opacity', clamp(fh * (0.82 + 0.18 * nz), 0, 1));
      set(r.embers, 'opacity', clamp(fh, 0, 1));
      set(r.rim, 'opacity', clamp(fh * (0.7 + 0.3 * nz), 0, 1) * 0.9);
      const q = ptr.current;
      st.par.x = approach(st.par.x, reduce ? 0 : q.x, dt, 6); st.par.y = approach(st.par.y, reduce ? 0 : q.y, dt, 6);
      set(r.layBack, 'transform', `translate(${(-st.par.x * 7).toFixed(2)} ${(-st.par.y * 3).toFixed(2)})`);
      set(r.layMid, 'transform', `translate(${(-st.par.x * 3.5).toFixed(2)} ${(-st.par.y * 1.5).toFixed(2)})`);
      const bx = clamp((S.x - 70) / W * 100, 26, 66);
      if (Math.abs(bx - st.bx) > 0.4 && r.root) { st.bx = bx; r.root.style.setProperty('--bx', `${bx.toFixed(1)}%`); }
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); io && io.disconnect(); };
  }, []);

  /* ── refs ── */
  const ref = k => el => { R.current[k] = el; };
  const arr = (k, i) => el => { R.current[k][i] = el; };
  R.current.steelId = `${uid}steel`;

  /* ── speech ── */
  const si = stage != null ? stage : stageIndex(progress);
  const line = useMemo(() => {
    if (phase === 'accepted') return revealed && result ? GRADES[result.grade]?.line : 'It’s done — into the water!';
    if (hurt && phase === 'forging') return 'Wrong answer — the steel resists. Re-check your samples.';
    if (phase === 'forging') return progress > 1 ? 'Taking long? Good steel is never rushed. I keep working.' : STAGES[si].hint;
    if (phase === 'ready') return name ? `Your steel: ${name}. Press “Solve this” and I start hammering.` : 'The steel is ready.';
    if (phase === 'strike') return 'Hold on — folding the steel now…';
    if (phase === 'heating') return ['The coals are catching. Add a tag?', 'Hotter steel, better blade.', 'Say the word and I’ll strike.'][tipIdx % 3];
    return ['The forge is cold. Choose a level.', 'Pick your steel — tags are the ore.'][tipIdx % 2];
  }, [phase, si, progress, name, revealed, result, tipIdx, hurt]);

  const onMove = e => { const b = e.currentTarget.getBoundingClientRect(); ptr.current = { x: ((e.clientX - b.left) / b.width - 0.5) * 2, y: ((e.clientY - b.top) / b.height - 0.5) * 2 }; };
  const steel = `url(#${uid}steel)`;

  return (
    <div ref={ref('root')} className={`fs-scene ${className}`} style={{ '--acc': accent, '--bx': '38%' }} role="group"
      aria-label="Forge scene: Tetsuji the swordsmith" onPointerMove={onMove} onPointerLeave={() => { ptr.current = { x: 0, y: 0 }; }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" style={{ display: 'block', width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id={`${uid}wall`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--bg-card)" /><stop offset="1" stopColor="var(--bg)" /></linearGradient>
          <radialGradient id={`${uid}fire`} cx=".5" cy=".6" r=".6"><stop offset="0" stopColor="var(--yellow)" /><stop offset=".45" stopColor="var(--orange)" /><stop offset="1" stopColor="var(--red)" stopOpacity="0" /></radialGradient>
          <radialGradient id={`${uid}room`} cx=".2" cy=".7" r=".85"><stop offset="0" stopColor="var(--orange)" stopOpacity=".36" /><stop offset="1" stopColor="var(--orange)" stopOpacity="0" /></radialGradient>
          <radialGradient id={`${uid}bg`}><stop offset="0" stopColor="var(--orange)" /><stop offset="1" stopColor="var(--orange)" stopOpacity="0" /></radialGradient>
          <linearGradient id={`${uid}steel`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--t1)" /><stop offset=".5" stopColor="var(--t2)" /><stop offset="1" stopColor="var(--t3)" /></linearGradient>
          <linearGradient id={`${uid}shade`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".9" /><stop offset=".45" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".7" /></linearGradient>
          <linearGradient id={`${uid}anv`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--b3)" /><stop offset="1" stopColor="var(--b1)" /></linearGradient>
          <linearGradient id={`${uid}water`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--primary)" stopOpacity=".32" /><stop offset="1" stopColor="var(--blue)" stopOpacity=".5" /></linearGradient>
          <radialGradient id={`${uid}rays`} gradientUnits="userSpaceOnUse" cx="0" cy="0" r="230"><stop offset="0" stopColor={accent} stopOpacity=".5" /><stop offset=".55" stopColor={accent} stopOpacity=".16" /><stop offset="1" stopColor={accent} stopOpacity="0" /></radialGradient>
          <radialGradient id={`${uid}ray`}><stop offset="0" stopColor={accent} stopOpacity=".55" /><stop offset="1" stopColor={accent} stopOpacity="0" /></radialGradient>
          <clipPath id={`${uid}clip`}><path ref={ref('clip')} d="M0 0" /></clipPath>
        </defs>

        {/* far layer: wall, window, lantern, trophy rack (parallax) */}
        <g ref={ref('layBack')}>
          <rect x="-30" y="-10" width={W + 60} height={H + 20} fill={`url(#${uid}wall)`} />
          <g stroke="var(--b1)" strokeWidth="2" opacity=".9"><path d="M-30 22H590" /><path d="M150 0V252M410 0V252" opacity=".5" /></g>
          <g transform="translate(446 36)">
            <rect width="84" height="76" rx="3" fill="color-mix(in srgb, var(--blue) 12%, var(--bg-card))" stroke="var(--b2)" />
            <circle cx="58" cy="26" r="26" fill={`url(#${uid}ray)`} /><circle cx="58" cy="26" r="11" fill="var(--t1)" opacity=".85" />
            <path d="M42 0V76M0 38H84" stroke="var(--b2)" strokeWidth="2" />
          </g>
          <g ref={ref('lantern')}>
            <path d="M230 22V36" stroke="var(--b3)" /><ellipse cx="230" cy="52" rx="14" ry="17" fill="color-mix(in srgb, var(--orange) 55%, var(--bg-el))" stroke="var(--b3)" />
            <path d="M217 46Q230 52 243 46M216 53Q230 60 244 53" stroke="var(--b3)" fill="none" opacity=".7" />
            <circle cx="230" cy="52" r="34" fill={`url(#${uid}bg)`} opacity=".28" />
          </g>
          <g transform="translate(150 80)">
            <rect x="-6" y="-2" width="124" height="3" rx="1.5" fill="var(--b3)" />
            {trophies.slice(0, 3).map((tr, i) => {
              const w = WEAPONS[tr.weapon] || WEAPONS.katana, k = 54 / w.L;
              return (
                <g key={i} transform={`translate(${16 + i * 40} 4) rotate(90) scale(${k.toFixed(3)})`}>
                  <path d={bladeD(w.L, w.h * 1.2, 1, w.curve)} fill={steel} stroke={GRADES[tr.grade]?.color || 'var(--t3)'} strokeWidth={(0.9 / k).toFixed(2)} />
                  <rect x="-18" y="-4" width="17" height="8" rx="2" fill="color-mix(in srgb, var(--red) 32%, var(--bg-el))" />
                </g>
              );
            })}
            {!trophies.length && <text x="56" y="22" textAnchor="middle" fontSize="8" fontFamily="var(--mono)" fill="var(--t3)" letterSpacing="1.5">EMPTY RACK</text>}
          </g>
        </g>
        <rect ref={ref('room')} width={W} height={H} fill={`url(#${uid}room)`} opacity="0" />
        <g ref={ref('rays')} opacity="0">{Array.from({ length: 12 }, (_, i) => <path key={i} d={i % 2 ? 'M0 0L-5 -190L5 -190Z' : 'M0 0L-9 -230L9 -230Z'} fill={`url(#${uid}rays)`} transform={`rotate(${i * 30})`} />)}</g>

        <g ref={ref('scene')}>
          {/* mid layer: furnace */}
          <g ref={ref('layMid')}>
            <rect x="58" y="28" width="30" height="96" fill="var(--b1)" stroke="var(--b2)" /><rect x="52" y="22" width="42" height="9" rx="2" fill="var(--b2)" stroke="var(--b3)" />
            <path className="fs-smoke" d="M66 20q-8-14 2-22" stroke="var(--t3)" strokeWidth="7" strokeLinecap="round" fill="none" />
            <path className="fs-smoke s2" d="M78 20q8-14-2-24" stroke="var(--t3)" strokeWidth="6" strokeLinecap="round" fill="none" />
            <rect x="14" y="116" width="118" height="136" rx="6" fill="var(--bg-el)" stroke="var(--b2)" />
            <path d="M14 150H132M14 184H132M14 218H132M52 116V150M92 150V184M52 184V218" stroke="var(--b1)" />
            <path d="M34 224V184Q34 158 73 158Q112 158 112 184V224Z" fill="var(--bg)" stroke="var(--b3)" />
            <g ref={ref('fire')} opacity="0">
              <ellipse cx="73" cy="216" rx="40" ry="26" fill={`url(#${uid}fire)`} className="fs-flicker" />
              <path className="fs-flame" d="M52 222Q58 196 66 206Q70 184 80 202Q88 192 92 222Z" fill="var(--yellow)" opacity=".85" />
              <path className="fs-flame f2" d="M60 222Q66 204 73 212Q78 198 84 222Z" fill="var(--t1)" opacity=".7" />
            </g>
            <ellipse cx="73" cy="226" rx="38" ry="5" fill="var(--bg)" opacity=".6" />
            <g ref={ref('embers')} opacity="0">{Array.from({ length: 7 }, (_, i) => <circle key={i} className="fs-ember" cx={44 + i * 10} cy={190} r="1.6" fill="var(--orange)" style={{ '--d': `${2.4 + (i % 3) * .7}s`, '--w': `${i * .35}s`, '--x': `${(i % 2 ? 1 : -1) * 8}px` }} />)}</g>
          </g>

          <rect x="-30" y={FLOOR} width={W + 60} height="60" fill="var(--b0)" /><path d={`M-30 ${FLOOR}H590`} stroke="var(--b2)" />
          <ellipse ref={ref('shadow')} cx="250" cy="253" rx="40" ry="5" fill="#000" opacity=".38" />
          <ellipse cx="342" cy="253" rx="58" ry="4" fill="#000" opacity=".3" />
          {/* anvil + stump */}
          <rect x="304" y="236" width="74" height="16" rx="2" fill="color-mix(in srgb, var(--orange) 18%, var(--b1))" stroke="var(--b2)" />
          <path d="M284 205H374Q398 205 410 211Q394 216 374 217L368 228H378V238H300V228H312L306 217H292Q284 214 284 205Z" fill={`url(#${uid}anv)`} stroke="var(--b3)" />
          <path d="M288 206H372" stroke="var(--t2)" strokeWidth="1.4" opacity=".7" />
          <rect x="404" y="236" width="150" height="24" rx="3" fill="color-mix(in srgb, var(--orange) 14%, var(--b1))" stroke="var(--b3)" />

          {/* smith */}
          <g>
            <g ref={ref('legs')}>
              <path d="M228 196H272L286 252H214Z" fill="color-mix(in srgb, var(--blue) 14%, var(--bg-el))" stroke="var(--b2)" />
              <path d="M250 200V252" stroke="var(--b2)" /><rect x="228" y="188" width="44" height="11" rx="2" fill={OBI} />
              <rect ref={ref('footA')} x="219" y="248" width="20" height="5" rx="2" fill="var(--bg)" /><rect ref={ref('footB')} x="262" y="248" width="20" height="5" rx="2" fill="var(--bg)" />
            </g>
            <polyline ref={ref('armLu')} fill="none" stroke={CLOTH} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" opacity=".75" />
            <polyline ref={ref('armLf')} fill="none" stroke={SKIN} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" opacity=".8" />
            <line ref={ref('torso')} stroke={CLOTH} strokeWidth="36" strokeLinecap="round" />
            <line ref={ref('apron')} stroke={APRON} strokeWidth="16" strokeLinecap="round" />
            <polyline ref={ref('tail0')} fill="none" stroke="var(--red)" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
            <polyline ref={ref('tail1')} fill="none" stroke="color-mix(in srgb, var(--red) 80%, var(--bg))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <g ref={ref('head')}>
              <circle r="15" fill={SKIN} />
              <path d="M-15 -3A15 15 0 0 1 15 -3Q8 -10 -2 -10Q-11 -10 -15 -3Z" fill="var(--bg)" stroke="var(--b2)" />
              <ellipse cx="-4" cy="-17" rx="6" ry="4" fill="var(--bg)" stroke="var(--b2)" />
              <path d="M-15 -3Q0 -9 15 -3L15 2Q0 -4 -15 2Z" fill="var(--red)" />
              <path d="M5 -4L12 -3" stroke="var(--bg)" strokeWidth="2" strokeLinecap="round" />
              <ellipse ref={ref('eye')} cx="8.5" cy="3.5" rx="2.6" ry="1.5" fill="var(--bg)" />
              <path ref={ref('rim')} d="M-15 -4A15 15 0 0 0 -15 8" stroke="var(--orange)" strokeWidth="2" fill="none" opacity="0" strokeLinecap="round" />
            </g>
            <polyline ref={ref('armRu')} fill="none" stroke={CLOTH} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
            <polyline ref={ref('armRf')} fill="none" stroke={SKIN} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
            <circle ref={ref('handR')} r="5.5" fill={SKIN} />
          </g>
          <circle ref={ref('handL')} r="5.5" fill={SKIN} opacity=".85" />
          <g ref={ref('tongs')}><line ref={ref('tongA')} stroke="var(--t3)" strokeWidth="3" strokeLinecap="round" /><line ref={ref('tongB')} stroke="var(--t2)" strokeWidth="2.4" strokeLinecap="round" /></g>

          {/* blade / billet */}
          <ellipse ref={ref('glow')} cy="200" ry="16" fill={`url(#${uid}bg)`} opacity="0" />
          <g ref={ref('shimmer')} opacity="0" className="fs-shimmer">
            {[-14, 0, 14].map((x, i) => <path key={i} d={`M${x} 0q-4 -7 0 -14t0 -14`} fill="none" stroke="var(--orange)" strokeWidth="1.6" strokeLinecap="round" style={{ animationDelay: `${-i * 0.5}s` }} />)}
          </g>
          <g ref={ref('wpn')}>
            <path ref={ref('body')} d="M0 0" stroke="var(--b3)" strokeWidth=".8" strokeLinejoin="round" />
            <path ref={ref('shade')} d="M0 0" fill={`url(#${uid}shade)`} opacity="0" />
            <g clipPath={`url(#${uid}clip)`}><rect ref={ref('glint')} x="-20" y="-24" width="9" height="48" fill="#fff" opacity="0" transform="skewX(-24)" /></g>
            <path ref={ref('shin')} d="M0 0" fill="none" stroke="var(--t1)" strokeWidth=".7" opacity="0" />
            <path ref={ref('hamon')} d="M0 0" fill="none" stroke="var(--t1)" strokeWidth="1.1" opacity="0" strokeLinecap="round" />
            <g ref={ref('extras')} opacity="0">
              <rect x={-34 - wp.pole} y="-5" width={31 + wp.pole} height="10" rx="2" fill="color-mix(in srgb, var(--red) 32%, var(--bg-el))" stroke="var(--b3)" />
              <path d={Array.from({ length: Math.floor((31 + wp.pole) / 8) }, (_, i) => `M${-34 - wp.pole + i * 8} -5L${-30 - wp.pole + i * 8} 5`).join('')} stroke="var(--t3)" strokeWidth="1" />
              <ellipse cx="-1.5" cy="0" rx="2.6" ry={wp.guard} fill="var(--yellow)" stroke="var(--b3)" />
              <circle cx={-35 - wp.pole} cy="0" r="4" fill="var(--yellow)" stroke="var(--b3)" />
            </g>
          </g>
          {Array.from({ length: N_SPARK }, (_, i) => <line key={i} ref={arr('sparks', i)} strokeLinecap="round" style={{ opacity: 0 }} />)}
          <g ref={ref('hammer')}>
            <rect x="-10" y="-2.4" width="40" height="4.8" rx="2" fill="color-mix(in srgb, var(--orange) 26%, var(--b3))" />
            <rect x="28" y="-12" width="13" height="24" rx="2" fill="var(--t3)" stroke="var(--b3)" />
            <rect x="28" y="-12" width="4" height="24" rx="1" fill="var(--t2)" opacity=".7" />
          </g>
          <rect x="406" y="240" width="146" height="18" fill={`url(#${uid}water)`} />
          <path d="M406 240H552" stroke="var(--primary)" strokeOpacity=".5" />
          <g style={{ filter: 'blur(2.5px)' }}>{Array.from({ length: N_STEAM }, (_, i) => <circle key={i} ref={arr('steam', i)} r="4" fill="var(--t1)" style={{ opacity: 0 }} />)}</g>
        </g>

        <circle ref={ref('ring')} fill="none" stroke={accent} strokeWidth="2.5" opacity="0" />
        <circle ref={ref('ring2')} fill="none" stroke="var(--yellow)" strokeWidth="1.5" opacity="0" />
        {Array.from({ length: N_PETAL }, (_, i) => <ellipse key={i} ref={arr('petals', i)} rx="3.4" ry="1.9" fill={`color-mix(in srgb, ${accent} 60%, var(--t1))`} style={{ opacity: 0 }} />)}
      </svg>

      <div className="fs-name"><i />TETSUJI <span>· swordsmith</span></div>
      <button type="button" className="fs-sound" onClick={toggleSound} aria-pressed={sound} aria-label={sound ? 'Mute forge sounds' : 'Enable forge sounds'} title={sound ? 'Sound on' : 'Sound off'}>
        {sound ? <Volume2 size={14} strokeWidth={2} /> : <VolumeX size={14} strokeWidth={2} />}
      </button>
      <div key={line} className="fs-bubble">{line}</div>
      <span className="fs-sr" aria-live="polite">{line}</span>
    </div>
  );
}
