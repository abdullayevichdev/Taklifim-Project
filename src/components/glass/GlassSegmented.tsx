import React, { useEffect, useRef } from 'react';
import { LgSegmentedElement } from '../../types/liquidglass';
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
 * Automatically calls el.refresh() whenever option labels change (e.g. UZ/RU/EN
 * language switches) so the glass refractive copy stays synchronized, and syncs
 * controlled `value` updates cleanly.
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
    if (typeof el.refresh === 'function') {
      el.refresh();
      const raf = window.requestAnimationFrame(() => el.refresh());
      return () => window.cancelAnimationFrame(raf);
    }
  }, [labelsKey, structureKey, ready, failed, cssOnly]);

  // Keep controlled value synchronized (LgSegmented has no observedAttributes)
  useEffect(() => {
    const el = segRef.current;
    if (!el || !ready || failed || cssOnly) return;
    if (el.value !== value) {
      el.value = value;
    }
  }, [value, structureKey, ready, failed, cssOnly]);

  if (cssOnly || !ready || failed) {
    return (
      <div
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
                  ? 'bg-white text-[#D66389] shadow-sm'
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
  }

  return (
    <lg-segmented
      key={structureKey}
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
  );
}
