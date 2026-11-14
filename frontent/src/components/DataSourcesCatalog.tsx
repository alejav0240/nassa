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
import { SatelliteSourceId, SourceTag } from '../types/agroterra';
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
      return { Icon: Droplets, bg: 'bg-sky-50 text-[#0284C7]' };
    case 'temperatura':
      return { Icon: Thermometer, bg: 'bg-amber-50 text-[#B45309]' };
    case 'lluvia':
      return { Icon: CloudRain, bg: 'bg-blue-50 text-[#0284C7]' };
    case 'vegetación':
      return { Icon: Sprout, bg: 'bg-[#DCFCE7] text-[#166534]' };
    case 'biomasa':
      return { Icon: Trees, bg: 'bg-emerald-50 text-[#166534]' };
    case 'suelo':
      return { Icon: Mountain, bg: 'bg-amber-50 text-amber-800' };
    case 'mapa base':
      return { Icon: MapIcon, bg: 'bg-slate-100 text-slate-700' };
    default:
      return { Icon: Layers, bg: 'bg-slate-100 text-slate-700' };
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
      <div className="bg-sky-50 border border-sky-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-sky-950 leading-relaxed">
        <Info className="w-4 h-4 text-[#0284C7] shrink-0 mt-0.5" />
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
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
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
              className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs"
            >
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : src.id)}
                className="w-full p-3.5 text-left flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900">{src.name}</h3>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-700">
                        {src.tag}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 truncate mt-0.5">{src.subtitle}</p>
                    <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                      Res. {src.spatialResolution} · {src.temporalResolution}
                    </p>
                  </div>
                </div>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-100 space-y-2.5 text-xs text-slate-700">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] text-slate-500">
                      Acceso: <strong className="text-slate-800">{src.accessSource}</strong>
                    </span>
                    <QualityIndicator quality={src.quality} compact />
                  </div>

                  <div className="space-y-1.5 leading-relaxed">
                    <p>
                      <strong className="text-slate-900">
                        {src.id === 'OSM' ? 'Qué proporciona:' : 'Qué mide:'}
                      </strong>{' '}
                      {src.whatItMeasures}
                    </p>
                    <p>
                      <strong className="text-slate-900">Para qué sirve:</strong> {src.purpose}
                    </p>
                    <p>
                      <strong className="text-slate-900">Uso en AgroTerra AI:</strong> {src.appUsage}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-slate-50 rounded-xl p-2">
                      <p className="text-[10px] text-slate-500">Resolución de ref.</p>
                      <p className="font-mono font-semibold text-slate-900">{src.spatialResolution}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2">
                      <p className="text-[10px] text-slate-500">Frecuencia</p>
                      <p className="font-semibold text-slate-900">{src.temporalResolution}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2 col-span-2">
                      <p className="text-[10px] text-slate-500">Nivel de detalle</p>
                      <p className="font-semibold text-slate-900">{src.detailLevel}</p>
                    </div>
                  </div>

                  {src.clarification && (
                    <p className="text-[11px] font-semibold text-[#0284C7] bg-sky-50 px-2.5 py-2 rounded-xl">
                      Aclaración: {src.clarification}
                    </p>
                  )}

                  <div className="bg-amber-50 border border-amber-200/70 text-amber-900 p-2.5 rounded-xl flex items-start gap-2 text-[11px] leading-relaxed">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#B45309] shrink-0 mt-0.5" />
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
