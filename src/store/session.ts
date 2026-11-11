import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { services } from '../services';
import { digits } from '../validation/schemas';
import { persistStorage } from './storage';

interface SessionState {
  token: string | null;
  mobile: string | null;
  otpMobile: string | null;
  requestOtp: (mobile: string, password: string) => Promise<void>;
  requestRecovery: (mobile: string) => Promise<void>;
  verifyOtp: (code: string) => Promise<void>;
  resendOtp: () => Promise<void>;
  logout: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      token: null,
      mobile: null,
      otpMobile: null,
      requestOtp: async (mobile, password) => {
        const normalized = digits(mobile);
        await services.auth.login(normalized, password);
        set({ otpMobile: normalized });
      },
      requestRecovery: async (mobile) => {
        const normalized = digits(mobile);
        await services.auth.sendRecoveryOtp(normalized);
        set({ otpMobile: normalized });
      },
      verifyOtp: async (code) => {
        const { token, mobile } = await services.auth.verifyOtp(get().otpMobile ?? '', code);
        set({ token, mobile, otpMobile: null });
      },
      resendOtp: async () => {
        await services.auth.resendOtp(get().otpMobile ?? '');
      },
      logout: () => set({ token: null, mobile: null, otpMobile: null }),
    }),
    { name: 'session', storage: persistStorage, partialize: (s) => ({ token: s.token, mobile: s.mobile }) },
  ),
);
