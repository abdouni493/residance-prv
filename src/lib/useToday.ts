import { useEffect, useState } from 'react';
import { todayISO } from '@/lib/utils';

/**
 * Returns today's local date (yyyy-mm-dd) and keeps it in sync with the
 * system clock: re-checks every 30s and when the window regains focus, so
 * date-gated UI (activation / closure buttons, alerts) unlocks the moment
 * the day changes without requiring a page reload.
 */
export function useToday(): string {
  const [today, setToday] = useState(() => todayISO());

  useEffect(() => {
    const check = () => {
      const now = todayISO();
      setToday((prev) => (prev === now ? prev : now));
    };
    const id = setInterval(check, 30_000);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);

  return today;
}
