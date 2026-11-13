import { useEffect, useState } from 'react';
import type { ToastHandle, ToastOptions } from '../../types/liquidglass';

type ComponentsModule = typeof import('../../vendor/liquidglass/components.js');

let loadPromise: Promise<ComponentsModule | null> | null = null;
let loadedModule: ComponentsModule | null = null;

/**
 * Dynamically loads the vendored liquidglass.dev Web Components (v1.0.0)
 * on demand so pages that do not render interactive glass web components
 * do not pay the bundle cost upfront.
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
 * and indicates once custom elements are registered and upgraded.
 */
export function useLiquidGlassReady(enabled = true): { ready: boolean; failed: boolean } {
  const [state, setState] = useState<{ ready: boolean; failed: boolean }>(() => ({
    ready: loadedModule !== null,
    failed: false,
  }));

  useEffect(() => {
    if (!enabled) return;
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
  }, [enabled]);

  return state;
}

/**
 * Shows a Liquid Glass toast via dynamic import, falling back gracefully to
 * the app's native ToastContainer event if the library cannot be loaded.
 */
export async function showLiquidToast(
  message: string,
  options: ToastOptions = {}
): Promise<ToastHandle | null> {
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

  if (typeof window !== 'undefined') {
    const type = options.icon === 'alert' ? 'error' : options.icon === 'info' ? 'info' : 'success';
    window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } }));
  }
  return null;
}
