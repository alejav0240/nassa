import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  BarChart3,
  Box,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CloudRain,
  Compass,
  Crosshair,
  Droplets,
  Edit3,
  Eye,
  History,
  Layers,
  Map as MapIcon,
  MapPin,
  Mountain,
  PenTool,
  Search,
  Sprout,
  Thermometer,
  Trees,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import {
  CircleMarker,
  MapContainer,
  Polygon,
  TileLayer,
  Tooltip as LeafletTooltip,
  useMap,
} from 'react-leaflet';
import { ParcelFormModal } from '../components/ParcelFormModal';
import { ParcelScanner } from '../components/ParcelScanner';
import { Parcel3DView } from '../components/Parcel3DView';
import { getBaseMapAttribution, getBaseMapTileUrl } from '../services/mapTiles';
import { BOLIVIA_LOCATIONS } from '../data/mockData';
import {
  LatLngPoint,
  MapLayerId,
  Parcel,
  ParcelMeasurement,
  UserPreferences,
} from '../types/agroshift';
import { formatCoordinates } from '../utils/geo';
import {
  formatAreaHa,
  formatPerimeter,
  getParcelAreaHa,
} from '../utils/parcelGeometry';

interface MapScreenProps {
  parcels: Parcel[];
  selectedParcel: Parcel | null;
  preferences: UserPreferences;
  isSimulatedFrame?: boolean;
  onSelectParcel: (id: string) => void;
  onCreateParcel: (parcel: Parcel) => void;
  onUpdateParcel: (parcel: Parcel) => void;
  onOpenParcelDetail: (id: string) => void;
  onAnalyzeParcel: (id: string) => void;
  onOpenParcelHistory: (id: string) => void;
  syncStatus: 'idle' | 'saving' | 'saved' | 'error';
}

interface LayerDef {
  id: MapLayerId;
  name: string;
  subtitle: string;
  source: string;
  resolutionMeters: number;
  icon: typeof MapIcon;
  scaleMin?: string;
  scaleMax?: string;
  gradient?: string;
  isDemo: boolean;
}

const DRAWN_PARCEL_CROPS = ['Papa', 'Quinua', 'Haba', 'Cebada', 'Avena', 'Tarwi'];
const BOLIVIA_BOUNDS = { minLat: -24, maxLat: -9, minLng: -70, maxLng: -57 };
type DrawnParcelField = 'name' | 'crop' | 'location';
type DrawnParcelErrors = Partial<Record<DrawnParcelField, string>>;
const DRAWN_PARCEL_HELP: Record<DrawnParcelField, string> = {
  name: 'Escribe un nombre para encontrar esta parcela después.',
  crop: 'Selecciona el cultivo actual de la parcela.',
  location: 'Indica la comunidad, localidad o municipio donde está ubicada.',
};

const MAP_LAYERS: LayerDef[] = [
  {
    id: 'osm',
    name: 'Mapa base OSM',
    subtitle: 'Cartografía vectorial OpenStreetMap',
    source: 'OpenStreetMap',
    resolutionMeters: 1,
    icon: MapIcon,
    isDemo: false,
  },
  {
    id: 'humedad',
    name: 'Humedad del suelo',
    subtitle: 'Referencia regional · 9 km',
    source: 'SMAP (DEMO)',
    resolutionMeters: 9000,
    icon: Droplets,
    scaleMin: '10 %',
    scaleMax: '40 %',
    gradient: 'from-amber-400 via-sky-400 to-blue-700',
    isDemo: true,
  },
  {
    id: 'temperatura',
    name: 'Temperatura superficial',
    subtitle: 'Radiometría térmica · ~70 m',
    source: 'ECOSTRESS (DEMO)',
    resolutionMeters: 70,
    icon: Thermometer,
    scaleMin: '22 °C',
    scaleMax: '36 °C',
    gradient: 'from-emerald-400 via-amber-400 to-red-600',
    isDemo: true,
  },
  {
    id: 'precipitacion',
    name: 'Precipitación mensual',
    subtitle: 'Acumulado de cuenca · ~10 km',
    source: 'GPM (DEMO)',
    resolutionMeters: 10000,
    icon: CloudRain,
    scaleMin: '10 mm',
    scaleMax: '150 mm',
    gradient: 'from-slate-300 via-sky-400 to-indigo-700',
    isDemo: true,
  },
  {
    id: 'ndvi',
    name: 'Índice NDVI',
    subtitle: 'Vigor vegetal · 30–250 m',
    source: 'Landsat/MODIS (DEMO)',
    resolutionMeters: 250,
    icon: Sprout,
    scaleMin: '0.00',
    scaleMax: '1.00',
    gradient: 'from-red-500 via-amber-400 to-emerald-600',
    isDemo: true,
  },
  {
    id: 'biomasa',
    name: 'Biomasa',
    subtitle: 'Muestreo LiDAR · ~25 m',
    source: 'GEDI (DEMO)',
    resolutionMeters: 25,
    icon: Trees,
    scaleMin: '10 Mg/ha',
    scaleMax: '80 Mg/ha',
    gradient: 'from-lime-300 via-emerald-500 to-emerald-900',
    isDemo: true,
  },
  {
    id: 'suelo',
    name: 'Propiedades del suelo',
    subtitle: 'Estimación zonal · 250 m',
    source: 'SoilGrids (DEMO)',
    resolutionMeters: 250,
    icon: Mountain,
    scaleMin: 'pH 5.5',
    scaleMax: 'pH 8.0',
    gradient: 'from-amber-700 via-amber-500 to-emerald-700',
    isDemo: true,
  },
];

const PARCEL_BASE_PALETTE = ['#16A34A', '#0D9488', '#0284C7', '#65A30D'];

function MapController({
  targetCenter,
  targetZoom,
}: {
  targetCenter: [number, number];
  targetZoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(targetCenter, targetZoom, { duration: 0.65 });
  }, [map, targetCenter, targetZoom]);
  return null;
}

function getParcelFillColor(parcel: Parcel, index: number, layer: MapLayerId): string {
  switch (layer) {
    case 'ndvi':
      return parcel.indicators.ndvi >= 0.65
        ? '#15803d'
        : parcel.indicators.ndvi >= 0.5
        ? '#65a30d'
        : '#d97706';
    case 'humedad':
      return parcel.indicators.moisturePct >= 25
        ? '#0369a1'
        : parcel.indicators.moisturePct >= 20
        ? '#0284c7'
        : '#f59e0b';
    case 'temperatura':
      return parcel.indicators.temperatureC >= 32
        ? '#dc2626'
        : parcel.indicators.temperatureC >= 29.5
        ? '#f59e0b'
        : '#16a34a';
    case 'precipitacion':
      return parcel.indicators.precipitationMm >= 95 ? '#1d4ed8' : '#0ea5e9';
    case 'biomasa':
      return parcel.indicators.biomassMgHa >= 50 ? '#14532d' : '#22c55e';
    case 'suelo':
      return '#b45309';
    default:
      return PARCEL_BASE_PALETTE[index % PARCEL_BASE_PALETTE.length];
  }
}

export function MapScreen({
  parcels,
  selectedParcel,
  preferences,
  isSimulatedFrame,
  onSelectParcel,
  onCreateParcel,
  onUpdateParcel,
  onOpenParcelDetail,
  onAnalyzeParcel,
  onOpenParcelHistory,
  syncStatus,
}: MapScreenProps) {
  const initialLat = selectedParcel?.centroid.lat ?? -16.6524;
  const initialLng = selectedParcel?.centroid.lng ?? -68.2958;

  const [mapCenter, setMapCenter] = useState<[number, number]>([initialLat, initialLng]);
  const [mapZoom, setMapZoom] = useState<number>(15);
  const [activeLayer, setActiveLayer] = useState<MapLayerId>('osm');
  const [viewMode, setViewMode] = useState<'map' | '3d'>('map');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
  );
  const [layersOpen, setLayersOpen] = useState(false);
  const [sheetCollapsed, setSheetCollapsed] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const [userLocation, setUserLocation] = useState<LatLngPoint | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);

  // Surface scanner + save flow
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerInitialPolygon, setScannerInitialPolygon] = useState<
    LatLngPoint[] | undefined
  >(undefined);
  const [pendingScan, setPendingScan] = useState<{
    points: LatLngPoint[];
    measurement: ParcelMeasurement;
  } | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newParcelName, setNewParcelName] = useState('');
  const [newParcelCrop, setNewParcelCrop] = useState('');
  const [newParcelLocation, setNewParcelLocation] = useState('');
  const [newParcelErrors, setNewParcelErrors] = useState<DrawnParcelErrors>({});
  const [newParcelFormError, setNewParcelFormError] = useState<string | null>(null);
  const [focusedNewParcelField, setFocusedNewParcelField] = useState<DrawnParcelField | null>(null);

  // Edit / Register modal from map
  const [parcelFormOpen, setParcelFormOpen] = useState(false);
  const [editingParcel, setEditingParcel] = useState<Parcel | null>(null);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setResolvedTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const currentLayerInfo = MAP_LAYERS.find((l) => l.id === activeLayer) ?? MAP_LAYERS[0];

  const isSmallParcelForLayer = useMemo(() => {
    if (!selectedParcel || activeLayer === 'osm') return false;
    const parcelM2 = getParcelAreaHa(selectedParcel) * 10000;
    const pixelM2 = currentLayerInfo.resolutionMeters * currentLayerInfo.resolutionMeters;
    return parcelM2 < pixelM2;
  }, [selectedParcel, activeLayer, currentLayerInfo]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const parcelHits = parcels
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.location.toLowerCase().includes(q))
      .map((p) => ({
        id: p.id,
        label: `${p.name} · ${p.crop}`,
        sub: `${p.location} · ${getParcelAreaHa(p).toFixed(2)} ha`,

        lat: (p.measurement?.centroid ?? p.centroid).lat,
        lng: (p.measurement?.centroid ?? p.centroid).lng,
        zoom: 16,
        parcelId: p.id,
      }));
    const boliviaHits = BOLIVIA_LOCATIONS.filter(
      (loc) => !q || loc.name.toLowerCase().includes(q)
    ).map((loc) => ({
      id: loc.name,
      label: loc.name,
      sub: 'Zona agrícola de referencia',
      lat: loc.lat,
      lng: loc.lng,
      zoom: loc.zoom,
      parcelId: undefined,
    }));
    return [...parcelHits, ...boliviaHits].slice(0, 6);
  }, [searchQuery, parcels]);

  const handleSelectAndFly = (parcel: Parcel) => {
    const center = parcel.measurement?.centroid ?? parcel.centroid;
    onSelectParcel(parcel.id);
    setMapCenter([center.lat, center.lng]);
    setMapZoom(16);
    setSheetCollapsed(false);
    onOpenParcelDetail(parcel.id);
  };

  const handleGeolocate = () => {
    setLocationNotice(null);
    if (!navigator.geolocation) {
      setLocationNotice('Geolocalización no disponible en este navegador. Centrando en Bolivia.');
      setMapCenter([-16.6524, -68.2958]);
      setMapZoom(14);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const pt = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(pt);
        setMapCenter([pt.lat, pt.lng]);
        setMapZoom(15);
      },
      () => {
        setLocationNotice(
          'Permiso de ubicación no concedido. Mostrando parcela seleccionada.'
        );
        setMapCenter([initialLat, initialLng]);
        setMapZoom(14);
      },
      { timeout: 6000 }
    );
  };

  const handleCenterOnParcel = () => {
    if (selectedParcel) {
      setMapCenter([selectedParcel.centroid.lat, selectedParcel.centroid.lng]);
      setMapZoom(16);
    } else {
      setMapCenter([-17.2, -66.5]);
      setMapZoom(6);
    }
  };

  const openScanner = (initialPolygon?: LatLngPoint[]) => {
    setScannerInitialPolygon(initialPolygon);
    setScannerOpen(true);
    setLayersOpen(false);
  };

  const handleScanConfirm = (
    points: LatLngPoint[],
    measurement: ParcelMeasurement
  ) => {
    setPendingScan({ points, measurement });
    setScannerOpen(false);
    setNewParcelName('');
    setNewParcelCrop('');
    setNewParcelLocation('');
    setNewParcelErrors({});
    setNewParcelFormError(null);
    setFocusedNewParcelField(null);
    setShowSaveModal(true);
  };

  const handleSaveDrawnParcel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingScan) return;
    const errors: DrawnParcelErrors = {};
    const trimmedName = newParcelName.trim();
    const trimmedLocation = newParcelLocation.trim();
    if (trimmedName.length < 2) errors.name = 'Escribe al menos 2 caracteres.';
    else if (trimmedName.length > 120) errors.name = 'Usa hasta 120 caracteres.';
    if (!DRAWN_PARCEL_CROPS.includes(newParcelCrop)) errors.crop = 'Selecciona un cultivo disponible.';
    if (trimmedLocation.length < 2) errors.location = 'Indica una comunidad o municipio.';
    else if (trimmedLocation.length > 120) errors.location = 'Usa hasta 120 caracteres.';

    const { areaHa, centroid } = pendingScan.measurement;
    const polygonOutsideBolivia = pendingScan.points.some(
      (point) =>
        point.lat < BOLIVIA_BOUNDS.minLat ||
        point.lat > BOLIVIA_BOUNDS.maxLat ||
        point.lng < BOLIVIA_BOUNDS.minLng ||
        point.lng > BOLIVIA_BOUNDS.maxLng
    );
    const measurementInvalid =
      !pendingScan.measurement.valid ||
      !Number.isFinite(areaHa) ||
      areaHa < 0.01 ||
      areaHa > 5000 ||
      !Number.isFinite(centroid.lat) ||
      !Number.isFinite(centroid.lng) ||
      polygonOutsideBolivia;
    if (measurementInvalid) {
      setNewParcelFormError('La medición no es válida. Ajusta el contorno al rango geográfico admitido para Bolivia y a una superficie entre 0.01 y 5000 ha.');
    } else {
      setNewParcelFormError(null);
    }

    if (Object.keys(errors).length > 0) {
      const firstField = Object.keys(errors)[0] as DrawnParcelField;
      setNewParcelErrors(errors);
      setFocusedNewParcelField(firstField);
      window.requestAnimationFrame(() => document.getElementById(`drawn-parcel-${firstField}`)?.focus());
      return;
    }
    if (measurementInvalid) return;

    const created: Parcel = {
      id: `parcela-${Date.now()}`,
      name: trimmedName,
      location: trimmedLocation,
      department: trimmedLocation,
      areaHa: pendingScan.measurement.areaHa,
      measurement: pendingScan.measurement,
      crop: newParcelCrop,
      plantingDate: 'No registrada',
      estimatedHarvestDate: 'No registrada',
      registeredAt: new Date().toISOString().slice(0, 10),
      monitoringStatus: 'Disponible',
      indicatorsAvailable: false,
      centroid: pendingScan.measurement.centroid,
      polygon: pendingScan.points,
      elevationM: 3810,
      indicators: {
        moisturePct: 22,
        moistureVolumetric: 0.22,
        temperatureC: 30.1,
        precipitationMm: 81.0,
        ndvi: 0.59,
        soilOrganicCarbon: '16.5 g/kg',
        soilTexture: 'Franco arcilloso',
        soilPh: 6.3,
        biomassMgHa: 39.0,
      },
      observations: [],
    };
    onCreateParcel(created);
    onOpenParcelDetail(created.id);
    setShowSaveModal(false);
    setPendingScan(null);
    setNewParcelErrors({});
    setNewParcelFormError(null);
    setScannerInitialPolygon(undefined);
    setMapCenter([created.centroid.lat, created.centroid.lng]);
    setMapZoom(16);
  };

  const clearNewParcelError = (field: DrawnParcelField) => {
    setNewParcelErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const drawnParcelFieldMessage = (field: DrawnParcelField) => {
    const fieldError = newParcelErrors[field];
    const message = fieldError || (focusedNewParcelField === field ? DRAWN_PARCEL_HELP[field] : null);
    if (!message) return null;
    const messageId = 'drawn-parcel-' + field + '-message';
    return (
      <p
        id={messageId}
        className={`mt-1 text-[11px] leading-relaxed ${fieldError ? 'text-[var(--agro-danger-text)]' : 'text-[var(--agro-muted)]'}`}
        role={fieldError ? 'alert' : 'status'}
      >
        {message}
      </p>
    );
  };

  const drawnParcelDescribedBy = (field: DrawnParcelField) =>
    newParcelErrors[field] || focusedNewParcelField === field
      ? 'drawn-parcel-' + field + '-message'
      : undefined;

  const moistureValue = selectedParcel
    ? preferences.moistureUnit === 'volumetric'
      ? `${selectedParcel.indicators.moistureVolumetric.toFixed(2)} m³/m³`
      : `${selectedParcel.indicators.moisturePct}%`
    : '';

  return (
    <div
      className={`agro-map-canvas relative w-full overflow-hidden bg-[var(--agro-surface-soft)] select-none ${
        isSimulatedFrame
          ? 'agro-map-canvas--simulated h-[748px]'
          : 'h-[calc(100dvh-64px)] lg:h-[calc(100vh-32px)] lg:rounded-3xl border border-[var(--agro-line)]/90 shadow-xs'
      }`}
    >
      {/* Geographic map or the existing interactive 3D parcel scene. */}
      {viewMode === 'map' ? (
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          zoomControl={false}
          className="w-full h-full z-0"
          aria-label="Mapa interactivo de parcelas agrícolas"
        >
          <TileLayer
            attribution={getBaseMapAttribution()}
            url={getBaseMapTileUrl(resolvedTheme)}
            detectRetina
            maxZoom={20}
            minZoom={0}
            subdomains="abcd"
          />
          <MapController targetCenter={mapCenter} targetZoom={mapZoom} />

        {/* Parcel Polygons with Halo Selection Highlight */}
        {parcels.map((parcel, idx) => {
          const isSelected = selectedParcel?.id === parcel.id;
          const fillColor = getParcelFillColor(parcel, idx, activeLayer);
          const positions = parcel.polygon.map((p) => [p.lat, p.lng] as [number, number]);

          return (
            <React.Fragment key={parcel.id}>
              {positions.length >= 3 && (
                <>
                  {/* Outer soft highlight halo for selected parcel */}
                  {isSelected && (
                    <Polygon
                      positions={positions}
                      pathOptions={{
                        color: '#86EFAC',
                        weight: 9,
                        opacity: 0.65,
                        fillOpacity: 0,
                      }}
                    />
                  )}

                  <Polygon
                    positions={positions}
                    pathOptions={{
                      color: isSelected ? '#166534' : fillColor,
                      weight: isSelected ? 3 : 2,
                      opacity: isSelected ? 1 : 0.85,
                      dashArray: isSelected ? undefined : '5 4',
                      fillColor,
                      fillOpacity: isSelected ? 0.38 : activeLayer === 'osm' ? 0.2 : 0.45,
                    }}
                    eventHandlers={{
                      click: () => {
                        handleSelectAndFly(parcel);
                      },
                    }}
                  >
                    <LeafletTooltip
                      permanent={isSelected}
                      direction="center"
                      className="agro-map-tooltip"
                    >
                      {parcel.name} · {formatAreaHa(getParcelAreaHa(parcel))}
                    </LeafletTooltip>
                  </Polygon>
                </>
              )}

              {/* Corner survey vertices on selected parcel */}
              {isSelected &&
                positions.map((pos, vIdx) => (
                  <CircleMarker
                    key={`${parcel.id}-v-${vIdx}`}
                    center={pos}
                    radius={3.5}
                    pathOptions={{
                      color: '#166534',
                      weight: 2,
                      fillColor: '#ffffff',
                      fillOpacity: 1,
                    }}
                  />
                ))}

              {/* Centroid marker for zoomed-out visibility */}
              <CircleMarker
                center={[
                  (parcel.measurement?.centroid ?? parcel.centroid).lat,
                  (parcel.measurement?.centroid ?? parcel.centroid).lng,
                ]}
                radius={isSelected ? 6 : 4.5}
                pathOptions={{
                  color: '#ffffff',
                  weight: 2,
                  fillColor: isSelected ? '#166534' : fillColor,
                  fillOpacity: 1,
                }}
                eventHandlers={{
                  click: () => {
                    handleSelectAndFly(parcel);
                  },
                }}
              />
            </React.Fragment>
          );
        })}

        {/* User Geolocation Pin */}
        {userLocation && (
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            radius={8}
            pathOptions={{
              color: '#ffffff',
              weight: 3,
              fillColor: '#0284C7',
              fillOpacity: 1,
            }}
          />
        )}

        </MapContainer>
      ) : selectedParcel ? (
        <div className="agro-map-3d-host h-full overflow-y-auto bg-[var(--agro-canvas)] p-2 sm:p-4">
          <Parcel3DView parcel={selectedParcel} />
        </div>
      ) : (
        <div className="h-full grid place-items-center bg-[var(--agro-canvas)] text-sm text-[var(--agro-muted)]">
          Seleccioná una parcela para abrir la vista 3D.
        </div>
      )}

      {/* Top Rounded Search Bar & Quick Parcel Switcher */}
      <div className="absolute top-3.5 left-3.5 right-3.5 z-[450] flex flex-col gap-2 pointer-events-none">
        <div className="pointer-events-auto max-w-md w-full relative">
          <div className="flex items-center h-12 rounded-full bg-[var(--agro-surface)] backdrop-blur-md border border-[var(--agro-line)]/80 shadow-[0_8px_24px_rgba(15,23,42,0.08)] px-2 gap-2 focus-within:ring-2 focus-within:ring-[#16A34A] transition-shadow">
            <div className="w-8 h-8 rounded-full bg-[var(--agro-selected)] text-[var(--agro-lime)] flex items-center justify-center shrink-0">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setSearchOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchOpen(true);
              }}
               placeholder="Buscar parcela o zona agrícola..."
               aria-label="Buscar parcela o zona agrícola"
               className="flex-1 bg-transparent text-sm text-[var(--agro-text)] placeholder:text-[var(--agro-muted)] focus:outline-none min-w-0"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Limpiar búsqueda"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--agro-muted)] hover:text-[var(--agro-text)] hover:bg-[var(--agro-surface-soft)] shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <span className="text-[10px] font-semibold text-[var(--agro-muted)] pr-2.5 whitespace-nowrap">
                OSM
              </span>
            )}
          </div>
        </div>

        {!searchOpen && (
          <div className="pointer-events-auto max-w-md bg-[var(--agro-surface)] backdrop-blur-md rounded-2xl border border-[var(--agro-line)]/80 shadow-sm px-3.5 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--agro-text)]">Mapa de parcelas</p>
                <p className="text-[11px] text-[var(--agro-muted)] mt-0.5 truncate">
                  {parcels.length} {parcels.length === 1 ? 'área registrada' : 'áreas registradas'} · {currentLayerInfo.name}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--agro-selected)] text-[var(--agro-lime)] px-2 py-1 text-[10px] font-bold whitespace-nowrap">
                <MapPin className="w-3 h-3" />
                {selectedParcel ? 'Área activa' : 'Sin selección'}
              </span>
            </div>
            <p className="text-[11px] text-[var(--agro-muted)] mt-2 leading-4">
              Tocá una parcela para abrir su ficha 3D o usá <strong>Dibujar</strong> para registrar una nueva.
            </p>
          </div>
        )}

        {syncStatus !== 'idle' && (
          <div
            role="status"
            className={`pointer-events-auto max-w-md rounded-2xl border px-3.5 py-2.5 text-xs shadow-md ${
              syncStatus === 'error'
                ? 'border-amber-200 bg-amber-50 text-amber-900'
                : syncStatus === 'saving'
                ? 'border-sky-200 bg-sky-50 text-sky-900'
                : 'border-emerald-200 bg-emerald-50 text-emerald-900'
            }`}
          >
            {syncStatus === 'saving' && 'Guardando parcela…'}
            {syncStatus === 'saved' && 'Parcela guardada y sincronizada.'}
            {syncStatus === 'error' &&
              'Parcela guardada localmente. No se pudo sincronizar con el servidor.'}
          </div>
        )}

        {/* Sleek Parcel Switcher Chips */}
        {parcels.length > 0 && !searchOpen && (
          <div className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full py-0.5">
            {parcels.map((p) => {
              const active = selectedParcel?.id === p.id;
              return (
                <motion.button
                  key={p.id}
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleSelectAndFly(p)}
                  className={`min-h-[34px] px-3.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all border ${
                    active
                      ? 'bg-[#166534] text-white border-[#166534] shadow-md shadow-emerald-900/15'
                      : 'bg-[var(--agro-surface)] backdrop-blur-md text-[var(--agro-text)] border-[var(--agro-line)]/80 shadow-xs hover:bg-[var(--agro-surface)]'
                  }`}
                >
                  {p.name}
                  <span className={`ml-1.5 font-mono text-[11px] ${active ? 'text-emerald-200' : 'text-[var(--agro-muted)]'}`}>
                    {getParcelAreaHa(p).toFixed(2)} ha
                  </span>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Search Results Dropdown */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.14 }}
              className="pointer-events-auto max-w-md bg-[var(--agro-surface)] backdrop-blur-md rounded-3xl border border-[var(--agro-line)]/90 shadow-[0_12px_32px_rgba(15,23,42,0.12)] overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--agro-line)] text-[11px] font-semibold text-[var(--agro-muted)]">
                <span>Parcelas y ubicaciones en Bolivia</span>
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="text-[var(--agro-lime)] hover:underline"
                >
                  Cerrar
                </button>
              </div>
              <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                {searchResults.length === 0 ? (
                  <div className="px-4 py-4 text-xs text-[var(--agro-muted)]" role="status">
                    No encontramos parcelas ni zonas con “{searchQuery.trim()}”. Probá con otro término.
                  </div>
                ) : searchResults.map((hit) => (
                    <button
                      key={hit.id}
                      type="button"
                      onClick={() => {
                        setMapCenter([hit.lat, hit.lng]);
                        setMapZoom(hit.zoom);
                        if (hit.parcelId) {
                           onSelectParcel(hit.parcelId);
                           onOpenParcelDetail(hit.parcelId);
                        }
                        setSearchOpen(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-[var(--agro-success-bg)] flex items-center gap-3 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-xl bg-[var(--agro-selected)] text-[var(--agro-lime)] flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[var(--agro-text)] truncate">{hit.label}</p>
                        <p className="text-[11px] text-[var(--agro-muted)] truncate">{hit.sub}</p>
                      </div>
                    </button>
                  ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Geolocation Feedback Notice */}
        <AnimatePresence>
          {locationNotice && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="pointer-events-auto max-w-md bg-[var(--agro-surface)] backdrop-blur-md border border-amber-200 text-[var(--agro-text)] rounded-2xl px-3.5 py-2.5 text-xs flex items-center justify-between gap-2 shadow-md"
            >
              <span>{locationNotice}</span>
              <button
                type="button"
                onClick={() => setLocationNotice(null)}
                className="text-[var(--agro-lime)] font-semibold shrink-0"
              >
                OK
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right Floating Action Buttons (4 clean tactile controls) */}
       <div className="absolute right-3.5 top-1/2 -translate-y-1/2 z-[450] flex flex-col gap-2.5" role="toolbar" aria-label="Controles del mapa">
        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={handleGeolocate}
          title="Mi ubicación"
          aria-label="Mi ubicación"
          className="w-11 h-11 rounded-2xl bg-[var(--agro-surface)] backdrop-blur-md border border-[var(--agro-line)]/80 shadow-[0_6px_18px_rgba(15,23,42,0.09)] flex items-center justify-center text-[var(--agro-text)] hover:text-[var(--agro-lime)] hover:bg-[var(--agro-selected)] transition-colors"
        >
          <Crosshair className="w-5 h-5" />
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            setViewMode((current) => current === 'map' ? '3d' : 'map');
            setLayersOpen(false);
          }}
          title={viewMode === 'map' ? 'Vista 3D de parcela' : 'Volver al mapa'}
          aria-label={viewMode === 'map' ? 'Vista 3D de parcela' : 'Volver al mapa'}
          className={`w-11 h-11 rounded-2xl border shadow-[0_6px_18px_rgba(15,23,42,0.09)] flex items-center justify-center transition-colors ${viewMode === '3d' ? 'bg-[#166534] border-[#166534] text-white' : 'bg-[var(--agro-surface)] backdrop-blur-md border-[var(--agro-line)]/80 text-[var(--agro-text)] hover:text-[var(--agro-lime)] hover:bg-[var(--agro-selected)]'}`}
        >
          <Box className="w-5 h-5" />
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={() => viewMode === 'map' && setLayersOpen((v) => !v)}
          title="Capas"
          aria-label="Capas"
          className={`w-11 h-11 rounded-2xl border shadow-[0_6px_18px_rgba(15,23,42,0.09)] flex items-center justify-center transition-colors ${viewMode === '3d' ? 'opacity-40 cursor-not-allowed' : ''} ${
            layersOpen || activeLayer !== 'osm'
              ? 'bg-[#166534] border-[#166534] text-white'
              : 'bg-[var(--agro-surface)] backdrop-blur-md border-[var(--agro-line)]/80 text-[var(--agro-text)] hover:text-[var(--agro-lime)] hover:bg-[var(--agro-selected)]'
          }`}
        >
          <Layers className="w-5 h-5" />
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={() => openScanner()}
          title="Escanear parcela"
          aria-label="Escanear parcela"
          className="w-11 h-11 rounded-2xl bg-[var(--agro-surface)] backdrop-blur-md border border-[var(--agro-line)]/80 shadow-[0_6px_18px_rgba(15,23,42,0.09)] flex items-center justify-center text-[var(--agro-text)] hover:text-[var(--agro-lime)] hover:bg-[var(--agro-selected)] transition-colors"
        >
          <PenTool className="w-5 h-5" />
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={handleCenterOnParcel}
          title="Centrar mapa"
          aria-label="Centrar mapa"
          className="w-11 h-11 rounded-2xl bg-[var(--agro-surface)] backdrop-blur-md border border-[var(--agro-line)]/80 shadow-[0_6px_18px_rgba(15,23,42,0.09)] flex items-center justify-center text-[var(--agro-text)] hover:text-[var(--agro-lime)] hover:bg-[var(--agro-selected)] transition-colors"
        >
          <Compass className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Friendly Layer Selector Drawer */}
      <AnimatePresence>
        {layersOpen && (
          <motion.div
            initial={{ opacity: 0, x: 14, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 14, scale: 0.96 }}
            transition={{ duration: 0.16 }}
            className="absolute right-16 top-28 z-[460] w-72 max-w-[calc(100vw-88px)] bg-[var(--agro-surface)] backdrop-blur-md rounded-3xl border border-[var(--agro-line)]/90 shadow-[0_14px_34px_rgba(15,23,42,0.14)] p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-[var(--agro-text)]">Capas cartográficas</h3>
                <p className="text-[10px] text-[var(--agro-muted)]">Base: OpenStreetMap · Capas DEMO</p>
              </div>
              <button
                type="button"
                onClick={() => setLayersOpen(false)}
                aria-label="Cerrar capas"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--agro-muted)] hover:bg-[var(--agro-surface-soft)] hover:text-[var(--agro-text)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
              {MAP_LAYERS.map((layer) => {
                const isOn = activeLayer === layer.id;
                const LayerIcon = layer.icon;
                return (
                  <button
                    key={layer.id}
                    type="button"
                    role="switch"
                    aria-checked={isOn}
                    onClick={() => setActiveLayer(isOn && layer.id !== 'osm' ? 'osm' : layer.id)}
                    className={`w-full px-2.5 py-2 rounded-2xl text-left transition-colors flex items-center justify-between gap-2.5 ${
                      isOn
                        ? 'bg-[#DCFCE7]/80 text-[var(--agro-lime)]'
                        : 'hover:bg-[var(--agro-surface-soft)] text-[var(--agro-text)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isOn ? 'bg-[var(--agro-surface)] text-[var(--agro-lime)] shadow-2xs' : 'bg-[var(--agro-surface-soft)] text-[var(--agro-muted)]'
                        }`}
                      >
                        <LayerIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{layer.name}</p>
                        <p className="text-[10px] opacity-80 truncate">{layer.source}</p>
                      </div>
                    </div>

                    <div
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 flex items-center ${
                        isOn ? 'agro-primary justify-end' : 'bg-slate-300 justify-start'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-[var(--agro-surface)] shadow-xs" />
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Area: Simple Legend + Modern Parcel Bottom Sheet */}
      <div className="absolute bottom-3.5 left-3.5 right-3.5 z-[450] flex flex-col items-center gap-2 pointer-events-none">
        {/* Compact Thematic Legend */}
        <AnimatePresence>
          {activeLayer !== 'osm' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.16 }}
              className="pointer-events-auto w-full max-w-md bg-[var(--agro-surface)] backdrop-blur-md rounded-2xl px-3.5 py-2.5 border border-[var(--agro-line)]/80 shadow-md space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-bold text-[var(--agro-text)]">{currentLayerInfo.name}</span>
                <span className="text-[10px] font-semibold text-[var(--agro-warning-text)]">
                  {currentLayerInfo.source}
                </span>
              </div>
              {currentLayerInfo.gradient && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-[var(--agro-muted)] shrink-0">
                    {currentLayerInfo.scaleMin}
                  </span>
                  <div
                    className={`flex-1 h-2 rounded-full bg-gradient-to-r ${currentLayerInfo.gradient}`}
                  />
                  <span className="text-[10px] font-mono text-[var(--agro-muted)] shrink-0">
                    {currentLayerInfo.scaleMax}
                  </span>
                </div>
              )}
              {isSmallParcelForLayer && (
                <div className="flex items-center gap-1.5 text-[11px] text-[var(--agro-warning-text)] bg-[var(--agro-warning-bg)] px-2.5 py-1 rounded-xl">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
                  <span className="leading-snug">
                    La resolución de esta fuente puede no representar con precisión una parcela pequeña.
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State / Selected Parcel Bottom Sheet */}
         <div className="pointer-events-auto w-full max-w-md lg:max-w-xl max-h-[48dvh] overflow-y-auto no-scrollbar lg:max-h-none lg:overflow-visible">
          {parcels.length === 0 ? (
            <div className="bg-[var(--agro-surface)] backdrop-blur-md rounded-3xl p-4 border border-[var(--agro-line)] shadow-xl text-center space-y-2.5">
              <p className="text-sm font-bold text-[var(--agro-text)]">
                Escanea o registra una parcela para comenzar el monitoreo
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openScanner()}
                  className="flex-1 h-10 rounded-xl agro-primary text-white text-xs font-semibold"
                >
                  Escanear en mapa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingParcel(null);
                    setParcelFormOpen(true);
                  }}
                  className="flex-1 h-10 rounded-xl border border-[var(--agro-line)] text-xs font-semibold text-[var(--agro-text)]"
                >
                  Registrar
                </button>
              </div>
            </div>
          ) : (
            selectedParcel && (
              <motion.div
                layout
                key={selectedParcel.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="bg-[var(--agro-surface)] backdrop-blur-md rounded-3xl px-4 pt-2.5 pb-4 border border-[var(--agro-line)]/90 shadow-[0_12px_36px_rgba(15,23,42,0.14)] space-y-3"
              >
                {/* Drag Handle Affordance */}
                <button
                  type="button"
                  onClick={() => setSheetCollapsed((v) => !v)}
                  aria-label={sheetCollapsed ? 'Expandir tarjeta de parcela' : 'Minimizar tarjeta de parcela'}
                  className="w-full flex flex-col items-center py-0.5 group"
                >
                  <span className="w-10 h-1 rounded-full bg-slate-300 group-hover:bg-slate-400 transition-colors" />
                </button>

                {/* Parcel Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-[var(--agro-text)] truncate">
                        {selectedParcel.name}
                      </h2>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--agro-lime)]">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        {selectedParcel.monitoringStatus}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--agro-muted)] mt-0.5 truncate">
                      {selectedParcel.crop} ·{' '}
                      <span className="font-mono font-semibold text-[var(--agro-text)] tabular-nums">
                        {formatAreaHa(getParcelAreaHa(selectedParcel))}
                      </span>{' '}
                      · {selectedParcel.location}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSheetCollapsed((v) => !v)}
                    aria-label={sheetCollapsed ? 'Mostrar más' : 'Mostrar menos'}
                    className="w-8 h-8 rounded-full bg-[var(--agro-surface-soft)] hover:bg-[var(--agro-canvas)] text-[var(--agro-muted)] flex items-center justify-center shrink-0 transition-colors"
                  >
                    {sheetCollapsed ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {!sheetCollapsed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.14 }}
                    className="space-y-3"
                  >
                    {/* Clean Mini Indicators Strip */}
                    <div className="grid grid-cols-4 gap-2">
                      <div className="bg-[var(--agro-surface-soft)] rounded-2xl px-2 py-2 text-center border border-[var(--agro-line)]">
                        <p className="text-[10px] text-[var(--agro-muted)]">Humedad</p>
                        <p className="text-xs font-bold text-[var(--agro-text)] font-mono tabular-nums mt-0.5">
                          {moistureValue}
                        </p>
                      </div>
                      <div className="bg-[var(--agro-surface-soft)] rounded-2xl px-2 py-2 text-center border border-[var(--agro-line)]">
                        <p className="text-[10px] text-[var(--agro-muted)]">Temp.</p>
                        <p className="text-xs font-bold text-[var(--agro-text)] font-mono tabular-nums mt-0.5">
                          {selectedParcel.indicators.temperatureC.toFixed(1)}°C
                        </p>
                      </div>
                      <div className="bg-[var(--agro-surface-soft)] rounded-2xl px-2 py-2 text-center border border-[var(--agro-line)]">
                        <p className="text-[10px] text-[var(--agro-muted)]">Lluvia</p>
                        <p className="text-xs font-bold text-[var(--agro-text)] font-mono tabular-nums mt-0.5">
                          {selectedParcel.indicators.precipitationMm.toFixed(0)} mm
                        </p>
                      </div>
                      <div className="bg-[#DCFCE7]/55 rounded-2xl px-2 py-2 text-center border border-[var(--agro-line)]">
                        <p className="text-[10px] text-[var(--agro-lime)]">NDVI</p>
                        <p className="text-xs font-bold text-[var(--agro-lime)] font-mono tabular-nums mt-0.5">
                          {selectedParcel.indicators.ndvi.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Primary + Secondary Action Buttons */}
                    <div className="flex items-center gap-2">
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.97 }}
                        onClick={() => onOpenParcelDetail(selectedParcel.id)}
                        className="flex-[1.35] min-h-[42px] px-3 rounded-2xl bg-[#166534] hover:bg-[#14532d] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                      >
                        <Eye className="w-4 h-4 shrink-0" />
                        <span>Ver detalle</span>
                      </motion.button>

                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.97 }}
                        onClick={() => onAnalyzeParcel(selectedParcel.id)}
                        className="flex-1 min-h-[42px] px-2.5 rounded-2xl bg-[var(--agro-selected)] hover:bg-[var(--agro-success-bg)] text-[var(--agro-lime)] text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                        <span>Analizar</span>
                      </motion.button>

                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setEditingParcel(selectedParcel);
                          setParcelFormOpen(true);
                        }}
                        aria-label="Editar parcela"
                        title="Editar"
                        className="w-[42px] h-[42px] rounded-2xl bg-[var(--agro-surface-soft)] hover:bg-[var(--agro-canvas)] text-[var(--agro-text)] flex items-center justify-center shrink-0 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </motion.button>

                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onOpenParcelHistory(selectedParcel.id)}
                        aria-label="Historial de parcela"
                        title="Historial"
                        className="w-[42px] h-[42px] rounded-2xl bg-[var(--agro-surface-soft)] hover:bg-[var(--agro-canvas)] text-[var(--agro-text)] flex items-center justify-center shrink-0 transition-colors"
                      >
                        <History className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )
          )}
        </div>
      </div>

      {/* Save Scanned Parcel Modal */}
      {showSaveModal && pendingScan && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveDrawnParcel}
            noValidate
            className="bg-[var(--agro-surface)] w-full max-w-sm rounded-3xl p-5 shadow-xl space-y-4"
          >
            <div>
              <h3 className="text-base font-bold text-[var(--agro-text)]">Guardar parcela escaneada</h3>
              <p className="text-xs text-[var(--agro-muted)] mt-0.5">
                Superficie medida:{' '}
                <strong className="font-mono text-[var(--agro-lime)]">
                  {formatAreaHa(pendingScan.measurement.areaHa)}
                </strong>
              </p>
              <p className="text-[11px] text-[var(--agro-muted)] font-mono mt-0.5">
                Perímetro {formatPerimeter(pendingScan.measurement.perimeterM)} ·{' '}
                {pendingScan.measurement.vertexCount} vértices
              </p>
              <p className="text-[11px] text-[var(--agro-muted)] font-mono mt-0.5">
                Centroide: {formatCoordinates(pendingScan.measurement.centroid)}
              </p>
            </div>
            <p className="text-[11px] text-[var(--agro-muted)] bg-[var(--agro-surface-soft)] rounded-xl p-2.5">
              Completa el nombre, cultivo y ubicación. Enfoca un campo para ver qué dato ingresar.
            </p>
            {newParcelFormError && (
              <p role="alert" className="p-2.5 rounded-xl bg-[var(--agro-danger-bg)] text-[11px] text-[var(--agro-danger-text)]">
                {newParcelFormError}
              </p>
            )}

            <div>
              <label htmlFor="drawn-parcel-name" className="block text-xs font-semibold text-[var(--agro-text)] mb-1">
                Nombre de la parcela
              </label>
              <input
                id="drawn-parcel-name"
                type="text"
                value={newParcelName}
                onChange={(e) => { setNewParcelName(e.target.value); clearNewParcelError('name'); }}
                onFocus={() => setFocusedNewParcelField('name')}
                onBlur={() => setFocusedNewParcelField(null)}
                maxLength={120}
                aria-invalid={Boolean(newParcelErrors.name)}
                aria-describedby={drawnParcelDescribedBy('name')}
                placeholder="Ej. Parcela Norte"
                className={`w-full h-11 px-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 ${newParcelErrors.name ? 'border-red-500' : 'border-[var(--agro-line)]'}`}
              />
              {drawnParcelFieldMessage('name')}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="drawn-parcel-crop" className="block text-xs font-semibold text-[var(--agro-text)] mb-1">Cultivo</label>
                <select
                  id="drawn-parcel-crop"
                  value={newParcelCrop}
                  onChange={(e) => { setNewParcelCrop(e.target.value); clearNewParcelError('crop'); }}
                  onFocus={() => setFocusedNewParcelField('crop')}
                  onBlur={() => setFocusedNewParcelField(null)}
                  aria-invalid={Boolean(newParcelErrors.crop)}
                  aria-describedby={drawnParcelDescribedBy('crop')}
                  className={`w-full h-11 px-2.5 rounded-xl border text-sm bg-[var(--agro-surface)] ${newParcelErrors.crop ? 'border-red-500' : 'border-[var(--agro-line)]'}`}
                >
                  <option value="" disabled>Selecciona</option>
                  {DRAWN_PARCEL_CROPS.map((value) => <option key={value} value={value}>{value}</option>)}

                </select>
                {drawnParcelFieldMessage('crop')}
              </div>
              <div>
                <label htmlFor="drawn-parcel-location" className="block text-xs font-semibold text-[var(--agro-text)] mb-1">Zona</label>
                <input
                  id="drawn-parcel-location"
                  type="text"
                  value={newParcelLocation}
                  onChange={(e) => { setNewParcelLocation(e.target.value); clearNewParcelError('location'); }}
                  onFocus={() => setFocusedNewParcelField('location')}
                  onBlur={() => setFocusedNewParcelField(null)}
                  maxLength={120}
                  aria-invalid={Boolean(newParcelErrors.location)}
                  aria-describedby={drawnParcelDescribedBy('location')}
                  placeholder="Ej. Viacha, La Paz"
                  className={`w-full h-11 px-3 rounded-xl border text-sm ${newParcelErrors.location ? 'border-red-500' : 'border-[var(--agro-line)]'}`}
                />
                {drawnParcelFieldMessage('location')}
              </div>
            </div>

            <div className="text-[11px] text-[var(--agro-muted)] bg-[var(--agro-surface-soft)] rounded-xl p-2.5 max-h-24 overflow-y-auto font-mono">
              Coordenadas ({pendingScan.points.length} vértices):{' '}
              {pendingScan.points
                .map((p) => `[${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}]`)
                .join(', ')}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowSaveModal(false);
                  setPendingScan(null);
                }}
                className="flex-1 h-11 rounded-xl border border-[var(--agro-line)] text-xs font-semibold text-[var(--agro-text)]"
              >
                Seguir editando
              </button>
              <button
                type="submit"
                className="flex-1 h-11 rounded-xl agro-primary text-white text-xs font-semibold"
              >
                Guardar parcela
              </button>
            </div>
          </form>
        </div>
      )}

      <ParcelScanner
        open={scannerOpen}
        initialPolygon={scannerInitialPolygon}
        initialCenter={{ lat: mapCenter[0], lng: mapCenter[1] }}
        onClose={() => setScannerOpen(false)}
        onConfirm={handleScanConfirm}
      />

      {/* Edit or Register Modal from Map */}
      <ParcelFormModal
        open={parcelFormOpen}
        initialParcel={editingParcel}
        onClose={() => setParcelFormOpen(false)}
        onSave={(saved) => {
          if (editingParcel) {
            onUpdateParcel(saved);
          } else {
            onCreateParcel(saved);
          }
        }}
      />
    </div>
  );
}
