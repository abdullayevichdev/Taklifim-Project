import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GlassControlBoundary } from '../ErrorBoundary';

export interface GlassSegmentedOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

export interface GlassSegmentedProps<T extends string = string> {
  options: GlassSegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
  className?: string;
  fullWidth?: boolean;
  /** Kept for backwards compatibility; component is always pure React + CSS */
  cssOnly?: boolean;
}

interface IndicatorRect {
  left: number;
  width: number;
  visible: boolean;
}

/**
 * Pure React + CSS Liquid Glass segmented control.
 * - Zero custom-element shadow/clone overlap (<lg-segmented> removed).
 * - Smooth sliding frosted-glass pill animated solely via GPU transform & width/opacity.
 * - Remeasured via ResizeObserver + document.fonts.ready so webfont loading never causes drift.
 * - On 3+ options or tight mobile widths (320px+), smoothly scrolls horizontally with snap
 *   without clipping left-edge items and without displaying native scrollbars.
 */
function GlassSegmentedInner<T extends string = string>({
  options,
  value,
  onChange,
  ariaLabel = 'Segmented options',
  className = '',
  fullWidth = false,
}: GlassSegmentedProps<T>) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState<IndicatorRect>({
    left: 0,
    width: 0,
    visible: false,
  });

  const labelsKey = options.map((o) => o.label).join('|');
  const activeIndex = Math.max(
    0,
    options.findIndex((opt) => opt.value === value)
  );
  const hasMatch = options.some((opt) => opt.value === value);

  const measureIndicator = useCallback(() => {
    const btn = btnRefs.current[activeIndex];
    const inner = innerRef.current;
    if (!btn || !inner || !hasMatch) {
      setIndicator((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      return;
    }

    const nextLeft = btn.offsetLeft;
    const nextWidth = btn.offsetWidth;
    if (nextWidth <= 0) return;

    setIndicator((prev) => {
      if (
        prev.visible &&
        Math.abs(prev.left - nextLeft) < 0.5 &&
        Math.abs(prev.width - nextWidth) < 0.5
      ) {
        return prev;
      }
      return { left: nextLeft, width: nextWidth, visible: true };
    });
  }, [activeIndex, hasMatch]);

  // Measure immediately on layout changes
  useLayoutEffect(() => {
    measureIndicator();
  }, [measureIndicator, value, labelsKey, fullWidth, options.length]);

  // Re-measure when web fonts finish loading or container/button resizes
  useEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;

    let cancelled = false;
    const scheduleMeasure = () => {
      if (!cancelled) {
        window.requestAnimationFrame(measureIndicator);
      }
    };

    const ro =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleMeasure) : null;
    if (ro) {
      ro.observe(inner);
      btnRefs.current.forEach((btn) => {
        if (btn) ro.observe(btn);
      });
    }

    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(scheduleMeasure).catch(() => {});
    }

    window.addEventListener('resize', scheduleMeasure, { passive: true });
    return () => {
      cancelled = true;
      ro?.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
    };
  }, [measureIndicator, labelsKey, options.length]);

  // Keep the active chip horizontally scrolled into view without triggering vertical scroll
  useEffect(() => {
    const track = trackRef.current;
    const btn = btnRefs.current[activeIndex];
    if (!track || !btn) return;
    if (track.scrollWidth <= track.clientWidth + 2) return;

    const btnLeft = btn.offsetLeft;
    const btnRight = btnLeft + btn.offsetWidth;
    const viewLeft = track.scrollLeft;
    const viewRight = viewLeft + track.clientWidth;
    const pad = 12;

    if (btnLeft < viewLeft + pad || btnRight > viewRight - pad) {
      const targetLeft = Math.max(
        0,
        btnLeft - (track.clientWidth - btn.offsetWidth) / 2
      );
      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      track.scrollTo({
        left: targetLeft,
        behavior: prefersReduced ? 'auto' : 'smooth',
      });
    }
  }, [activeIndex, options.length]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (options.length === 0) return;
    let nextIdx: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIdx = (activeIndex + 1) % options.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIdx = (activeIndex - 1 + options.length) % options.length;
    } else if (e.key === 'Home') {
      nextIdx = 0;
    } else if (e.key === 'End') {
      nextIdx = options.length - 1;
    }
    if (nextIdx !== null && options[nextIdx]) {
      e.preventDefault();
      onChange(options[nextIdx].value);
      btnRefs.current[nextIdx]?.focus();
    }
  };

  if (options.length === 0) {
    return null;
  }

  const isTwoUpFull = fullWidth && options.length <= 2;
  const isScrollableMulti = options.length >= 3;

  return (
    <div
      ref={trackRef}
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={`taklifim-seg-track relative inline-flex items-center max-w-full p-1 rounded-[20px] border border-white/95 bg-white/58 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.96),0_6px_18px_-6px_rgba(198,72,115,0.14)] overflow-x-auto no-scrollbar snap-x snap-proximity ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
    >
      <div
        ref={innerRef}
        className={`relative flex items-center gap-1 ${
          isTwoUpFull
            ? 'w-full'
            : fullWidth && isScrollableMulti
            ? 'min-w-full w-max sm:w-full'
            : 'w-max min-w-full'
        }`}
      >
        {indicator.visible && (
          <span
            aria-hidden="true"
            className="taklifim-seg-indicator pointer-events-none absolute top-0 bottom-0 left-0 rounded-[15px] bg-white/96 border border-white shadow-[0_6px_16px_-4px_rgba(201,79,121,0.22),inset_0_1.5px_0_rgba(255,255,255,1)]"
            style={{
              width: `${indicator.width}px`,
              transform: `translate3d(${indicator.left}px, 0, 0)`,
            }}
          />
        )}

        {options.map((opt, idx) => {
          const isActive = opt.value === value;
          return (
            <button
              key={opt.value}
              ref={(el) => {
                btnRefs.current[idx] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(opt.value)}
              className={`relative z-10 inline-flex items-center justify-center gap-1.5 min-h-[38px] sm:min-h-[40px] px-3 sm:px-3.5 py-1.5 rounded-[15px] text-xs sm:text-[13px] leading-snug whitespace-nowrap snap-start transition-colors duration-150 cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C64873] ${
                isTwoUpFull
                  ? 'flex-1 min-w-0'
                  : fullWidth && isScrollableMulti
                  ? 'shrink-0 sm:flex-1 sm:min-w-0'
                  : 'shrink-0'
              } ${
                isActive
                  ? 'text-[#9E3E60] font-bold'
                  : 'text-[#4A383F] font-medium hover:text-[#1E1418] hover:bg-white/40'
              }`}
            >
              {opt.icon ? (
                <span className="inline-flex items-center justify-center shrink-0">
                  {opt.icon}
                </span>
              ) : null}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function GlassSegmented<T extends string = string>(props: GlassSegmentedProps<T>) {
  const staticFallback = (
    <div
      role="radiogroup"
      aria-label={props.ariaLabel || 'Segmented options'}
      className={`inline-flex items-center gap-1 p-1 rounded-[20px] glass-surface-subtle max-w-full overflow-x-auto no-scrollbar ${
        props.fullWidth ? 'w-full' : ''
      } ${props.className || ''}`}
    >
      {props.options.map((opt) => {
        const isActive = opt.value === props.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => props.onChange(opt.value)}
            className={`inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3 rounded-[15px] text-xs whitespace-nowrap shrink-0 ${
              isActive ? 'bg-white text-[#9E3E60] font-bold shadow-xs' : 'text-[#4A383F] font-medium'
            }`}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <GlassControlBoundary fallback={staticFallback}>
      <GlassSegmentedInner {...props} />
    </GlassControlBoundary>
  );
}
