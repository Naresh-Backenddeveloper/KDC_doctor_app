/** Live: the consultation session on the server (GET /doctor/consultations/:code), polled while a screen shows it. */
import React from 'react';
import { LIVE } from '../config';
import { api } from './http';

export interface LiveSession {
  state: 'waiting' | 'live' | 'dropped' | 'ended';
  patientInRoom: boolean;
  startedAt: string | null;
  endedAt: string | null;
  elapsedSeconds: number | null;
  scheduledAt: string;
}

export function fetchSession(code: string): Promise<LiveSession> {
  return api.get<LiveSession>(`doctor/consultations/${encodeURIComponent(code)}`);
}

/** The session, refreshed every `everyMs` (0: once). Null in the demo, before it loads, or if it can't be read. */
export function useLiveSession(code: string, everyMs = 5000): LiveSession | null {
  const [session, setSession] = React.useState<LiveSession | null>(null);
  React.useEffect(() => {
    if (!LIVE || !code) return;
    let alive = true;
    const load = () => fetchSession(code).then((s) => alive && setSession(s), () => undefined);
    void load();
    const timer = everyMs ? setInterval(load, everyMs) : undefined;
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, [code, everyMs]);
  return session;
}
