import React, { useEffect, useRef } from 'react';
import { LgSegmentedElement } from '../../types/liquidglass';
import { GlassControlBoundary } from '../ErrorBoundary';
import { useLiquidGlassReady } from './loader';

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
  cssOnly?: boolean;
}

/**
 * React 19-safe wrapper around <lg-segmented>.
 * Syncs labels/value safely inside try/catch and falls back automatically to
 * standard accessible radio buttons via GlassControlBoundary on any failure.
 */
export function GlassSegmented<T extends string = string>({
  options,
  value,
  onChange,
  ariaLabel = 'Segmented options',
  className = '',
  fullWidth = false,
  cssOnly = false,
}: GlassSegmentedProps<T>) {
  const { ready, failed } = useLiquidGlassReady(!cssOnly);
  const segRef = useRef<LgSegmentedElement | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const structureKey = options.map((opt) => opt.value).join('|');
  const labelsKey = options.map((opt) => opt.label).join('|');

  useEffect(() => {
    const el = segRef.current;
    if (!el || !ready || failed || cssOnly) return;

    const handleChange = (e: Event) => {
      const detail = (e as CustomEvent<{ value?: string }>).detail;
      if (detail?.value !== undefined) {
        onChangeRef.current(detail.value as T);
      }
    };

    el.addEventListener('change', handleChange);
    return () => {
      el.removeEventListener('change', handleChange);
    };
  }, [ready, failed, cssOnly, structureKey]);

  // Keep refractive lens overlay synchronized when labels change (UZ -> RU -> EN -> UZ)
  useEffect(() => {
    const el = segRef.current;
    if (!el || !ready || failed || cssOnly) return;
    let raf = 0;
    try {
      if (typeof el.refresh === 'function') {
        el.refresh();
        raf = window.requestAnimationFrame(() => {
          try {
            el.refresh();
          } catch {
            // Ignore
          }
        });
      }
    } catch {
      // Ignore
    }
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [labelsKey, structureKey, ready, failed, cssOnly]);

  // Keep controlled value synchronized after mount
  useEffect(() => {
    const el = segRef.current;
    if (!el || !ready || failed || cssOnly) return;
    try {
      if (el.value !== value) {
        el.value = value;
      }
    } catch {
      // Ignore
    }
  }, [value, structureKey, ready, failed, cssOnly]);

  const fallbackElement = (
    <div
      key={`css-${structureKey}`}
      role="radiogroup"
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-1 p-1 rounded-[var(--lg-radius)] glass-surface-subtle ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center justify-center gap-1.5 min-h-[36px] px-3.5 rounded-[var(--lg-radius-sm)] text-sm font-medium transition-all duration-200 cursor-pointer ${
              fullWidth ? 'flex-1' : ''
            } ${
              isActive
                ? 'bg-white text-[#C64873] font-semibold shadow-sm'
                : 'text-[#5C4F48] hover:text-[#1E1418] hover:bg-white/50'
            }`}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );

  if (cssOnly || !ready || failed || options.length === 0) {
    return fallbackElement;
  }

  return (
    <GlassControlBoundary fallback={fallbackElement}>
      <lg-segmented
        key={`lg-${structureKey}`}
        ref={segRef}
        value={value}
        label={ariaLabel}
        className={`${fullWidth ? 'w-full flex' : ''} ${className}`}
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            value={opt.value}
            aria-checked={opt.value === value}
            className={fullWidth ? 'flex-1' : undefined}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              {opt.icon}
              <span>{opt.label}</span>
            </span>
          </button>
        ))}
      </lg-segmented>
    </GlassControlBoundary>
  );
}
