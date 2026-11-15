import { useRef, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useDialogA11y } from '../hooks/useDialogA11y';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  details?: ReactNode;
  tone?: 'danger' | 'primary';
  confirmDisabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Eliminar',
  details,
  tone = 'danger',
  confirmDisabled = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useDialogA11y({
    open,
    onClose: onCancel,
    initialFocusRef: cancelButtonRef,
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      ref={dialogRef}
    >
      <div className="bg-[var(--agro-surface)] w-full max-w-sm rounded-3xl p-5 shadow-xl border border-[var(--agro-line)] space-y-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${tone === 'danger' ? 'bg-[var(--agro-danger-bg)] text-[var(--agro-danger-text)]' : 'bg-[var(--agro-lime)]/15 text-[var(--agro-lime)]'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 id="confirm-title" className="text-base font-bold text-[var(--agro-text)]">
              {title}
            </h3>
            <p className="text-sm text-[var(--agro-muted)] mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
        {details}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            ref={cancelButtonRef}
            className="flex-1 h-11 rounded-xl border border-[var(--agro-line)] text-sm font-semibold text-[var(--agro-text)] hover:bg-[var(--agro-surface-soft)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={`flex-1 h-11 rounded-xl text-white text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${tone === 'danger' ? 'bg-[var(--agro-danger-text)] hover:bg-red-700' : 'bg-[var(--agro-accent-strong,var(--agro-lime))] hover:brightness-110'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
