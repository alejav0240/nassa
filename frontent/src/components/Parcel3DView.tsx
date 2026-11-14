import { CheckCircle2, Compass, MapPin, Ruler, Sprout } from 'lucide-react';
import { Parcel } from '../types/agroterra';
import { formatCoordinates } from '../utils/geo';

interface Parcel3DViewProps {
  parcel: Parcel;
}

function projectPolygon(parcel: Parcel) {
  const points = parcel.polygon.length >= 3 ? parcel.polygon : [parcel.centroid];
  const lngs = points.map((point) => point.lng);
  const lats = points.map((point) => point.lat);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const lngRange = Math.max(maxLng - minLng, 0.0001);
  const latRange = Math.max(maxLat - minLat, 0.0001);

  return points
    .map((point) => {
      const x = 90 + ((point.lng - minLng) / lngRange) * 420;
      const y = 55 + (1 - (point.lat - minLat) / latRange) * 245;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export function Parcel3DView({ parcel }: Parcel3DViewProps) {
  const polygonPoints = projectPolygon(parcel);

  return (
    <section className="rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
      <div className="grid lg:grid-cols-[minmax(170px,0.72fr)_minmax(320px,1.6fr)_minmax(190px,0.82fr)] gap-4 p-4 lg:p-5 items-stretch">
        <aside className="order-2 lg:order-1 space-y-3" aria-label="Información de ubicación">
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3.5 h-full">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#166534] flex items-center justify-center mb-3">
              <MapPin className="w-4 h-4" />
            </div>
            <p className="text-[10px] uppercase tracking-wide font-bold text-slate-500">Ubicación</p>
            <p className="text-sm font-bold text-slate-900 mt-1 leading-5">{parcel.location}</p>
            <p className="text-xs text-slate-500 mt-1">{parcel.department}</p>
            <p className="text-[11px] text-slate-600 font-mono mt-4 leading-5 break-words">
              {formatCoordinates(parcel.centroid)}
            </p>
          </div>
        </aside>

        <div className="order-1 lg:order-2 min-w-0 rounded-2xl bg-gradient-to-b from-[#e9f5e6] via-[#d8edda] to-[#bdd9c0] border border-emerald-100 p-3 relative overflow-hidden min-h-[300px] flex items-center justify-center">
          <div className="absolute inset-x-8 bottom-5 h-12 rounded-[50%] bg-[#547e5b]/20 blur-xl" />
          <div className="relative w-full max-w-[580px] perspective-[1100px]">
            <div className="transform-gpu rotate-x-[55deg] rotate-z-[-4deg] transition-transform duration-500 hover:rotate-x-[48deg]">
              <svg viewBox="0 0 600 380" className="w-full h-auto drop-shadow-[0_26px_18px_rgba(22,74,38,0.25)]" role="img" aria-label={`Vista 3D referencial de ${parcel.name}`}>
                <defs>
                  <linearGradient id={`parcel-top-${parcel.id}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#8fca78" />
                    <stop offset="55%" stopColor="#4da56a" />
                    <stop offset="100%" stopColor="#28734c" />
                  </linearGradient>
                  <linearGradient id={`parcel-side-${parcel.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2f8050" />
                    <stop offset="100%" stopColor="#164b34" />
                  </linearGradient>
                  <pattern id={`parcel-lines-${parcel.id}`} width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
                    <path d="M 0 0 V 18" stroke="#d8f3b8" strokeOpacity="0.34" strokeWidth="2" />
                  </pattern>
                </defs>
                <polygon points={polygonPoints} transform="translate(0 26)" fill={`url(#parcel-side-${parcel.id})`} stroke="#164b34" strokeWidth="5" strokeLinejoin="round" />
                <polygon points={polygonPoints} fill={`url(#parcel-top-${parcel.id})`} stroke="#e3f7c8" strokeWidth="4" strokeLinejoin="round" />
                <polygon points={polygonPoints} fill={`url(#parcel-lines-${parcel.id})`} opacity="0.72" />
                <circle cx="300" cy="178" r="7" fill="#fff" stroke="#166534" strokeWidth="4" />
              </svg>
            </div>
          </div>
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 text-[10px] font-bold text-[#315d3a]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/75 backdrop-blur px-2.5 py-1.5"><Compass className="w-3 h-3" /> Vista 3D referencial</span>
            <span className="rounded-full bg-white/75 backdrop-blur px-2.5 py-1.5">N ↑</span>
          </div>
        </div>

        <aside className="order-3 space-y-3" aria-label="Resumen del área">
          <div className="rounded-2xl bg-[#166534] text-white p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] uppercase tracking-wide font-bold text-emerald-100">Área seleccionada</p>
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums mt-2">{parcel.areaHa.toFixed(2)} <span className="text-sm font-sans font-medium">ha</span></p>
            <p className="text-xs text-emerald-100 mt-1">Polígono referencial</p>
          </div>
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3.5">
            <div className="flex items-center gap-2 text-[#166534]">
              <Sprout className="w-4 h-4" />
              <p className="text-[10px] uppercase tracking-wide font-bold text-slate-500">Cultivo actual</p>
            </div>
            <p className="text-sm font-bold text-slate-900 mt-2">{parcel.crop}</p>
            <p className="text-xs text-slate-500 mt-1">Altitud: ~{parcel.elevationM} m s. n. m.</p>
          </div>
          <div className="hidden sm:flex rounded-2xl bg-slate-50 border border-slate-100 p-3.5 items-center gap-2">
            <Ruler className="w-4 h-4 text-slate-500" />
            <p className="text-[11px] text-slate-600 leading-4">La geometría es una representación visual de referencia.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
