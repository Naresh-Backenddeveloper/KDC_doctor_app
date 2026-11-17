import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SettingsState } from '../types';
import { persistStorage } from './storage';
import { LIVE } from '../services/config';

/* eslint-disable @typescript-eslint/no-require-imports -- lazy requires break the store ↔ live-service import cycle */
function save(body: Record<string, unknown>, undo: () => void) {
  const { api } = require('../services/live/http') as typeof import('../services/live/http');
  api.put('me/preferences', body).catch((e: unknown) => {
    undo();
    (require('./toast') as typeof import('./toast')).showToast(e instanceof Error ? e.message : 'Couldn’t save the setting', 'critical');
  });
}
/* eslint-enable @typescript-eslint/no-require-imports */

type ToggleKey = Exclude<keyof SettingsState, 'language'>;

interface SettingsStore extends SettingsState {
  toggle: (key: ToggleKey) => void;
  setLanguage: (language: string) => void;
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set, get) => ({
      apptBooked: true,
      patientWaiting: true,
      apptCancelled: true,
      reportUploaded: true,
      payoutCredited: true,
      productUpdates: false,
      biometricLock: true,
      language: 'English',
      toggle: (key) => {
        const value = !get()[key];
        set({ [key]: value } as Partial<SettingsStore>);
        if (!LIVE) return;
        // Live: saved on the server at once; undone if it refuses.
        const { PREFERENCE_KEYS } = require('../services/live/sync-account') as typeof import('../services/live/sync-account');
        const body = key === 'biometricLock' ? { security: { biometricLock: value } } : { notifications: { [PREFERENCE_KEYS[key]]: value } };
        save(body, () => set({ [key]: !value } as Partial<SettingsStore>));
      },
      setLanguage: (language) => {
        const before = get().language;
        set({ language });
        if (LIVE) save({ language }, () => set({ language: before }));
      },
    }),
    // Live: the server holds them (loaded at sign-in), so nothing is kept on the phone.
    { name: 'settings', storage: persistStorage, partialize: (s) => (LIVE ? {} : s) },
  ),
);
