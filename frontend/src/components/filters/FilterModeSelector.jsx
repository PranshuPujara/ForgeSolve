import { Ban, UserCheck, Users, Frown } from 'lucide-react';

/* Friend filter modes — the values are what the backend expects as `filterMode` (see backend/utils/friendPick.js). */
export const FILTER_MODES = [
  { value: 'none',    label: 'No friend filter',      sub: 'Any problem that fits your filters',               Icon: Ban },
  { value: 'catchup', label: 'Friends solved, I haven’t', sub: 'Catch up: a friend got AC and you haven’t',    Icon: UserCheck },
  { value: 'solved',  label: 'Friends solved',        sub: 'At least one friend got AC (you may have too)',    Icon: Users },
  { value: 'stuck',   label: 'A friend is stuck',     sub: 'A friend tried it and never got AC',               Icon: Frown },
];
/** short label for the "current filters" summary line (also maps the legacy saved value 'unsolved') */
export const filterModeLabel = (v) => ({ catchup: 'friends solved · not me', solved: 'friends solved', stuck: 'friend stuck', unsolved: 'friend stuck' }[v] || v);

export const FilterModeSelector = ({ value, onChange, disabled, hasHandle = true }) => {
  const current = value === 'unsolved' ? 'stuck' : value;        // older builds saved 'unsolved'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, opacity: disabled ? 0.5 : 1 }}>
      {FILTER_MODES.map(({ value: v, label, sub, Icon }) => {
        const on = current === v;
        return (
          <button key={v} type="button" disabled={disabled && v !== 'none'} onClick={() => onChange(v)} aria-pressed={on}
            style={{
              display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', gap: 10, padding: '9px 12px', borderRadius: 9, width: '100%', textAlign: 'left',
              cursor: disabled && v !== 'none' ? 'not-allowed' : 'pointer',
              background: on ? 'var(--primary-bg)' : 'var(--bg-el)', border: `1px solid ${on ? 'var(--primary)' : 'var(--b1)'}`, transition: 'all .15s',
            }}
            onMouseEnter={e => { if (!on && !disabled) e.currentTarget.style.borderColor = 'var(--b2)'; }}
            onMouseLeave={e => { if (!on) e.currentTarget.style.borderColor = 'var(--b1)'; }}>
            <Icon size={16} strokeWidth={1.5} color={on ? 'var(--primary)' : 'var(--t3)'} style={{ marginTop: 1, flexShrink: 0 }} />
            <span>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 600, lineHeight: 1.2, color: on ? 'var(--primary)' : 'var(--t1)' }}>{label}</span>
              <span style={{ display: 'block', fontSize: 11, marginTop: 2, color: 'var(--t3)' }}>{sub}</span>
            </span>
          </button>
        );
      })}
      {disabled && <p style={{ fontSize: 11, color: 'var(--t3)', margin: '2px 2px 0' }}>Add at least one friend to use these.</p>}
      {!disabled && current === 'catchup' && !hasHandle && (
        <p style={{ fontSize: 11, color: 'var(--yellow)', margin: '2px 2px 0' }}>Connect your handle in Profile so problems you already solved are hidden.</p>
      )}
    </div>
  );
};
