import { useRef, type ReactNode } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';

interface ScrollZoomVisualProps {
  children: ReactNode;
  className?: string;
  minScale?: number;
  maxScale?: number;
  travelY?: number;
  minOpacity?: number;
}

function AnimatedScrollZoomVisual({
  children,
  className,
  minScale,
  maxScale,
  travelY,
  minOpacity,
}: Required<Pick<ScrollZoomVisualProps, 'minScale' | 'maxScale' | 'travelY' | 'minOpacity'>> &
  Pick<ScrollZoomVisualProps, 'children' | 'className'>) {
  const target = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target,
    offset: ['start end', 'end start'],
  });
  const scale = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [minScale, maxScale, maxScale, minScale]);
  const y = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [travelY, -travelY, -travelY, travelY]);
  const opacity = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [minOpacity, 1, 1, minOpacity]);

  return (
    <div ref={target} className={className} data-scroll-zoom="active">
      <motion.div className="h-full w-full" style={{ scale, y, opacity, transformOrigin: 'center center' }}>
        {children}
      </motion.div>
    </div>
  );
}

export function ScrollZoomVisual({
  children,
  className,
  minScale = 1,
  maxScale = 1.06,
  travelY = 0,
  minOpacity = 1,
}: ScrollZoomVisualProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className} data-scroll-zoom="reduced">{children}</div>;
  }

  return (
    <AnimatedScrollZoomVisual
      className={className}
      minScale={minScale}
      maxScale={maxScale}
      travelY={travelY}
      minOpacity={minOpacity}
    >
      {children}
    </AnimatedScrollZoomVisual>
  );
}
