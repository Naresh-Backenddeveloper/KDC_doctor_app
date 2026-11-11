import type { BankAccount, BankUpdate } from '../types';
import { ServiceError, simulate } from './mock';

export interface EarningsService {
  requestStatement(period: string): Promise<void>;
  /** Stores a new settlement account; only the masked form comes back. */
  updateBank(update: BankUpdate): Promise<Partial<BankAccount>>;
}

export function maskAccount(accountNumber: string): string {
  return `•••• •••• ${accountNumber.slice(-4)}`;
}

export function maskPan(pan: string): string {
  return `${pan.slice(0, 5)}••••${pan.slice(-1)}`;
}

const BANK_BY_IFSC: Record<string, { name: string; branch: string }> = {
  HDFC: { name: 'HDFC Bank', branch: 'Jubilee Hills, Hyderabad' },
  ICIC: { name: 'ICICI Bank', branch: 'Banjara Hills, Hyderabad' },
  SBIN: { name: 'State Bank of India', branch: 'Secunderabad' },
  UTIB: { name: 'Axis Bank', branch: 'Madhapur, Hyderabad' },
};

export const mockEarningsService: EarningsService = {
  async requestStatement() {
    await simulate('earnings.statement', 300);
  },
  async updateBank(u) {
    await simulate('earnings.bank', 700);
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(u.ifsc)) throw new ServiceError('invalid_ifsc', 'The IFSC is not valid.', 'ifsc');
    const bank = BANK_BY_IFSC[u.ifsc.slice(0, 4)] ?? { name: `${u.ifsc.slice(0, 4)} Bank`, branch: 'Branch on file' };
    return {
      ...bank,
      holder: u.holder,
      account: maskAccount(u.accountNumber),
      ifsc: u.ifsc,
      type: u.type,
      status: 'verifying',
      pan: maskPan(u.pan),
    };
  },
};
