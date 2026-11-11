import { create } from 'zustand';

interface SelectionState {
  apptId: string | null;
  patientId: string | null;
  reportId: string | null;
  rxKey: string | null;
  viewRxId: string | null;
  ticketId: string | null;
  blockFromKey: string | null;
  select: (patch: Partial<Omit<SelectionState, 'select' | 'reset'>>) => void;
  reset: () => void;
}

const EMPTY = { apptId: null, patientId: null, reportId: null, rxKey: null, viewRxId: null, ticketId: null, blockFromKey: null };

/**
 * Which record the current screens are about. Deliberately not persisted, so a
 * cold open shows the blueprint's default record rather than the last one viewed.
 */
export const useSelection = create<SelectionState>()((set) => ({
  ...EMPTY,
  select: (patch) => set(patch),
  reset: () => set(EMPTY),
}));
