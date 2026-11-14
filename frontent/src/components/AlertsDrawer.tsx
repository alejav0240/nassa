import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCheck,
  ChevronRight,
  Droplets,
  Info,
  Satellite,
  Thermometer,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { AlertCategory, AppAlert, UserPreferences } from '../types/agroterra';

interface AlertsDrawerProps {
  open: boolean;
  alerts: AppAlert[];
  preferences: UserPreferences;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onSelectParcel: (parcelId: string) => void;
}

const CATEGORY_OPTIONS: ('Todas' | AlertCategory)[] = [
  'Todas',
  'Cambio NDVI',
  'Déficit hídrico',
  'Temperatura elevada',
  'Actualización satelital',
  'Datos faltantes',
  'Observación en campo',
];

export function AlertsDrawer({
  open,
  alerts,
  preferences,
  onClose,
  onMarkRead,
  onMarkAllRead,
  onSelectParcel,
}: AlertsDrawerProps) {
  const [filter, setFilter] = useState<'Todas' | AlertCategory>('Todas');
  const [selectedAlert, setSelectedAlert] = useState<AppAlert | null>(null);

  if (!open) return null;

  const activeAlerts = alerts.filter((a) => preferences.notifications[a.category] ?? true);
  const filtered =
    filter === 'Todas' ? activeAlerts : activeAlerts.filter((a) => a.category === filter);

  const getIcon = (cat: AlertCategory) => {
    switch (cat) {
      case 'Déficit hídrico':
        return Droplets;
      case 'Temperatura elevada':
        return Thermometer;
      case 'Actualización satelital':
        return Satellite;
      case 'Datos faltantes':
        return AlertCircle;
      case 'Observación en campo':
        return Info;
      default:
        return AlertTriangle;
    }
  };

  const getSeverityStyles = (severity: AppAlert['severity']) => {
    if (severity === 'alert') return 'text-[#EF4444] bg-red-50';
    if (severity === 'warning') return 'text-[#B45309] bg-amber-50';
    return 'text-[#0284C7] bg-sky-50';
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alerts-drawer-title"
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl h-[86dvh] sm:h-[80dvh] flex flex-col shadow-xl overflow-hidden">
        <div className="w-10 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 sm:hidden" />

        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-[#166534]" />
            <div>
              <h2 id="alerts-drawer-title" className="text-base font-bold text-slate-900">
                Notificaciones y Alertas
              </h2>
              <p className="text-[11px] text-slate-500">
                Alertas simuladas · No representan pronósticos reales
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onMarkAllRead}
              className="min-h-[40px] px-2.5 rounded-xl text-xs font-semibold text-[#166534] hover:bg-[#DCFCE7] flex items-center gap-1"
            >
              <CheckCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Marcar leídas</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar notificaciones"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {CATEGORY_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                setFilter(opt);
                setSelectedAlert(null);
              }}
              className={`min-h-[36px] px-3 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                filter === opt
                  ? 'bg-[#166534] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50">
          {selectedAlert ? (
            <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-4">
              <button
                type="button"
                onClick={() => setSelectedAlert(null)}
                className="text-xs font-semibold text-[#166534] hover:underline"
              >
                ← Volver a la lista
              </button>

              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-medium">
                  {selectedAlert.category} · {selectedAlert.parcelName} · Alerta simulada
                </p>
                <h3 className="text-base font-bold text-slate-900">{selectedAlert.title}</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{selectedAlert.detail}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                <p>
                  <span className="font-semibold text-slate-800">Fecha de registro:</span>{' '}
                  {selectedAlert.date}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Fuente asociada:</span>{' '}
                  {selectedAlert.source}
                </p>
                <p className="text-amber-700 font-medium pt-1">
                  Aviso: Esta notificación es demostrativa y no predice eventos climáticos reales.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  onSelectParcel(selectedAlert.parcelId);
                  onClose();
                }}
                className="w-full h-11 rounded-xl bg-[#16A34A] hover:bg-[#166534] text-white text-sm font-semibold transition-colors"
              >
                Ir a {selectedAlert.parcelName}
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-sm text-slate-500">
              No hay notificaciones activas para esta categoría.
            </div>
          ) : (
            filtered.map((alert) => {
              const Icon = getIcon(alert.category);
              return (
                <button
                  key={alert.id}
                  type="button"
                  onClick={() => {
                    onMarkRead(alert.id);
                    setSelectedAlert(alert);
                  }}
                  className={`w-full text-left bg-white rounded-2xl p-3.5 border transition-colors flex items-start gap-3 ${
                    alert.read ? 'border-slate-200/80 opacity-85' : 'border-emerald-200 shadow-sm'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${getSeverityStyles(
                      alert.severity
                    )}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-slate-500 truncate">
                        {alert.category} · {alert.parcelName}
                      </span>
                      {!alert.read && (
                        <span className="text-[10px] font-bold text-[#16A34A] shrink-0">
                          Nueva
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5 truncate">
                      {alert.title}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{alert.summary}</p>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      {alert.date} · {alert.source}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 self-center" />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
