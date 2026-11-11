import type { AllergyConflict, PrescribedMedicine } from '../types';

interface AllergenGroup {
  /** Patient-recorded allergy names that resolve to this group. */
  names: string[];
  /** Ingredients that are the allergen, or a member of its drug class. */
  direct: string[];
  /** Ingredients with documented cross-reactivity. */
  cross: string[];
  crossNote?: string;
}

const GROUPS: AllergenGroup[] = [
  {
    names: ['penicillin', 'penicillins'],
    direct: ['penicillin', 'amoxicillin', 'ampicillin', 'cloxacillin', 'flucloxacillin', 'piperacillin', 'amoxiclav', 'co-amoxiclav'],
    cross: ['cefalexin', 'cephalexin', 'cefuroxime', 'cefadroxil', 'cefixime', 'cefpodoxime', 'ceftriaxone'],
    crossNote: 'Cephalosporins can cross-react with penicillin.',
  },
  {
    names: ['sulfa', 'sulfa drugs', 'sulpha', 'sulphonamide', 'sulfonamide', 'sulfonamides'],
    direct: ['sulfamethoxazole', 'co-trimoxazole', 'cotrimoxazole', 'sulfasalazine', 'sulfadiazine'],
    cross: ['furosemide', 'torsemide', 'hydrochlorothiazide', 'chlorthalidone'],
    crossNote: 'Non-antibiotic sulfonamide — low but recognised cross-reactivity.',
  },
  {
    names: ['aspirin', 'nsaid', 'nsaids', 'acetylsalicylic acid'],
    direct: ['aspirin', 'acetylsalicylic acid'],
    cross: ['ibuprofen', 'diclofenac', 'naproxen', 'ketorolac', 'mefenamic acid', 'etoricoxib'],
    crossNote: 'NSAIDs can cross-react in aspirin-sensitive patients.',
  },
  {
    names: ['iodinated contrast', 'iodine contrast', 'contrast'],
    direct: ['iohexol', 'iopromide', 'iodixanol'],
    cross: [],
  },
];

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
const hasTerm = (haystack: string, term: string) =>
  new RegExp(`(^|[^a-z])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`).test(haystack);

/** Everything a medicine is known to contain, as searchable lower-case text. */
function contentsOf(med: { name: string; strength: string; salts?: string[] }): string {
  return norm(`${med.name} ${med.strength} ${(med.salts ?? []).join(' ')}`);
}

/**
 * Compares a medicine against the patient's recorded allergies. An allergy the
 * knowledge base does not know is still matched on its literal name, so it can
 * never be silently ignored.
 */
export function checkAllergies(
  med: { name: string; strength: string; salts?: string[] },
  allergies: string[],
): AllergyConflict[] {
  const contents = contentsOf(med);
  const out: AllergyConflict[] = [];
  for (const allergy of allergies) {
    const key = norm(allergy);
    const group = GROUPS.find((g) => g.names.includes(key));
    if (!group) {
      if (hasTerm(contents, key)) out.push({ allergen: allergy, ingredient: allergy, kind: 'direct' });
      continue;
    }
    const direct = group.direct.find((t) => hasTerm(contents, t));
    if (direct) {
      out.push({ allergen: allergy, ingredient: direct, kind: 'direct' });
      continue;
    }
    const cross = group.cross.find((t) => hasTerm(contents, t));
    if (cross) out.push({ allergen: allergy, ingredient: cross, kind: 'cross-reactive', note: group.crossNote });
  }
  return out;
}

/** Conflicts on this medicine not yet covered by an explicit, reasoned override. */
export function unresolvedForMedicine(med: PrescribedMedicine, allergies: string[]): AllergyConflict[] {
  const override = med.allergyOverride;
  return checkAllergies(med, allergies).filter(
    (c) => !(override && override.reason.trim() && override.allergens.includes(c.allergen)),
  );
}

export function unresolvedConflicts(medicines: PrescribedMedicine[], allergies: string[]) {
  return medicines.flatMap((m) => unresolvedForMedicine(m, allergies).map((c) => ({ ...c, medicine: m.name })));
}
