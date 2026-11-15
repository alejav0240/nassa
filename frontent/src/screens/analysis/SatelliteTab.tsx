import { AlertTriangle, CloudRain, Database, RefreshCw, Snowflake, Thermometer } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ReactNode } from 'react';
import type { BackendAnalysis } from '../../services/apiClient';
import type { Parcel } from '../../types/agroshift';

interface SatelliteTabProps {
  parcel: Parcel;
  analysis: BackendAnalysis | null;
  analysisStatus: 'idle' | 'loading' | 'ready' | 'error';
  analysisError: string | null;
  onRetry: () => void;
}

export function SatelliteTab({ parcel, analysis, analysisStatus, analysisError, onRetry }: SatelliteTabProps) {
  const climate = analysis && analysis.field_id === parcel.backendId && analysisStatus === 'ready' ? analysis.climate : null;
  const monthly = climate?.monthly.map((item) => ({
    period: new Intl.DateTimeFormat('es-BO', { month: 'short' }).format(new Date(2020, item.month - 1, 1)),
    precipitation: item.precipitation_mm,
  })) ?? [];

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[var(--agro-line)] bg-[var(--agro-surface)] p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[var(--agro-lime)]" aria-hidden="true" />
              <h2 className="text-sm font-bold text-[var(--agro-text)]">Datos ambientales disponibles</h2>
            </div>
            <p className="text-xs text-[var(--agro-muted)] mt-1 leading-relaxed">
              Valores consultados para {parcel.name}; NASA POWER entrega datos climáticos de cuadrícula, no mediciones directas de la parcela.
            </p>
          </div>
          {analysisStatus === 'error' && <button type="button" onClick={onRetry} className="min-h-[36px] px-2.5 rounded-lg text-xs font-semibold text-[var(--agro-lime)] hover:bg-[var(--agro-selected)] inline-flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Reintentar</button>}
        </div>

        {analysisStatus === 'loading' && <p className="text-xs text-[var(--agro-muted)]" role="status">Consultando NASA POWER…</p>}
        {analysisStatus === 'error' && <div className="rounded-xl border border-red-200 bg-[var(--agro-danger-bg)] text-[var(--agro-danger-text)] p-3 text-xs flex items-start gap-2" role="alert"><AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />{analysisError ?? 'No se pudo consultar el clima.'}</div>}
        {analysisStatus === 'idle' && !parcel.backendId && <p className="text-xs text-[var(--agro-muted)]">Esta parcela todavía no está sincronizada con el backend.</p>}

        {climate && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <Metric icon={<CloudRain className="w-4 h-4" />} label="Precipitación anual" value={`${climate.annual_rainfall_mm.toFixed(1)} mm`} />
              <Metric icon={<Thermometer className="w-4 h-4" />} label="Temperatura media" value={`${climate.mean_temperature_c.toFixed(1)} °C`} />
              <Metric icon={<Snowflake className="w-4 h-4" />} label="Heladas aproximadas" value={`${climate.annual_frost_days.toFixed(0)} días/año`} />
              <Metric icon={<Database className="w-4 h-4" />} label="Años completos" value={`${climate.data_quality.complete_years.length}`} />
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--agro-line)" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 10, fill: 'var(--agro-muted)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--agro-muted)' }} />
                  <Tooltip formatter={(value) => [`${value ?? 'N/D'} mm`, 'Precipitación']} />
                  <Bar dataKey="precipitation" name="Precipitación (mm)" fill="var(--agro-info-text)" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-[var(--agro-muted)] leading-relaxed">Fuente: {climate.source} · período {climate.years.join('–')} · {climate.data_quality.policy}. La precipitación mensual es climatológica; no equivale a un pronóstico.</p>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-amber-200 bg-[var(--agro-warning-bg)] p-4 space-y-2">
        <h2 className="text-sm font-bold text-[var(--agro-warning-text)]">Indicadores satelitales aún no conectados</h2>
        <p className="text-xs text-[var(--agro-warning-text)] leading-relaxed">
          NDVI, humedad SMAP, temperatura ECOSTRESS, GPM, biomasa GEDI y propiedades SoilGrids se mantienen como N/D. El catálogo describe sus fuentes, pero esta versión no descarga ni valida observaciones para la parcela.
        </p>
      </section>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--agro-surface-soft)] p-2.5">
      <div className="flex items-center gap-1.5 text-[var(--agro-lime)]">{icon}<span className="text-[10px] text-[var(--agro-muted)]">Real</span></div>
      <p className="text-[11px] text-[var(--agro-muted)] mt-1">{label}</p>
      <p className="text-sm font-bold text-[var(--agro-text)] mt-0.5 tabular-nums">{value}</p>
    </div>
  );
}
