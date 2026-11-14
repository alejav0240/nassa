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

interface AnalysisScreenProps {
  subTab: AnalysisSubTab;
  onChangeSubTab: (tab: AnalysisSubTab) => void;
  parcels: Parcel[];
  selectedParcel: Parcel | null;
  onSelectParcel: (id: string) => void;
  historyRecords: CropHistoryRecord[];
  onAddHistory: (record: CropHistoryRecord) => void;
  preferences: UserPreferences;
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

      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl overflow-x-auto no-scrollbar">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onChangeSubTab(t.id)}
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
      {subTab === 'satelital' && <SatelliteTab parcel={selectedParcel} preferences={preferences} />}
      {subTab === 'fusion' && <FusionTab parcel={selectedParcel} />}
      {subTab === 'fuentes' && (
        <div className="space-y-3">
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
      {subTab === 'insights' && <InsightsTab parcel={selectedParcel} />}
      {subTab === 'historial' && (
        <HistoryRotationTab
          parcel={selectedParcel}
          allHistory={historyRecords}
          onAddHistory={onAddHistory}
        />
      )}
    </div>
  );
}
