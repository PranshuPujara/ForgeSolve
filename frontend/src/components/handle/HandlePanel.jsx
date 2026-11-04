import { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, ArrowUpRight, EyeOff, Eye, BarChart3, Info } from 'lucide-react';
import { ProfileStats } from './ProfileStats';

const Toggle = ({ on, onChange, label, sub, icon: Icon, disabled = false, disabledHint, accent = 'var(--primary)', accentBg = 'var(--primary-bg)' }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <button
      type="button"
      onClick={() => { if (!disabled) onChange(!on); }}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 13px', borderRadius: 9, cursor: disabled ? 'not-allowed' : 'pointer', width: '100%',
        background: on && !disabled ? accentBg : 'var(--bg-el)',
        border: `1px solid ${on && !disabled ? accent : 'var(--b1)'}`,
        opacity: disabled ? 0.55 : 1,
        transition: 'all .15s', textAlign: 'left',
      }}
      onMouseEnter={e => { if (!on && !disabled) e.currentTarget.style.borderColor = 'var(--b2)'; }}
      onMouseLeave={e => { if (!on && !disabled) e.currentTarget.style.borderColor = 'var(--b1)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {Icon && <Icon size={16} strokeWidth={1.5} color={on && !disabled ? accent : 'var(--t3)'} style={{ marginTop: 1, flexShrink: 0 }} />}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: on && !disabled ? accent : 'var(--t1)', lineHeight: 1.2 }}>{label}</div>
          {sub && <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{sub}</div>}
        </div>
      </div>
      <div style={{
        width: 34, height: 19, borderRadius: 99, position: 'relative', flexShrink: 0,
        background: on && !disabled ? accent : 'var(--bg-press)',
        border: `1px solid ${on && !disabled ? accent : 'var(--b2)'}`,
        transition: 'all .2s'
      }}>
        <div style={{
          position: 'absolute', top: 2, width: 13, height: 13, borderRadius: '50%',
          background: on && !disabled ? '#000' : 'var(--t3)', left: on && !disabled ? 18 : 3, transition: 'left .18s'
        }} />
      </div>
    </button>
    {disabled && disabledHint && (
      <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--mono)', paddingLeft: 6 }}>
        {disabledHint}
      </div>
    )}
  </div>
);

export const HandlePanel = ({
  hook,
  activePlatform = 'codeforces',
  excludeSolved = false,
  onExcludeChange = () => {},
  showOnlySolved = false,
  onShowOnlyChange = () => {},
  lcExcludeSolved = false,
  onLcExcludeChange = () => {},
  lcShowOnlySolved = false,
  onLcShowOnlyChange = () => {},
}) => {
  const {
    // Codeforces
    handle, solvedCount, status, errorMsg, stats, statsLoading, fetchSolved, clearHandle, refreshStats,
    // LeetCode
    lcHandle, lcSolvedCount, lcStatus, lcError, lcStats, lcStatsLoading, fetchLcSolved, clearLcHandle, refreshLcStats,
  } = hook;

  // Local inputs
  const [cfInput, setCfInput] = useState(handle || '');
  const [lcInput, setLcInput] = useState(lcHandle || '');
  const [showCfStats, setShowCfStats] = useState(false);
  const [showLcStats, setShowLcStats] = useState(false);

  useEffect(() => { setCfInput(handle || ''); }, [handle]);
  useEffect(() => { setLcInput(lcHandle || ''); }, [lcHandle]);

  // CF state flags
  const isCfLoading = status === 'loading';
  const isCfOk = status === 'ok';
  const isCfErr = status === 'error';

  // LC state flags
  const isLcLoading = lcStatus === 'loading';
  const isLcOk = lcStatus === 'ok';
  const isLcErr = lcStatus === 'error';

  // Handlers for CF
  const handleCfSubmit = async () => { if (cfInput.trim()) await fetchSolved(cfInput.trim()); };
  const handleCfKey = e => { if (e.key === 'Enter') handleCfSubmit(); };
  const onCfExclude = v => { if (showOnlySolved && v) return; onExcludeChange(v); };
  const onCfShowOnly = v => { onShowOnlyChange(v); if (v) onExcludeChange(false); };

  // Handlers for LC
  const handleLcSubmit = async () => { if (lcInput.trim()) await fetchLcSolved(lcInput.trim()); };
  const handleLcKey = e => { if (e.key === 'Enter') handleLcSubmit(); };
  const onLcExclude = v => { if (lcShowOnlySolved && v) return; onLcExcludeChange(v); };
  const onLcShowOnly = v => { onLcShowOnlyChange(v); if (v) onLcExcludeChange(false); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ═══════════════════════════════════════════════════
          BLOCK 1: CODEFORCES
         ═══════════════════════════════════════════════════ */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 12,
        padding: '16px', borderRadius: 12, background: 'var(--bg-card)',
        border: `1.5px solid ${activePlatform === 'codeforces' ? 'var(--primary)' : 'var(--b1)'}`,
        transition: 'border-color .2s'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span className="lbl" style={{ color: activePlatform === 'codeforces' ? 'var(--primary)' : 'var(--t2)' }}>
              CODEFORCES HANDLE
            </span>
            {activePlatform === 'codeforces' && (
              <span style={{ fontSize: 10, fontFamily: 'var(--mono)', padding: '2px 6px', borderRadius: 4, background: 'var(--primary-bg)', color: 'var(--primary)', fontWeight: 700 }}>
                ACTIVE PLATFORM
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                className={`pp-input${isCfErr ? ' err' : ''}`}
                value={cfInput}
                onChange={e => setCfInput(e.target.value)}
                onKeyDown={handleCfKey}
                placeholder="e.g. tourist"
                disabled={isCfLoading || isCfOk}
                style={{ paddingRight: isCfOk ? 36 : 12 }}
              />
              {isCfOk && (
                <div style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <CheckCircle size={18} strokeWidth={2} color="var(--green)" />
                </div>
              )}
            </div>

            <button type="button"
              onClick={isCfOk ? clearHandle : handleCfSubmit}
              disabled={isCfLoading || (!cfInput.trim() && !isCfOk)}
              style={{
                padding: '9px 14px', borderRadius: 8, cursor: 'pointer', flexShrink: 0, border: 'none',
                background: isCfOk ? 'var(--error-bg)' : isCfLoading ? 'var(--bg-press)' : 'var(--primary)',
                color: isCfOk ? 'var(--error)' : isCfLoading ? 'var(--t2)' : '#000',
                fontSize: 12, fontWeight: 700, fontFamily: 'var(--mono)',
                opacity: (!cfInput.trim() && !isCfOk) ? .4 : 1,
                display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s',
              }}
            >
              {isCfLoading
                ? <span style={{ width: 12, height: 12, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'block', animation: 'spin .7s linear infinite' }} />
                : isCfOk ? 'Clear' : <><ArrowUpRight size={14} strokeWidth={2} />Connect</>
              }
            </button>
          </div>

          {isCfErr && (
            <p style={{ fontSize: 11, color: 'var(--red)', fontFamily: 'var(--mono)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertTriangle size={12} strokeWidth={2} /> {errorMsg}
            </p>
          )}

          {/* CF Success bar */}
          {isCfOk && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginTop: 10,
              padding: '8px 12px', borderRadius: 8, background: 'var(--success-bg)', border: '1px solid var(--success)30'
            }} className="anim-in">
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--success)', fontFamily: 'var(--mono)', fontWeight: 600 }}>@{handle}</span>
              <span style={{ fontSize: 12, color: 'var(--t3)', fontFamily: 'var(--mono)' }}>·</span>
              <span style={{ fontSize: 12, color: 'var(--t2)', fontFamily: 'var(--mono)' }}>{(solvedCount || 0).toLocaleString()} solved</span>
              <button type="button" onClick={() => setShowCfStats(v => !v)}
                style={{
                  marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700,
                  background: showCfStats ? 'var(--primary)' : 'var(--bg-el)',
                  color: showCfStats ? '#000' : 'var(--t2)',
                  border: `1px solid ${showCfStats ? 'var(--primary)' : 'var(--b2)'}`,
                  cursor: 'pointer', transition: 'all .15s',
                  display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                  borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.04em'
                }}
              >
                <BarChart3 size={13} strokeWidth={2} />
                {showCfStats ? 'Hide' : 'Stats'}
              </button>
            </div>
          )}
        </div>

        {/* CF Toggles */}
        {isCfOk && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} className="anim-in">
            <Toggle
              on={excludeSolved}
              onChange={onCfExclude}
              disabled={activePlatform !== 'codeforces'}
              disabledHint="Switch to Codeforces to use this filter"
              label="Exclude my solved"
              sub="Skip problems you've already AC'd"
              icon={EyeOff}
              accent="var(--primary)"
              accentBg="var(--primary-bg)"
            />
            <Toggle
              on={showOnlySolved}
              onChange={onCfShowOnly}
              disabled={activePlatform !== 'codeforces'}
              disabledHint="Switch to Codeforces to use this filter"
              label="Only my solved"
              sub="Revisit problems you already cracked"
              icon={Eye}
              accent="var(--primary)"
              accentBg="var(--primary-bg)"
            />
          </div>
        )}

        {/* CF Profile Stats Panel */}
        {isCfOk && showCfStats && (
          <div className="anim-up">
            <ProfileStats stats={stats} loading={statsLoading} onRefresh={refreshStats} platform="codeforces" />
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════
          BLOCK 2: LEETCODE
         ═══════════════════════════════════════════════════ */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 12,
        padding: '16px', borderRadius: 12, background: 'var(--bg-card)',
        border: `1.5px solid ${activePlatform === 'leetcode' ? 'var(--orange)' : 'var(--b1)'}`,
        transition: 'border-color .2s'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span className="lbl" style={{ color: activePlatform === 'leetcode' ? 'var(--orange)' : 'var(--t2)' }}>
              LEETCODE HANDLE
            </span>
            {activePlatform === 'leetcode' && (
              <span style={{ fontSize: 10, fontFamily: 'var(--mono)', padding: '2px 6px', borderRadius: 4, background: 'var(--bg-el)', color: 'var(--orange)', border: '1px solid var(--orange)40', fontWeight: 700 }}>
                ACTIVE PLATFORM
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                className={`pp-input${isLcErr ? ' err' : ''}`}
                value={lcInput}
                onChange={e => setLcInput(e.target.value)}
                onKeyDown={handleLcKey}
                placeholder="e.g. neal_wu"
                disabled={isLcLoading || isLcOk}
                style={{ paddingRight: isLcOk ? 36 : 12 }}
              />
              {isLcOk && (
                <div style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <CheckCircle size={18} strokeWidth={2} color="var(--orange)" />
                </div>
              )}
            </div>

            <button type="button"
              onClick={isLcOk ? clearLcHandle : handleLcSubmit}
              disabled={isLcLoading || (!lcInput.trim() && !isLcOk)}
              style={{
                padding: '9px 14px', borderRadius: 8, cursor: 'pointer', flexShrink: 0, border: 'none',
                background: isLcOk ? 'var(--error-bg)' : isLcLoading ? 'var(--bg-press)' : 'var(--orange)',
                color: isLcOk ? 'var(--error)' : isLcLoading ? 'var(--t2)' : '#000',
                fontSize: 12, fontWeight: 700, fontFamily: 'var(--mono)',
                opacity: (!lcInput.trim() && !isLcOk) ? .4 : 1,
                display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s',
              }}
            >
              {isLcLoading
                ? <span style={{ width: 12, height: 12, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'block', animation: 'spin .7s linear infinite' }} />
                : isLcOk ? 'Clear' : <><ArrowUpRight size={14} strokeWidth={2} />Connect</>
              }
            </button>
          </div>

          {isLcErr && (
            <p style={{ fontSize: 11, color: 'var(--red)', fontFamily: 'var(--mono)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertTriangle size={12} strokeWidth={2} /> {lcError}
            </p>
          )}

          {/* LC Note */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--mono)' }}>
            <Info size={12} strokeWidth={1.8} />
            <span>Based on your recent accepted submissions</span>
          </div>

          {/* LC Success bar */}
          {isLcOk && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginTop: 10,
              padding: '8px 12px', borderRadius: 8, background: 'var(--bg-el)', border: '1px solid var(--orange)40'
            }} className="anim-in">
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--orange)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--orange)', fontFamily: 'var(--mono)', fontWeight: 600 }}>@{lcHandle}</span>
              <span style={{ fontSize: 12, color: 'var(--t3)', fontFamily: 'var(--mono)' }}>·</span>
              <span style={{ fontSize: 12, color: 'var(--t2)', fontFamily: 'var(--mono)' }}>{(lcSolvedCount || 0).toLocaleString()} solved</span>
              <button type="button" onClick={() => setShowLcStats(v => !v)}
                style={{
                  marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700,
                  background: showLcStats ? 'var(--orange)' : 'var(--bg-card)',
                  color: showLcStats ? '#000' : 'var(--orange)',
                  border: `1px solid ${showLcStats ? 'var(--orange)' : 'var(--orange)60'}`,
                  cursor: 'pointer', transition: 'all .15s',
                  display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                  borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.04em'
                }}
              >
                <BarChart3 size={13} strokeWidth={2} />
                {showLcStats ? 'Hide' : 'Stats'}
              </button>
            </div>
          )}
        </div>

        {/* LC Toggles */}
        {isLcOk && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} className="anim-in">
            <Toggle
              on={lcExcludeSolved}
              onChange={onLcExclude}
              disabled={activePlatform !== 'leetcode'}
              disabledHint="Switch to LeetCode to use this filter"
              label="Exclude my solved"
              sub="Skip recent problems you've already AC'd"
              icon={EyeOff}
              accent="var(--orange)"
              accentBg="var(--bg-el)"
            />
            <Toggle
              on={lcShowOnlySolved}
              onChange={onLcShowOnly}
              disabled={activePlatform !== 'leetcode'}
              disabledHint="Switch to LeetCode to use this filter"
              label="Only my solved"
              sub="Revisit recent problems you solved"
              icon={Eye}
              accent="var(--orange)"
              accentBg="var(--bg-el)"
            />
          </div>
        )}

        {/* LC Profile Stats Panel */}
        {isLcOk && showLcStats && (
          <div className="anim-up">
            <ProfileStats stats={lcStats} loading={lcStatsLoading} onRefresh={refreshLcStats} platform="leetcode" />
          </div>
        )}
      </div>

    </div>
  );
};
