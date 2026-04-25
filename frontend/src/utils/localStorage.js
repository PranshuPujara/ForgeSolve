const PREFIX = 'fs_';

export const storage = {
  get:    (key, fallback = null) => { try { const v = localStorage.getItem(PREFIX+key); return v !== null ? JSON.parse(v) : fallback; } catch { return fallback; } },
  set:    (key, value)           => { try { localStorage.setItem(PREFIX+key, JSON.stringify(value)); } catch {} },
  remove: (key)                  => { try { localStorage.removeItem(PREFIX+key); } catch {} },
};

/* History: store "platform:id" strings */
export const addToHistory    = id  => { const h = storage.get('history', []); if (!h.includes(id)) storage.set('history', [id, ...h].slice(0, 200)); };
export const getHistory      = ()  => storage.get('history', []);
export const clearHistory    = ()  => storage.remove('history');

/* Streak */
export const getStreak       = ()  => storage.get('streak', { count:0, lastDate:null });
export const updateStreak    = ()  => {
  const today = new Date().toISOString().slice(0,10);
  const s = getStreak();
  const yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
  const count = s.lastDate === today ? s.count : s.lastDate === yesterday ? s.count+1 : 1;
  const updated = { count, lastDate: today };
  storage.set('streak', updated);
  return updated;
};

/* Smart mode */
export const getLastRating   = ()  => storage.get('lastRating', null);
export const setLastRating   = r   => storage.set('lastRating', r);
