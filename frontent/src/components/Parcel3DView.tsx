import {
  CheckCircle2,
  Expand,
  Info,
  MapPin,
  Minus,
  Plus,
  RotateCcw,
  Sprout,
} from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { Parcel } from '../types/agroshift';
import { formatCoordinates } from '../utils/geo';
const TerrainScene = lazy(() => import('./TerrainScene').then((module) => ({ default: module.TerrainScene })));

interface Parcel3DViewProps {
  parcel: Parcel;
}

type CropKey = 'papa' | 'quinua' | 'haba' | 'cebada';
type WeatherKey = 'sun' | 'rain' | 'wind' | 'cloud' | 'snow';

const crops: Record<CropKey, { name: string; emoji: string; description: string; color: string }> = {
  papa: { name: 'Papa', emoji: '🥔', description: 'Hojas amplias y flores pequeñas.', color: '#73a94f' },
  quinua: { name: 'Quinua', emoji: '🌾', description: 'Panículas de grano en tallos ramificados.', color: '#b88b4a' },
  haba: { name: 'Haba', emoji: '🫘', description: 'Hojas ovaladas y vainas verdes.', color: '#4f8b4d' },
  cebada: { name: 'Cebada', emoji: '🌿', description: 'Espigas doradas con aristas.', color: '#c5a353' },
};

const weather: Record<WeatherKey, { label: string; icon: string }> = {
  sun: { label: 'Soleado', icon: '☀️' },
  rain: { label: 'Lluvia', icon: '🌧️' },
  wind: { label: 'Viento', icon: '💨' },
  cloud: { label: 'Nubes', icon: '☁️' },
  snow: { label: 'Nieve', icon: '❄️' },
};

const cropKey = (value: string): CropKey => (Object.hasOwn(crops, value) ? value as CropKey : 'papa');

export function Parcel3DView({ parcel }: Parcel3DViewProps) {
  const [crop, setCrop] = useState<CropKey>(() => cropKey(parcel.crop));
  const [climate, setClimate] = useState<WeatherKey>('rain');
  const [growth, setGrowth] = useState(65);
  const [wind, setWind] = useState(18);
  const [hour, setHour] = useState(14);
  const [layers, setLayers] = useState({ rain: true, clouds: true, soil: true, sway: true, snow: true });
  const [zoom, setZoom] = useState(1);
  const selectedCrop = crops[crop];
  const plantCount = Math.max(24, Math.round(parcel.areaHa * 65));
  const hourLabel = `${String(hour).padStart(2, '0')}:00`;

  const toggleLayer = (key: keyof typeof layers) => setLayers((current) => ({ ...current, [key]: !current[key] }));
  const reset = () => { setCrop(cropKey(parcel.crop)); setClimate('rain'); setGrowth(65); setWind(18); setHour(14); setLayers({ rain: true, clouds: true, soil: true, sway: true, snow: true }); setZoom(1); };

  return (
    <section className="terrain-shell rounded-3xl border border-[var(--agro-line)]/90 bg-[var(--agro-surface)] shadow-xs overflow-hidden" aria-label="Vista del terreno y simulación ambiental">
      <div className="p-4 lg:p-5 border-b border-[var(--agro-line)]/70 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-[10px] uppercase tracking-[.14em] font-extrabold text-[var(--agro-lime)]">Monitoreo y simulación</p><h2 className="text-lg font-bold text-[var(--agro-text)] mt-1">Gemelo digital de tu parcela 🌱</h2><p className="text-xs text-[var(--agro-muted)] mt-1">Explora el relieve, los surcos y una representación visual del cultivo.</p></div>
        <div className="flex gap-2"><button type="button" onClick={reset} className="min-h-[40px] px-3 rounded-xl border border-[var(--agro-line)] text-xs font-bold text-[var(--agro-muted)] inline-flex items-center gap-1.5"><RotateCcw className="w-3.5 h-3.5" />Restablecer</button><span className="rounded-full bg-[var(--agro-success-bg)] px-3 py-2 text-[10px] font-bold text-[var(--agro-success-text)]">SIMULACIÓN ACTIVA</span></div>
      </div>

      <div className="terrain-metrics" aria-label="Indicadores del escenario">
        <div className="terrain-metric"><span>Cultivo actual</span><strong>{selectedCrop.name} <small>{crop === 'papa' ? 'Solanum tuberosum' : selectedCrop.description}</small></strong><em>● {plantCount} plantas 3D ilustrativas</em></div>
        <div className="terrain-metric"><span>Desarrollo del cultivo</span><strong>{growth}<small>% simulado</small></strong><em>Etapa visual de crecimiento</em></div>
        <div className="terrain-metric"><span>Velocidad del viento</span><strong>{wind}<small> km/h</small></strong><em>Desplazamiento visual de plantas</em></div>
        <div className="terrain-metric"><span>Hora solar</span><strong>{hourLabel}<small> h</small></strong><em>Iluminación y sombras dinámicas</em></div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_290px] gap-4 p-4 lg:p-5">
        <div className="min-w-0">
          <div className="rounded-2xl border border-[var(--agro-line)] overflow-hidden relative bg-gradient-to-b from-[#b9d2d5] via-[#d9e6d9] to-[#a5c58d]">
            <Suspense fallback={<div className="h-[330px] sm:h-[515px] grid place-items-center text-xs text-[var(--agro-muted)]" role="status">Preparando escena 3D…</div>}><TerrainScene crop={crop} weather={climate} growth={growth} wind={wind} hour={hour} layers={layers} zoom={zoom} /></Suspense>
            <div className="absolute right-3 top-14 grid gap-1.5"><button type="button" onClick={() => setZoom((value) => Math.min(1.15, value + .05))} className="w-9 h-9 rounded-xl bg-white/90 text-[#42634e] shadow-sm grid place-items-center" aria-label="Acercar"><Plus className="w-4 h-4" /></button><button type="button" onClick={() => setZoom((value) => Math.max(.9, value - .05))} className="w-9 h-9 rounded-xl bg-white/90 text-[#42634e] shadow-sm grid place-items-center" aria-label="Alejar"><Minus className="w-4 h-4" /></button><button type="button" onClick={() => setZoom(1)} className="w-9 h-9 rounded-xl bg-white/90 text-[#42634e] shadow-sm grid place-items-center" aria-label="Restablecer zoom"><Expand className="w-4 h-4" /></button></div>
            <div className="absolute bottom-3 left-3 rounded-xl bg-white/90 px-3 py-2 text-[10px] text-[#607568] shadow-sm">Arrastra para rotar · rueda para acercar</div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3"><div className="rounded-xl bg-[var(--agro-surface-soft)] p-3"><p className="text-[10px] text-[var(--agro-muted)]">Etapa del cultivo</p><strong className="text-sm text-[var(--agro-text)]">{growth < 30 ? 'Emergencia' : growth < 75 ? 'Desarrollo vegetativo' : 'Maduración'}</strong><div className="h-1 rounded-full bg-[var(--agro-line)] mt-2"><span className="block h-full rounded-full bg-[var(--agro-lime)]" style={{ width: `${growth}%` }} /></div></div><div className="rounded-xl bg-[var(--agro-surface-soft)] p-3"><p className="text-[10px] text-[var(--agro-muted)]">Condición climática</p><strong className="text-sm text-[var(--agro-text)]">{weather[climate].label}</strong></div><div className="rounded-xl bg-[var(--agro-surface-soft)] p-3"><p className="text-[10px] text-[var(--agro-muted)]">Iluminación</p><strong className="text-sm text-[var(--agro-text)]">{hourLabel}</strong></div></div>
        </div>

        <aside className="rounded-2xl border border-[var(--agro-line)] bg-[var(--agro-surface-soft)] p-4 space-y-5" aria-label="Controles del modelo">
          <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-[var(--agro-text)]">Control ambiental</h3><span className="text-[10px] text-[var(--agro-muted)]">INTERACTIVO</span></div>
          <div><p className="text-[11px] font-bold text-[var(--agro-muted)] mb-2">Tipo de cultivo</p><div className="grid grid-cols-2 gap-2">{(Object.keys(crops) as CropKey[]).map((key) => <button key={key} type="button" onClick={() => setCrop(key)} aria-pressed={crop === key} className={`text-left rounded-xl border p-2.5 transition ${crop === key ? 'border-[var(--agro-lime)] bg-[var(--agro-success-bg)]' : 'border-[var(--agro-line)] bg-[var(--agro-surface)]'}`}><span className="text-xl">{crops[key].emoji}</span><strong className="block text-xs text-[var(--agro-text)] mt-1">{crops[key].name}</strong><small className="block text-[10px] text-[var(--agro-muted)] truncate">{crops[key].description}</small></button>)}</div></div>
          <div><p className="text-[11px] font-bold text-[var(--agro-muted)] mb-2">Condiciones del clima</p><div className="grid grid-cols-5 gap-1.5">{(Object.keys(weather) as WeatherKey[]).map((key) => <button key={key} type="button" onClick={() => setClimate(key)} aria-pressed={climate === key} className={`rounded-lg border p-2 text-[10px] font-bold ${climate === key ? 'border-[var(--agro-lime)] bg-[var(--agro-success-bg)] text-[var(--agro-success-text)]' : 'border-[var(--agro-line)] text-[var(--agro-muted)]'}`}>{weather[key].icon}<span className="block mt-1">{weather[key].label}</span></button>)}</div></div>
           <label className="block text-[11px] font-bold text-[var(--agro-muted)]">Etapa de crecimiento <output className="float-right text-[var(--agro-text)]">{growth}%</output><input aria-label="Etapa de crecimiento" className="w-full mt-3 accent-[var(--agro-lime)]" type="range" min="10" max="100" value={growth} onChange={(event) => setGrowth(Number(event.target.value))} /></label>
           <label className="block text-[11px] font-bold text-[var(--agro-muted)]">Intensidad del viento <output className="float-right text-[var(--agro-text)]">{wind} km/h</output><input aria-label="Intensidad del viento" className="w-full mt-3 accent-[var(--agro-lime)]" type="range" min="0" max="80" value={wind} onChange={(event) => setWind(Number(event.target.value))} /></label>
           <label className="block text-[11px] font-bold text-[var(--agro-muted)]">Hora del día <output className="float-right text-[var(--agro-text)]">{hourLabel}</output><input aria-label="Hora del día" className="w-full mt-3 accent-[var(--agro-lime)]" type="range" min="6" max="19" value={hour} onChange={(event) => setHour(Number(event.target.value))} /></label>
           <div className="space-y-1">{([['rain', 'Mostrar lluvia'], ['clouds', 'Mostrar nubes'], ['soil', 'Suelo y surcos'], ['sway', 'Animar el viento'], ['snow', 'Nieve acumulada']] as const).map(([key, label]) => <div key={key} className="flex items-center justify-between py-2 border-b border-[var(--agro-line)]/60 text-[11px] text-[var(--agro-muted)]"><span>{label}</span><button type="button" onClick={() => toggleLayer(key)} role="switch" aria-label={label} aria-checked={layers[key]} className={`w-9 h-5 rounded-full p-1 ${layers[key] ? 'bg-[var(--agro-lime)]' : 'bg-[var(--agro-line)]'}`}><span className={`block w-3 h-3 bg-white rounded-full transition-transform ${layers[key] ? 'translate-x-4' : ''}`} /></button></div>)}</div>
        </aside>
      </div>

      <div className="grid md:grid-cols-3 gap-3 px-4 lg:px-5 pb-4"><div className="rounded-2xl bg-[#166534] text-white p-3.5"><div className="flex justify-between"><p className="text-[10px] uppercase font-bold text-emerald-100">Área seleccionada</p><CheckCircle2 className="w-4 h-4 text-emerald-200" /></div><p className="text-2xl font-bold mt-2">{parcel.areaHa.toFixed(2)} <small className="text-sm font-normal">ha</small></p><p className="text-xs text-emerald-100 mt-1">Polígono referencial · {parcel.polygon.length} vértices</p></div><div className="rounded-2xl bg-[var(--agro-surface-soft)] p-3.5"><div className="flex items-center gap-2"><Sprout className="w-4 h-4 text-[var(--agro-lime)]" /><p className="text-[10px] uppercase font-bold text-[var(--agro-muted)]">Cultivo actual</p></div><p className="text-sm font-bold text-[var(--agro-text)] mt-2">{selectedCrop.emoji} {selectedCrop.name}</p><p className="text-xs text-[var(--agro-muted)] mt-1">{plantCount} plantas 3D ilustrativas</p></div><div className="rounded-2xl bg-[var(--agro-surface-soft)] p-3.5"><div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[var(--agro-lime)]" /><p className="text-[10px] uppercase font-bold text-[var(--agro-muted)]">Ubicación</p></div><p className="text-sm font-bold text-[var(--agro-text)] mt-2">{parcel.location}, {parcel.department}</p><p className="text-[11px] font-mono text-[var(--agro-muted)] mt-1 break-words">{formatCoordinates(parcel.centroid)}</p></div></div>
      <div className="flex items-start gap-2 px-4 lg:px-5 pb-4 text-[10px] text-[var(--agro-muted)]"><Info className="w-3.5 h-3.5 shrink-0" />La escena, el relieve y los valores son una simulación visual. No representan observaciones meteorológicas ni predicciones agronómicas.</div>
    </section>
  );
}
