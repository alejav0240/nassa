import {
  Bell,
  Check,
  Info,
  Layers,
  RotateCcw,
  Ruler,
  Smartphone,
  User as UserIcon,
} from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  AlertCategory,
  Parcel,
  UserPreferences,
  UserProfile,
} from '../types/agroterra';
import { formatAreaHa, getParcelAreaHa } from '../utils/parcelGeometry';

interface ProfileScreenProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  preferences: UserPreferences;
  onUpdatePreferences: (prefs: UserPreferences) => void;
  parcels: Parcel[];
  onResetDemo: () => void;
  onOpenParcelDetail: (id: string) => void;
}

const SI_UNITS = [
  { magnitude: 'Temperatura superficial', unit: '°C (grados Celsius)' },
  { magnitude: 'Precipitación acumulada', unit: 'mm (milímetros)' },
  { magnitude: 'Humedad volumétrica del suelo', unit: 'm³/m³ (o % referencial)' },
  { magnitude: 'Superficie agrícola', unit: 'ha (hectáreas)' },
  { magnitude: 'Resolución / Longitud', unit: 'm / km (metros / kilómetros)' },
  { magnitude: 'Índice de vegetación (NDVI)', unit: 'Adimensional (-1.0 a 1.0)' },
];

export function ProfileScreen({
  userProfile,
  onUpdateProfile,
  preferences,
  onUpdatePreferences,
  parcels,
  onResetDemo,
  onOpenParcelDetail,
}: ProfileScreenProps) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(userProfile.name);
  const [draftRegion, setDraftRegion] = useState(userProfile.region);
  const [draftOrg, setDraftOrg] = useState(userProfile.organization);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const handleSaveProfile = () => {
    onUpdateProfile({
      ...userProfile,
      name: draftName.trim() || userProfile.name,
      region: draftRegion.trim() || userProfile.region,
      organization: draftOrg.trim() || userProfile.organization,
    });
    setEditing(false);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  const toggleAlertCategory = (cat: AlertCategory) => {
    onUpdatePreferences({
      ...preferences,
      notifications: {
        ...preferences.notifications,
        [cat]: !preferences.notifications[cat],
      },
    });
  };

  return (
    <div className="p-4 lg:p-0 space-y-4 pb-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Perfil y Configuración</h1>
        <p className="text-xs text-slate-500">
          Preferencias del prototipo AgroTerra AI
        </p>
      </div>

      {/* User Card */}
      <section className="bg-white rounded-2xl p-4 border border-slate-200/90 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#DCFCE7] text-[#166534] flex items-center justify-center shrink-0">
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{userProfile.name}</h2>
              <p className="text-xs text-slate-600">{userProfile.role}</p>
              <p className="text-[11px] text-slate-500">
                {userProfile.organization} · {userProfile.region}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="min-h-[36px] px-3 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          >
            {editing ? 'Cerrar' : 'Editar'}
          </button>
        </div>

        {savedFeedback && (
          <p className="text-xs font-semibold text-[#166534] flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Perfil guardado localmente
          </p>
        )}

        {editing && (
          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Nombre completo"
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs"
            />
            <input
              type="text"
              value={draftOrg}
              onChange={(e) => setDraftOrg(e.target.value)}
              placeholder="Organización"
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs"
            />
            <input
              type="text"
              value={draftRegion}
              onChange={(e) => setDraftRegion(e.target.value)}
              placeholder="Departamento / Zona"
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs"
            />
            <button
              type="button"
              onClick={handleSaveProfile}
              className="w-full h-10 rounded-xl bg-[#16A34A] text-white text-xs font-semibold"
            >
              Guardar perfil
            </button>
          </div>
        )}
      </section>

      {/* Registered Parcels Summary */}
      <section className="bg-white rounded-2xl p-4 border border-slate-200/90 space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[#166534]" />
            Parcelas registradas ({parcels.length})
          </h3>
          <span className="text-xs font-mono text-slate-500 tabular-nums">
            {parcels.reduce((sum, p) => sum + getParcelAreaHa(p), 0).toFixed(2)} ha totales
          </span>
        </div>
        <div className="divide-y divide-slate-100">
          {parcels.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onOpenParcelDetail(p.id)}
              className="w-full py-2.5 flex items-center justify-between text-left hover:bg-slate-50 rounded-lg px-1"
            >
              <div>
                <p className="text-xs font-semibold text-slate-900">{p.name}</p>
                <p className="text-[11px] text-slate-500">
                  {p.crop} · {p.location}
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-slate-700 tabular-nums">
                {formatAreaHa(getParcelAreaHa(p))}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Display Preferences & SI Units */}
      <section className="bg-white rounded-2xl p-4 border border-slate-200/90 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <Ruler className="w-4 h-4 text-[#166534]" />
          Preferencias de visualización y unidades (SI)
        </h3>

        <div className="flex items-center justify-between gap-3 py-1">
          <div>
            <p className="text-xs font-semibold text-slate-900">Unidad de humedad del suelo</p>
            <p className="text-[11px] text-slate-500">
              Alterna entre porcentaje referencial (%) y m³/m³ (Sistema Internacional)
            </p>
          </div>
          <div className="flex p-1 bg-slate-100 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => onUpdatePreferences({ ...preferences, moistureUnit: 'percent' })}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
                preferences.moistureUnit === 'percent'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600'
              }`}
            >
              %
            </button>
            <button
              type="button"
              onClick={() => onUpdatePreferences({ ...preferences, moistureUnit: 'volumetric' })}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold font-mono ${
                preferences.moistureUnit === 'volumetric'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600'
              }`}
            >
              m³/m³
            </button>
          </div>
        </div>

        {/* Desktop 390x844 Mobile Frame Toggle */}
        <div className="hidden lg:flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-start gap-2">
            <Smartphone className="w-4 h-4 text-[#166534] mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-900">
                Simular pantalla móvil (390 × 844 px)
              </p>
              <p className="text-[11px] text-slate-500">
                Activa el marco móvil Android/iOS para demostraciones en escritorio
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              onUpdatePreferences({
                ...preferences,
                simulateDeviceFrame: !preferences.simulateDeviceFrame,
              })
            }
            className={`min-h-[36px] px-3 rounded-xl text-xs font-semibold transition-colors ${
              preferences.simulateDeviceFrame
                ? 'bg-[#166534] text-white'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {preferences.simulateDeviceFrame ? 'Activado' : 'Adaptable'}
          </button>
        </div>

        {/* SI Units Reference */}
        <div className="pt-2 border-t border-slate-100 space-y-1.5">
          <p className="text-[11px] font-semibold text-slate-500">
            Estándar de unidades del Sistema Internacional aplicado:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
            {SI_UNITS.map((u) => (
              <div key={u.magnitude} className="flex justify-between gap-2 bg-slate-50 px-2.5 py-1.5 rounded-lg">
                <span className="text-slate-600">{u.magnitude}</span>
                <span className="font-mono font-semibold text-slate-800">{u.unit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Notification Preferences */}
      <section className="bg-white rounded-2xl p-4 border border-slate-200/90 space-y-2.5">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <Bell className="w-4 h-4 text-[#166534]" />
          Configuración de notificaciones (simuladas)
        </h3>
        <div className="divide-y divide-slate-100">
          {(Object.keys(preferences.notifications) as AlertCategory[]).map((cat) => {
            const enabled = preferences.notifications[cat];
            return (
              <label
                key={cat}
                className="py-2.5 flex items-center justify-between gap-3 cursor-pointer"
              >
                <span className="text-xs font-medium text-slate-800">{cat}</span>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => toggleAlertCategory(cat)}
                  className="w-4 h-4 rounded border-slate-300 text-[#16A34A] focus:ring-emerald-600"
                />
              </label>
            );
          })}
        </div>
      </section>

      {/* About AgroTerra AI & Reset */}
      <section className="bg-white rounded-2xl p-4 border border-slate-200/90 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-[#166534]" />
          Acerca de AgroTerra AI
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          AgroTerra AI es un prototipo de arquitectura móvil para agricultura de precisión en
          Bolivia, diseñado para integrar cartografía OpenStreetMap, gestión de parcelas y
          conceptualización de fusión multisensor (SMAP, ECOSTRESS, GPM, Landsat, MODIS, GEDI y
          SoilGrids).
        </p>
        <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl leading-relaxed">
          Todos los indicadores, series temporales y alertas mostrados en esta fase son datos
          demostrativos locales y no representan mediciones oficiales obtenidas en tiempo real.
        </p>

        <button
          type="button"
          onClick={() => setResetConfirmOpen(true)}
          className="w-full h-11 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restablecer datos de demostración
        </button>
      </section>

      <ConfirmDialog
        open={resetConfirmOpen}
        title="Restablecer datos demostrativos"
        message="Se restaurarán las tres parcelas iniciales de Bolivia, el historial y las alertas simuladas."
        confirmLabel="Restablecer"
        onCancel={() => setResetConfirmOpen(false)}
        onConfirm={() => {
          onResetDemo();
          setResetConfirmOpen(false);
        }}
      />
    </div>
  );
}
