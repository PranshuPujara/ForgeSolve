import { WEAPONS, GRADES, bladeD } from './geometry';

const safeHref = u => (/^https?:\/\//i.test(u || '') ? u : undefined);

const Mini = ({ it }) => {
  const w = WEAPONS[it.weapon] || WEAPONS.katana;
  const k = 58 / (w.L + 34);
  const col = GRADES[it.grade]?.color || 'var(--t3)';
  return (
    <a href={safeHref(it.url)} target="_blank" rel="noopener noreferrer" className="fg-mini"
      title={`${it.name} · ${GRADES[it.grade]?.label} ${w.label}`} style={{ '--g': col }}>
      <svg viewBox="0 0 64 30" width="64" height="30" aria-hidden="true">
        <g transform={`translate(4 16) scale(${k.toFixed(3)})`}>
          <path d={bladeD(w.L, w.h * 1.15, 1, w.curve)} fill="var(--t2)" stroke={col} strokeWidth="1.4" transform="translate(34 0)" />
          <rect x="0" y="-5" width="31" height="10" rx="2" fill="color-mix(in srgb, var(--red) 32%, var(--bg-el))" stroke="var(--b3)" />
          <ellipse cx="32" cy="0" rx="2.6" ry={w.guard} fill="var(--yellow)" />
        </g>
      </svg>
    </a>
  );
};

export function ArmoryRack({ items = [], max = 8 }) {
  const counts = items.reduce((a, i) => ((a[i.grade] = (a[i.grade] || 0) + 1), a), {});
  return (
    <div>
      <div className="lbl" style={{ marginBottom: 9, display: 'flex', alignItems: 'center', gap: 8 }}>
        Your armory <span style={{ color: 'var(--t2)' }}>{items.length}</span><span style={{ flex: 1, height: 1, background: 'var(--b0)' }} />
        {Object.entries(GRADES).map(([k, g]) => counts[k] ? <span key={k} style={{ color: g.color }}>{counts[k]} {g.label}</span> : null)}
      </div>
      {items.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--t3)', fontFamily: 'var(--mono)', padding: '14px 12px', border: '1px dashed var(--b2)', borderRadius: 10, textAlign: 'center' }}>
          Nothing on the rack yet. Every accepted problem becomes a blade.
        </p>
      ) : (
        <div className="fg-rack">{items.slice(0, max).map(i => <Mini key={i.id} it={i} />)}</div>
      )}
    </div>
  );
}
