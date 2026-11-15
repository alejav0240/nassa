import { Calendar, Plus, RefreshCw, Sprout } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { historyService } from '../../services/historyService';
import { backendApi } from '../../services/apiClient';
import { CropHistoryRecord, Parcel } from '../../types/agroshift';

interface HistoryRotationTabProps {
  parcel: Parcel;
  allHistory: CropHistoryRecord[];
  onAddHistory: (record: CropHistoryRecord) => void;
}

export function HistoryRotationTab({
  parcel,
  allHistory,
  onAddHistory,
}: HistoryRotationTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [crop, setCrop] = useState('Haba');
  const [isFallow, setIsFallow] = useState(false);
  const [season, setSeason] = useState('2026–2027');
  const [plantingDate, setPlantingDate] = useState('2026-09-10');
  const [harvestDate, setHarvestDate] = useState('2027-03-20');
  const [observations, setObservations] = useState('');
  const [campaignSync, setCampaignSync] = useState<'idle' | 'loading' | 'saved' | 'error'>('idle');

  const parcelHistory = useMemo(
    () => allHistory.filter((h) => h.parcelId === parcel.id),
    [allHistory, parcel.id]
  );

  useEffect(() => {
    if (!parcel.backendId) return;
    let active = true;
    setCampaignSync('loading');
    void backendApi.listCampaigns(parcel.backendId).then((campaigns) => {
      if (!active) return;
      campaigns.forEach((campaign) => onAddHistory({
        id: `backend-campaign-${campaign.id}`,
        parcelId: parcel.id,
        season: `${campaign.start_date.slice(0, 4)}–${campaign.end_date.slice(0, 4)}`,
        crop: campaign.crop,
        isFallow: false,
        plantingDate: campaign.start_date,
        harvestDate: campaign.end_date,
        observations: campaign.notes || 'Campaña sincronizada desde el backend.',
        avgNdvi: null,
        totalPrecipitationMm: null,
        avgTempC: null,
        avgMoisturePct: null,
      }));
      setCampaignSync('saved');
    }).catch(() => {
      if (active) setCampaignSync('error');
    });
    return () => { active = false; };
  }, [parcel.backendId, parcel.id, onAddHistory]);

  const scenarios = useMemo(() => historyService.getRotationScenarios(), []);
  const [selectedScenarioId, setSelectedScenarioId] = useState(scenarios[0].id);
  const activeScenario = scenarios.find((s) => s.id === selectedScenarioId) ?? scenarios[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
      const record: CropHistoryRecord = {
      id: `hist-${Date.now()}`,
      parcelId: parcel.id,
      season: season.trim() || '2026–2027',
      crop: isFallow ? 'Descanso / Barbecho (sin cultivo)' : crop.trim() || 'Papa',
      isFallow,
      plantingDate,
      harvestDate,
      observations: observations.trim() || 'Registro demostrativo de campaña.',
        avgNdvi: null,
        totalPrecipitationMm: null,
        avgTempC: null,
        avgMoisturePct: null,
      };
      onAddHistory(record);
      if (parcel.backendId) {
        const normalizedCrop = crop.trim().toLowerCase();
        const backendCrop = normalizedCrop === 'quinua' ? 'quinua' : normalizedCrop === 'haba' ? 'haba' : normalizedCrop === 'cebada' ? 'cebada' : normalizedCrop === 'avena' ? 'avena' : normalizedCrop === 'tarwi' ? 'tarwi' : 'papa';
        setCampaignSync('loading');
        void backendApi.createCampaign(parcel.backendId, {
          crop: backendCrop,
          start_date: plantingDate,
          end_date: harvestDate,
          notes: `${isFallow ? 'Descanso / barbecho' : ''} ${observations.trim()}`.trim(),
        }).then(() => setCampaignSync('saved')).catch(() => setCampaignSync('error'));
      }
    setObservations('');
    setShowForm(false);
  };

  return (
    <div className="space-y-5">
      {/* Header & Register Button */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-[var(--agro-text)]">Historial y rotación</h2>
          <p className="text-xs text-[var(--agro-muted)]">
            Ciclos registrados para {parcel.name}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="min-h-[40px] px-3.5 rounded-xl agro-primary text-white text-xs font-semibold flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Registrar ciclo
        </button>
      </div>

      {campaignSync !== 'idle' && (
        <p role={campaignSync === 'error' ? 'alert' : 'status'} className={`text-[11px] rounded-xl px-3 py-2 ${campaignSync === 'error' ? 'bg-[var(--agro-danger-bg)] text-[var(--agro-danger-text)]' : 'bg-[var(--agro-surface-soft)] text-[var(--agro-muted)]'}`}>
          {campaignSync === 'loading' && 'Sincronizando campañas con el backend…'}
          {campaignSync === 'saved' && 'Historial sincronizado. Las métricas no disponibles se muestran como N/D.'}
          {campaignSync === 'error' && 'No se pudo sincronizar el historial. El registro local conserva el cambio y permite reintentar.'}
        </p>
      )}

      {/* Add History Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-[var(--agro-surface)] rounded-2xl p-4 border border-emerald-200 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--agro-text)]">Nuevo registro agrícola</h3>
            <label className="flex items-center gap-2 text-xs font-medium text-[var(--agro-text)] cursor-pointer">
              <input
                type="checkbox"
                checked={isFallow}
                onChange={(e) => setIsFallow(e.target.checked)}
                className="rounded border-[var(--agro-line)] text-[var(--agro-success-text)]"
              />
              Período sin cultivo (descanso)
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--agro-muted)] mb-1">
                {isFallow ? 'Etiqueta de descanso' : 'Cultivo'}
              </label>
              <input
                type="text"
                disabled={isFallow}
                value={isFallow ? 'Descanso / Barbecho' : crop}
                onChange={(e) => setCrop(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[var(--agro-line)] text-xs disabled:bg-[var(--agro-surface-soft)]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[var(--agro-muted)] mb-1">
                Temporada agrícola
              </label>
              <input
                type="text"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                placeholder="2025–2026"
                className="w-full h-10 px-3 rounded-xl border border-[var(--agro-line)] text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--agro-muted)] mb-1">
                Inicio / Siembra
              </label>
              <input
                type="date"
                value={plantingDate}
                onChange={(e) => setPlantingDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[var(--agro-line)] text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[var(--agro-muted)] mb-1">
                Fin / Cosecha
              </label>
              <input
                type="date"
                value={harvestDate}
                onChange={(e) => setHarvestDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[var(--agro-line)] text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[var(--agro-muted)] mb-1">
              Observaciones
            </label>
            <textarea
              rows={2}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Notas sobre manejo, cobertura, lluvias o estado del suelo..."
              className="w-full p-2.5 rounded-xl border border-[var(--agro-line)] text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 h-10 rounded-xl border border-[var(--agro-line)] text-xs font-semibold text-[var(--agro-text)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 h-10 rounded-xl agro-primary text-white text-xs font-semibold"
            >
              Guardar en historial
            </button>
          </div>
        </form>
      )}

      {/* Visual Timeline */}
      <section className="bg-[var(--agro-surface)] rounded-2xl p-4 border border-[var(--agro-line)]/90 space-y-3">
        <h3 className="text-sm font-bold text-[var(--agro-text)]">Línea de tiempo de cultivos</h3>
        {parcelHistory.length === 0 ? (
          <p className="text-xs text-[var(--agro-muted)] py-3">
            No hay registros históricos todavía para esta parcela. Registra el primer ciclo arriba.
          </p>
        ) : (
          <div className="relative pl-5 space-y-4 before:content-[''] before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--agro-canvas)]">
            {parcelHistory.map((item) => (
              <div key={item.id} className="relative">
                <div
                  className={`absolute -left-5 top-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                    item.isFallow ? 'bg-amber-400' : 'agro-primary'
                  }`}
                />
                <div className="bg-[var(--agro-surface-soft)] rounded-xl p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[var(--agro-text)] flex items-center gap-1.5">
                      <Sprout className="w-3.5 h-3.5 text-[var(--agro-lime)]" />
                      {item.crop}
                    </span>
                    <span className="text-xs font-mono font-semibold text-[var(--agro-muted)]">
                      {item.season}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--agro-muted)] flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {item.plantingDate} → {item.harvestDate}
                  </p>
                  <p className="text-xs text-[var(--agro-text)]">{item.observations}</p>
                  <div className="pt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-mono text-[var(--agro-muted)] tabular-nums">
                    <span>NDVI prom: {item.avgNdvi ?? 'N/D'}</span>
                    <span>Lluvia: {item.totalPrecipitationMm == null ? 'N/D' : `${item.totalPrecipitationMm} mm`}</span>
                    <span>Temp: {item.avgTempC == null ? 'N/D' : `${item.avgTempC} °C`}</span>
                    <span>Humedad: {item.avgMoisturePct == null ? 'N/D' : `${item.avgMoisturePct} %`}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Season Comparison Chart */}
      {parcelHistory.length > 0 && (
        <section className="bg-[var(--agro-surface)] rounded-2xl p-4 border border-[var(--agro-line)]/90 space-y-2.5">
          <h3 className="text-sm font-bold text-[var(--agro-text)]">
            Comparación entre temporadas (valores demostrativos)
          </h3>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...parcelHistory].reverse()} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="season" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis yAxisId="ndvi" domain={[0, 1]} tick={{ fontSize: 10, fill: '#166534' }} />
                <YAxis yAxisId="rain" orientation="right" tick={{ fontSize: 10, fill: '#0284C7' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                <Bar yAxisId="ndvi" dataKey="avgNdvi" name="NDVI promedio" fill="#16A34A" radius={[4, 4, 0, 0]} />
                <Bar
                  yAxisId="rain"
                  dataKey="totalPrecipitationMm"
                  name="Precipitación acum. (mm)"
                  fill="#0284C7"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Crop Rotation Exploration */}
      <section className="bg-[var(--agro-surface)] rounded-2xl p-4 border border-[var(--agro-line)]/90 space-y-3">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-[var(--agro-lime)]" />
          <h3 className="text-sm font-bold text-[var(--agro-text)]">Exploración de rotación agrícola</h3>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {scenarios.map((sc) => (
            <button
              key={sc.id}
              type="button"
              onClick={() => setSelectedScenarioId(sc.id)}
              className={`min-h-[38px] px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedScenarioId === sc.id
                  ? 'bg-[#166534] text-white'
                  : 'bg-[var(--agro-surface-soft)] text-[var(--agro-text)] hover:bg-[var(--agro-canvas)]'
              }`}
            >
              {sc.title.split(':')[0]}
            </button>
          ))}
        </div>

        <div className="bg-[var(--agro-surface-soft)] rounded-xl p-3.5 space-y-2.5">
          <p className="text-xs font-bold text-[var(--agro-text)]">{activeScenario.title}</p>
          <p className="text-[11px] text-[var(--agro-muted)]">{activeScenario.targetRegion}</p>

          <div className="flex items-center gap-1.5 flex-wrap py-1">
            {activeScenario.sequence.map((step, idx) => (
              <React.Fragment key={step}>
                <span className="px-2.5 py-1 rounded-lg bg-[var(--agro-surface)] border border-[var(--agro-line)] text-xs font-semibold text-[var(--agro-text)]">
                  {idx + 1}. {step}
                </span>
                {idx < activeScenario.sequence.length - 1 && (
                  <span className="text-[var(--agro-muted)] text-xs">→</span>
                )}
              </React.Fragment>
            ))}
          </div>

          <p className="text-xs text-[var(--agro-text)] leading-relaxed">{activeScenario.summary}</p>
          <div className="text-[11px] text-[var(--agro-muted)] space-y-1">
            <p>
              <strong>Balance hídrico referencial:</strong> {activeScenario.waterNote}
            </p>
            <p>
              <strong>Cobertura y suelo:</strong> {activeScenario.soilNote}
            </p>
          </div>
          <p className="text-[11px] font-medium text-[var(--agro-warning-text)] bg-[var(--agro-warning-bg)] p-2.5 rounded-lg">
            {activeScenario.caveat}
          </p>
        </div>
      </section>
    </div>
  );
}
