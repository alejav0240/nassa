/**
 * Small REST client for the FastAPI service. Demo data remains available as a
 * fallback when the API is unavailable, so the UI can be developed offline.
 */
export interface ApiRequestOptions {
  simulateError?: boolean;
  delayMs?: number;
}

export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  mode: 'remote-rest' as 'demo-local' | 'remote-rest',
};

export interface BackendHealth {
  status: string;
  service: string;
  version: string;
}

export interface BackendField {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  hectares: number;
  soil_texture: 'arenosa' | 'franca' | 'arcillosa' | 'desconocida';
  irrigation: boolean;
  current_crop: 'papa' | 'quinua' | 'haba' | 'cebada' | 'avena' | 'tarwi';
  soil_ph: number | null;
  geometry_geojson: {
    type: 'Polygon';
    coordinates: number[][][];
  } | null;
}

export interface BackendFieldPayload {
  name: string;
  latitude: number;
  longitude: number;
  hectares: number;
  soil_texture: BackendField['soil_texture'];
  irrigation: boolean;
  current_crop: BackendField['current_crop'];
  soil_ph: number | null;
  geometry_geojson: BackendField['geometry_geojson'];
}

export interface BackendAnalysis {
  id: number;
  created_at: string;
  climate?: {
    annual_rainfall_mm?: number;
    mean_temperature_c?: number;
    annual_frost_days?: number;
  };
  strategies?: Array<{ id: string; title: string; score: number; explanation: string }>;
  methodology?: { scope?: string; limitations?: string[] };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_CONFIG.baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(import.meta.env.VITE_API_KEY ? { 'X-API-Key': import.meta.env.VITE_API_KEY } : {}),
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    let message = `Error HTTP ${response.status}`;
    try {
      const body = await response.json();
      if (typeof body.detail === 'string') message = body.detail;
    } catch {
      // Keep the HTTP fallback message.
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export const backendApi = {
  health: () => request<BackendHealth>('/health'),
  listFields: () => request<BackendField[]>('/fields?limit=100'),
  analyzeField: (fieldId: number, priorities = { water: 40, soil: 40, income: 20 }) =>
    request<BackendAnalysis>('/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field_id: fieldId, priorities }),
    }),
  createField: (payload: BackendFieldPayload) =>
    request<BackendField>('/fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  updateField: (id: number, payload: BackendFieldPayload) =>
    request<BackendField>(`/fields/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  deleteField: (id: number) =>
    request<void>(`/fields/${id}`, { method: 'DELETE' }),
};

export async function withSimulatedTransport<T>(
  producer: () => T,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { simulateError = false, delayMs = 0 } = options;
  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  if (simulateError) {
    throw new Error('Error simulado de conexión con el servicio de datos.');
  }
  return producer();
}
