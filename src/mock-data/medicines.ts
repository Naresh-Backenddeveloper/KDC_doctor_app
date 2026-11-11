import type { CatalogMedicine } from '../types';

const med = (
  id: string,
  name: string,
  strength: string,
  salts: string[],
  frequency: string,
  duration: string,
  food: string,
  instructions: string,
  dosage = '1 tablet',
): CatalogMedicine => ({ id, name, strength, salts, dosage, frequency, duration, food, instructions });

/** Illustrative formulary for the prototype; not a clinical reference. */
export const MEDICINE_CATALOG: CatalogMedicine[] = [
  med('m01', 'Telma 40 Tablet', 'Telmisartan 40 mg', ['Telmisartan'], 'Once daily', '30 days', 'After food', 'Take at the same time each day.'),
  med('m02', 'Telma AM Tablet', 'Telmisartan 40 mg + Amlodipine 5 mg', ['Telmisartan', 'Amlodipine'], 'Once daily', '30 days', 'After food', 'Take in the morning. Do not stop without advice.'),
  med('m03', 'Rosuvas 10 Tablet', 'Rosuvastatin 10 mg', ['Rosuvastatin'], 'Once daily — bedtime', '30 days', 'After food', 'Report muscle pain or weakness immediately.'),
  med('m04', 'Rosuvas 20 Tablet', 'Rosuvastatin 20 mg', ['Rosuvastatin'], 'Once daily — bedtime', '30 days', 'After food', 'Report muscle pain or weakness immediately.'),
  med('m05', 'Ecosprin 75 Tablet', 'Aspirin 75 mg', ['Aspirin'], 'Once daily', '30 days', 'After food', 'Take with a full glass of water.'),
  med('m06', 'Clopilet 75 Tablet', 'Clopidogrel 75 mg', ['Clopidogrel'], 'Once daily', '30 days', 'After food', 'Do not stop without advice.'),
  med('m07', 'Met XL 25 Tablet', 'Metoprolol succinate 25 mg', ['Metoprolol'], 'Once daily', '30 days', 'After food', 'Do not stop suddenly.'),
  med('m08', 'Nitrocontin 2.6 Tablet', 'Glyceryl trinitrate 2.6 mg', ['Glyceryl trinitrate'], 'Twice daily', '30 days', 'After food', 'Avoid alcohol. May cause headache.'),
  med('m09', 'Glycomet 500 Tablet', 'Metformin 500 mg', ['Metformin'], 'Twice daily', '30 days', 'With food', 'Take with meals to reduce stomach upset.'),
  med('m10', 'Thyronorm 50 Tablet', 'Levothyroxine 50 mcg', ['Levothyroxine'], 'Once daily', '30 days', 'Empty stomach', 'Take 30 minutes before breakfast.'),
  med('m11', 'Lasix 40 Tablet', 'Furosemide 40 mg', ['Furosemide'], 'Once daily', '14 days', 'Before food', 'Take in the morning.'),
  med('m12', 'Aldactone 25 Tablet', 'Spironolactone 25 mg', ['Spironolactone'], 'Once daily', '30 days', 'After food', 'Avoid potassium supplements.'),
  med('m13', 'Pan 40 Tablet', 'Pantoprazole 40 mg', ['Pantoprazole'], 'Once daily', '14 days', 'Before food', 'Take 30 minutes before breakfast.'),
  med('m14', 'Mox 500 Capsule', 'Amoxicillin 500 mg', ['Amoxicillin'], 'Three times daily', '5 days', 'After food', 'Complete the full course.', '1 capsule'),
  med('m15', 'Augmentin 625 Duo Tablet', 'Amoxicillin 500 mg + Clavulanic acid 125 mg', ['Amoxicillin', 'Clavulanic acid'], 'Twice daily', '5 days', 'After food', 'Complete the full course.'),
  med('m16', 'Taxim-O 200 Tablet', 'Cefixime 200 mg', ['Cefixime'], 'Twice daily', '5 days', 'After food', 'Complete the full course.'),
  med('m17', 'Azee 500 Tablet', 'Azithromycin 500 mg', ['Azithromycin'], 'Once daily', '3 days', 'Empty stomach', 'Complete the full course.'),
  med('m18', 'Septran DS Tablet', 'Sulfamethoxazole 800 mg + Trimethoprim 160 mg', ['Sulfamethoxazole', 'Trimethoprim', 'Co-trimoxazole'], 'Twice daily', '5 days', 'After food', 'Drink plenty of water.'),
  med('m19', 'Brufen 400 Tablet', 'Ibuprofen 400 mg', ['Ibuprofen'], 'Three times daily', '3 days', 'After food', 'Avoid on an empty stomach.'),
  med('m20', 'Voveran 50 Tablet', 'Diclofenac 50 mg', ['Diclofenac'], 'Twice daily', '3 days', 'After food', 'Avoid on an empty stomach.'),
  med('m21', 'Dolo 650 Tablet', 'Paracetamol 650 mg', ['Paracetamol'], 'As needed', '3 days', 'After food', 'Maximum 4 tablets in 24 hours.'),
];
