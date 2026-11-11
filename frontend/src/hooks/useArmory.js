import { useCallback, useState } from 'react';
import { storage } from '../utils/localStorage';

/** Every accepted problem becomes a blade in the armory (localStorage, newest first, max 60). */
export function useArmory() {
  const [items, setItems] = useState(() => storage.get('armory', []));
  const add = useCallback(entry => {
    setItems(prev => {
      const next = [{ ...entry, at: Date.now() }, ...prev.filter(i => i.id !== entry.id)].slice(0, 60);
      storage.set('armory', next);
      return next;
    });
  }, []);
  const clear = useCallback(() => { storage.remove('armory'); setItems([]); }, []);
  return { items, add, clear };
}
