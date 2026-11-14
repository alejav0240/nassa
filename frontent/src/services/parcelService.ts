import { INITIAL_PARCELS } from '../data/mockData';
import { FieldObservation, Parcel } from '../types/agroterra';
import { backendApi, BackendField, BackendFieldPayload } from './apiClient';

const STORAGE_KEY = 'agroterra_parcels_v1';

function fallbackPolygon(field: BackendField) {
  const delta = Math.max(Math.sqrt(field.hectares) * 0.00006, 0.0002);
  return [
    { lat: field.latitude + delta, lng: field.longitude - delta },
    { lat: field.latitude + delta, lng: field.longitude + delta },
    { lat: field.latitude - delta, lng: field.longitude + delta },
    { lat: field.latitude - delta, lng: field.longitude - delta },
  ];
}

function mapBackendField(field: BackendField): Parcel {
  const ring = field.geometry_geojson?.coordinates[0] ?? [];
  const polygon = ring
    .slice(0, -1)
    .map(([lng, lat]) => ({ lat, lng }));

  return {
    id: `backend-${field.id}`,
    backendId: field.id,
    name: field.name,
    location: 'Parcela registrada',
    department: 'Ubicación desde API',
    areaHa: field.hectares,
    crop: field.current_crop,
    plantingDate: 'No registrada',
    estimatedHarvestDate: 'No registrada',
    registeredAt: 'Desde backend',
    monitoringStatus: 'Disponible',
    centroid: { lat: field.latitude, lng: field.longitude },
    polygon: polygon.length >= 3 ? polygon : fallbackPolygon(field),
    elevationM: 0,
    indicators: {
      moisturePct: 0,
      moistureVolumetric: 0,
      temperatureC: 0,
      precipitationMm: 0,
      ndvi: 0,
      soilOrganicCarbon: 'N/D',
      soilTexture: field.soil_texture,
      soilPh: field.soil_ph ?? 0,
      biomassMgHa: 0,
    },
    observations: [],
  };
}

function toBackendPayload(parcel: Parcel): BackendFieldPayload {
  const coordinates = parcel.polygon.map((point) => [point.lng, point.lat]);
  const ring = coordinates.length > 0 && coordinates[0][0] === coordinates.at(-1)?.[0] && coordinates[0][1] === coordinates.at(-1)?.[1]
    ? coordinates
    : [...coordinates, coordinates[0]];

  return {
    name: parcel.name,
    latitude: parcel.centroid.lat,
    longitude: parcel.centroid.lng,
    hectares: parcel.areaHa,
    soil_texture: ['arenosa', 'franca', 'arcillosa', 'desconocida'].includes(parcel.indicators.soilTexture)
      ? parcel.indicators.soilTexture as BackendFieldPayload['soil_texture']
      : 'desconocida',
    irrigation: false,
    current_crop: parcel.crop.toLowerCase() as BackendFieldPayload['current_crop'],
    soil_ph: parcel.indicators.soilPh > 0 ? parcel.indicators.soilPh : null,
    geometry_geojson: ring.length >= 4 ? { type: 'Polygon', coordinates: [ring] } : null,
  };
}

export const parcelService = {
  async loadRemote(): Promise<Parcel[] | null> {
    try {
      const fields = await backendApi.listFields();
      return fields.map(mapBackendField);
    } catch {
      return null;
    }
  },

  async createRemote(parcel: Parcel): Promise<Parcel | null> {
    try {
      return mapBackendField(await backendApi.createField(toBackendPayload(parcel)));
    } catch {
      return null;
    }
  },

  async updateRemote(parcel: Parcel): Promise<Parcel | null> {
    if (!parcel.backendId) return parcel;
    try {
      return mapBackendField(await backendApi.updateField(parcel.backendId, toBackendPayload(parcel)));
    } catch {
      return null;
    }
  },

  async removeRemote(parcel: Parcel): Promise<boolean> {
    if (!parcel.backendId) return true;
    try {
      await backendApi.deleteField(parcel.backendId);
      return true;
    } catch {
      return false;
    }
  },
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
