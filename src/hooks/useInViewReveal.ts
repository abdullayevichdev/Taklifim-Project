import { useEffect, useRef, useState } from 'react';

export interface UseInViewRevealOptions {
  /** Root margin around viewport. Positive bottom/top values trigger slightly ahead of scroll. */
  rootMargin?: string;
  /** Intersection ratio threshold (default 0.08). */
  threshold?: number;
}

/**
 * Lightweight, 60-FPS scroll-reveal hook.
 * Uses a single IntersectionObserver per section/group, immediately unobserves
 * after reveal, and honors `prefers-reduced-motion: reduce`.
 */
export function useInViewReveal<T extends HTMLElement = HTMLDivElement>(
  options: UseInViewRevealOptions = {}
) {
  const { rootMargin = '40px 0px -28px 0px', threshold = 0.08 } = options;
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return true;
    if (typeof IntersectionObserver === 'undefined') return true;
    return false;
  });

  useEffect(() => {
    if (isVisible) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.intersectionRatio > 0) {
            setIsVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [isVisible, rootMargin, threshold]);

  return { ref, isVisible } as const;
}
