import { useRef, type PointerEvent, type RefObject } from 'react';
import {
  AnimatePresence, motion, useMotionValue, useReducedMotion, useScroll,
  useInView, useSpring, useTransform, type MotionValue,
} from 'motion/react';
import { Activity, ArrowDown, ArrowUpRight, ChevronDown, ChevronRight, MapPinned, ScanLine } from 'lucide-react';
import type { Parcel } from '../../types/agroshift';
import { formatAreaHa, getParcelAreaHa } from '../../utils/parcelGeometry';

interface GeospatialHeroProps {
  parcel: Parcel;
  parcels: Parcel[];
  backendStatus: 'checking' | 'connected' | 'offline';
  syncStatus: 'idle' | 'saving' | 'saved' | 'error';
  onSelectParcel: (id: string) => void;
  onOpenParcelDetail: (id: string) => void;
  onOpenMap: () => void;
  scrollContainer?: RefObject<HTMLElement | null>;
}

interface SceneMotion {
  scale: MotionValue<number>;
  mediaY: MotionValue<number>;
  contourY: MotionValue<number>;
  telemetryOpacity: MotionValue<number>;
  telemetryY: MotionValue<number>;
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
  mediaX: MotionValue<number>;
  mediaPointerY: MotionValue<number>;
  detailX: MotionValue<number>;
  detailY: MotionValue<number>;
}

function useSceneMotion(target: RefObject<HTMLElement | null>, container?: RefObject<HTMLElement | null>) {
  const { scrollYProgress } = useScroll({ container, target, offset: ['start start', 'end end'] });
  const scale = useTransform(scrollYProgress, [0, 0.32, 0.72, 1], [1, 1.12, 1.34, 1.48]);
  const mediaY = useTransform(scrollYProgress, [0, 0.5, 1], [0, -18, -34]);
  const contourY = useTransform(scrollYProgress, [0, 0.5, 1], [0, 28, 64]);
  const telemetryOpacity = useTransform(scrollYProgress, [0, 0.27, 0.52, 0.78, 1], [0, 0, 1, 1, 0.25]);
  const telemetryY = useTransform(scrollYProgress, [0, 0.35, 0.62, 1], [34, 24, 0, -12]);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const pointerX = useSpring(rawX, { stiffness: 55, damping: 22, mass: 0.8 });
  const pointerY = useSpring(rawY, { stiffness: 55, damping: 22, mass: 0.8 });
  const mediaX = useTransform(pointerX, [-0.5, 0.5], [15, -15]);
  const mediaPointerY = useTransform(pointerY, [-0.5, 0.5], [9, -9]);
  const detailX = useTransform(pointerX, [-0.5, 0.5], [-10, 10]);
  const detailY = useTransform(pointerY, [-0.5, 0.5], [-7, 7]);
  return { scrollYProgress, scale, mediaY, contourY, telemetryOpacity, telemetryY, pointerX, pointerY, mediaX, mediaPointerY, detailX, detailY, rawX, rawY };
}

function parcelOutline(parcel: Parcel) {
  if (!parcel.measurement?.valid || parcel.polygon.length < 3) return null;
  const latitudeCenter = parcel.polygon.reduce((sum, point) => sum + point.lat, 0) / parcel.polygon.length;
  const cosLatitude = Math.cos((latitudeCenter * Math.PI) / 180);
  const xy = parcel.polygon.map((point) => ({ x: point.lng * cosLatitude, y: point.lat }));
  const minX = Math.min(...xy.map((point) => point.x));
  const maxX = Math.max(...xy.map((point) => point.x));
  const minY = Math.min(...xy.map((point) => point.y));
  const maxY = Math.max(...xy.map((point) => point.y));
  const spanX = Math.max(maxX - minX, 1e-9);
  const spanY = Math.max(maxY - minY, 1e-9);
  const scale = Math.min(640 / spanX, 430 / spanY);
  const width = spanX * scale;
  const height = spanY * scale;
  const offsetX = (1000 - width) / 2;
  const offsetY = (650 - height) / 2;
  return xy.map((point) => `${(offsetX + (point.x - minX) * scale).toFixed(1)},${(650 - offsetY - (point.y - minY) * scale).toFixed(1)}`).join(' ');
}

function ParcelTerrain({ parcel }: { parcel: Parcel }) {
  const outline = parcelOutline(parcel);
  return (
    <svg className="geo-illustration" viewBox="0 0 1000 650" role="img" aria-label={outline ? 'Visualización topográfica ilustrativa con el contorno registrado de la parcela' : 'Ilustración topográfica; no hay geometría de parcela verificada'}>
      <defs>
        <radialGradient id="geo-land-glow" cx="53%" cy="44%" r="64%"><stop offset="0" stopColor="#6eae72" stopOpacity=".36" /><stop offset="1" stopColor="#102c25" stopOpacity="0" /></radialGradient>
        <pattern id="geo-land-grid" width="52" height="52" patternUnits="userSpaceOnUse"><path d="M52 0H0V52" fill="none" stroke="#a9d4b0" strokeOpacity=".08" strokeWidth="1" /></pattern>
        <linearGradient id="geo-field-fill" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#c7ef91" stopOpacity=".27" /><stop offset="1" stopColor="#56b9aa" stopOpacity=".08" /></linearGradient>
      </defs>
      <rect width="1000" height="650" fill="url(#geo-land-glow)" />
      <rect width="1000" height="650" fill="url(#geo-land-grid)" />
      <g className="geo-terrain-contours" fill="none" stroke="#c2e9c3" strokeOpacity=".22" strokeWidth="1.25">
        <path d="M-80 148C102 32 211 250 382 155S666 37 793 138s217 110 367 4" />
        <path d="M-90 182C98 70 214 282 397 189S672 74 786 171s221 120 377 17" />
        <path d="M-96 223C99 112 221 320 414 230S678 115 780 208s225 129 382 30" />
        <path d="M-104 268C101 162 230 358 433 272S685 159 775 247s228 141 387 49" />
        <path d="M-82 468c153-124 266-105 385-8s238 149 367 29 192-152 396-54" />
        <path d="M-91 504c160-125 267-99 377-3s243 144 382 28 197-138 401-39" />
        <path d="M-96 543c168-124 269-94 369 1s251 139 396 27 203-122 406-23" />
        <path d="M-98 584c177-121 272-87 362 5s258 136 410 26 211-107 412-9" />
      </g>
      {outline && <g><polygon points={outline} fill="url(#geo-field-fill)" stroke="#d7ff9a" strokeWidth="3" strokeDasharray="11 7" /><polygon points={outline} fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="1" transform="translate(0 -8)" /></g>}
      <g className="geo-coordinate-mesh" fill="none" stroke="#5fc7c0" strokeOpacity=".42" strokeWidth="1.25">
        <path d="M138 487 298 394 480 450 633 340 790 392 914 276" />
        <path d="m298 394 44-164m138 220 84 108m69-218 51-126m106 178 124 109" />
      </g>
      <g className="geo-map-points" fill="#baf18a" stroke="#e9ffd6" strokeWidth="2"><circle cx="138" cy="487" r="4" /><circle cx="298" cy="394" r="5" /><circle cx="480" cy="450" r="4" /><circle cx="633" cy="340" r="5" /><circle cx="790" cy="392" r="4" /><circle cx="914" cy="276" r="5" /></g>
    </svg>
  );
}

function HeroStage({
  parcel, parcels, backendStatus, syncStatus, onSelectParcel, onOpenParcelDetail,
  onOpenMap, reducedMotion, scene, onPointerMove, onPointerLeave,
}: GeospatialHeroProps & { reducedMotion: boolean; scene?: SceneMotion; onPointerMove?: (event: PointerEvent<HTMLDivElement>) => void; onPointerLeave?: () => void }) {
  const outline = parcelOutline(parcel);
  const indicatorValue = parcel.indicatorsAvailable !== false;
  return (
    <div className={`geo-stage ${reducedMotion ? 'geo-stage--static' : ''}`} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      <div className="geo-stage-world">
        <motion.div className="geo-stage-media" style={{ scale: scene?.scale ?? 1, y: scene?.mediaY ?? 0, x: scene?.mediaX, transformOrigin: 'center center' }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={`${parcel.id}-${parcel.imageUrl ?? 'terrain'}`} className="geo-stage-media-content" initial={reducedMotion ? false : { opacity: 0, scale: 1.035 }} animate={{ opacity: 1, scale: 1 }} exit={reducedMotion ? undefined : { opacity: 0, scale: 0.985 }} transition={{ duration: reducedMotion ? 0 : 0.38, ease: [0.22, 1, 0.36, 1] }}>
              {parcel.imageUrl ? <img src={parcel.imageUrl} alt="" referrerPolicy="no-referrer" className="geo-stage-image" /> : <ParcelTerrain parcel={parcel} />}
            </motion.div>
          </AnimatePresence>
        </motion.div>
        <motion.div className="geo-stage-parallax" style={{ y: scene?.contourY ?? 0 }} aria-hidden="true">
          <motion.svg style={{ x: scene?.detailX, y: scene?.detailY }} viewBox="0 0 1000 650" preserveAspectRatio="none"><path d="M40 475 275 352 458 422 630 285 810 358 966 246" /><path d="m275 352 86-205m97 275 78 140m94-477 90 166m90 107 129 130" /></motion.svg>
          {parcel.measurement?.valid && <div className="geo-boundary-label"><ScanLine size={13} /> GEOMETRÍA REGISTRADA</div>}
        </motion.div>
        <div className="geo-stage-shade" aria-hidden="true" />
        <div className="geo-stage-grain" aria-hidden="true" />
        <div className="geo-stage-marker geo-stage-marker--north"><span /> VISTA DE PARCELA</div>
        <div className="geo-stage-marker geo-stage-marker--scale"><i /><i /><i /> CAPA GRÁFICA · ILUSTRATIVA</div>
        <div className="geo-stage-crosshair" aria-hidden="true"><span /><i /></div>
      </div>

      <motion.div className="geo-telemetry" style={{ opacity: scene?.telemetryOpacity ?? 0, y: scene?.telemetryY ?? 28 }} aria-hidden="true">
        <div className="geo-telemetry-heading"><span><Activity size={14} /> LECTURAS DE REFERENCIA</span><b>DEMO</b></div>
        {indicatorValue ? <div className="geo-telemetry-items"><div><small>NDVI</small><strong>{parcel.indicators.ndvi.toFixed(2)}</strong></div><div><small>HUMEDAD</small><strong>{parcel.indicators.moisturePct}%</strong></div><div><small>TEMP. SUP.</small><strong>{parcel.indicators.temperatureC.toFixed(1)}°</strong></div></div> : <p className="geo-telemetry-empty">Sin indicadores disponibles para esta parcela.</p>}
        <span className="geo-telemetry-source">Fuentes regionales demostrativas · no son mediciones de campo</span>
      </motion.div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={parcel.id} className="geo-stage-content" initial={reducedMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? undefined : { opacity: 0, y: -10 }} transition={{ duration: reducedMotion ? 0 : 0.32, ease: 'easeOut' }}>
          <div className="geo-hero-eyebrow"><span className="geo-pulse-dot" /> AGROSHIFT AI <i /> PARCELA ACTIVA</div>
          <h2>{parcel.name}</h2>
          <p className="geo-hero-place"><MapPinned size={15} /> {parcel.location} <span>·</span> {parcel.department}</p>
          <div className="geo-hero-data-row"><span><small>CULTIVO REGISTRADO</small><strong>{parcel.crop}</strong></span><i /><span><small>SUPERFICIE</small><strong>{formatAreaHa(getParcelAreaHa(parcel))}</strong></span><i /><span><small>SEGUIMIENTO</small><strong>{parcel.monitoringStatus}</strong></span></div>
          <div className="geo-hero-controls">
            <label className="geo-parcel-picker"><span className="sr-only">Cambiar parcela activa</span><select value={parcel.id} onChange={(event) => onSelectParcel(event.target.value)} aria-label="Cambiar parcela activa">{parcels.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.crop} ({formatAreaHa(getParcelAreaHa(item))})</option>)}</select><ChevronDown size={16} aria-hidden="true" /></label>
            <button type="button" className="geo-open-detail" onClick={() => onOpenParcelDetail(parcel.id)}>Abrir ficha <ArrowUpRight size={17} /></button>
            <button type="button" className="geo-open-map" onClick={onOpenMap}>Explorar mapa <ChevronRight size={16} /></button>
          </div>
          <div className="geo-hero-sync" role="status"><span className={`geo-connection-dot ${backendStatus}`} />{backendStatus === 'connected' ? 'Conectado' : backendStatus === 'offline' ? 'Modo local' : 'Conectando'}<i />{syncStatus === 'saving' ? 'Guardando…' : syncStatus === 'error' ? 'Sin sincronizar' : syncStatus === 'saved' ? 'Cambios guardados' : parcel.backendId ? 'Parcela sincronizada' : 'Parcela local o demostrativa'}</div>
        </motion.div>
      </AnimatePresence>
      <div className="geo-scroll-prompt" aria-hidden="true"><ArrowDown size={14} /> DESPLÁZATE PARA EXPLORAR</div>
      {!parcel.imageUrl && <div className="geo-illustration-note">{outline ? 'Visualización ilustrativa · geometría registrada' : 'Ilustración topográfica · sin geometría verificada'}</div>}
    </div>
  );
}

function AnimatedGeospatialHero(props: GeospatialHeroProps) {
  const target = useRef<HTMLDivElement>(null);
  const inView = useInView(target, { amount: 0.02 });
  const scene = useSceneMotion(target, props.scrollContainer);
  const telemetryOpacity = scene.telemetryOpacity;
  const sceneMotion: SceneMotion = { ...scene, telemetryOpacity };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return;
    if (event.target instanceof Element && event.target.closest('button,select,a,input')) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    scene.rawX.set((event.clientX - bounds.left) / bounds.width - 0.5);
    scene.rawY.set((event.clientY - bounds.top) / bounds.height - 0.5);
  };
  const resetPointer = () => { scene.rawX.set(0); scene.rawY.set(0); };
  return <div ref={target} className={`geo-story-track ${inView ? 'is-visible' : ''}`}><HeroStage {...props} reducedMotion={false} scene={sceneMotion} onPointerMove={onPointerMove} onPointerLeave={resetPointer} /></div>;
}

function StaticGeospatialHero(props: GeospatialHeroProps) {
  return <div className="geo-story-track geo-story-track--static"><HeroStage {...props} reducedMotion scene={undefined} /></div>;
}

export function GeospatialHero(props: GeospatialHeroProps) {
  const reducedMotion = useReducedMotion();
  return reducedMotion ? <StaticGeospatialHero {...props} /> : <AnimatedGeospatialHero {...props} />;
}
