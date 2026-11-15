import { AlertTriangle, RefreshCw, Sprout } from 'lucide-react';
import { useEffect, useState } from 'react';
import { backendApi, BackendRecommendations } from '../services/apiClient';
import { Parcel } from '../types/agroshift';

interface CropRecommendationsPanelProps {
  parcel: Parcel;
}

const STATUS_LABEL: Record<string, string> = {
  compatible: 'Compatible en esta evaluación',
  revisar: 'Revisar antes de sembrar',
  no_priorizar: 'No priorizar por ahora',
};

export function CropRecommendationsPanel({ parcel }: CropRecommendationsPanelProps) {
  const [result, setResult] = useState<BackendRecommendations | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const loadRecommendations = () => {
    if (!parcel.backendId) return;
    setStatus('loading');
    setError(null);
    void backendApi.recommendCrops(parcel.backendId).then((next) => {
      setResult(next);
      setStatus('ready');
    }).catch((cause) => {
      setStatus('error');
      setError(cause instanceof Error ? cause.message : 'No se pudieron consultar las sugerencias.');
    });
  };

  useEffect(() => {
    setResult(null);
    if (!parcel.backendId) {
      setStatus('idle');
      return;
    }
    loadRecommendations();
    // The selected backend parcel is the only input to this request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parcel.backendId]);

  if (!parcel.backendId) {
    return (
      <section className="rounded-2xl border border-[var(--agro-line)] bg-[var(--agro-surface)] p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Sprout className="w-4 h-4 text-[var(--agro-lime)]" aria-hidden="true" />
          <h2 className="text-sm font-bold text-[var(--agro-text)]">Sugerencia de cultivo</h2>
        </div>
        <p className="text-xs text-[var(--agro-muted)] leading-relaxed">
          Registrá la parcela en el backend para comparar cultivos usando clima NASA POWER, textura y pH declarados.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[var(--agro-line)] bg-[var(--agro-surface)] p-4 space-y-4" aria-labelledby="crop-recommendations-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sprout className="w-4 h-4 text-[var(--agro-lime)]" aria-hidden="true" />
            <h2 id="crop-recommendations-title" className="text-sm font-bold text-[var(--agro-text)]">Qué cultivar en esta parcela</h2>
          </div>
          <p className="text-xs text-[var(--agro-muted)] mt-1 leading-relaxed">
            Comparación orientativa según clima histórico, textura, pH y el cultivo actual.
          </p>
        </div>
        {status !== 'loading' && (
          <button type="button" onClick={loadRecommendations} className="min-h-[36px] px-2.5 rounded-lg text-xs font-semibold text-[var(--agro-lime)] hover:bg-[var(--agro-selected)] inline-flex items-center gap-1.5" aria-label="Actualizar sugerencias de cultivos">
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Actualizar
          </button>
        )}
      </div>

      <div className="rounded-xl bg-[var(--agro-surface-soft)] px-3 py-2.5 text-[11px] text-[var(--agro-muted)]">
        Perfil usado: <strong className="text-[var(--agro-text)]">{parcel.indicators.soilTexture}</strong> · pH <strong className="text-[var(--agro-text)]">{parcel.indicators.soilPh || 'N/D'}</strong> · cultivo actual <strong className="text-[var(--agro-text)]">{parcel.crop}</strong>
      </div>

      {status === 'loading' && <p className="text-xs text-[var(--agro-muted)]" role="status">Consultando clima y calculando compatibilidades…</p>}
      {status === 'error' && (
        <div className="rounded-xl border border-red-200 bg-[var(--agro-danger-bg)] text-[var(--agro-danger-text)] p-3 text-xs flex items-start gap-2" role="alert">
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {status === 'ready' && result && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {result.recommendations.map((recommendation) => (
              <article key={recommendation.id} className="rounded-xl border border-[var(--agro-line)] p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-[var(--agro-text)]">{recommendation.label}</h3>
                      {recommendation.is_current && <span className="rounded-full bg-[var(--agro-selected)] px-2 py-0.5 text-[10px] font-semibold text-[var(--agro-lime)]">Actual</span>}
                    </div>
                    <p className="text-[11px] text-[var(--agro-muted)] mt-0.5">{STATUS_LABEL[recommendation.status]}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-[var(--agro-lime)] tabular-nums">{recommendation.score}</p>
                    <p className="text-[10px] text-[var(--agro-muted)]">compatibilidad</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-lg bg-[var(--agro-surface-soft)] p-2">
                    <p className="text-[var(--agro-muted)]">Región orientativa</p>
                    <p className="font-semibold text-[var(--agro-text)] mt-0.5">{recommendation.region}</p>
                  </div>
                  <div className="rounded-lg bg-[var(--agro-surface-soft)] p-2">
                    <p className="text-[var(--agro-muted)]">Cosecha</p>
                    <p className="font-semibold text-[var(--agro-text)] mt-0.5">{recommendation.harvest_days}</p>
                  </div>
                </div>
                <p className="text-[11px] text-[var(--agro-muted)] leading-relaxed"><strong className="text-[var(--agro-text)]">Productos:</strong> {recommendation.products}</p>
                {recommendation.reasons.length > 0 && <p className="text-xs text-[var(--agro-text)] leading-relaxed"><strong>Coincide:</strong> {recommendation.reasons.join(' ')}</p>}
                {recommendation.risks.length > 0 && <p className="text-xs text-[var(--agro-warning-text)] leading-relaxed"><strong>Revisar:</strong> {recommendation.risks.join(' ')}</p>}
                <p className="text-[11px] text-[var(--agro-warning-text)] leading-relaxed"><strong>Precaución:</strong> {recommendation.food_safety_risks}</p>
              </article>
            ))}
          </div>
          <div className="border-t border-[var(--agro-line)] pt-3 space-y-1 text-[11px] text-[var(--agro-muted)] leading-relaxed">
            <p><strong className="text-[var(--agro-text)]">Fuente:</strong> {result.source.join(' · ')} · años {result.climate_years.join('–')}.</p>
            <p><strong className="text-[var(--agro-text)]">Método:</strong> {result.methodology.formula}. {result.methodology.scope}</p>
            <p>{result.methodology.limitations.join(' ')}</p>
          </div>
        </>
      )}
    </section>
  );
}
