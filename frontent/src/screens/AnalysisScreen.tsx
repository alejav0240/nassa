import { AlertCircle, CheckCircle2, ChevronDown, Droplets, Loader2, RefreshCw, Sprout, WalletCards } from 'lucide-react';
import { useState } from 'react';
import { DataSourcesCatalog } from '../components/DataSourcesCatalog';
import { ClimateAnomaliesSection } from '../components/ClimateAnomaliesSection';
import { CropRecommendationsPanel } from '../components/CropRecommendationsPanel';
import {
  AnalysisSubTab,
  CropHistoryRecord,
  Parcel,
} from '../types/agroshift';
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
  analysisStatus: 'idle' | 'loading' | 'ready' | 'error';
  backendAnalysis: BackendAnalysis | null;
  analysisIsStale: boolean;
  analysisError: string | null;
  onRunAnalysis: (parcelId: string, priorities: { water: number; soil: number; income: number }) => Promise<void>;
}

const SUB_TABS: { id: AnalysisSubTab; label: string }[] = [
  { id: 'satelital', label: 'Clima y datos' },
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
  analysisStatus,
  backendAnalysis,
  analysisIsStale,
  analysisError,
  onRunAnalysis,
}: AnalysisScreenProps) {
  const [priorities, setPriorities] = useState({ water: 40, soil: 40, income: 20 });

  const runAnalysis = () => {
    if (selectedParcel) void onRunAnalysis(selectedParcel.id, priorities);
  };

  if (!selectedParcel) {
    return (
      <div className="p-6 flex justify-center">
        <section className="max-w-md w-full rounded-2xl border border-[var(--agro-line)] bg-[var(--agro-surface)] p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 mx-auto text-[var(--agro-warning-text)]" aria-hidden="true" />
          <h1 className="text-base font-bold text-[var(--agro-text)]">Selecciona una parcela para empezar</h1>
          <p className="text-sm text-[var(--agro-muted)]">
            {parcels.length > 0
              ? 'Elige una parcela y te mostraremos un escenario orientativo junto con la evidencia que lo respalda.'
              : 'Registra una parcela antes de consultar datos ambientales reales.'}
          </p>
          {parcels.length > 0 && (
            <button
              type="button"
              onClick={() => onSelectParcel(parcels[0].id)}
              className="min-h-[44px] px-4 rounded-xl agro-primary text-white text-xs font-semibold"
            >
              Analizar {parcels[0].name}
            </button>
          )}
        </section>
      </div>
    );
  }

  const primaryStrategy = backendAnalysis?.strategies[0];
  const confidence = primaryStrategy
    ? primaryStrategy.score >= 80
      ? 'Alta'
      : primaryStrategy.score >= 60
        ? 'Media'
        : 'Baja'
    : null;

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
          {analysisStatus === 'error' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>{analysisError ?? 'No se pudo completar el análisis.'}</span>
              <button type="button" onClick={runAnalysis} className="min-h-[36px] px-3 rounded-lg bg-[var(--agro-danger-text)] text-white font-semibold inline-flex items-center justify-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Reintentar
              </button>
            </div>
          )}
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
        <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span>La parcela cambió desde el último análisis. El resultado visible corresponde a una versión anterior.</span>
          <button type="button" onClick={runAnalysis} disabled={analysisStatus === 'loading'} className="min-h-[36px] px-3 rounded-lg bg-amber-900 text-white font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Actualizar análisis
          </button>
        </div>
      )}

      {/* Primary recommendation and action */}
      <section className="rounded-2xl border border-emerald-200 bg-[var(--agro-success-bg)] p-4 sm:p-5 space-y-3" aria-live="polite">
        <div className="flex items-start gap-3">
          {analysisStatus === 'loading' ? (
            <Loader2 className="w-5 h-5 text-[var(--agro-success-text)] animate-spin shrink-0 mt-0.5" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-[var(--agro-success-text)] shrink-0 mt-0.5" aria-hidden="true" />
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--agro-success-text)]">Escenario heurístico · no predicción</p>
            <h2 className="text-base sm:text-lg font-bold text-[var(--agro-text)]">
              {primaryStrategy ? primaryStrategy.title : 'Calcula una estrategia para esta parcela'}
            </h2>
            <p className="text-xs text-[var(--agro-text)] leading-relaxed">
              {primaryStrategy
                ? primaryStrategy.crops.map((crop) => crop.label).join(' → ')
                : 'Ajusta tus prioridades y ejecuta el análisis para recibir una recomendación contextual.'}
            </p>
          </div>
          {confidence && (
            <div className="shrink-0 text-right">
                <p className="text-[11px] text-[var(--agro-muted)]">Puntaje orientativo</p>
                <p className="text-sm font-bold text-[var(--agro-success-text)]">{confidence}</p>
              <p className="text-[11px] text-[var(--agro-muted)]">{primaryStrategy?.score}/100</p>
            </div>
          )}
        </div>
        {primaryStrategy && <p className="text-xs text-[var(--agro-text)] leading-relaxed">{primaryStrategy.explanation}</p>}
        <button type="button" onClick={runAnalysis} disabled={analysisStatus === 'loading'} className="min-h-[42px] px-4 rounded-xl agro-primary text-white text-xs font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2">
          {analysisStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="w-4 h-4" aria-hidden="true" />}
          {analysisStatus === 'loading' ? 'Calculando recomendación…' : primaryStrategy ? 'Actualizar recomendación' : 'Calcular recomendación'}
        </button>
      </section>

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
         <button type="button" disabled={analysisStatus === 'loading' || priorities.water + priorities.soil + priorities.income === 0} onClick={runAnalysis} className="min-h-[40px] px-4 rounded-xl agro-primary text-white text-xs font-semibold disabled:opacity-50">
           {analysisStatus === 'loading' ? 'Calculando…' : 'Actualizar estrategias'}
        </button>
      </section>

      <CropRecommendationsPanel parcel={selectedParcel} />

      {backendAnalysis && analysisStatus === 'ready' && (
        <section className="space-y-3">
           <div className="px-1"><h2 className="text-base font-bold text-[var(--agro-text)]">Estrategias calculadas para esta parcela</h2><p className="text-xs text-[var(--agro-muted)]">NASA POWER + reglas heurísticas transparentes · requiere revisión local</p></div>
           <details className="rounded-2xl border border-[var(--agro-line)] bg-[var(--agro-surface)] p-4">
             <summary className="cursor-pointer text-xs font-semibold text-[var(--agro-text)]">Ver comparación técnica y alternativas</summary>
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-3">
               {backendAnalysis.strategies.map((strategy) => (
                 <article key={strategy.id} className="rounded-xl border border-[var(--agro-line)] bg-[var(--agro-surface-soft)] p-4 space-y-2">
                   <div className="flex items-start justify-between gap-2"><h3 className="text-sm font-bold text-[var(--agro-text)]">{strategy.title}</h3><span className="text-lg font-bold text-[var(--agro-lime)]">{strategy.score}</span></div>
                   <p className="text-xs text-[var(--agro-muted)]">{strategy.crops.map((crop) => crop.label).join(' → ')}</p>
                   <p className="text-xs text-[var(--agro-text)] leading-relaxed">{strategy.explanation}</p>
                   <div className="text-[11px] space-y-1"><p><strong>Beneficios:</strong> {strategy.benefits.join(' · ')}</p><p className="text-[var(--agro-warning-text)]"><strong>Riesgos:</strong> {strategy.risks.join(' · ')}</p></div>
                 </article>
               ))}
             </div>
           </details>
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
      {subTab === 'satelital' && <div id="analysis-panel-satelital" role="tabpanel"><SatelliteTab parcel={selectedParcel} analysis={backendAnalysis} analysisStatus={analysisStatus} analysisError={analysisError} onRetry={runAnalysis} /></div>}
      {subTab === 'fusion' && <div id="analysis-panel-fusion" role="tabpanel"><FusionTab parcel={selectedParcel} analysis={backendAnalysis} analysisStatus={analysisStatus} /></div>}
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
      {subTab === 'insights' && <div id="analysis-panel-insights" role="tabpanel" className="space-y-4"><ClimateAnomaliesSection parcel={selectedParcel} /><InsightsTab parcel={selectedParcel} analysis={backendAnalysis} analysisStatus={analysisStatus} /></div>}
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
