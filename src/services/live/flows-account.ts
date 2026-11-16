import type { BankUpdate } from '../../types';
import { useBank } from '../../store/bank';
import { loadBank, loadEarnings } from './sync-account';

/**
 * Live `saveBankDetails`: the server stores the account and operations verify it
 * (including that the holder matches the PAN). Nothing is decided on the phone: a
 * failed payout shows only when the bank actually returns one.
 */
export async function saveBankDetails(update: BankUpdate): Promise<'verifying' | 'name-mismatch'> {
  await useBank.getState().update(update);
  await Promise.all([loadBank(), loadEarnings().catch(() => undefined)]);
  return 'verifying';
}
