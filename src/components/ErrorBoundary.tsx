import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Language } from '../types';

const CHUNK_RELOAD_KEY = 'taklifim_chunk_reload_ts';
const CHUNK_RELOAD_COOLDOWN_MS = 30_000;

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === 'string'
      ? error
      : String(error);
  const lower = message.toLowerCase();
  return (
    lower.includes('chunkloaderror') ||
    lower.includes('failed to fetch dynamically imported module') ||
    lower.includes('importing a module script failed') ||
    lower.includes('error loading dynamically imported module') ||
    lower.includes('loading chunk') ||
    lower.includes('unable to preload css')
  );
}

/**
 * Reloads the page at most once per 30 seconds when a deployment invalidates
 * lazy-loaded ES module chunk URLs. Guarded by sessionStorage to prevent loops.
 */
export function attemptChunkErrorReloadOnce(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = sessionStorage.getItem(CHUNK_RELOAD_KEY);
    const lastTs = raw ? Number(raw) : 0;
    const now = Date.now();
    if (lastTs && now - lastTs < CHUNK_RELOAD_COOLDOWN_MS) {
      return false;
    }
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}

export function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      if (isChunkLoadError(error)) {
        const reloaded = attemptChunkErrorReloadOnce();
        if (reloaded) {
          // Keep promise pending briefly while browser reloads
          return new Promise<{ default: T }>(() => {});
        }
      }
      throw error;
    }
  });
}

function getSafeLanguage(override?: Language): Language {
  if (override === 'uz' || override === 'ru' || override === 'en') {
    return override;
  }
  try {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('taklifim_language') : null;
    if (saved === 'uz' || saved === 'ru' || saved === 'en') {
      return saved;
    }
  } catch {
    // Ignore storage access restrictions
  }
  return 'uz';
}

const ERROR_COPY: Record<
  Language,
  {
    title: string;
    desc: string;
    refreshBtn: string;
    homeBtn: string;
  }
> = {
  uz: {
    title: 'Xatolik yuz berdi',
    desc: 'Sahifani ko‘rsatishda kutilmagan xatolik yuz berdi. Sahifani yangilang yoki bosh sahifaga qayting.',
    refreshBtn: 'Sahifani yangilash',
    homeBtn: 'Bosh sahifaga qaytish',
  },
  ru: {
    title: 'Произошла ошибка',
    desc: 'Не удалось отобразить страницу. Пожалуйста, обновите страницу или вернитесь на главную.',
    refreshBtn: 'Обновить страницу',
    homeBtn: 'На главную',
  },
  en: {
    title: 'Something went wrong',
    desc: 'An unexpected error occurred while rendering this view. Please refresh the page or return home.',
    refreshBtn: 'Refresh page',
    homeBtn: 'Back to Home',
  },
};

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  scope?: 'app' | 'route';
  resetKey?: string;
  language?: Language;
  onGoHome?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error(`[Taklifim ${this.props.scope ?? 'app'} ErrorBoundary]`, error, errorInfo);
    if (isChunkLoadError(error)) {
      attemptChunkErrorReloadOnce();
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.hasError && this.props.resetKey !== prevProps.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onGoHome) {
      this.props.onGoHome();
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/');
      window.location.assign('/');
    }
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const lang = getSafeLanguage(this.props.language);
    const copy = ERROR_COPY[lang];
    const isAppScope = this.props.scope === 'app';

    return (
      <div
        role="alert"
        className={`${
          isAppScope ? 'min-h-screen taklifim-glass-backdrop' : 'min-h-[70vh] pt-28 pb-20'
        } flex items-center justify-center px-4`}
      >
        <div className="glass-surface-elevated rounded-[28px] p-7 sm:p-10 max-w-md w-full text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FFE4EE] to-[#E2F3FF] border border-white mx-auto flex items-center justify-center text-[#9E3E60] shadow-xs">
            <AlertTriangle className="w-7 h-7" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <h1 className="font-playfair text-2xl sm:text-3xl font-extrabold text-[#1E1418]">
              {copy.title}
            </h1>
            <p className="text-xs sm:text-sm text-[#4A383F] leading-relaxed">{copy.desc}</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={this.handleRefresh}
              className="min-h-[44px] px-5 py-2.5 rounded-full bg-gradient-to-br from-[#D6517F] via-[#C64873] to-[#A7325B] text-white text-xs sm:text-sm font-bold border border-white/60 shadow-[0_10px_22px_-8px_rgba(198,72,115,0.45)] hover:brightness-105 transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{copy.refreshBtn}</span>
            </button>

            <button
              type="button"
              onClick={this.handleGoHome}
              className="min-h-[44px] px-5 py-2.5 rounded-full glass-surface text-[#1E1418] text-xs sm:text-sm font-bold hover:bg-white transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Home className="w-4 h-4 text-[#9E3E60] shrink-0" aria-hidden="true" />
              <span>{copy.homeBtn}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}

/**
 * Per-control ErrorBoundary for <lg-*> web component wrappers.
 * If any Liquid Glass custom element throws at runtime, it silently degrades
 * to its standard HTML fallback control so the rest of the page stays intact.
 */
interface GlassControlBoundaryProps {
  fallback: React.ReactNode;
  children: React.ReactNode;
}

interface GlassControlBoundaryState {
  hasError: boolean;
}

export class GlassControlBoundary extends React.Component<
  GlassControlBoundaryProps,
  GlassControlBoundaryState
> {
  state: GlassControlBoundaryState = { hasError: false };

  static getDerivedStateFromError(): GlassControlBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    console.warn('[Taklifim] Glass control failed; falling back to native HTML:', error);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
