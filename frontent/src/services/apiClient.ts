/**
 * Small REST client for the FastAPI service. Demo data remains available as a
 * fallback when the API is unavailable, so the UI can be developed offline.
 */
export interface ApiRequestOptions {
  simulateError?: boolean;
  delayMs?: number;
}

export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
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
  field_id: number;
  created_at: string;
  priorities: { water: number; soil: number; income: number };
  climate: {
    source: string;
    source_url: string;
    data_type: string;
    summary_version: number;
    data_quality: {
      complete_years: number[];
      excluded_years: number[];
      policy: string;
    };
    years: number[];
    annual_rainfall_mm: number;
    annual_rainfall_by_year: Record<string, number>;
    rainfall_variability_pct: number | null;
    annual_frost_days: number;
    mean_temperature_c: number;
    monthly: Array<{
      month: number;
      precipitation_mm: number | null;
      temperature_c: number | null;
      frost_days_per_year: number;
      heat_days_per_year: number;
    }>;
    limitations: string[];
    query_coordinates: { latitude: number; longitude: number } | null;
    requested_coordinates?: { latitude: number; longitude: number };
    cache_grouping_note?: string;
  };
  strategies: Array<{
    id: string;
    title: string;
    crops: Array<{ id: string; label: string }>;
    score: number;
    scores: { water: number; soil: number; income: number };
    explanation: string;
    benefits: string[];
    risks: string[];
    flagged_for_review: boolean;
  }>;
  methodology: {
    method: string;
    formula: string;
    nasa_source: string;
    crop_coefficients: Record<string, unknown>;
    scope: string;
    limitations: string[];
  };
  history?: Array<{ id: number; field_id: number; crop: string; start_date: string; end_date: string; notes: string }>;
  field_snapshot?: BackendField;
  history_note?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_CONFIG.baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
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
