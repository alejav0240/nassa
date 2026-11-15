import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import type { SyncStatus } from '../types/agroterra';

interface SyncStatusBannerProps {
  status: SyncStatus;
}

export function SyncStatusBanner({ status }: SyncStatusBannerProps) {
  if (status === 'idle') return null;

  const isSaving = status === 'saving';
  const isError = status === 'error';

  return (
    <section
      role={isError ? 'alert' : 'status'}
      aria-live="polite"
      className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${
        isError
          ? 'border-red-200 bg-red-50 text-red-900'
          : isSaving
            ? 'border-amber-200 bg-amber-50 text-amber-900'
            : 'border-emerald-200 bg-emerald-50 text-emerald-900'
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        {isSaving ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
        ) : isError ? (
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
        )}
        <span>
          {isSaving && 'Sincronizando cambios de parcela…'}
          {status === 'saved' && 'Cambios de parcela sincronizados.'}
          {isError && 'No se pudieron sincronizar los cambios de parcela.'}
        </span>
      </div>
      {isError && (
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('agroterra:retry-parcel-sync'))}
          className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl border border-red-300 bg-white px-3 text-xs font-semibold text-red-900 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Reintentar
        </button>
      )}
    </section>
  );
}
