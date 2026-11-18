const MODAL_ROOT_ID = 'modal-root';
let activeModalCount = 0;
let previousBodyOverflow: string | null = null;

/**
 * Returns a stable portal container directly under `document.body` so modals,
 * toasts, and popovers never get trapped inside ancestor stacking contexts
 * (`backdrop-filter`, `transform`, `will-change`, or `z-index`).
 */
export function getPortalRoot(): HTMLElement | null {
  if (typeof document === 'undefined') return null;

  let root = document.getElementById(MODAL_ROOT_ID);
  if (!root && document.body) {
    root = document.createElement('div');
    root.id = MODAL_ROOT_ID;
    document.body.appendChild(root);
  }
  return root;
}

/**
 * Ref-counted body scroll lock + `taklifim-modal-open` state class on `<html>`
 * so bottom navigation bars hide cleanly whenever at least one modal is open.
 */
export function acquireModalScrollLock(): () => void {
  if (typeof document === 'undefined') return () => {};

  if (activeModalCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.classList.add('taklifim-modal-open');
  }
  activeModalCount += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeModalCount = Math.max(0, activeModalCount - 1);
    if (activeModalCount === 0) {
      document.body.style.overflow = previousBodyOverflow ?? '';
      previousBodyOverflow = null;
      document.documentElement.classList.remove('taklifim-modal-open');
    }
  };
}
