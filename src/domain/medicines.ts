/* eslint-disable @typescript-eslint/no-require-imports -- lazy requires break import cycles between stores and live services */
import { create } from 'zustand';
import type { CatalogMedicine, PrescribedMedicine } from '../types';
import { MEDICINE_CATALOG } from '../mock-data/medicines';
import { LIVE } from '../services/config';

/**
 * Live: the catalogue is the pharmacy's (GET /doctor/medicines?q=, 20 per search).
 * Results are cached per query in this store; `searchMedicines` returns what is cached
 * and fetches the rest, and screens that read `useMedicineSearch((s) => s.version)`
 * re-render when it arrives. Every medicine seen is remembered with its catalogue code
 * and composition, which the server's allergy check needs when the prescription is sent.
 */
export interface KnownMedicine {
  code: string;
  salts: string[];
  generic: string;
}

interface SearchState {
  byQuery: Record<string, CatalogMedicine[]>;
  version: number;
}

export const useMedicineSearch = create<SearchState>(() => ({ byQuery: {}, version: 0 }));
const known = new Map<string, KnownMedicine>();
const inFlight = new Set<string>();

/** The catalogue code and composition behind a medicine name, if the doctor picked it from a search. */
export const knownMedicine = (name: string) => known.get(name.trim().toLowerCase());

/** Fills the cache for one query (exported for tests and preloading). */
export async function fetchMedicines(query: string): Promise<CatalogMedicine[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const { api } = (require('../services/live/http') as typeof import('../services/live/http'));
  const rows = await api.get<{ code: string; name: string; strength: string | null; generic: string; salts: string[] }[]>(`doctor/medicines?q=${encodeURIComponent(q)}`);
  const found: CatalogMedicine[] = rows.map((m) => {
    known.set(m.name.trim().toLowerCase(), { code: m.code, salts: m.salts ?? [], generic: m.generic });
    return { id: m.code, name: m.name, strength: m.strength ?? '', salts: m.salts ?? [], dosage: '1 tablet', frequency: 'Twice daily', duration: '5 days', food: 'After food', instructions: '' };
  });
  useMedicineSearch.setState((s) => ({ byQuery: { ...s.byQuery, [q]: found }, version: s.version + 1 }));
  return found;
}

function liveSearch(query: string): CatalogMedicine[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const { byQuery } = useMedicineSearch.getState();
  if (byQuery[q]) return byQuery[q];
  if (!inFlight.has(q)) {
    inFlight.add(q);
    fetchMedicines(q)
      .catch(() => undefined)
      .finally(() => inFlight.delete(q));
  }
  // While it loads: the closest cached query's matches, filtered locally.
  const prefix = Object.keys(byQuery)
    .filter((k) => q.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return prefix ? filterCatalog(byQuery[prefix], q) : [];
}

function filterCatalog(catalog: CatalogMedicine[], q: string) {
  return catalog.filter((m) => m.name.toLowerCase().includes(q) || m.strength.toLowerCase().includes(q) || m.salts.some((s) => s.toLowerCase().includes(q)));
}

export const DOSAGE_OPTIONS = ['½ tablet', '1 tablet', '2 tablets', '1 capsule', '5 ml', '10 ml', '1 puff', 'As directed'];
export const FREQUENCY_OPTIONS = ['Once daily', 'Once daily — bedtime', 'Twice daily', 'Three times daily', 'Four times daily', 'Every 8 hours', 'As needed'];
export const DURATION_OPTIONS = ['3 days', '5 days', '7 days', '10 days', '14 days', '30 days', '60 days', '90 days', 'Ongoing'];
export const FOOD_OPTIONS = ['Before food', 'After food', 'With food', 'Empty stomach', 'Any time'];

/** Matches brand, strength or salt, so "amox" finds the combination products too. */
export function searchMedicines(query: string, catalog: CatalogMedicine[] = MEDICINE_CATALOG): CatalogMedicine[] {
  if (LIVE && catalog === MEDICINE_CATALOG) return liveSearch(query);
  const q = query.trim().toLowerCase();
  if (!q) return catalog;
  return filterCatalog(catalog, q);
}

/** The catalogue entry behind a chip like "Telma 40", or the closest match on its first word. */
export function resolveRecentChip(label: string): CatalogMedicine | undefined {
  if (LIVE) {
    const q = label.toLowerCase();
    const all = Object.values(useMedicineSearch.getState().byQuery).flat();
    return all.find((m) => m.name.toLowerCase().startsWith(q)) ?? all.find((m) => m.name.toLowerCase().startsWith(q.split(' ')[0]));
  }
  return MEDICINE_CATALOG.find((m) => m.name.toLowerCase().startsWith(label.toLowerCase())) ??
    MEDICINE_CATALOG.find((m) => m.name.toLowerCase().startsWith(label.split(' ')[0].toLowerCase()));
}

export function toPrescribed(m: CatalogMedicine): PrescribedMedicine {
  return { name: m.name, strength: m.strength, dosage: m.dosage, frequency: m.frequency, duration: m.duration, food: m.food, instructions: m.instructions };
}
