import { useState } from 'react';
import { CheckCircle, AlertTriangle, ArrowUpRight, EyeOff, Eye, BarChart3 } from 'lucide-react';
import { ProfileStats } from './ProfileStats';

const Toggle = ({ on, onChange, label, sub, icon: Icon }) => (
  <button type="button" onClick={() => onChange(!on)} style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 13px', borderRadius: 9, cursor: 'pointer', width: '100%',
    background: on ? 'var(--primary-bg)' : 'var(--bg-el)',
    border: `1px solid ${on ? 'var(--primary)' : 'var(--b1)'}`,
    transition: 'all .15s', textAlign: 'left',
  }}
    onMouseEnter={e => { if (!on) e.currentTarget.style.borderColor = 'var(--b2)'; }}
    onMouseLeave={e => { if (!on) e.currentTarget.style.borderColor = 'var(--b1)'; }}
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      {Icon && <Icon size={16} strokeWidth={1.5} color={on ? 'var(--primary)' : 'var(--t3)'} style={{ marginTop: 1, flexShrink: 0 }} />}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: on ? 'var(--primary)' : 'var(--t1)', lineHeight: 1.2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
    <div style={{
      width: 34, height: 19, borderRadius: 99, position: 'relative', flexShrink: 0,
      background: on ? 'var(--primary)' : 'var(--bg-press)', border: `1px solid ${on ? 'var(--primary)' : 'var(--b2)'}`, transition: 'all .2s'
    }}>
      <div style={{
        position: 'absolute', top: 2, width: 13, height: 13, borderRadius: '50%',
        background: on ? '#000' : 'var(--t3)', left: on ? 18 : 3, transition: 'left .18s'
      }} />
    </div>
  </button>
);

export const HandlePanel = ({ hook, excludeSolved, onExcludeChange, showOnlySolved, onShowOnlyChange, variant = 'main' }) => {
  const { handle, solvedCount, status, errorMsg, stats, statsLoading, fetchSolved, clearHandle, refreshStats } = hook;
  const [inputVal, setInputVal] = useState(handle || '');
  const [showStats, setShowStats] = useState(false);

  const isLoading = status === 'loading';
  const isOk = status === 'ok';
  const isErr = status === 'error';

  const handleSubmit = async () => { if (inputVal.trim()) await fetchSolved(inputVal); };
  const handleKey = e => { if (e.key === 'Enter') handleSubmit(); };

  const onExclude = v => { if (showOnlySolved && v) return; onExcludeChange(v); };
  const onShowOnly = v => { onShowOnlyChange(v); if (v) onExcludeChange(false); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Explainer */}
      {!isOk && (
        <p style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.6 }}>
          Enter your CF handle to filter problems by your solve history and view profile stats.
        </p>
      )}

      {/* Input row */}
      <div>
        <div className="lbl" style={{ marginBottom: 6 }}>CODEFORCES HANDLE</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              className={`pp-input${isErr ? ' err' : ''}`}
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={handleKey}
              placeholder="e.g. tourist"
              disabled={isLoading || isOk}
              style={{ paddingRight: isOk ? 36 : 12 }}
            />
            {isOk && (
              <div style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <CheckCircle size={18} strokeWidth={2} color="var(--green)" />
              </div>
            )}
          </div>
          <button type="button"
            onClick={isOk ? clearHandle : handleSubmit}
            disabled={isLoading || (!inputVal.trim() && !isOk)}
            style={{
              padding: '9px 14px', borderRadius: 8, cursor: 'pointer', flexShrink: 0, border: 'none',
              background: isOk ? 'var(--error-bg)' : isLoading ? 'var(--bg-press)' : 'var(--primary)',
              color: isOk ? 'var(--error)' : isLoading ? 'var(--t2)' : '#000',
              fontSize: 12, fontWeight: 700, fontFamily: 'var(--mono)',
              opacity: (!inputVal.trim() && !isOk) ? .4 : 1,
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s',
            }}
            onMouseEnter={e => { if (!isLoading) e.currentTarget.style.filter = 'brightness(1.08)'; }}
            onMouseLeave={e => e.currentTarget.style.filter = ''}
          >
            {isLoading
              ? <span style={{ width: 12, height: 12, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'block', animation: 'spin .7s linear infinite' }} />
              : isOk ? 'Clear' : <><ArrowUpRight size={14} strokeWidth={2} />Fetch</>
            }
          </button>
        </div>

        {isErr && <p style={{ fontSize: 11, color: 'var(--red)', fontFamily: 'var(--mono)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={12} strokeWidth={2} /> {errorMsg}</p>}

        {/* Success bar */}
        {isOk && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginTop: 8,
            padding: '8px 12px', borderRadius: 8, background: 'var(--success-bg)', border: '1px solid var(--success)30'
          }}
            className="anim-in">
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--success)', fontFamily: 'var(--mono)', fontWeight: 600 }}>@{handle}</span>
            <span style={{ fontSize: 12, color: 'var(--t3)', fontFamily: 'var(--mono)' }}>·</span>
            <span style={{ fontSize: 12, color: 'var(--t2)', fontFamily: 'var(--mono)' }}>{solvedCount.toLocaleString()} solved</span>
            {variant === 'sidebar' && (
              <button type="button" onClick={() => { setShowStats(v => !v); }}
                style={{
                  marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--mono)', background: 'none', border: 'none',
                  cursor: 'pointer', color: showStats ? 'var(--primary)' : 'var(--t3)', transition: 'color .15s',
                  display: 'flex', alignItems: 'center', gap: 4
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
                onMouseLeave={e => e.currentTarget.style.color = showStats ? 'var(--primary)' : 'var(--t3)'}
              >
                <BarChart3 size={12} strokeWidth={1.8} />
                {showStats ? 'hide' : 'stats'}
              </button>
            )}
            {variant === 'main' && (
              <button type="button" onClick={() => { setShowStats(v => !v); }}
                style={{
                  marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700,
                  background: showStats ? 'var(--primary)' : 'var(--bg-el)',
                  color: showStats ? '#000' : 'var(--t2)',
                  border: `1px solid ${showStats ? 'var(--primary)' : 'var(--b2)'}`,
                  cursor: 'pointer', transition: 'all .15s',
                  display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
                  borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.04em'
                }}
                onMouseEnter={e=>{ if(!showStats) { e.currentTarget.style.borderColor='var(--primary)'; e.currentTarget.style.color='var(--primary)'; } }}
                onMouseLeave={e=>{ if(!showStats) { e.currentTarget.style.borderColor='var(--b2)'; e.currentTarget.style.color='var(--t2)'; } }}
                onMouseDown={e=>e.currentTarget.style.transform='scale(0.97)'}
                onMouseUp={e=>e.currentTarget.style.transform=''}
              >
                <BarChart3 size={14} strokeWidth={2} />
                {showStats ? 'Hide Stats' : 'View Stats'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Filter toggles */}
      {isOk && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }} className="anim-in">
          <Toggle on={excludeSolved} onChange={onExclude} label="Exclude my solved" sub="Skip problems you've already AC'd" icon={EyeOff} />
          <Toggle on={showOnlySolved} onChange={onShowOnly} label="Only my solved" sub="Revisit problems you already cracked" icon={Eye} />
        </div>
      )}

      {/* Profile stats panel */}
      {isOk && showStats && (
        <div className="anim-up">
          <ProfileStats stats={stats} loading={statsLoading} onRefresh={() => { refreshStats(); }} />
        </div>
      )}

      {!isOk && (
        <p style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--mono)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <ArrowUpRight size={11} strokeWidth={2} /> Fetch your handle to unlock filters & profile stats
        </p>
      )}
    </div>
  );
};
