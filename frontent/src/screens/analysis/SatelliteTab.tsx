import { ChevronDown, ChevronUp, Info, Loader2, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { QualityIndicator } from '../../components/QualityBadgeText';
import { satelliteService } from '../../services/satelliteService';
import { Parcel, SatelliteSourceId, UserPreferences } from '../../types/agroterra';

interface SatelliteTabProps {
  parcel: Parcel;
  preferences: UserPreferences;
}

type PeriodOption = '3M' | '6M' | '12M';
type VariableFilter = 'Todas' | 'NDVI' | 'Precipitación' | 'Temperatura' | 'Humedad';

export function SatelliteTab({ parcel, preferences }: SatelliteTabProps) {
  const [period, setPeriod] = useState<PeriodOption>('12M');
  const [variable, setVariable] = useState<VariableFilter>('Todas');
  const [sourceFilter, setSourceFilter] = useState<'Todas' | SatelliteSourceId>('Todas');
  const [expandedSource, setExpandedSource] = useState<SatelliteSourceId | null>('SMAP');
  const [viewState, setViewState] = useState<'ready' | 'loading' | 'error'>('ready');

  const fullSeries = useMemo(() => satelliteService.getTimeSeriesForParcel(parcel), [parcel]);
  const sources = useMemo(() => satelliteService.getSources(), []);

  const slicedSeries = useMemo(() => {
    const count = period === '3M' ? 3 : period === '6M' ? 6 : 12;
    return fullSeries.slice(-count);
  }, [fullSeries, period]);

  const filteredSources = useMemo(() => {
    if (sourceFilter === 'Todas') return sources;
    return sources.filter((s) => s.id === sourceFilter);
  }, [sources, sourceFilter]);

  const triggerReloadDemo = () => {
    setViewState('loading');
    setTimeout(() => setViewState('ready'), 450);
  };

  const showNdvi = variable === 'Todas' || variable === 'NDVI';
  const showRain = variable === 'Todas' || variable === 'Precipitación';
  const showTemp = variable === 'Todas' || variable === 'Temperatura';
  const showMoisture = variable === 'Todas' || variable === 'Humedad';

  return (
    <div className="space-y-5">
      {/* Analytical Filters */}
      <div className="bg-[var(--agro-surface)] rounded-2xl p-4 border border-[var(--agro-line)]/90 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-[var(--agro-text)]">Parámetros de consulta (DEMO)</p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={triggerReloadDemo}
              className="text-[11px] font-semibold text-[var(--agro-lime)] hover:underline inline-flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Actualizar
            </button>
            <button
              type="button"
              onClick={() => setViewState((v) => (v === 'error' ? 'ready' : 'error'))}
              className="text-[11px] font-medium text-[var(--agro-muted)] hover:text-[var(--agro-text)]"
            >
              {viewState === 'error' ? 'Restaurar vista' : 'Simular falla'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-[var(--agro-muted)] mb-1">Período</label>
            <div className="grid grid-cols-3 gap-1 p-1 bg-[var(--agro-surface-soft)] rounded-xl">
              {(['3M', '6M', '12M'] as PeriodOption[]).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setPeriod(opt)}
                  className={`h-8 rounded-lg text-xs font-semibold transition-colors ${
                    period === opt ? 'bg-[var(--agro-surface)] text-[var(--agro-text)] shadow-xs' : 'text-[var(--agro-muted)]'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[var(--agro-muted)] mb-1">Variable</label>
            <select
              value={variable}
              onChange={(e) => setVariable(e.target.value as VariableFilter)}
              className="w-full h-10 px-3 rounded-xl border border-[var(--agro-line)] text-xs font-medium bg-[var(--agro-surface)] text-[var(--agro-text)]"
            >
              <option value="Todas">Todas las variables</option>
              <option value="NDVI">Índice NDVI</option>
              <option value="Precipitación">Precipitación</option>
              <option value="Temperatura">Temperatura superficial</option>
              <option value="Humedad">Humedad superficial</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[var(--agro-muted)] mb-1">
              Fuente satelital
            </label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as 'Todas' | SatelliteSourceId)}
              className="w-full h-10 px-3 rounded-xl border border-[var(--agro-line)] text-xs font-medium bg-[var(--agro-surface)] text-[var(--agro-text)]"
            >
              <option value="Todas">Todas (7 fuentes)</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.variable}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading / Error State Handling */}
      {viewState === 'loading' ? (
        <div className="bg-[var(--agro-surface)] rounded-2xl p-10 border border-[var(--agro-line)] flex flex-col items-center justify-center gap-2 text-[var(--agro-muted)]">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--agro-lime)]" />
          <p className="text-xs font-medium">Cargando serie demostrativa para {parcel.name}...</p>
        </div>
      ) : viewState === 'error' ? (
        <div className="bg-[#40351b] rounded-2xl p-5 border border-amber-200 space-y-2">
          <p className="text-sm font-bold text-amber-900">
            Datos temporalmente no disponibles (simulación de estado)
          </p>
          <p className="text-xs text-amber-800">
            La cobertura satelital óptica puede presentar ausencia de datos por nubosidad o mantenimiento del servicio.
          </p>
          <button
            type="button"
            onClick={() => setViewState('ready')}
            className="px-3.5 py-2 rounded-xl bg-amber-900 text-white text-xs font-semibold"
          >
            Reintentar carga demostrativa
          </button>
        </div>
      ) : (
        <>
          {/* 5 Interactive Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {showNdvi && (
              <div className="bg-[var(--agro-surface)] rounded-2xl p-4 border border-[var(--agro-line)]/90 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--agro-text)]">1. Evolución NDVI</h3>
                    <p className="text-[11px] text-[var(--agro-muted)]">
                      Landsat/MODIS · Serie demostrativa ({period})
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-[var(--agro-lime)] tabular-nums">
                    Actual: {parcel.indicators.ndvi.toFixed(2)}
                  </span>
                </div>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={slicedSeries} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                      <defs>
                        <linearGradient id="ndviChartFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#16A34A" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#16A34A" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#64748b' }} />
                      <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: '#64748b' }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                      <Area
                        type="monotone"
                        dataKey="ndvi"
                        name="NDVI (demo)"
                        stroke="#16A34A"
                        strokeWidth={2.5}
                        fill="url(#ndviChartFill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {showRain && (
              <div className="bg-[var(--agro-surface)] rounded-2xl p-4 border border-[var(--agro-line)]/90 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--agro-text)]">2. Precipitación mensual</h3>
                    <p className="text-[11px] text-[var(--agro-muted)]">GPM (IMERG) · Acumulado mensual (mm)</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#8dd4ef] tabular-nums">
                    {parcel.indicators.precipitationMm.toFixed(1)} mm
                  </span>
                </div>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={slicedSeries} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                      <Bar
                        dataKey="precipitationMm"
                        name="Precipitación (mm)"
                        fill="#0284C7"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {showTemp && (
              <div className="bg-[var(--agro-surface)] rounded-2xl p-4 border border-[var(--agro-line)]/90 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--agro-text)]">3. Cambios de temperatura</h3>
                    <p className="text-[11px] text-[var(--agro-muted)]">ECOSTRESS · Radiométrica superficial (°C)</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#f0c86c] tabular-nums">
                    {parcel.indicators.temperatureC.toFixed(1)} °C
                  </span>
                </div>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={slicedSeries} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#64748b' }} />
                      <YAxis domain={[20, 38]} tick={{ fontSize: 10, fill: '#64748b' }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                      <Line
                        type="monotone"
                        dataKey="temperatureC"
                        name="Temp. superficial (°C)"
                        stroke="#F59E0B"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {showMoisture && (
              <div className="bg-[var(--agro-surface)] rounded-2xl p-4 border border-[var(--agro-line)]/90 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--agro-text)]">4. Humedad superficial</h3>
                    <p className="text-[11px] text-[var(--agro-muted)]">
                      SMAP · Referencia regional (
                      {preferences.moistureUnit === 'volumetric' ? 'm³/m³' : '%'})
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#8dd4ef] tabular-nums">
                    {preferences.moistureUnit === 'volumetric'
                      ? `${parcel.indicators.moistureVolumetric.toFixed(2)} m³/m³`
                      : `${parcel.indicators.moisturePct} %`}
                  </span>
                </div>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={slicedSeries} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                      <Area
                        type="monotone"
                        dataKey={
                          preferences.moistureUnit === 'volumetric'
                            ? 'moistureVolumetric'
                            : 'moisturePct'
                        }
                        name={
                          preferences.moistureUnit === 'volumetric'
                            ? 'Humedad (m³/m³)'
                            : 'Humedad (%)'
                        }
                        stroke="#0284C7"
                        fill="#e0f2fe"
                        strokeWidth={2.2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* 5. Seasonal Comparison */}
            <div className="bg-[var(--agro-surface)] rounded-2xl p-4 border border-[var(--agro-line)]/90 space-y-2 lg:col-span-2">
              <div>
                <h3 className="text-sm font-bold text-[var(--agro-text)]">
                  5. Comparación estacional (NDVI actual vs. ciclo previo)
                </h3>
                <p className="text-[11px] text-[var(--agro-muted)]">
                  MODIS/Landsat · Trayectoria demostrativa comparativa
                </p>
              </div>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={slicedSeries} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line
                      type="monotone"
                      dataKey="ndvi"
                      name="Campaña actual (demo)"
                      stroke="#16A34A"
                      strokeWidth={2.5}
                    />
                    <Line
                      type="monotone"
                      dataKey="ndviPreviousSeason"
                      name="Campaña previa (ref.)"
                      stroke="#94a3b8"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Satellite Source Explanatory Cards */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-1.5 px-1">
              <Info className="w-4 h-4 text-[var(--agro-lime)]" />
              <h2 className="text-sm font-bold text-[var(--agro-text)]">
                Fichas técnicas de fuentes satelitales
              </h2>
            </div>

            <div className="space-y-2.5">
              {filteredSources.map((src) => {
                const isOpen = expandedSource === src.id;
                return (
                  <div
                    key={src.id}
                    className="bg-[var(--agro-surface)] rounded-2xl border border-[var(--agro-line)]/90 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedSource(isOpen ? null : src.id)}
                      className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-slate-50/70"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-[var(--agro-text)]">{src.name}</span>
                          <span className="text-xs text-[var(--agro-muted)]">· {src.variable}</span>
                        </div>
                        <p className="text-[11px] text-[var(--agro-muted)] mt-0.5 font-mono">
                          Res. {src.spatialResolution} · Obs. {src.lastObservationDate}
                        </p>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-[var(--agro-muted)] shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[var(--agro-muted)] shrink-0" />
                      )}
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 pt-2 border-t border-[var(--agro-line)] space-y-2 text-xs text-[var(--agro-text)]">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="text-[var(--agro-muted)]">
                            Acceso: <strong className="text-[var(--agro-text)]">{src.accessSource}</strong> ·{' '}
                            <span className="px-2 py-0.5 rounded-full bg-[var(--agro-surface-soft)] text-[10px] font-semibold text-[var(--agro-text)]">
                              {src.tag}
                            </span>
                          </span>
                          <QualityIndicator quality={src.quality} />
                        </div>
                        <p>
                          <strong className="text-[var(--agro-text)]">
                            {src.id === 'OSM' ? '¿Qué proporciona?' : '¿Qué mide?'}
                          </strong>{' '}
                          {src.whatItMeasures}
                        </p>
                        <p>
                          <strong className="text-[var(--agro-text)]">¿Para qué sirve?</strong> {src.purpose}
                        </p>
                        <p>
                          <strong className="text-[var(--agro-text)]">Uso en la app:</strong> {src.appUsage}
                        </p>
                        <p>
                          <strong className="text-[var(--agro-text)]">Resolución / Frecuencia:</strong>{' '}
                          {src.spatialResolution} ({src.temporalResolution}) · {src.detailLevel}
                        </p>
                        <p>
                          <strong className="text-[var(--agro-text)]">Unidad / Fecha:</strong> {src.unit} ·{' '}
                          {src.lastObservationDate}
                        </p>
                        {src.clarification && (
                          <p className="text-[#8dd4ef] bg-[#12394a] p-2 rounded-xl font-semibold">
                            Aclaración: {src.clarification}
                          </p>
                        )}
                        <p className="text-amber-800 bg-[#40351b] p-2.5 rounded-xl">
                          <strong>Limitaciones:</strong> {src.limitations}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
