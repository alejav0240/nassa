import { BrainCircuit, ShieldCheck } from 'lucide-react';
import { useMemo } from 'react';
import { QualityIndicator } from '../../components/QualityBadgeText';
import { fusionService } from '../../services/fusionService';
import { Parcel } from '../../types/agroterra';

interface InsightsTabProps {
  parcel: Parcel;
}

export function InsightsTab({ parcel }: InsightsTabProps) {
  const insights = useMemo(() => fusionService.getSimulatedInsights(parcel.id), [parcel.id]);

  return (
    <div className="space-y-4">
      <div className="bg-[#166534] text-white rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-emerald-200" />
            <h2 className="text-base font-bold">AgroTerra Insights</h2>
          </div>
          <span className="text-[11px] font-semibold bg-white/15 px-2.5 py-1 rounded-lg">
            Simulación para demostración
          </span>
        </div>
        <p className="text-xs text-emerald-50/90 leading-relaxed">
          Vista demostrativa de cómo un motor futuro de análisis explicable sintetizaría señales
          ambientales para <strong>{parcel.name}</strong>, sin emitir diagnósticos definitivos ni
          porcentajes de confianza no calibrados.
        </p>
      </div>

      <div className="space-y-3">
        {insights.map((item) => (
          <article
            key={item.id}
            className="bg-[var(--agro-surface)] rounded-2xl p-4 border border-[var(--agro-line)]/90 space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-[var(--agro-text)]">{item.title}</h3>
              <QualityIndicator quality={item.quality} />
            </div>

            <p className="text-sm text-[var(--agro-text)] leading-relaxed">{item.message}</p>

            <div className="pt-2 border-t border-[var(--agro-line)] flex items-center justify-between gap-2 text-[11px] text-[var(--agro-muted)] flex-wrap">
              <span>
                {item.sourceSummary} · {item.referenceDate}
              </span>
              <span className="font-semibold text-[#f0c86c]">{item.validationState}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="bg-[var(--agro-surface-soft)] rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-[var(--agro-muted)]">
        <ShieldCheck className="w-4 h-4 text-[var(--agro-lime)] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Criterio de prudencia científica: estos textos ilustran salidas narrativas para
          demostración y requieren calibración con datos locales y criterio agronómico antes de
          orientar decisiones productivas.
        </p>
      </div>
    </div>
  );
}
