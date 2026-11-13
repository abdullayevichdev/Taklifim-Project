import type { ToastHandle, ToastOptions } from '../../types/liquidglass';

export function toast(message: string, options?: ToastOptions): ToastHandle;
export function createGlass(element: HTMLElement, options?: Record<string, unknown>): {
  update: (next?: Record<string, unknown>) => void;
  destroy: () => void;
};
export function createSpring(
  initial: number,
  onUpdate: (value: number, velocity: number) => void,
  config?: { stiffness?: number; damping?: number }
): {
  set: (target: number, options?: { immediate?: boolean }) => void;
};
export const engine: 'blink' | 'webkit' | 'gecko';
export const DEFAULTS: Readonly<Record<string, unknown>>;
