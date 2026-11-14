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
          <h1 className="text-xl font-bold text-slate-900">Mis parcelas</h1>
          <p className="text-xs text-slate-500">
            {parcels.length} parcelas registradas · Almacenamiento local
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingParcel(null);
            setModalOpen(true);
          }}
          className="min-h-[44px] px-4 rounded-xl bg-[#16A34A] hover:bg-[#166534] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          Registrar parcela
        </button>
      </div>

      {/* Search & Crop Filter */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, cultivo o ubicación..."
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
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
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {crop}
            </button>
          ))}
        </div>
      </div>

      {/* Parcel Cards Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-2">
          <p className="text-sm font-semibold text-slate-800">
            No se encontraron parcelas con esos criterios
          </p>
          <p className="text-xs text-slate-500">
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
                className={`bg-white rounded-2xl p-4 border transition-shadow space-y-3.5 ${
                  isActive ? 'border-[#16A34A] shadow-sm' : 'border-slate-200/90'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-emerald-50 shrink-0 flex items-center justify-center">
                    {parcel.imageUrl ? (
                      <img
                        src={parcel.imageUrl}
                        alt={parcel.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <MapPin className="w-6 h-6 text-[#166534]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-base font-bold text-slate-900 truncate">{parcel.name}</h2>
                      <span
                        className={`text-xs font-semibold whitespace-nowrap ${
                          parcel.monitoringStatus === 'Disponible'
                            ? 'text-[#166534]'
                            : parcel.monitoringStatus === 'Parcial'
                            ? 'text-[#B45309]'
                            : 'text-[#0284C7]'
                        }`}
                      >
                        {parcel.monitoringStatus}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {parcel.department} · {parcel.location}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="text-xs text-slate-700 font-mono tabular-nums">
                        {formatAreaHa(getParcelAreaHa(parcel))}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          parcel.measurement
                            ? 'bg-[#DCFCE7] text-[#166534]'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {parcel.measurement ? 'Medida' : 'Declarada'}
                      </span>
                      <span className="text-xs text-slate-700">
                        · Cultivo:{' '}
                        <span className="font-semibold">{parcel.crop}</span>
                      </span>
                    </div>
                    {parcel.measurement && (
                      <p className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                        Perímetro {formatPerimeter(parcel.measurement.perimeterM)} ·{' '}
                        {parcel.measurement.vertexCount} vértices
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Registro: {parcel.registeredAt} · Siembra: {parcel.plantingDate}
                    </p>
                  </div>
                </div>

                {/* Action Row */}
                <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectParcel(parcel.id)}
                    className={`min-h-[38px] px-3 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors ${
                      isActive
                        ? 'bg-[#DCFCE7] text-[#166534]'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isActive && <Check className="w-3.5 h-3.5" />}
                    {isActive ? 'Activa' : 'Seleccionar'}
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenParcelDetail(parcel.id)}
                    className="min-h-[38px] px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1"
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
                    className="min-h-[38px] px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1"
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
                      className="min-h-[38px] min-w-[38px] rounded-xl text-slate-600 hover:bg-slate-100 flex items-center justify-center"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingParcel(parcel)}
                      aria-label={`Eliminar ${parcel.name}`}
                      className="min-h-[38px] min-w-[38px] rounded-xl text-slate-500 hover:text-[#EF4444] hover:bg-red-50 flex items-center justify-center"
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
            ? `¿Deseas eliminar "${deletingParcel.name}" (${formatAreaHa(
                getParcelAreaHa(deletingParcel)
              )})? Esta acción solo afecta el almacenamiento local del prototipo.`
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
