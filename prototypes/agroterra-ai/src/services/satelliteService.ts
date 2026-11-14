import { SATELLITE_SOURCES, TIME_SERIES_BY_PARCEL } from '../data/mockData';
import {
  EnvironmentalIndicator,
  Parcel,
  SatelliteSourceId,
  SatelliteSourceSpec,
  SatelliteTimePoint,
} from '../types/agroterra';

export const satelliteService = {
  getSources(): SatelliteSourceSpec[] {
    return SATELLITE_SOURCES;
  },

  getSourceById(id: SatelliteSourceId): SatelliteSourceSpec | undefined {
    return SATELLITE_SOURCES.find((s) => s.id === id);
  },

  getTimeSeriesForParcel(parcel: Parcel): SatelliteTimePoint[] {
    const existing = TIME_SERIES_BY_PARCEL[parcel.id];
    if (existing) return existing;

    // Generate coherent synthetic series for newly drawn/registered parcels
    const baseNdvi = parcel.indicators.ndvi || 0.55;
    const baseTemp = parcel.indicators.temperatureC || 29.5;
    const baseRain = parcel.indicators.precipitationMm || 75;
    const baseMoisture = parcel.indicators.moisturePct || 22;

    const template = TIME_SERIES_BY_PARCEL['parcela-norte'];
    return template.map((pt, idx) => {
      const factor = 0.88 + ((idx % 4) * 0.04);
      const ndvi = Number(Math.min(0.88, Math.max(0.15, pt.ndvi * (baseNdvi / 0.62))).toFixed(2));
      const moisturePct = Math.round(pt.moisturePct * (baseMoisture / 23));
      return {
        ...pt,
        ndvi,
        ndviPreviousSeason: Number(Math.max(0.14, ndvi - 0.04 * factor).toFixed(2)),
        precipitationMm: Math.round(pt.precipitationMm * (baseRain / 85.4)),
        temperatureC: Number((pt.temperatureC + (baseTemp - 31.2) * 0.5).toFixed(1)),
        moisturePct,
        moistureVolumetric: Number((moisturePct / 100).toFixed(2)),
      };
    });
  },

  getIndicatorsForParcel(parcel: Parcel): EnvironmentalIndicator[] {
    return [
      {
        id: 'humedad',
        label: 'Humedad superficial del suelo',
        value: parcel.indicators.moisturePct,
        unit: '%',
        volumetricValue: parcel.indicators.moistureVolumetric,
        source: 'SMAP',
        referenceDate: '2026-11-12',
        resolution: '9 km (diaria)',
        statusLabel: 'Referencia regional',
        quality: parcel.areaHa < 10 ? 'Resolución insuficiente' : 'Información disponible',
        validationState: 'Demostrativo · Referencia regional',
        interpretation:
          parcel.indicators.moisturePct < 20
            ? 'Superficie relativamente seca a escala regional; conviene verificar humedad radicular en parcela.'
            : 'Humedad superficial moderada dentro del rango referencial de la zona.',
      },
      {
        id: 'temperatura',
        label: 'Temperatura superficial',
        value: parcel.indicators.temperatureC,
        unit: '°C',
        source: 'ECOSTRESS',
        referenceDate: '2026-11-11',
        resolution: '~70 m',
        statusLabel: 'Observación disponible',
        quality: 'Información disponible',
        validationState: 'Demostrativo · Observación disponible',
        interpretation:
          parcel.indicators.temperatureC >= 32
            ? 'Temperatura radiométrica elevada; sugiere revisar posible estrés térmico o cobertura del suelo.'
            : 'Temperatura superficial moderada para la hora de observación de referencia.',
      },
      {
        id: 'precipitacion',
        label: 'Precipitación mensual',
        value: parcel.indicators.precipitationMm,
        unit: 'mm',
        source: 'GPM',
        referenceDate: '2026-11-13',
        resolution: '~10 km (30 min)',
        statusLabel: 'Acumulado del período',
        quality: 'Datos parcialmente disponibles',
        validationState: 'Demostrativo · Acumulado del período',
        interpretation:
          parcel.indicators.precipitationMm < 60
            ? 'Acumulado mensual bajo; revisar balance hídrico local y disponibilidad de riego.'
            : 'Aporte pluvial acumulado favorable para el período de crecimiento.',
      },
      {
        id: 'ndvi',
        label: 'Índice NDVI',
        value: parcel.indicators.ndvi,
        unit: 'adim.',
        source: 'Landsat/MODIS',
        referenceDate: '2026-11-09',
        resolution: '30 m / 250 m',
        statusLabel: parcel.indicators.ndvi >= 0.55 ? 'Vegetación activa' : 'Cobertura moderada',
        quality: 'Información disponible',
        validationState: 'Demostrativo · Serie óptica',
        interpretation:
          parcel.indicators.ndvi >= 0.6
            ? 'Vigor y cobertura foliar activos en la serie demostrativa.'
            : 'Cobertura vegetal intermedia o en fase temprana de desarrollo.',
      },
      {
        id: 'biomasa',
        label: 'Biomasa / estructura vegetal',
        value: parcel.indicators.biomassMgHa,
        unit: 'Mg/ha',
        source: 'GEDI',
        referenceDate: '2026-10-19',
        resolution: 'Huellas ~25 m',
        statusLabel: 'Si aplica / Muestreo',
        quality: 'Datos parcialmente disponibles',
        validationState: 'Demostrativo · No mide rendimiento',
        interpretation:
          'Referencia estructural LiDAR si existen trazas válidas; no es una medida directa del rendimiento agrícola.',
      },
      {
        id: 'suelo',
        label: 'Propiedades del suelo',
        value: `${parcel.indicators.soilTexture} · pH ${parcel.indicators.soilPh}`,
        unit: parcel.indicators.soilOrganicCarbon,
        source: 'SoilGrids',
        referenceDate: 'Ref. base 2024',
        resolution: '250 m',
        statusLabel: 'Estimación de referencia',
        quality: 'Requiere validación local',
        validationState: 'Demostrativo · Referencia zonal',
        interpretation:
          'Caracterización edáfica orientativa a 250 m; no sustituye análisis de laboratorio en campo.',
      },
    ];
  },
};
