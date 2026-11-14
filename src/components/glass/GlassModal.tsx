import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { GlassSurface } from './GlassSurface';
import { acquireModalScrollLock, getPortalRoot } from '../../utils/portalRoot';

export interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg';
  ariaLabel?: string;
  ariaLabelledBy?: string;
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

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Reusable Liquid Glass dialog modal rendered into `#modal-root` via createPortal
 * so ancestor `backdrop-filter`, `transform`, or `z-index` contexts can never
 * clip or overlap it. Includes full 100dvh overlay, body scroll lock, Escape
 * dismissal, focus trap, and focus restoration.
 */
export const GlassModal: React.FC<GlassModalProps> = ({
  isOpen,
  onClose,
  size = 'md',
  ariaLabel,
  ariaLabelledBy,
  closeLabel = 'Close',
  showCloseButton = true,
  closeOnBackdropClick = true,
  className = '',
  children,
}) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const releaseLock = acquireModalScrollLock();

    const rafId = window.requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        panel.focus();
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (e.key === 'Tab') {
        const panel = panelRef.current;
        if (!panel) return;
        const focusables = Array.from(
          panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter((el) => el.offsetParent !== null || el === document.activeElement);

        if (focusables.length === 0) {
          e.preventDefault();
          panel.focus();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (e.shiftKey) {
          if (!active || active === first || !panel.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else if (!active || active === last || !panel.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(rafId);
      document.removeEventListener('keydown', handleKeyDown);
      releaseLock();
      const prev = previousFocusRef.current;
      previousFocusRef.current = null;
      if (prev && typeof prev.focus === 'function' && prev.isConnected) {
        prev.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const portalRoot = getPortalRoot();
  if (!portalRoot) return null;

  const resolvedLabelId = ariaLabelledBy || titleId;

  const modalNode = (
    <div
      className="fixed inset-0 z-[10000] w-full h-[100dvh] flex items-center justify-center p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))] overflow-y-auto bg-[#1E1418]/48 backdrop-blur-md animate-fadeIn motion-reduce:animate-none"
      onClick={(e) => {
        if (closeOnBackdropClick && e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={resolvedLabelId}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`w-full ${SIZE_CLASSES[size]} relative my-auto outline-none`}
      >
        <GlassSurface
          variant="elevated"
          rounded="3xl"
          className={`w-full relative p-5 sm:p-7 max-h-[90dvh] overflow-y-auto overscroll-contain ${className}`}
        >
          {ariaLabel && !ariaLabelledBy && (
            <h2 id={titleId} className="sr-only">
              {ariaLabel}
            </h2>
          )}
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="absolute top-3.5 right-3.5 z-10 w-10 h-10 rounded-full glass-surface-subtle hover:bg-white text-[#4A383F] hover:text-[#1E1418] flex items-center justify-center transition-colors cursor-pointer touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C64873]"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
          <div id={!ariaLabel && !ariaLabelledBy ? titleId : undefined}>{children}</div>
        </GlassSurface>
      </div>
    </div>
  );

  return createPortal(modalNode, portalRoot);
};
