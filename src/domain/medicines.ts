import type { CatalogMedicine, PrescribedMedicine } from '../types';
import { MEDICINE_CATALOG } from '../mock-data/medicines';

export const DOSAGE_OPTIONS = ['½ tablet', '1 tablet', '2 tablets', '1 capsule', '5 ml', '10 ml', '1 puff', 'As directed'];
export const FREQUENCY_OPTIONS = ['Once daily', 'Once daily — bedtime', 'Twice daily', 'Three times daily', 'Four times daily', 'Every 8 hours', 'As needed'];
export const DURATION_OPTIONS = ['3 days', '5 days', '7 days', '10 days', '14 days', '30 days', '60 days', '90 days', 'Ongoing'];
export const FOOD_OPTIONS = ['Before food', 'After food', 'With food', 'Empty stomach', 'Any time'];

/** Matches brand, strength or salt, so "amox" finds the combination products too. */
export function searchMedicines(query: string, catalog: CatalogMedicine[] = MEDICINE_CATALOG): CatalogMedicine[] {
  const q = query.trim().toLowerCase();
  if (!q) return catalog;
  return catalog.filter(
    (m) => m.name.toLowerCase().includes(q) || m.strength.toLowerCase().includes(q) || m.salts.some((s) => s.toLowerCase().includes(q)),
  );
}

/** The catalogue entry behind a chip like "Telma 40", or the closest match on its first word. */
export function resolveRecentChip(label: string): CatalogMedicine | undefined {
  return MEDICINE_CATALOG.find((m) => m.name.toLowerCase().startsWith(label.toLowerCase())) ??
    MEDICINE_CATALOG.find((m) => m.name.toLowerCase().startsWith(label.split(' ')[0].toLowerCase()));
}

export function toPrescribed(m: CatalogMedicine): PrescribedMedicine {
  return { name: m.name, strength: m.strength, dosage: m.dosage, frequency: m.frequency, duration: m.duration, food: m.food, instructions: m.instructions };
}
