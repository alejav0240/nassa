import {
  Activity, ArrowUpRight, BarChart3, CalendarDays, Check, ChevronDown,
  ChevronRight, Edit3, Eye, MapPin, Plus, Ruler, Search, Sprout, Trash2, X,
  WifiOff,
} from 'lucide-react';
import { useMemo, useState, type PointerEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ParcelFormModal } from '../components/ParcelFormModal';
import { SyncStatusBanner } from '../components/SyncStatusBanner';
import { AmbientIntelligenceBackground } from '../components/AmbientIntelligenceBackground';
import { getBackendCropId } from '../services/parcelService';
import { AnalysisSubTab, NavTab, Parcel, SyncStatus } from '../types/agroshift';
import {
  formatAreaHa,
  formatPerimeter,
  getParcelAreaHa,
} from '../utils/parcelGeometry';

interface ParcelsScreenProps {
  parcels: Parcel[];
  selectedParcelId: string;
  onSelectParcel: (id: string) => void;
  onOpenParcelDetail: (id: string) => void;
  onCreateParcel: (parcel: Parcel) => void;
  onUpdateParcel: (parcel: Parcel) => void;
  onDeleteParcel: (id: string) => void;
  onSyncParcel: (parcel: Parcel) => void;
  syncStatus: SyncStatus;
  onNavigate: (tab: NavTab, subTab?: AnalysisSubTab) => void;
}

function ParcelCover({ parcel }: { parcel: Parcel }) {
  return (
    <div className="parcel-cover">
      {parcel.imageUrl ? (
        <img src={parcel.imageUrl} alt={`Imagen asociada a ${parcel.name}`} referrerPolicy="no-referrer" />
      ) : (
        <div className="parcel-cover-illustration" role="img" aria-label={`Ilustración abstracta de referencia para ${parcel.name}; no hay imagen disponible`}>
          <svg viewBox="0 0 600 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <path d="M-30 70C90 8 139 132 249 77S417 10 632 86" />
            <path d="M-33 97C88 34 146 160 260 105S420 38 638 115" />
            <path d="M-37 127C82 66 155 188 272 136S426 71 644 146" />
            <path d="M-42 161C77 102 165 218 284 170S431 107 650 181" />
            <path d="M-25 231c94-75 173-65 248-7s149 93 230 18 121-95 198-35" />
            <path d="M-26 254c99-75 174-60 243-2s152 90 239 17 124-87 202-28" />
          </svg>
          <span><MapPin size={16} /> Sin imagen asociada</span>
          <small>Ilustración abstracta</small>
        </div>
      )}
      <div className="parcel-cover-shade" />
      <span className={`parcel-status-chip parcel-status-chip--${parcel.monitoringStatus === 'Disponible' ? 'available' : parcel.monitoringStatus === 'Parcial' ? 'partial' : 'other'}`}>
        <i aria-hidden="true" />{parcel.monitoringStatus}
      </span>
      {parcel.id === '' ? null : <span className="parcel-cover-crop"><Sprout size={13} /> {parcel.crop}</span>}
    </div>
  );
}

function getParcelGeoJsonPreview(parcel: Parcel) {
  const coordinates = parcel.polygon.map((point) => [point.lng, point.lat]);
  const first = coordinates[0];
  const last = coordinates.at(-1);
  const ring = first && last && first[0] === last[0] && first[1] === last[1]
    ? coordinates
    : [...coordinates, first];
  return ring.length >= 4 ? { type: 'Polygon', coordinates: [ring] } : null;
}

export function ParcelsScreen({
  parcels,
  selectedParcelId,
  onSelectParcel,
  onOpenParcelDetail,
  onCreateParcel,
  onUpdateParcel,
  onDeleteParcel,
  onSyncParcel,
  syncStatus,
  onNavigate,
}: ParcelsScreenProps) {
  const reducedMotion = useReducedMotion();
  const [search, setSearch] = useState('');
  const [cropFilter, setCropFilter] = useState('Todos');
  const [expandedParcelId, setExpandedParcelId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingParcel, setEditingParcel] = useState<Parcel | null>(null);
  const [deletingParcel, setDeletingParcel] = useState<Parcel | null>(null);
  const [syncingParcel, setSyncingParcel] = useState<Parcel | null>(null);

  const crops = useMemo(() => ['Todos', ...Array.from(new Set(parcels.map((parcel) => parcel.crop)))], [parcels]);
  const cropCounts = useMemo(() => parcels.reduce<Record<string, number>>((counts, parcel) => {
    counts[parcel.crop] = (counts[parcel.crop] ?? 0) + 1;
    return counts;
  }, {}), [parcels]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return parcels.filter((parcel) => {
      const matchesCrop = cropFilter === 'Todos' || parcel.crop === cropFilter;
      const matchesSearch = !query || parcel.name.toLowerCase().includes(query) || parcel.location.toLowerCase().includes(query) || parcel.crop.toLowerCase().includes(query);
      return matchesCrop && matchesSearch;
    });
  }, [parcels, cropFilter, search]);

  const openCreate = () => {
    setEditingParcel(null);
    setModalOpen(true);
  };

  const resetFilters = () => {
    setSearch('');
    setCropFilter('Todos');
  };

  const handleCardPointer = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--parcel-pointer-x', `${((event.clientX - bounds.left) / bounds.width) * 100}%`);
    event.currentTarget.style.setProperty('--parcel-pointer-y', `${((event.clientY - bounds.top) / bounds.height) * 100}%`);
  };

  return (
    <div className="parcels-screen">
      <AmbientIntelligenceBackground variant="parcels" />
      <motion.header className="parcels-header" initial={reducedMotion ? false : { opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.36, ease: 'easeOut' }}>
        <div className="parcels-header-copy">
          <div className="parcels-eyebrow"><Activity size={13} /> AGROSHIFT AI <span /> PORTAFOLIO DE CAMPO</div>
          <h1>Mis parcelas<span>.</span></h1>
          <p>Un espacio de trabajo para explorar y administrar tus terrenos.</p>
          <div className="parcels-header-meta"><span><i /> {parcels.length} {parcels.length === 1 ? 'parcela registrada' : 'parcelas registradas'}</span><span>{new Set(parcels.map((parcel) => parcel.crop)).size} cultivos</span></div>
          <p role="status" className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--agro-muted)]"><WifiOff size={13} aria-hidden="true" />Almacenamiento local · disponible sin conexión</p>
        </div>
        <button type="button" onClick={openCreate} className="parcels-create-button"><Plus size={17} strokeWidth={2.4} /><span>Registrar parcela</span><ArrowUpRight className="parcels-create-arrow" size={16} /></button>
        <div className="parcels-header-grid" aria-hidden="true" />
      </motion.header>

      <section className="parcel-workspace" aria-label="Explorador de parcelas">
        <SyncStatusBanner status={syncStatus} />
        <div className="parcel-toolbar">
          <div className="parcel-search-wrap"><Search size={17} aria-hidden="true" /><label className="sr-only" htmlFor="parcel-search">Buscar parcelas por nombre, cultivo o ubicación</label><input id="parcel-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nombre, cultivo o ubicación" />{search && <button type="button" onClick={() => setSearch('')} aria-label="Limpiar búsqueda" className="parcel-search-clear"><X size={15} /></button>}</div>
          <div className="parcel-results-count" role="status"><strong>{filtered.length}</strong><span>de {parcels.length} parcelas</span></div>
        </div>

        <div className="parcel-filter-rail" role="group" aria-label="Filtrar por cultivo">
          {crops.map((crop) => {
            const active = cropFilter === crop;
            const count = crop === 'Todos' ? parcels.length : cropCounts[crop] ?? 0;
            return <button key={crop} type="button" aria-pressed={active} onClick={() => setCropFilter(crop)} className={`parcel-filter-chip ${active ? 'is-active' : ''}`}>
              <span>{crop}</span><small>{count}</small>{active && <motion.i layoutId={reducedMotion ? undefined : 'parcel-filter-indicator'} transition={{ type: 'spring', stiffness: 500, damping: 36 }} aria-hidden="true" />}
            </button>;
          })}
        </div>

        <div className="parcel-grid">
          <AnimatePresence mode="popLayout" initial={false}>
            {filtered.map((parcel, index) => {
              const isActive = parcel.id === selectedParcelId;
              const isExpanded = expandedParcelId === parcel.id;
              return (
                <motion.article
                  key={parcel.id}
                  layout={!reducedMotion}
                  initial={reducedMotion ? false : { opacity: 0, y: 22, scale: 0.975 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reducedMotion ? undefined : { opacity: 0, y: 12, scale: 0.975 }}
                  transition={{ duration: reducedMotion ? 0 : 0.34, delay: reducedMotion ? 0 : Math.min(index * 0.055, 0.22), ease: [0.22, 1, 0.36, 1], layout: { duration: 0.26 } }}
                  whileHover={reducedMotion ? undefined : { y: -5, rotateX: 1.4, rotateY: -0.8, scale: 1.006 }}
                  onPointerMove={handleCardPointer}
                  className={`parcel-card ${isActive ? 'is-selected' : ''}`}
                >
                  <ParcelCover parcel={parcel} />
                  <div className="parcel-card-content">
                    <div className="parcel-card-heading">
                      <div className="min-w-0"><p className="parcel-card-kicker">{parcel.department}</p><h2 title={parcel.name}>{parcel.name}</h2></div>
                      {isActive && <motion.span className="parcel-active-tag" initial={reducedMotion ? false : { opacity: 0, scale: 0.82 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: reducedMotion ? 0 : 0.2 }}><Check size={12} /> ACTIVA</motion.span>}
                    </div>
                    <p className="parcel-card-location"><MapPin size={14} /> <span>{parcel.location}</span></p>
                    <div className="parcel-card-facts">
                      <div><small>SUPERFICIE</small><strong>{formatAreaHa(getParcelAreaHa(parcel))}</strong></div>
                      <span className={`parcel-measurement-tag ${parcel.measurement ? 'is-measured' : ''}`}>{parcel.measurement ? <><Ruler size={12} /> Medida</> : 'Declarada'}</span>
                      <div className="parcel-card-crop"><small>CULTIVO</small><strong>{parcel.crop}</strong></div>
                    </div>

                    <button type="button" className="parcel-expand-button" aria-expanded={isExpanded} aria-controls={`parcel-context-${parcel.id}`} onClick={() => setExpandedParcelId(isExpanded ? null : parcel.id)}>
                      <span>{isExpanded ? 'Ocultar información' : 'Información de parcela'}</span><ChevronDown size={15} className={isExpanded ? 'is-expanded' : ''} />
                    </button>
                    <AnimatePresence initial={false}>
                      {isExpanded && <motion.div id={`parcel-context-${parcel.id}`} className="parcel-context-panel" initial={reducedMotion ? false : { height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={reducedMotion ? undefined : { height: 0, opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.24, ease: 'easeOut' }}>
                        <div className="parcel-context-grid">
                          <div><CalendarDays size={13} /><span><small>REGISTRADA</small><strong>{parcel.registeredAt}</strong></span></div>
                          <div><Sprout size={13} /><span><small>SIEMBRA</small><strong>{parcel.plantingDate}</strong></span></div>
                          <div><Activity size={13} /><span><small>ORIGEN</small><strong>{parcel.backendId ? 'Sincronizada' : 'Local / demostrativa'}</strong></span></div>
                          {parcel.measurement && <div><Ruler size={13} /><span><small>MEDICIÓN</small><strong>{formatPerimeter(parcel.measurement.perimeterM)} · {parcel.measurement.vertexCount} vértices</strong></span></div>}
                        </div>
                      </motion.div>}
                    </AnimatePresence>

                    <div className="parcel-card-actions">
                      <div className="parcel-primary-actions">
                        <motion.button type="button" aria-pressed={isActive} onClick={() => onSelectParcel(parcel.id)} className={`parcel-action-button parcel-action-button--select ${isActive ? 'is-active' : ''}`} whileTap={reducedMotion ? undefined : { scale: 0.96 }}>
                          {isActive ? <Check size={14} /> : <MapPin size={14} />}{isActive ? 'Activa' : 'Seleccionar'}
                        </motion.button>
                        <motion.button type="button" onClick={() => onOpenParcelDetail(parcel.id)} className="parcel-action-button" whileTap={reducedMotion ? undefined : { scale: 0.96 }}><Eye size={14} /> Detalles</motion.button>
                        <motion.button type="button" onClick={() => { onSelectParcel(parcel.id); onNavigate('analisis', 'satelital'); }} className="parcel-action-button parcel-action-button--analysis" whileTap={reducedMotion ? undefined : { scale: 0.96 }}><BarChart3 size={14} /> Análisis</motion.button>
                        <motion.button type="button" onClick={() => setSyncingParcel(parcel)} disabled={syncStatus === 'saving'} className="parcel-action-button" whileTap={reducedMotion ? undefined : { scale: 0.96 }}>{parcel.backendId ? 'Revisar sincronización' : 'Sincronizar backend'}</motion.button>
                      </div>
                      <div className="parcel-icon-actions">
                        <button type="button" onClick={() => { setEditingParcel(parcel); setModalOpen(true); }} aria-label={`Editar ${parcel.name}`} title="Editar parcela" className="parcel-icon-button"><Edit3 size={15} /></button>
                        <button type="button" onClick={() => setDeletingParcel(parcel)} aria-label={`Eliminar ${parcel.name}`} title="Eliminar parcela" className="parcel-icon-button parcel-icon-button--delete"><Trash2 size={15} /></button>
                      </div>
                    </div>
                  </div>
                </motion.article>
              );
            })}
            {filtered.length === 0 && <motion.div key="empty" className="parcel-empty-state" initial={reducedMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? undefined : { opacity: 0, y: 8 }} transition={{ duration: reducedMotion ? 0 : 0.22 }}>
              <div className="parcel-empty-icon"><Search size={20} /></div>
              <h2>{parcels.length === 0 ? 'Aún no hay parcelas registradas' : 'No encontramos parcelas con esos filtros'}</h2>
              <p>{parcels.length === 0 ? 'Registra tu primera parcela para tenerla disponible en tu espacio de trabajo.' : 'Prueba otro término de búsqueda o restablece los filtros.'}</p>
              {parcels.length === 0 ? <button type="button" className="parcel-action-button parcel-action-button--select" onClick={openCreate}><Plus size={15} /> Registrar parcela</button> : <button type="button" className="parcel-reset-button" onClick={resetFilters}>Restablecer búsqueda y filtros</button>}
            </motion.div>}
          </AnimatePresence>
        </div>
      </section>

      <ParcelFormModal open={modalOpen} initialParcel={editingParcel} onClose={() => setModalOpen(false)} onSave={(saved) => { if (editingParcel) onUpdateParcel(saved); else onCreateParcel(saved); }} />

      <ConfirmDialog
        open={Boolean(deletingParcel)}
        title="Eliminar parcela"
        message={deletingParcel ? `¿Deseas eliminar "${deletingParcel.name}" (${formatAreaHa(getParcelAreaHa(deletingParcel))})? Se quitará del almacenamiento local y se intentará sincronizar con el backend.` : ''}
        onCancel={() => setDeletingParcel(null)}
        onConfirm={() => { if (deletingParcel) onDeleteParcel(deletingParcel.id); setDeletingParcel(null); }}
      />
      <ConfirmDialog
        open={Boolean(syncingParcel)}
        title={syncingParcel?.backendId ? 'Actualizar parcela en backend' : 'Registrar parcela en backend'}
        message={syncingParcel ? `Se enviará la ficha de "${syncingParcel.name}". La geometría y los valores mostrados se enviarán tal como están guardados localmente.` : ''}
        confirmLabel={syncStatus === 'saving' ? 'Sincronizando…' : 'Confirmar sincronización'}
        tone="primary"
        confirmDisabled={Boolean(syncingParcel && !getBackendCropId(syncingParcel.crop)) || syncStatus === 'saving'}
        details={syncingParcel && <div className="space-y-2"><dl className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl border border-[var(--agro-line)] bg-[var(--agro-surface-soft)] p-3 text-xs text-[var(--agro-text)]"><dt>Referencia local</dt><dd className="break-all">{syncingParcel.id}</dd><dt>Superficie (ha)</dt><dd>{syncingParcel.areaHa}</dd><dt>Cultivo local</dt><dd>{syncingParcel.crop}</dd><dt>Cultivo API</dt><dd>{getBackendCropId(syncingParcel.crop) ?? 'No compatible'}</dd><dt>Centroide (lat, lon)</dt><dd>{syncingParcel.centroid.lat}, {syncingParcel.centroid.lng}</dd><dt>Textura API</dt><dd>{['arenosa', 'franca', 'arcillosa', 'desconocida'].includes(syncingParcel.indicators.soilTexture) ? syncingParcel.indicators.soilTexture : 'desconocida'}</dd><dt>Riego</dt><dd>No declarado (false)</dd><dt>pH enviado</dt><dd>{syncingParcel.indicators.soilPh > 0 ? syncingParcel.indicators.soilPh : 'null'}</dd><dt>Geometría</dt><dd>{getParcelGeoJsonPreview(syncingParcel) ? `Polygon · ${syncingParcel.polygon.length} vértices` : 'null · menos de 3 vértices'}</dd><dt>Operación</dt><dd>{syncingParcel.backendId ? 'Reemplazo completo (PUT)' : 'Registro idempotente (POST)'}</dd></dl>{getParcelGeoJsonPreview(syncingParcel) && <details className="rounded-xl border border-[var(--agro-line)] px-3 py-2 text-xs text-[var(--agro-text)]"><summary className="cursor-pointer font-semibold">Revisar coordenadas GeoJSON que se enviarán</summary><pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all text-[10px]">{JSON.stringify(getParcelGeoJsonPreview(syncingParcel), null, 2)}</pre></details>}{!getBackendCropId(syncingParcel.crop) && <p role="alert" className="text-xs text-[var(--agro-danger-text)]">El backend admite un solo cultivo por parcela y este valor contiene una mezcla o no está en el contrato. Edita el cultivo a uno compatible para sincronizar; los datos locales se conservarán.</p>}</div>}
        onCancel={() => setSyncingParcel(null)}
        onConfirm={() => { if (syncingParcel) onSyncParcel(syncingParcel); setSyncingParcel(null); }}
      />
    </div>
  );
}
