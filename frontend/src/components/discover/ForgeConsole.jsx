import { useMemo } from 'react';
import { Zap, CalendarDays, AlertCircle, Flame, Target, Rocket, Shuffle, Hammer, CornerDownLeft } from 'lucide-react';
import { ForgeScene } from '../forge/ForgeScene';
import { ArmoryRack } from '../forge/ArmoryRack';
import { weaponFor } from '../forge/geometry';
import './forge.css';

/* ── static config ─────────────────────────────── */
const ACCENT = { codeforces: 'var(--blue)', leetcode: 'var(--orange)', gfg: 'var(--green)' };
const PLATFORM_LABEL = { codeforces: 'Codeforces', leetcode: 'LeetCode', gfg: 'GFG' };

const RECIPES = {
  codeforces: [
    { id: 'warm', icon: Flame,  title: 'Warm-up',     sub: '800–1000',        vals: { minRating: 800,  maxRating: 1000 }, tags: [] },
    { id: 'push', icon: Target, title: 'Rating push', sub: '1400–1700',       vals: { minRating: 1400, maxRating: 1700 }, tags: [] },
    { id: 'deep', icon: Rocket, title: 'Deep end',    sub: '1900–2200',       vals: { minRating: 1900, maxRating: 2200 }, tags: [] },
    { id: 'dp',   icon: Hammer, title: 'DP grind',    sub: '1200–1600 · dp',  vals: { minRating: 1200, maxRating: 1600 }, tags: ['dp'] },
  ],
  leetcode: [
    { id: 'warm', icon: Flame,  title: 'Warm-up',        sub: 'easy · array',                 vals: { difficulty: 'easy' },   tags: ['array'] },
    { id: 'core', icon: Target, title: 'Interview core', sub: 'medium · array, hash table',   vals: { difficulty: 'medium' }, tags: ['array', 'hash table'] },
    { id: 'hard', icon: Rocket, title: 'Hard mode',      sub: 'hard · any topic',             vals: { difficulty: 'hard' },   tags: [] },
    { id: 'dp',   icon: Hammer, title: 'DP grind',       sub: 'medium · dynamic programming', vals: { difficulty: 'medium' }, tags: ['dynamic programming'] },
  ],
  gfg: [
    { id: 'warm', icon: Flame,   title: 'Warm-up',     sub: 'easy',       vals: { difficulty: 'easy' },   tags: [] },
    { id: 'core', icon: Target,  title: 'Core',        sub: 'medium',     vals: { difficulty: 'medium' }, tags: [] },
    { id: 'hard', icon: Rocket,  title: 'Hard mode',   sub: 'hard',       vals: { difficulty: 'hard' },   tags: [] },
    { id: 'rand', icon: Shuffle, title: 'Surprise me', sub: 'random level', random: true,                tags: [] },
  ],
};

const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);

/* ── CTA row (shared by hero + compact) ────────── */
const CtaRow = ({ ready, loading, onPick, onDaily }) => (
  <div className="cta-row" style={{ display: 'flex', gap: 9 }}>
    <button type="button" onClick={onPick} disabled={!ready || loading} className={`fg-cta ${ready ? 'ready' : 'idle'}`}
      style={{ opacity: loading ? .75 : 1 }}>
      {loading
        ? <><span style={{ width: 17, height: 17, border: '3px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />Striking…</>
        : <><Zap size={18} strokeWidth={2.5} />Get Problem</>}
    </button>
    <button type="button" onClick={onDaily} disabled={!ready || loading} className="fg-sec cta-secondary">
      <CalendarDays size={16} strokeWidth={1.8} /> Daily
    </button>
  </div>
);

/* ── Main ──────────────────────────────────────── */
export function ForgeConsole({
  compact = false, platform, minRating, maxRating, difficulty, tags = [],
  filterMode = 'none', smartMode = false, excludeActive = false, onlyActive = false,
  handleLabel = null, ready, hasPlatform = true, hintText = null, loading = false,
  onPick, onDaily, onPreset, armory = [],
}) {
  const accent = ACCENT[platform] || 'var(--primary)';
  const isCF = platform === 'codeforces';

  const level = isCF ? (minRating === maxRating ? `=${minRating}` : `${minRating}–${maxRating}`) : (difficulty || null);
  const mods = [
    filterMode !== 'none' && filterMode, smartMode && 'smart',
    excludeActive && 'skip solved', onlyActive && 'only solved',
  ].filter(Boolean);

  const heat = useMemo(() => {
    if (!hasPlatform) return 0.04;
    if (!ready) return Math.min(0.28, 0.1 + tags.length * 0.04);
    return Math.min(1, 0.6 + Math.min(tags.length, 3) * 0.1 + (mods.length ? 0.1 : 0));
  }, [hasPlatform, ready, tags.length, mods.length]);

  const status = !ready ? 'cold' : heat >= 0.9 ? 'molten' : 'hot';
  const forged = armory.length;
  const hot = `color-mix(in srgb, ${accent} ${Math.max(Math.round(heat * 100), 12)}%, var(--t2))`;

  /* ── compact bar (a problem is on screen) ── */
  if (compact) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
        <div className="fg-compact" style={{ '--hot': hot }}>
          <Flame size={14} strokeWidth={2} color={hot} />
          <span style={{ color: accent, fontWeight: 700 }}>{PLATFORM_LABEL[platform] || platform}</span>
          <span style={{ color: 'var(--b2)' }}>·</span>
          <span style={{ color: level ? 'var(--t2)' : 'var(--t3)', fontWeight: 600, textTransform: 'capitalize' }}>{level || '—'}</span>
          {tags.length > 0 && <><span style={{ color: 'var(--b2)' }}>·</span><span style={{ color: 'var(--t2)', fontWeight: 600 }}>{tags.slice(0, 2).join(', ')}{tags.length > 2 ? ` +${tags.length - 2}` : ''}</span></>}
          {mods.map(m => <span key={m} className="fg-mod" style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }}>{m}</span>)}
        </div>
        <CtaRow ready={ready} loading={loading} onPick={onPick} onDaily={onDaily} />
        {hintText && !loading && (
          <p style={{ fontSize: 12, color: 'var(--primary)', fontFamily: 'var(--mono)', textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 5, fontWeight: 600 }}>
            <AlertCircle size={14} strokeWidth={2} />{hintText}
          </p>
        )}
      </div>
    );
  }

  /* ── hero ── */
  const recipes = RECIPES[platform] || [];
  const applyRecipe = r => {
    if (!onPreset) return;
    const vals = r.random ? { difficulty: ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)] } : r.vals;
    onPreset({ vals, tags: r.tags });
  };
  const phase = loading ? 'strike' : ready ? 'heating' : 'cold';
  const weapon = weaponFor(isCF ? { rating: maxRating } : { difficulty });
  const trophies = armory.slice(0, 3);

  return (
    <div className="anim-up" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14, ['--hot']: hot }}>
      <section className="fg-card" aria-label="Forge">
        <ForgeScene phase={phase} heat={heat} weapon={weapon} accent={accent} trophies={trophies}
          className="fs-hero" />
        <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span className="fg-chip" style={{ '--c': hot, color: status === 'cold' ? 'var(--t2)' : 'var(--t1)' }}><i />{loading ? 'striking' : status} · {Math.round(300 + heat * 1200).toLocaleString()}°C</span>
            <span className="lbl" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {handleLabel && <span style={{ color: 'var(--success)' }}>● {handleLabel}</span>}
              <span>{forged} forged</span>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 9 }}>
            <div className={`fg-slot${hasPlatform ? ' set' : ' empty'}`}><span className="lbl">Platform</span><b>{PLATFORM_LABEL[platform] || '—'}</b></div>
            <div className={`fg-slot${level ? ' set' : ' empty'}`}><span className="lbl">Level</span><b>{level || 'not set'}</b></div>
            <div className={`fg-slot${tags.length ? ' set' : ' empty'}`}><span className="lbl">Tags</span><b>{tags.length ? tags.length : 'any'}</b></div>
          </div>
          {mods.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: -6 }}>{mods.map(m => <span key={m} className="fg-mod">{m}</span>)}</div>}
          <CtaRow ready={ready} loading={loading} onPick={onPick} onDaily={onDaily} />
          {ready && !loading && (
            <p style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--mono)', textAlign: 'center', marginTop: -6, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
              or press <kbd style={{ padding: '2px 7px', borderRadius: 5, background: 'var(--bg-press)', border: '1px solid var(--b2)', color: 'var(--t2)', fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}><CornerDownLeft size={10} />ENTER</kbd>
            </p>
          )}
          {!ready && hintText && <p style={{ fontSize: 12, color: 'var(--primary)', fontFamily: 'var(--mono)', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 5, alignItems: 'center', fontWeight: 600, marginTop: -6 }}><AlertCircle size={13} strokeWidth={2} />{hintText}</p>}
        </div>
      </section>

      {recipes.length > 0 && onPreset && (
        <div>
          <div className="lbl" style={{ marginBottom: 9, display: 'flex', alignItems: 'center', gap: 8 }}>Quick recipes <span style={{ flex: 1, height: 1, background: 'var(--b0)' }} /></div>
          <div className="fg-recipes">
            {recipes.map(r => (
              <button key={r.id} type="button" className="fg-recipe" onClick={() => applyRecipe(r)}>
                <span className="ico"><r.icon size={16} strokeWidth={1.8} /></span>
                <span style={{ minWidth: 0 }}><strong>{r.title}</strong><small>{r.sub}</small></span>
              </button>
            ))}
          </div>
        </div>
      )}
      <ArmoryRack items={armory} />
    </div>
  );
}
