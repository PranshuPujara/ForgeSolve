import { BarChart2, Braces, Binary } from 'lucide-react';

const PLATFORMS = [
  { id:'codeforces', label:'Codeforces', icon:BarChart2, desc:'Live API · Friend mode · 8k+ problems', color:'#3b82f6' },
  { id:'leetcode',   label:'LeetCode',   icon:Braces,    desc:'Interview focused · curated 50+',       color:'#f59e0b' },
  { id:'gfg',        label:'GFG',        icon:Binary,    desc:'DSA classics · interview prep',         color:'#10b981' },
];

export const PlatformSelector = ({ value, onChange }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
    {PLATFORMS.map(p => {
      const Icon = p.icon;
      const active = value === p.id;
      return (
        <button key={p.id} type="button" onClick={() => onChange(p.id)} style={{
          display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
          borderRadius:9, cursor:'pointer', textAlign:'left', width:'100%',
          background: active ? 'var(--bg-card)' : 'var(--bg-el)',
          border:`1px solid ${active ? p.color : 'var(--b1)'}`,
          transition:'all 0.2s ease',
          boxShadow: active ? `0 2px 8px rgba(0, 0, 0, 0.2)` : 'none',
          position:'relative',
          overflow:'hidden',
        }}
          onMouseEnter={e=>{ if(!active){ e.currentTarget.style.borderColor=p.color; e.currentTarget.style.background='var(--bg-hover)'; e.currentTarget.style.transform='translateY(-1px)'; }}}
          onMouseLeave={e=>{ if(!active){ e.currentTarget.style.borderColor='var(--b1)'; e.currentTarget.style.background='var(--bg-el)'; e.currentTarget.style.transform=''; }}}
        >
          {/* Icon */}
          <Icon size={20} strokeWidth={1.5} color={active ? p.color : 'var(--t3)'} style={{ flexShrink:0 }} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:700, color: active ? p.color : 'var(--t1)' }}>{p.label}</div>
            <div style={{ fontSize:11, color:'var(--t3)', fontFamily:'var(--mono)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:500 }}>{p.desc}</div>
          </div>
          {/* Radio dot */}
          <div style={{ width:16, height:16, borderRadius:'50%', flexShrink:0,
            border:`2px solid ${active ? p.color : 'var(--b2)'}`, background: active ? p.color : 'transparent',
            transition:'all 0.2s' }}>
            {active && <div style={{ width:'100%', height:'100%', borderRadius:'50%', background:p.color, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#000' }} />
            </div>}
          </div>
        </button>
      );
    })}
  </div>
);
