import { AlertTriangle, CheckCircle2, HelpCircle, Info } from 'lucide-react';
import { DataQualityLevel } from '../types/agroterra';

interface QualityIndicatorProps {
  quality: DataQualityLevel;
  compact?: boolean;
}

export function QualityIndicator({ quality, compact = false }: QualityIndicatorProps) {
  const config: Record<
    DataQualityLevel,
    { icon: typeof CheckCircle2; colorClass: string; shortLabel: string }
  > = {
    'Información disponible': {
      icon: CheckCircle2,
      colorClass: 'text-[#166534]',
      shortLabel: 'Disponible',
    },
    'Datos parcialmente disponibles': {
      icon: Info,
      colorClass: 'text-[#0284C7]',
      shortLabel: 'Parcial',
    },
    'Resolución insuficiente': {
      icon: AlertTriangle,
      colorClass: 'text-[#B45309]',
      shortLabel: 'Resolución gruesa',
    },
    'Requiere validación local': {
      icon: HelpCircle,
      colorClass: 'text-[#B45309]',
      shortLabel: 'Validar en campo',
    },
  };

  const current = config[quality];
  const Icon = current.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${current.colorClass} whitespace-nowrap`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{compact ? current.shortLabel : quality}</span>
    </span>
  );
}
