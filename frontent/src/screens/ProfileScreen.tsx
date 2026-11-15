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
import { InstallAppCard } from '../components/InstallAppCard';
import {
  AlertCategory,
  Parcel,
  UserPreferences,
  UserProfile,
} from '../types/agroshift';
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
    <div className="profile-screen p-4 lg:p-0 space-y-4 pb-8">
      <div>
        <p className="screen-eyebrow">AGROSHIFT AI / PREFERENCIAS</p>
        <h1 className="text-xl font-bold text-[var(--agro-text)]">Perfil y Configuración</h1>
        <p className="text-xs text-[var(--agro-muted)]">
          Personaliza tu espacio de inteligencia agrícola.
        </p>
      </div>

      {/* User Card */}
      <section className="bg-[var(--agro-surface)] rounded-2xl p-4 border border-[var(--agro-line)]/90 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--agro-selected)] text-[var(--agro-lime)] flex items-center justify-center shrink-0">
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--agro-text)]">{userProfile.name}</h2>
              <p className="text-xs text-[var(--agro-muted)]">{userProfile.role}</p>
              <p className="text-[11px] text-[var(--agro-muted)]">
                {userProfile.organization} · {userProfile.region}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="min-h-[36px] px-3 rounded-xl bg-[var(--agro-surface-soft)] text-xs font-semibold text-[var(--agro-text)] hover:bg-[var(--agro-canvas)]"
          >
            {editing ? 'Cerrar' : 'Editar'}
          </button>
        </div>

        {savedFeedback && (
          <p className="text-xs font-semibold text-[var(--agro-lime)] flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Perfil guardado localmente
          </p>
        )}

        {editing && (
          <div className="pt-3 border-t border-[var(--agro-line)] space-y-2.5">
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Nombre completo"
              className="w-full h-10 px-3 rounded-xl border border-[var(--agro-line)] text-xs"
            />
            <input
              type="text"
              value={draftOrg}
              onChange={(e) => setDraftOrg(e.target.value)}
              placeholder="Organización"
              className="w-full h-10 px-3 rounded-xl border border-[var(--agro-line)] text-xs"
            />
            <input
              type="text"
              value={draftRegion}
              onChange={(e) => setDraftRegion(e.target.value)}
              placeholder="Departamento / Zona"
              className="w-full h-10 px-3 rounded-xl border border-[var(--agro-line)] text-xs"
            />
            <button
              type="button"
              onClick={handleSaveProfile}
              className="w-full h-10 rounded-xl agro-primary text-white text-xs font-semibold"
            >
              Guardar perfil
            </button>
          </div>
        )}
      </section>

      <InstallAppCard />

      {/* Registered Parcels Summary */}
      <section className="bg-[var(--agro-surface)] rounded-2xl p-4 border border-[var(--agro-line)]/90 space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--agro-text)] flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[var(--agro-lime)]" />
            Parcelas registradas ({parcels.length})
          </h3>
          <span className="text-xs font-mono text-[var(--agro-muted)] tabular-nums">
            {parcels.reduce((sum, p) => sum + getParcelAreaHa(p), 0).toFixed(2)} ha totales
          </span>
        </div>
        <div className="divide-y divide-slate-100">
          {parcels.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onOpenParcelDetail(p.id)}
              className="w-full py-2.5 flex items-center justify-between text-left hover:bg-[var(--agro-surface-soft)] rounded-lg px-1"
            >
              <div>
                <p className="text-xs font-semibold text-[var(--agro-text)]">{p.name}</p>
                <p className="text-[11px] text-[var(--agro-muted)]">
                  {p.crop} · {p.location}
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-[var(--agro-text)] tabular-nums">
                {formatAreaHa(getParcelAreaHa(p))}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Display Preferences & SI Units */}
      <section className="bg-[var(--agro-surface)] rounded-2xl p-4 border border-[var(--agro-line)]/90 space-y-3">
        <h3 className="text-sm font-bold text-[var(--agro-text)] flex items-center gap-1.5">
          <Ruler className="w-4 h-4 text-[var(--agro-lime)]" />
          Preferencias de visualización y unidades (SI)
        </h3>

        <div className="flex items-center justify-between gap-3 py-1">
          <div>
            <p className="text-xs font-semibold text-[var(--agro-text)]">Unidad de humedad del suelo</p>
            <p className="text-[11px] text-[var(--agro-muted)]">
              Alterna entre porcentaje referencial (%) y m³/m³ (Sistema Internacional)
            </p>
          </div>
          <div className="flex p-1 bg-[var(--agro-surface-soft)] rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => onUpdatePreferences({ ...preferences, moistureUnit: 'percent' })}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
                preferences.moistureUnit === 'percent'
                  ? 'bg-[var(--agro-surface)] text-[var(--agro-text)] shadow-xs'
                  : 'text-[var(--agro-muted)]'
              }`}
            >
              %
            </button>
            <button
              type="button"
              onClick={() => onUpdatePreferences({ ...preferences, moistureUnit: 'volumetric' })}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold font-mono ${
                preferences.moistureUnit === 'volumetric'
                  ? 'bg-[var(--agro-surface)] text-[var(--agro-text)] shadow-xs'
                  : 'text-[var(--agro-muted)]'
              }`}
            >
              m³/m³
            </button>
          </div>
        </div>

        {/* Desktop 390x844 Mobile Frame Toggle */}
        <div className="hidden lg:flex items-center justify-between gap-3 pt-2 border-t border-[var(--agro-line)]">
          <div className="flex items-start gap-2">
            <Smartphone className="w-4 h-4 text-[var(--agro-lime)] mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-[var(--agro-text)]">
                Simular pantalla móvil (390 × 844 px)
              </p>
              <p className="text-[11px] text-[var(--agro-muted)]">
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
                : 'bg-[var(--agro-surface-soft)] text-[var(--agro-text)]'
            }`}
          >
            {preferences.simulateDeviceFrame ? 'Activado' : 'Adaptable'}
          </button>
        </div>

        {/* SI Units Reference */}
        <div className="pt-2 border-t border-[var(--agro-line)] space-y-1.5">
          <p className="text-[11px] font-semibold text-[var(--agro-muted)]">
            Estándar de unidades del Sistema Internacional aplicado:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
            {SI_UNITS.map((u) => (
              <div key={u.magnitude} className="flex justify-between gap-2 bg-[var(--agro-surface-soft)] px-2.5 py-1.5 rounded-lg">
                <span className="text-[var(--agro-muted)]">{u.magnitude}</span>
                <span className="font-mono font-semibold text-[var(--agro-text)]">{u.unit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Notification Preferences */}
      <section className="bg-[var(--agro-surface)] rounded-2xl p-4 border border-[var(--agro-line)]/90 space-y-2.5">
        <h3 className="text-sm font-bold text-[var(--agro-text)] flex items-center gap-1.5">
          <Bell className="w-4 h-4 text-[var(--agro-lime)]" />
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
                <span className="text-xs font-medium text-[var(--agro-text)]">{cat}</span>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => toggleAlertCategory(cat)}
                  className="w-4 h-4 rounded border-[var(--agro-line)] text-[var(--agro-lime)] focus:ring-emerald-600"
                />
              </label>
            );
          })}
        </div>
      </section>

      {/* About AgroShift AI & Reset */}
      <section className="bg-[var(--agro-surface)] rounded-2xl p-4 border border-[var(--agro-line)]/90 space-y-3">
        <h3 className="text-sm font-bold text-[var(--agro-text)] flex items-center gap-1.5">
          <Info className="w-4 h-4 text-[var(--agro-lime)]" />
          Acerca de AgroShift AI
        </h3>
        <p className="text-xs text-[var(--agro-muted)] leading-relaxed">
          AgroShift AI es un prototipo de arquitectura móvil para agricultura de precisión en
          Bolivia, diseñado para integrar cartografía OpenStreetMap, gestión de parcelas y
          conceptualización de fusión multisensor (SMAP, ECOSTRESS, GPM, Landsat, MODIS, GEDI y
          SoilGrids).
        </p>
        <p className="text-[11px] text-[var(--agro-warning-text)] bg-[var(--agro-warning-bg)] p-2.5 rounded-xl leading-relaxed">
          Todos los indicadores, series temporales y alertas mostrados en esta fase son datos
          demostrativos locales y no representan mediciones oficiales obtenidas en tiempo real.
        </p>

        <button
          type="button"
          onClick={() => setResetConfirmOpen(true)}
          className="w-full h-11 rounded-xl border border-[var(--agro-line)] hover:bg-[var(--agro-surface-soft)] text-xs font-semibold text-[var(--agro-text)] flex items-center justify-center gap-1.5"
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
