import React, { useEffect, useState } from 'react';

interface AnimatedStatNumberProps {
  target: number;
  active: boolean;
  suffix?: string;
}

/**
 * Smooth 60-FPS rAF count-up numeral with tabular-nums alignment.
 * Respects `prefers-reduced-motion: reduce` and animates once when scrolled into view.
 */
export const AnimatedStatNumber: React.FC<AnimatedStatNumberProps> = ({
  target,
  active,
  suffix = '+',
}) => {
  const [display, setDisplay] = useState<number>(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return target;
    }
    return 0;
  });

  useEffect(() => {
    if (!active) return;

    if (
      typeof window === 'undefined' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      setDisplay(target);
      return;
    }

    let rafId = 0;
    const duration = 820;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextVal = Math.round(target * eased);
      setDisplay(nextVal);
      if (progress < 1) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [active, target]);

  return (
    <span className="tabular-nums">
      {(active ? display : 0).toLocaleString()}
      {suffix}
    </span>
  );
};
