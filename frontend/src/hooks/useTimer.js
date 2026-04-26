import { useState, useEffect, useRef, useCallback } from 'react';

const TIMER_KEY = 'quiz_timer_start';

export const useTimer = () => {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  // On mount, check for an existing timer
  useEffect(() => {
    const saved = localStorage.getItem(TIMER_KEY);
    if (saved) {
      startTimeRef.current = Number(saved);
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setSeconds(elapsed);
      setRunning(true);
    }
  }, []);

  const start = useCallback(() => {
    const now = Date.now();
    localStorage.setItem(TIMER_KEY, now);
    startTimeRef.current = now;
    setSeconds(0);
    setRunning(true);
  }, []);

  const stop = useCallback(() => {
    setRunning(false);
    // Save elapsed time so we know it was intentionally stopped
    localStorage.setItem(TIMER_KEY + '_stopped', seconds);
  }, [seconds]);

  const reset = useCallback(() => {
    setRunning(false);
    setSeconds(0);
    startTimeRef.current = null;
    localStorage.removeItem(TIMER_KEY);
    localStorage.removeItem(TIMER_KEY + '_stopped');
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTimeRef.current) / 1000);
        setSeconds(elapsed);
      }, 100);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const format = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0)
      return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return { seconds, running, formatted: format(seconds), start, stop, reset };
};