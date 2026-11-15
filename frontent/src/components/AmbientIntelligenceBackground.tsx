import { useReducedMotion } from 'motion/react';

type AmbientVariant = 'home' | 'parcels' | 'analysis';

export function AmbientIntelligenceBackground({ variant }: { variant: AmbientVariant }) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className={`ambient-intelligence ambient-intelligence--${variant}${reduceMotion ? ' is-static' : ''}`}
    >
      <span className="ambient-intelligence__glow ambient-intelligence__glow--primary" />
      <span className="ambient-intelligence__glow ambient-intelligence__glow--secondary" />
      <svg className="ambient-intelligence__contours" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
        <path d="M-120 190C76 64 196 313 398 190s270-99 406-20 254 21 430-75" />
        <path d="M-120 235C68 110 202 350 408 230s260-88 394-8 265 22 432-71" />
        <path d="M-125 280C55 156 210 389 420 271s251-78 383 3 277 23 440-65" />
        <path d="M-130 328C44 204 220 430 434 314s241-65 370 15 290 26 450-58" />
        <path d="M-140 520C75 410 216 660 425 530s251-95 390-18 270 19 438-62" />
        <path d="M-140 565C68 460 227 700 440 575s245-80 382-2 282 24 438-55" />
        <path d="M-140 610C58 510 240 741 455 618s240-66 372 13 292 27 435-47" />
      </svg>
      <span className="ambient-intelligence__node ambient-intelligence__node--one" />
      <span className="ambient-intelligence__node ambient-intelligence__node--two" />
      <span className="ambient-intelligence__sweep" />
    </div>
  );
}
