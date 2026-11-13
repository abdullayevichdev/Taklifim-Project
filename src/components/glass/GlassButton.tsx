import React from 'react';
import { Loader2 } from 'lucide-react';
import { LgTone } from '../../types/liquidglass';
import { useLiquidGlassReady } from './loader';

export interface GlassButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  tone?: LgTone;
  href?: string;
  target?: string;
  type?: 'button' | 'submit' | 'reset';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  backdrop?: string;
  radius?: number | 'capsule';
  /** Forces pure CSS fallback rendering instead of <lg-button> */
  cssOnly?: boolean;
  onAnchorClick?: (e: React.MouseEvent<HTMLElement>) => void;
}

const SIZE_CLASSES: Record<NonNullable<GlassButtonProps['size']>, string> = {
  sm: 'min-h-[40px] px-4 text-sm',
  md: 'min-h-[44px] px-5 text-sm sm:text-base',
  lg: 'min-h-[48px] px-7 text-base',
};

const FALLBACK_TONES: Record<LgTone, string> = {
  tinted:
    'bg-gradient-to-r from-[#D45682] to-[#B23864] text-white shadow-[0_12px_28px_-8px_rgba(184,62,106,0.46),inset_0_1px_0_rgba(255,255,255,0.45)] border border-white/55 hover:brightness-105',
  light:
    'glass-surface text-[#1E1418] bg-white/84 border border-white/98 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_10px_26px_-8px_rgba(30,20,24,0.14)] hover:bg-white/95',
  clear:
    'bg-white/62 backdrop-blur-md text-[#1E1418] border border-[#1E1418]/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_22px_-6px_rgba(30,20,24,0.12)] hover:bg-white/82 hover:border-[#1E1418]/22',
};

/**
 * React 19-safe hybrid wrapper around <lg-button>.
 * Uses a single permanent inner <span> slot so LgButton's replaceChildren()
 * never collides with React dynamic text/language/icon updates, and renders
 * an identical CSS glass fallback before lazy-load or if unsupported.
 */
export const GlassButton: React.FC<GlassButtonProps> = ({
  tone = 'tinted',
  href,
  target,
  type = 'button',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  backdrop,
  radius = 'capsule',
  cssOnly = false,
  className = '',
  onClick,
  onAnchorClick,
  children,
  'aria-label': ariaLabel,
  ...rest
}) => {
  const { ready, failed } = useLiquidGlassReady(!cssOnly);
  const lgRef = React.useRef<HTMLElement | null>(null);
  const isDisabled = disabled || loading;

  React.useEffect(() => {
    if (cssOnly || !ready || failed || !lgRef.current) return;
    const inner = lgRef.current.querySelector('.lg-button__el');
    if (inner) {
      if (ariaLabel) {
        inner.setAttribute('aria-label', ariaLabel);
      } else {
        inner.removeAttribute('aria-label');
      }
    }
  }, [ariaLabel, cssOnly, ready, failed]);

  const contentSlot = (
    <span className="inline-flex items-center justify-center gap-2 leading-none">
      {loading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" /> : leftIcon}
      <span>{children}</span>
      {!loading && rightIcon}
    </span>
  );

  if (cssOnly || !ready || failed) {
    const baseClasses = [
      'inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 cursor-pointer select-none',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D66389]',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      SIZE_CLASSES[size],
      FALLBACK_TONES[tone],
      className,
    ]
      .filter(Boolean)
      .join(' ');

    if (href) {
      return (
        <a
          href={href}
          target={target}
          aria-label={ariaLabel}
          onClick={onAnchorClick || (onClick as unknown as React.MouseEventHandler<HTMLAnchorElement>)}
          className={baseClasses}
        >
          {contentSlot}
        </a>
      );
    }

    return (
      <button
        type={type}
        disabled={isDisabled}
        aria-label={ariaLabel}
        onClick={onClick}
        className={baseClasses}
        {...rest}
      >
        {contentSlot}
      </button>
    );
  }

  return (
    <lg-button
      ref={lgRef as React.RefObject<never>}
      key={`${href ?? 'btn'}-${type}`}
      tone={tone}
      href={href}
      target={target}
      type={href ? undefined : type}
      disabled={isDisabled ? true : undefined}
      radius={radius}
      backdrop={backdrop}
      aria-label={ariaLabel}
      onClick={(e) => {
        if (isDisabled) {
          e.preventDefault();
          return;
        }
        if (href && onAnchorClick) {
          onAnchorClick(e);
        } else if (onClick) {
          onClick(e as unknown as React.MouseEvent<HTMLButtonElement>);
        }
      }}
      className={`inline-flex ${className}`}
    >
      {contentSlot}
    </lg-button>
  );
};
