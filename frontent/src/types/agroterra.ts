export type NavTab = 'inicio' | 'mapa' | 'parcelas' | 'analisis' | 'perfil';

export type AnalysisSubTab = 'satelital' | 'fusion' | 'fuentes' | 'insights' | 'historial';

export type MonitoringStatus = 'Disponible' | 'Parcial' | 'En revisión';

export type DataQualityLevel =
  | 'Información disponible'
  | 'Datos parcialmente disponibles'
  | 'Resolución insuficiente'
  | 'Requiere validación local';

export type SatelliteSourceId =
  | 'SMAP'
  | 'ECOSTRESS'
  | 'GPM'
  | 'Landsat'
  | 'MODIS'
  | 'GEDI'
  | 'SoilGrids'
  | 'OSM';

export type SourceTag =
  | 'humedad'
  | 'temperatura'
  | 'lluvia'
  | 'vegetación'
  | 'biomasa'
  | 'suelo'
  | 'mapa base';

export type MapLayerId =
  | 'osm'
  | 'humedad'
  | 'temperatura'
  | 'precipitacion'
  | 'ndvi'
  | 'biomasa'
  | 'suelo';

export type AlertCategory =
  | 'Cambio NDVI'
  | 'Déficit hídrico'
  | 'Temperatura elevada'
  | 'Actualización satelital'
  | 'Datos faltantes'
  | 'Observación en campo';

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface EnvironmentalIndicator {
  id: 'humedad' | 'temperatura' | 'precipitacion' | 'ndvi' | 'biomasa' | 'suelo';
  label: string;
  value: number | string;
  unit: string;
  volumetricValue?: number; // m3/m3 for soil moisture
  source: string;
  referenceDate: string;
  resolution: string;
  statusLabel: string;
  quality: DataQualityLevel;
  validationState: string;
  interpretation: string;
}

export interface FieldObservation {
  id: string;
  date: string;
  author: string;
  note: string;
  category: 'Riego' | 'Fenología' | 'Suelo' | 'Sanidad' | 'General';
}

export interface ParcelBoundingBox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

export interface ParcelMeasurement {
  areaM2: number;
  areaHa: number;
  perimeterM: number;
  vertexCount: number;
  centroid: LatLngPoint;
  bbox: ParcelBoundingBox;
  measuredAt: string;
  source: 'drawn' | 'gps' | 'imported';
  valid: boolean;
  warnings: string[];
}

export interface Parcel {
  id: string;
  name: string;
  location: string;
  department: string;
  areaHa: number;
  /** Medición geodésica del polígono. Su ausencia indica superficie declarada manualmente. */
  measurement?: ParcelMeasurement;
  crop: string;
  plantingDate: string;
  estimatedHarvestDate: string;
  registeredAt: string;
  monitoringStatus: MonitoringStatus;
  centroid: LatLngPoint;
  polygon: LatLngPoint[];
  imageUrl?: string;
  elevationM: number;
  indicators: {
    moisturePct: number;
    moistureVolumetric: number;
    temperatureC: number;
    precipitationMm: number;
    ndvi: number;
    soilOrganicCarbon: string;
    soilTexture: string;
    soilPh: number;
    soilBulkDensity?: string;
    biomassMgHa: number;
  };
  observations: FieldObservation[];
}

export interface SatelliteTimePoint {
  period: string;
  dateISO: string;
  ndvi: number;
  ndviPreviousSeason: number;
  precipitationMm: number;
  temperatureC: number;
  moisturePct: number;
  moistureVolumetric: number;
  quality: DataQualityLevel;
  missingFlag?: boolean;
}

export interface SatelliteSourceSpec {
  id: SatelliteSourceId;
  name: string;
  subtitle: string;
  tag: SourceTag;
  agency: string;
  accessSource: string;
  variable: string;
  whatItMeasures: string;
  purpose: string;
  appUsage: string;
  unit: string;
  spatialResolution: string;
  spatialResolutionMeters: number;
  temporalResolution: string;
  detailLevel: string;
  lastObservationDate: string;
  clarification?: string;
  limitations: string;
  quality: DataQualityLevel;
}

export interface CropHistoryRecord {
  id: string;
  parcelId: string;
  season: string;
  crop: string;
  isFallow: boolean;
  plantingDate: string;
  harvestDate: string;
  observations: string;
  avgNdvi: number | null;
  totalPrecipitationMm: number;
  avgTempC: number;
  avgMoisturePct: number;
}

export interface RotationScenario {
  id: string;
  title: string;
  sequence: string[];
  targetRegion: string;
  summary: string;
  waterNote: string;
  soilNote: string;
  caveat: string;
}

export interface SimulatedInsight {
  id: string;
  parcelId: string;
  category: 'Evolución de vegetación' | 'Condiciones hídricas' | 'Cambios estacionales' | 'Validación local';
  title: string;
  message: string;
  sourceSummary: string;
  referenceDate: string;
  quality: DataQualityLevel;
  validationState: string;
}

export interface AppAlert {
  id: string;
  parcelId: string;
  parcelName: string;
  category: AlertCategory;
  severity: 'info' | 'warning' | 'alert';
  title: string;
  summary: string;
  detail: string;
  date: string;
  source: string;
  read: boolean;
  isSimulated: true;
}

export interface UserPreferences {
  moistureUnit: 'percent' | 'volumetric';
  simulateDeviceFrame: boolean;
  notifications: Record<AlertCategory, boolean>;
}

export interface UserProfile {
  name: string;
  role: string;
  organization: string;
  region: string;
  email: string;
}
