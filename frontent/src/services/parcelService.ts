import { INITIAL_PARCELS } from '../data/mockData';
import { FieldObservation, Parcel } from '../types/agroterra';

const STORAGE_KEY = 'agroterra_parcels_v1';

export const parcelService = {
  getAll(): Parcel[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PARCELS));
        return INITIAL_PARCELS;
      }
      const parsed = JSON.parse(raw) as Parcel[];
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_PARCELS;
    } catch {
      return INITIAL_PARCELS;
    }
  },

  saveAll(parcels: Parcel[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parcels));
    } catch {
      // Ignore storage quota issues in sandboxed browsers
    }
  },

  create(newParcel: Parcel): Parcel[] {
    const current = this.getAll();
    const updated = [newParcel, ...current];
    this.saveAll(updated);
    return updated;
  },

  update(updatedParcel: Parcel): Parcel[] {
    const current = this.getAll();
    const updated = current.map((p) => (p.id === updatedParcel.id ? updatedParcel : p));
    this.saveAll(updated);
    return updated;
  },

  remove(parcelId: string): Parcel[] {
    const current = this.getAll();
    const updated = current.filter((p) => p.id !== parcelId);
    this.saveAll(updated);
    return updated;
  },

  addObservation(parcelId: string, observation: FieldObservation): Parcel[] {
    const current = this.getAll();
    const updated = current.map((p) =>
      p.id === parcelId
        ? { ...p, observations: [observation, ...p.observations] }
        : p
    );
    this.saveAll(updated);
    return updated;
  },

  deleteObservation(parcelId: string, observationId: string): Parcel[] {
    const current = this.getAll();
    const updated = current.map((p) =>
      p.id === parcelId
        ? { ...p, observations: p.observations.filter((o) => o.id !== observationId) }
        : p
    );
    this.saveAll(updated);
    return updated;
  },

  resetDemo(): Parcel[] {
    this.saveAll(INITIAL_PARCELS);
    return INITIAL_PARCELS;
  },
};
