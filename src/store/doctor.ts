import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { qualifications } from '../mock-data/mock';
import { seed } from '../mock-data/seed';
import { services } from '../services';
import type { DoctorProfile, Mode, Qualification } from '../types';
import { persistStorage } from './storage';

interface DoctorState {
  profile: DoctorProfile;
  qualifications: Qualification[];
  saveProfile: (patch: Partial<DoctorProfile>) => Promise<void>;
  saveQualifications: (items: Qualification[]) => Promise<void>;
  fee: (mode: Mode) => number;
}

export const useDoctor = create<DoctorState>()(
  persist(
    (set, get) => ({
      profile: seed.doctor(),
      qualifications,
      saveProfile: async (patch) => {
        await services.profile.save(patch);
        set((s) => ({ profile: { ...s.profile, ...patch } }));
      },
      saveQualifications: async (items) => {
        await services.profile.saveQualifications(items);
        set({ qualifications: items });
      },
      fee: (mode) => get().profile.fees[mode],
    }),
    { name: 'doctor', storage: persistStorage, partialize: ({ profile, qualifications: q }) => ({ profile, qualifications: q }) },
  ),
);
