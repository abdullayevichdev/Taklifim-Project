import React, { useEffect, useRef } from 'react';
import { LgNavbarElement } from '../../types/liquidglass';
import { GlassControlBoundary } from '../ErrorBoundary';
import { useLiquidGlassReady } from './loader';

export interface GlassNavbarItem {
  to: string;
  matchPaths?: string[];
  label: string;
  icon?: React.ReactNode;
}

export interface GlassNavbarProps {
  items: GlassNavbarItem[];
  currentPath: string;
  onNavigate: (to: string) => void;
  ariaLabel?: string;
  className?: string;
  cssOnly?: boolean;
}

function normalizePath(p: string): string {
  const withoutQuery = p.split('?')[0];
  if (withoutQuery.length > 1 && withoutQuery.endsWith('/')) {
    return withoutQuery.slice(0, -1);
  }
  return withoutQuery || '/';
}

function findActiveIndex(items: GlassNavbarItem[], currentPath: string): number {
  const clean = normalizePath(currentPath);

  const exact = items.findIndex((item) => {
    if (item.to === clean) return true;
    return item.matchPaths?.includes(clean) ?? false;
  });
  if (exact >= 0) return exact;

  const prefix = items.findIndex((item) => {
    if (item.to !== '/' && clean.startsWith(item.to)) return true;
    return item.matchPaths?.some((mp) => mp !== '/' && clean.startsWith(mp)) ?? false;
  });
  return prefix;
}

/**
 * React 19-safe wrapper around <lg-navbar> with GlassControlBoundary fallback.
 */
export const GlassNavbar: React.FC<GlassNavbarProps> = ({
  items,
  currentPath,
  onNavigate,
  ariaLabel = 'Primary navigation',
  className = '',
  cssOnly = false,
}) => {
  const { ready, failed } = useLiquidGlassReady(!cssOnly);
  const navRef = useRef<LgNavbarElement | null>(null);

  const activeIndex = findActiveIndex(items, currentPath);
  const structureKey = items.map((i) => i.to).join('|');
  const labelsKey = items.map((i) => i.label).join('|');

  useEffect(() => {
    const el = navRef.current;
    if (!el || !ready || failed || cssOnly) return;

    try {
      const links = Array.from(el.querySelectorAll(':scope > a, :scope > button'));
      links.forEach((link, idx) => {
        if (idx === activeIndex) {
          link.setAttribute('aria-current', 'page');
        } else {
          link.removeAttribute('aria-current');
        }
      });

      if (activeIndex >= 0 && typeof el.setCurrent === 'function') {
        el.setCurrent(activeIndex);
      }
    } catch {
      // Ignore
    }
  }, [activeIndex, structureKey, ready, failed, cssOnly]);

  useEffect(() => {
    const el = navRef.current;
    if (!el || !ready || failed || cssOnly) return;
    let raf = 0;
    try {
      if (typeof el.refresh === 'function') {
        el.refresh();
        raf = window.requestAnimationFrame(() => {
          try {
            el.refresh();
            if (activeIndex >= 0 && typeof el.setCurrent === 'function') {
              el.setCurrent(activeIndex);
            }
          } catch {
            // Ignore
          }
        });
      }
    } catch {
      // Ignore
    }
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [labelsKey, structureKey, activeIndex, ready, failed, cssOnly]);

  const fallbackNav = (
    <nav
      key={`css-${structureKey}`}
      aria-label={ariaLabel}
      className={`taklifim-top-navbar inline-flex items-center gap-1 p-1 rounded-full glass-surface ${className}`}
    >
      {items.map((item, idx) => {
        const isActive = idx === activeIndex;
        return (
          <a
            key={item.to}
            href={item.to}
            aria-current={isActive ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault();
              onNavigate(item.to);
            }}
            className={`inline-flex items-center gap-1.5 h-9 px-3 xl:px-3.5 rounded-full text-xs xl:text-[13px] font-medium whitespace-nowrap transition-all duration-200 ${
              isActive
                ? 'bg-white text-[#1E1418] font-semibold shadow-sm'
                : 'text-[#5C4F48] hover:text-[#1E1418] hover:bg-white/60'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </a>
        );
      })}
    </nav>
  );

  if (cssOnly || !ready || failed || items.length === 0) {
    return fallbackNav;
  }

  return (
    <GlassControlBoundary fallback={fallbackNav}>
      <lg-navbar
        key={`lg-${structureKey}`}
        ref={navRef}
        tone="light"
        radius="capsule"
        aria-label={ariaLabel}
        className={`taklifim-top-navbar ${className}`}
      >
        {items.map((item, idx) => {
          const isActive = idx === activeIndex;
          return (
            <a
              key={item.to}
              href={item.to}
              aria-current={isActive ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(item.to);
              }}
            >
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                {item.icon}
                <span>{item.label}</span>
              </span>
            </a>
          );
        })}
      </lg-navbar>
    </GlassControlBoundary>
  );
};
