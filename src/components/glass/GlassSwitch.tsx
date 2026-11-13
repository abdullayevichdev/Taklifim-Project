import React, { useEffect, useId, useRef } from 'react';
import { LgSwitchElement } from '../../types/liquidglass';
import { useLiquidGlassReady } from './loader';

export interface GlassSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  name?: string;
  className?: string;
  cssOnly?: boolean;
}

/**
 * React 19-safe wrapper around <lg-switch>.
 * Renders <lg-switch> childless so language/text updates in React never
 * collide with LgSwitch's replaceChildren() DOM manipulation.
 */
export const GlassSwitch: React.FC<GlassSwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  name,
  className = '',
  cssOnly = false,
}) => {
  const { ready, failed } = useLiquidGlassReady(!cssOnly);
  const switchRef = useRef<LgSwitchElement | null>(null);
  const labelId = useId();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const el = switchRef.current;
    if (!el || !ready || failed || cssOnly) return;

    const handleChange = () => {
      onChangeRef.current(Boolean(el.checked));
    };

    el.addEventListener('change', handleChange);
    return () => {
      el.removeEventListener('change', handleChange);
    };
  }, [ready, failed, cssOnly]);

  useEffect(() => {
    const el = switchRef.current;
    if (!el || !ready || failed || cssOnly) return;
    el.toggleAttribute('checked', checked);
  }, [checked, ready, failed, cssOnly]);

  useEffect(() => {
    const el = switchRef.current;
    if (!el || !ready || failed || cssOnly) return;
    el.toggleAttribute('disabled', disabled);
  }, [disabled, ready, failed, cssOnly]);

  useEffect(() => {
    const el = switchRef.current;
    if (!el || !ready || failed || cssOnly || !label) return;
    const input = el.querySelector('.lg-switch__input');
    if (input) input.setAttribute('aria-label', label);
  }, [label, ready, failed, cssOnly]);

  const toggleFromLabel = () => {
    if (!disabled) onChange(!checked);
  };

  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      {(label || description) && (
        <div
          id={labelId}
          onClick={toggleFromLabel}
          className={`flex-1 select-none ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {label && <div className="text-sm font-semibold text-[#1E1418] leading-snug">{label}</div>}
          {description && <div className="text-xs text-[#5C4F48] mt-0.5 leading-relaxed">{description}</div>}
        </div>
      )}

      {cssOnly || !ready || failed ? (
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-labelledby={label ? labelId : undefined}
          aria-label={!label ? 'Toggle' : undefined}
          disabled={disabled}
          onClick={() => !disabled && onChange(!checked)}
          className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D66389] ${
            checked ? 'bg-[#34C759]' : 'bg-[#D6CAD0]'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block h-6 w-8 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              checked ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      ) : (
        <lg-switch
          ref={switchRef}
          name={name}
          checked={checked ? true : undefined}
          disabled={disabled ? true : undefined}
          aria-label={label || 'Toggle'}
          className="shrink-0"
        />
      )}
    </div>
  );
};
