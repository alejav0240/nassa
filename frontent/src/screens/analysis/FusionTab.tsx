import { AlertTriangle, CheckCircle2, Database, MapPinned, ShieldAlert } from 'lucide-react';
import type { BackendAnalysis } from '../../services/apiClient';
import type { Parcel } from '../../types/agroshift';

interface FusionTabProps {
  parcel: Parcel;
  analysis: BackendAnalysis | null;
  analysisStatus: 'idle' | 'loading' | 'ready' | 'error';
}

export function FusionTab({ parcel, analysis, analysisStatus }: FusionTabProps) {
  const climate = analysis && analysis.field_id === parcel.backendId && analysisStatus === 'ready' ? analysis.climate : null;
  const sources = [
    { name: 'NASA POWER', detail: climate ? 'Conectado · clima histórico de cuadrícula' : 'Pendiente de análisis', available: Boolean(climate) },
    { name: 'Perfil de suelo', detail: `${parcel.indicators.soilTexture} · pH ${parcel.indicators.soilPh || 'N/D'}`, available: parcel.indicators.soilTexture !== 'desconocida' || parcel.indicators.soilPh > 0 },
    { name: 'SMAP / GPM / Landsat / ECOSTRESS', detail: 'Sin adaptador de observaciones de parcela', available: false },
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[var(--agro-line)] bg-[var(--agro-surface)] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-[var(--agro-lime)]" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-bold text-[var(--agro-text)]">Fusión disponible para esta parcela</h2>
            <p className="text-[11px] text-[var(--agro-muted)]">Solo se muestran fuentes que realmente entregaron datos o están declaradas en el perfil.</p>
          </div>
        </div>
        <div className="space-y-2">
          {sources.map((source) => (
            <div key={source.name} className="flex items-start gap-2.5 rounded-xl border border-[var(--agro-line)] p-3">
              {source.available ? <CheckCircle2 className="w-4 h-4 text-[var(--agro-success-text)] shrink-0 mt-0.5" aria-hidden="true" /> : <AlertTriangle className="w-4 h-4 text-[var(--agro-warning-text)] shrink-0 mt-0.5" aria-hidden="true" />}
              <div>
                <p className="text-xs font-bold text-[var(--agro-text)]">{source.name}</p>
                <p className="text-[11px] text-[var(--agro-muted)] mt-0.5">{source.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--agro-line)] bg-[var(--agro-surface)] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <MapPinned className="w-4 h-4 text-[var(--agro-lime)]" aria-hidden="true" />
          <h2 className="text-sm font-bold text-[var(--agro-text)]">Contexto espacial y límites</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <Info label="Parcela" value={parcel.name} />
          <Info label="Superficie" value={`${parcel.areaHa.toFixed(2)} ha`} />
          <Info label="Coordenadas" value={`${parcel.centroid.lat.toFixed(4)}, ${parcel.centroid.lng.toFixed(4)}`} />
          <Info label="Cultivo actual" value={parcel.crop} />
        </div>
        <div className="rounded-xl border border-amber-200 bg-[var(--agro-warning-bg)] p-3 flex items-start gap-2 text-xs text-[var(--agro-warning-text)] leading-relaxed">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <p>La resolución de NASA POWER es regional. La textura y el pH declarados no sustituyen un análisis de laboratorio. No se presenta una fusión multisensor hasta contar con observaciones verificadas.</p>
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-[var(--agro-surface-soft)] p-2.5"><p className="text-[11px] text-[var(--agro-muted)]">{label}</p><p className="font-semibold text-[var(--agro-text)] mt-0.5">{value}</p></div>;
}
