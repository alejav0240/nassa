import {
  AlertTriangle,
  Check,
  Crosshair,
  Info,
  Ruler,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CircleMarker,
  MapContainer,
  Polygon,
  Polyline,
  ScaleControl,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { LatLngPoint, ParcelMeasurement } from '../types/agroterra';
import {
  formatAreaHa,
  formatPerimeter,
  formatSquareMeters,
  measurePolygon,
  normalizePolygonPoints,
  validateParcelPolygon,
} from '../utils/parcelGeometry';
import { useDialogA11y } from '../hooks/useDialogA11y';

interface ParcelScannerProps {
  open: boolean;
  initialPolygon?: LatLngPoint[];
  initialCenter?: LatLngPoint;
  initialZoom?: number;
  onClose: () => void;
  onConfirm: (points: LatLngPoint[], measurement: ParcelMeasurement) => void;
}

const DEFAULT_CENTER: LatLngPoint = { lat: -16.6524, lng: -68.2958 };

function DrawClickHandler({
  active,
  onAddPoint,
}: {
  active: boolean;
  onAddPoint: (point: LatLngPoint) => void;
}) {
  useMapEvents({
    click(event) {
      if (!active) return;
      onAddPoint({
        lat: Number(event.latlng.lat.toFixed(6)),
        lng: Number(event.latlng.lng.toFixed(6)),
      });
    },
  });
  return null;
}

function ScanMapFocus({
  center,
  zoom,
  focusKey,
}: {
  center: [number, number];
  zoom: number;
  focusKey: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.45 });
    // Coordinates are intentionally unpacked so the effect only runs on
    // explicit recenter actions, not on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, center[0], center[1], zoom, focusKey]);

  return null;
}

export function ParcelScanner({
  open,
  initialPolygon,
  initialCenter,
  initialZoom = 16,
  onClose,
  onConfirm,
}: ParcelScannerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useDialogA11y({
    open,
    onClose,
    initialFocusRef: closeButtonRef,
  });
  const [points, setPoints] = useState<LatLngPoint[]>([]);
  const [focus, setFocus] = useState<{
    center: [number, number];
    zoom: number;
    key: number;
  }>({
    center: [
      initialCenter?.lat ?? initialPolygon?.[0]?.lat ?? DEFAULT_CENTER.lat,
      initialCenter?.lng ?? initialPolygon?.[0]?.lng ?? DEFAULT_CENTER.lng,
    ],
    zoom: initialZoom,
    key: 0,
  });

  const initialSignature = useMemo(
    () => (initialPolygon ? JSON.stringify(initialPolygon) : ''),
    [initialPolygon]
  );

  useEffect(() => {
    if (!open) return;
    const nextPoints = initialPolygon ?? [];
    setPoints(nextPoints);
    const nextCenter = initialCenter ?? nextPoints[0] ?? DEFAULT_CENTER;
    setFocus((current) => ({
      center: [nextCenter.lat, nextCenter.lng],
      zoom: initialZoom,
      key: current.key + 1,
    }));
    // initialSignature captures polygon identity changes without depending on
    // the array reference, which is recreated by parents on each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialSignature]);

  const normalizedPoints = useMemo(() => normalizePolygonPoints(points), [points]);
  const measurement = useMemo(
    () => measurePolygon(normalizedPoints),
    [normalizedPoints]
  );
  const validation = useMemo(
    () => validateParcelPolygon(normalizedPoints),
    [normalizedPoints]
  );

  if (!open) return null;

  const handleAddPoint = (point: LatLngPoint) => {
    setPoints((current) => [...current, point]);
  };

  const handleUndo = () => {
    setPoints((current) => current.slice(0, -1));
  };

  const handleClear = () => {
    setPoints([]);
  };

  const handleRecenter = () => {
    const target = measurement?.centroid ?? points[0] ?? DEFAULT_CENTER;
    setFocus((current) => ({
      center: [target.lat, target.lng],
      zoom: Math.max(initialZoom, 16),
      key: current.key + 1,
    }));
  };

  const handleConfirm = () => {
    if (!measurement?.valid) return;
    onConfirm(normalizedPoints, measurement);
  };

  const positions = points.map((point) => [point.lat, point.lng] as [number, number]);
  const polygonInvalid = !validation.valid && normalizedPoints.length >= 3;

  return (
    <div
      className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="parcel-scanner-title"
      ref={dialogRef}
    >
      <div className="relative h-full w-full sm:max-w-5xl sm:mx-auto sm:h-full bg-[var(--agro-surface)] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        <div className="absolute top-0 left-0 right-0 z-[500] p-3 sm:p-4 pointer-events-none">
          <div className="pointer-events-auto bg-[var(--agro-surface)]/97 backdrop-blur-md rounded-2xl border border-[var(--agro-line)]/90 shadow-[0_10px_30px_rgba(15,23,42,0.16)] px-4 py-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-[var(--agro-success-bg)] text-[var(--agro-success-text)] flex items-center justify-center shrink-0">
                  <Ruler className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <h2
                    id="parcel-scanner-title"
                    className="text-sm font-bold text-[var(--agro-text)] truncate"
                  >
                    Escáner de superficie
                  </h2>
                  <p className="text-[11px] text-[var(--agro-muted)] truncate">
                    Toca el mapa para marcar el contorno de la parcela
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              ref={closeButtonRef}
              aria-label="Cerrar escáner"
              className="min-h-[44px] min-w-[44px] rounded-full text-[var(--agro-muted)] hover:bg-[var(--agro-selected)] flex items-center justify-center shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 relative">
          <MapContainer
            center={focus.center}
            zoom={focus.zoom}
            zoomControl={false}
            className="w-full h-full z-0"
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ScaleControl position="bottomleft" imperial={false} />
            <ScanMapFocus center={focus.center} zoom={focus.zoom} focusKey={focus.key} />
            <DrawClickHandler active onAddPoint={handleAddPoint} />

            {positions.length >= 2 && (
              <Polyline
                positions={positions}
                pathOptions={{
                  color: polygonInvalid ? '#DC2626' : '#166534',
                  weight: 2.5,
                  dashArray: '6 4',
                }}
              />
            )}

            {positions.length >= 3 && (
              <Polygon
                positions={positions}
                pathOptions={{
                  color: polygonInvalid ? '#DC2626' : '#16A34A',
                  weight: 2,
                  fillColor: polygonInvalid ? '#FCA5A5' : '#16A34A',
                  fillOpacity: 0.28,
                }}
              />
            )}

            {positions.map((position, index) => (
              <CircleMarker
                key={`${position[0]}-${position[1]}-${index}`}
                center={position}
                radius={index === 0 ? 7 : 5}
                pathOptions={{
                  color: index === 0 ? '#166534' : '#16A34A',
                  weight: 2,
                  fillColor: index === 0 ? '#DCFCE7' : '#ffffff',
                  fillOpacity: 1,
                }}
              />
            ))}
          </MapContainer>

          <div className="absolute right-3 top-24 z-[450] flex flex-col gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={handleRecenter}
              disabled={points.length === 0}
              aria-label="Centrar en la medición"
              title="Centrar en la medición"
              className="w-11 h-11 rounded-2xl bg-[var(--agro-surface)]/95 backdrop-blur-md border border-[var(--agro-line)]/80 shadow-md flex items-center justify-center text-[var(--agro-text)] hover:text-[var(--agro-lime)] hover:bg-[var(--agro-selected)] disabled:opacity-40 transition-colors"
            >
              <Crosshair className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleUndo}
              disabled={points.length === 0}
              aria-label="Deshacer último vértice"
              title="Deshacer"
              className="w-11 h-11 rounded-2xl bg-[var(--agro-surface)]/95 backdrop-blur-md border border-[var(--agro-line)]/80 shadow-md flex items-center justify-center text-[var(--agro-text)] hover:text-[var(--agro-lime)] hover:bg-[var(--agro-selected)] disabled:opacity-40 transition-colors"
            >
              <Undo2 className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={points.length === 0}
              aria-label="Limpiar contorno"
              title="Limpiar"
              className="w-11 h-11 rounded-2xl bg-[var(--agro-surface)]/95 backdrop-blur-md border border-[var(--agro-line)]/80 shadow-md flex items-center justify-center text-[var(--agro-text)] hover:text-[var(--agro-danger-text)] hover:bg-[var(--agro-danger-bg)] disabled:opacity-40 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-[500] p-3 sm:p-4 pointer-events-none">
            <div className="pointer-events-auto bg-[var(--agro-surface)]/98 backdrop-blur-md rounded-3xl border border-[var(--agro-line)]/90 shadow-[0_14px_36px_rgba(15,23,42,0.18)] p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--agro-muted)]">
                    Superficie medida
                  </p>
                  <p className="text-2xl font-bold text-[var(--agro-text)] font-mono tabular-nums leading-tight mt-0.5">
                    {measurement ? formatAreaHa(measurement.areaHa) : '0,00 ha'}
                  </p>
                  <p className="text-xs text-[var(--agro-muted)] font-mono tabular-nums">
                    {measurement
                      ? formatSquareMeters(measurement.areaM2)
                      : 'Sin contorno todavía'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] text-[var(--agro-muted)]">Perímetro</p>
                  <p className="text-sm font-bold text-[var(--agro-text)] font-mono tabular-nums">
                    {measurement ? formatPerimeter(measurement.perimeterM) : '—'}
                  </p>
                  <p className="text-[11px] text-[var(--agro-muted)] mt-1">
                    Vértices:{' '}
                    <strong className="text-[var(--agro-text)]">
                      {measurement?.vertexCount ?? points.length}
                    </strong>
                  </p>
                </div>
              </div>

              {points.length < 3 && (
                <div className="flex items-start gap-2 text-[11px] text-[var(--agro-info-text)] bg-[var(--agro-info-bg)] border border-[var(--agro-line)] rounded-xl px-3 py-2">
                  <Info className="w-3.5 h-3.5 text-[var(--agro-info-text)] shrink-0 mt-0.5" />
                  <span>
                    Marca al menos 3 vértices. El polígono se cierra automáticamente al
                    calcular la superficie.
                  </span>
                </div>
              )}

              {validation.errors.length > 0 && (
                <div className="flex items-start gap-2 text-[11px] text-[var(--agro-danger-text)] bg-[var(--agro-danger-bg)] border border-[var(--agro-danger-text)]/40 rounded-xl px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-[var(--agro-danger-text)] shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    {validation.errors.slice(0, 3).map((error) => (
                      <p key={error}>{error}</p>
                    ))}
                  </div>
                </div>
              )}

              {validation.valid && validation.warnings.length > 0 && (
                <div className="flex items-start gap-2 text-[11px] text-[var(--agro-warning-text)] bg-[var(--agro-warning-bg)] border border-[var(--agro-warning-text)]/40 rounded-xl px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-[var(--agro-warning-text)] shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    {validation.warnings.slice(0, 2).map((warning) => (
                      <p key={warning}>{warning}</p>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleConfirm}
                disabled={!measurement?.valid}
                className="w-full h-11 rounded-xl agro-primary text-white text-xs font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Check className="w-4 h-4" />
                Usar superficie medida
              </button>

              <p className="text-[10px] leading-relaxed text-[var(--agro-muted)]">
                Cálculo geodésico referencial sobre WGS84. No sustituye un levantamiento
                topográfico, GNSS-RTK ni la delimitación catastral oficial.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
