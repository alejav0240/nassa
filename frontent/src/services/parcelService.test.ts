import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Parcel } from '../types/agroshift';

const api = vi.hoisted(() => ({
  listFields: vi.fn(),
  createField: vi.fn(),
  updateField: vi.fn(),
  deleteField: vi.fn(),
}));

vi.mock('./apiClient', () => ({ backendApi: api }));

import { parcelService } from './parcelService';
import { getBackendCropId } from './parcelService';

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

const localParcel = {
  id: 'local-parcel-1', name: 'Parcela local', location: 'Viacha', department: 'La Paz', areaHa: 1.5,
  crop: 'papa', plantingDate: '2025-10-01', estimatedHarvestDate: '2026-03-01', registeredAt: '2025-10-01',
  monitoringStatus: 'Disponible', centroid: { lat: -16.57, lng: -68.69 },
  polygon: [{ lat: -16.56, lng: -68.7 }, { lat: -16.56, lng: -68.68 }, { lat: -16.58, lng: -68.68 }],
  indicatorsAvailable: true, elevationM: 3800, indicators: { moisturePct: 25, moistureVolumetric: .2, temperatureC: 12,
    precipitationMm: 4, ndvi: .5, soilOrganicCarbon: '2%', soilTexture: 'franca', soilPh: 6.2, biomassMgHa: 2 },
  observations: [{ id: 'observation-1', date: '2025-11-01', author: 'Agricultor', note: 'Revisión', category: 'General' }],
} as unknown as Parcel;

describe('parcel synchronization mapping', () => {
  it('keeps local parcels when the backend returns an empty list', async () => {
    api.listFields.mockResolvedValue([]);
    await expect(parcelService.loadRemote([localParcel])).resolves.toEqual([localParcel]);
  });

  it('links a backend row by client_ref without replacing local geometry or observations', async () => {
    api.listFields.mockResolvedValue([{
      id: 42, client_ref: localParcel.id, name: 'Parcela local', latitude: -16.57, longitude: -68.69,
      hectares: 1.5, soil_texture: 'franca', irrigation: false, current_crop: 'papa', soil_ph: 6.2,
      geometry_geojson: null,
    }]);

    const merged = await parcelService.loadRemote([localParcel]);

    expect(merged).toHaveLength(1);
    expect(merged?.[0]).toMatchObject({
      id: localParcel.id, backendId: 42, polygon: localParcel.polygon, observations: localParcel.observations,
    });
  });

  it('sends the local identity as the idempotency reference on creation', async () => {
    api.createField.mockResolvedValue({
      id: 43, client_ref: localParcel.id, name: 'Parcela local', latitude: -16.57, longitude: -68.69,
      hectares: 1.5, soil_texture: 'franca', irrigation: false, current_crop: 'papa', soil_ph: 6.2,
      geometry_geojson: null,
    });

    await parcelService.createRemote(localParcel);

    expect(api.createField).toHaveBeenCalledWith(expect.objectContaining({ client_ref: localParcel.id }));
  });

  it('normalizes supported crop labels and refuses to collapse mixed crops', () => {
    expect(getBackendCropId('Maíz')).toBe('maiz');
    expect(getBackendCropId('Haba (Vicia faba)')).toBe('haba');
    expect(getBackendCropId('Haba / Tarwi')).toBeNull();
    expect(getBackendCropId('Descanso / Barbecho')).toBeNull();
  });
});
