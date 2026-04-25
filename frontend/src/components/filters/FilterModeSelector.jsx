import { Globe, Target, CheckCircle2, Lock } from 'lucide-react';

const MODES = [
  { 
    id: 'none',     
    icon: Globe,        
    label: 'Any Problem',   
    desc: 'Draw from the entire dataset without friend restrictions.' 
  },
  { 
    id: 'unsolved', 
    icon: Target,       
    label: 'Friends\' Unsolved', 
    desc: 'Only show problems your friends attempted but failed to solve.' 
  },
  { 
    id: 'solved',   
    icon: CheckCircle2, 
    label: 'Friends\' Solved',   
    desc: 'Only show problems your friends have successfully completed.' 
  },
];

export const FilterModeSelector = ({ value, onChange, disabled }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    {MODES.map(m => {
      const Icon = m.icon;
      const active = value === m.id;
      const locked = disabled && m.id !== 'none';
      return (
        <button key={m.id} type="button" disabled={locked} onClick={() => onChange(m.id)} style={{
          display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 10,
          cursor: locked ? 'not-allowed' : 'pointer', opacity: locked ? 0.4 : 1,
          background: active ? 'var(--bg-card)' : 'transparent',
          border: `1px solid ${active ? 'var(--b2)' : 'transparent'}`,
          transition: 'all .15s ease', textAlign: 'left', width: '100%',
          position: 'relative', overflow: 'hidden'
        }}
          onMouseEnter={e => { if (!active && !locked) { e.currentTarget.style.background = 'var(--bg-el)'; } }}
          onMouseLeave={e => { if (!active && !locked) { e.currentTarget.style.background = 'transparent'; } }}
        >
          {active && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'var(--primary)', borderRadius: '10px 0 0 10px' }} />}
          
          <Icon size={18} strokeWidth={active ? 2 : 1.5} color={active ? 'var(--primary)' : 'var(--t3)'} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? 'var(--primary)' : 'var(--t2)' }}>{m.label}</div>
            <div style={{ fontSize: 11, color: active ? 'var(--t2)' : 'var(--t3)', marginTop: 3, lineHeight: 1.4 }}>{m.desc}</div>
          </div>
        </button>
      );
    })}
    {disabled && (
      <p style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--mono)', paddingLeft: 6, display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
        <Lock size={12} strokeWidth={2} /> Add CF friends to unlock
      </p>
    )}
  </div>
);
