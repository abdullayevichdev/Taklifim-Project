import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MotifShape } from './MotifShape';
import { getTheme3D, Theme3D } from './themes';

/* Deterministic pseudo-random so objects keep their places between renders. */
const rand = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------------ floating objects */
/** Objects that drift and tumble in 3D behind the invitation content (transform/opacity only). */
const Floating3DLayer: React.FC<{ theme: Theme3D; compact: boolean; front?: boolean }> = ({ theme, compact, front = false }) => {
  const count = front ? (compact ? 4 : 6) : compact ? 7 : 12;
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const r = (k: number) => rand(i * 7 + k + (front ? 101 : 0));
        // front objects stay in the side margins so they never cover text
        const left = front ? (i % 2 === 0 ? -2 + r(1) * 9 : 91 + r(1) * 9) : 4 + r(1) * 88;
        return {
          motif: theme.motifs[i % 3 === 2 ? 1 : 0] || theme.motifs[0],
          left,
          top: 2 + (i / count) * 94 + r(2) * 4,
          size: front ? 14 + r(3) * 12 : 18 + r(3) * (compact ? 18 : 26),
          depth: front ? Math.round(40 + r(4) * 80) : Math.round(-160 + r(4) * 220),
          dur: 9 + r(5) * 9,
          delay: -r(6) * 12,
          spin: r(7) > 0.5 ? 1 : -1,
          tilt: Math.round(r(8) * 60 - 30),
          opacity: front ? 0.55 + r(9) * 0.3 : 0.45 + r(9) * 0.45,
        };
      }),
    [count, theme]
  );

  return (
    <div className={`tpl3d-float-layer ${front ? 'tpl3d-float-front' : ''}`} aria-hidden="true">
      {items.map((it, i) => (
        <div
          key={i}
          className="tpl3d-float"
          style={
            {
              left: `${it.left}%`,
              top: `${it.top}%`,
              width: it.size,
              height: it.size,
              opacity: it.opacity,
              '--z': `${it.depth}px`,
              '--tilt': `${it.tilt}deg`,
              '--spin': it.spin,
              animationDuration: `${it.dur}s`,
              animationDelay: `${it.delay}s`,
            } as React.CSSProperties
          }
        >
          {it.motif === 'butterfly' ? (
            <div className="tpl3d-butterfly" style={{ animationDelay: `${it.delay}s` }}>
              <div className="tpl3d-wing tpl3d-wing-l">
                <MotifShape motif="butterfly" c1={theme.c1} c2={theme.c2} className="w-full h-full" />
              </div>
              <div className="tpl3d-wing tpl3d-wing-r">
                <MotifShape motif="butterfly" c1={theme.c1} c2={theme.c2} className="w-full h-full" />
              </div>
            </div>
          ) : (
            <div className="tpl3d-tumble" style={{ animationDuration: `${it.dur * 0.9}s`, animationDelay: `${it.delay}s` }}>
              <MotifShape motif={it.motif} c1={theme.c1} c2={theme.c2} className="w-full h-full" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------ opening shower */
/** One-shot: theme objects tumble down through the first screen when the invitation opens. */
const OpeningShower: React.FC<{ theme: Theme3D; compact: boolean }> = ({ theme, compact }) => {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setDone(true), 7500);
    return () => window.clearTimeout(t);
  }, []);
  const items = useMemo(
    () =>
      Array.from({ length: compact ? 12 : 18 }, (_, i) => {
        const r = (k: number) => rand(i * 13 + k + 500);
        return {
          motif: theme.motifs[i % 4 === 3 ? 1 : 0] || theme.motifs[0],
          left: r(1) * 100,
          size: 14 + r(2) * 18,
          dur: 3.6 + r(3) * 2.4,
          delay: r(4) * 1.4,
          sway: Math.round(r(5) * 80 - 40),
        };
      }),
    [compact, theme]
  );
  if (done || prefersReducedMotion()) return null;
  return (
    <div className="tpl3d-shower" aria-hidden="true">
      {items.map((it, i) => (
        <div
          key={i}
          className="tpl3d-shower-item"
          style={
            {
              left: `${it.left}%`,
              width: it.size,
              height: it.size,
              animationDuration: `${it.dur}s`,
              animationDelay: `${it.delay}s`,
              '--sway': `${it.sway}px`,
            } as React.CSSProperties
          }
        >
          <div className="tpl3d-tumble" style={{ animationDuration: `${it.dur * 0.7}s` }}>
            {it.motif === 'butterfly' ? (
              <MotifShape motif="butterfly" c1={theme.c1} c2={theme.c2} className="w-full h-full" />
            ) : (
              <MotifShape motif={it.motif} c1={theme.c1} c2={theme.c2} className="w-full h-full" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ------------------------------------------------------------------ 3D medallion */
function initialsOf(names: string): string {
  const parts = names
    .split(/\s*(?:&|\+|va|и|and)\s*/i)
    .map((p) => p.trim())
    .filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase());
  return letters.length === 2 ? `${letters[0]}&${letters[1]}` : (names.trim().charAt(0) || '♥').toUpperCase();
}

/**
 * A slowly spinning 3D coin: the couple's initials on the front, the template symbol and the date on the back.
 * Tap / click flips it; it stops spinning for people who prefer reduced motion.
 */
const Medallion3D: React.FC<{ theme: Theme3D; names: string; date?: string; headingFont?: string; compact: boolean }> = ({
  theme,
  names,
  date,
  headingFont,
  compact,
}) => {
  const [flipped, setFlipped] = useState(false);
  const initials = initialsOf(names);
  const size = compact ? 104 : 128;
  const layers = 7; // rim thickness
  const face = (back: boolean): React.CSSProperties => ({
    background: `radial-gradient(circle at 32% 28%, ${theme.face1}, ${theme.face2} 72%)`,
    boxShadow: `inset 0 0 0 3px ${theme.rim}, inset 0 0 0 7px ${theme.face1}55, inset 0 -10px 22px rgba(0,0,0,.18)`,
    transform: `${back ? 'rotateY(180deg) ' : ''}translateZ(${layers / 2 + 0.5}px)`,
  });

  return (
    <div className="tpl3d-medallion-wrap" style={{ height: size + 46 }}>
      <div
        className="tpl3d-halo"
        style={{
          width: size * 1.9,
          height: size * 1.9,
          top: 18 + size / 2 - (size * 1.9) / 2,
          background: `radial-gradient(closest-side, ${theme.c1}66, transparent)`,
        }}
      />
      <div
        className="tpl3d-orbit-stage"
        style={{ width: size * 2.3, height: size * 2.3, top: 18 + size / 2 - (size * 2.3) / 2 }}
        aria-hidden="true"
      >
        <div className="tpl3d-orbit">
          {[0, 1, 2, 3, 4, 5].map((k) => (
            <div
              key={k}
              className="tpl3d-orbit-item"
              style={{ transform: `rotateZ(${k * 60}deg) translateX(${size * 0.92}px) rotateZ(${-k * 60}deg) rotateX(-68deg)` }}
            >
              <MotifShape
                motif={theme.motifs[k % 2 === 0 ? 0 : 1] || theme.motifs[0]}
                c1={theme.c1}
                c2={theme.c2}
                className="w-full h-full"
              />
            </div>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="tpl3d-medallion-stage"
        style={{ width: size, height: size }}
        onClick={() => setFlipped((f) => !f)}
        aria-label={`${names}${date ? ` — ${date}` : ''}`}
      >
        <div className={`tpl3d-coin ${flipped ? 'is-flipped' : ''}`}>
          {Array.from({ length: layers }, (_, i) => (
            <div
              key={i}
              className="tpl3d-coin-rim"
              style={{ background: theme.rim, transform: `translateZ(${i - layers / 2}px)`, filter: `brightness(${0.75 + (i / layers) * 0.35})` }}
            />
          ))}
          <div className="tpl3d-coin-face" style={face(false)}>
            <svg className="tpl3d-coin-ring" viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r="41" fill="none" stroke={theme.rim} strokeWidth="1.2" strokeDasharray="1 4.2" strokeLinecap="round" opacity=".9" />
              <circle cx="50" cy="50" r="45.5" fill="none" stroke={theme.rim} strokeWidth=".8" opacity=".55" />
            </svg>
            <span
              className="tpl3d-coin-initials"
              style={{ color: theme.ink, fontFamily: headingFont || 'Cormorant Garamond', fontSize: compact ? 30 : 38 }}
            >
              {initials}
            </span>
            <span className="tpl3d-coin-shine" />
          </div>
          <div className="tpl3d-coin-face" style={face(true)}>
            <MotifShape motif={theme.emblem} c1={theme.ink} c2={theme.rim} className="w-[44%] h-[44%]" />
            {date && (
              <span className="tpl3d-coin-date" style={{ color: theme.ink }}>
                {date}
              </span>
            )}
            <span className="tpl3d-coin-shine" />
          </div>
        </div>
      </button>
      <div className="tpl3d-coin-shadow" style={{ width: size * 0.7 }} />
    </div>
  );
};

/* ------------------------------------------------------------------ scene wrapper */
interface Template3DSceneProps {
  templateSlug: string;
  hostNames: string;
  eventDate?: string;
  headingFont?: string;
  background: string;
  isPreview?: boolean;
  children: React.ReactNode;
}

/**
 * Adds the 3D layer to any template:
 *  - spinning initials medallion above the content,
 *  - tumbling theme objects in depth behind it,
 *  - sections that rise out of depth as they scroll into view,
 *  - a hero card that tilts with the pointer (desktop) or the phone's motion (Android; iOS needs no prompt — tilt simply stays off).
 * Everything uses transform/opacity only and switches off with prefers-reduced-motion.
 */
export const Template3DScene: React.FC<Template3DSceneProps> = ({
  templateSlug,
  hostNames,
  eventDate,
  headingFont,
  background,
  isPreview = false,
  children,
}) => {
  const theme = getTheme3D(templateSlug);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [compact, setCompact] = useState(() => isPreview || (typeof window !== 'undefined' && window.innerWidth < 640));

  useEffect(() => {
    if (isPreview) return;
    const mq = window.matchMedia?.('(max-width: 639px)');
    const update = () => setCompact(!!mq?.matches);
    update();
    mq?.addEventListener?.('change', update);
    return () => mq?.removeEventListener?.('change', update);
  }, [isPreview]);

  // Pause all looping animations while the tab is hidden (battery).
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onVis = () => el.classList.toggle('tpl3d-paused', document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Sections rise out of depth when they enter the viewport.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return;
    const sections = Array.from(root.querySelectorAll<HTMLElement>('.taklifim-tpl-wrap > *'));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('tpl3d-in');
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
    sections.forEach((s, i) => {
      s.classList.add('tpl3d-reveal');
      s.style.setProperty('--tpl3d-delay', `${Math.min(i, 2) * 80}ms`);
      io.observe(s);
    });
    return () => {
      io.disconnect();
      sections.forEach((s) => s.classList.remove('tpl3d-reveal', 'tpl3d-in'));
    };
  }, [templateSlug]);

  // Hero card tilt: pointer on desktop, device orientation on phones that allow it without a prompt.
  useEffect(() => {
    const root = rootRef.current;
    const card = root?.querySelector<HTMLElement>('.taklifim-tpl-hero-card');
    if (!card || prefersReducedMotion()) return;
    card.classList.add('tpl3d-tilt');
    let raf = 0;
    const apply = (rx: number, ry: number) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        card.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
        card.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
      });
    };
    const fine = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
    const onMove = (e: PointerEvent) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      apply(-py * 8, px * 10);
    };
    const onLeave = () => apply(0, 0);
    const needsPermission =
      typeof (window as any).DeviceOrientationEvent?.requestPermission === 'function';
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      apply(Math.max(-7, Math.min(7, (e.beta - 45) / 5)), Math.max(-9, Math.min(9, e.gamma / 4)));
    };
    if (fine) {
      card.addEventListener('pointermove', onMove);
      card.addEventListener('pointerleave', onLeave);
    } else if (!needsPermission && !isPreview) {
      window.addEventListener('deviceorientation', onOrient, { passive: true });
    }
    return () => {
      cancelAnimationFrame(raf);
      card.removeEventListener('pointermove', onMove);
      card.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('deviceorientation', onOrient);
      card.classList.remove('tpl3d-tilt');
    };
  }, [templateSlug, isPreview]);

  return (
    <div ref={rootRef} className={`tpl3d-root ${theme.dark ? 'tpl3d-dark' : ''}`} style={{ backgroundColor: background }}>
      <Floating3DLayer theme={theme} compact={compact} />
      <Floating3DLayer theme={theme} compact={compact} front />
      {!isPreview && <OpeningShower theme={theme} compact={compact} />}
      <Medallion3D theme={theme} names={hostNames || '♥'} date={eventDate} headingFont={headingFont} compact={compact} />
      {children}
    </div>
  );
};

export default Template3DScene;
