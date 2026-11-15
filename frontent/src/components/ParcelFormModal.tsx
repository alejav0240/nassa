import { Ruler, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { LatLngPoint, MonitoringStatus, Parcel, ParcelMeasurement } from '../types/agroshift';
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

const CROP_OPTIONS = ['Papa', 'Quinua', 'Haba', 'Cebada', 'Avena', 'Tarwi'];
const BOLIVIA_BOUNDS = { minLat: -24, maxLat: -9, minLng: -70, maxLng: -57 };

const FIELD_HELP = {
  name: 'Escribe un nombre corto para reconocer este terreno, por ejemplo: Parcela Norte.',
  crop: 'Elige el cultivo actual entre las opciones disponibles para recomendaciones.',
  areaHa: 'Indica la superficie en hectáreas. Debe ser mayor que 0 y no superar 5000 ha; también puedes medirla en el mapa.',
  location: 'Escribe la comunidad, localidad o ciudad donde está el terreno.',
  department: 'Indica el municipio o zona y, si puedes, el departamento.',
  plantingDate: 'Selecciona la fecha en que sembraste o planeas sembrar.',
  estimatedHarvestDate: 'Elige una fecha estimada posterior a la siembra.',
  latitude: 'Ingresa la latitud en grados decimales (por ejemplo, -16.6524).',
  longitude: 'Ingresa la longitud en grados decimales (por ejemplo, -68.2958).',
  monitoringStatus: 'Elige qué tan disponible está la parcela para el monitoreo.',
} as const;

type ParcelFormField = keyof typeof FIELD_HELP;
type ParcelFormErrors = Partial<Record<ParcelFormField, string>>;

function normalizeCrop(value: string) {
  return value.trim().toLocaleLowerCase('es')
    .replaceAll('á', 'a').replaceAll('é', 'e').replaceAll('í', 'i')
    .replaceAll('ó', 'o').replaceAll('ú', 'u').replaceAll('ü', 'u');
}

function isValidDate(value: string) {
  const parts = value.split('-');
  if (parts.length !== 3 || parts[0].length !== 4 || parts[1].length !== 2 || parts[2].length !== 2) return false;
  const [year, month, day] = parts.map(Number);
  if (year < 1900 || year > 2100) return false;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

export function ParcelFormModal({
  open,
  initialParcel,
  onClose,
  onSave,
}: ParcelFormModalProps) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [department, setDepartment] = useState('');
  const [areaHa, setAreaHa] = useState('');
  const [crop, setCrop] = useState('');
  const [plantingDate, setPlantingDate] = useState('');
  const [estimatedHarvestDate, setEstimatedHarvestDate] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [monitoringStatus, setMonitoringStatus] = useState<MonitoringStatus>('Disponible');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ParcelFormErrors>({});
  const [focusedField, setFocusedField] = useState<ParcelFormField | null>(null);
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
      setPlantingDate(isValidDate(initialParcel.plantingDate) ? initialParcel.plantingDate : '');
      setEstimatedHarvestDate(isValidDate(initialParcel.estimatedHarvestDate) ? initialParcel.estimatedHarvestDate : '');
      setLat(String(initialParcel.measurement?.centroid.lat ?? initialParcel.centroid.lat));
      setLng(String(initialParcel.measurement?.centroid.lng ?? initialParcel.centroid.lng));
      setMonitoringStatus(initialParcel.monitoringStatus);
      setMeasurement(initialParcel.measurement ?? null);
      setScannedPolygon(initialParcel.measurement ? initialParcel.polygon : null);
    } else {
      setName('');
      setLocation('');
      setDepartment('');
      setAreaHa('');
      setCrop('');
      setPlantingDate('');
      setEstimatedHarvestDate('');
      setLat('');
      setLng('');
      setMonitoringStatus('Disponible');
      setMeasurement(null);
      setScannedPolygon(null);
    }
    setScannerOpen(false);
    setError(null);
    setFieldErrors({});
    setFocusedField(null);
  }, [open, initialParcel]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedLocation = location.trim();
    const trimmedDepartment = department.trim();
    const parsedArea = areaHa.trim() ? Number(areaHa) : Number.NaN;
    const parsedLat = lat.trim() ? Number(lat) : Number.NaN;
    const parsedLng = lng.trim() ? Number(lng) : Number.NaN;
    const validMeasurement =
      measurement?.valid && scannedPolygon && scannedPolygon.length >= 3 ? measurement : null;
    const effectiveArea = validMeasurement ? validMeasurement.areaHa : parsedArea;
    const effectiveCentroid = validMeasurement
      ? validMeasurement.centroid
      : { lat: parsedLat, lng: parsedLng };

    const errors: ParcelFormErrors = {};
    if (trimmedName.length < 2) errors.name = 'Escribe al menos 2 caracteres para identificar la parcela.';
    else if (trimmedName.length > 120) errors.name = 'El nombre no puede superar los 120 caracteres.';

    const cropValues = [...CROP_OPTIONS, ...(initialParcel ? [initialParcel.crop] : [])].map(normalizeCrop);
    if (!crop.trim() || !cropValues.includes(normalizeCrop(crop))) {
      errors.crop = 'Selecciona un cultivo de la lista.';
    }
    if (!Number.isFinite(effectiveArea) || effectiveArea < 0.01 || effectiveArea > 5000) {
      errors.areaHa = 'Ingresa una superficie entre 0.01 y 5000 hectáreas.';
    }

    if (trimmedLocation.length < 2) errors.location = 'Indica la comunidad, localidad o ciudad de la parcela.';
    else if (trimmedLocation.length > 120) errors.location = 'La ubicación no puede superar los 120 caracteres.';
    if (trimmedDepartment.length < 2) errors.department = 'Indica el municipio o zona donde está el terreno.';
    else if (trimmedDepartment.length > 120) errors.department = 'El municipio o zona no puede superar los 120 caracteres.';

    if (!Number.isFinite(effectiveCentroid.lat) || effectiveCentroid.lat < BOLIVIA_BOUNDS.minLat || effectiveCentroid.lat > BOLIVIA_BOUNDS.maxLat) {
      errors.latitude = 'La latitud debe estar entre -24 y -9 grados (Bolivia).';
    }
    if (!Number.isFinite(effectiveCentroid.lng) || effectiveCentroid.lng < BOLIVIA_BOUNDS.minLng || effectiveCentroid.lng > BOLIVIA_BOUNDS.maxLng) {
      errors.longitude = 'La longitud debe estar entre -70 y -57 grados (Bolivia).';
    }

    const datesCanRemainUnknown = Boolean(
      initialParcel && !isValidDate(initialParcel.plantingDate) && !isValidDate(initialParcel.estimatedHarvestDate)
    );
    const bothDatesEmpty = !plantingDate && !estimatedHarvestDate;
    if (!(datesCanRemainUnknown && bothDatesEmpty)) {
      if (!isValidDate(plantingDate)) errors.plantingDate = 'Selecciona una fecha de siembra válida.';
      if (!isValidDate(estimatedHarvestDate)) errors.estimatedHarvestDate = 'Selecciona una fecha de cosecha válida.';
      if (isValidDate(plantingDate) && isValidDate(estimatedHarvestDate) && estimatedHarvestDate <= plantingDate) {
        errors.estimatedHarvestDate = 'La cosecha debe ser posterior a la fecha de siembra.';
      }
    }

    if (!['Disponible', 'Parcial', 'En revisión'].includes(monitoringStatus)) {
      errors.monitoringStatus = 'Selecciona un estado de monitoreo válido.';
    }

    if (Object.keys(errors).length > 0) {
      const firstField = Object.keys(errors)[0] as ParcelFormField;
      setFieldErrors(errors);
      setFocusedField(firstField);
      setError('Revisa los campos marcados para poder registrar la parcela.');
      window.requestAnimationFrame(() => document.getElementById(`parcel-field-${firstField}`)?.focus());
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

    const polygonLeavesBolivia = polygon.some(
      (point) =>
        point.lat < BOLIVIA_BOUNDS.minLat ||
        point.lat > BOLIVIA_BOUNDS.maxLat ||
        point.lng < BOLIVIA_BOUNDS.minLng ||
        point.lng > BOLIVIA_BOUNDS.maxLng
    );
    if (polygon.length < 3 || polygonLeavesBolivia) {
      setFieldErrors({ latitude: 'El centro o contorno excede el rango geográfico admitido para Bolivia.' });
      setFocusedField('latitude');
      setError('No se puede registrar una parcela fuera del rango geográfico admitido.');
      window.requestAnimationFrame(() => document.getElementById('parcel-field-latitude')?.focus());
      return;
    }

    const parcelToSave: Parcel = initialParcel
      ? {
          ...initialParcel,
          name: trimmedName,
          location: trimmedLocation,
          department: trimmedDepartment,
          areaHa: Number(effectiveArea.toFixed(4)),
          measurement: validMeasurement ?? undefined,
          crop: crop.trim(),
          plantingDate: plantingDate || initialParcel.plantingDate,
          estimatedHarvestDate: estimatedHarvestDate || initialParcel.estimatedHarvestDate,
          monitoringStatus,
          centroid: effectiveCentroid,
          polygon,
          imageUrl: CROP_IMAGES[crop] || initialParcel.imageUrl,
        }
      : {
          id: `parcela-${Date.now()}`,
          name: trimmedName,
          location: trimmedLocation,
          department: trimmedDepartment,
          areaHa: Number(effectiveArea.toFixed(4)),
          measurement: validMeasurement ?? undefined,
          crop: crop.trim(),
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

  const clearFieldError = (field: ParcelFormField) => {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setError(null);
  };

  const fieldMessage = (field: ParcelFormField) => {
    const fieldError = fieldErrors[field];
    const message = fieldError || (focusedField === field ? FIELD_HELP[field] : null);
    if (!message) return null;
    return (
      <p
        id={`parcel-field-${field}-message`}
        className={`mt-1.5 text-[11px] leading-relaxed ${
          fieldError ? 'text-[var(--agro-danger-text)]' : 'text-[var(--agro-muted)]'
        }`}
        role={fieldError ? 'alert' : 'status'}
      >
        {message}
      </p>
    );
  };

  const fieldDescribedBy = (field: ParcelFormField) =>
    fieldErrors[field] || focusedField === field ? `parcel-field-${field}-message` : undefined;

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

        <form noValidate onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {!initialParcel && (
            <p className="text-[11px] text-[var(--agro-muted)] leading-relaxed bg-[var(--agro-surface-soft)] rounded-xl px-3 py-2.5">
              Completa los campos para registrar una parcela real. Puedes usar “Escanear en mapa” para calcular el área y las coordenadas.
            </p>
          )}
          {error && (
            <div role="alert" className="p-3 rounded-xl bg-[var(--agro-danger-bg)] border border-red-200 text-xs text-[var(--agro-danger-text)] font-medium">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="parcel-field-name" className="block text-xs font-semibold text-[var(--agro-text)] mb-1.5">
              Nombre de la parcela
            </label>
            <input
              id="parcel-field-name"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); clearFieldError('name'); }}
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField(null)}
              placeholder="Ej. Parcela Altiplano Este"
              maxLength={120}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldDescribedBy('name')}
              className={`w-full h-11 px-3.5 rounded-xl border text-sm text-[var(--agro-text)] focus:outline-none focus:ring-2 focus:ring-emerald-600 ${fieldErrors.name ? 'border-red-500' : 'border-[var(--agro-line)]'}`}
              required
            />
            {fieldMessage('name')}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="parcel-field-crop" className="block text-xs font-semibold text-[var(--agro-text)] mb-1.5">
                Cultivo actual
              </label>
              <select
                id="parcel-field-crop"
                value={crop}
                onChange={(e) => { setCrop(e.target.value); clearFieldError('crop'); }}
                onFocus={() => setFocusedField('crop')}
                onBlur={() => setFocusedField(null)}
                aria-invalid={Boolean(fieldErrors.crop)}
                aria-describedby={fieldDescribedBy('crop')}
                className={`w-full h-11 px-3 rounded-xl border text-sm text-[var(--agro-text)] bg-[var(--agro-surface)] focus:outline-none focus:ring-2 focus:ring-emerald-600 ${fieldErrors.crop ? 'border-red-500' : 'border-[var(--agro-line)]'}`}
              >
                <option value="" disabled>Selecciona un cultivo</option>
                {initialParcel && !CROP_OPTIONS.includes(initialParcel.crop) && (
                  <option value={initialParcel.crop}>{initialParcel.crop}</option>
                )}
                {CROP_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option === 'Descanso' ? 'En descanso' : option}</option>
                ))}
              </select>
              {fieldMessage('crop')}
            </div>
            <div>
              <label htmlFor="parcel-field-areaHa" className="block text-xs font-semibold text-[var(--agro-text)] mb-1.5">
                {measurement ? 'Superficie medida (ha)' : 'Superficie declarada (ha)'}
              </label>
              <input
                id="parcel-field-areaHa"
                type="number"
                step="0.01"
                min="0.01"
                max="5000"
                value={areaHa}
                onChange={(e) => { setAreaHa(e.target.value); clearFieldError('areaHa'); }}
                onFocus={() => setFocusedField('areaHa')}
                onBlur={() => setFocusedField(null)}
                readOnly={Boolean(measurement)}
                aria-invalid={Boolean(fieldErrors.areaHa)}
                aria-describedby={fieldDescribedBy('areaHa')}
                className={`w-full h-11 px-3.5 rounded-xl border text-sm font-mono tabular-nums text-[var(--agro-text)] focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
                  measurement
                    ? 'border-emerald-200 bg-emerald-50/70 font-semibold text-[#166534]'
                    : fieldErrors.areaHa ? 'border-red-500' : 'border-[var(--agro-line)]'
                }`}
                required
              />
              {fieldMessage('areaHa')}
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
                    setScannedPolygon(null);
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
              <label htmlFor="parcel-field-location" className="block text-xs font-semibold text-[var(--agro-text)] mb-1.5">
                Ubicación
              </label>
              <input
                id="parcel-field-location"
                type="text"
                value={location}
                onChange={(e) => { setLocation(e.target.value); clearFieldError('location'); }}
                onFocus={() => setFocusedField('location')}
                onBlur={() => setFocusedField(null)}
                placeholder="Ej. Comunidad Achocalla"
                maxLength={120}
                aria-invalid={Boolean(fieldErrors.location)}
                aria-describedby={fieldDescribedBy('location')}
                className={`w-full h-11 px-3.5 rounded-xl border text-sm text-[var(--agro-text)] focus:outline-none focus:ring-2 focus:ring-emerald-600 ${fieldErrors.location ? 'border-red-500' : 'border-[var(--agro-line)]'}`}
              />
              {fieldMessage('location')}
            </div>
            <div>
              <label htmlFor="parcel-field-department" className="block text-xs font-semibold text-[var(--agro-text)] mb-1.5">
                Municipio / Zona
              </label>
              <input
                id="parcel-field-department"
                type="text"
                value={department}
                onChange={(e) => { setDepartment(e.target.value); clearFieldError('department'); }}
                onFocus={() => setFocusedField('department')}
                onBlur={() => setFocusedField(null)}
                placeholder="Ej. Viacha, La Paz"
                maxLength={120}
                aria-invalid={Boolean(fieldErrors.department)}
                aria-describedby={fieldDescribedBy('department')}
                className={`w-full h-11 px-3.5 rounded-xl border text-sm text-[var(--agro-text)] focus:outline-none focus:ring-2 focus:ring-emerald-600 ${fieldErrors.department ? 'border-red-500' : 'border-[var(--agro-line)]'}`}
              />
              {fieldMessage('department')}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="parcel-field-plantingDate" className="block text-xs font-semibold text-[var(--agro-text)] mb-1.5">
                Fecha de siembra
              </label>
              <input
                id="parcel-field-plantingDate"
                type="date"
                value={plantingDate}
                onChange={(e) => { setPlantingDate(e.target.value); clearFieldError('plantingDate'); }}
                onFocus={() => setFocusedField('plantingDate')}
                onBlur={() => setFocusedField(null)}
                aria-invalid={Boolean(fieldErrors.plantingDate)}
                aria-describedby={fieldDescribedBy('plantingDate')}
                className={`w-full h-11 px-3 rounded-xl border text-sm text-[var(--agro-text)] focus:outline-none focus:ring-2 focus:ring-emerald-600 ${fieldErrors.plantingDate ? 'border-red-500' : 'border-[var(--agro-line)]'}`}
              />
              {fieldMessage('plantingDate')}
            </div>
            <div>
              <label htmlFor="parcel-field-estimatedHarvestDate" className="block text-xs font-semibold text-[var(--agro-text)] mb-1.5">
                Cosecha estimada
              </label>
              <input
                id="parcel-field-estimatedHarvestDate"
                type="date"
                value={estimatedHarvestDate}
                onChange={(e) => { setEstimatedHarvestDate(e.target.value); clearFieldError('estimatedHarvestDate'); }}
                onFocus={() => setFocusedField('estimatedHarvestDate')}
                onBlur={() => setFocusedField(null)}
                aria-invalid={Boolean(fieldErrors.estimatedHarvestDate)}
                aria-describedby={fieldDescribedBy('estimatedHarvestDate')}
                className={`w-full h-11 px-3 rounded-xl border text-sm text-[var(--agro-text)] focus:outline-none focus:ring-2 focus:ring-emerald-600 ${fieldErrors.estimatedHarvestDate ? 'border-red-500' : 'border-[var(--agro-line)]'}`}
              />
              {fieldMessage('estimatedHarvestDate')}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="parcel-field-latitude" className="block text-xs font-semibold text-[var(--agro-text)] mb-1.5">
                Latitud (centro)
              </label>
              <input
                id="parcel-field-latitude"
                type="number"
                min={BOLIVIA_BOUNDS.minLat}
                max={BOLIVIA_BOUNDS.maxLat}
                step="any"
                value={lat}
                onChange={(e) => { setLat(e.target.value); clearFieldError('latitude'); }}
                onFocus={() => setFocusedField('latitude')}
                onBlur={() => setFocusedField(null)}
                readOnly={Boolean(measurement)}
                aria-invalid={Boolean(fieldErrors.latitude)}
                aria-describedby={fieldDescribedBy('latitude')}
                className={`w-full h-11 px-3.5 rounded-xl border text-sm font-mono tabular-nums text-[var(--agro-text)] focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
                  measurement
                    ? 'border-emerald-200 bg-emerald-50/70 text-[#166534]'
                    : fieldErrors.latitude ? 'border-red-500' : 'border-[var(--agro-line)]'
                }`}
              />
              {fieldMessage('latitude')}
            </div>
            <div>
              <label htmlFor="parcel-field-longitude" className="block text-xs font-semibold text-[var(--agro-text)] mb-1.5">
                Longitud (centro)
              </label>
              <input
                id="parcel-field-longitude"
                type="number"
                min={BOLIVIA_BOUNDS.minLng}
                max={BOLIVIA_BOUNDS.maxLng}
                step="any"
                value={lng}
                onChange={(e) => { setLng(e.target.value); clearFieldError('longitude'); }}
                onFocus={() => setFocusedField('longitude')}
                onBlur={() => setFocusedField(null)}
                readOnly={Boolean(measurement)}
                aria-invalid={Boolean(fieldErrors.longitude)}
                aria-describedby={fieldDescribedBy('longitude')}
                className={`w-full h-11 px-3.5 rounded-xl border text-sm font-mono tabular-nums text-[var(--agro-text)] focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
                  measurement
                    ? 'border-emerald-200 bg-emerald-50/70 text-[#166534]'
                    : fieldErrors.longitude ? 'border-red-500' : 'border-[var(--agro-line)]'
                }`}
              />
              {fieldMessage('longitude')}
            </div>
          </div>
          {measurement && (
            <p className="text-[11px] text-[var(--agro-muted)] leading-relaxed">
              El centro y la superficie provienen del contorno escaneado. Para editarlos
              manualmente, elige “Usar superficie declarada”.
            </p>
          )}

          <div>
            <label htmlFor="parcel-field-monitoringStatus" className="block text-xs font-semibold text-[var(--agro-text)] mb-1.5">
              Estado de monitoreo
            </label>
            <select
              id="parcel-field-monitoringStatus"
              value={monitoringStatus}
              onChange={(e) => { setMonitoringStatus(e.target.value as MonitoringStatus); clearFieldError('monitoringStatus'); }}
              onFocus={() => setFocusedField('monitoringStatus')}
              onBlur={() => setFocusedField(null)}
              aria-invalid={Boolean(fieldErrors.monitoringStatus)}
              aria-describedby={fieldDescribedBy('monitoringStatus')}
              className={`w-full h-11 px-3 rounded-xl border text-sm text-[var(--agro-text)] bg-[var(--agro-surface)] focus:outline-none focus:ring-2 focus:ring-emerald-600 ${fieldErrors.monitoringStatus ? 'border-red-500' : 'border-[var(--agro-line)]'}`}
            >
              <option value="Disponible">Disponible</option>
              <option value="Parcial">Parcial</option>
              <option value="En revisión">En revisión</option>
            </select>
            {fieldMessage('monitoringStatus')}
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
          clearFieldError('areaHa');
          clearFieldError('latitude');
          clearFieldError('longitude');
          setScannerOpen(false);
        }}
      />
    </div>
  );
}
