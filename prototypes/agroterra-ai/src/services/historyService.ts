import { INITIAL_HISTORY, ROTATION_SCENARIOS } from '../data/mockData';
import { CropHistoryRecord, RotationScenario } from '../types/agroterra';

const STORAGE_KEY = 'agroterra_history_v1';

export const historyService = {
  getAll(): CropHistoryRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_HISTORY));
        return INITIAL_HISTORY;
      }
      return JSON.parse(raw) as CropHistoryRecord[];
    } catch {
      return INITIAL_HISTORY;
    }
  },

  getByParcel(parcelId: string): CropHistoryRecord[] {
    return this.getAll().filter((h) => h.parcelId === parcelId);
  },

  addRecord(record: CropHistoryRecord): CropHistoryRecord[] {
    const current = this.getAll();
    const updated = [record, ...current];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore quota errors
    }
    return updated;
  },

  getRotationScenarios(): RotationScenario[] {
    return ROTATION_SCENARIOS;
  },

  resetDemo(): CropHistoryRecord[] {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_HISTORY));
    } catch {
      // Ignore
    }
    return INITIAL_HISTORY;
  },
};
