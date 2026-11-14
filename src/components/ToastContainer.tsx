import React from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { GlassSurface } from './glass';
import { getPortalRoot } from '../utils/portalRoot';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useAuth();

  if (toasts.length === 0) return null;

  const portalRoot = getPortalRoot();
  if (!portalRoot) return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-24 lg:bottom-6 right-4 sm:right-6 left-4 sm:left-auto z-[10500] flex flex-col gap-2 sm:max-w-sm sm:w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <GlassSurface
          key={toast.id}
          variant="elevated"
          rounded="2xl"
          className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 animate-fadeIn"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {toast.type === 'success' && (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
            )}
            {toast.type === 'error' && (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" aria-hidden="true" />
            )}
            {toast.type === 'info' && (
              <Info className="w-5 h-5 text-[#4A9BD4] shrink-0" aria-hidden="true" />
            )}
            <p className="text-xs font-semibold text-[#1E1418] leading-snug">
              {toast.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => removeToast(toast.id)}
            aria-label="Close notification"
            className="min-w-[32px] min-h-[32px] rounded-full hover:bg-black/5 text-[#4A383F] hover:text-[#1E1418] flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </GlassSurface>
      ))}
    </div>,
    portalRoot
  );
};
