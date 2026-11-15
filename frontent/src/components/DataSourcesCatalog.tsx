import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CloudRain,
  Droplets,
  Info,
  Layers,
  Map as MapIcon,
  Mountain,
  Sprout,
  Thermometer,
  Trees,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { satelliteService } from '../services/satelliteService';
import { SatelliteSourceId, SourceTag } from '../types/agroshift';
import { QualityIndicator } from './QualityBadgeText';

interface DataSourcesCatalogProps {
  compact?: boolean;
  initialSource?: SatelliteSourceId | null;
}

const TAG_FILTERS: ('todas' | SourceTag)[] = [
  'todas',
  'humedad',
  'temperatura',
  'lluvia',
  'vegetación',
  'biomasa',
  'suelo',
  'mapa base',
];

function getSourceIcon(tag: SourceTag) {
  switch (tag) {
    case 'humedad':
      return { Icon: Droplets, bg: 'bg-[var(--agro-info-bg)] text-[var(--agro-info-text)]' };
    case 'temperatura':
      return { Icon: Thermometer, bg: 'bg-[var(--agro-warning-bg)] text-[var(--agro-warning-text)]' };
    case 'lluvia':
      return { Icon: CloudRain, bg: 'bg-[var(--agro-info-bg)] text-[var(--agro-info-text)]' };
    case 'vegetación':
      return { Icon: Sprout, bg: 'bg-[var(--agro-selected)] text-[var(--agro-lime)]' };
    case 'biomasa':
      return { Icon: Trees, bg: 'bg-[var(--agro-selected)] text-[var(--agro-lime)]' };
    case 'suelo':
      return { Icon: Mountain, bg: 'bg-[var(--agro-warning-bg)] text-[var(--agro-warning-text)]' };
    case 'mapa base':
      return { Icon: MapIcon, bg: 'bg-[var(--agro-surface-soft)] text-[var(--agro-text)]' };
    default:
      return { Icon: Layers, bg: 'bg-[var(--agro-surface-soft)] text-[var(--agro-text)]' };
  }
}

export function DataSourcesCatalog({
  compact = false,
  initialSource = 'SMAP',
}: DataSourcesCatalogProps) {
  const sources = useMemo(() => satelliteService.getSources(), []);
  const [selectedTag, setSelectedTag] = useState<'todas' | SourceTag>('todas');
  const [expandedId, setExpandedId] = useState<SatelliteSourceId | null>(initialSource);

  const filtered = useMemo(() => {
    if (selectedTag === 'todas') return sources;
    return sources.filter((s) => s.tag === selectedTag);
  }, [sources, selectedTag]);

  return (
    <div className="space-y-4">
      {/* General Harmonization Note */}
      <div className="bg-[var(--agro-info-bg)] border border-sky-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-[var(--agro-info-text)] leading-relaxed">
        <Info className="w-4 h-4 text-[var(--agro-info-text)] shrink-0 mt-0.5" />
        <p>
          <strong>Nota general sobre fuentes:</strong> Estas fuentes no miden lo mismo ni tienen la
          misma resolución espacial o temporal, por lo que deben armonizarse para realizar
          comparaciones e interpretaciones dentro del sistema.
        </p>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        {TAG_FILTERS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => setSelectedTag(tag)}
            className={`min-h-[34px] px-3 rounded-full text-xs font-medium capitalize whitespace-nowrap shrink-0 transition-colors ${
              selectedTag === tag
                ? 'bg-[#166534] text-white'
                : 'bg-[var(--agro-surface)] border border-[var(--agro-line)] text-[var(--agro-muted)] hover:bg-[var(--agro-surface-soft)]'
            }`}
          >
            {tag === 'todas' ? 'Todas (8)' : tag}
          </button>
        ))}
      </div>

      {/* Accordion Source Cards */}
      <div className={compact ? 'space-y-2.5' : 'grid grid-cols-1 md:grid-cols-2 gap-3'}>
        {filtered.map((src) => {
          const isOpen = expandedId === src.id;
          const { Icon, bg } = getSourceIcon(src.tag);
          return (
            <article
              key={src.id}
              className="bg-[var(--agro-surface)] rounded-2xl border border-[var(--agro-line)]/90 overflow-hidden shadow-xs"
            >
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : src.id)}
                className="w-full p-3.5 text-left flex items-center justify-between gap-3 hover:bg-[var(--agro-surface-soft)] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-[var(--agro-text)]">{src.name}</h3>
                      <span className="px-2 py-0.5 rounded-full bg-[var(--agro-surface-soft)] text-[10px] font-semibold text-[var(--agro-text)]">
                        {src.tag}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--agro-muted)] truncate mt-0.5">{src.subtitle}</p>
                    <p className="text-[11px] text-[var(--agro-muted)] font-mono truncate mt-0.5">
                      Res. {src.spatialResolution} · {src.temporalResolution}
                    </p>
                  </div>
                </div>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-[var(--agro-muted)] shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[var(--agro-muted)] shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-2 border-t border-[var(--agro-line)] space-y-2.5 text-xs text-[var(--agro-text)]">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] text-[var(--agro-muted)]">
                      Acceso: <strong className="text-[var(--agro-text)]">{src.accessSource}</strong>
                    </span>
                    <QualityIndicator quality={src.quality} compact />
                  </div>

                  <div className="space-y-1.5 leading-relaxed">
                    <p>
                      <strong className="text-[var(--agro-text)]">
                        {src.id === 'OSM' ? 'Qué proporciona:' : 'Qué mide:'}
                      </strong>{' '}
                      {src.whatItMeasures}
                    </p>
                    <p>
                      <strong className="text-[var(--agro-text)]">Para qué sirve:</strong> {src.purpose}
                    </p>
                    <p>
                      <strong className="text-[var(--agro-text)]">Uso en AgroShift AI:</strong> {src.appUsage}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-[var(--agro-surface-soft)] rounded-xl p-2">
                      <p className="text-[10px] text-[var(--agro-muted)]">Resolución de ref.</p>
                      <p className="font-mono font-semibold text-[var(--agro-text)]">{src.spatialResolution}</p>
                    </div>
                    <div className="bg-[var(--agro-surface-soft)] rounded-xl p-2">
                      <p className="text-[10px] text-[var(--agro-muted)]">Frecuencia</p>
                      <p className="font-semibold text-[var(--agro-text)]">{src.temporalResolution}</p>
                    </div>
                    <div className="bg-[var(--agro-surface-soft)] rounded-xl p-2 col-span-2">
                      <p className="text-[10px] text-[var(--agro-muted)]">Nivel de detalle</p>
                      <p className="font-semibold text-[var(--agro-text)]">{src.detailLevel}</p>
                    </div>
                  </div>

                  {src.clarification && (
                    <p className="text-[11px] font-semibold text-[var(--agro-info-text)] bg-[var(--agro-info-bg)] px-2.5 py-2 rounded-xl">
                      Aclaración: {src.clarification}
                    </p>
                  )}

                  <div className="bg-[var(--agro-warning-bg)] border border-amber-200/70 text-[var(--agro-warning-text)] p-2.5 rounded-xl flex items-start gap-2 text-[11px] leading-relaxed">
                    <AlertTriangle className="w-3.5 h-3.5 text-[var(--agro-warning-text)] shrink-0 mt-0.5" />
                    <span>
                      <strong>Limitaciones:</strong> {src.limitations}
                    </span>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
