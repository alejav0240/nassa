import {
  Bell,
  ChevronDown,
  ChevronRight,
  CloudRain,
  Droplets,
  History,
  Layers,
  Map as MapIcon,
  Sprout,
  Thermometer,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { satelliteService } from '../services/satelliteService';
import { AnalysisSubTab, NavTab, Parcel, UserPreferences } from '../types/agroshift';
import { formatAreaHa, getParcelAreaHa } from '../utils/parcelGeometry';

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
}

export function HomeScreen({
  parcels,
  selectedParcel,
  unreadAlertsCount,
  preferences,
  onSelectParcel,
  onOpenParcelDetail,
  onNavigate,
  onOpenAlerts,
  backendStatus,
  dataSource,
  syncStatus,
}: HomeScreenProps) {
  if (!selectedParcel) {
    return (
      <div className="p-6 text-center space-y-3">
        <p className="text-sm text-[var(--agro-muted)]">No hay parcelas registradas todavía.</p>
        <button
          type="button"
          onClick={() => onNavigate('parcelas')}
          className="px-4 py-2.5 rounded-xl agro-primary text-white text-sm font-semibold"
        >
          Ir a Mis parcelas
        </button>
      </div>
    );
  }

  const hasIndicators = selectedParcel.indicatorsAvailable !== false;
  const timeSeries = hasIndicators ? satelliteService.getTimeSeriesForParcel(selectedParcel).slice(-6) : [];
  const moistureDisplay =
    preferences.moistureUnit === 'volumetric'
      ? `${selectedParcel.indicators.moistureVolumetric.toFixed(2)} m³/m³`
      : `${selectedParcel.indicators.moisturePct} %`;

  const indicatorCards = [
    {
      id: 'humedad',
      title: 'Humedad superficial del suelo',
      value: hasIndicators ? moistureDisplay : 'N/D',
      source: hasIndicators ? 'Fuente: SMAP' : 'Sin análisis',
      status: hasIndicators ? 'Referencia regional' : 'Pendiente de análisis',
      icon: Droplets,
      accent: 'text-[var(--agro-info-text)] bg-[var(--agro-info-bg)]',
    },
    {
      id: 'temperatura',
      title: 'Temperatura superficial',
      value: hasIndicators ? `${selectedParcel.indicators.temperatureC.toFixed(1)} °C` : 'N/D',
      source: hasIndicators ? 'Fuente: ECOSTRESS' : 'Sin análisis',
      status: hasIndicators ? 'Observación disponible' : 'Pendiente de análisis',
      icon: Thermometer,
      accent: 'text-[var(--agro-warning-text)] bg-[var(--agro-warning-bg)]',
    },
    {
      id: 'precipitacion',
      title: 'Precipitación mensual',
      value: hasIndicators ? `${selectedParcel.indicators.precipitationMm.toFixed(1)} mm` : 'N/D',
      source: hasIndicators ? 'Fuente: GPM' : 'Sin análisis',
      status: hasIndicators ? 'Acumulado del período' : 'Pendiente de análisis',
      icon: CloudRain,
      accent: 'text-[var(--agro-info-text)] bg-[var(--agro-info-bg)]',
    },
    {
      id: 'ndvi',
      title: 'Índice NDVI',
      value: hasIndicators ? selectedParcel.indicators.ndvi.toFixed(2) : 'N/D',
      source: hasIndicators ? 'Fuente: Landsat/MODIS' : 'Sin análisis',
      status: hasIndicators ? selectedParcel.indicators.ndvi >= 0.55 ? 'Vegetación activa' : 'Cobertura moderada' : 'Pendiente de análisis',
      icon: Sprout,
      accent: 'text-[var(--agro-lime)] bg-[var(--agro-selected)]',
    },
  ];

  const quickActions = [
    {
      label: 'Ver mapa satelital',
      sub: 'Capas y polígonos OSM',
      icon: MapIcon,
      onClick: () => onNavigate('mapa'),
    },
    {
      label: 'Analizar mi parcela',
      sub: 'Series y fusión de datos',
      icon: TrendingUp,
      onClick: () => onNavigate('analisis', 'satelital'),
    },
    {
      label: 'Consultar historial',
      sub: 'Ciclos y rotación agrícola',
      icon: History,
      onClick: () => onNavigate('analisis', 'historial'),
    },
    {
      label: 'Revisar alertas',
      sub: `${unreadAlertsCount} sin leer`,
      icon: Bell,
      onClick: onOpenAlerts,
    },
  ];

  return (
    <div className="space-y-5 pb-6">
      {/* Top App Header */}
      <header className="agro-home-header bg-gradient-to-br from-[#166534] via-[#15803d] to-[#14532d] text-white px-4 pt-4 pb-6 rounded-b-3xl lg:rounded-3xl shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center font-bold text-sm tracking-tight border border-white/20 shrink-0">
              AT
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-emerald-100 truncate">AgroShift AI</p>
              <h1 className="text-lg font-bold leading-tight truncate">Buenos días</h1>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenAlerts}
            aria-label={`Notificaciones (${unreadAlertsCount} sin leer)`}
            className="relative min-h-[44px] min-w-[44px] rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors shrink-0"
          >
            <Bell className="w-5 h-5 text-white" />
            {unreadAlertsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#F59E0B] text-slate-950 text-[10px] font-bold flex items-center justify-center tabular-nums">
                {unreadAlertsCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 mt-2">
          <p className="text-sm text-emerald-50/90">Tu campo, más inteligente</p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2 py-1 text-[10px] font-semibold text-emerald-50 whitespace-nowrap">
            <span className={`w-1.5 h-1.5 rounded-full ${backendStatus === 'connected' ? 'bg-lime-300' : backendStatus === 'offline' ? 'bg-amber-300' : 'bg-[var(--agro-surface)] animate-pulse'}`} />
            {backendStatus === 'connected' ? 'Backend conectado' : backendStatus === 'offline' ? 'Modo local' : 'Conectando…'}
          </span>
          {syncStatus !== 'idle' && (
            <span className="text-[10px] font-semibold text-emerald-100">
              {syncStatus === 'saving' ? 'Guardando…' : syncStatus === 'saved' ? 'Guardado' : 'No sincronizado'}
            </span>
          )}
        </div>

        {/* Parcel Selector */}
        <div className="mt-4">
          <label htmlFor="home-parcel-select" className="sr-only">
            Seleccionar parcela activa
          </label>
          <div className="relative">
            <select
              id="home-parcel-select"
              value={selectedParcel.id}
              onChange={(e) => onSelectParcel(e.target.value)}
              className="w-full h-11 pl-3.5 pr-10 rounded-xl bg-white/15 border border-white/25 text-sm font-semibold text-white appearance-none focus:outline-none focus:ring-2 focus:ring-white/60 cursor-pointer"
            >
              {parcels.map((p) => (
                <option key={p.id} value={p.id} className="text-[var(--agro-text)] bg-[var(--agro-surface)]">
                  {p.name} — {p.crop} ({formatAreaHa(getParcelAreaHa(p))})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-white/80 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Hero Parcel Summary Card */}
        <div className="mt-4 bg-[var(--agro-surface)] text-[var(--agro-text)] rounded-2xl p-3.5 shadow-sm flex items-center gap-3.5">
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-[var(--agro-selected)] shrink-0 relative">
            {selectedParcel.imageUrl ? (
              <img
                src={selectedParcel.imageUrl}
                alt={`Cultivo de ${selectedParcel.crop} en ${selectedParcel.name}`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--agro-lime)]">
                <Layers className="w-7 h-7" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-[var(--agro-text)] truncate">
                {selectedParcel.name}
              </h2>
              <span className="text-xs font-semibold text-[var(--agro-lime)] whitespace-nowrap shrink-0">
                {selectedParcel.monitoringStatus}
              </span>
            </div>
            <p className="text-xs text-[var(--agro-muted)] mt-0.5 truncate">
              {selectedParcel.location} · {getParcelAreaHa(selectedParcel).toFixed(2)} hectáreas
            </p>
            <p className="text-xs font-medium text-[var(--agro-text)] mt-1">
              Cultivo registrado: <span className="font-semibold">{selectedParcel.crop}</span>
            </p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[11px] text-[var(--agro-muted)]">
                {dataSource === 'backend' ? 'Datos sincronizados' : dataSource === 'offline' ? 'Datos locales · sin conexión' : 'Datos demostrativos'}
              </span>
              <button
                type="button"
                onClick={() => onOpenParcelDetail(selectedParcel.id)}
                className="text-xs font-semibold text-[var(--agro-lime)] hover:text-[var(--agro-lime)] inline-flex items-center gap-0.5 whitespace-nowrap"
              >
                Ver ficha <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="px-4 lg:px-0 space-y-5">
        {/* Honest Demo Indicator Notice */}
        <div className="flex items-center justify-between gap-2 text-xs text-[var(--agro-muted)] px-1">
          <span>Indicadores ambientales de referencia (valores demostrativos)</span>
          <span className="font-mono tabular-nums text-[11px] whitespace-nowrap">Nov 2026</span>
        </div>

        <section
          aria-labelledby="next-step-title"
          className="rounded-2xl border border-emerald-200 bg-[var(--agro-selected)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--agro-surface)] text-[var(--agro-lime)] flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide font-bold text-[var(--agro-lime)]">Siguiente paso recomendado</p>
              <h2 id="next-step-title" className="text-sm font-bold text-[var(--agro-text)] mt-0.5">Revisá el análisis de {selectedParcel.name}</h2>
              <p className="text-xs text-[var(--agro-muted)] mt-1 leading-5">Compará la evolución satelital y detectá cambios antes de revisar el historial.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('analisis', 'satelital')}
            className="min-h-[44px] px-4 rounded-xl bg-[#166534] text-white text-xs font-bold hover:bg-[#14532d] transition-colors whitespace-nowrap"
          >
            Abrir análisis
          </button>
        </section>

        {/* 4 Indicator Cards */}
        <section aria-label="Indicadores ambientales" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {indicatorCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                className="bg-[var(--agro-surface)] rounded-2xl p-3.5 border border-[var(--agro-line)]/90 shadow-xs flex flex-col justify-between gap-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium text-[var(--agro-muted)] leading-snug">{card.title}</p>
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${card.accent}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <p className="text-xl font-bold text-[var(--agro-text)] font-mono tabular-nums tracking-tight">
                    {card.value}
                  </p>
                  <p className="text-[11px] text-[var(--agro-muted)] mt-1 truncate">{card.source}</p>
                  <p className="text-[11px] font-medium text-[var(--agro-text)] truncate">{card.status}</p>
                </div>
              </div>
            );
          })}
        </section>

        {/* Quick Navigation + Environmental Chart split on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Quick Navigation Cards */}
          <section aria-label="Accesos rápidos" className="lg:col-span-5 space-y-2.5">
            <h2 className="text-sm font-bold text-[var(--agro-text)] px-1">Acciones rápidas</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {quickActions.map((act) => {
                const Icon = act.icon;
                return (
                  <button
                    key={act.label}
                    type="button"
                    onClick={act.onClick}
                    className={`min-h-[76px] ${act.label === 'Analizar mi parcela' ? 'bg-[#166534] text-white border-[#166534] hover:bg-[#14532d]' : 'bg-[var(--agro-surface)] text-[var(--agro-text)] border-[var(--agro-line)]/90 hover:bg-[var(--agro-surface-soft)]'} active:scale-[0.99] transition-all rounded-2xl p-3.5 border shadow-xs text-left flex flex-col justify-between`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${act.label === 'Analizar mi parcela' ? 'bg-white/15 text-white' : 'bg-[var(--agro-selected)] text-[var(--agro-lime)]'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="mt-2">
                      <p className={`text-xs font-bold leading-tight ${act.label === 'Analizar mi parcela' ? 'text-white' : 'text-[var(--agro-text)]'}`}>{act.label}</p>
                      <p className={`text-[11px] mt-0.5 truncate ${act.label === 'Analizar mi parcela' ? 'text-emerald-100' : 'text-[var(--agro-muted)]'}`}>{act.sub}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Resumen Ambiental Chart */}
          <section
            aria-label="Resumen ambiental"
            className="lg:col-span-7 bg-[var(--agro-surface)] rounded-2xl p-4 border border-[var(--agro-line)]/90 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-[var(--agro-text)]">Resumen ambiental</h2>
                <p className="text-xs text-[var(--agro-muted)]">
                  Evolución demostrativa NDVI y lluvia (últimos 6 meses)
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('analisis', 'satelital')}
                className="text-xs font-semibold text-[var(--agro-lime)] hover:text-[var(--agro-lime)] whitespace-nowrap"
              >
                Explorar →
              </button>
            </div>

            <div className="h-48 w-full">
              {hasIndicators ? <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeries} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ndviGradHome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16A34A" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#16A34A" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis
                    yAxisId="ndvi"
                    domain={[0, 1]}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis yAxisId="rain" orientation="right" hide />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    yAxisId="ndvi"
                    type="monotone"
                    dataKey="ndvi"
                    name="NDVI (demo)"
                    stroke="#16A34A"
                    strokeWidth={2.5}
                    fill="url(#ndviGradHome)"
                  />
                  <Area
                    yAxisId="rain"
                    type="monotone"
                    dataKey="precipitationMm"
                    name="Precipitación (mm)"
                    stroke="#0284C7"
                    strokeWidth={1.8}
                    fillOpacity={0}
                  />
                </AreaChart>
              </ResponsiveContainer> : (
                <div className="h-full flex items-center justify-center rounded-xl bg-[var(--agro-surface-soft)] text-xs text-[var(--agro-muted)] text-center px-6">
                  El backend todavía no tiene una serie ambiental para esta parcela. Ejecutá un análisis para generarla.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
