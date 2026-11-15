import { AlertTriangle, CheckCircle2, Info, LoaderCircle, RefreshCw } from 'lucide-react';
import type { BackendAnalysis } from '../../services/apiClient';
import type { Parcel } from '../../types/agroshift';

interface InsightsTabProps {
  parcel: Parcel;
  analysis: BackendAnalysis | null;
  analysisStatus: 'idle' | 'loading' | 'ready' | 'error';
  analysisError: string | null;
  onRetry: () => void;
}

export function InsightsTab({ parcel, analysis, analysisStatus, analysisError, onRetry }: InsightsTabProps) {
  const climate = analysis && analysis.field_id === parcel.backendId && analysisStatus === 'ready' ? analysis.climate : null;

  if (!climate) {
    if (analysisStatus === 'error') {
      return (
        <section className="analysis-insight-state analysis-insight-state--error rounded-2xl border p-5 space-y-3" role="alert">
          <div className="flex items-start gap-3">
            <span className="analysis-insight-state__icon"><AlertTriangle className="w-5 h-5" aria-hidden="true" /></span>
            <div className="min-w-0 space-y-1">
              <h2 className="text-sm font-bold text-[var(--agro-text)]">No se pudo completar el análisis</h2>
              <p className="text-xs text-[var(--agro-muted)] leading-relaxed">{analysisError ?? 'El servicio de análisis no devolvió resultados.'}</p>
              <p className="text-xs text-[var(--agro-muted)] leading-relaxed">Los Insights requieren respuesta del backend y datos climáticos disponibles. No se mostrarán valores simulados.</p>
            </div>
          </div>
          <button type="button" onClick={onRetry} className="analysis-insight-retry"><RefreshCw size={15} aria-hidden="true" />Volver a ejecutar análisis</button>
        </section>
      );
    }

    if (analysisStatus === 'loading') {
      return (
        <section className="analysis-insight-state rounded-2xl border p-5 space-y-2" role="status">
          <div className="flex items-center gap-2"><LoaderCircle className="w-4 h-4 animate-spin text-[var(--agro-info-text)]" aria-hidden="true" /><h2 className="text-sm font-bold text-[var(--agro-text)]">Preparando Insights con datos disponibles</h2></div>
          <p className="text-xs text-[var(--agro-muted)] leading-relaxed">Esperando la respuesta del análisis climático para {parcel.name}.</p>
        </section>
      );
    }

    return (
      <section className="rounded-2xl border border-[var(--agro-line)] bg-[var(--agro-surface)] p-5 space-y-2">
        <div className="flex items-center gap-2"><Info className="w-4 h-4 text-[var(--agro-info-text)]" aria-hidden="true" /><h2 className="text-sm font-bold text-[var(--agro-text)]">Interpretación basada en evidencia</h2></div>
        <p className="text-xs text-[var(--agro-muted)] leading-relaxed">Ejecutá un análisis NASA POWER para generar observaciones climáticas reales. No mostramos narrativas simuladas ni diagnósticos sin datos.</p>
      </section>
    );
  }

  const rainfall = climate.annual_rainfall_mm;
  const temperature = climate.mean_temperature_c;
  const frost = climate.annual_frost_days;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-emerald-200 bg-[var(--agro-success-bg)] p-4 space-y-2">
        <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[var(--agro-success-text)]" aria-hidden="true" /><h2 className="text-sm font-bold text-[var(--agro-text)]">Lectura climática de {parcel.name}</h2></div>
        <p className="text-xs text-[var(--agro-text)] leading-relaxed">Estos datos provienen de {climate.source}, período {climate.years.join('–')}. Son referencias de cuadrícula y no sustituyen observaciones de campo.</p>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <InsightCard title="Lluvia histórica" value={`${rainfall.toFixed(1)} mm/año`} detail="Promedio del período completo" />
        <InsightCard title="Temperatura media" value={`${temperature.toFixed(1)} °C`} detail="Promedio climático" />
        <InsightCard title="Heladas" value={`${frost.toFixed(0)} días/año`} detail="Estimación histórica" />
      </div>

      <section className="rounded-2xl border border-amber-200 bg-[var(--agro-warning-bg)] p-4 space-y-2">
        <div className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-[var(--agro-warning-text)] shrink-0 mt-0.5" aria-hidden="true" /><div><h2 className="text-xs font-bold text-[var(--agro-warning-text)]">Limitaciones de interpretación</h2><ul className="list-disc pl-4 mt-1 space-y-1 text-xs text-[var(--agro-warning-text)] leading-relaxed">{climate.limitations.map((item) => <li key={item}>{item}</li>)}</ul></div></div>
      </section>

      <p className="text-[11px] text-[var(--agro-muted)]">Calidad: {climate.data_quality.policy}. Años completos: {climate.data_quality.complete_years.join(', ') || 'N/D'}.</p>
    </div>
  );
}

function InsightCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return <article className="rounded-2xl border border-[var(--agro-line)] bg-[var(--agro-surface)] p-4"><p className="text-xs text-[var(--agro-muted)]">{title}</p><p className="text-xl font-bold text-[var(--agro-text)] mt-1 tabular-nums">{value}</p><p className="text-[11px] text-[var(--agro-muted)] mt-1">{detail}</p></article>;
}
