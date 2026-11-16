import { ServiceError, simulate } from './mock';

export interface AuthSession {
  token: string;
  mobile: string;
}

export interface AuthService {
  login(mobile: string, password: string): Promise<void>;
  sendRecoveryOtp(mobile: string): Promise<void>;
  verifyOtp(mobile: string, code: string): Promise<AuthSession>;
  resendOtp(mobile: string): Promise<void>;
  /** Recovery (and an invited doctor's first password): the SMS code and the new password. */
  resetPassword(mobile: string, code: string, newPassword: string): Promise<void>;
  changePassword(current: string, next: string): Promise<void>;
  deactivate(): Promise<void>;
}

export const mockAuthService: AuthService = {
  async login(_mobile, password) {
    await simulate('auth.login', 600);
    if (password === 'wrong-password') throw new ServiceError('invalid_credentials', 'That password is not correct.', 'password');
  },
  async sendRecoveryOtp() {
    await simulate('auth.recovery', 500);
  },
  async verifyOtp(mobile, code) {
    await simulate('auth.otp', 600);
    if (code === '000000') throw new ServiceError('otp_invalid', 'That code is not valid. Check the SMS and try again.');
    return { token: `mock-token-${Date.now()}`, mobile };
  },
  async resendOtp() {
    await simulate('auth.resend', 300);
  },
  async resetPassword() {
    await simulate('auth.reset', 500);
  },
  async changePassword() {
    await simulate('auth.password', 500);
  },
  async deactivate() {
    await simulate('auth.deactivate', 500);
  },
};
