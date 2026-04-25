import { useState } from 'react';
import { Trash2, AlertCircle, ExternalLink } from 'lucide-react';
import { getHistory, clearHistory } from '../../utils/localStorage';

const buildUrl = (item) => {
  if (item.includes(':')) {
    const [platform, ...rest] = item.split(':');
    const id = rest.join(':');
    if (platform === 'codeforces') {
      const parts = id.split('-');
      if (parts.length >= 2) {
        const idx = parts[parts.length - 1];
        const contestId = parts.slice(0, -1).join('-');
        return `https://codeforces.com/problemset/problem/${contestId}/${idx}`;
      }
    }
  }
  const parts = item.split('-');
  if (parts.length >= 2) {
    const idx = parts[parts.length - 1];
    const cid = parts.slice(0, -1).join('-');
    return `https://codeforces.com/problemset/problem/${cid}/${idx}`;
  }
  return null;
};

const getDisplayId = (item) => item.includes(':') ? item.split(':').slice(1).join(':') : item;
const getPlatform  = (item) => item.includes(':') ? item.split(':')[0] : 'codeforces';

const PLAT_COLOR = { codeforces:'var(--blue)', leetcode:'var(--orange)', gfg:'var(--green)' };

export const HistoryPanel = ({ onClear, forceOpen = false }) => {
  const [open,    setOpen]    = useState(forceOpen);
  const [confirm, setConfirm] = useState(false);

  const history = getHistory();
  const pct      = Math.min((history.length / 200) * 100, 100);
  const barColor = pct > 80 ? 'var(--red)' : pct > 50 ? 'var(--yellow)' : 'var(--primary)';

  const doClear = () => {
    if (!confirm) { setConfirm(true); return; }
    clearHistory(); onClear?.(); setConfirm(false); if (!forceOpen) setOpen(false);
  };

  const openProblem = (item) => {
    const url = buildUrl(item);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const inner = (
    <>
      {history.length === 0 ? (
        <p style={{ fontSize:12, color:'var(--t3)', fontFamily:'var(--mono)', textAlign:'center', padding:'12px 0' }}>
          No history yet — start picking problems!
        </p>
      ) : (
        <>
          <p style={{ fontSize:11, color:'var(--t3)', fontFamily:'var(--mono)', marginBottom:8 }}>
            Click any item to open in browser
          </p>
          <div style={{ maxHeight: forceOpen ? 'none' : 170, overflowY: forceOpen ? 'visible' : 'auto', display:'flex', flexDirection:'column', gap:2 }}>
            {history.map((item, i) => {
              const url       = buildUrl(item);
              const displayId = getDisplayId(item);
              const platform  = getPlatform(item);
              const pc        = PLAT_COLOR[platform] || 'var(--t3)';
              return (
                <button key={item} type="button"
                  onClick={() => openProblem(item)}
                  disabled={!url}
                  style={{
                    display:'flex', alignItems:'center', gap:10, padding:'7px 9px', borderRadius:7,
                    cursor:url?'pointer':'default', background:'transparent', border:'none', textAlign:'left',
                    transition:'background .12s', width:'100%',
                  }}
                  onMouseEnter={e=>{ if(url) e.currentTarget.style.background='var(--bg-hover)'; }}
                  onMouseLeave={e=>{ e.currentTarget.style.background='transparent'; }}
                >
                  <span style={{ fontSize:10, color:'var(--t3)', fontFamily:'var(--mono)', width:24, textAlign:'right', flexShrink:0 }}>{i+1}</span>
                  {/* Platform dot */}
                  <div style={{ width:5, height:5, borderRadius:'50%', background:pc, flexShrink:0 }} />
                  <span style={{ fontSize:12, color:'var(--t2)', fontFamily:'var(--mono)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
                    {displayId}
                  </span>
                  {url && <ExternalLink size={12} strokeWidth={1.8} color="var(--t3)" style={{ flexShrink:0 }} />}
                </button>
              );
            })}
          </div>
          <button type="button" onClick={doClear} style={{
            marginTop:10, padding:'7px', borderRadius:8, cursor:'pointer', fontSize:12, fontFamily:'var(--mono)', width:'100%',
            background:confirm?'var(--red-bg)':'transparent',
            border:`1px solid ${confirm?'var(--red)60':'var(--b0)'}`,
            color:confirm?'var(--red)':'var(--t3)', transition:'all .15s',
            display:'flex', alignItems:'center', justifyContent:'center', gap:6,
          }}>{confirm ? <><AlertCircle size={14} strokeWidth={2} />Confirm clear</> : <><Trash2 size={14} strokeWidth={1.8} />Clear History</>}</button>
        </>
      )}
    </>
  );

  if (forceOpen) return inner;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {/* Header row */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:12, color:'var(--t3)' }}>{history.length}/200</span>
          <div style={{ width:64, height:3, background:'var(--bg-press)', borderRadius:99, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${pct}%`, background:barColor, borderRadius:99, transition:'width .4s' }} />
          </div>
        </div>
        <button type="button" onClick={()=>setOpen(v=>!v)}
          style={{ fontSize:11, color:'var(--t3)', cursor:'pointer', background:'none', border:'none', fontFamily:'var(--mono)' }}
          onMouseEnter={e=>e.currentTarget.style.color='var(--primary)'}
          onMouseLeave={e=>e.currentTarget.style.color='var(--t3)'}
        >{open ? 'hide ▲' : 'view ▼'}</button>
      </div>
      {open && <div className="anim-in">{inner}</div>}
    </div>
  );
};
