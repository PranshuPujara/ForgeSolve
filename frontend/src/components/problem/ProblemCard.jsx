import { useState, useEffect } from 'react';
import { ExternalLink, Copy, Check, RefreshCw, Clock, Pause, Play, RotateCcw, Users } from 'lucide-react';
import { DifficultyBadge, PlatformBadge, Badge } from '../ui/Badge';
import { useTimer } from '../../hooks/useTimer';
import { useLiveSolver } from '../../hooks/useLiveSolver';

const CountUp = ({ target }) => {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!target) return;
    const steps=28, ms=900/steps;
    let c=0;
    const id=setInterval(()=>{ c+=target/steps; if(c>=target){setV(target);clearInterval(id);}else setV(Math.floor(c)); },ms);
    return ()=>clearInterval(id);
  }, [target]);
  return <>{v.toLocaleString()}</>;
};

const PLAT_COLOR = { codeforces:'var(--blue)', leetcode:'var(--orange)', gfg:'var(--green)' };

export const ProblemCard = ({ problem, meta, onPickAgain, userSolvedIds, userHandle }) => {
  const { seconds, running, formatted, start, stop, reset } = useTimer();
  const solver = useLiveSolver();
  const [opened,  setOpened]  = useState(false);
  const [copied,  setCopied]  = useState(false);
  const [showAll, setShowAll] = useState(false);

  const accent = PLAT_COLOR[problem.platform] || 'var(--primary)';
  const tags = problem.tags || [];
  const visible = showAll ? tags : tags.slice(0,8);
  const timerColor = seconds>3600?'var(--red)':seconds>1800?'var(--yellow)':'var(--green)';

  // Check if user already solved this
  const userSolved = userSolvedIds?.has(problem.id);

  const handleOpen = () => {
    window.open(problem.url,'_blank','noopener,noreferrer');
    if(!opened){ 
      setOpened(true); 
      start(); 
      if (problem.platform === 'codeforces' && userHandle) {
        solver.startTracking(problem.id, userHandle);
      }
    }
  };
  const handleCopy = async () => {
    try{ await navigator.clipboard.writeText(problem.url); }catch{}
    setCopied(true); setTimeout(()=>setCopied(false),2000);
  };

  useEffect(() => {
    if (solver.isSolved && solver.problemId === problem.id && running) {
      stop();
    }
  }, [solver.isSolved, solver.problemId, problem.id, running, stop]);

  return (
    <div className="anim-scale">
      <div style={{
        position: 'relative',
        background:'var(--bg-card)',
        border:`1px solid var(--b1)`,
        borderTop:`3px solid ${accent}`,
        borderRadius:12,
        overflow:'hidden',
        boxShadow: `0 4px 12px rgba(0, 0, 0, 0.2)`,
        transition:'all 0.3s ease',
      }}
      onMouseEnter={e=>{ e.currentTarget.style.boxShadow=`0 6px 16px rgba(0, 0, 0, 0.25)`; e.currentTarget.style.transform='translateY(-2px)'; }}
      onMouseLeave={e=>{ e.currentTarget.style.boxShadow=`0 4px 12px rgba(0, 0, 0, 0.2)`; e.currentTarget.style.transform=''; }}
      >
        <div style={{ padding:'24px 24px 20px', display:'flex', flexDirection:'column', gap:18 }}>

          {/* Badges + solve count */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:14 }}>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              <PlatformBadge platform={problem.platform} />
              <DifficultyBadge difficulty={problem.difficulty} rating={problem.rating} />
              {meta?.isDaily && <Badge color="acid"><Clock size={12} strokeWidth={2} /> Daily</Badge>}
              {userSolved && <Badge color="green"><Check size={12} strokeWidth={2.5} /> Solved</Badge>}
            </div>
            {problem.solvedCount > 0 && (
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:22, fontWeight:900, color:accent, fontFamily:'var(--mono)', lineHeight:1 }}>
                  <CountUp target={problem.solvedCount} />
                </div>
                <div style={{ fontSize:10, color:'var(--t3)', marginTop:3, fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:'.08em', fontWeight:700 }}>solved</div>
              </div>
            )}
          </div>

          {/* Name */}
          <div>
            <h2 style={{ fontSize:22, fontWeight:900, color:'var(--t1)', lineHeight:1.3, letterSpacing:'-.025em', marginBottom:6 }}>{problem.name}</h2>
            <div style={{ fontSize:11, color:'var(--t3)', fontFamily:'var(--mono)', fontWeight:600, letterSpacing:'.05em', textTransform:'uppercase' }}>
              {problem.id}{problem.contestId&&<span style={{ marginLeft:10, opacity:0.7 }}>contest #{problem.contestId}</span>}
            </div>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {visible.map(t=><span key={t} className="pp-tag">{t}</span>)}
              {!showAll && tags.length>8 && (
                <button type="button" onClick={()=>setShowAll(true)} className="pp-tag"
                  style={{ color:'var(--primary)', borderColor:'var(--primary)', background:'var(--primary-bg)', cursor:'pointer', fontWeight:700 }}>
                  +{tags.length-8}
                </button>
              )}
            </div>
          )}

          {/* Friends solved */}
          {problem.friendsSolvedCount > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:9, background:'var(--green-bg)', border:'1px solid var(--green)40' }}>
              <Users size={16} strokeWidth={1.8} color="var(--green)" style={{ flexShrink:0 }} />
              <span style={{ fontSize:13, color:'var(--green)', fontWeight:600 }}>{problem.friendsSolvedCount} friend{problem.friendsSolvedCount!==1?'s':''} solved</span>
            </div>
          )}

          {/* Timer */}
          {opened && (
            <div className="anim-in" style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'13px 15px', borderRadius:10, background:'var(--bg-el)', border:'1px solid var(--b1)' }}>
              <div>
                <div style={{ fontSize:26, fontWeight:900, fontFamily:'var(--mono)', color:timerColor, lineHeight:1, letterSpacing:'-.02em' }}>{formatted}</div>
                <div style={{ fontSize:11, color:'var(--t3)', marginTop:4, fontFamily:'var(--mono)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', display:'flex', alignItems:'center', gap:5 }}>
                  {running ? <><span style={{ width:6, height:6, borderRadius:'50%', background:timerColor, display:'inline-block' }} /> live</> : <><Pause size={10} strokeWidth={2.5} /> paused</>}
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button type="button" onClick={running?stop:start}
                  style={{ padding:'7px 13px', borderRadius:8, cursor:'pointer', background:'var(--bg-hover)', border:'1px solid var(--b1)', color:'var(--t2)', fontSize:12, fontFamily:'var(--mono)', fontWeight:700, transition:'all .15s', display:'flex', alignItems:'center', gap:5 }}
                  onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--b2)'; e.currentTarget.style.color='var(--t1)'; }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--b1)'; e.currentTarget.style.color='var(--t2)'; }}
                >
                  {running ? <Pause size={14} strokeWidth={2} /> : <Play size={14} strokeWidth={2} />}
                </button>
                <button type="button" onClick={reset} title="Reset"
                  style={{ padding:'7px 10px', borderRadius:8, cursor:'pointer', background:'transparent', border:'1px solid var(--b0)', color:'var(--t3)', fontSize:13, fontWeight:700, transition:'all .15s' }}
                  onMouseEnter={e=>{ e.currentTarget.style.color='var(--red)'; e.currentTarget.style.borderColor='var(--red)30'; }}
                  onMouseLeave={e=>{ e.currentTarget.style.color='var(--t3)'; e.currentTarget.style.borderColor='var(--b0)'; }}
                ><RotateCcw size={14} strokeWidth={2} /></button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display:'flex', gap:9 }}>
            <button type="button" onClick={handleOpen}
              style={{ flex:1, padding:'12px 0', borderRadius:8, cursor:'pointer', border:'none',
                background:'var(--primary)', color:'#000', fontSize:14, fontWeight:900,
                letterSpacing:'-.02em', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'all .15s ease',
                boxShadow:'0 4px 12px rgba(0, 217, 255, 0.2)' }}
              onMouseEnter={e=>{ e.currentTarget.style.boxShadow='0 6px 16px rgba(0, 217, 255, 0.25)'; e.currentTarget.style.transform='translateY(-1px)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.boxShadow='0 4px 12px rgba(0, 217, 255, 0.2)'; e.currentTarget.style.transform=''; }}
              onMouseDown={e=>e.currentTarget.style.transform='scale(.97)'}
              onMouseUp={e=>e.currentTarget.style.transform='translateY(-1px)'}
            ><ExternalLink size={16} strokeWidth={2.2} />{opened?'Open again':'Solve this'}</button>

            <button type="button" onClick={onPickAgain}
              style={{ padding:'12px 17px', borderRadius:8, cursor:'pointer', background:'var(--bg-el)',
                border:'1px solid var(--b1)', color:'var(--t2)', fontSize:13, fontWeight:700,
                display:'flex', alignItems:'center', gap:7, transition:'all .15s ease' }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--primary)'; e.currentTarget.style.color='var(--t1)'; e.currentTarget.style.transform='translateY(-1px)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--b1)'; e.currentTarget.style.color='var(--t2)'; e.currentTarget.style.transform=''; }}
            ><RefreshCw size={14} strokeWidth={2} />Next</button>

            <button type="button" onClick={handleCopy} title="Copy link"
              style={{ padding:'12px 12px', borderRadius:8, cursor:'pointer', background:'var(--bg-el)',
                border:'1px solid var(--b1)', color:copied?'var(--success)':'var(--t3)', fontSize:15, fontWeight:700, transition:'all .15s ease',
              }}
              onMouseEnter={e=>{ if(!copied) { e.currentTarget.style.borderColor='var(--b2)'; e.currentTarget.style.color='var(--t1)'; } }}
              onMouseLeave={e=>{ if(!copied) { e.currentTarget.style.borderColor='var(--b1)'; e.currentTarget.style.color='var(--t3)'; } }}
            >{copied ? <Check size={16} strokeWidth={2.5} /> : <Copy size={16} strokeWidth={1.8} />}</button>
          </div>
        </div>

        {/* Live Solve Success Overlay */}
        {solver.isSolved && solver.problemId === problem.id && (
          <div className="anim-scale" style={{
            position:'absolute', top:0, left:0, right:0, bottom:0,
            background:'rgba(10, 15, 20, 0.85)', backdropFilter:'blur(6px)',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            zIndex: 10, padding: 30, textAlign: 'center'
          }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--success-bg)', border: '2px solid var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: '0 0 20px rgba(0, 255, 128, 0.3)' }}>
              <Check size={36} strokeWidth={3} color="var(--success)" />
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: 'var(--success)', letterSpacing: '-.03em', fontFamily: 'var(--mono)', textTransform: 'uppercase' }}>Problem Solved!</h2>
            <p style={{ fontSize: 14, color: 'var(--t2)', marginTop: 8, marginBottom: 24, lineHeight: 1.5 }}>
              You successfully submitted {problem.id} in <strong style={{ color: '#fff' }}>{formatted}</strong>. Let's keep the streak going.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => { solver.resetTracker(); setOpened(false); reset(); onPickAgain(); }}
                style={{ padding:'12px 20px', borderRadius:8, cursor:'pointer', border:'none', background:'var(--primary)', color:'#000', fontSize:14, fontWeight:800, transition:'all .15s ease', boxShadow:'0 4px 12px rgba(0, 217, 255, 0.2)' }}
                onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 16px rgba(0, 217, 255, 0.3)'; }}
                onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 4px 12px rgba(0, 217, 255, 0.2)'; }}
              >
                Pick Next Problem
              </button>
              <button type="button" onClick={() => solver.resetTracker()}
                style={{ padding:'12px 18px', borderRadius:8, cursor:'pointer', border:'1px solid var(--b2)', background:'var(--bg-el)', color:'var(--t2)', fontSize:13, fontWeight:700, transition:'all .15s ease' }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--b3)'; e.currentTarget.style.color='var(--t1)'; }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--b2)'; e.currentTarget.style.color='var(--t2)'; }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>

      {meta && (
        <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 4px 0', fontSize:11, color:'var(--t3)', fontFamily:'var(--mono)', fontWeight:600, letterSpacing:'.05em', textTransform:'uppercase' }}>
          <span style={{ color:'var(--primary)' }}>{meta.totalMatched?.toLocaleString()} problems matched</span>
          {meta.retriedWithoutHistory && <span style={{ color:'var(--yellow)' }}>history reset</span>}
        </div>
      )}
    </div>
  );
};
