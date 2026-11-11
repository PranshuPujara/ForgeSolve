import { useEffect, useState } from 'react';
import { Hammer, Check, Eye, AlertCircle, ArrowRight, ShieldAlert } from 'lucide-react';
import { ForgeScene } from '../forge/ForgeScene';
import './forge.css';
import { STAGES, GRADES, WEAPONS, weaponFor, fmtTime } from '../forge/geometry';

const ACCENT = { codeforces: 'var(--blue)', leetcode: 'var(--orange)', gfg: 'var(--green)' };

/** Shown above the problem card once a problem is picked: Tetsuji works while you solve. */
export function ForgeStagePanel({ problem, session, trophies = [], handleLabel = null, onNext }) {
  const { status, elapsed, progress, stage, result, watch, attempts = 0, markSolved } = session;
  const [shown, setShown] = useState(false);
  useEffect(() => { if (status !== 'accepted') setShown(false); }, [status]);
  const phase = status === 'idle' ? 'ready' : status === 'forging' ? 'forging' : 'accepted';
  const weapon = result?.weapon || weaponFor(problem);
  const accent = ACCENT[problem.platform] || 'var(--primary)';
  const g = result ? GRADES[result.grade] : null;

  const reveal = result && shown && (
    <div className="fg-reveal" style={{ '--g': g.color }}>
      <div className="fg-seal">{g.label}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(WEAPONS[weapon] || WEAPONS.katana).label} of {problem.name}</div>
        <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--t2)', marginTop: 3 }}>
          forged in {fmtTime(result.seconds)}{result.attempts ? ` · ${result.attempts} failed strike${result.attempts > 1 ? 's' : ''}` : ''}{result.manual ? ' · self-reported' : ''} · added to your armory
        </div>
      </div>
      {onNext && <button type="button" onClick={onNext} style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--primary)', color: '#000', fontSize: 12, fontWeight: 800, display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>Next <ArrowRight size={13} strokeWidth={2.5} /></button>}
    </div>
  );

  return (
    <div className="anim-up" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div className="fg-stages">
          {STAGES.map((s, i) => {
            const cls = status === 'accepted' || (status === 'forging' && i < stage) ? 'done' : status === 'forging' && i === stage ? 'on' : '';
            return <span key={s.id} className={`fg-stage-chip ${cls}`}>{cls === 'done' && <Check size={9} strokeWidth={3} style={{ marginRight: 4 }} />}{s.label}</span>;
          })}
          <span className={`fg-stage-chip ${status === 'accepted' ? 'on' : ''}`} style={status === 'accepted' ? { color: 'var(--primary)', borderColor: 'var(--primary)', background: 'var(--primary-bg)' } : null}>Quench</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {attempts > 0 && status === 'forging' && (
            <span title="Judged-but-not-accepted submissions this session" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--red)' }}>
              <ShieldAlert size={12} strokeWidth={2.2} />{attempts} failed
            </span>
          )}
          <div style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 800, color: status === 'forging' ? 'var(--orange)' : 'var(--t3)', letterSpacing: '-.02em' }}>
            {status === 'idle' ? '0:00' : fmtTime(elapsed)}
          </div>
        </div>
      </div>

      <ForgeScene phase={phase} progress={progress} weapon={weapon} name={problem.name} stage={stage} result={result}
        trophies={trophies} flinch={attempts} accent={g ? g.color : accent} onReveal={() => setShown(true)} />
      {reveal}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', minHeight: 34 }}>
        <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: watch.state === 'error' ? 'var(--red)' : 'var(--t3)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {status === 'idle' && <><Hammer size={12} strokeWidth={2} /> Press “Solve this” — Tetsuji starts hammering</>}
          {status === 'forging' && watch.state === 'watching' && <><Eye size={12} strokeWidth={2} color="var(--green)" /> Watching {handleLabel || 'your handle'} for an accepted submission…</>}
          {status === 'forging' && watch.state === 'off' && <><AlertCircle size={12} strokeWidth={2} /> {watch.msg || 'Auto-detect off'} — or mark it yourself</>}
          {status === 'forging' && watch.state === 'error' && <><AlertCircle size={12} strokeWidth={2} /> Can’t verify right now ({watch.msg}). Retrying…</>}
        </span>
        {status === 'forging' && (
          <button type="button" onClick={markSolved} className="fg-sec" style={{ minHeight: 34, padding: '0 12px', fontSize: 12 }}>
            <Check size={13} strokeWidth={2.4} /> I solved it
          </button>
        )}
      </div>
    </div>
  );
}
