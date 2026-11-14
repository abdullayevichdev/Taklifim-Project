import React, { useEffect, useRef } from 'react';
import { LgSliderElement } from '../../types/liquidglass';
import { GlassControlBoundary } from '../ErrorBoundary';
import { useLiquidGlassReady } from './loader';

export interface GlassSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label?: string;
  valueDisplay?: string;
  disabled?: boolean;
  name?: string;
  className?: string;
  cssOnly?: boolean;
}

/**
 * React 19-safe wrapper around <lg-slider> with responsive width,
 * GlassControlBoundary protection, and native <input type="range"> fallback.
 */
export const GlassSlider: React.FC<GlassSliderProps> = ({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  valueDisplay,
  disabled = false,
  name,
  className = '',
  cssOnly = false,
}) => {
  const { ready, failed } = useLiquidGlassReady(!cssOnly);
  const sliderRef = useRef<LgSliderElement | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const el = sliderRef.current;
    if (!el || !ready || failed || cssOnly) return;

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement | null;
      const next = target && typeof target.valueAsNumber === 'number' && !Number.isNaN(target.valueAsNumber)
        ? target.valueAsNumber
        : el.value;
      if (!Number.isNaN(next)) {
        onChangeRef.current(next);
      }
    };

    el.addEventListener('input', handleInput);
    el.addEventListener('change', handleInput);
    return () => {
      el.removeEventListener('input', handleInput);
      el.removeEventListener('change', handleInput);
    };
  }, [ready, failed, cssOnly]);

  useEffect(() => {
    const el = sliderRef.current;
    if (!el || !ready || failed || cssOnly) return;
    try {
      if (String(el.getAttribute('value')) !== String(value)) {
        el.setAttribute('value', String(value));
      }
    } catch {
      // Ignore
    }
  }, [value, ready, failed, cssOnly]);

  useEffect(() => {
    const el = sliderRef.current;
    if (!el || !ready || failed || cssOnly || !label) return;
    try {
      const input = el.querySelector('.lg-slider__input');
      if (input) input.setAttribute('aria-label', label);
    } catch {
      // Ignore
    }
  }, [label, ready, failed, cssOnly]);

  const fallbackSlider = (
    <input
      key="css-slider"
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      name={name}
      disabled={disabled}
      aria-label={label || 'Range slider'}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#D66389] bg-[#F5C9D8]/45"
    />
  );

  return (
    <div className={`w-full space-y-2 ${className}`}>
      {(label || valueDisplay) && (
        <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
          {label && <span className="font-medium text-[#5C4F48]">{label}</span>}
          {valueDisplay && <span className="font-semibold text-[#1E1418] tabular-nums">{valueDisplay}</span>}
        </div>
      )}

      {cssOnly || !ready || failed ? (
        fallbackSlider
      ) : (
        <GlassControlBoundary fallback={fallbackSlider}>
          <lg-slider
            key="lg-slider"
            ref={sliderRef}
            min={min}
            max={max}
            step={step}
            value={value}
            name={name}
            disabled={disabled ? true : undefined}
            label={label || 'Range slider'}
            style={{ width: '100%', display: 'block' }}
          />
        </GlassControlBoundary>
      )}
    </div>
  );
};
