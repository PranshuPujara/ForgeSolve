import { useState, useCallback, useEffect, useRef } from 'react';
import { validateHandle, getUserStats, validateLCUser, getLCUserStats } from '../services/api';
import { storage } from '../utils/localStorage';

// Codeforces storage keys
const CF_HANDLE_KEY  = 'user_handle';
const CF_SOLVED_KEY  = 'user_solved_ids';
const CF_FETCHED_KEY = 'user_solved_fetched_at';
const CF_STATS_KEY   = 'user_stats';

// LeetCode storage keys
const LC_HANDLE_KEY  = 'lc_handle';
const LC_SOLVED_KEY  = 'lc_solved_slugs';
const LC_FETCHED_KEY = 'lc_solved_fetched_at';
const LC_STATS_KEY   = 'lc_stats';

const CACHE_MS = 10 * 60 * 1000; // 10 min

export const useUserHandle = () => {
  // ── Codeforces State ──────────────────────────────────────────────
  const [handle,       setHandle]       = useState(() => storage.get(CF_HANDLE_KEY, ''));
  const [solvedIds,    setSolvedIds]    = useState(() => new Set(storage.get(CF_SOLVED_KEY, [])));
  const [solvedCount,  setSolvedCount]  = useState(() => storage.get(CF_SOLVED_KEY, []).length);
  const [stats,        setStats]        = useState(() => storage.get(CF_STATS_KEY, null));
  const [statsLoading, setStatsLoading] = useState(false);
  const [status,       setStatus]       = useState(() => {
    const h = storage.get(CF_HANDLE_KEY, '');
    const s = storage.get(CF_SOLVED_KEY, []);
    return (h && s.length > 0) ? 'ok' : 'idle';
  });
  const [errorMsg, setErrorMsg] = useState('');

  // ── LeetCode State ────────────────────────────────────────────────
  const [lcHandle,       setLcHandle]       = useState(() => storage.get(LC_HANDLE_KEY, ''));
  const [lcSolvedSlugs,  setLcSolvedSlugs]  = useState(() => new Set(storage.get(LC_SOLVED_KEY, [])));
  const [lcSolvedCount,  setLcSolvedCount]  = useState(() => storage.get(LC_SOLVED_KEY, []).length);
  const [lcStats,        setLcStats]        = useState(() => storage.get(LC_STATS_KEY, null));
  const [lcStatsLoading, setLcStatsLoading] = useState(false);
  const [lcStatus,       setLcStatus]       = useState(() => {
    const h = storage.get(LC_HANDLE_KEY, '');
    const s = storage.get(LC_SOLVED_KEY, []);
    return (h && s.length > 0) ? 'ok' : 'idle';
  });
  const [lcError, setLcError] = useState('');

  const lcWakeTimerRef = useRef(null);

  // ── Codeforces: Fetch profile stats ───────────────────────────────
  const fetchStats = useCallback(async (h) => {
    setStatsLoading(true);
    try {
      const s = await getUserStats(h);
      setStats(s);
      storage.set(CF_STATS_KEY, s);
    } catch {
      // stats are optional — fail silently
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ── LeetCode: Fetch profile stats ─────────────────────────────────
  const fetchLcStats = useCallback(async (u) => {
    setLcStatsLoading(true);
    try {
      const s = await getLCUserStats(u);
      setLcStats(s);
      storage.set(LC_STATS_KEY, s);
    } catch {
      // optional stats
    } finally {
      setLcStatsLoading(false);
    }
  }, []);

  // ── On mount: background-refresh stale CF & LC data ───────────────
  useEffect(() => {
    // 1. Codeforces background refresh
    const cachedHandle = storage.get(CF_HANDLE_KEY, '');
    const fetchedAt    = storage.get(CF_FETCHED_KEY, 0);
    if (cachedHandle) {
      if (Date.now() - fetchedAt > CACHE_MS) {
        validateHandle(cachedHandle)
          .then(data => {
            const ids = data.solved || [];
            setSolvedIds(new Set(ids));
            setSolvedCount(ids.length);
            storage.set(CF_SOLVED_KEY, ids);
            storage.set(CF_FETCHED_KEY, Date.now());
          })
          .catch(() => {});
      }
      if (!storage.get(CF_STATS_KEY, null)) {
        fetchStats(cachedHandle);
      }
    }

    // 2. LeetCode background refresh
    const cachedLcHandle = storage.get(LC_HANDLE_KEY, '');
    const lcFetchedAt    = storage.get(LC_FETCHED_KEY, 0);
    if (cachedLcHandle) {
      if (Date.now() - lcFetchedAt > CACHE_MS) {
        validateLCUser(cachedLcHandle)
          .then(data => {
            const slugs = data.solvedSlugs || [];
            setLcSolvedSlugs(new Set(slugs));
            setLcSolvedCount(slugs.length);
            storage.set(LC_SOLVED_KEY, slugs);
            storage.set(LC_FETCHED_KEY, Date.now());
          })
          .catch(() => {});
      }
      if (!storage.get(LC_STATS_KEY, null)) {
        fetchLcStats(cachedLcHandle);
      }
    }
  }, [fetchStats, fetchLcStats]);

  // ── Codeforces: Connect handle ────────────────────────────────────
  const fetchSolved = useCallback(async (h) => {
    if (!h?.trim()) return;
    setStatus('loading'); setErrorMsg('');
    try {
      const data = await validateHandle(h.trim());
      const ids  = data.solved || [];
      const s    = new Set(ids);
      setSolvedIds(s);
      setSolvedCount(ids.length);
      setHandle(h.trim());
      setStatus('ok');
      storage.set(CF_HANDLE_KEY, h.trim());
      storage.set(CF_SOLVED_KEY, ids);
      storage.set(CF_FETCHED_KEY, Date.now());
      fetchStats(h.trim());
      return s;
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message?.includes('not found')
        ? `"${h}" not found on Codeforces`
        : (err.message || 'Failed to fetch'));
      return null;
    }
  }, [fetchStats]);

  const clearHandle = useCallback(() => {
    setHandle(''); setSolvedIds(new Set()); setSolvedCount(0);
    setStatus('idle'); setErrorMsg(''); setStats(null);
    storage.remove(CF_HANDLE_KEY);
    storage.remove(CF_SOLVED_KEY);
    storage.remove(CF_FETCHED_KEY);
    storage.remove(CF_STATS_KEY);
  }, []);

  const refreshStats = useCallback(() => {
    const h = storage.get(CF_HANDLE_KEY, '');
    if (h) {
      storage.remove(CF_STATS_KEY);
      setStats(null);
      fetchStats(h);
    }
  }, [fetchStats]);

  // ── LeetCode: Connect handle ──────────────────────────────────────
  const fetchLcSolved = useCallback(async (u) => {
    if (!u?.trim()) return;
    setLcStatus('loading');
    setLcError('');

    if (lcWakeTimerRef.current) clearTimeout(lcWakeTimerRef.current);
    lcWakeTimerRef.current = setTimeout(() => {
      setLcError('Waking server…');
    }, 4000);

    try {
      const data = await validateLCUser(u.trim());
      if (lcWakeTimerRef.current) clearTimeout(lcWakeTimerRef.current);
      const slugs = data.solvedSlugs || [];
      const s = new Set(slugs);
      setLcSolvedSlugs(s);
      setLcSolvedCount(slugs.length);
      setLcHandle(u.trim());
      setLcStatus('ok');
      setLcError('');
      storage.set(LC_HANDLE_KEY, u.trim());
      storage.set(LC_SOLVED_KEY, slugs);
      storage.set(LC_FETCHED_KEY, Date.now());
      fetchLcStats(u.trim());
      return s;
    } catch (err) {
      if (lcWakeTimerRef.current) clearTimeout(lcWakeTimerRef.current);
      setLcStatus('error');
      if (err.message?.includes('not found') || err.message?.includes('404')) {
        setLcError('User not found on LeetCode');
      } else {
        setLcError(err.message || 'Failed to fetch LeetCode data');
      }
      return null;
    }
  }, [fetchLcStats]);

  const clearLcHandle = useCallback(() => {
    if (lcWakeTimerRef.current) clearTimeout(lcWakeTimerRef.current);
    setLcHandle(''); setLcSolvedSlugs(new Set()); setLcSolvedCount(0);
    setLcStatus('idle'); setLcError(''); setLcStats(null);
    storage.remove(LC_HANDLE_KEY);
    storage.remove(LC_SOLVED_KEY);
    storage.remove(LC_FETCHED_KEY);
    storage.remove(LC_STATS_KEY);
  }, []);

  const refreshLcStats = useCallback(() => {
    const u = storage.get(LC_HANDLE_KEY, '');
    if (u) {
      storage.remove(LC_STATS_KEY);
      setLcStats(null);
      fetchLcStats(u);
    }
  }, [fetchLcStats]);

  return {
    // Codeforces
    handle, solvedIds, solvedCount,
    status, errorMsg,
    stats, statsLoading,
    fetchSolved, clearHandle, refreshStats,
    setHandle,

    // LeetCode
    lcHandle, lcStatus, lcError,
    lcSolvedSlugs, lcSolvedCount,
    lcStats, lcStatsLoading,
    fetchLcSolved, clearLcHandle, refreshLcStats,
    setLcHandle,
  };
};
