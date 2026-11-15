import { Ruler, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { LatLngPoint, MonitoringStatus, Parcel, ParcelMeasurement } from '../types/agroterra';
import {
  createReferencePolygon,
  formatAreaHa,
  formatPerimeter,
  formatSquareMeters,
} from '../utils/parcelGeometry';
import { ParcelScanner } from './ParcelScanner';

interface ParcelFormModalProps {
  open: boolean;
  initialParcel?: Parcel | null;
  onClose: () => void;
  onSave: (parcel: Parcel) => void;
}

const CROP_IMAGES: Record<string, string> = {
  Papa: '/src/assets/images/parcel_papa_bolivia_1794679428614.jpg',
  Quinua: '/src/assets/images/parcel_quinua_bolivia_1794679428951.jpg',
  Maíz: '/src/assets/images/parcel_maiz_bolivia_1794679429595.jpg',
};

export function ParcelFormModal({
  open,
  initialParcel,
  onClose,
  onSave,
}: ParcelFormModalProps) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('La Paz, Bolivia');
  const [department, setDepartment] = useState('La Paz (Altiplano)');
  const [areaHa, setAreaHa] = useState('2.0');
  const [crop, setCrop] = useState('Papa');
  const [plantingDate, setPlantingDate] = useState('2026-09-15');
  const [estimatedHarvestDate, setEstimatedHarvestDate] = useState('2027-02-28');
  const [lat, setLat] = useState('-16.6524');
  const [lng, setLng] = useState('-68.2958');
  const [monitoringStatus, setMonitoringStatus] = useState<MonitoringStatus>('Disponible');
  const [error, setError] = useState<string | null>(null);
  const [measurement, setMeasurement] = useState<ParcelMeasurement | null>(null);
  const [scannedPolygon, setScannedPolygon] = useState<LatLngPoint[] | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initialParcel) {
      setName(initialParcel.name);
      setLocation(initialParcel.location);
      setDepartment(initialParcel.department);
      setAreaHa(String(initialParcel.measurement?.areaHa ?? initialParcel.areaHa));
      setCrop(initialParcel.crop);
      setPlantingDate(initialParcel.plantingDate);
      setEstimatedHarvestDate(initialParcel.estimatedHarvestDate);
      setLat(String(initialParcel.measurement?.centroid.lat ?? initialParcel.centroid.lat));
      setLng(String(initialParcel.measurement?.centroid.lng ?? initialParcel.centroid.lng));
      setMonitoringStatus(initialParcel.monitoringStatus);
      setMeasurement(initialParcel.measurement ?? null);
      setScannedPolygon(initialParcel.measurement ? initialParcel.polygon : null);
    } else {
      setName('');
      setLocation('La Paz, Bolivia');
      setDepartment('La Paz (Altiplano)');
      setAreaHa('2.0');
      setCrop('Papa');
      setPlantingDate('2026-09-15');
      setEstimatedHarvestDate('2027-02-28');
      setLat('-16.6580');
      setLng('-68.2890');
      setMonitoringStatus('Disponible');
      setMeasurement(null);
      setScannedPolygon(null);
    }
    setScannerOpen(false);
    setError(null);
  }, [open, initialParcel]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const parsedArea = Number(areaHa);
    const parsedLat = Number(lat);
    const parsedLng = Number(lng);
    const validMeasurement =
      measurement?.valid && scannedPolygon ? measurement : null;
    const effectiveArea = validMeasurement ? validMeasurement.areaHa : parsedArea;
    const effectiveCentroid = validMeasurement
      ? validMeasurement.centroid
      : { lat: parsedLat, lng: parsedLng };

    if (!trimmedName) {
      setError('Ingresa un nombre válido para la parcela.');
      return;
    }
    if (Number.isNaN(effectiveArea) || effectiveArea <= 0 || effectiveArea > 5000) {
      setError('La superficie debe estar entre 0.01 y 5000 hectáreas.');
      return;
    }
    if (
      Number.isNaN(parsedLat) ||
      Number.isNaN(parsedLng) ||
      parsedLat < -24 ||
      parsedLat > -9 ||
      parsedLng < -70 ||
      parsedLng > -57
    ) {
      setError('Ingresa coordenadas válidas dentro del territorio boliviano (Lat -24 a -9, Lng -70 a -57).');
      return;
    }
    if (estimatedHarvestDate < plantingDate) {
      setError('La fecha estimada de cosecha debe ser posterior a la fecha de siembra.');
      return;
    }

    const referenceArea = initialParcel
      ? initialParcel.measurement?.areaHa ?? initialParcel.areaHa
      : measurement?.areaHa ?? effectiveArea;
    const areaMatchesExistingPolygon = Math.abs(referenceArea - effectiveArea) < 0.0001;

    const polygon =
      validMeasurement && scannedPolygon
        ? scannedPolygon
        : areaMatchesExistingPolygon
        ? scannedPolygon ??
          initialParcel?.polygon ??
          createReferencePolygon(effectiveCentroid, effectiveArea)
        : createReferencePolygon(effectiveCentroid, effectiveArea);

    const parcelToSave: Parcel = initialParcel
      ? {
          ...initialParcel,
          name: trimmedName,
          location: location.trim() || 'Bolivia',
          department: department.trim() || location.trim(),
          areaHa: Number(effectiveArea.toFixed(4)),
          measurement: validMeasurement ?? undefined,
          crop: crop.trim() || 'Papa',
          plantingDate,
          estimatedHarvestDate,
          monitoringStatus,
          centroid: effectiveCentroid,
          polygon,
          imageUrl: CROP_IMAGES[crop] || initialParcel.imageUrl,
        }
      : {
          id: `parcela-${Date.now()}`,
          name: trimmedName,
          location: location.trim() || 'Bolivia',
          department: department.trim() || 'Bolivia',
          areaHa: Number(effectiveArea.toFixed(4)),
          measurement: validMeasurement ?? undefined,
          crop: crop.trim() || 'Papa',
          plantingDate,
          estimatedHarvestDate,
          registeredAt: new Date().toISOString().slice(0, 10),
          monitoringStatus,
          indicatorsAvailable: false,
          centroid: effectiveCentroid,
          polygon,
          imageUrl: CROP_IMAGES[crop] || CROP_IMAGES.Papa,
          elevationM: 3650,
          indicators: {
            moisturePct: 21,
            moistureVolumetric: 0.21,
            temperatureC: 29.8,
            precipitationMm: 78.2,
            ndvi: 0.57,
            soilOrganicCarbon: '15.6 g/kg',
            soilTexture: 'Franco arcilloso',
            soilPh: 6.4,
            biomassMgHa: 36.2,
          },
          observations: [],
        };

    onSave(parcelToSave);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="parcel-form-title"
    >
      <div className="bg-[var(--agro-surface)] w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[90dvh] flex flex-col shadow-xl overflow-hidden">
        <div className="w-10 h-1.5 bg-[var(--agro-canvas)] rounded-full mx-auto mt-3 sm:hidden" />
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--agro-line)]">
          <h2 id="parcel-form-title" className="text-base font-bold text-[var(--agro-text)]">
            {initialParcel ? 'Editar parcela' : 'Registrar nueva parcela'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar formulario"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-[var(--agro-muted)] hover:bg-[var(--agro-surface-soft)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-[var(--agro-danger-bg)] border border-red-200 text-xs text-[var(--agro-danger-text)] font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[var(--agro-text)] mb-1.5">
              Nombre de la parcela
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Parcela Altiplano Este"
              className="w-full h-11 px-3.5 rounded-xl border border-[var(--agro-line)] text-sm text-[var(--agro-text)] focus:outline-none focus:ring-2 focus:ring-emerald-600"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--agro-text)] mb-1.5">
                Cultivo actual
              </label>
              <select
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-[var(--agro-line)] text-sm text-[var(--agro-text)] bg-[var(--agro-surface)] focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="Papa">Papa</option>
                <option value="Quinua">Quinua</option>
                <option value="Maíz">Maíz</option>
                <option value="Haba">Haba</option>
                <option value="Cebada">Cebada</option>
                <option value="Soya">Soya</option>
                <option value="Descanso">En descanso</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--agro-text)] mb-1.5">
                {measurement ? 'Superficie medida (ha)' : 'Superficie declarada (ha)'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={areaHa}
                onChange={(e) => setAreaHa(e.target.value)}
                readOnly={Boolean(measurement)}
                className={`w-full h-11 px-3.5 rounded-xl border text-sm font-mono tabular-nums text-[var(--agro-text)] focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
                  measurement
                    ? 'border-emerald-200 bg-emerald-50/70 font-semibold text-[#166534]'
                    : 'border-[var(--agro-line)]'
                }`}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="min-h-[42px] px-3.5 rounded-xl bg-[#16A34A] hover:bg-[#166534] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                <Ruler className="w-4 h-4" />
                {measurement ? 'Volver a escanear' : 'Escanear en mapa'}
              </button>
              {measurement && (
                <button
                  type="button"
                  onClick={() => {
                    setMeasurement(null);
                  }}
                  className="min-h-[42px] px-3.5 rounded-xl border border-[var(--agro-line)] text-xs font-semibold text-[var(--agro-text)] hover:bg-[var(--agro-soft)]"
                >
                  Usar superficie declarada
                </button>
              )}
            </div>

            {measurement ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 space-y-1">
                <p className="text-[11px] font-bold text-[#166534] uppercase tracking-wide">
                  Medición del polígono
                </p>
                <p className="text-xs font-semibold text-[var(--agro-text)] font-mono tabular-nums">
                  {formatAreaHa(measurement.areaHa)} · {formatSquareMeters(measurement.areaM2)}
                </p>
                <p className="text-[11px] text-[var(--agro-muted)]">
                  Perímetro {formatPerimeter(measurement.perimeterM)} ·{' '}
                  {measurement.vertexCount} vértices · Superficie usada en todos los
                  cálculos.
                </p>
                {measurement.warnings.map((warning) => (
                  <p key={warning} className="text-[11px] text-amber-800">
                    {warning}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-[var(--agro-muted)] leading-relaxed">
                La superficie declarada no es una medición. Usa el escáner para calcular
                área y perímetro desde el contorno real del terreno.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--agro-text)] mb-1.5">
                Ubicación
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="La Paz, Bolivia"
                className="w-full h-11 px-3.5 rounded-xl border border-[var(--agro-line)] text-sm text-[var(--agro-text)] focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--agro-text)] mb-1.5">
                Municipio / Zona
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Viacha"
                className="w-full h-11 px-3.5 rounded-xl border border-[var(--agro-line)] text-sm text-[var(--agro-text)] focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--agro-text)] mb-1.5">
                Fecha de siembra
              </label>
              <input
                type="date"
                value={plantingDate}
                onChange={(e) => setPlantingDate(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-[var(--agro-line)] text-sm text-[var(--agro-text)] focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--agro-text)] mb-1.5">
                Cosecha estimada
              </label>
              <input
                type="date"
                value={estimatedHarvestDate}
                onChange={(e) => setEstimatedHarvestDate(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-[var(--agro-line)] text-sm text-[var(--agro-text)] focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--agro-text)] mb-1.5">
                Latitud (centro)
              </label>
              <input
                type="number"
                step="0.0001"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                readOnly={Boolean(measurement)}
                className={`w-full h-11 px-3.5 rounded-xl border text-sm font-mono tabular-nums text-[var(--agro-text)] focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
                  measurement
                    ? 'border-emerald-200 bg-emerald-50/70 text-[#166534]'
                    : 'border-[var(--agro-line)]'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--agro-text)] mb-1.5">
                Longitud (centro)
              </label>
              <input
                type="number"
                step="0.0001"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                readOnly={Boolean(measurement)}
                className={`w-full h-11 px-3.5 rounded-xl border text-sm font-mono tabular-nums text-[var(--agro-text)] focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
                  measurement
                    ? 'border-emerald-200 bg-emerald-50/70 text-[#166534]'
                    : 'border-[var(--agro-line)]'
                }`}
              />
            </div>
          </div>
          {measurement && (
            <p className="text-[11px] text-[var(--agro-muted)] leading-relaxed">
              El centro y la superficie provienen del contorno escaneado. Para editarlos
              manualmente, elige “Usar superficie declarada”.
            </p>
          )}

          <div>
            <label className="block text-xs font-semibold text-[var(--agro-text)] mb-1.5">
              Estado de monitoreo
            </label>
            <select
              value={monitoringStatus}
              onChange={(e) => setMonitoringStatus(e.target.value as MonitoringStatus)}
              className="w-full h-11 px-3 rounded-xl border border-[var(--agro-line)] text-sm text-[var(--agro-text)] bg-[var(--agro-surface)] focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="Disponible">Disponible</option>
              <option value="Parcial">Parcial</option>
              <option value="En revisión">En revisión</option>
            </select>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 rounded-xl border border-[var(--agro-line)] text-sm font-semibold text-[var(--agro-text)] hover:bg-[var(--agro-surface-soft)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 h-12 rounded-xl agro-primary hover:bg-[#166534] text-white text-sm font-semibold transition-colors"
            >
              {initialParcel ? 'Guardar cambios' : 'Registrar parcela'}
            </button>
          </div>
        </form>
      </div>

      <ParcelScanner
        open={scannerOpen}
        initialPolygon={scannedPolygon ?? initialParcel?.polygon}
        initialCenter={{
          lat: Number(lat) || -16.6524,
          lng: Number(lng) || -68.2958,
        }}
        onClose={() => setScannerOpen(false)}
        onConfirm={(points, result) => {
          setScannedPolygon(points);
          setMeasurement(result);
          setAreaHa(String(result.areaHa));
          setLat(String(result.centroid.lat));
          setLng(String(result.centroid.lng));
          setScannerOpen(false);
        }}
      />
    </div>
  );
}
