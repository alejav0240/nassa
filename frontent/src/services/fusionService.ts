import { SATELLITE_SOURCES, SIMULATED_INSIGHTS } from '../data/mockData';
import { Parcel, SatelliteSourceId, SimulatedInsight } from '../types/agroshift';
import { checkSpatialRepresentativeness } from '../utils/geo';
import { getParcelAreaHa } from '../utils/parcelGeometry';

export interface FusionComparisonPreset {
  id: string;
  label: string;
  primaryKey: 'precipitationMm' | 'ndvi' | 'temperatureC' | 'moisturePct';
  secondaryKey: 'moisturePct' | 'temperatureC' | 'precipitationMm' | 'ndviPreviousSeason';
  primaryLabel: string;
  secondaryLabel: string;
  primaryUnit: string;
  secondaryUnit: string;
  sources: SatelliteSourceId[];
  explanation: string;
}

export const FUSION_PRESETS: FusionComparisonPreset[] = [
  {
    id: 'rain-vs-moisture',
    label: 'Precipitación vs. Humedad superficial',
    primaryKey: 'precipitationMm',
    secondaryKey: 'moisturePct',
    primaryLabel: 'Precipitación (GPM)',
    secondaryLabel: 'Humedad superficial (SMAP)',
    primaryUnit: 'mm',
    secondaryUnit: '%',
    sources: ['GPM', 'SMAP', 'SoilGrids'],
    explanation:
      'Relaciona el aporte pluvial estimado a escala de cuenca (11 km) con la respuesta de humedad en los primeros 5 cm (9 km) y la textura del suelo.',
  },
  {
    id: 'ndvi-vs-temp',
    label: 'NDVI vs. Temperatura superficial',
    primaryKey: 'ndvi',
    secondaryKey: 'temperatureC',
    primaryLabel: 'NDVI (Landsat/MODIS)',
    secondaryLabel: 'Temp. superficial (ECOSTRESS)',
    primaryUnit: 'adim.',
    secondaryUnit: '°C',
    sources: ['Landsat', 'MODIS', 'ECOSTRESS'],
    explanation:
      'Contrasta el vigor vegetal con la temperatura radiométrica del dosel. Mayor cobertura foliar suele asociarse a menor calentamiento del suelo desnudo.',
  },
  {
    id: 'ndvi-vs-rain',
    label: 'NDVI vs. Precipitación mensual',
    primaryKey: 'ndvi',
    secondaryKey: 'precipitationMm',
    primaryLabel: 'NDVI (Landsat/MODIS)',
    secondaryLabel: 'Precipitación (GPM)',
    primaryUnit: 'adim.',
    secondaryUnit: 'mm',
    sources: ['Landsat', 'MODIS', 'GPM'],
    explanation:
      'Muestra el desfase temporal entre el inicio de las lluvias estacionales y el incremento del índice de vegetación.',
  },
  {
    id: 'seasonal-veg',
    label: 'Evolución estacional de vegetación',
    primaryKey: 'ndvi',
    secondaryKey: 'ndviPreviousSeason',
    primaryLabel: 'Campaña actual (NDVI)',
    secondaryLabel: 'Campaña previa (NDVI)',
    primaryUnit: 'adim.',
    secondaryUnit: 'adim.',
    sources: ['MODIS', 'Landsat', 'GEDI'],
    explanation:
      'Compara la trayectoria fenológica actual contra la referencia histórica demostrativa del ciclo anterior.',
  },
];

export const fusionService = {
  getPresets(): FusionComparisonPreset[] {
    return FUSION_PRESETS;
  },

  evaluateParcelRepresentativeness(parcel: Parcel, sourceIds: SatelliteSourceId[]) {
    return sourceIds.map((id) => {
      const spec = SATELLITE_SOURCES.find((s) => s.id === id)!;
      return {
        source: spec,
        check: checkSpatialRepresentativeness(getParcelAreaHa(parcel), spec),
      };
    });
  },

  getSimulatedInsights(parcelId: string): SimulatedInsight[] {
    const specific = SIMULATED_INSIGHTS.filter((i) => i.parcelId === parcelId);
    if (specific.length > 0) return specific;

    // Fallback coherent insights for newly created parcels
    return SIMULATED_INSIGHTS.filter((i) => i.parcelId === 'parcela-norte').map((ins) => ({
      ...ins,
      id: `${ins.id}-${parcelId}`,
      parcelId,
    }));
  },
};
