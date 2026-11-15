import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { backendApi, type ClimateAnomalies } from '../services/apiClient';
import type { Parcel } from '../types/agroterra';

const PILOT_LAT = -16.57;
const PILOT_LON = -68.69;

export function ClimateAnomaliesSection({ parcel }: { parcel: Parcel }) {
  const [result, setResult] = useState<ClimateAnomalies | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const matchesPilot = Math.abs(parcel.centroid.lat - PILOT_LAT) < 0.0001 && Math.abs(parcel.centroid.lng - PILOT_LON) < 0.0001;

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setResult(null);
    setError(null);
    backendApi.climateAnomalies(matchesPilot ? parcel.backendId : undefined)
      .then((data) => { if (active) { setResult(data); setStatus('ready'); } })
      .catch((cause: unknown) => { if (active) { setError(cause instanceof Error ? cause.message : 'No se pudo consultar el modelo.'); setStatus('error'); } });
    return () => { active = false; };
  }, [matchesPilot, parcel.backendId, retry]);

  const monthly = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of result?.anomalies ?? []) {
      const month = item.date.slice(0, 7);
      counts.set(month, (counts.get(month) ?? 0) + 1);
    }
    return Array.from({ length: 24 }, (_, index) => {
      const year = 2023 + Math.floor(index / 12);
      const month = String(index % 12 + 1).padStart(2, '0');
      const date = `${year}-${month}`;
      return { date, days: counts.get(date) ?? 0 };
    });
  }, [result]);

  return (
    <section className="climate-ml rounded-2xl border p-4 space-y-3" aria-label="Análisis inteligente del clima">
      <div>
        <h2 className="text-base font-bold">Análisis inteligente del clima</h2>
        <p className="text-xs ml-muted">NASA POWER · piloto Viacha (-16.57, -68.69) · detección histórica, no pronóstico</p>
        {!matchesPilot && <p className="text-xs ml-warning mt-1">La parcela seleccionada está fuera del punto piloto. Estos resultados no describen su parcela.</p>}
      </div>
      {status === 'loading' && <p role="status" className="text-sm ml-muted">Consultando modelo local…</p>}
      {status === 'error' && <div role="alert" className="text-sm ml-warning space-y-2"><p>Modelo no disponible: {error}</p><button type="button" onClick={() => setRetry((value) => value + 1)} className="ml-retry rounded-lg border px-3 py-1 font-semibold">Reintentar</button></div>}
      {status === 'ready' && result && <>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div><strong>Estado</strong><p>Entrenado · v{result.version}</p></div>
          <div><strong>Referencia</strong><p>{result.reference_period.join(' a ')}</p></div>
          <div><strong>Evaluación</strong><p>{result.evaluation_period.join(' a ')}</p></div>
          <div><strong>Días atípicos</strong><p>{result.evaluation.flagged_days} / {result.observations.evaluation} ({result.evaluation.flagged_pct} %)</p></div>
        </div>
        <div className="h-40" role="img" aria-label="Número de días atípicos por mes en 2023 y 2024">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} margin={{ top: 5, right: 8, bottom: 5, left: -24 }}>
              <CartesianGrid stroke="var(--agro-line)" strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="var(--agro-muted)" tick={{ fontSize: 9, fill: 'var(--agro-muted)' }} interval={5} />
              <YAxis allowDecimals={false} stroke="var(--agro-muted)" tick={{ fontSize: 10, fill: 'var(--agro-muted)' }} />
              <Tooltip formatter={(value) => [`${value} días`, 'Atípicos']} />
              <Bar dataKey="days" fill="var(--agro-lime)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs ml-muted">Observaciones destacadas: lluvia acumulada de 30 días, temperatura mínima, días con mínima ≤ 0 °C y días secos consecutivos. La puntuación indica rareza, no probabilidad.</p>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {result.anomalies.slice(0, 12).map((item) => <div key={item.date} className="ml-border border-t pt-2 text-xs">
            <strong>{item.date}</strong> · {item.observed.rain_30d_mm} mm / 30 días · mínima {item.observed.tmin_c} °C · {item.observed.frost_7d} días fríos / 7 · {item.observed.dry_spell_days} días secos
            <p>{item.explanation}</p>
          </div>)}
        </div>
        <p className="text-xs ml-muted">Calidad: {result.data_quality.missing_or_invalid_days} días faltantes o inválidos ({result.data_quality.missing_pct} %). Datos de cuadrícula climática; no son mediciones directas de la parcela.</p>
        <a href={result.source} target="_blank" rel="noreferrer" className="text-xs ml-link underline">Fuente y documentación NASA POWER</a>
      </>}
    </section>
  );
}
