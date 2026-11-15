import { INITIAL_ALERTS } from '../data/mockData';
import { AppAlert } from '../types/agroshift';

const STORAGE_KEY = 'agroterra_alerts_v1';

export const alertService = {
  getAll(): AppAlert[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ALERTS));
        return INITIAL_ALERTS;
      }
      return JSON.parse(raw) as AppAlert[];
    } catch {
      return INITIAL_ALERTS;
    }
  },

  markAsRead(alertId: string): AppAlert[] {
    const current = this.getAll();
    const updated = current.map((a) => (a.id === alertId ? { ...a, read: true } : a));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
    return updated;
  },

  markAllRead(): AppAlert[] {
    const current = this.getAll();
    const updated = current.map((a) => ({ ...a, read: true }));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
    return updated;
  },

  resetDemo(): AppAlert[] {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ALERTS));
    } catch {
      // Ignore
    }
    return INITIAL_ALERTS;
  },
};
