import React, { useEffect, useId } from 'react';
import { X } from 'lucide-react';
import { GlassSurface } from './GlassSurface';

export interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg';
  ariaLabel?: string;
  closeLabel?: string;
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  className?: string;
  children: React.ReactNode;
}

const SIZE_CLASSES: Record<NonNullable<GlassModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

/**
 * Reusable Liquid Glass dialog modal with backdrop blur, Escape dismissal,
 * outside-click dismissal, and body scroll locking.
 */
export const GlassModal: React.FC<GlassModalProps> = ({
  isOpen,
  onClose,
  size = 'md',
  ariaLabel,
  closeLabel = 'Close',
  showCloseButton = true,
  closeOnBackdropClick = true,
  className = '',
  children,
}) => {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E1418]/35 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (closeOnBackdropClick && e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : titleId}
    >
      <GlassSurface
        variant="elevated"
        rounded="3xl"
        className={`w-full ${SIZE_CLASSES[size]} relative p-6 sm:p-7 max-h-[90vh] overflow-y-auto ${className}`}
      >
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="absolute top-4 right-4 w-9 h-9 rounded-full glass-surface-subtle hover:bg-white text-[#4A383F] hover:text-[#1E1418] flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C64873]"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
        <div id={ariaLabel ? undefined : titleId}>{children}</div>
      </GlassSurface>
    </div>
  );
};
