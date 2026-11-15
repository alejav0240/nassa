import { AlertTriangle, CheckCircle2, LoaderCircle, RefreshCw, Satellite } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ApiError, backendApi, type ClimateAnomalies } from '../services/apiClient';
import type { Parcel } from '../types/agroshift';

const PILOT_LAT = -16.57;
const PILOT_LON = -68.69;

function explainModelError(error: Error | null) {
  if (error instanceof ApiError && (error.kind === 'gateway' || error.kind === 'network' || error.kind === 'timeout')) {
    return {
      title: error.kind === 'timeout' || error.status === 504 ? 'El servicio de análisis tardó demasiado' : 'No hay conexión con el servicio de análisis',
      detail: error.message,
      action: 'Inicia FastAPI en el puerto configurado y confirma que Vite pueda acceder a él. No es posible consultar el modelo mientras el servicio no responda.',
    };
  }

  if (error instanceof ApiError && error.status === 503) {
    const message = error.message.toLowerCase();
    if (message.includes('modelo local no entrenado')) {
      return { title: 'El modelo local no está inicializado', detail: error.message, action: 'Comprueba el artefacto local y el reporte del modelo antes de volver a consultar.' };
    }
    if (message.includes('serie diaria nasa power no disponible')) {
      return { title: 'Faltan los datos locales de NASA POWER', detail: error.message, action: 'Comprueba la serie NASA local y su verificación de origen; no se sustituirá por datos simulados.' };
    }
    if (message.includes('cobertura insuficiente')) {
      return { title: 'La serie no tiene cobertura suficiente', detail: error.message, action: 'El modelo requiere su cobertura histórica mínima; no se imputarán observaciones faltantes.' };
    }
    if (message.includes('la serie nasa cambió')) {
      return { title: 'La serie NASA no coincide con el modelo validado', detail: error.message, action: 'Revisa la integridad de los datos y del manifiesto antes de volver a cargar el artefacto.' };
    }
    return { title: 'El modelo o sus datos no están disponibles', detail: error.message, action: 'FastAPI respondió, pero no pudo servir una inferencia válida. Revisa el detalle antes de reintentar.' };
  }

  if (error instanceof ApiError && (error.status === 409 || error.status === 422)) {
    return { title: 'La parcela no coincide con el punto piloto', detail: error.message, action: 'El modelo solo está validado para el punto de Viacha y el período de evaluación 2023–2024.' };
  }

  if (error instanceof ApiError && error.status === 404) {
    return { title: 'No se encontró la parcela sincronizada', detail: error.message, action: 'Vuelve a sincronizar la parcela piloto y después intenta consultar el análisis.' };
  }

  return {
    title: 'No se pudo consultar el modelo',
    detail: error?.message ?? 'La respuesta del servicio no se pudo interpretar.',
    action: 'Vuelve a intentarlo. La detección histórica permanecerá separada de las recomendaciones agrícolas.',
  };
}

export function ClimateAnomaliesSection({ parcel }: { parcel: Parcel }) {
  const [result, setResult] = useState<ClimateAnomalies | null>(null);
  const [error, setError] = useState<Error | null>(null);
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
      .catch((cause: unknown) => { if (active) { setError(cause instanceof Error ? cause : new Error('No se pudo consultar el modelo.')); setStatus('error'); } });
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
  const errorView = explainModelError(error);

  return (
    <section className="climate-ml climate-ml--orbital rounded-2xl border p-4 sm:p-5 space-y-4" aria-label="Detección histórica de anomalías climáticas">
      <header className="climate-ml__header">
        <div className="flex items-center gap-3">
          <span className="climate-ml__mark"><Satellite size={18} aria-hidden="true" /></span>
          <div>
            <p className="climate-ml__eyebrow">AGROSHIFT AI / MODELO LOCAL</p>
            <h2 className="text-base font-bold">Anomalías climáticas históricas</h2>
            <p className="text-xs ml-muted">NASA POWER · piloto Viacha (-16.57, -68.69) · detección retrospectiva, no pronóstico.</p>
          </div>
        </div>
        <span className="climate-ml__type">ISOLATION FOREST</span>
      </header>
      {!matchesPilot && <p className="climate-ml__scope" role="note"><Satellite size={15} aria-hidden="true" /><span>Referencia del punto piloto: {parcel.name} está fuera de Viacha. El resultado histórico no describe ni estima las condiciones de esta parcela.</span></p>}
      {status === 'loading' && <div className="climate-ml__state" role="status"><LoaderCircle className="animate-spin" size={18} aria-hidden="true" /><div><strong>Consultando detección histórica</strong><p>{matchesPilot ? 'Solicitando la serie piloto verificada.' : 'Consultando la referencia del piloto; no corresponde a la parcela seleccionada.'}</p></div></div>}
      {status === 'error' && <div className="climate-ml__error" role="alert">
        <span className="climate-ml__error-mark"><AlertTriangle size={19} aria-hidden="true" /></span>
        <div className="climate-ml__error-copy"><h3>{errorView.title}</h3><p>{errorView.detail}</p><small>{errorView.action}</small>
          <p className="climate-ml__historical-note">Este módulo identifica rarezas en observaciones históricas. No es un pronóstico y no genera recomendaciones de cultivo.</p>
          <button type="button" onClick={() => setRetry((value) => value + 1)} className="ml-retry"><RefreshCw size={14} aria-hidden="true" />Reintentar consulta</button>
        </div>
      </div>}
      {status === 'ready' && result && <>
        <div className="climate-ml__ready" role="status"><CheckCircle2 size={15} aria-hidden="true" /><span>Modelo disponible · versión {result.version}</span>{!matchesPilot && <small>Referencia piloto, no de parcela</small>}</div>
        {result.evaluation.flagged_days === 0 && <p className="climate-ml__scope" role="status">El umbral del modelo no señaló anomalías en este período. Esto describe únicamente la evaluación histórica y no significa que no exista riesgo climático.</p>}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div><strong>Estado</strong><p>Listo · Isolation Forest</p></div>
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
