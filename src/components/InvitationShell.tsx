import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { ArrowRight, Heart } from 'lucide-react';
import { CoverVideo } from './CoverVideo';
import { AnimatedEnvelopeCover } from './cover/AnimatedEnvelopeCover';
import { getCoverTheme } from './cover/coverThemes';

export interface InvitationShellProps {
  /** Controlled opened state. When omitted, InvitationShell manages open state internally. */
  isOpened?: boolean;
  /** Called immediately when user clicks open (before cover fade-out completes) */
  onOpenStart?: () => void;
  /** Called after the cover fade-out transition completes when opening */
  onOpen?: () => void;
  /** Trigger celebratory confetti burst when opening */
  enableConfetti?: boolean;
  /** Custom confetti palette */
  confettiColors?: string[];
  /** Fade-out duration (ms) before unmounting CoverVideo and showing opened content */
  openTransitionMs?: number;
  /**
   * 'frame' fills a phone/desktop preview frame (HomePage, BuilderPage, TemplateDetailPage).
   * 'fullscreen' fills the guest viewport on mobile and centers a framed portrait stage on desktop.
   */
  variant?: 'frame' | 'fullscreen';
  /** Border radius class matching the enclosing frame (e.g. rounded-[36px], rounded-[42px]) */
  frameRadiusClass?: string;
  /** Compact spacing for smaller preview frames */
  compact?: boolean;
  /** Header eyebrow text (e.g. "Taklifnoma") */
  headerLabel?: string;
  /** Ceremony subtitle (e.g. "To‘y & Nikoh Marosimi") */
  ceremonyLabel?: string;
  /** Couple / host display names */
  hostNames?: string;
  /** Optional short quote or date/venue caption */
  subtitleText?: string;
  /** Main CTA button label (e.g. "Taklifnomani ochish") */
  openButtonLabel?: string;
  /** Optional subtle hint below button */
  hintText?: string;
  /** Optional floating top overlay (e.g. language switcher on guest page) */
  coverTopOverlay?: React.ReactNode;
  /** Optional footer badge below CTA (e.g. "Taklifim platformasida yaratildi") */
  coverFooterOverlay?: React.ReactNode;
  /**
   * Template slug or id (e.g. "template-5" / "tpl-5"). Selects the template's own animated
   * envelope cover; templates without a theme (and template-1) use the cinematic cover video.
   */
  coverTemplate?: string;
  /** Background fallback behind poster */
  fallbackBgColor?: string;
  /** Backdrop behind desktop portrait stage in fullscreen mode */
  backdropImage?: string;
  /** Extra classes on root wrapper */
  className?: string;
  /** Opened invitation content rendered once opened */
  children: React.ReactNode;
}

const DEFAULT_CONFETTI_COLORS = [
  '#C64873',
  '#B48B47',
  '#FFD700',
  '#F5C9D8',
  '#B9DFFA',
  '#FFFFFF',
];

export const InvitationShell: React.FC<InvitationShellProps> = ({
  isOpened: controlledIsOpen,
  onOpenStart,
  onOpen,
  enableConfetti = false,
  confettiColors = DEFAULT_CONFETTI_COLORS,
  openTransitionMs = 420,
  variant = 'frame',
  frameRadiusClass = 'rounded-[36px]',
  compact = false,
  headerLabel = 'Taklifnoma',
  ceremonyLabel,
  hostNames = 'Nodirbek & Malika',
  subtitleText,
  openButtonLabel = 'Taklifnomani ochish',
  hintText,
  coverTopOverlay,
  coverFooterOverlay,
  coverTemplate,
  fallbackBgColor = '#FAF6F0',
  backdropImage,
  className = '',
  children,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const coverTheme = getCoverTheme(coverTemplate);
  // Animated envelopes play their own opening sequence (flaps, doors, curtains, ribbons).
  const effectiveOpenMs = coverTheme ? Math.max(openTransitionMs, 1300) : openTransitionMs;
  const [isClosingCover, setIsClosingCover] = useState(false);
  const openTimerRef = useRef<number | null>(null);

  const isOpened = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  // Reset closing state if parent re-closes the cover (e.g., Builder cover replay toggle)
  useEffect(() => {
    if (!isOpened) {
      setIsClosingCover(false);
    }
  }, [isOpened]);

  useEffect(() => {
    return () => {
      if (openTimerRef.current !== null) {
        window.clearTimeout(openTimerRef.current);
        openTimerRef.current = null;
      }
    };
  }, []);

  const triggerConfetti = () => {
    if (!enableConfetti) return;
    try {
      confetti({
        particleCount: compact ? 75 : 180,
        spread: compact ? 75 : 115,
        origin: { y: 0.55, x: 0.5 },
        colors: confettiColors,
        ticks: compact ? 200 : 320,
        gravity: 0.78,
        scalar: compact ? 0.95 : 1.2,
      });
      if (!compact) {
        window.setTimeout(() => {
          confetti({
            particleCount: 110,
            angle: 60,
            spread: 68,
            origin: { x: 0, y: 0.7 },
            colors: confettiColors,
            ticks: 280,
            gravity: 0.85,
          });
          confetti({
            particleCount: 110,
            angle: 120,
            spread: 68,
            origin: { x: 1, y: 0.7 },
            colors: confettiColors,
            ticks: 280,
            gravity: 0.85,
          });
        }, 180);
      }
    } catch {
      // ignore confetti errors in headless/restricted environments
    }
  };

  const handleOpenClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOpened || isClosingCover) return;

    // Immediately pause CoverVideo and start smooth fade-out
    setIsClosingCover(true);
    onOpenStart?.();
    triggerConfetti();

    openTimerRef.current = window.setTimeout(() => {
      openTimerRef.current = null;
      if (controlledIsOpen === undefined) {
        setInternalIsOpen(true);
      }
      setIsClosingCover(false);
      onOpen?.();
    }, effectiveOpenMs);
  };

  // Unmount cover & CoverVideo completely once opened and fade-out completes
  const shouldMountCover = !isOpened || isClosingCover;

  if (variant === 'fullscreen') {
    return (
      <div className={`relative w-full min-h-screen ${className}`}>
        {isOpened && <div className="animate-fadeIn">{children}</div>}

        {shouldMountCover && (
          <div
            className={`fixed inset-0 z-50 flex items-center justify-center sm:p-6 overflow-hidden transition-opacity duration-400 ease-out ${
              isClosingCover
              ? coverTheme
                ? 'tk-shell-exit pointer-events-none'
                : 'opacity-0 pointer-events-none'
              : 'opacity-100'
            }`}
            style={{ backgroundColor: fallbackBgColor }}
          >
            {/* Ambient backdrop on desktop screens outside the portrait stage */}
            {backdropImage && (
              <div
                aria-hidden="true"
                className="hidden sm:block fixed inset-0 pointer-events-none -z-10 bg-cover bg-center opacity-25 scale-105"
                style={{ backgroundImage: `url(${backdropImage})` }}
              />
            )}

            {coverTopOverlay && (
              <div className="fixed sm:absolute top-3 left-3 right-3 z-40 flex items-center justify-between pointer-events-none">
                <div className="pointer-events-auto">{coverTopOverlay}</div>
              </div>
            )}

            {/* Full-viewport on mobile (390x844), sleek portrait stage on desktop (1440x900) */}
            <div
              className="relative w-full h-[100dvh] sm:h-[min(88vh,780px)] sm:max-w-[420px] sm:rounded-[38px] overflow-hidden shadow-2xl sm:ring-1 sm:ring-white/80 flex flex-col justify-end"
              style={{ backgroundColor: fallbackBgColor }}
            >
              {coverTheme ? (
                <AnimatedEnvelopeCover
                  theme={coverTheme}
                  hostNames={hostNames}
                  fadingOut={isClosingCover}
                  className="sm:rounded-[38px]"
                />
              ) : (
                <CoverVideo
                  active={!isClosingCover}
                  fadingOut={isClosingCover}
                  className="sm:rounded-[38px]"
                />
              )}

              {/* Bottom CTA Area — only "Taklifnomani ochish" button over video */}
              <div className="relative z-30 pb-8 sm:pb-7 px-5 flex flex-col items-center">
                <button
                  type="button"
                  disabled={isClosingCover}
                  onClick={handleOpenClick}
                  className={`${isClosingCover ? '!opacity-0' : ''} taklifim-cover-cta min-h-[48px] w-full max-w-[290px] px-6 py-3 rounded-full font-extrabold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 group disabled:opacity-75`}
                >
                  <Heart className="w-4 h-4 text-[#C64873] fill-[#C64873] shrink-0" aria-hidden="true" />
                  <span className="truncate">{openButtonLabel}</span>
                  <ArrowRight className="w-4 h-4 text-[#C64873] group-hover:translate-x-1 transition-transform shrink-0" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 'frame' variant: fills enclosing phone/desktop preview frame 100% edge-to-edge
  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Opened content mounts cleanly once opened */}
      {isOpened && (
        <div className="w-full h-full animate-fadeIn">
          {children}
        </div>
      )}

      {/* Cover overlay with CoverVideo — unmounts completely once opened */}
      {shouldMountCover && (
        <div
          className={`absolute inset-0 w-full h-full ${frameRadiusClass} overflow-hidden flex flex-col justify-end z-20 transition-opacity duration-400 ease-out ${
            isClosingCover
              ? coverTheme
                ? 'tk-shell-exit pointer-events-none'
                : 'opacity-0 pointer-events-none'
              : 'opacity-100'
          }`}
          style={{ backgroundColor: fallbackBgColor }}
        >
          {coverTheme ? (
            <AnimatedEnvelopeCover
              theme={coverTheme}
              hostNames={hostNames}
              fadingOut={isClosingCover}
              className={frameRadiusClass}
            />
          ) : (
            <CoverVideo
              active={!isClosingCover}
              fadingOut={isClosingCover}
              className={frameRadiusClass}
            />
          )}

          {/* Bottom Floating "Taklifnomani ochish" Liquid Glass CTA */}
          <div
            className={`relative z-30 ${
              compact ? 'pb-5 px-3' : 'pb-6 px-4'
            } flex flex-col items-center`}
          >
            <button
              type="button"
              disabled={isClosingCover}
              onClick={handleOpenClick}
              className={`${isClosingCover ? '!opacity-0' : ''} taklifim-cover-cta min-h-[44px] px-5 py-2.5 rounded-full font-extrabold text-xs tracking-wide flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 group disabled:opacity-75`}
            >
              <Heart className="w-3.5 h-3.5 text-[#C64873] fill-[#C64873] shrink-0" aria-hidden="true" />
              <span className="truncate">{openButtonLabel}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#C64873] group-hover:translate-x-1 transition-transform shrink-0" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvitationShell;
