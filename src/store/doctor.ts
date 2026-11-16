import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { qualifications } from '../mock-data/mock';
import { seed } from '../mock-data/seed';
import { services } from '../services';
import { LIVE } from '../services/config';
import type { DoctorProfile, Mode, Qualification } from '../types';
import { persistStorage } from './storage';

/** Live builds start empty; the profile comes from the server (services/live/sync-account.ts). */
export const EMPTY_PROFILE: DoctorProfile = {
  id: '',
  name: '',
  shortName: '',
  firstName: '',
  photo: '',
  qualification: '',
  specialization: '',
  subSpecialization: '',
  title: '',
  experience: 0,
  languages: [],
  regNo: '',
  council: '',
  mobile: '',
  mobileMasked: '',
  email: '',
  hospital: '',
  clinic: '',
  address: '',
  city: '',
  pin: '',
  clinicPhone: '',
  timings: '',
  rating: 0,
  reviews: 0,
  consults: 0,
  verified: false,
  about: '',
  fees: { video: 0, audio: 0, clinic: 0 },
  modesEnabled: { video: false, audio: false, clinic: false },
  freeFollowUp: false,
  acceptsInPerson: false,
};

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
      profile: LIVE ? EMPTY_PROFILE : seed.doctor(),
      qualifications: LIVE ? [] : qualifications,
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
    {
      name: 'doctor',
      storage: persistStorage,
      // Live: nothing is kept on the phone; it's loaded from the server at each launch.
      partialize: ({ profile, qualifications: q }) => (LIVE ? {} : { profile, qualifications: q }),
    },
  ),
);
