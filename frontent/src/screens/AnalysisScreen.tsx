import { ChevronDown } from 'lucide-react';
import { DataSourcesCatalog } from '../components/DataSourcesCatalog';
import {
  AnalysisSubTab,
  CropHistoryRecord,
  Parcel,
  UserPreferences,
} from '../types/agroterra';
import { FusionTab } from './analysis/FusionTab';
import { HistoryRotationTab } from './analysis/HistoryRotationTab';
import { InsightsTab } from './analysis/InsightsTab';
import { SatelliteTab } from './analysis/SatelliteTab';
import type { BackendAnalysis } from '../services/apiClient';

interface AnalysisScreenProps {
  subTab: AnalysisSubTab;
  onChangeSubTab: (tab: AnalysisSubTab) => void;
  parcels: Parcel[];
  selectedParcel: Parcel | null;
  onSelectParcel: (id: string) => void;
  historyRecords: CropHistoryRecord[];
  onAddHistory: (record: CropHistoryRecord) => void;
  preferences: UserPreferences;
  analysisStatus: 'idle' | 'loading' | 'ready' | 'error';
  backendAnalysis: BackendAnalysis | null;
  analysisError: string | null;
}

const SUB_TABS: { id: AnalysisSubTab; label: string }[] = [
  { id: 'satelital', label: 'Satelital' },
  { id: 'fusion', label: 'Fusión' },
  { id: 'fuentes', label: 'Fuentes' },
  { id: 'insights', label: 'Insights AI' },
  { id: 'historial', label: 'Historial' },
];

export function AnalysisScreen({
  subTab,
  onChangeSubTab,
  parcels,
  selectedParcel,
  onSelectParcel,
  historyRecords,
  onAddHistory,
  preferences,
  analysisStatus,
  backendAnalysis,
  analysisError,
}: AnalysisScreenProps) {
  if (!selectedParcel) {
    return (
      <div className="p-6 text-center text-sm text-slate-600">
        Registra o selecciona una parcela para explorar los análisis demostrativos.
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-0 space-y-4 pb-8">
      {/* Header + Parcel Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Centro de Análisis</h1>
          <p className="text-xs text-slate-500">
            Datos demostrativos multisensor · {selectedParcel.name}
          </p>
        </div>

        <div className="relative sm:w-64">
          <select
            aria-label="Parcela para análisis"
            value={selectedParcel.id}
            onChange={(e) => onSelectParcel(e.target.value)}
            className="w-full h-10 pl-3 pr-9 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            {parcels.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.areaHa} ha · {p.crop})
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {analysisStatus !== 'idle' && (
        <div
          role={analysisStatus === 'error' ? 'alert' : 'status'}
          className={`rounded-2xl border px-4 py-3 text-xs ${
            analysisStatus === 'error'
              ? 'border-red-200 bg-red-50 text-red-800'
              : analysisStatus === 'loading'
                ? 'border-amber-200 bg-amber-50 text-amber-900'
                : 'border-emerald-200 bg-emerald-50 text-emerald-900'
          }`}
        >
          {analysisStatus === 'loading' && 'Consultando NASA POWER y calculando estrategias…'}
          {analysisStatus === 'error' && (analysisError ?? 'No se pudo completar el análisis.')}
          {analysisStatus === 'ready' && backendAnalysis && (
            <div className="space-y-2">
              <p className="font-bold">Análisis real recibido del backend</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <span>Precipitación: <strong>{backendAnalysis.climate?.annual_rainfall_mm ?? 'N/D'} mm</strong></span>
                <span>Temperatura: <strong>{backendAnalysis.climate?.mean_temperature_c ?? 'N/D'} °C</strong></span>
                <span>Heladas: <strong>{backendAnalysis.climate?.annual_frost_days ?? 'N/D'}</strong></span>
                <span>Estrategias: <strong>{backendAnalysis.strategies?.length ?? 0}</strong></span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sub-navigation Tabs */}
      <div role="tablist" aria-label="Secciones del análisis" className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl overflow-x-auto no-scrollbar">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onChangeSubTab(t.id)}
            role="tab"
            aria-selected={subTab === t.id}
            aria-controls={`analysis-panel-${t.id}`}
            className={`flex-1 min-h-[38px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              subTab === t.id
                ? 'bg-white text-[#166534] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Active Sub-module */}
      {subTab === 'satelital' && <div id="analysis-panel-satelital" role="tabpanel"><SatelliteTab parcel={selectedParcel} preferences={preferences} /></div>}
      {subTab === 'fusion' && <div id="analysis-panel-fusion" role="tabpanel"><FusionTab parcel={selectedParcel} /></div>}
      {subTab === 'fuentes' && (
        <div id="analysis-panel-fuentes" role="tabpanel" className="space-y-3">
          <div className="px-1">
            <h2 className="text-base font-bold text-slate-900">
              Fuentes satelitales y cartográficas del sistema
            </h2>
            <p className="text-xs text-slate-500">
              Especificaciones técnicas, resolución, frecuencia de actualización y alcance
            </p>
          </div>
          <DataSourcesCatalog />
        </div>
      )}
      {subTab === 'insights' && <div id="analysis-panel-insights" role="tabpanel"><InsightsTab parcel={selectedParcel} /></div>}
      {subTab === 'historial' && (
        <div id="analysis-panel-historial" role="tabpanel">
          <HistoryRotationTab
            parcel={selectedParcel}
            allHistory={historyRecords}
            onAddHistory={onAddHistory}
          />
        </div>
      )}
    </div>
  );
}
