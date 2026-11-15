import {
  Bell, ChevronRight, CloudRain, Droplets, History, Map as MapIcon, Sprout,
  Thermometer, TrendingUp,
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, type RefObject } from 'react';
import { satelliteService } from '../services/satelliteService';
import type { BackendAnalysis } from '../services/apiClient';
import { Badge, Button, MetricCard } from '../components/ui';
import { AmbientIntelligenceBackground } from '../components/AmbientIntelligenceBackground';
import { HomeAtmosphere } from '../components/home/HomeAtmosphere';
import { GeospatialHero } from '../components/home/GeospatialHero';
import { AnalysisSubTab, NavTab, Parcel, UserPreferences } from '../types/agroshift';
import { formatAreaHa, getParcelAreaHa } from '../utils/parcelGeometry';

const DEFAULT_PRIORITIES = { water: 40, soil: 40, income: 20 };

interface HomeScreenProps {
  parcels: Parcel[];
  selectedParcel: Parcel | null;
  unreadAlertsCount: number;
  preferences: UserPreferences;
  onSelectParcel: (id: string) => void;
  onOpenParcelDetail: (id: string) => void;
  onNavigate: (tab: NavTab, subTab?: AnalysisSubTab) => void;
  onOpenAlerts: () => void;
  backendStatus: 'checking' | 'connected' | 'offline';
  dataSource: 'local-demo' | 'backend' | 'offline';
  syncStatus: 'idle' | 'saving' | 'saved' | 'error';
  analysisStatus: 'idle' | 'loading' | 'ready' | 'error';
  backendAnalysis: BackendAnalysis | null;
  analysisIsStale: boolean;
  analysisError: string | null;
  onRunAnalysis: (parcelId: string, priorities: typeof DEFAULT_PRIORITIES) => Promise<void>;
  scrollContainer?: RefObject<HTMLElement | null>;
}

export function HomeScreen({
  parcels, selectedParcel, unreadAlertsCount, preferences, onSelectParcel,
  onOpenParcelDetail, onNavigate, onOpenAlerts, backendStatus, syncStatus,
  dataSource, analysisStatus, backendAnalysis, analysisIsStale, analysisError,
  onRunAnalysis, scrollContainer,
}: HomeScreenProps) {
  const reducedMotion = useReducedMotion();
  const autoAnalysisKey = useRef<string | null>(null);
  const selectedParcelIdForAnalysis = selectedParcel?.id;
  const backendParcelId = selectedParcel?.backendId;

  useEffect(() => {
    const key = backendParcelId
      ? `${selectedParcelIdForAnalysis}:${analysisIsStale ? 'stale' : 'initial'}`
      : null;
    if (key && selectedParcelIdForAnalysis && key !== autoAnalysisKey.current && (analysisStatus === 'idle' || analysisIsStale)) {
      autoAnalysisKey.current = key;
      void onRunAnalysis(selectedParcelIdForAnalysis, DEFAULT_PRIORITIES);
    }
  }, [analysisIsStale, analysisStatus, backendParcelId, onRunAnalysis, selectedParcelIdForAnalysis]);

  if (!selectedParcel) {
    return (
      <div className="agro-home agro-home-empty-root">
        <HomeAtmosphere />
        <AmbientIntelligenceBackground variant="home" />
        <motion.div className="agro-home-empty m-4 lg:m-0 p-8 text-center space-y-3" initial={reducedMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.42 }}>
          <p className="agro-eyebrow">COMIENZA AQUÍ</p>
          <h1 className="text-2xl font-bold text-[var(--agro-text)]">Tu campo empieza con una parcela</h1>
          <p className="text-sm text-[var(--agro-muted)]">Registra una parcela para organizar su información y acceder al mapa y al análisis.</p>
          {dataSource === 'offline' && <p role="status" className="rounded-xl bg-[var(--agro-warning-bg)] px-3 py-2 text-xs font-medium text-[var(--agro-warning-text)]">Sin conexión. La parcela quedará guardada localmente.</p>}
          <Button type="button" onClick={() => onNavigate('parcelas')}>Ir a Mis parcelas</Button>
        </motion.div>
      </div>
    );
  }

  const hasIndicators = selectedParcel.indicatorsAvailable !== false;
  const hasClimateAnalysis = Boolean(selectedParcel.backendId && backendAnalysis?.field_id === selectedParcel.backendId && analysisStatus === 'ready' && !analysisIsStale);
  const climate = hasClimateAnalysis ? backendAnalysis?.climate : null;
  const timeSeries = hasIndicators ? satelliteService.getTimeSeriesForParcel(selectedParcel).slice(-6) : [];
  const moistureDisplay = preferences.moistureUnit === 'volumetric'
    ? `${selectedParcel.indicators.moistureVolumetric.toFixed(2)} m³/m³`
    : `${selectedParcel.indicators.moisturePct} %`;

  const indicators = [
    { id: 'humedad', title: 'Humedad superficial del suelo', value: hasIndicators ? moistureDisplay : 'N/D', source: hasIndicators ? 'SMAP · demostrativo' : 'Sin serie disponible', status: hasIndicators ? 'Referencia regional' : 'Dato no disponible', icon: Droplets, tone: 'info' as const },
    { id: 'temperatura', title: 'Temperatura superficial', value: hasIndicators ? `${selectedParcel.indicators.temperatureC.toFixed(1)} °C` : 'N/D', source: hasIndicators ? 'ECOSTRESS · demostrativo' : 'Sin serie disponible', status: hasIndicators ? 'Referencia visual' : 'Dato no disponible', icon: Thermometer, tone: 'warning' as const },
    { id: 'precipitacion', title: 'Precipitación mensual', value: hasIndicators ? `${selectedParcel.indicators.precipitationMm.toFixed(1)} mm` : 'N/D', source: hasIndicators ? 'GPM · demostrativo' : 'Sin serie disponible', status: hasIndicators ? 'Acumulado de referencia' : 'Dato no disponible', icon: CloudRain, tone: 'info' as const },
    { id: 'ndvi', title: 'Índice NDVI', value: hasIndicators ? selectedParcel.indicators.ndvi.toFixed(2) : 'N/D', source: hasIndicators ? 'Landsat/MODIS · demostrativo' : 'Sin serie disponible', status: hasIndicators ? selectedParcel.indicators.ndvi >= 0.55 ? 'Vegetación activa (demo)' : 'Cobertura moderada (demo)' : 'Dato no disponible', icon: Sprout, tone: 'success' as const },
  ];
  const quickActions = [
    { label: 'Ver mapa satelital', sub: 'Capas y polígonos OSM', icon: MapIcon, onClick: () => onNavigate('mapa') },
    { label: 'Analizar mi parcela', sub: 'Series y fusión de datos', icon: TrendingUp, onClick: () => { if (selectedParcel.backendId) void onRunAnalysis(selectedParcel.id, DEFAULT_PRIORITIES); onNavigate('analisis', 'satelital'); } },
    { label: 'Consultar historial', sub: 'Ciclos y rotación agrícola', icon: History, onClick: () => onNavigate('analisis', 'historial') },
    { label: 'Revisar alertas', sub: `${unreadAlertsCount} sin leer`, icon: Bell, onClick: onOpenAlerts },
  ];

  return (
    <div className="agro-home space-y-7 pb-8">
      <HomeAtmosphere />
      <AmbientIntelligenceBackground variant="home" />
      <div className="agro-home-content">
        <motion.header className="agro-home-toolbar flex items-center justify-between gap-4 px-4 sm:px-6 pt-5" initial={reducedMotion ? false : { opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.42, ease: 'easeOut' }}>
          <div className="min-w-0"><p className="agro-eyebrow">AGROSHIFT AI <span aria-hidden="true">/</span> INTELIGENCIA DE CAMPO</p><h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--agro-text)]">Vista general</h1><p className="agro-brand-tagline">Inteligencia agrícola impulsada por datos satelitales.</p></div>
          <div className="flex items-center gap-2">
            <span className="agro-connection hidden sm:inline-flex" role="status"><span className={`agro-status-dot ${backendStatus}`} />{backendStatus === 'connected' ? 'Conectado' : backendStatus === 'offline' ? 'Modo local' : 'Conectando'}</span>
            <button type="button" onClick={onOpenAlerts} aria-label={`Notificaciones (${unreadAlertsCount} sin leer)`} className="agro-alert-button relative"><Bell size={19} />{unreadAlertsCount > 0 && <span className="agro-alert-count">{unreadAlertsCount}</span>}</button>
          </div>
        </motion.header>

        <GeospatialHero parcel={selectedParcel} parcels={parcels} backendStatus={backendStatus} syncStatus={syncStatus} onSelectParcel={onSelectParcel} onOpenParcelDetail={onOpenParcelDetail} onOpenMap={() => onNavigate('mapa')} scrollContainer={scrollContainer} />

        <section className="mx-4 sm:mx-6 mt-5 rounded-2xl border border-[var(--agro-line)] bg-[var(--agro-surface)] p-4 sm:p-5" aria-labelledby="climate-summary-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="agro-eyebrow">ANÁLISIS CLIMÁTICO HISTÓRICO</p><h2 id="climate-summary-title" className="text-lg font-bold text-[var(--agro-text)]">Resumen NASA POWER</h2></div>
            <span className="text-xs text-[var(--agro-muted)]" role="status">{analysisStatus === 'loading' ? 'Consultando datos históricos…' : climate ? `${climate.years[0]}–${climate.years.at(-1)} · ${climate.data_quality.policy}` : analysisStatus === 'error' ? 'Error de consulta' : selectedParcel.backendId ? 'Análisis pendiente' : 'Disponible al sincronizar la parcela'}</span>
          </div>
          {climate ? <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3"><div className="rounded-xl bg-[var(--agro-surface-soft)] p-3"><small className="text-[var(--agro-muted)]">Temperatura media histórica</small><strong className="mt-1 block text-lg text-[var(--agro-text)]">{climate.mean_temperature_c.toFixed(1)} °C</strong></div><div className="rounded-xl bg-[var(--agro-surface-soft)] p-3"><small className="text-[var(--agro-muted)]">Precipitación anual histórica</small><strong className="mt-1 block text-lg text-[var(--agro-text)]">{climate.annual_rainfall_mm.toFixed(1)} mm</strong></div><div className="col-span-2 rounded-xl bg-[var(--agro-surface-soft)] p-3 sm:col-span-1"><small className="text-[var(--agro-muted)]">Fuente y alcance</small><strong className="mt-1 block text-sm text-[var(--agro-text)]">NASA POWER · histórico</strong></div></div> : analysisStatus === 'error' ? <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--agro-warning-bg)] p-3 text-sm text-[var(--agro-warning-text)]"><span>{analysisError ?? 'No se pudo consultar el análisis climático histórico.'}</span><Button type="button" variant="secondary" size="sm" onClick={() => void onRunAnalysis(selectedParcel.id, DEFAULT_PRIORITIES)}>Reintentar</Button></div> : <p className="mt-3 text-sm text-[var(--agro-muted)]">Los indicadores demostrativos de abajo no sustituyen este análisis histórico ni representan predicciones futuras.</p>}
        </section>

        <div className="px-4 sm:px-6 space-y-7">
          <motion.section aria-labelledby="next-step-title" className="agro-next-action" initial={reducedMotion ? false : { opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: reducedMotion ? 0 : 0.48, ease: 'easeOut' }}>
            <div className="agro-next-icon"><TrendingUp size={19} /></div>
            <div className="min-w-0 flex-1"><p className="agro-eyebrow">SIGUIENTE PASO RECOMENDADO</p><h2 id="next-step-title" className="text-base font-bold text-[var(--agro-text)]">Revisa el análisis de {selectedParcel.name}</h2><p className="text-sm text-[var(--agro-muted)]">Explora las series disponibles y el historial de tu parcela.</p></div>
            <Button type="button" onClick={() => onNavigate('analisis', 'satelital')}>Abrir análisis <ChevronRight size={16} /></Button>
          </motion.section>

          <section aria-labelledby="home-indicators-title" className="space-y-3">
            <div className="agro-section-header"><div><p className="agro-eyebrow">REFERENCIA AMBIENTAL</p><h2 id="home-indicators-title" className="text-xl font-bold text-[var(--agro-text)]">Indicadores de la parcela</h2><p className="text-sm text-[var(--agro-muted)]">Valores demostrativos de fuentes regionales; no son mediciones de campo.</p></div><Badge tone="warning">Demostrativo</Badge></div>
            <div className="agro-home-metrics grid grid-cols-2 xl:grid-cols-4 gap-3">{indicators.map((item, index) => { const Icon = item.icon; return <motion.div key={item.id} className="agro-home-metric-wrap" initial={reducedMotion ? false : { opacity: 0, y: 20, rotateX: 5 }} whileInView={{ opacity: 1, y: 0, rotateX: 0 }} viewport={{ once: true, amount: 0.18 }} transition={{ duration: reducedMotion ? 0 : 0.46, delay: reducedMotion ? 0 : index * 0.075, ease: 'easeOut' }} whileHover={reducedMotion ? undefined : { y: -5, rotateX: 2, rotateY: -1.5 }}><MetricCard label={item.title} value={item.value} source={item.source} status={item.status} tone={item.tone} icon={<Icon size={18} />} /></motion.div>; })}</div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            <section aria-label="Accesos rápidos" className="xl:col-span-5 space-y-3">
              <div><p className="agro-eyebrow">OPERACIONES</p><h2 className="text-xl font-bold text-[var(--agro-text)]">Accesos rápidos</h2></div>
              <div className="agro-actions-grid">{quickActions.map((action) => { const Icon = action.icon; return <motion.button key={action.label} type="button" onClick={action.onClick} className={`agro-quick-action ${action.label === 'Analizar mi parcela' ? 'agro-quick-action--primary' : ''}`} whileHover={reducedMotion ? undefined : { y: -4, scale: 1.012 }} whileTap={reducedMotion ? undefined : { scale: 0.985 }} transition={{ duration: 0.18, ease: 'easeOut' }}><span className="agro-action-icon"><Icon size={19} /></span><span><strong>{action.label}</strong><small>{action.sub}</small></span><ChevronRight className="agro-action-arrow" size={16} /></motion.button>; })}</div>
            </section>

            <motion.section aria-label="Resumen ambiental" className="agro-home-chart xl:col-span-7 rounded-2xl p-4 sm:p-5 space-y-3" initial={reducedMotion ? false : { opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.16 }} transition={{ duration: reducedMotion ? 0 : 0.5, ease: 'easeOut' }}>
              <div className="flex items-start justify-between gap-3"><div><p className="agro-eyebrow">SERIE DE REFERENCIA</p><h2 className="text-xl font-bold text-[var(--agro-text)]">Resumen ambiental</h2><p className="text-sm text-[var(--agro-muted)]">Evolución demostrativa NDVI y lluvia · últimos 6 meses</p></div><button type="button" onClick={() => onNavigate('analisis', 'satelital')} className="agro-chart-link">Explorar <ChevronRight size={15} /></button></div>
              <div className="h-48 w-full" role="img" aria-label={hasIndicators ? 'Evolución demostrativa de NDVI y precipitación de los últimos seis meses' : 'Serie ambiental no disponible para esta parcela'}>
                {hasIndicators ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={timeSeries} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}><defs><linearGradient id="ndviGradHome" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--agro-lime)" stopOpacity={0.28} /><stop offset="95%" stopColor="var(--agro-lime)" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="var(--agro-line)" vertical={false} /><XAxis dataKey="period" tick={{ fontSize: 11, fill: 'var(--agro-muted)' }} axisLine={false} tickLine={false} /><YAxis yAxisId="ndvi" domain={[0, 1]} tick={{ fontSize: 11, fill: 'var(--agro-muted)' }} axisLine={false} tickLine={false} /><YAxis yAxisId="rain" orientation="right" hide /><Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--agro-line)', background: 'var(--agro-surface)', color: 'var(--agro-text)', fontSize: '12px' }} /><Area yAxisId="ndvi" type="monotone" dataKey="ndvi" name="NDVI (demo)" stroke="var(--agro-lime)" strokeWidth={2.5} fill="url(#ndviGradHome)" isAnimationActive={!reducedMotion} /><Area yAxisId="rain" type="monotone" dataKey="precipitationMm" name="Precipitación (mm)" stroke="#0284C7" strokeWidth={1.8} fillOpacity={0} isAnimationActive={!reducedMotion} /></AreaChart></ResponsiveContainer> : <div className="h-full flex items-center justify-center rounded-xl bg-[var(--agro-surface-soft)] text-xs text-[var(--agro-muted)] text-center px-6">No hay una serie ambiental disponible para esta parcela. Puedes explorar otros análisis mientras se incorporan más fuentes.</div>}
              </div>
            </motion.section>
          </div>
        </div>
      </div>
    </div>
  );
}
