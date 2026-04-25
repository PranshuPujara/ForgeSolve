import { useState, useCallback } from 'react';
import { SlidersHorizontal, AlertTriangle, Target, ChevronDown, ChevronUp } from 'lucide-react';

const PRESETS = [
  { label:'Newbie',     min:800,  max:1000, color:'#4ade80' },
  { label:'Pupil',      min:1000, max:1300, color:'#60a5fa' },
  { label:'Specialist', min:1300, max:1600, color:'#818cf8' },
  { label:'Expert',     min:1600, max:1900, color:'#a78bfa' },
  { label:'CM',         min:1900, max:2200, color:'#fb923c' },
  { label:'Master+',    min:2200, max:3500, color:'#f87171' },
];
const LEVELS = [
  { id:'easy',   label:'Easy',   color:'#4ade80' },
  { id:'medium', label:'Medium', color:'#fbbf24' },
  { id:'hard',   label:'Hard',   color:'#f87171' },
];

const validate = (min, max) => {
  const mn = parseInt(min), mx = parseInt(max);
  const e = { min:'', max:'' };
  if (!min||isNaN(mn))    e.min='Required';
  else if (mn<800)        e.min='Min 800';
  else if (mn>3500)       e.min='Max 3500';
  if (!max||isNaN(mx))    e.max='Required';
  else if (mx<800)        e.max='Min 800';
  else if (mx>3500)       e.max='Max 3500';
  else if (!e.min&&mx<mn) e.max='Must be ≥ min';
  return { e, mn, mx, ok:!e.min&&!e.max };
};

const CustomRange = ({ minRating, maxRating, onChange }) => {
  const [lMin, setLMin] = useState(String(minRating??800));
  const [lMax, setLMax] = useState(String(maxRating??1600));
  const [errs, setErrs] = useState({ min:'', max:'' });

  const tryCommit = useCallback((mn, mx) => {
    const { e, ok, mn:a, mx:b } = validate(mn, mx);
    setErrs(e);
    if (ok) onChange({ minRating:a, maxRating:b });
  }, [onChange]);

  const onMin = v => { setLMin(v); tryCommit(v, lMax); };
  const onMax = v => { setLMax(v); tryCommit(lMin, v); };

  const mn = parseInt(lMin)||800, mx = parseInt(lMax)||1600;
  const total = 2700;
  const barL = Math.max(0, ((mn-800)/total)*100);
  const barW = Math.max(0, ((Math.max(mx,mn)-mn)/total)*100);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }} className="anim-up">
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {[{ lbl:'MIN RATING', val:lMin, fn:onMin, err:errs.min, ph:'800' },
          { lbl:'MAX RATING', val:lMax, fn:onMax, err:errs.max, ph:'3500' }].map(f=>(
          <div key={f.lbl}>
            <div className="lbl" style={{ marginBottom:6, color:'var(--primary)' }}>{f.lbl}</div>
            <input className={`pp-input${f.err?' err':''}`} type="number"
              value={f.val} onChange={e=>f.fn(e.target.value)}
              placeholder={f.ph} min={800} max={3500} step={100}
              style={{ textAlign:'center', fontSize:15, fontWeight:800, letterSpacing:'-.02em' }} />
            {f.err && <p style={{ fontSize:11, color:'var(--red)', marginTop:5, fontFamily:'var(--mono)', fontWeight:700, display:'flex', alignItems:'center', gap:4 }}><AlertTriangle size={11} strokeWidth={2} /> {f.err}</p>}
          </div>
        ))}
      </div>
      {/* range bar */}
      <div>
        <div style={{ height:5, background:'var(--bg-press)', borderRadius:99, position:'relative' }}>
          <div style={{ position:'absolute', top:0, height:'100%', left:`${barL}%`, width:`${barW}%`,
            minWidth: mn===mx?5:0, background:'var(--primary)', borderRadius:99, transition:'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }} />
          {mn===mx && <div style={{ position:'absolute', top:-4, left:`${barL}%`, transform:'translateX(-50%)',
            width:12, height:12, borderRadius:'50%', background:'var(--primary)', border:'2.5px solid var(--bg)' }} />}
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontSize:10, color:'var(--t3)', fontFamily:'var(--mono)', fontWeight:700, letterSpacing:'.05em' }}>
          {[800,1600,2400,3500].map(v=><span key={v}>{v}</span>)}
        </div>
      </div>
      {mn===mx && <p style={{ fontSize:11, color:'var(--primary)', fontFamily:'var(--mono)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', display:'flex', alignItems:'center', gap:5 }}><Target size={12} strokeWidth={2} /> Exact match: {mn}</p>}
    </div>
  );
};

export const DifficultySelector = ({ platform, minRating, maxRating, difficulty, onChange }) => {
  const [showCustom, setShowCustom] = useState(false);

  if (platform==='codeforces') {
    const activePreset = !showCustom && PRESETS.find(p=>p.min===minRating&&p.max===maxRating);
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:7 }}>
          {PRESETS.map(p => {
            const active = activePreset?.label===p.label;
            return (
              <button key={p.label} type="button"
                onClick={()=>{ onChange({ minRating:p.min, maxRating:p.max }); setShowCustom(false); }}
                style={{ padding:'10px 6px', borderRadius:9, cursor:'pointer', textAlign:'center',
                  background:active?`${p.color}12`:'var(--bg-el)',
                  border:`1.5px solid ${active?p.color+'60':'var(--b1)'}`, transition:'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
                onMouseEnter={e=>{ if(!active) { e.currentTarget.style.borderColor='var(--b2)'; e.currentTarget.style.transform='translateY(-1px)'; }}}
                onMouseLeave={e=>{ if(!active) { e.currentTarget.style.borderColor='var(--b1)'; e.currentTarget.style.transform=''; }}}
              >
                <div style={{ fontSize:12, fontWeight:800, color:active?p.color:'var(--t2)' }}>{p.label}</div>
                <div style={{ fontSize:10, color:active?p.color+'dd':'var(--t3)', marginTop:2, fontFamily:'var(--mono)', fontWeight:700, letterSpacing:'.05em' }}>{p.min}–{p.max}</div>
              </button>
            );
          })}
        </div>
        <button type="button" onClick={()=>setShowCustom(v=>!v)}
          style={{ padding:'10px', borderRadius:9, cursor:'pointer', width:'100%',
            background:showCustom?'var(--primary-bg)':'var(--bg-el)',
            border:`1.5px solid ${showCustom?'var(--primary)':'var(--b1)'}`,
            color:showCustom?'var(--primary)':'var(--t3)',
            fontSize:12, fontFamily:'var(--mono)', transition:'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}
            onMouseEnter={e=>{ if(!showCustom) e.currentTarget.style.borderColor='var(--b2)'; }}
            onMouseLeave={e=>{ if(!showCustom) e.currentTarget.style.borderColor='var(--b1)'; }}
        >
          {showCustom ? <><ChevronUp size={14} strokeWidth={2} /> Custom range</> : <><SlidersHorizontal size={14} strokeWidth={1.8} /> Custom range</>}
        </button>
        {showCustom && <CustomRange minRating={minRating} maxRating={maxRating} onChange={onChange} />}
      </div>
    );
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
      {LEVELS.map(l => {
        const active = difficulty===l.id;
        return (
          <button key={l.id} type="button"
            onClick={()=>onChange({ difficulty:active?null:l.id })}
            style={{ padding:'11px 8px', borderRadius:10, cursor:'pointer', textAlign:'center',
              background:active?`${l.color}12`:'var(--bg-el)',
              border:`1.5px solid ${active?l.color+'60':'var(--b1)'}`,
              color:active?l.color:'var(--t2)', fontSize:13, fontWeight:800, transition:'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              letterSpacing:'-.02em' }}
            onMouseEnter={e=>{ if(!active) { e.currentTarget.style.borderColor='var(--b2)'; e.currentTarget.style.transform='translateY(-1px)'; }}}
            onMouseLeave={e=>{ if(!active) { e.currentTarget.style.borderColor='var(--b1)'; e.currentTarget.style.transform=''; }}}
          >{l.label}</button>
        );
      })}
    </div>
  );
};
