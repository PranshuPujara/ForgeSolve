import { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import { Zap, Menu, X, Compass, User, History, CalendarDays, AlertCircle, ChevronDown } from 'lucide-react';
import { storage, getLastRating } from './utils/localStorage';
import { useProblemPicker } from './hooks/useProblemPicker';
import { useUserHandle } from './hooks/useUserHandle';

import { PlatformSelector } from './components/filters/PlatformSelector';
import { DifficultySelector } from './components/filters/DifficultySelector';
import { TagSelector } from './components/filters/TagSelector';
import { FilterModeSelector } from './components/filters/FilterModeSelector';
import { FriendsPanel } from './components/friends/FriendsPanel';
import { HandlePanel } from './components/handle/HandlePanel';
import { ProblemCard } from './components/problem/ProblemCard';
import { HistoryPanel } from './components/history/HistoryPanel';

import { StreakBadge } from './components/ui/StreakBadge';
import { SmartModeToggle } from './components/ui/SmartModeToggle';
import { EmptyState } from './components/ui/EmptyState';
import { ErrorMessage } from './components/ui/ErrorMessage';

/* ── Saved defaults ─────────────────────────────── */
const saved = storage.get('filters', {});
const D = {
  platform: saved.platform || 'codeforces',
  tags: saved.tags || [],
  minRating: saved.minRating || 1000,
  maxRating: saved.maxRating || 1600,
  difficulty: saved.difficulty || null,
  filterMode: saved.filterMode || 'none',
  smartMode: saved.smartMode || false,
};

const useReady = (platform, minRating, maxRating, difficulty) => {
  const hasPlatform = !!platform;
  const hasDifficulty = platform === 'codeforces'
    ? (!!minRating && !!maxRating && maxRating >= minRating)
    : !!difficulty;
  return { ready: hasPlatform && hasDifficulty, hasPlatform, hasDifficulty };
};

/* ── Logo — clean geometric mark ───────────────── */
const Logo = ({ size = 28 }) => (
  <img
    src="/SolveForge_logo.png"
    alt="SolveForge logo"
    width={size}
    height={size}
    style={{ borderRadius: Math.max(8, Math.floor(size * 0.22)), objectFit: 'cover' }}
  />
);

/* ── Collapsible sidebar section ─────────────────── */
const Section = memo(({ title, children, badge, icon: Icon, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid var(--b0)', transition: 'all 0.2s ease' }}>
      <button type="button" onClick={() => setOpen(v => !v)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 0 11px', cursor: 'pointer', background: 'none', border: 'none',
        transition: 'all 0.15s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {Icon && <Icon size={13} strokeWidth={1.8} color="var(--t3)" />}
          <span className="lbl">{title}</span>
          {badge != null && (
            <span style={{
              fontSize: 10, fontFamily: 'var(--mono)', padding: '2px 8px', borderRadius: 6,
              background: 'var(--primary-bg)', color: 'var(--primary)',
              border: '1px solid var(--primary)', fontWeight: 700
            }}>
              {badge}
            </span>
          )}
        </div>
        <ChevronDown size={12} strokeWidth={2} color="var(--t3)" style={{
          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: open ? 'rotate(180deg)' : 'rotate(0)',
        }} />
      </button>
      {open && <div style={{ paddingBottom: 15, animation: 'slideDown 0.25s ease both' }}>{children}</div>}
    </div>
  );
});

/* ── Loading skeleton ────────────────────────────── */
const Skeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingTop: 8, animation: 'fadeUp 0.35s ease both' }}>
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--b1)', borderTopColor: 'var(--primary)', animation: 'spin 0.8s linear infinite' }} />
    </div>
    <div style={{ borderRadius: 14, overflow: 'hidden', background: 'var(--bg-card)', border: '1.5px solid var(--b1)' }}>
      <div className="skel" style={{ height: 3, borderRadius: 0, background: 'var(--primary-bg)' }} />
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 15 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="skel" style={{ height: 20, width: 92 }} />
          <div className="skel" style={{ height: 20, width: 68 }} />
        </div>
        <div className="skel" style={{ height: 28, width: '75%', borderRadius: 7 }} />
        <div className="skel" style={{ height: 14, width: '48%', borderRadius: 5 }} />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[68, 88, 58, 82, 64].map(w => <div key={w} className="skel" style={{ height: 20, width: w, borderRadius: 6 }} />)}
        </div>
        <div className="skel" style={{ height: 48, width: '100%', borderRadius: 10, marginTop: 6 }} />
      </div>
    </div>
  </div>
);

/* ═════════════════════════════════════════════════
   APP
   ═════════════════════════════════════════════════ */
export default function App() {
  const [platform, setPlatform] = useState(D.platform);
  const [tags, setTags] = useState(D.tags);
  const [minRating, setMinRating] = useState(D.minRating);
  const [maxRating, setMaxRating] = useState(D.maxRating);
  const [difficulty, setDifficulty] = useState(D.difficulty);
  const [filterMode, setFilterMode] = useState(D.filterMode);
  const [smartMode, setSmartMode] = useState(D.smartMode);
  const [friends, setFriends] = useState(() => storage.get('friends', []));
  const [histKey, setHistKey] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activePanel, setActivePanel] = useState('discover'); // 'discover' | 'profile' | 'history'
  const mainRef = useRef(null);

  const [excludeSolved, setExcludeSolved] = useState(() => storage.get('excludeSolved', false));
  const [showOnlySolved, setShowOnlySolved] = useState(() => storage.get('showOnlySolved', false));
  const userHandle = useUserHandle();

  const { problem, loading, error, meta, noFriendMatch, pick, fetchDaily, clear } = useProblemPicker();
  const { ready, hasPlatform, hasDifficulty } = useReady(platform, minRating, maxRating, difficulty);

  useEffect(() => {
    storage.set('filters', { platform, tags, minRating, maxRating, difficulty, filterMode, smartMode });
  }, [platform, tags, minRating, maxRating, difficulty, filterMode, smartMode]);
  useEffect(() => { storage.set('excludeSolved', excludeSolved); }, [excludeSolved]);
  useEffect(() => { storage.set('showOnlySolved', showOnlySolved); }, [showOnlySolved]);

  const changePlatform = useCallback(p => {
    setPlatform(p); setTags([]); setDifficulty(null); setFilterMode('none'); clear();
  }, [clear]);

  const changeDifficulty = useCallback(vals => {
    if (vals.minRating !== undefined) { setMinRating(vals.minRating); setMaxRating(vals.maxRating); }
    if ('difficulty' in vals) setDifficulty(vals.difficulty);
  }, []);

  const buildPayload = useCallback(() => ({
    platform, tags,
    ...(platform === 'codeforces' ? { minRating, maxRating } : { difficulty }),
    filterMode,
    friendHandles: platform === 'codeforces' ? friends : [],
    smartMode: smartMode && platform === 'codeforces',
    lastRating: getLastRating(),
    ...(platform === 'codeforces' && userHandle.status === 'ok' && userHandle.solvedIds.size > 0
      ? {
        ...(excludeSolved ? { excludeUserSolved: Array.from(userHandle.solvedIds) } : {}),
        ...(showOnlySolved ? { showOnlyUserSolved: Array.from(userHandle.solvedIds) } : {}),
      }
      : {}),
  }), [platform, tags, minRating, maxRating, difficulty, filterMode, friends, smartMode, userHandle, excludeSolved, showOnlySolved]);

  const handlePick = useCallback(() => { if (ready) pick(buildPayload()); }, [ready, pick, buildPayload]);
  const handleDaily = useCallback(() => { if (ready) fetchDaily(buildPayload()); }, [ready, fetchDaily, buildPayload]);
  const handleSuggestAnyway = useCallback(() => {
    if (ready) pick({ ...buildPayload(), ignoreFilterMode: true });
  }, [ready, pick, buildPayload]);

  useEffect(() => {
    const fn = e => {
      if (e.key === 'Enter' && !e.target.matches('input,textarea') && ready && !loading)
        handlePick();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [handlePick, ready, loading]);

  // Scroll main back to top when panel switches — stable reference via useCallback
  const switchPanel = useCallback((p) => {
    setActivePanel(p);
    if (mainRef.current) mainRef.current.scrollTop = 0;
    setMobileOpen(false);
  }, []);

  const hasFriends = friends.length > 0 && platform === 'codeforces';
  const diffBadge = platform === 'codeforces'
    ? (minRating === maxRating ? `=${minRating}` : `${minRating}–${maxRating}`)
    : difficulty || undefined;
  const hintText = !hasPlatform
    ? 'Select a platform to begin'
    : !hasDifficulty
      ? (platform === 'codeforces' ? 'Set a valid rating range' : 'Pick a difficulty')
      : null;

  /* ── Sidebar filter content — rendered as JSX, not as a component type ── */
  const filterContentJSX = (
    <div style={{ padding: '0 18px 24px' }}>
      <Section title="Platform">
        <PlatformSelector value={platform} onChange={changePlatform} />
      </Section>
      <Section title="Difficulty" badge={diffBadge}>
        <DifficultySelector
          platform={platform} minRating={minRating} maxRating={maxRating}
          difficulty={difficulty} onChange={changeDifficulty}
        />
        {!hasDifficulty && hasPlatform && (
          <p style={{ marginTop: 8, fontSize: 11, color: 'var(--orange)', fontFamily: 'var(--mono)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <AlertCircle size={13} strokeWidth={2} />
            {platform === 'codeforces' ? 'Valid range required (max ≥ min, min ≥ 800)' : 'Pick a level to continue'}
          </p>
        )}
      </Section>
      <Section title="Tags" badge={tags.length || undefined}>
        <TagSelector platform={platform} selectedTags={tags} onChange={setTags} />
      </Section>
      {platform === 'codeforces' && (
        <Section title="Filter Mode">
          <FilterModeSelector value={filterMode} onChange={setFilterMode} disabled={!hasFriends} />
        </Section>
      )}
      {platform === 'codeforces' && (
        <Section title="Smart Mode">
          <SmartModeToggle enabled={smartMode} onChange={setSmartMode} />
        </Section>
      )}
      {platform === 'codeforces' && (
        <Section title="Friends" badge={friends.length || undefined}>
          <FriendsPanel handles={friends} onChange={setFriends} />
        </Section>
      )}
    </div>
  );

  /* ── Sidebar — rendered as stable JSX inline, never as a dynamic component type ── */
  const sidebarJSX = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }} className="sidebar-anim">

      {/* Brand */}
      <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid var(--b0)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Logo size={36} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-.04em', color: 'var(--primary)', lineHeight: 1 }}>
              ForgeSolve
            </div>
            <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 4, fontFamily: 'var(--mono)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              elite problems
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px 10px 6px', flexShrink: 0, borderBottom: '1px solid var(--b0)' }}>
        <div className="nav-divider">Navigate</div>
        {[
          { id: 'discover', label: 'Discover', Icon: Compass },
          {
            id: 'profile', label: 'My Profile', Icon: User,
            badge: userHandle.status === 'ok' ? `@${userHandle.handle} • ${userHandle.solvedCount} AC` : null
          },
          {
            id: 'history', label: 'History', Icon: History,
            badge: (() => { const h = storage.get('history', []); return h.length > 0 ? h.length : null; })()
          },
        ].map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => switchPanel(item.id)}
            className={`nav-item ${activePanel === item.id ? 'active' : ''}`}
          >
            <item.Icon size={16} strokeWidth={1.8} />
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.badge && (
              <span style={{
                fontSize: 11, fontFamily: 'var(--mono)', padding: '4px 10px', borderRadius: 8,
                background: activePanel === item.id ? 'var(--primary)' : 'var(--bg-el)',
                color: activePanel === item.id ? '#000' : 'var(--t2)',
                border: `1px solid ${activePanel === item.id ? 'var(--primary)' : 'var(--b2)'}`,
                transition: 'all .15s',
                fontWeight: 800, letterSpacing: '0.02em',
                boxShadow: activePanel === item.id ? '0 2px 8px rgba(0, 217, 255, 0.25)' : 'none'
              }}>
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Scrollable section content — use visibility toggling so components stay mounted */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ display: activePanel === 'discover' ? 'block' : 'none' }}>
          {filterContentJSX}
        </div>

        <div style={{ display: activePanel === 'profile' ? 'block' : 'none', padding: '0 18px 24px' }}>
          <div style={{ paddingTop: 4, paddingBottom: 14 }}>
            <HandlePanel
              hook={userHandle}
              excludeSolved={excludeSolved} onExcludeChange={setExcludeSolved}
              showOnlySolved={showOnlySolved} onShowOnlyChange={setShowOnlySolved}
              variant="sidebar"
            />
          </div>
        </div>

        <div style={{ display: activePanel === 'history' ? 'block' : 'none', padding: '0 18px 24px' }}>
          <div style={{ paddingTop: 4 }}>
            <HistoryPanel onClear={() => setHistKey(k => k + 1)} />
          </div>
        </div>
      </div>
    </div>
  );

  /* ── Render ──────────────────────────────────── */
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', width: '100%',
      background: 'var(--bg)', fontFamily: 'var(--font)',
      overflow: 'hidden',
    }}>

      {/* TOP BAR */}
      <header style={{
        flexShrink: 0, height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 22px',
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--b1)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <Logo size={26} />
          <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: '-.04em', color: 'var(--primary)' }}>ForgeSolve</span>
          <span style={{
            fontSize: 10, fontFamily: 'var(--mono)', padding: '2px 7px', borderRadius: 5,
            background: 'var(--primary-bg)', color: 'var(--primary)', border: '1px solid var(--primary)', fontWeight: 700
          }}>beta</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Active handle pill in topbar */}
          {userHandle.status === 'ok' && (
            <button type="button"
              onClick={() => { if (typeof switchPanel === 'function') switchPanel('profile'); else setActivePanel('profile'); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '7px 16px',
                borderRadius: 12, fontSize: 13, fontFamily: 'var(--mono)', cursor: 'pointer',
                background: activePanel === 'profile' ? 'var(--primary-bg)' : 'var(--bg-el)',
                border: `1px solid ${activePanel === 'profile' ? 'var(--primary)' : 'var(--b1)'}`,
                color: activePanel === 'profile' ? 'var(--primary)' : 'var(--t1)',
                transition: 'all .2s cubic-bezier(0.16, 1, 0.3, 1)',
                fontWeight: 800,
                boxShadow: activePanel === 'profile' ? '0 4px 12px rgba(0, 217, 255, 0.15)' : '0 2px 5px rgba(0,0,0,0.2)'
              }}
              onMouseEnter={e => { if (activePanel !== 'profile') { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 217, 255, 0.15)'; } }}
              onMouseLeave={e => { if (activePanel !== 'profile') { e.currentTarget.style.borderColor = 'var(--b1)'; e.currentTarget.style.color = 'var(--t1)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)'; } }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)'; }}
              onMouseUp={e => { e.currentTarget.style.transform = activePanel !== 'profile' ? 'translateY(-1px)' : ''; }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', flexShrink: 0, boxShadow: '0 0 8px var(--success)' }} />
              <span>@{userHandle.handle}</span>
              <span style={{ color: 'var(--b2)', margin: '0 -2px' }}>|</span>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 800, color: activePanel === 'profile' ? 'var(--primary)' : 'var(--t2)' }} title="Problems Solved">
                {userHandle.solvedCount.toLocaleString()} AC
              </span>
            </button>
          )}
          <StreakBadge />
          {/* Mobile toggle */}
          <button type="button" id="mob-toggle" onClick={() => setMobileOpen(v => !v)}
            style={{
              display: 'none', padding: '6px 13px', borderRadius: 8, cursor: 'pointer',
              background: mobileOpen ? 'var(--primary-bg)' : 'var(--bg-el)',
              border: `1px solid ${mobileOpen ? 'var(--primary)' : 'var(--b1)'}`,
              color: mobileOpen ? 'var(--primary)' : 'var(--t2)',
              fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 700,
              transition: 'all .15s',
            }}
          >{mobileOpen ? <><X size={16} strokeWidth={2} /> close</> : <><Menu size={16} strokeWidth={2} /> menu</>}</button>
        </div>
      </header>

      {/* BODY */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>

        {/* Sidebar */}
        <aside id="sidebar" style={{
          width: 380, flexShrink: 0,
          borderRight: '1px solid var(--b0)',
          background: 'var(--bg)',
          height: '100%', overflowY: 'auto',
          transition: 'transform .3s cubic-bezier(.16,1,.3,1)',
        }}>
          {sidebarJSX}
        </aside>

        {/* Main content */}
        <main ref={mainRef} style={{ flex: 1, height: '100%', overflowY: 'auto', overflowX: 'hidden', background: 'var(--bg)' }}>
          <div style={{
            maxWidth: 680, width: '100%', margin: '0 auto',
            padding: '32px 28px 56px',
            display: 'flex', flexDirection: 'column', gap: 20, minHeight: '100%',
          }}>

            {/* ── DISCOVER panel ── */}
            {activePanel === 'discover' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="panel-in">

                {/* Filter summary */}
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
                  padding: '10px 15px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--b1)',
                  fontSize: 12, fontFamily: 'var(--mono)'
                }}>
                  <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{platform}</span>
                  <span style={{ color: 'var(--b2)' }}>·</span>
                  {platform === 'codeforces'
                    ? <span style={{ color: 'var(--t2)', fontWeight: 600 }}>{minRating === maxRating ? `exact ${minRating}` : `${minRating}–${maxRating}`}</span>
                    : difficulty
                      ? <span style={{ color: 'var(--t2)', textTransform: 'capitalize', fontWeight: 600 }}>{difficulty}</span>
                      : <span style={{ color: 'var(--t3)' }}>—</span>
                  }
                  {tags.length > 0 && <><span style={{ color: 'var(--b2)' }}>·</span><span style={{ color: 'var(--t2)', fontWeight: 600 }}>{tags.slice(0, 2).join(', ')}{tags.length > 2 ? ` +${tags.length - 2}` : ''}</span></>}
                  {filterMode !== 'none' && <><span style={{ color: 'var(--b2)' }}>·</span><span style={{ color: 'var(--primary)', fontWeight: 700 }}>{filterMode}</span></>}
                  {excludeSolved && userHandle.status === 'ok' && <><span style={{ color: 'var(--b2)' }}>·</span><span style={{ color: 'var(--success)', fontWeight: 700 }}>−solved</span></>}
                  {showOnlySolved && userHandle.status === 'ok' && <><span style={{ color: 'var(--b2)' }}>·</span><span style={{ color: 'var(--success)', fontWeight: 700 }}>only solved</span></>}
                  {smartMode && <><span style={{ color: 'var(--b2)' }}>·</span><span style={{ color: 'var(--primary)', fontWeight: 700 }}>smart</span></>}
                </div>

                {/* CTA */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  <div style={{ display: 'flex', gap: 9 }}>
                    <button type="button" onClick={handlePick} disabled={!ready || loading}
                      style={{
                        flex: 1, padding: '12px 0', borderRadius: 8, cursor: 'pointer', border: 'none',
                        background: ready ? 'var(--primary)' : 'var(--bg-el)',
                        color: ready ? '#000' : 'var(--t3)', fontSize: 15, fontWeight: 900, letterSpacing: '-.02em',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        opacity: (!ready || loading) ? .55 : 1, transition: 'all .15s ease',
                        boxShadow: ready && !loading ? '0 4px 12px rgba(0, 217, 255, 0.2)' : 'none',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                      onMouseEnter={e => { if (ready && !loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 217, 255, 0.25)'; } }}
                      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ready && !loading ? '0 4px 12px rgba(0, 217, 255, 0.2)' : 'none'; }}
                      onMouseDown={e => e.currentTarget.style.transform = 'scale(.97)'}
                      onMouseUp={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                    >
                      {loading
                        ? <><span style={{ width: 18, height: 18, border: '3px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />Searching…</>
                        : <><Zap size={18} strokeWidth={2.5} />Get Problem</>
                      }
                    </button>
                    <button type="button" onClick={handleDaily} disabled={!ready || loading}
                      style={{
                        padding: '12px 18px', borderRadius: 8, cursor: 'pointer', flexShrink: 0,
                        background: 'var(--bg-el)',
                        border: '1px solid var(--b1)',
                        color: 'var(--t2)', fontSize: 13, fontWeight: 600,
                        opacity: (!ready || loading) ? .5 : 1, transition: 'all .15s ease',
                        display: 'flex', alignItems: 'center', gap: 7,
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                      onMouseEnter={e => { if (ready && !loading) { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--b1)'; e.currentTarget.style.color = 'var(--t2)'; e.currentTarget.style.transform = ''; }}
                    ><CalendarDays size={16} strokeWidth={1.8} /> Daily</button>
                  </div>

                  {hintText && !loading && (
                    <p style={{ fontSize: 12, color: 'var(--primary)', fontFamily: 'var(--mono)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontWeight: 600 }}>
                      <AlertCircle size={14} strokeWidth={2} />{hintText}
                    </p>
                  )}
                  {ready && !loading && !problem && (
                    <p style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--mono)', textAlign: 'center' }}>
                      or press{' '}
                      <kbd style={{ padding: '2px 7px', borderRadius: 5, background: 'var(--bg-press)', border: '1px solid var(--b2)', color: 'var(--t2)', fontSize: 10, fontWeight: 700, marginLeft: '3px' }}>ENTER</kbd>
                    </p>
                  )}
                </div>

                {/* Result */}
                <div style={{ flex: 1 }}>
                  {loading && <Skeleton />}
                  {!loading && error && (
                    <ErrorMessage message={error} onRetry={handlePick}
                      noFriendMatch={noFriendMatch}
                      onSuggestAnyway={noFriendMatch ? handleSuggestAnyway : undefined}
                      suggestions={noFriendMatch
                        ? ["Friends haven't attempted any problem matching these filters", "Try adding more friends or broadening your rating range"]
                        : ['Widen the rating range', 'Remove some tag filters', 'Clear your history']
                      }
                    />
                  )}
                  {!loading && !error && problem && (
                    <ProblemCard
                      key={`${problem.id}-${histKey}`}
                      problem={problem} meta={meta}
                      onPickAgain={handlePick}
                      userSolvedIds={userHandle.status === 'ok' ? userHandle.solvedIds : null}
                      userHandle={userHandle.status === 'ok' ? userHandle.handle : null}
                    />
                  )}
                  {!loading && !error && !problem && <EmptyState />}
                </div>
              </div>
            )}

            {/* ── PROFILE panel ── */}
            {activePanel === 'profile' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="panel-in">
                <div>
                  <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-.03em', color: 'var(--primary)', marginBottom: 6 }}>
                    My Profile
                  </h2>
                  <p style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.6 }}>
                    Connect your CF handle to track progress and personalize problem discovery.
                  </p>
                </div>
                <HandlePanel
                  hook={userHandle}
                  excludeSolved={excludeSolved} onExcludeChange={setExcludeSolved}
                  showOnlySolved={showOnlySolved} onShowOnlyChange={setShowOnlySolved}
                />
              </div>
            )}

            {/* ── HISTORY panel ── */}
            {activePanel === 'history' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="panel-in">
                <div>
                  <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-.03em', color: 'var(--primary)', marginBottom: 6 }}>
                    History
                  </h2>
                  <p style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.6 }}>
                    Problems ForgeSolve has shown you. Click any item to dive into it.
                  </p>
                </div>
                <HistoryPanel onClear={() => setHistKey(k => k + 1)} forceOpen />
              </div>
            )}

          </div>

          {/* Footer */}
          <footer style={{
            borderTop: '1px solid var(--b0)', padding: '14px 28px', marginTop: 'auto',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
            fontSize: 12, color: 'var(--t3)', fontFamily: 'var(--mono)',
            background: 'var(--bg)'
          }}>
            <span>© 2026 Pranshu. All rights reserved.</span>
            <a
              href="https://www.linkedin.com/in/pranshu-pujara-2a0564376/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              <span>LinkedIn</span>
            </a>
            <a
              href="https://github.com/PranshuPujara"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              <span>GitHub</span>
            </a>
          </footer>
        </main>
      </div>

      {/* Mobile overlay */}
      <style>{`
        @media(max-width:768px){
          #mob-toggle{display:flex!important}
          #sidebar{
            position:fixed!important;top:50px!important;left:0!important;bottom:0!important;
            z-index:45!important;width:340px!important;
            transform:${mobileOpen ? 'translateX(0)' : 'translateX(-100%)'}!important;
            transition:transform .25s cubic-bezier(.16,1,.3,1)!important;
            box-shadow:${mobileOpen ? '4px 0 40px #00000090' : 'none'}!important;
          }
        }
      `}
      </style>
    </div>
  );
}
