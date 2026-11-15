import {
  ArrowLeft,
  BarChart3,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Edit3,
  ExternalLink,
  History,
  Info,
  LoaderCircle,
  MapPin,
  Mountain,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import React, { useState } from 'react';
import { CropIcon } from '../components/CropIcon';
import { DataSourcesCatalog } from '../components/DataSourcesCatalog';
import { Parcel3DView } from '../components/Parcel3DView';
import { QualityIndicator } from '../components/QualityBadgeText';
import { backendApi, BackendRecommendations } from '../services/apiClient';
import { satelliteService } from '../services/satelliteService';
import {
  CropHistoryRecord,
  FieldObservation,
  Parcel,
  UserPreferences,
} from '../types/agroshift';
import { formatCoordinates, getOpenStreetMapUrl } from '../utils/geo';
import {
  formatAreaHa,
  formatPerimeter,
  getParcelAreaHa,
} from '../utils/parcelGeometry';

interface ParcelDetailScreenProps {
  parcel: Parcel;
  historyRecords: CropHistoryRecord[];
  preferences: UserPreferences;
  onBack: () => void;
  onAddObservation: (parcelId: string, obs: FieldObservation) => void;
  onDeleteObservation: (parcelId: string, obsId: string) => void;
  onOpenAnalysis: () => void;
  onOpenHistory: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

type DetailTab = 'resumen' | 'satelitales' | 'historial' | 'suelo' | 'observaciones';

export function ParcelDetailScreen({
  parcel,
  historyRecords,
  preferences,
  onBack,
  onAddObservation,
  onDeleteObservation,
  onOpenAnalysis,
  onOpenHistory,
  onEdit,
  onDelete,
}: ParcelDetailScreenProps) {
  const [tab, setTab] = useState<DetailTab>('resumen');
  const [noteText, setNoteText] = useState('');
  const [noteCategory, setNoteCategory] = useState<FieldObservation['category']>('Fenología');
  const [recommendationStatus, setRecommendationStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [recommendations, setRecommendations] = useState<BackendRecommendations | null>(null);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
  const [locationCopied, setLocationCopied] = useState(false);

  const hasIndicators = parcel.indicatorsAvailable !== false;
  const indicators = hasIndicators ? satelliteService.getIndicatorsForParcel(parcel) : [];
  const parcelHistory = historyRecords.filter((h) => h.parcelId === parcel.id);

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    onAddObservation(parcel.id, {
      id: `obs-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      author: 'Usuario local',
      category: noteCategory,
      note: noteText.trim(),
    });
    setNoteText('');
  };

  const handleRecommendCrops = async () => {
    if (!parcel.backendId) {
      setRecommendationStatus('error');
      setRecommendationError('Registra o sincroniza la parcela para usar clima real de NASA POWER.');
      return;
    }
    setRecommendationStatus('loading');
    setRecommendationError(null);
    try {
      setRecommendations(await backendApi.recommendCrops(parcel.backendId));
      setRecommendationStatus('ready');
    } catch (error) {
      setRecommendationStatus('error');
      setRecommendationError(error instanceof Error ? error.message : 'No se pudo evaluar la parcela.');
    }
  };

  const locationPoint = parcel.measurement?.centroid ?? parcel.centroid;
  const locationText = `${locationPoint.lat}, ${locationPoint.lng}`;

  const handleCopyLocation = async () => {
    try {
      await navigator.clipboard.writeText(locationText);
      setLocationCopied(true);
      window.setTimeout(() => setLocationCopied(false), 2200);
    } catch {
      setLocationCopied(false);
    }
  };

  return (
    <div className="p-4 lg:p-0 space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] px-3 -ml-2 rounded-xl text-sm font-semibold text-[var(--agro-text)] hover:bg-[var(--agro-surface-soft)] inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
        <button
          type="button"
          onClick={onOpenAnalysis}
          className="min-h-[40px] px-3.5 rounded-xl bg-[#166534] text-white text-xs font-semibold"
        >
          Análisis satelital
        </button>
      </div>

      <section className="rounded-3xl border border-[var(--agro-line)]/90 bg-[var(--agro-surface)] p-4 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide font-bold text-[var(--agro-muted)]">Parcela seleccionada</p>
            <h1 className="text-xl font-bold text-[var(--agro-text)] mt-1 truncate">{parcel.name}</h1>
            <p className="text-xs text-[var(--agro-muted)] flex items-center gap-1.5 mt-1">
              <MapPin className="w-3.5 h-3.5 shrink-0" /> {parcel.department} · {parcel.location}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[var(--agro-success-bg)] px-2.5 py-1 text-[11px] font-bold text-[var(--agro-success-text)]">
            {parcel.monitoringStatus}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-[var(--agro-line)]">
          <div><p className="text-[10px] text-[var(--agro-muted)]">Superficie</p><p className="text-sm font-bold text-[var(--agro-text)] font-mono tabular-nums mt-0.5">{parcel.areaHa.toFixed(2)} ha</p></div>
          <div><p className="text-[10px] text-[var(--agro-muted)]">Cultivo</p><p className="text-sm font-bold text-[var(--agro-text)] mt-0.5 truncate">{parcel.crop}</p></div>
          <div><p className="text-[10px] text-[var(--agro-muted)]">Geometría</p><p className="text-sm font-bold text-[var(--agro-text)] mt-0.5">{parcel.polygon.length} vértices</p></div>
        </div>
      </section>

      <section
        className="rounded-3xl border border-[var(--agro-line)]/90 bg-[var(--agro-surface)] p-4 shadow-xs space-y-3"
        aria-labelledby="parcel-actions-title"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="parcel-actions-title" className="text-sm font-bold text-[var(--agro-text)]">
              Acciones de parcela
            </h2>
            <p className="text-[11px] text-[var(--agro-muted)] mt-0.5">
              Gestiona esta parcela sin volver al listado.
            </p>
          </div>
          <MapPin className="w-4 h-4 text-[var(--agro-lime)]" aria-hidden="true" />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            type="button"
            onClick={onEdit}
            className="min-h-[44px] rounded-xl border border-[var(--agro-line)] bg-[var(--agro-surface-soft)] px-3 text-xs font-semibold text-[var(--agro-text)] inline-flex items-center justify-center gap-1.5 hover:bg-[var(--agro-canvas)]"
          >
            <Edit3 className="w-4 h-4" />
            Editar
          </button>
          <button
            type="button"
            onClick={onOpenAnalysis}
            className="min-h-[44px] rounded-xl bg-[#166534] px-3 text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5 hover:bg-[#14532d]"
          >
            <BarChart3 className="w-4 h-4" />
            Análisis
          </button>
          <button
            type="button"
            onClick={onOpenHistory}
            className="min-h-[44px] rounded-xl border border-[var(--agro-line)] bg-[var(--agro-surface-soft)] px-3 text-xs font-semibold text-[var(--agro-text)] inline-flex items-center justify-center gap-1.5 hover:bg-[var(--agro-canvas)]"
          >
            <History className="w-4 h-4" />
            Historial
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="min-h-[44px] rounded-xl border border-red-200 bg-[var(--agro-danger-bg)] px-3 text-xs font-semibold text-[var(--agro-danger-text)] inline-flex items-center justify-center gap-1.5 hover:bg-red-100"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar
          </button>
        </div>

        <div className="flex flex-col gap-2 rounded-2xl bg-[var(--agro-surface-soft)] p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide font-bold text-[var(--agro-muted)]">Ubicación</p>
            <p className="mt-1 break-words text-xs font-mono tabular-nums text-[var(--agro-text)]">
              {formatCoordinates(locationPoint)}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => void handleCopyLocation()}
              className="min-h-[40px] rounded-xl border border-[var(--agro-line)] bg-[var(--agro-surface)] px-3 text-xs font-semibold text-[var(--agro-text)] inline-flex items-center justify-center gap-1.5 hover:bg-[var(--agro-canvas)]"
            >
              {locationCopied ? <CheckCircle2 className="w-4 h-4 text-[var(--agro-lime)]" /> : <Copy className="w-4 h-4" />}
              {locationCopied ? 'Copiada' : 'Copiar'}
            </button>
            <a
              href={getOpenStreetMapUrl(locationPoint)}
              target="_blank"
              rel="noreferrer"
              className="min-h-[40px] rounded-xl border border-[var(--agro-line)] bg-[var(--agro-surface)] px-3 text-xs font-semibold text-[var(--agro-text)] inline-flex items-center justify-center gap-1.5 hover:bg-[var(--agro-canvas)]"
            >
              <ExternalLink className="w-4 h-4" />
              Ver mapa
            </a>
          </div>
        </div>
        <p className="sr-only" aria-live="polite">{locationCopied ? 'Ubicación copiada al portapapeles.' : ''}</p>
      </section>

      {/* Referencial shape visualization + core metadata */}
      <Parcel3DView parcel={parcel} />

      {!hasIndicators && (
        <div className="rounded-2xl border border-amber-200 bg-[var(--agro-warning-bg)] px-4 py-3 text-xs text-[var(--agro-warning-text)]">
          Esta parcela está registrada, pero todavía no tiene indicadores ambientales. Ejecutá un análisis para consultar datos climáticos y generar métricas.
        </div>
      )}

      <section className="rounded-3xl border border-[var(--agro-line)]/90 bg-[var(--agro-surface)] p-4 shadow-xs" aria-labelledby="crop-recommendation-title">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--agro-success-bg)] text-[var(--agro-lime)] flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 id="crop-recommendation-title" className="text-sm font-bold text-[var(--agro-text)]">Sugerencias de cultivo</h2>
              <p className="text-xs text-[var(--agro-muted)] mt-1 leading-relaxed">
                Evalúa qué cultivos son más compatibles con el clima histórico y los datos declarados de esta parcela.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleRecommendCrops()}
            disabled={recommendationStatus === 'loading'}
            className="min-h-[44px] px-4 rounded-xl bg-[var(--agro-accent)] text-[#10300f] text-xs font-extrabold inline-flex items-center justify-center gap-2 disabled:opacity-60 shrink-0"
          >
            {recommendationStatus === 'loading' && <LoaderCircle className="w-4 h-4 animate-spin" />}
            {recommendationStatus === 'loading' ? 'Evaluando…' : 'Sugerir cultivos'}
          </button>
        </div>

        {recommendationStatus === 'idle' && !parcel.backendId && (
          <p className="mt-3 rounded-xl bg-[var(--agro-surface-soft)] p-3 text-[11px] text-[var(--agro-muted)] flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0" /> Esta parcela todavía es local o demostrativa. Sincronízala para consultar datos climáticos reales.
          </p>
        )}
        {recommendationError && (
          <p role="alert" className="mt-3 rounded-xl bg-[var(--agro-danger-bg)] p-3 text-xs text-[var(--agro-danger-text)]">{recommendationError}</p>
        )}
        {recommendations && recommendationStatus === 'ready' && (
          <div className="mt-4 space-y-3">
            <div className="rounded-xl bg-[var(--agro-info-bg)] p-3 text-[11px] text-[var(--agro-info-text)] flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>Filtro exploratorio con {recommendations.source.join(' + ')} · periodo {recommendations.climate_years.join('–')}. No predice rendimiento ni reemplaza validación local.</span>
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              {recommendations.recommendations.map((item, index) => (
                <article key={item.id} className="rounded-2xl border border-[var(--agro-line)] bg-[var(--agro-surface-soft)] p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CropIcon crop={item.label} className="text-[var(--agro-lime)]" />
                      <div>
                        <p className="text-[10px] uppercase tracking-wide font-bold text-[var(--agro-muted)]">Opción {index + 1}</p>
                        <h3 className="text-sm font-bold text-[var(--agro-text)]">{item.label}</h3>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-[var(--agro-text)] font-mono tabular-nums">{item.score}<small className="text-[10px] font-sans text-[var(--agro-muted)]">/100</small></span>
                  </div>
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-[var(--agro-lime)]">
                    {item.status === 'compatible' ? 'Compatible en el filtro' : item.status === 'revisar' ? 'Requiere revisión' : 'No priorizar'}
                    {item.is_current && ' · Cultivo actual'}
                  </p>
                  <ul className="mt-2 space-y-1.5 text-[11px] text-[var(--agro-muted)]">
                    {item.reasons.slice(0, 2).map((reason) => <li key={reason} className="flex gap-1.5"><Check className="w-3.5 h-3.5 text-[var(--agro-lime)] shrink-0" />{reason}</li>)}
                    {item.risks.slice(0, 2).map((risk) => <li key={risk} className="flex gap-1.5"><Info className="w-3.5 h-3.5 text-[var(--agro-warning-text)] shrink-0" />{risk}</li>)}
                  </ul>
                </article>
              ))}
            </div>
            <p className="text-[11px] text-[var(--agro-muted)]">Método: {recommendations.methodology.formula}. La altitud, variedad, plagas y calendario fenológico todavía requieren información adicional.</p>
          </div>
        )}
      </section>

      <div className="bg-[var(--agro-surface)] rounded-3xl p-4 border border-[var(--agro-line)]/90 shadow-xs space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-[var(--agro-text)]">Metadatos de la parcela</h2>
            <span className="text-xs font-semibold text-[var(--agro-lime)]">{parcel.monitoringStatus}</span>
          </div>
          <p className="text-xs text-[var(--agro-muted)] flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[var(--agro-muted)] shrink-0" />
            <span>
              {parcel.department} · {parcel.location} ·{' '}
              {formatCoordinates(parcel.measurement?.centroid ?? parcel.centroid)}
            </span>
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-[var(--agro-line)]">
          <div>
            <p className="text-[11px] text-[var(--agro-muted)] flex items-center gap-1.5">
              Superficie
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  parcel.measurement
                    ? 'bg-[#DCFCE7] text-[#166534]'
                    : 'bg-[var(--agro-soft)] text-[var(--agro-muted)]'
                }`}
              >
                {parcel.measurement ? 'Medida' : 'Declarada'}
              </span>
            </p>
            <p className="text-sm font-bold text-[var(--agro-text)] font-mono tabular-nums">
              {formatAreaHa(getParcelAreaHa(parcel))}
            </p>
            {parcel.measurement && (
              <>
                <p className="text-[11px] text-[var(--agro-muted)] font-mono tabular-nums mt-0.5">
                  Perímetro {formatPerimeter(parcel.measurement.perimeterM)}
                </p>
                <p className="text-[10px] text-[var(--agro-muted)]">
                  Medición geodésica referencial
                </p>
              </>
            )}
          </div>
          <div>
            <p className="text-[11px] text-[var(--agro-muted)]">Cultivo actual</p>
            <p className="text-sm font-bold text-[var(--agro-text)]">{parcel.crop}</p>
          </div>
          <div>
            <p className="text-[11px] text-[var(--agro-muted)]">Fecha de registro</p>
            <p className="text-xs font-semibold text-[var(--agro-text)] font-mono tabular-nums mt-0.5">
              {parcel.registeredAt}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[var(--agro-muted)]">Fecha de siembra</p>
            <p className="text-xs font-semibold text-[var(--agro-text)] font-mono tabular-nums mt-0.5">
              {parcel.plantingDate}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[var(--agro-muted)]">Cosecha estimada</p>
            <p className="text-xs font-semibold text-[var(--agro-text)] font-mono tabular-nums mt-0.5">
              {parcel.estimatedHarvestDate}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[var(--agro-muted)]">Altitud referencial</p>
            <p className="text-xs font-semibold text-[var(--agro-text)] font-mono tabular-nums mt-0.5">
              ~{parcel.elevationM} m s. n. m.
            </p>
          </div>
        </div>
      </div>

      {/* 5 Internal Tabs */}
      <div className="flex items-center gap-1 p-1 bg-[var(--agro-surface-soft)] rounded-xl overflow-x-auto no-scrollbar">
        {(
          [
            ['resumen', 'Resumen'],
            ['satelitales', 'Datos satelitales'],
            ['historial', 'Historial'],
            ['suelo', 'Suelo'],
            ['observaciones', 'Observaciones'],
          ] as [DetailTab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 min-h-[38px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              tab === id ? 'bg-[var(--agro-surface)] text-[var(--agro-lime)] shadow-xs' : 'text-[var(--agro-muted)] hover:text-[var(--agro-text)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'resumen' && (
        <div className="space-y-3">
          <p className="text-xs text-[var(--agro-muted)] px-1">
            Indicadores con fuente, resolución y microexplicación.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {indicators.map((ind) => {
              const displayValue =
                ind.id === 'humedad' && preferences.moistureUnit === 'volumetric'
                  ? `${ind.volumetricValue?.toFixed(2)} m³/m³`
                  : `${ind.value} ${ind.unit}`;
              return (
                <div
                  key={ind.id}
                  className="bg-[var(--agro-surface)] rounded-2xl p-4 border border-[var(--agro-line)]/90 space-y-2 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-[var(--agro-text)]">{ind.label}</p>
                    <QualityIndicator quality={ind.quality} compact />
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-lg font-bold text-[var(--agro-text)] font-mono tabular-nums">
                      {displayValue}
                    </p>
                    <span className="text-[11px] font-semibold text-[var(--agro-lime)]">
                      {ind.statusLabel}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--agro-muted)] leading-relaxed bg-[var(--agro-surface-soft)] p-2.5 rounded-xl">
                    {ind.interpretation}
                  </p>
                  <div className="text-[11px] text-[var(--agro-muted)] space-y-0.5 pt-1 border-t border-[var(--agro-line)]">
                    <p>
                      Fuente: <strong className="text-[var(--agro-text)]">{ind.source}</strong> · Res.{' '}
                      {ind.resolution}
                    </p>
                    <p>
                      Fecha: {ind.referenceDate} · {ind.validationState}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'satelitales' && (
        <div className="space-y-4">
          <div className="space-y-2.5">
            {indicators.map((ind) => (
              <div
                key={ind.id}
                className="bg-[var(--agro-surface)] rounded-2xl p-4 border border-[var(--agro-line)]/90 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-[var(--agro-text)]">
                    {ind.label} — {ind.source}
                  </span>
                  <QualityIndicator quality={ind.quality} />
                </div>
                <p className="text-xs text-[var(--agro-text)] font-mono tabular-nums">
                  Valor demostrativo: <strong>{ind.value} {ind.unit}</strong> · {ind.statusLabel}
                </p>
                <p className="text-xs text-[var(--agro-muted)]">{ind.interpretation}</p>
                <p className="text-[11px] text-[var(--agro-muted)]">
                  Resolución: {ind.resolution} · Fecha de referencia: {ind.referenceDate}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-2 space-y-2.5">
            <h2 className="text-sm font-bold text-[var(--agro-text)] px-1">
              Guía explicativa de fuentes del sistema
            </h2>
            <DataSourcesCatalog compact initialSource={null} />
          </div>
        </div>
      )}

      {tab === 'historial' && (
        <div className="bg-[var(--agro-surface)] rounded-2xl p-4 border border-[var(--agro-line)]/90 space-y-3">
          <h2 className="text-sm font-bold text-[var(--agro-text)]">Historial agrícola de la parcela</h2>
          {parcelHistory.length === 0 ? (
            <p className="text-xs text-[var(--agro-muted)] py-4 text-center">
              Sin campañas previas registradas para esta parcela. Puedes agregarlas en Análisis → Historial.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {parcelHistory.map((item) => (
                <div key={item.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[var(--agro-text)]">{item.crop}</span>
                    <span className="text-xs font-mono text-[var(--agro-muted)]">{item.season}</span>
                  </div>
                  <p className="text-xs text-[var(--agro-muted)] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[var(--agro-muted)]" />
                    <span>
                      {item.plantingDate} → {item.harvestDate}
                    </span>
                  </p>
                  <p className="text-xs text-[var(--agro-muted)] leading-relaxed">{item.observations}</p>
                  <p className="text-[11px] text-[var(--agro-muted)] font-mono tabular-nums">
                    NDVI prom: {item.avgNdvi ?? 'N/D'} · Lluvia: {item.totalPrecipitationMm} mm · Temp:{' '}
                    {item.avgTempC} °C
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'suelo' && (
        <div className="bg-[var(--agro-surface)] rounded-2xl p-4 border border-[var(--agro-line)]/90 space-y-4 shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[var(--agro-warning-bg)] text-[var(--agro-warning-text)] flex items-center justify-center shrink-0">
                <Mountain className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[var(--agro-text)]">
                  Propiedades estimadas del suelo (SoilGrids)
                </h2>
                <p className="text-[11px] text-[var(--agro-muted)]">
                  Referencia zonal a 250 m · Profundidad superficial (0–30 cm) · Demostrativo
                </p>
              </div>
            </div>
            <QualityIndicator quality="Requiere validación local" compact />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-[var(--agro-surface-soft)] rounded-xl p-3">
              <p className="text-[11px] text-[var(--agro-muted)]">Clase textural estimada</p>
              <p className="text-sm font-bold text-[var(--agro-text)] mt-0.5">
                {parcel.indicators.soilTexture}
              </p>
            </div>
            <div className="bg-[var(--agro-surface-soft)] rounded-xl p-3">
              <p className="text-[11px] text-[var(--agro-muted)]">pH en agua (estimado)</p>
              <p className="text-sm font-bold text-[var(--agro-text)] font-mono tabular-nums mt-0.5">
                {parcel.indicators.soilPh.toFixed(1)}
              </p>
            </div>
            <div className="bg-[var(--agro-surface-soft)] rounded-xl p-3">
              <p className="text-[11px] text-[var(--agro-muted)]">Carbono orgánico</p>
              <p className="text-sm font-bold text-[var(--agro-text)] font-mono tabular-nums mt-0.5">
                {parcel.indicators.soilOrganicCarbon}
              </p>
            </div>
            <div className="bg-[var(--agro-surface-soft)] rounded-xl p-3">
              <p className="text-[11px] text-[var(--agro-muted)]">Densidad aparente ref.</p>
              <p className="text-sm font-bold text-[var(--agro-text)] font-mono tabular-nums mt-0.5">
                {parcel.indicators.soilBulkDensity ?? '1.32 kg/dm³'}
              </p>
            </div>
          </div>

          <div className="bg-[var(--agro-warning-bg)] border border-amber-200/80 rounded-xl p-3 text-xs text-[var(--agro-warning-text)] leading-relaxed">
            <strong>Alcance SoilGrids:</strong> Estos parámetros caracterizan la tendencia edáfica de
            la zona a escala de 250 m como referencia inicial. Para fertilización o enmiendas, realiza
            un muestreo compuesto y análisis de laboratorio en la parcela.
          </div>
        </div>
      )}

      {tab === 'observaciones' && (
        <div className="space-y-4">
          <form
            onSubmit={handleSaveNote}
            className="bg-[var(--agro-surface)] rounded-2xl p-4 border border-[var(--agro-line)]/90 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[var(--agro-text)]">Nueva observación en campo</h2>
              <select
                value={noteCategory}
                onChange={(e) => setNoteCategory(e.target.value as FieldObservation['category'])}
                className="h-9 px-2.5 rounded-lg border border-[var(--agro-line)] text-xs bg-[var(--agro-surface)]"
              >
                <option value="Fenología">Fenología</option>
                <option value="Riego">Riego</option>
                <option value="Suelo">Suelo</option>
                <option value="Sanidad">Sanidad</option>
                <option value="General">General</option>
              </select>
            </div>
            <textarea
              rows={3}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Ej. Verificación de humedad al tacto a 10 cm, estado de hojas, cobertura real..."
              className="w-full p-3 rounded-xl border border-[var(--agro-line)] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            <button
              type="submit"
              className="w-full h-11 rounded-xl agro-primary hover:bg-[#166534] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Guardar observación
            </button>
          </form>

          <div className="space-y-2.5">
            {parcel.observations.length === 0 ? (
              <div className="bg-[var(--agro-surface)] rounded-2xl p-6 border border-[var(--agro-line)] text-center text-xs text-[var(--agro-muted)]">
                Aún no hay observaciones registradas en campo para esta parcela.
              </div>
            ) : (
              parcel.observations.map((obs) => (
                <div
                  key={obs.id}
                  className="bg-[var(--agro-surface)] rounded-2xl p-3.5 border border-[var(--agro-line)]/90 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-[var(--agro-muted)]">
                      {obs.category} · {obs.date} · {obs.author}
                    </p>
                    <p className="text-sm text-[var(--agro-text)] leading-relaxed">{obs.note}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteObservation(parcel.id, obs.id)}
                    aria-label="Eliminar observación"
                    className="p-2 rounded-lg text-[var(--agro-muted)] hover:text-[var(--agro-danger-text)] hover:bg-[var(--agro-danger-bg)] shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
