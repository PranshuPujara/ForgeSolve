import { useState } from 'react';
import { RefreshCw, Flame } from 'lucide-react';

const RANK_COLOR = {
  newbie:              '#808080',
  pupil:               '#008000',
  specialist:          '#03a89e',
  expert:              '#0000ff',
  'candidate master':  '#aa00aa',
  master:              '#ff8c00',
  'international master': '#ff8c00',
  grandmaster:         '#ff0000',
  'international grandmaster': '#ff0000',
  'legendary grandmaster':     '#ff0000',
};
const rankColor = r => RANK_COLOR[r?.toLowerCase()] || 'var(--t2)';

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtMonth = ym => { const [,m] = ym.split('-'); return MONTHS_SHORT[parseInt(m)-1]; };

// ── Mini bar chart ─────────────────────────────────────
const BarChart = ({ data, color = 'var(--primary)', height = 60 }) => {
  const max = Math.max(...data.map(d => d.count), 1);
  const [hovered, setHovered] = useState(null);

  return (
    <div style={{ position:'relative' }}>
      <div style={{ display:'flex', alignItems:'flex-end', gap:3, height }}>
        {data.map((d, i) => {
          const pct = (d.count / max) * 100;
          const isHov = hovered === i;
          return (
            <div key={d.month || d.rating} style={{ flex:1, height:'100%', display:'flex', flexDirection:'column', justifyContent:'flex-end', alignItems:'center', cursor:'default' }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {isHov && (
                <div style={{
                  position:'absolute', bottom: height + 8,
                  left:`${(i / data.length) * 100}%`,
                  background:'var(--bg-press)', border:'1px solid var(--b2)',
                  borderRadius:6, padding:'4px 8px', fontSize:11, fontFamily:'var(--mono)',
                  color:'var(--t1)', whiteSpace:'nowrap', zIndex:10, pointerEvents:'none',
                  boxShadow:'0 4px 12px #0008',
                }}>
                  {d.month ? fmtMonth(d.month) : `${d.rating}`}: <strong>{d.count}</strong>
                </div>
              )}
              <div className="bar-grow" style={{
                width:'100%',
                height:`${Math.max(pct, d.count > 0 ? 4 : 0)}%`,
                background: isHov ? 'var(--primary)' : color,
                borderRadius:'3px 3px 0 0',
                transition:'background .12s',
              }} />
            </div>
          );
        })}
      </div>
      {/* x-axis labels for monthly */}
      {data[0]?.month && (
        <div style={{ display:'flex', gap:3, marginTop:4 }}>
          {data.map((d,i) => (
            <div key={d.month} style={{ flex:1, textAlign:'center', fontSize:9, color:'var(--t3)', fontFamily:'var(--mono)' }}>
              {i % 3 === 0 ? fmtMonth(d.month) : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Circular progress ───────────────────────────────────
const CircleProgress = ({ value, max, label, color, size = 72 }) => {
  const r    = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = Math.min(value / max, 1);
  const dash = circ * pct;

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
      <div style={{ position:'relative', width:size, height:size }}>
        <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--b1)" strokeWidth={5} />
          <circle cx={size/2} cy={size/2} r={r} fill="none"
            stroke={color} strokeWidth={5} strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{ transition:'stroke-dasharray .6s cubic-bezier(.16,1,.3,1)' }}
          />
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:15, fontWeight:800, color, fontFamily:'var(--mono)' }}>
          {value}
        </div>
      </div>
      <div style={{ fontSize:10, color:'var(--t3)', fontFamily:'var(--mono)', letterSpacing:'.06em', textTransform:'uppercase' }}>
        {label}
      </div>
    </div>
  );
};

// ── Tag bar ─────────────────────────────────────────────
const TagBar = ({ tag, count, max }) => {
  const pct = Math.round((count / max) * 100);
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--t2)', width:110, flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {tag}
      </div>
      <div style={{ flex:1, height:5, background:'var(--bg-press)', borderRadius:99, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:'var(--primary)', borderRadius:99, transition:'width .4s cubic-bezier(.16,1,.3,1)' }} />
      </div>
      <div style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--t3)', width:28, textAlign:'right', flexShrink:0 }}>
        {count}
      </div>
    </div>
  );
};

// ── Main ProfileStats component ─────────────────────────
export const ProfileStats = ({ stats, loading, onRefresh }) => {
  const [activeTab, setActiveTab] = useState('overview'); // overview | tags | activity

  if (loading) {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:12, paddingTop:4 }}>
        {[80, 120, 100].map(h => (
          <div key={h} className="skel" style={{ height:h, borderRadius:10 }} />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const rc = rankColor(stats.rank);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }} className="panel-in">

      {/* ── Profile header ── */}
      <div style={{
        display:'flex', alignItems:'center', gap:13,
        padding:'14px 16px', borderRadius:12,
        background:'var(--bg-el)', border:'1px solid var(--b1)',
        position:'relative', overflow:'hidden',
      }}>
        {/* Rank color accent strip */}
        <div style={{ position:'absolute', left:0, top:0, bottom:0, width:3, background:rc, borderRadius:'10px 0 0 10px' }} />

        {/* Avatar */}
        <div style={{
          width:44, height:44, borderRadius:10, overflow:'hidden', flexShrink:0,
          background:'var(--bg-press)', border:`1.5px solid ${rc}60`,
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:20,
        }}>
          {stats.avatar
            ? <img src={stats.avatar} alt={stats.handle} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : <span style={{ color:'var(--t3)' }}>—</span>
          }
        </div>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <span style={{ fontSize:15, fontWeight:800, color:'var(--t1)', letterSpacing:'-.02em' }}>
              @{stats.handle}
            </span>
            <span style={{ fontSize:11, fontWeight:600, color:rc, fontFamily:'var(--mono)' }}>
              {stats.rank}
            </span>
          </div>
          <div style={{ display:'flex', gap:12, marginTop:4, flexWrap:'wrap' }}>
            {stats.rating && (
              <span style={{ fontSize:12, fontFamily:'var(--mono)', color:rc, fontWeight:700, display:'flex', alignItems:'center', gap:3 }}>
                <span style={{ fontSize:14 }}>★</span> {stats.rating}
              </span>
            )}
            {stats.maxRating && stats.maxRating !== stats.rating && (
              <span style={{ fontSize:11, color:'var(--t3)', fontFamily:'var(--mono)' }}>
                peak {stats.maxRating}
              </span>
            )}
            {stats.registeredAt && (
              <span style={{ fontSize:11, color:'var(--t3)', fontFamily:'var(--mono)' }}>
                since {stats.registeredAt}
              </span>
            )}
          </div>
        </div>

        {/* Refresh btn */}
        <button type="button" onClick={onRefresh}
          style={{ 
            display:'flex', alignItems:'center', gap:6, 
            padding:'8px 12px', borderRadius:8, flexShrink:0, marginLeft:'auto',
            background:'var(--bg-card)', border:'1px solid var(--b2)',
            color:'var(--t2)', fontSize:11, fontWeight:700, fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:'0.05em',
            cursor:'pointer', transition:'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow:'0 2px 5px rgba(0,0,0,0.2)'
          }}
          onMouseEnter={e=>{ e.currentTarget.style.color='var(--primary)'; e.currentTarget.style.borderColor='var(--primary)'; e.currentTarget.style.background='var(--primary-bg)'; e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 4px 12px rgba(0, 217, 255, 0.15)'; }}
          onMouseLeave={e=>{ e.currentTarget.style.color='var(--t2)'; e.currentTarget.style.borderColor='var(--b2)'; e.currentTarget.style.background='var(--bg-card)'; e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 2px 5px rgba(0,0,0,0.2)'; }}
          onMouseDown={e=>e.currentTarget.style.transform='scale(.97)'}
          onMouseUp={e=>e.currentTarget.style.transform='translateY(-1px)'}
        >
          <RefreshCw size={13} strokeWidth={2.5} />
          Sync
        </button>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display:'flex', gap:4, padding:'3px', background:'var(--bg-el)', borderRadius:9, border:'1px solid var(--b0)' }}>
        {[
          { id:'overview', label:'Overview' },
          { id:'tags',     label:'Top Tags' },
          { id:'activity', label:'Activity' },
        ].map(t => (
          <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
            style={{
              flex:1, padding:'6px 0', borderRadius:7, cursor:'pointer', border:'none',
              background: activeTab===t.id ? 'var(--bg-press)' : 'transparent',
              color: activeTab===t.id ? 'var(--t1)' : 'var(--t3)',
              fontSize:11, fontWeight:600, fontFamily:'var(--mono)', letterSpacing:'.04em',
              transition:'all .15s',
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* ── Overview tab ── */}
      {activeTab === 'overview' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }} className="panel-in">
          {/* Big numbers row */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
            {[
              { label:'Solved',     value:stats.solvedCount,      color:'var(--primary)' },
              { label:'Attempted',  value:stats.attemptedCount,   color:'var(--yellow)' },
              { label:'AC Rate',    value:`${stats.acRate}%`,     color:'var(--green)' },
            ].map(s => (
              <div key={s.label} style={{
                padding:'12px 10px', borderRadius:10, textAlign:'center',
                background:'var(--bg-el)', border:'1px solid var(--b1)',
              }}>
                <div style={{ fontSize:20, fontWeight:800, color:s.color, fontFamily:'var(--mono)', lineHeight:1 }}>
                  {typeof s.value === 'number' ? s.value.toLocaleString() : s.value}
                </div>
                <div style={{ fontSize:10, color:'var(--t3)', marginTop:4, fontFamily:'var(--mono)', letterSpacing:'.08em', textTransform:'uppercase' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Streak row */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[
              { label:'Current Streak', value:`${stats.currentStreak}d`, color:'var(--warning)' },
              { label:'Best Streak',    value:`${stats.maxStreak}d`,     color:'var(--yellow)' },
            ].map(s => (
              <div key={s.label} style={{
                padding:'11px 13px', borderRadius:10, display:'flex', alignItems:'center', gap:10,
                background:'var(--bg-el)', border:'1px solid var(--b1)',
              }}>
                <Flame size={18} strokeWidth={1.8} color={s.color} style={{ flexShrink:0 }} />
                <div>
                  <div style={{ fontSize:16, fontWeight:800, color:s.color, fontFamily:'var(--mono)', lineHeight:1 }}>{s.value}</div>
                  <div style={{ fontSize:10, color:'var(--t3)', marginTop:3, fontFamily:'var(--mono)', letterSpacing:'.06em', textTransform:'uppercase' }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Total submissions */}
          <div style={{ padding:'10px 14px', borderRadius:9, background:'var(--bg-el)', border:'1px solid var(--b1)',
            display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:12, color:'var(--t2)' }}>Total submissions</span>
            <span style={{ fontSize:13, fontWeight:700, fontFamily:'var(--mono)', color:'var(--t1)' }}>
              {stats.totalSubmissions.toLocaleString()}
            </span>
          </div>

          {/* Rating dist chart */}
          {stats.ratingDist.length > 0 && (
            <div>
              <div className="lbl" style={{ marginBottom:8 }}>Solved by rating</div>
              <BarChart data={stats.ratingDist} color="var(--blue)" height={56} />
            </div>
          )}
        </div>
      )}

      {/* ── Tags tab ── */}
      {activeTab === 'tags' && (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }} className="panel-in">
          <div className="lbl">Top solved topics</div>
          {stats.topTags.length === 0
            ? <p style={{ fontSize:12, color:'var(--t3)', fontFamily:'var(--mono)' }}>No data yet</p>
            : stats.topTags.map((t, i) => (
                <TagBar key={t.tag} tag={t.tag} count={t.count} max={stats.topTags[0].count} />
              ))
          }
        </div>
      )}

      {/* ── Activity tab ── */}
      {activeTab === 'activity' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }} className="panel-in">
          <div className="lbl">Problems solved — last 12 months</div>
          <BarChart data={stats.monthlyActivity} color="var(--primary)" height={72} />
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--t3)', fontFamily:'var(--mono)' }}>
            <span>Total this year: <strong style={{ color:'var(--t1)' }}>{stats.monthlyActivity.reduce((a,b)=>a+b.count,0)}</strong></span>
            <span>Peak: <strong style={{ color:'var(--primary)' }}>{Math.max(...stats.monthlyActivity.map(d=>d.count))}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};
