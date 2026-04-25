import { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, UserPlus, X as XIcon } from 'lucide-react';
import { storage } from '../../utils/localStorage';
import { validateHandle } from '../../services/api';

export const FriendsPanel = ({ handles, onChange }) => {
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { storage.set('friends', handles); }, [handles]);

  const add = async () => {
    const h = input.trim();
    if (!h) return;
    if (handles.includes(h)) { setError('Already added'); return; }
    if (handles.length >= 10) { setError('Max 10 friends'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      const data = await validateHandle(h);
      onChange([...handles, h]);
      setInput('');
      setSuccess(`@${h} · ${(data.solvedCount??'?').toLocaleString()} solved`);
      setTimeout(()=>setSuccess(''), 3000);
    } catch(e) {
      setError(e.message?.includes('not found')?`"${h}" not found on CF`:(e.message||'Error'));
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      <p style={{ fontSize:12, color:'var(--t3)', lineHeight:1.6 }}>
        Add CF handles to filter problems by friend submissions. Max 10.
      </p>
      <div style={{ display:'flex', gap:8 }}>
        <input className="pp-input" style={{ flex:1 }} value={input} placeholder="cf_handle…"
          onChange={e=>{ setInput(e.target.value); setError(''); }}
          onKeyDown={e=>e.key==='Enter'&&add()} disabled={loading} />
        <button type="button" onClick={add} disabled={!input.trim()||loading}
          style={{ padding:'9px 14px', borderRadius:8, cursor:'pointer', flexShrink:0, border:'none',
            background:loading?'var(--bg-press)':'var(--primary)',
            color:loading?'var(--t2)':'#000', fontSize:12, fontWeight:700,
            opacity:(!input.trim()||loading)?.4:1, display:'flex', alignItems:'center', gap:5, transition:'all .15s' }}
          onMouseEnter={e=>{ if(!loading) e.currentTarget.style.filter='brightness(1.08)'; }}
          onMouseLeave={e=>e.currentTarget.style.filter=''}
        >
          {loading
            ? <span style={{ width:12,height:12,border:'2px solid currentColor',borderTopColor:'transparent',borderRadius:'50%',animation:'spin .7s linear infinite',display:'block' }}/>
            : <><UserPlus size={14} strokeWidth={2} />Add</>
          }
        </button>
      </div>
      {error   && <p style={{ fontSize:12, color:'var(--red)',   fontFamily:'var(--mono)', display:'flex', alignItems:'center', gap:5 }}><AlertTriangle size={12} strokeWidth={2} /> {error}</p>}
      {success && <p style={{ fontSize:12, color:'var(--success)', fontFamily:'var(--mono)', display:'flex', alignItems:'center', gap:5 }}><CheckCircle size={12} strokeWidth={2} /> {success}</p>}
      {handles.length > 0
        ? <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {handles.map(h=>(
              <div key={h} style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px',
                borderRadius:7, background:'var(--bg-el)', border:'1px solid var(--b1)', fontSize:12, fontFamily:'var(--mono)' }}>
                <span style={{ color:'var(--primary)' }}>@</span>
                <span style={{ color:'var(--t1)' }}>{h}</span>
                <button type="button" onClick={()=>onChange(handles.filter(x=>x!==h))}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'var(--t3)', lineHeight:1, padding:0, display:'flex', alignItems:'center' }}
                  onMouseEnter={e=>e.currentTarget.style.color='var(--red)'}
                  onMouseLeave={e=>e.currentTarget.style.color='var(--t3)'}
                ><XIcon size={12} strokeWidth={2} /></button>
              </div>
            ))}
          </div>
        : <p style={{ fontSize:12, color:'var(--t3)', fontFamily:'var(--mono)', textAlign:'center', padding:'4px 0' }}>No friends added</p>
      }
    </div>
  );
};
