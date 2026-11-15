/**
 * Small REST client for the FastAPI service. Demo data remains available as a
 * fallback when the API is unavailable, so the UI can be developed offline.
 */
export interface ApiRequestOptions {
  simulateError?: boolean;
  delayMs?: number;
}

export type ApiErrorKind = 'network' | 'timeout' | 'gateway' | 'http';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly kind: ApiErrorKind,
    public readonly status?: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ApiError';
  }
}

function apiBaseUrl(value?: string): string {
  const base = value?.trim().replace(/\/+$/, '') || '/api';
  return base.endsWith('/api') ? base : `${base}/api`;
}

export const API_CONFIG = {
  baseUrl: apiBaseUrl(import.meta.env.VITE_API_BASE_URL),
  mode: 'remote-rest' as 'demo-local' | 'remote-rest',
};

export interface BackendHealth {
  status: string;
  service: string;
  version: string;
}

export interface BackendField {
  id: number;
  client_ref?: string | null;
  name: string;
  latitude: number;
  longitude: number;
  hectares: number;
  soil_texture: 'arenosa' | 'franca' | 'arcillosa' | 'desconocida';
  irrigation: boolean;
  current_crop: 'papa' | 'quinua' | 'canahua' | 'cebada' | 'avena' | 'haba' | 'oca' | 'tarwi' | 'maiz' | 'trigo' | 'arveja' | 'arroz' | 'soya';
  soil_ph: number | null;
  geometry_geojson: {
    type: 'Polygon';
    coordinates: number[][][];
  } | null;
}

export interface BackendFieldPayload {
  client_ref?: string | null;
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

export interface BackendCampaign {
  id: number;
  field_id: number;
  crop: BackendField['current_crop'];
  start_date: string;
  end_date: string;
  notes: string;
}

export interface ClimateAnomalies {
  availability: 'ready';
  model_id: string;
  version: string;
  source: string;
  location: { latitude: number; longitude: number };
  reference_period: string[];
  evaluation_period: string[];
  observations: { training: number; evaluation: number };
  data_quality: { missing_pct: number; missing_or_invalid_days: number };
  score_semantics: string;
  evaluation: { flagged_days: number; flagged_pct: number };
  anomalies: Array<{
    date: string;
    score: number;
    observed: { rain_30d_mm: number; tmin_c: number; frost_7d: number; dry_spell_days: number };
    explanation: string;
  }>;
  limitations: string[];
}

export interface BackendRecommendation {
  id: string;
  label: string;
  region: string;
  harvest_days: string;
  products: string;
  food_safety_risks: string;
  notes: string;
  score: number;
  status: 'compatible' | 'revisar' | 'no_priorizar';
  is_current: boolean;
  reasons: string[];
  risks: string[];
  criteria: Record<string, {
    score: number;
    label?: string;
    observed_mm?: number;
    threshold_mm?: number;
    observed_days?: number;
    threshold_days?: number;
  }>;
}

export interface BackendRecommendations {
  field_id: number;
  source: string[];
  climate_years: number[];
  data_quality?: { complete_years: number[]; excluded_years: number[]; policy: string };
  recommendations: BackendRecommendation[];
  methodology: { formula: string; scope: string; limitations: string[] };
}

async function request<T>(path: string, init?: RequestInit, timeoutMs = 0): Promise<T> {
  const url = `${API_CONFIG.baseUrl}${path}`;
  let response: Response;
  const controller = new AbortController();
  const timeout = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
  try {
    response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init?.headers || {}),
      },
    });
  } catch (cause) {
    const timedOut = cause instanceof Error && cause.name === 'AbortError';
    throw new ApiError(
      timedOut
        ? `La API no respondió en ${Math.round(timeoutMs / 1000)} segundos.`
        : `No se pudo conectar con la API (${url}). Comprueba FastAPI y el proxy de Vite.`,
      timedOut ? 'timeout' : 'network',
      undefined,
      { cause },
    );
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }

  if (!response.ok) {
    const gatewayFailure = response.status === 502 || response.status === 504;
    let message = response.status === 504
      ? 'El proxy agotó el tiempo de espera al consultar FastAPI (HTTP 504).'
      : response.status === 502
        ? 'El proxy recibió HTTP 502. FastAPI no respondió en la dirección configurada.'
      : `Error HTTP ${response.status}`;
    try {
      const body: unknown = await response.json();
      if (body && typeof body === 'object' && 'detail' in body && typeof body.detail === 'string') {
        message = body.detail;
      }
    } catch {
      // Keep the HTTP fallback message.
    }
    throw new ApiError(message, gatewayFailure ? 'gateway' : 'http', response.status);
  }
  try {
    return await response.json() as T;
  } catch (cause) {
    throw new ApiError('La API respondió, pero el cuerpo no contiene JSON válido.', 'http', response.status, { cause });
  }
}

function isClimateAnomalies(value: unknown): value is ClimateAnomalies {
  if (!value || typeof value !== 'object') return false;
  const result = value as Partial<ClimateAnomalies>;
  return result.availability === 'ready'
    && typeof result.model_id === 'string'
    && typeof result.version === 'string'
    && typeof result.source === 'string'
    && Array.isArray(result.reference_period)
    && Array.isArray(result.evaluation_period)
    && typeof result.observations?.evaluation === 'number'
    && typeof result.data_quality?.missing_pct === 'number'
    && typeof result.data_quality?.missing_or_invalid_days === 'number'
    && typeof result.evaluation?.flagged_days === 'number'
    && typeof result.evaluation?.flagged_pct === 'number'
    && Array.isArray(result.anomalies)
    && result.anomalies.every((row) => Boolean(row)
      && typeof row.date === 'string'
      && typeof row.score === 'number'
      && typeof row.explanation === 'string'
      && typeof row.observed?.rain_30d_mm === 'number'
      && typeof row.observed?.tmin_c === 'number'
      && typeof row.observed?.frost_7d === 'number'
      && typeof row.observed?.dry_spell_days === 'number')
    && Array.isArray(result.limitations);
}

async function getClimateAnomalies(fieldId?: number): Promise<ClimateAnomalies> {
  const response = await request<unknown>(`/ml/climate-anomalies${fieldId ? `?field_id=${fieldId}` : ''}`, undefined, 20_000);
  if (!isClimateAnomalies(response)) {
    throw new ApiError('La API devolvió una estructura incompatible para el análisis de anomalías.', 'http', 200);
  }
  return response;
}

export const backendApi = {
  climateAnomalies: (fieldId?: number) => getClimateAnomalies(fieldId),
  health: () => request<BackendHealth>('/health'),
  listFields: () => request<BackendField[]>('/fields?limit=100'),
  analyzeField: (fieldId: number, priorities = { water: 40, soil: 40, income: 20 }) =>
    request<BackendAnalysis>('/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field_id: fieldId, priorities }),
    }),
  recommendCrops: (fieldId: number, limit = 6) =>
    request<BackendRecommendations>('/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field_id: fieldId, limit }),
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
  listCampaigns: (fieldId: number) => request<BackendCampaign[]>(`/fields/${fieldId}/campaigns`),
  createCampaign: (fieldId: number, payload: Omit<BackendCampaign, 'id' | 'field_id'>) =>
    request<BackendCampaign>(`/fields/${fieldId}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
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
