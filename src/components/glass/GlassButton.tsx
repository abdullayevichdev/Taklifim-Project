import React from 'react';
import { Loader2 } from 'lucide-react';
import { LgTone } from '../../types/liquidglass';

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
  /** Allows multi-line wrapped labels cleanly */
  multiline?: boolean;
  cssOnly?: boolean;
  onAnchorClick?: (e: React.MouseEvent<HTMLElement>) => void;
}

const SIZE_CLASSES: Record<NonNullable<GlassButtonProps['size']>, string> = {
  sm: 'min-h-[40px] px-4 text-sm',
  md: 'min-h-[44px] px-5 text-sm sm:text-base',
  lg: 'min-h-[48px] px-6 py-2.5 text-base',
};

const FALLBACK_TONES: Record<LgTone, string> = {
  tinted:
    'bg-gradient-to-r from-[#D45682] to-[#B23864] text-white shadow-[0_12px_30px_-8px_rgba(184,62,106,0.42),inset_0_1px_0_rgba(255,255,255,0.4)] hover:brightness-105',
  light:
    'text-[#1E1418] bg-white/92 shadow-[0_10px_26px_-6px_rgba(30,20,24,0.14),inset_0_1px_0_rgba(255,255,255,1)] hover:bg-white',
  clear:
    'bg-white/85 md:bg-white/70 md:backdrop-blur-md text-[#1E1418] shadow-[0_8px_22px_-6px_rgba(30,20,24,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] hover:bg-white/95',
};

/**
 * Pure Tailwind CSS GlassButton with 100% rounded pill shape and zero rectangular container artifacts.
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
  className = '',
  onClick,
  onAnchorClick,
  children,
  'aria-label': ariaLabel,
  ...rest
}) => {
  const isDisabled = disabled || loading;

  const contentSlot = (
    <span className="inline-flex items-center justify-center gap-2 leading-snug text-center [text-wrap:balance] max-w-full">
      {loading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" /> : leftIcon ? <span className="inline-flex shrink-0">{leftIcon}</span> : null}
      <span className="min-w-0">{children}</span>
      {!loading && rightIcon ? <span className="inline-flex shrink-0">{rightIcon}</span> : null}
    </span>
  );

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
};

export default GlassButton;
