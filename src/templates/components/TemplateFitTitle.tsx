import React, { useLayoutEffect, useRef, useState } from 'react';

export interface TemplateFitTitleProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  /** Desktop max size in px (default 48px matching text-5xl; PearlMinimal uses 56px) */
  maxFontSize?: number;
  /** Minimum readable size in px when scaling down ultra-long names (default 13px) */
  minFontSize?: number;
}

function splitCoupleNames(raw: string): { left: string; sep: string; right: string } | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(.+?)\s+(&|va|и)\s+(.+)$/i);
  if (!match) return null;
  return {
    left: match[1].trim(),
    sep: match[2],
    right: match[3].trim(),
  };
}

/**
 * Container-aware responsive invitation hero title.
 * 1) Base font-size scales via CSS `cqw` (container inline-size) instead of browser breakpoints.
 * 2) Splits "Partner1 & Partner2" cleanly across centered lines before shrinking if the combined
 *    single line exceeds the container width.
 * 3) Uses a synchronous ResizeObserver + layout measurement to shrink font-size step-by-step
 *    down to `minFontSize` when a single unbroken name is still wider than the frame, preventing
 *    horizontal clipping or mid-word breaks.
 */
export const TemplateFitTitle: React.FC<TemplateFitTitleProps> = ({
  text,
  className = '',
  style,
  maxFontSize = 48,
  minFontSize = 13,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [stackNames, setStackNames] = useState(false);
  const [fittedPx, setFittedPx] = useState<number | null>(null);
  const [allowAnywhereWrap, setAllowAnywhereWrap] = useState(false);

  const couple = splitCoupleNames(text);
  const isUppercase = className.includes('uppercase');
  const cqwMaxRem = (maxFontSize / 16).toFixed(3);
  const baseFontCss = `clamp(${minFontSize}px, 8.4cqw, ${cqwMaxRem}rem)`;

  useLayoutEffect(() => {
    const container = containerRef.current;
    const heading = headingRef.current;
    if (!container || !heading) return;

    let rafId = 0;

    const measureAndFit = () => {
      const availWidth = container.clientWidth;
      if (availWidth <= 0) return;

      // Step 1: reset overrides back to container-query clamp(...) base font-size
      heading.style.fontSize = baseFontCss;
      const computedBase = parseFloat(window.getComputedStyle(heading).fontSize) || 32;
      const targetBase = Math.min(maxFontSize, Math.max(minFontSize, computedBase));
      heading.style.fontSize = `${targetBase}px`;

      // Decide whether "A & B" should stack cleanly into 3 centered lines
      let shouldStack = false;
      if (couple) {
        const spans = heading.querySelectorAll<HTMLElement>('[data-fit-part]');
        if (spans.length === 3) {
          heading.dataset.forceInline = '1';
          const singleWidth = heading.scrollWidth;
          delete heading.dataset.forceInline;
          if (singleWidth > availWidth - 2) {
            shouldStack = true;
          }
        }
      }

      setStackNames(shouldStack);

      // Measure width of the widest rendered part at targetBase
      let overflowWidth = heading.scrollWidth;

      if (shouldStack && couple) {
        const parts = Array.from(heading.querySelectorAll<HTMLElement>('[data-fit-part]'));
        if (parts.length > 0) {
          overflowWidth = Math.max(
            0,
            ...parts.map((el) => {
              const prevDisplay = el.style.display;
              const prevWidth = el.style.width;
              el.style.display = 'inline-block';
              el.style.width = 'max-content';
              const w = el.getBoundingClientRect().width;
              el.style.display = prevDisplay;
              el.style.width = prevWidth;
              return w;
            })
          );
        }
      }

      if (overflowWidth > availWidth - 1) {
        const ratio = (availWidth - 2) / overflowWidth;
        const nextPx = Math.max(minFontSize, Math.floor(targetBase * ratio * 10) / 10);
        heading.style.fontSize = `${nextPx}px`;

        // Fine-tune in 1px steps if font kerning/serif overhang still nudges scrollWidth
        let guard = 0;
        let tunedPx = nextPx;
        while (heading.scrollWidth > availWidth && tunedPx > minFontSize && guard < 16) {
          tunedPx = Math.max(minFontSize, tunedPx - 1);
          heading.style.fontSize = `${tunedPx}px`;
          guard += 1;
        }

        setFittedPx(tunedPx);
        setAllowAnywhereWrap(heading.scrollWidth > availWidth + 1);
      } else {
        heading.style.fontSize = baseFontCss;
        setFittedPx(null);
        setAllowAnywhereWrap(false);
      }
    };

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(rafId);
      measureAndFit();
      rafId = window.requestAnimationFrame(measureAndFit);
    };

    scheduleMeasure();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => scheduleMeasure());
      observer.observe(container);
    }

    let cancelled = false;
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!cancelled) scheduleMeasure();
      });
    }

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
      observer?.disconnect();
    };
  }, [text, maxFontSize, minFontSize, isUppercase, style?.fontFamily, Boolean(couple), baseFontCss]);

  return (
    <div ref={containerRef} className="w-full min-w-0 max-w-full flex justify-center">
      <h1
        ref={headingRef}
        className={`taklifim-tpl-fit-title ${className}`}
        style={{
          ...style,
          fontSize: fittedPx !== null ? `${fittedPx}px` : baseFontCss,
          overflowWrap: allowAnywhereWrap ? 'anywhere' : 'normal',
          wordBreak: 'normal',
          hyphens: 'none',
        }}
      >
        {couple ? (
          <span
            className={`w-full max-w-full flex items-center justify-center text-center ${
              stackNames ? 'flex-col gap-[0.06em]' : 'flex-wrap gap-x-[0.26em] gap-y-[0.06em]'
            }`}
          >
            <span data-fit-part className="max-w-full text-center leading-[1.08]">
              {couple.left}
            </span>
            <span
              data-fit-part
              className="max-w-full text-center leading-[1.0] opacity-90"
              style={{ fontSize: stackNames ? '0.78em' : '0.92em' }}
            >
              {couple.sep}
            </span>
            <span data-fit-part className="max-w-full text-center leading-[1.08]">
              {couple.right}
            </span>
          </span>
        ) : (
          <span className="block w-full max-w-full text-center leading-[1.12]">{text}</span>
        )}
      </h1>
    </div>
  );
};
