import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Volume1, Play, Pause, X, Disc, Music } from 'lucide-react';
import { audioStorage } from '../utils/audioStorage';
import { useLanguage, translations } from '../locales';
import { Language } from '../types';
import { GlassSurface, GlassButton, GlassSlider } from './glass';

interface MusicPlayerProps {
  url?: string;
  title?: string;
  autoPlay?: boolean;
  delaySeconds?: number;
  language?: Language;
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({
  url,
  title,
  autoPlay = true,
  delaySeconds = 5,
  language,
}) => {
  const { language: ctxLanguage } = useLanguage();
  const activeLang = language || ctxLanguage;
  const t = translations[activeLang] || translations.uz;
  const resolvedTitle = title || t.shared.musicDefaultTitle;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [volume, setVolume] = useState<number>(0.75); // 75% default
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs <= 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Close player popover on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!url) return;

    let active = true;

    audioStorage.getAudioUrl(url).then((resolvedUrl) => {
      if (!active || !resolvedUrl) return;

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      const audio = new Audio(resolvedUrl);
      audio.loop = true;
      audio.volume = 0; // Fade-in bilan boshlash
      audioRef.current = audio;

      const onTimeUpdate = () => setCurrentTime(audio.currentTime);
      const onLoadedMetadata = () => setDuration(audio.duration || 0);

      audio.addEventListener('timeupdate', onTimeUpdate);
      audio.addEventListener('loadedmetadata', onLoadedMetadata);

      if (autoPlay) {
        delayTimerRef.current = setTimeout(() => {
          audio
            .play()
            .then(() => {
              setIsPlaying(true);
              let cur = 0;
              const target = isMuted ? 0 : volume;
              fadeIntervalRef.current = setInterval(() => {
                cur = Math.min(cur + 0.05, target);
                if (audioRef.current) audioRef.current.volume = cur;
                if (cur >= target && fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
              }, 100);
            })
            .catch(() => {
              // Foydalanuvchi birinchi marta ekranga tekkanda boshlash
              const onFirstGesture = () => {
                if (audioRef.current) {
                  audioRef.current.volume = isMuted ? 0 : volume;
                  audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
                }
                window.removeEventListener('click', onFirstGesture);
                window.removeEventListener('touchstart', onFirstGesture);
              };
              window.addEventListener('click', onFirstGesture, { once: true });
              window.addEventListener('touchstart', onFirstGesture, { once: true });
            });
        }, delaySeconds * 1000);
      }
    });

    return () => {
      active = false;
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [url, autoPlay, delaySeconds]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (newVol === 0) setIsMuted(true);
    else if (isMuted) {
      setIsMuted(false);
      if (audioRef.current) audioRef.current.muted = false;
    }
    if (audioRef.current) audioRef.current.volume = newVol;
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.muted = false;
      audioRef.current.volume = volume > 0 ? volume : 0.75;
      setIsMuted(false);
      if (volume === 0) setVolume(0.75);
    } else {
      audioRef.current.muted = true;
      setIsMuted(true);
    }
  };

  const handleSeek = (nextTime: number) => {
    setCurrentTime(nextTime);
    if (audioRef.current) audioRef.current.currentTime = nextTime;
  };

  if (!url) return null;

  return (
    <div
      ref={panelRef}
      className="fixed left-4 z-[9999] select-none"
      style={{ bottom: 'max(18px, calc(env(safe-area-inset-bottom) + 12px))' }}
    >
      {/* Floating Liquid Glass Music Pill Trigger */}
      <GlassButton
        tone={isPlaying ? 'tinted' : 'light'}
        size="md"
        onClick={() => setIsOpen((prev) => !prev)}
        className="!min-w-[48px] !min-h-[48px] !px-3.5 shadow-[0_14px_34px_-8px_rgba(30,20,24,0.28)]"
        title={t.shared.musicControlTitle}
        aria-label={t.shared.musicAria}
        aria-expanded={isOpen}
      >
        <span className="inline-flex items-center gap-2">
          {isPlaying ? (
            <Disc className="w-5 h-5 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <Music className="w-5 h-5 shrink-0" aria-hidden="true" />
          )}
          <span className="hidden sm:inline text-xs font-bold tracking-tight max-w-[140px] truncate">
            {isPlaying ? resolvedTitle : t.shared.musicLabel}
          </span>
        </span>
      </GlassButton>

      {isOpen && (
        <GlassSurface
          variant="elevated"
          rounded="3xl"
          role="dialog"
          aria-label={t.shared.musicLabel}
          className="absolute bottom-16 left-0 w-[calc(100vw-2rem)] max-w-[356px] p-4 sm:p-5 space-y-4 shadow-[0_24px_60px_-12px_rgba(30,20,24,0.26)] animate-fadeIn motion-reduce:animate-none"
        >
          {/* Top bar: Label & Close */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#9E3E60]">
              <Disc
                className={`w-3.5 h-3.5 ${isPlaying ? 'animate-spin motion-reduce:animate-none' : ''}`}
                aria-hidden="true"
              />
              <span>{t.shared.musicLabel}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-xl glass-surface-subtle text-[#4A383F] hover:text-[#1E1418] hover:bg-white flex items-center justify-center transition-colors cursor-pointer"
              title={t.shared.musicCloseAria}
              aria-label={t.shared.musicCloseAria}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Middle: Play/Pause + Track Name + Elapsed Time */}
          <div className="flex items-center gap-3">
            <GlassButton
              tone="tinted"
              size="md"
              onClick={togglePlay}
              className="!min-w-[48px] !w-12 !h-12 !px-0 shrink-0"
              title={isPlaying ? t.shared.musicPauseAria : t.shared.musicPlayAria}
              aria-label={isPlaying ? t.shared.musicPauseAria : t.shared.musicPlayAria}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" aria-hidden="true" />
              )}
            </GlassButton>

            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-[#1E1418] truncate leading-tight" title={resolvedTitle}>
                {resolvedTitle}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#4A383F] tabular-nums mt-1 font-medium">
                <span>{formatTime(currentTime)}</span>
                <span className="opacity-40">/</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          {/* Seek Slider */}
          <div className="pt-2 border-t border-black/5">
            <GlassSlider
              key={`seek-${Math.round(duration || 100)}`}
              min={0}
              max={duration > 0 ? duration : 100}
              step={0.5}
              value={Math.min(currentTime, duration > 0 ? duration : 100)}
              onChange={handleSeek}
              label={t.shared.musicSeekAria}
              valueDisplay={`${formatTime(currentTime)} / ${formatTime(duration)}`}
            />
          </div>

          {/* Volume Control Row */}
          <div className="pt-2 border-t border-black/5 flex items-center gap-3">
            <button
              type="button"
              onClick={toggleMute}
              className="w-10 h-10 rounded-xl glass-surface-subtle text-[#9E3E60] flex items-center justify-center hover:bg-white transition-colors shrink-0 cursor-pointer"
              title={isMuted ? t.shared.musicUnmuteAria : t.shared.musicMuteAria}
              aria-label={isMuted ? t.shared.musicUnmuteAria : t.shared.musicMuteAria}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-600" aria-hidden="true" />
              ) : volume < 0.5 ? (
                <Volume1 className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Volume2 className="w-4 h-4" aria-hidden="true" />
              )}
            </button>

            <div className="flex-1 min-w-0">
              <GlassSlider
                min={0}
                max={1}
                step={0.02}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                label={t.shared.musicVolumeAria}
                valueDisplay={`${isMuted ? 0 : Math.round(volume * 100)}%`}
              />
            </div>
          </div>
        </GlassSurface>
      )}
    </div>
  );
};

