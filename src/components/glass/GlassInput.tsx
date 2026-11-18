import React, { useId } from 'react';
import { AlertCircle } from 'lucide-react';

export interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  containerClassName?: string;
}

export const GlassInput: React.FC<GlassInputProps> = ({
  label,
  error,
  leftIcon,
  rightElement,
  containerClassName = '',
  className = '',
  id,
  ...rest
}) => {
  const autoId = useId();
  const inputId = id || autoId;

  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="block text-[11px] font-bold text-[#3A2D28]">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5C4F48] pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          className={`w-full min-h-[44px] ${leftIcon ? 'pl-10' : 'px-4'} ${
            rightElement ? 'pr-10' : 'pr-4'
          } py-2.5 rounded-[var(--lg-radius)] glass-surface-subtle bg-white/80 text-xs sm:text-[13px] text-[#1E1418] placeholder-[#7A6A63] outline-none transition-all focus:bg-white/95 focus:ring-2 focus:ring-[#D66389]/35 focus:border-[#D66389]/60 ${
            error ? 'ring-2 ring-rose-500/40 border-rose-400' : ''
          } ${className}`}
          {...rest}
        />
        {rightElement && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2">{rightElement}</span>
        )}
      </div>
      {error && (
        <div
          role="alert"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50/90 border border-rose-200/80 text-[11px] font-semibold text-rose-700"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export interface GlassTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export const GlassTextarea: React.FC<GlassTextareaProps> = ({
  label,
  error,
  containerClassName = '',
  className = '',
  id,
  ...rest
}) => {
  const autoId = useId();
  const textareaId = id || autoId;

  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <label htmlFor={textareaId} className="block text-[11px] font-bold text-[#3A2D28]">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        aria-invalid={error ? true : undefined}
        className={`w-full px-4 py-3 rounded-[var(--lg-radius)] glass-surface-subtle bg-white/80 text-xs sm:text-[13px] text-[#1E1418] placeholder-[#7A6A63] outline-none transition-all focus:bg-white/95 focus:ring-2 focus:ring-[#D66389]/35 focus:border-[#D66389]/60 ${
          error ? 'ring-2 ring-rose-500/40 border-rose-400' : ''
        } ${className}`}
        {...rest}
      />
      {error && (
        <div
          role="alert"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50/90 border border-rose-200/80 text-[11px] font-semibold text-rose-700"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
