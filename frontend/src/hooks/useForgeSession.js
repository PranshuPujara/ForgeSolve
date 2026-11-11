import { useCallback, useEffect, useRef, useState } from 'react';
import { storage } from '../utils/localStorage';
import { checkSolved } from '../services/api';
import { expectedMinutes, gradeFor, stageIndex, weaponFor } from '../components/forge/geometry';

/**
 * One "forging session" = the time between pressing "Solve this" and the problem being accepted.
 * - Time is derived from a stored start timestamp, so it keeps counting in background tabs and after reloads.
 * - If a handle is connected, the backend is polled until an accepted submission (after the start time) appears.
 * - `markSolved()` is the manual fallback (grade is capped below Masterwork).
 * - Failed judged submissions (Codeforces) are counted as `attempts`: the smith flinches and the grade takes a small time penalty.
 */
export function useForgeSession({ problem, handle, platform, onAccepted, firstPollMs = 8000, pollMs = 15000 }) {
  const [status, setStatus] = useState('idle');            // idle | forging | accepted
  const [startedAt, setStartedAt] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [result, setResult] = useState(null);
  const [watch, setWatch] = useState({ state: 'off', lastCheck: null, msg: '' });
  const [attempts, setAttempts] = useState(0);
  const doneRef = useRef(false);                           // guards against a poll + a manual click both finishing
  const cb = useRef(onAccepted); cb.current = onAccepted;
  const live = useRef({}); live.current = { problem, handle, platform, startedAt, status, attempts };

  /* (re)initialise when the problem changes; resume a stored session for the same problem */
  useEffect(() => {
    setResult(null); setAttempts(0); doneRef.current = false; setWatch({ state: 'off', lastCheck: null, msg: '' });
    const saved = storage.get('forge_session', null);
    if (problem && saved && saved.problemId === problem.id && saved.startedAt) {
      setStartedAt(saved.startedAt); setNow(Date.now()); setStatus('forging');
    } else { setStartedAt(null); setStatus('idle'); }
  }, [problem?.id]);

  const finish = useCallback((seconds, manual, tries = 0) => {
    const { problem: pr } = live.current;
    if (!pr || doneRef.current) return;
    doneRef.current = true;
    const r = { grade: gradeFor(pr, seconds, manual, tries), seconds, weapon: weaponFor(pr), manual: !!manual, attempts: tries };
    setResult(r); setStatus('accepted');
    storage.remove('forge_session');
    cb.current && cb.current(r, pr);
  }, []);

  const start = useCallback(() => {
    const { problem: pr, status: s } = live.current;
    if (!pr || s !== 'idle') return;
    const ts = Date.now();
    doneRef.current = false; setAttempts(0); setNow(ts);
    setStartedAt(ts); setStatus('forging');
    storage.set('forge_session', { problemId: pr.id, startedAt: ts });
  }, []);

  const markSolved = useCallback(() => {
    const { startedAt: ts, status: s } = live.current;
    if (s !== 'forging') return;
    finish(Math.max(1, Math.round((Date.now() - ts) / 1000)), true, live.current.attempts || 0);
  }, [finish]);

  const reset = useCallback(() => {
    storage.remove('forge_session'); doneRef.current = false; setStatus('idle'); setStartedAt(null); setResult(null); setAttempts(0);
  }, []);

  /* clock */
  useEffect(() => {
    if (status !== 'forging') return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [status]);

  /* acceptance watcher */
  useEffect(() => {
    if (status !== 'forging' || !handle || !problem) { if (status === 'forging') setWatch({ state: 'off', lastCheck: null, msg: 'Connect your handle for auto-detect' }); return undefined; }
    let stop = false, timer, fails = 0;
    const tick = async () => {
      if (stop) return;
      if (typeof document !== 'undefined' && document.hidden) { timer = setTimeout(tick, 4000); return; }
      const { problem: pr, startedAt: ts, handle: h, platform: pf } = live.current;
      try {
        setWatch(w => ({ ...w, state: 'watching', msg: '' }));
        const r = await checkSolved({ platform: pf, handle: h, problem: pr, since: Math.floor(ts / 1000) - 60 });
        if (stop) return;
        fails = 0;
        const tries = Number(r?.attempts) || 0;
        if (tries !== live.current.attempts) setAttempts(tries);   // → the smith flinches on every new failed strike
        if (r && r.accepted) {
          const secs = r.submittedAt ? Math.max(1, r.submittedAt - Math.floor(ts / 1000)) : Math.round((Date.now() - ts) / 1000);
          finish(secs, false, tries); return;
        }
        setWatch({ state: 'watching', lastCheck: Date.now(), msg: '' });
      } catch (e) {
        fails += 1;
        setWatch({ state: 'error', lastCheck: Date.now(), msg: e?.response?.data?.error || e?.message || 'Could not check' });
      }
      timer = setTimeout(tick, Math.min(pollMs * (1 + fails), 90000));
    };
    timer = setTimeout(tick, firstPollMs);
    return () => { stop = true; clearTimeout(timer); };
  }, [status, handle, problem?.id, finish, firstPollMs, pollMs]);

  const elapsed = status === 'accepted' ? (result?.seconds || 0) : startedAt ? Math.max(0, (now - startedAt) / 1000) : 0;
  const progress = status === 'accepted' ? 1 : elapsed / (expectedMinutes(problem) * 60);
  return { status, elapsed, progress, stage: stageIndex(progress), result, watch, attempts, start, markSolved, reset };
}
