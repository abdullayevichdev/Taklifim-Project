import React, { useEffect, useRef, useState } from 'react';

interface NetworkInformationLike {
  saveData?: boolean;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

interface CoverVideoController {
  id: symbol;
  pause: () => void;
}

// Module-level coordinator guaranteeing only ONE CoverVideo plays at a time across the page.
let activeVideoController: CoverControllerEntry | null = null;
type CoverControllerEntry = CoverVideoController;

export function getActiveCoverVideoCount(): number {
  return activeVideoController ? 1 : 0;
}

export interface CoverVideoProps {
  /** Whether this cover video should actively play while in view (set false on open) */
  active?: boolean;
  /** Fades out the video cleanly before unmount */
  fadingOut?: boolean;
  /** Optional poster path (defaults to /video/invitation-poster.jpg) */
  poster?: string;
  /** Optional className for container (e.g. border-radius utilities) */
  className?: string;
  /** Optional callback fired once the video reaches canplay */
  onReady?: () => void;
}

const DEFAULT_POSTER = '/video/invitation-poster.jpg?v=4';
const WEBM_SOURCE = '/video/invitation-loop.webm?v=4';
const MP4_SOURCE = '/video/invitation-loop.mp4?v=4';

const VIDEO_STYLE: React.CSSProperties = {
  transform: 'translateZ(0)',
  backfaceVisibility: 'hidden',
};

function isReducedMotionPreferred(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isSaveDataEnabled(): boolean {
  if (typeof navigator === 'undefined') return false;
  const conn = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
  return Boolean(conn?.saveData);
}

export const CoverVideo: React.FC<CoverVideoProps> = ({
  active = true,
  fadingOut = false,
  poster = DEFAULT_POSTER,
  className = '',
  onReady,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const instanceIdRef = useRef<symbol>(Symbol('cover-video'));

  const [reducedMotion, setReducedMotion] = useState<boolean>(isReducedMotionPreferred);
  const [saveData, setSaveData] = useState<boolean>(isSaveDataEnabled);
  const [hasIntersected, setHasIntersected] = useState<boolean>(
    () => typeof IntersectionObserver === 'undefined'
  );
  const [isInView, setIsInView] = useState<boolean>(
    () => typeof IntersectionObserver === 'undefined'
  );
  const [isCanPlay, setIsCanPlay] = useState<boolean>(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState<boolean>(false);

  const activeRef = useRef(active);
  const fadingOutRef = useRef(fadingOut);
  const isInViewRef = useRef(isInView);
  const reducedMotionRef = useRef(reducedMotion);
  const saveDataRef = useRef(saveData);
  const autoplayBlockedRef = useRef(autoplayBlocked);
  const isUnmountingRef = useRef(false);
  const pausedByControllerRef = useRef(false);
  const resumeTimerRef = useRef<number | null>(null);
  const resumeAttemptsRef = useRef(0);

  activeRef.current = active;
  fadingOutRef.current = fadingOut;
  isInViewRef.current = isInView;
  reducedMotionRef.current = reducedMotion;
  saveDataRef.current = saveData;
  autoplayBlockedRef.current = autoplayBlocked;

  const isDisabledByEnv = reducedMotion || saveData;
  const shouldMountVideo = hasIntersected && !isDisabledByEnv;

  const releaseActiveController = () => {
    if (activeVideoController?.id === instanceIdRef.current) {
      activeVideoController = null;
    }
  };

  const pauseVideoInternally = () => {
    const video = videoRef.current;
    if (!video) return;
    pausedByControllerRef.current = true;
    try {
      if (!video.paused) {
        video.pause();
      }
    } catch {
      // ignore
    }
    releaseActiveController();
    window.setTimeout(() => {
      pausedByControllerRef.current = false;
    }, 0);
  };

  const attemptPlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (
      isUnmountingRef.current ||
      !activeRef.current ||
      fadingOutRef.current ||
      !isInViewRef.current ||
      reducedMotionRef.current ||
      saveDataRef.current
    ) {
      return;
    }
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return;
    }

    // Ensure only one CoverVideo plays at a time across the page.
    if (activeVideoController && activeVideoController.id !== instanceIdRef.current) {
      activeVideoController.pause();
    }
    activeVideoController = {
      id: instanceIdRef.current,
      pause: pauseVideoInternally,
    };

    try {
      video.muted = true;
      video.defaultMuted = true;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
      resumeAttemptsRef.current = 0;
      if (!isUnmountingRef.current) {
        setAutoplayBlocked(false);
      }
    } catch {
      // Autoplay blocked or interrupted — fall back gracefully to the poster image.
      releaseActiveController();
      if (!isUnmountingRef.current) {
        setAutoplayBlocked(true);
      }
    }
  };

  // Observe prefers-reduced-motion & navigator.connection.saveData changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mq =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    const handleMotionChange = () => setReducedMotion(Boolean(mq?.matches));
    if (mq) {
      if (typeof mq.addEventListener === 'function') {
        mq.addEventListener('change', handleMotionChange);
      } else if (typeof mq.addListener === 'function') {
        mq.addListener(handleMotionChange);
      }
    }

    const conn = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
    const handleConnChange = () => setSaveData(Boolean(conn?.saveData));
    conn?.addEventListener?.('change', handleConnChange);

    return () => {
      if (mq) {
        if (typeof mq.removeEventListener === 'function') {
          mq.removeEventListener('change', handleMotionChange);
        } else if (typeof mq.removeListener === 'function') {
          mq.removeListener(handleMotionChange);
        }
      }
      conn?.removeEventListener?.('change', handleConnChange);
    };
  }, []);

  // Lazy-load & pause/resume based on IntersectionObserver visibility
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setHasIntersected(true);
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        const visible = entry.isIntersecting;
        setIsInView(visible);
        if (visible) {
          setHasIntersected(true);
        }
      },
      { rootMargin: '120px', threshold: 0.05 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  // React to active / fadingOut / inView / environment changes
  useEffect(() => {
    if (!shouldMountVideo) {
      pauseVideoInternally();
      return;
    }
    if (!active || fadingOut || !isInView) {
      pauseVideoInternally();
      return;
    }
    void attemptPlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldMountVideo, active, fadingOut, isInView]);

  // Attach iOS Safari attributes, visibilitychange, pause, suspend & unmount resource cleanup
  useEffect(() => {
    isUnmountingRef.current = false;
    const video = videoRef.current;
    if (!shouldMountVideo || !video) {
      return;
    }

    // Enforce muted & inline attributes directly on the DOM element for iOS Safari
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', 'true');
    video.setAttribute('controlsList', 'nodownload noplaybackrate noremoteplayback');

    const scheduleResume = () => {
      if (resumeTimerRef.current !== null) {
        window.clearTimeout(resumeTimerRef.current);
      }
      if (
        isUnmountingRef.current ||
        pausedByControllerRef.current ||
        !activeRef.current ||
        fadingOutRef.current ||
        !isInViewRef.current ||
        reducedMotionRef.current ||
        saveDataRef.current ||
        autoplayBlockedRef.current ||
        document.visibilityState === 'hidden'
      ) {
        return;
      }
      // Guard against infinite retry loops if OS/browser forces pause (e.g. Low Power Mode)
      if (resumeAttemptsRef.current >= 3) {
        setAutoplayBlocked(true);
        releaseActiveController();
        return;
      }
      resumeAttemptsRef.current += 1;
      resumeTimerRef.current = window.setTimeout(() => {
        resumeTimerRef.current = null;
        void attemptPlay();
      }, 120);
    };

    const handleCanPlay = () => {
      if (isUnmountingRef.current) return;
      setIsCanPlay(true);
      onReady?.();
      if (activeRef.current && !fadingOutRef.current && isInViewRef.current) {
        void attemptPlay();
      }
    };

    const handlePlaying = () => {
      if (isUnmountingRef.current) return;
      resumeAttemptsRef.current = 0;
      setAutoplayBlocked(false);
      setIsCanPlay(true);
    };

    const handlePause = () => {
      if (
        isUnmountingRef.current ||
        pausedByControllerRef.current ||
        !activeRef.current ||
        fadingOutRef.current ||
        !isInViewRef.current ||
        document.visibilityState === 'hidden'
      ) {
        return;
      }
      scheduleResume();
    };

    const handleSuspend = () => {
      if (video.paused && !autoplayBlockedRef.current) {
        scheduleResume();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        resumeAttemptsRef.current = 0;
        if (activeRef.current && !fadingOutRef.current && isInViewRef.current) {
          void attemptPlay();
        }
      } else {
        pauseVideoInternally();
      }
    };

    const handleError = () => {
      releaseActiveController();
      if (!isUnmountingRef.current) {
        setAutoplayBlocked(true);
      }
    };

    if (video.readyState >= 3) {
      handleCanPlay();
    }

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('pause', handlePause);
    video.addEventListener('suspend', handleSuspend);
    video.addEventListener('error', handleError);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isUnmountingRef.current = true;
      if (resumeTimerRef.current !== null) {
        window.clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = null;
      }
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('suspend', handleSuspend);
      video.removeEventListener('error', handleError);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      releaseActiveController();
      try {
        video.pause();
        video.removeAttribute('src');
        const sources = video.querySelectorAll('source');
        sources.forEach((s) => s.remove());
        video.load();
      } catch {
        // ignore cleanup errors
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldMountVideo]);

  const showVideoLayer = shouldMountVideo && isCanPlay && !autoplayBlocked;

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none ${className}`}
    >
      {/* First-paint poster image; stays opaque behind video fade-in so background never bleeds through */}
      <img
        src={poster}
        alt=""
        draggable={false}
        className={`absolute inset-0 w-full h-full object-cover pointer-events-none select-none transition-opacity duration-300 ease-out ${
          fadingOut ? 'opacity-0' : 'opacity-100'
        }`}
        style={VIDEO_STYLE}
      />

      {shouldMountVideo && (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster={poster}
          controls={false}
          controlsList="nodownload noplaybackrate noremoteplayback"
          disablePictureInPicture
          disableRemotePlayback
          tabIndex={-1}
          aria-hidden="true"
          onContextMenu={(e) => e.preventDefault()}
          className={`taklifim-cover-video absolute inset-0 w-full h-full object-cover pointer-events-none select-none transition-opacity duration-200 ease-out ${
            fadingOut ? 'opacity-0' : showVideoLayer ? 'opacity-100' : 'opacity-0'
          }`}
          style={VIDEO_STYLE}
        >
          <source src={MP4_SOURCE} type="video/mp4" />
          <source src={WEBM_SOURCE} type="video/webm; codecs=vp9" />
        </video>
      )}
    </div>
  );
};

export default CoverVideo;
