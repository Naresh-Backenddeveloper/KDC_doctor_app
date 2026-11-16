/* eslint-disable @typescript-eslint/no-require-imports -- lazy requires break import cycles between stores and live services */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { services } from '../services';
import { digits } from '../validation/schemas';
import { persistStorage } from './storage';
import { LIVE } from '../services/config';

interface SessionState {
  token: string | null;
  mobile: string | null;
  otpMobile: string | null;
  /** What the code screen is for: signing in, or setting a new password (recovery, first password). */
  otpMode: 'login' | 'recovery';
  requestOtp: (mobile: string, password: string) => Promise<void>;
  requestRecovery: (mobile: string) => Promise<void>;
  verifyOtp: (code: string) => Promise<void>;
  resendOtp: () => Promise<void>;
  /** Recovery: the code and a new password. Afterwards the doctor signs in with it. */
  resetPassword: (code: string, newPassword: string) => Promise<void>;
  logout: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      token: null,
      mobile: null,
      otpMobile: null,
      otpMode: 'login',
      requestOtp: async (mobile, password) => {
        const normalized = digits(mobile);
        await services.auth.login(normalized, password);
        set({ otpMobile: normalized, otpMode: 'login' });
      },
      requestRecovery: async (mobile) => {
        const normalized = digits(mobile);
        await services.auth.sendRecoveryOtp(normalized);
        set({ otpMobile: normalized, otpMode: 'recovery' });
      },
      verifyOtp: async (code) => {
        const { token, mobile } = await services.auth.verifyOtp(get().otpMobile ?? '', code);
        set({ token, mobile, otpMobile: null });
      },
      resendOtp: async () => {
        await services.auth.resendOtp(get().otpMobile ?? '');
      },
      resetPassword: async (code, newPassword) => {
        await services.auth.resetPassword(get().otpMobile ?? '', code, newPassword);
        set({ otpMode: 'login' });
      },
      logout: () => {
        if (LIVE) {
          // Ends the session on the server and forgets every patient detail loaded on this phone.
          const token = get().token;
          void Promise.resolve(require('../services/live/http') as typeof import('../services/live/http')).then((m) => m.endSession(token));
          void Promise.resolve(require('../services/live/sync') as typeof import('../services/live/sync')).then((m) => m.clearAll());
        }
        set({ token: null, mobile: null, otpMobile: null });
      },
    }),
    {
      name: 'session',
      storage: persistStorage,
      // Live: the access token never touches the disk (the refresh token is in the Keychain).
      partialize: (s) => (LIVE ? { mobile: s.mobile } : { token: s.token, mobile: s.mobile }),
    },
  ),
);
