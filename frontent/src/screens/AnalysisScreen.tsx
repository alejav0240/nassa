import { ChevronDown, Droplets, Sprout, WalletCards } from 'lucide-react';
import { useState } from 'react';
import { DataSourcesCatalog } from '../components/DataSourcesCatalog';
import { ClimateAnomaliesSection } from '../components/ClimateAnomaliesSection';
import {
  AnalysisSubTab,
  CropHistoryRecord,
  Parcel,
  UserPreferences,
} from '../types/agroterra';
import { getParcelAreaHa } from '../utils/parcelGeometry';
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
  analysisIsStale: boolean;
  analysisError: string | null;
  onRunAnalysis: (parcelId: string, priorities: { water: number; soil: number; income: number }) => Promise<void>;
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
  analysisIsStale,
  analysisError,
  onRunAnalysis,
}: AnalysisScreenProps) {
  const [priorities, setPriorities] = useState({ water: 40, soil: 40, income: 20 });
  if (!selectedParcel) {
    return (
      <div className="p-6 text-center text-sm text-[var(--agro-muted)]">
        Registra o selecciona una parcela para explorar los análisis demostrativos.
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-0 space-y-4 pb-8">
      {/* Header + Parcel Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--agro-text)]">Centro de Análisis</h1>
          <p className="text-xs text-[var(--agro-muted)]">
            Evidencia climática y escenarios de rotación · {selectedParcel.name}
          </p>
        </div>

        <div className="relative sm:w-64">
          <select
            aria-label="Parcela para análisis"
            value={selectedParcel.id}
            onChange={(e) => onSelectParcel(e.target.value)}
            className="w-full h-10 pl-3 pr-9 rounded-xl bg-[var(--agro-surface)] border border-[var(--agro-line)] text-xs font-semibold text-[var(--agro-text)] appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            {parcels.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({getParcelAreaHa(p).toFixed(2)} ha · {p.crop})
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-[var(--agro-muted)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {analysisStatus !== 'idle' && (
        <div
          role={analysisStatus === 'error' ? 'alert' : 'status'}
          className={`rounded-2xl border px-4 py-3 text-xs ${
            analysisStatus === 'error'
              ? 'border-red-200 bg-[var(--agro-danger-bg)] text-[var(--agro-danger-text)]'
              : analysisStatus === 'loading'
                ? 'border-amber-200 bg-[var(--agro-warning-bg)] text-[var(--agro-warning-text)]'
                : 'border-emerald-200 bg-[var(--agro-selected)] text-[var(--agro-success-text)]'
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

      {analysisIsStale && (
        <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          La parcela cambió desde el último análisis. El resultado visible corresponde a una versión anterior; vuelve a ejecutar el análisis para actualizarlo.
        </div>
      )}

      <section className="rounded-2xl border border-[var(--agro-line)] bg-[var(--agro-surface)] p-4 space-y-3">
        <div>
          <h2 className="text-sm font-bold text-[var(--agro-text)]">Prioridades del agricultor</h2>
          <p className="text-xs text-[var(--agro-muted)]">Ajustá los pesos y volvé a ejecutar el escenario. No son predicciones de rendimiento.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {([
            ['water', 'Agua', Droplets],
            ['soil', 'Suelo', Sprout],
            ['income', 'Ingreso / mercado', WalletCards],
          ] as const).map(([key, label, Icon]) => (
            <label key={key} className="space-y-1 text-xs text-[var(--agro-text)]">
              <span className="flex items-center justify-between font-semibold"><span className="flex items-center gap-1.5"><Icon className="w-3.5 h-3.5 text-[var(--agro-lime)]" />{label}</span><output>{priorities[key]}</output></span>
              <input aria-label={`Prioridad ${label}`} type="range" min="0" max="100" value={priorities[key]} onChange={(e) => setPriorities((current) => ({ ...current, [key]: Number(e.target.value) }))} className="w-full accent-emerald-700" />
            </label>
          ))}
        </div>
        <button type="button" disabled={analysisStatus === 'loading' || priorities.water + priorities.soil + priorities.income === 0} onClick={() => void onRunAnalysis(selectedParcel.id, priorities)} className="min-h-[40px] px-4 rounded-xl agro-primary text-white text-xs font-semibold disabled:opacity-50">
          {analysisStatus === 'loading' ? 'Calculando…' : 'Actualizar estrategias'}
        </button>
      </section>

      {backendAnalysis && analysisStatus === 'ready' && (
        <section className="space-y-3">
          <div className="px-1"><h2 className="text-base font-bold text-[var(--agro-text)]">Estrategias calculadas para esta parcela</h2><p className="text-xs text-[var(--agro-muted)]">NASA POWER + reglas heurísticas transparentes · requiere revisión local</p></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {backendAnalysis.strategies.map((strategy) => (
              <article key={strategy.id} className="rounded-2xl border border-[var(--agro-line)] bg-[var(--agro-surface)] p-4 space-y-2">
                <div className="flex items-start justify-between gap-2"><h3 className="text-sm font-bold text-[var(--agro-text)]">{strategy.title}</h3><span className="text-lg font-bold text-[var(--agro-lime)]">{strategy.score}</span></div>
                <p className="text-xs text-[var(--agro-muted)]">{strategy.crops.map((crop) => crop.label).join(' → ')}</p>
                <p className="text-xs text-[var(--agro-text)] leading-relaxed">{strategy.explanation}</p>
                <div className="text-[11px] space-y-1"><p><strong>Beneficios:</strong> {strategy.benefits.join(' · ')}</p><p className="text-[var(--agro-warning-text)]"><strong>Riesgos:</strong> {strategy.risks.join(' · ')}</p></div>
              </article>
            ))}
          </div>
          <p className="text-[11px] text-[var(--agro-warning-text)] bg-[var(--agro-warning-bg)] rounded-xl p-3">{backendAnalysis.methodology.scope} Fuente: {backendAnalysis.climate.source}; período {backendAnalysis.climate.years.join('–')}.</p>
        </section>
      )}

      {/* Sub-navigation Tabs */}
      <div role="tablist" aria-label="Secciones del análisis" className="flex items-center gap-1 p-1 bg-[var(--agro-surface-soft)] rounded-xl overflow-x-auto no-scrollbar">
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
                ? 'bg-[var(--agro-surface)] text-[var(--agro-lime)] shadow-xs'
                : 'text-[var(--agro-muted)] hover:text-[var(--agro-text)]'
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
            <h2 className="text-base font-bold text-[var(--agro-text)]">
              Fuentes satelitales y cartográficas del sistema
            </h2>
            <p className="text-xs text-[var(--agro-muted)]">
              Especificaciones técnicas, resolución, frecuencia de actualización y alcance
            </p>
          </div>
          <DataSourcesCatalog />
        </div>
      )}
      {subTab === 'insights' && <div id="analysis-panel-insights" role="tabpanel" className="space-y-4"><ClimateAnomaliesSection parcel={selectedParcel} /><InsightsTab parcel={selectedParcel} /></div>}
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
