import { useEffect, useState } from 'react';
import { useConsultation, elapsedSeconds } from '../store/consultation';

/**
 * A running consultation clock. With a consultation in progress it reports real
 * elapsed time; a screen opened on its own counts up from the blueprint's value.
 */
export function useCallClock(apptId: string, baseline: number): number {
  const active = useConsultation((s) => s.active);
  const live = active?.apptId === apptId ? active : null;
  const [mounted] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return live ? elapsedSeconds(live, now) : baseline + Math.max(0, Math.floor((now - mounted) / 1000));
}
