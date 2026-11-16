import type { AuthService } from '../auth';
import { adoptSession, api, request } from './http';

/**
 * Doctor sign-in on the backend: mobile + password, then an SMS code. "Resend" for a
 * sign-in repeats the password step, so the password is held in memory only until the
 * code is entered (never stored). Recovery sends a code and sets a new password with it.
 */
let pending: { mobile: string; password: string | null } | null = null;

export const liveAuthService: AuthService = {
  async login(mobile, password) {
    await request('POST', 'auth/doctor/login', { mobile, password }, { auth: false });
    pending = { mobile, password };
  },
  async sendRecoveryOtp(mobile) {
    await request('POST', 'auth/password/forgot', { accountType: 'doctor', mobile }, { auth: false });
    pending = { mobile, password: null };
  },
  async verifyOtp(mobile, code) {
    const pair = await request<{ accessToken: string; refreshToken: string }>('POST', 'auth/otp/verify', { accountType: 'doctor', mobile, code }, { auth: false });
    await adoptSession(pair);
    pending = null;
    return { token: pair.accessToken, mobile };
  },
  async resendOtp(mobile) {
    if (pending?.password) await request('POST', 'auth/doctor/login', { mobile, password: pending.password }, { auth: false });
    else await request('POST', 'auth/password/forgot', { accountType: 'doctor', mobile }, { auth: false });
  },
  async resetPassword(mobile, code, newPassword) {
    await request('POST', 'auth/password/reset', { accountType: 'doctor', mobile, code, newPassword }, { auth: false });
    pending = null;
  },
  async changePassword(current, next) {
    await api.post('auth/password/change', { currentPassword: current, newPassword: next });
  },
  async deactivate() {
    await api.post('doctor/me/deactivate', {});
  },
};
