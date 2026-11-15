import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { BackendAnalysis } from '../../services/apiClient';
import type { Parcel } from '../../types/agroterra';

interface InsightsTabProps {
  parcel: Parcel;
  analysis: BackendAnalysis | null;
  analysisStatus: 'idle' | 'loading' | 'ready' | 'error';
}

export function InsightsTab({ parcel, analysis, analysisStatus }: InsightsTabProps) {
  const climate = analysis && analysis.field_id === parcel.backendId && analysisStatus === 'ready' ? analysis.climate : null;

  if (!climate) {
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
