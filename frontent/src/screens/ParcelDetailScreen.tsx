import {
  ArrowLeft,
  Calendar,
  MapPin,
  Mountain,
  Plus,
  Trash2,
} from 'lucide-react';
import React, { useState } from 'react';
import { DataSourcesCatalog } from '../components/DataSourcesCatalog';
import { Parcel3DView } from '../components/Parcel3DView';
import { QualityIndicator } from '../components/QualityBadgeText';
import { satelliteService } from '../services/satelliteService';
import {
  CropHistoryRecord,
  FieldObservation,
  Parcel,
  UserPreferences,
} from '../types/agroterra';
import { formatCoordinates } from '../utils/geo';
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
}: ParcelDetailScreenProps) {
  const [tab, setTab] = useState<DetailTab>('resumen');
  const [noteText, setNoteText] = useState('');
  const [noteCategory, setNoteCategory] = useState<FieldObservation['category']>('Fenología');

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

      {/* Referencial shape visualization + core metadata */}
      <Parcel3DView parcel={parcel} />

      {!hasIndicators && (
        <div className="rounded-2xl border border-amber-200 bg-[var(--agro-warning-bg)] px-4 py-3 text-xs text-[var(--agro-warning-text)]">
          Esta parcela está registrada, pero todavía no tiene indicadores ambientales. Ejecutá un análisis para consultar datos climáticos y generar métricas.
        </div>
      )}

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
