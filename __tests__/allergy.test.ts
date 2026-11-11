import { checkAllergies, unresolvedConflicts, unresolvedForMedicine } from '../src/domain/allergy';
import { searchMedicines, toPrescribed } from '../src/domain/medicines';
import { MEDICINE_CATALOG } from '../src/mock-data/medicines';
import type { PrescribedMedicine } from '../src/types';

const med = (id: string) => MEDICINE_CATALOG.find((m) => m.id === id)!;

describe('allergy check', () => {
  it('flags a penicillin-class antibiotic for a penicillin allergy', () => {
    const conflicts = checkAllergies(med('m14'), ['Penicillin']);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({ allergen: 'Penicillin', ingredient: 'amoxicillin', kind: 'direct' });
  });

  it('finds the allergen inside a combination product', () => {
    expect(checkAllergies(med('m15'), ['Penicillin'])[0].kind).toBe('direct');
  });

  it('warns about cephalosporin cross-reactivity as distinct from a direct hit', () => {
    const [conflict] = checkAllergies(med('m16'), ['Penicillin']);
    expect(conflict.kind).toBe('cross-reactive');
    expect(conflict.note).toMatch(/Cephalosporin/);
  });

  it('is case-insensitive for the recorded allergy', () => {
    expect(checkAllergies(med('m14'), ['penicillin'])).toHaveLength(1);
    expect(checkAllergies(med('m14'), ['PENICILLIN'])).toHaveLength(1);
  });

  it('matches aspirin and sulfa allergies against their products', () => {
    expect(checkAllergies(med('m05'), ['Aspirin'])[0].kind).toBe('direct');
    expect(checkAllergies(med('m19'), ['Aspirin'])[0].kind).toBe('cross-reactive');
    expect(checkAllergies(med('m18'), ['Sulfa drugs'])[0].kind).toBe('direct');
  });

  it('does not flag unrelated medicines', () => {
    expect(checkAllergies(med('m02'), ['Penicillin'])).toEqual([]);
    expect(checkAllergies(med('m14'), [])).toEqual([]);
  });

  it('still matches an unknown allergy on its literal name', () => {
    expect(checkAllergies({ name: 'Zolgensma', strength: 'Onasemnogene 2e13 vg' }, ['Onasemnogene'])).toHaveLength(1);
  });

  it('needs a reasoned override covering every conflicting allergen', () => {
    const amox: PrescribedMedicine = toPrescribed(med('m14'));
    expect(unresolvedForMedicine(amox, ['Penicillin'])).toHaveLength(1);
    const noReason = { ...amox, allergyOverride: { allergens: ['Penicillin'], reason: '  ', at: 'x' } };
    expect(unresolvedForMedicine(noReason, ['Penicillin'])).toHaveLength(1);
    const wrongAllergen = { ...amox, allergyOverride: { allergens: ['Aspirin'], reason: 'needed', at: 'x' } };
    expect(unresolvedForMedicine(wrongAllergen, ['Penicillin'])).toHaveLength(1);
    const ok = { ...amox, allergyOverride: { allergens: ['Penicillin'], reason: 'Specialist-supervised', at: 'x' } };
    expect(unresolvedForMedicine(ok, ['Penicillin'])).toEqual([]);
  });

  it('reports unresolved conflicts per medicine across a whole prescription', () => {
    const list = unresolvedConflicts([toPrescribed(med('m14')), toPrescribed(med('m02'))], ['Penicillin']);
    expect(list).toHaveLength(1);
    expect(list[0].medicine).toBe('Mox 500 Capsule');
  });
});

describe('medicine search', () => {
  it('finds by brand, salt and strength', () => {
    expect(searchMedicines('telma').map((m) => m.id)).toEqual(['m01', 'm02']);
    expect(searchMedicines('rosuvastatin')).toHaveLength(2);
    expect(searchMedicines('zzz')).toEqual([]);
  });
});
