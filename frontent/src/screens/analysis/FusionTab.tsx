import { AlertTriangle, ArrowDown, ArrowRight, Layers, ShieldAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fusionService } from '../../services/fusionService';
import { satelliteService } from '../../services/satelliteService';
import { Parcel } from '../../types/agroterra';

interface FusionTabProps {
  parcel: Parcel;
}

const PIPELINE_STEPS = [
  {
    title: 'SMAP + ECOSTRESS + GPM + Landsat/MODIS + GEDI + SoilGrids',
    detail: 'Integración de sensores satelitales y capas edáficas con resoluciones distintas',
  },
  {
    title: 'Armonización espacial y temporal',
    detail: 'Alineación a la geometría de la parcela y ventanas temporales equivalentes',
  },
  {
    title: 'Indicadores comparables',
    detail: 'Series coherentes con unidades estándar del Sistema Internacional y calidad declarada',
  },
  {
    title: 'Interpretación de la parcela',
    detail: 'Lectura conjunta de vigor vegetal, humedad regional, temperatura y suelo',
  },
  {
    title: 'Apoyo a la toma de decisiones',
    detail: 'Priorización de inspecciones y contraste obligatorio con observaciones en campo',
  },
];

export function FusionTab({ parcel }: FusionTabProps) {
  const presets = useMemo(() => fusionService.getPresets(), []);
  const [selectedPresetId, setSelectedPresetId] = useState(presets[0].id);

  const activePreset = presets.find((p) => p.id === selectedPresetId) ?? presets[0];
  const timeSeries = useMemo(() => satelliteService.getTimeSeriesForParcel(parcel), [parcel]);

  const representativeness = useMemo(
    () => fusionService.evaluateParcelRepresentativeness(parcel, activePreset.sources),
    [parcel, activePreset]
  );

  const insufficientSources = representativeness.filter((r) => !r.check.isSufficient);
  const missingPointsCount = timeSeries.filter((p) => p.missingFlag).length;

  return (
    <div className="space-y-5">
      {/* Data Fusion Pipeline Flow */}
      <section className="bg-[var(--agro-surface)] rounded-2xl p-4 border border-[var(--agro-line)]/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[var(--agro-selected)] text-[var(--agro-lime)] flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--agro-text)]">
                Arquitectura de fusión de datos
              </h2>
              <p className="text-[11px] text-[var(--agro-muted)]">
                Flujo conceptual multisensor · Datos demostrativos
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          {PIPELINE_STEPS.map((step, index) => (
            <div key={step.title} className="flex flex-col items-stretch">
              <div
                className={`rounded-xl px-3.5 py-2.5 border text-left ${
                  index === 0
                    ? 'bg-[var(--agro-success-bg)] border-emerald-200'
                    : index === PIPELINE_STEPS.length - 1
                    ? 'bg-[#166534] text-white border-[#166534]'
                    : 'bg-[var(--agro-surface-soft)] border-[var(--agro-line)]/80'
                }`}
              >
                <p
                  className={`text-xs font-bold ${
                    index === PIPELINE_STEPS.length - 1 ? 'text-white' : 'text-[var(--agro-text)]'
                  }`}
                >
                  {step.title}
                </p>
                <p
                  className={`text-[11px] mt-0.5 ${
                    index === PIPELINE_STEPS.length - 1 ? 'text-emerald-100' : 'text-[var(--agro-muted)]'
                  }`}
                >
                  {step.detail}
                </p>
              </div>
              {index < PIPELINE_STEPS.length - 1 && (
                <div className="flex justify-center py-0.5 text-[var(--agro-lime)]">
                  <ArrowDown className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Preset Comparison Selector + Clear Dual-Axis Chart */}
      <section className="bg-[var(--agro-surface)] rounded-2xl p-4 border border-[var(--agro-line)]/90 shadow-xs space-y-3">
        <div>
          <h3 className="text-sm font-bold text-[var(--agro-text)]">Comparador multivariable armonizado</h3>
          <p className="text-xs text-[var(--agro-muted)]">
            Parcela analizada: <strong className="text-[var(--agro-text)]">{parcel.name}</strong> ({parcel.areaHa} ha)
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setSelectedPresetId(preset.id)}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-left border text-xs font-semibold transition-colors flex items-center justify-between gap-2 ${
                selectedPresetId === preset.id
                  ? 'bg-[var(--agro-selected)] border-[#16A34A] text-[var(--agro-lime)]'
                  : 'bg-[var(--agro-surface-soft)] border-[var(--agro-line)] text-[var(--agro-text)] hover:bg-[var(--agro-surface-soft)]'
              }`}
            >
              <span>{preset.label}</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </button>
          ))}
        </div>

        <div className="h-60 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeSeries} margin={{ top: 10, right: 6, left: -14, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 10, fill: '#166534' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10, fill: '#0284C7' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey={activePreset.primaryKey}
                name={`${activePreset.primaryLabel} (${activePreset.primaryUnit})`}
                stroke="#16A34A"
                strokeWidth={2.6}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey={activePreset.secondaryKey}
                name={`${activePreset.secondaryLabel} (${activePreset.secondaryUnit})`}
                stroke="#0284C7"
                strokeWidth={2.2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <p className="text-xs text-[var(--agro-muted)] leading-relaxed bg-[var(--agro-surface-soft)] p-3 rounded-xl">
          {activePreset.explanation}
        </p>
      </section>

      {/* Key Metadata */}
      <section className="bg-[var(--agro-surface)] rounded-2xl p-4 border border-[var(--agro-line)]/90 shadow-xs space-y-2.5">
        <h4 className="text-xs font-bold text-[var(--agro-text)]">
          Metadatos clave de la combinación seleccionada
        </h4>
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="p-2.5 rounded-xl bg-[var(--agro-surface-soft)]">
            <p className="text-[11px] text-[var(--agro-muted)]">Resolución espacial</p>
            <p className="font-semibold text-[var(--agro-text)] font-mono">
              {representativeness.map((r) => r.source.spatialResolution).join(' / ')}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-[var(--agro-surface-soft)]">
            <p className="text-[11px] text-[var(--agro-muted)]">Resolución temporal</p>
            <p className="font-semibold text-[var(--agro-text)]">
              {representativeness.map((r) => r.source.temporalResolution).join(' · ')}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-[var(--agro-surface-soft)]">
            <p className="text-[11px] text-[var(--agro-muted)]">Unidad de medida</p>
            <p className="font-semibold text-[var(--agro-text)] font-mono">
              {activePreset.primaryUnit} · {activePreset.secondaryUnit}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-[var(--agro-surface-soft)]">
            <p className="text-[11px] text-[var(--agro-muted)]">Calidad de dato</p>
            <p className="font-semibold text-[var(--agro-text)] font-mono tabular-nums">
              {missingPointsCount} período(s) parcial(es)
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-[var(--agro-surface-soft)] col-span-2">
            <p className="text-[11px] text-[var(--agro-muted)]">Representatividad</p>
            <p className="font-semibold text-[var(--agro-text)]">
              {insufficientSources.length > 0
                ? `Escala mixta: ${parcel.areaHa} ha frente a píxel regional de ${insufficientSources
                    .map((i) => i.source.spatialResolution)
                    .join(', ')}`
                : `Cobertura adecuada a escala de parcela (${parcel.areaHa} ha)`}
            </p>
          </div>
        </div>
      </section>

      {/* Explainable Warnings */}
      <section className="space-y-2.5">
        <div className="bg-[var(--agro-warning-bg)] border border-amber-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-[var(--agro-warning-text)] shrink-0 mt-0.5" />
            <div className="space-y-1.5 text-xs text-[var(--agro-warning-text)]">
              <p className="font-bold">Advertencias metodológicas y de escala</p>
              <ul className="list-disc pl-4 space-y-1 text-[var(--agro-warning-text)] leading-relaxed">
                <li>El remuestreo no incrementa la resolución real del sensor.</li>
                <li>Esta parcela puede ser menor que el tamaño del píxel de algunas fuentes.</li>
                <li>Se recomienda validación local en campo antes de tomar decisiones.</li>
              </ul>
            </div>
          </div>
        </div>

        {insufficientSources.length > 0 && (
          <div className="bg-[var(--agro-surface)] border border-amber-200 rounded-2xl p-3.5 space-y-1.5">
            <p className="text-xs font-bold text-[var(--agro-text)] flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
              Detalle por sensor para {parcel.name} ({parcel.areaHa} ha)
            </p>
            {insufficientSources.map(({ source, check }) => (
              <p key={source.id} className="text-xs text-[var(--agro-text)] leading-relaxed">
                <strong>{source.name}:</strong> {check.explanation}
              </p>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
