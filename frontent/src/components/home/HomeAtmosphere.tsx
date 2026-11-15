import { useRef } from 'react';
import { useInView, useReducedMotion } from 'motion/react';

export function HomeAtmosphere() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.01 });
  const reduceMotion = useReducedMotion();
  return (
    <div ref={ref} className={`agro-atmosphere ${inView ? 'is-visible' : ''} ${reduceMotion ? 'is-static' : ''}`} aria-hidden="true">
      <div className="agro-atmosphere-glow agro-atmosphere-glow--one" />
      <div className="agro-atmosphere-glow agro-atmosphere-glow--two" />
      <svg className="agro-atmosphere-lines" viewBox="0 0 1440 1100" preserveAspectRatio="xMidYMin slice">
        <g className="agro-contour-group" fill="none" stroke="currentColor" strokeWidth="1.1">
          <path d="M-120 150C90 60 160 255 360 168S650 22 820 139s290 170 690 12" />
          <path d="M-135 186C82 94 178 293 377 207S649 64 809 177s296 181 710 30" />
          <path d="M-145 226C70 137 194 331 395 249S652 109 798 217s302 191 721 52" />
          <path d="M-155 271C64 187 213 373 414 295S658 161 788 263s308 201 731 76" />
          <path d="M-100 640c183-183 361-91 518 7s262 168 411 16 279-192 680-62" />
          <path d="M-118 681c187-185 363-86 507 11s269 161 427 12 284-180 688-48" />
          <path d="M-132 723c194-184 361-84 500 14s275 158 440 10 290-166 688-31" />
          <path d="M-144 768c200-180 359-77 491 20s285 154 453 8 296-149 688-13" />
        </g>
        <g className="agro-network-lines" fill="none" stroke="currentColor" strokeWidth="1">
          <path d="M176 419 384 335 601 444 805 361 1026 440 1260 321" />
          <path d="M260 584 384 335M601 444l95 225 330-229M805 361l210-200" />
        </g>
        <g className="agro-network-nodes">
          <circle cx="176" cy="419" r="3" /><circle cx="384" cy="335" r="4" />
          <circle cx="601" cy="444" r="3" /><circle cx="805" cy="361" r="4" />
          <circle cx="1026" cy="440" r="3" /><circle cx="1260" cy="321" r="4" />
          <circle cx="260" cy="584" r="3" /><circle cx="696" cy="669" r="3" />
          <circle cx="1015" cy="440" r="3" /><circle cx="1015" cy="161" r="3" />
        </g>
      </svg>
      <span className="agro-atmosphere-coordinate agro-atmosphere-coordinate--a">GEO / 01</span>
      <span className="agro-atmosphere-coordinate agro-atmosphere-coordinate--b">AGRICULTURAL INTELLIGENCE</span>
    </div>
  );
}
