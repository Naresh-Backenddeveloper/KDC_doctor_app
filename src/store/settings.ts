import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SettingsState } from '../types';
import { persistStorage } from './storage';

type ToggleKey = Exclude<keyof SettingsState, 'language'>;

interface SettingsStore extends SettingsState {
  toggle: (key: ToggleKey) => void;
  setLanguage: (language: string) => void;
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      apptBooked: true,
      patientWaiting: true,
      apptCancelled: true,
      reportUploaded: true,
      payoutCredited: true,
      productUpdates: false,
      biometricLock: true,
      language: 'English',
      toggle: (key) => set((s) => ({ [key]: !s[key] }) as Partial<SettingsStore>),
      setLanguage: (language) => set({ language }),
    }),
    { name: 'settings', storage: persistStorage },
  ),
);
