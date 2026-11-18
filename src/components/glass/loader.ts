import { useEffect, useState } from 'react';
import type { ToastHandle, ToastOptions } from '../../types/liquidglass';
import { isChunkLoadError, attemptChunkErrorReloadOnce } from '../ErrorBoundary';

type ComponentsModule = typeof import('../../vendor/liquidglass/components.js');

let loadPromise: Promise<ComponentsModule | null> | null = null;
let loadedModule: ComponentsModule | null = null;

const DESKTOP_LG_MEDIA = '(min-width: 1024px)';
const COARSE_POINTER_MEDIA = '(pointer: coarse)';
const REDUCED_MOTION_MEDIA = '(prefers-reduced-motion: reduce)';

/**
 * Heavy SVG feDisplacementMap + canvas lens map + global scroll listener
 * inside vendored liquidglass.dev components cause severe layout/GPU stalls on phones.
 * Only enable them on large non-touch desktop screens without reduced-motion.
 */
export function shouldUseHeavyLiquidGlass(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.innerWidth < 1024) return false;
  try {
    if (window.matchMedia?.(COARSE_POINTER_MEDIA).matches) return false;
    if (window.matchMedia?.(REDUCED_MOTION_MEDIA).matches) return false;
  } catch {
    // Ignore unsupported matchMedia
  }
  return true;
}

export function useCanUseLiquidGlass(): boolean {
  const [eligible, setEligible] = useState<boolean>(() => shouldUseHeavyLiquidGlass());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => {
      const next = shouldUseHeavyLiquidGlass();
      setEligible((prev) => (prev === next ? prev : next));
    };

    update();
    const mqlDesktop = window.matchMedia?.(DESKTOP_LG_MEDIA);
    const mqlCoarse = window.matchMedia?.(COARSE_POINTER_MEDIA);
    const mqlMotion = window.matchMedia?.(REDUCED_MOTION_MEDIA);

    mqlDesktop?.addEventListener?.('change', update);
    mqlCoarse?.addEventListener?.('change', update);
    mqlMotion?.addEventListener?.('change', update);
    window.addEventListener('resize', update, { passive: true });

    return () => {
      mqlDesktop?.removeEventListener?.('change', update);
      mqlCoarse?.removeEventListener?.('change', update);
      mqlMotion?.removeEventListener?.('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return eligible;
}

/**
 * Dynamically loads the vendored liquidglass.dev Web Components (v1.0.0)
 * on demand. If loading fails (offline or stale chunk after deploy),
 * falls back gracefully to pure CSS glass controls and reloads once on chunk errors.
 */
export function loadLiquidGlass(): Promise<ComponentsModule | null> {
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }
  if (loadedModule) {
    return Promise.resolve(loadedModule);
  }
  if (!loadPromise) {
    loadPromise = import('../../vendor/liquidglass/components.js')
      .then((mod) => {
        loadedModule = mod as ComponentsModule;
        return loadedModule;
      })
      .catch((err) => {
        console.warn('[Taklifim] Liquid Glass web components failed to load; using CSS fallback:', err);
        if (isChunkLoadError(err)) {
          attemptChunkErrorReloadOnce();
        }
        return null;
      });
  }
  return loadPromise;
}

export function isLiquidGlassLoaded(): boolean {
  return loadedModule !== null;
}

/**
 * React hook that triggers lazy loading of the liquidglass web components
 * on capable desktop screens and falls back to pure CSS glass on phones.
 */
export function useLiquidGlassReady(enabled = true): { ready: boolean; failed: boolean } {
  const canUseHeavy = useCanUseLiquidGlass();
  const isEnabled = enabled && canUseHeavy;

  const [state, setState] = useState<{ ready: boolean; failed: boolean }>(() => ({
    ready: isEnabled && loadedModule !== null,
    failed: false,
  }));

  useEffect(() => {
    if (!isEnabled) {
      setState((prev) => (prev.ready || prev.failed ? { ready: false, failed: false } : prev));
      return;
    }
    if (loadedModule) {
      setState({ ready: true, failed: false });
      return;
    }

    let cancelled = false;
    loadLiquidGlass().then((mod) => {
      if (cancelled) return;
      if (mod) {
        setState({ ready: true, failed: false });
      } else {
        setState({ ready: false, failed: true });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isEnabled]);

  return isEnabled ? state : { ready: false, failed: false };
}

/**
 * Shows a Liquid Glass toast via dynamic import on desktop, or dispatches
 * the lightweight native ToastContainer event on phones/touch devices.
 */
export async function showLiquidToast(
  message: string,
  options: ToastOptions = {}
): Promise<ToastHandle | null> {
  if (shouldUseHeavyLiquidGlass()) {
    const mod = await loadLiquidGlass();
    if (mod && typeof mod.toast === 'function') {
      try {
        return mod.toast(message, {
          tone: 'light',
          ...options,
        });
      } catch {
        // Fallback below
      }
    }
  }

  if (typeof window !== 'undefined') {
    const type = options.icon === 'alert' ? 'error' : options.icon === 'info' ? 'info' : 'success';
    window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } }));
  }
  return null;
}
