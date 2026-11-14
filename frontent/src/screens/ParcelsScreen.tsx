import {
  BarChart3,
  Check,
  Edit3,
  Eye,
  MapPin,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ParcelFormModal } from '../components/ParcelFormModal';
import { AnalysisSubTab, NavTab, Parcel } from '../types/agroterra';

interface ParcelsScreenProps {
  parcels: Parcel[];
  selectedParcelId: string;
  onSelectParcel: (id: string) => void;
  onOpenParcelDetail: (id: string) => void;
  onCreateParcel: (parcel: Parcel) => void;
  onUpdateParcel: (parcel: Parcel) => void;
  onDeleteParcel: (id: string) => void;
  onNavigate: (tab: NavTab, subTab?: AnalysisSubTab) => void;
}

export function ParcelsScreen({
  parcels,
  selectedParcelId,
  onSelectParcel,
  onOpenParcelDetail,
  onCreateParcel,
  onUpdateParcel,
  onDeleteParcel,
  onNavigate,
}: ParcelsScreenProps) {
  const [search, setSearch] = useState('');
  const [cropFilter, setCropFilter] = useState('Todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingParcel, setEditingParcel] = useState<Parcel | null>(null);
  const [deletingParcel, setDeletingParcel] = useState<Parcel | null>(null);

  const crops = useMemo(() => {
    const unique = Array.from(new Set(parcels.map((p) => p.crop)));
    return ['Todos', ...unique];
  }, [parcels]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return parcels.filter((p) => {
      const matchesCrop = cropFilter === 'Todos' || p.crop === cropFilter;
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.crop.toLowerCase().includes(q);
      return matchesCrop && matchesSearch;
    });
  }, [parcels, cropFilter, search]);

  return (
    <div className="p-4 lg:p-0 space-y-4 pb-8">
      {/* Screen Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--agro-text)]">Mis parcelas</h1>
          <p className="text-xs text-[var(--agro-muted)]">
            {parcels.length} parcelas registradas · Almacenamiento local
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingParcel(null);
            setModalOpen(true);
          }}
          className="min-h-[44px] px-4 rounded-xl agro-primary hover:bg-[#166534] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          Registrar parcela
        </button>
      </div>

      {/* Search & Crop Filter */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--agro-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, cultivo o ubicación..."
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-[var(--agro-surface)] border border-[var(--agro-line)] text-sm text-[var(--agro-text)] placeholder:text-[var(--agro-muted)] focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {crops.map((crop) => (
            <button
              key={crop}
              type="button"
              onClick={() => setCropFilter(crop)}
              className={`min-h-[36px] px-3.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                cropFilter === crop
                  ? 'bg-[#166534] text-white'
                  : 'bg-[var(--agro-surface)] border border-[var(--agro-line)] text-[var(--agro-muted)] hover:bg-[var(--agro-surface-soft)]'
              }`}
            >
              {crop}
            </button>
          ))}
        </div>
      </div>

      {/* Parcel Cards Grid */}
      {filtered.length === 0 ? (
        <div className="bg-[var(--agro-surface)] rounded-2xl p-8 border border-[var(--agro-line)] text-center space-y-2">
          <p className="text-sm font-semibold text-[var(--agro-text)]">
            No se encontraron parcelas con esos criterios
          </p>
          <p className="text-xs text-[var(--agro-muted)]">
            Ajusta el filtro o registra una nueva parcela agrícola.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filtered.map((parcel) => {
            const isActive = parcel.id === selectedParcelId;
            return (
              <article
                key={parcel.id}
                className={`bg-[var(--agro-surface)] rounded-2xl p-4 border transition-shadow space-y-3.5 ${
                  isActive ? 'border-[#16A34A] shadow-sm' : 'border-[var(--agro-line)]/90'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-[var(--agro-selected)] shrink-0 flex items-center justify-center">
                    {parcel.imageUrl ? (
                      <img
                        src={parcel.imageUrl}
                        alt={parcel.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <MapPin className="w-6 h-6 text-[var(--agro-lime)]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-base font-bold text-[var(--agro-text)] truncate">{parcel.name}</h2>
                      <span
                        className={`text-xs font-semibold whitespace-nowrap ${
                          parcel.monitoringStatus === 'Disponible'
                            ? 'text-[var(--agro-lime)]'
                            : parcel.monitoringStatus === 'Parcial'
                            ? 'text-[var(--agro-warning-text)]'
                            : 'text-[var(--agro-info-text)]'
                        }`}
                      >
                        {parcel.monitoringStatus}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--agro-muted)] truncate mt-0.5">
                      {parcel.department} · {parcel.location}
                    </p>
                    <p className="text-xs text-[var(--agro-text)] mt-1.5 font-mono tabular-nums">
                      {parcel.areaHa.toFixed(2)} ha · Cultivo: <span className="font-sans font-semibold">{parcel.crop}</span>
                    </p>
                    <p className="text-[11px] text-[var(--agro-muted)] mt-0.5">
                      Registro: {parcel.registeredAt} · Siembra: {parcel.plantingDate}
                    </p>
                  </div>
                </div>

                {/* Action Row */}
                <div className="pt-2.5 border-t border-[var(--agro-line)] flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectParcel(parcel.id)}
                    className={`min-h-[38px] px-3 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors ${
                      isActive
                        ? 'bg-[var(--agro-selected)] text-[var(--agro-lime)]'
                        : 'bg-[var(--agro-surface-soft)] text-[var(--agro-text)] hover:bg-[var(--agro-canvas)]'
                    }`}
                  >
                    {isActive && <Check className="w-3.5 h-3.5" />}
                    {isActive ? 'Activa' : 'Seleccionar'}
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenParcelDetail(parcel.id)}
                    className="min-h-[38px] px-3 rounded-xl bg-[var(--agro-surface-soft)] hover:bg-[var(--agro-canvas)] text-[var(--agro-text)] text-xs font-semibold flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Detalles
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectParcel(parcel.id);
                      onNavigate('analisis', 'satelital');
                    }}
                    className="min-h-[38px] px-3 rounded-xl bg-[var(--agro-surface-soft)] hover:bg-[var(--agro-canvas)] text-[var(--agro-text)] text-xs font-semibold flex items-center gap-1"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    Análisis
                  </button>

                  <div className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingParcel(parcel);
                        setModalOpen(true);
                      }}
                      aria-label={`Editar ${parcel.name}`}
                      className="min-h-[38px] min-w-[38px] rounded-xl text-[var(--agro-muted)] hover:bg-[var(--agro-surface-soft)] flex items-center justify-center"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingParcel(parcel)}
                      aria-label={`Eliminar ${parcel.name}`}
                      className="min-h-[38px] min-w-[38px] rounded-xl text-[var(--agro-muted)] hover:text-[var(--agro-danger-text)] hover:bg-[var(--agro-danger-bg)] flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ParcelFormModal
        open={modalOpen}
        initialParcel={editingParcel}
        onClose={() => setModalOpen(false)}
        onSave={(saved) => {
          if (editingParcel) {
            onUpdateParcel(saved);
          } else {
            onCreateParcel(saved);
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(deletingParcel)}
        title="Eliminar parcela"
        message={
          deletingParcel
            ? `¿Deseas eliminar "${deletingParcel.name}" (${deletingParcel.areaHa} ha)? Esta acción solo afecta el almacenamiento local del prototipo.`
            : ''
        }
        onCancel={() => setDeletingParcel(null)}
        onConfirm={() => {
          if (deletingParcel) {
            onDeleteParcel(deletingParcel.id);
          }
          setDeletingParcel(null);
        }}
      />
    </div>
  );
}
