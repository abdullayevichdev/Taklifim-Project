import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { RefreshCw, AlertCircle, ShieldCheck, ExternalLink, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../locales';
import { GlassSurface, GlassButton } from './glass';

interface TelegramLoginWidgetProps {
  onSuccess?: () => void;
  compact?: boolean;
  className?: string;
}

interface TelegramSessionState {
  sessionId: string;
  claimSecret: string;
  botUsername: string;
  botUrl: string;
  verificationCode: string;
  expiresAt: number;
}

const TelegramPlaneIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5 shrink-0' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

function generateClaimSecret(): string {
  const bytes = new Uint8Array(24);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function formatCountdown(msLeft: number): string {
  const totalSec = Math.max(0, Math.ceil(msLeft / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatStartErrorMessage(
  data: any,
  lang: 'uz' | 'ru' | 'en',
  fallbackBotError: string,
  httpStatus?: number
): string {
  const rawCode = typeof data?.code === 'string' ? data.code.trim() : '';
  const code = rawCode || (httpStatus ? `HTTP_${httpStatus}` : '');
  const missingEnv = Array.isArray(data?.missingEnv)
    ? data.missingEnv.filter((item: unknown): item is string => typeof item === 'string' && Boolean(item.trim()))
    : [];
  const missingSuffix = missingEnv.length > 0 ? ` (${missingEnv.join(', ')})` : '';
  const codeSuffix = code ? ` [${code}]` : '';

  if (lang === 'ru') {
    switch (rawCode) {
      case 'ENV_MISSING':
        return `На сервере не настроены обязательные переменные окружения${missingSuffix}.${codeSuffix}`;
      case 'TELEGRAM_CONFIG_MISSING':
        return `На сервере не настроен Telegram-бот для входа${missingSuffix}.${codeSuffix}`;
      case 'FIREBASE_INIT_FAILED':
        return `Ошибка инициализации серверного подключения к Firebase.${codeSuffix}`;
      case 'RTDB_WRITE_FAILED':
        return `Не удалось сохранить сессию входа в базе данных.${codeSuffix}`;
      case 'RATE_LIMITED':
        return `Слишком много попыток входа. Попробуйте через минуту.${codeSuffix}`;
      case 'MODULE_LOAD_FAILED':
      case 'START_HANDLER_FAILED':
        return `Внутренняя ошибка сервера при запуске входа через Telegram.${codeSuffix}`;
      case 'INVALID_REQUEST':
      case 'INVALID_JSON':
        return `Неверный формат запроса.${codeSuffix}`;
      default:
        return `${data?.message || data?.error || fallbackBotError}${codeSuffix}`;
    }
  }

  if (lang === 'en') {
    switch (rawCode) {
      case 'ENV_MISSING':
        return `Server environment configuration is incomplete${missingSuffix}.${codeSuffix}`;
      case 'TELEGRAM_CONFIG_MISSING':
        return `Telegram sign-in bot configuration is missing on the server${missingSuffix}.${codeSuffix}`;
      case 'FIREBASE_INIT_FAILED':
        return `Server Firebase Admin initialization failed.${codeSuffix}`;
      case 'RTDB_WRITE_FAILED':
        return `Failed to save login session to the database.${codeSuffix}`;
      case 'RATE_LIMITED':
        return `Too many sign-in attempts. Please try again in a minute.${codeSuffix}`;
      case 'MODULE_LOAD_FAILED':
      case 'START_HANDLER_FAILED':
        return `Server error while initializing Telegram sign-in.${codeSuffix}`;
      case 'INVALID_REQUEST':
      case 'INVALID_JSON':
        return `Invalid sign-in request payload.${codeSuffix}`;
      default:
        return `${data?.message || data?.error || fallbackBotError}${codeSuffix}`;
    }
  }

  switch (rawCode) {
    case 'ENV_MISSING':
      return `Server sozlamalari to‘liq emas${missingSuffix}.${codeSuffix}`;
    case 'TELEGRAM_CONFIG_MISSING':
      return `Serverda Telegram kirish boti sozlanmagan${missingSuffix}.${codeSuffix}`;
    case 'FIREBASE_INIT_FAILED':
      return `Serverda Firebase Admin ulanishida xatolik yuz berdi.${codeSuffix}`;
    case 'RTDB_WRITE_FAILED':
      return `Kirish sessiyasini ma’lumotlar bazasiga yozib bo‘lmadi.${codeSuffix}`;
    case 'RATE_LIMITED':
      return `Juda ko‘p kirish urinishi. Bir daqiqadan so‘ng qayta urinib ko‘ring.${codeSuffix}`;
    case 'MODULE_LOAD_FAILED':
    case 'START_HANDLER_FAILED':
      return `Telegram kirishni ishga tushirishda server xatoligi yuz berdi.${codeSuffix}`;
    case 'INVALID_REQUEST':
    case 'INVALID_JSON':
      return `So‘rov ma’lumotlari noto‘g‘ri.${codeSuffix}`;
    default:
      return `${data?.message || data?.error || fallbackBotError}${codeSuffix}`;
  }
}

export const TelegramLoginWidget: React.FC<TelegramLoginWidgetProps> = ({
  onSuccess,
  compact = false,
  className = '',
}) => {
  const { language, t } = useLanguage();
  const { completeTelegramLogin } = useAuth();

  const [session, setSession] = useState<TelegramSessionState | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [isCompleting, setIsCompleting] = useState<boolean>(false);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [msLeft, setMsLeft] = useState<number>(0);

  const pollInFlightRef = useRef<boolean>(false);
  const startInFlightRef = useRef<boolean>(false);
  const hasAutoStartedRef = useRef<boolean>(false);
  const completedRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);
  const onSuccessRef = useRef(onSuccess);
  const languageRef = useRef(language);
  const botUnavailableErrorRef = useRef(t.auth.botUnavailableError);
  const networkFailedErrorRef = useRef(t.auth.errors.networkFailed);

  onSuccessRef.current = onSuccess;
  languageRef.current = language;
  botUnavailableErrorRef.current = t.auth.botUnavailableError;
  networkFailedErrorRef.current = t.auth.errors.networkFailed;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const startSession = useCallback(async () => {
    if (startInFlightRef.current) return;
    startInFlightRef.current = true;

    setLoading(true);
    setErrorMsg('');
    setIsExpired(false);
    setIsCompleting(false);
    setQrDataUrl('');
    completedRef.current = false;

    const claimSecret = generateClaimSecret();
    const activeLang = languageRef.current;

    try {
      const res = await fetch('/api/auth/telegram/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimSecret,
          lang: activeLang,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!mountedRef.current) return;

      const normalizedBotUsername = String(data?.botUsername || '')
        .replace(/\s+/g, '')
        .replace(/^@+/, '');

      if (
        !res.ok ||
        (!data?.ok && !data?.success) ||
        !data?.sessionId ||
        !data?.botUrl ||
        !normalizedBotUsername
      ) {
        setSession(null);
        setErrorMsg(
          formatStartErrorMessage(data, activeLang, botUnavailableErrorRef.current, res.status)
        );
        setLoading(false);
        return;
      }

      const nextSession: TelegramSessionState = {
        sessionId: String(data.sessionId),
        claimSecret,
        botUsername: normalizedBotUsername,
        botUrl: String(data.botUrl),
        verificationCode: String(data.verificationCode || ''),
        expiresAt: Number(data.expiresAt) || Date.now() + 5 * 60 * 1000,
      };

      setSession(nextSession);
      setMsLeft(Math.max(0, nextSession.expiresAt - Date.now()));
      setLoading(false);

      if (!compact) {
        QRCode.toDataURL(nextSession.botUrl, {
          width: 176,
          margin: 1,
          color: {
            dark: '#1E1418',
            light: '#FFFFFF',
          },
        })
          .then((url) => {
            if (mountedRef.current) setQrDataUrl(url);
          })
          .catch(() => {});
      }
    } catch {
      if (!mountedRef.current) return;
      setSession(null);
      setErrorMsg(`${networkFailedErrorRef.current} [NETWORK_ERROR]`);
      setLoading(false);
    } finally {
      startInFlightRef.current = false;
    }
  }, [compact]);

  useEffect(() => {
    if (hasAutoStartedRef.current) return;
    hasAutoStartedRef.current = true;
    startSession();
  }, [startSession]);

  // Countdown tick
  useEffect(() => {
    if (!session || isExpired || isCompleting) return;
    const updateRemaining = () => {
      const remaining = Math.max(0, session.expiresAt - Date.now());
      setMsLeft(remaining);
      if (remaining === 0) {
        setIsExpired(true);
      }
    };
    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [session, isExpired, isCompleting]);

  const pollClaim = useCallback(async () => {
    if (
      !session ||
      isExpired ||
      isCompleting ||
      completedRef.current ||
      pollInFlightRef.current ||
      (typeof document !== 'undefined' && document.hidden)
    ) {
      return;
    }

    if (Date.now() >= session.expiresAt) {
      setIsExpired(true);
      return;
    }

    pollInFlightRef.current = true;
    try {
      const res = await fetch('/api/auth/telegram/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.sessionId,
          claimSecret: session.claimSecret,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!mountedRef.current || completedRef.current) return;

      if (data?.status === 'ok' && typeof data?.customToken === 'string') {
        completedRef.current = true;
        setIsCompleting(true);
        const result = await completeTelegramLogin(data.customToken);
        if (!mountedRef.current) return;
        if (result.success) {
          onSuccessRef.current?.();
        } else {
          completedRef.current = false;
          setIsCompleting(false);
          setErrorMsg(result.message || t.auth.errors.generic);
        }
        return;
      }

      if (data?.status === 'expired') {
        setIsExpired(true);
        return;
      }

      if (res.status === 403 || res.status === 429) {
        setErrorMsg(data?.error || t.auth.errors.generic);
        if (res.status === 403) {
          setIsExpired(true);
        }
      }
    } catch {
      // Transient network hiccup — next 2s tick or visibility focus retries automatically
    } finally {
      pollInFlightRef.current = false;
    }
  }, [session, isExpired, isCompleting, completeTelegramLogin, t.auth.errors.generic]);

  // Visibility-aware 2s polling while waiting for Telegram confirmation
  useEffect(() => {
    if (!session || isExpired || isCompleting) return;

    let intervalId: number | null = null;

    const startPolling = () => {
      if (intervalId !== null || document.hidden) return;
      intervalId = window.setInterval(() => {
        pollClaim();
      }, 2000);
    };

    const stopPolling = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        pollClaim();
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session, isExpired, isCompleting, pollClaim]);

  const botHandle = session?.botUsername || '';

  if (loading) {
    return (
      <GlassSurface variant="subtle" rounded="2xl" className={`p-5 text-center space-y-3 ${className}`}>
        <div className="w-8 h-8 border-[3px] border-[#2AABEE] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-[#4A383F]">{t.auth.preparingSession}</p>
      </GlassSurface>
    );
  }

  if (isCompleting) {
    return (
      <GlassSurface variant="subtle" rounded="2xl" className={`p-5 text-center space-y-3 ${className}`}>
        <div className="w-8 h-8 border-[3px] border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold text-[#1E1418]">{t.auth.connecting}</p>
      </GlassSurface>
    );
  }

  if (errorMsg || isExpired || !session) {
    return (
      <GlassSurface variant="tinted-pink" rounded="2xl" className={`p-4 sm:p-5 space-y-3.5 text-center ${className}`}>
        <div className="w-10 h-10 rounded-2xl bg-rose-100/90 text-rose-700 flex items-center justify-center mx-auto">
          <AlertCircle className="w-5 h-5" aria-hidden="true" />
        </div>
        <p className="text-xs font-semibold text-rose-900 leading-relaxed">
          {isExpired ? t.auth.expiredError : errorMsg || t.auth.botUnavailableError}
        </p>
        <GlassButton
          type="button"
          tone="tinted"
          size={compact ? 'sm' : 'md'}
          onClick={startSession}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />}
          className="mx-auto"
        >
          {t.auth.retryBtn}
        </GlassButton>
      </GlassSurface>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Anti-phishing 2-digit verification code badge */}
      {session.verificationCode && (
        <GlassSurface
          variant="tinted-sky"
          rounded="2xl"
          className={`${compact ? 'p-3' : 'p-4'} border border-[#2AABEE]/25 text-center space-y-1.5`}
        >
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#1B5E86]">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{t.auth.verificationCodeLabel}</span>
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-extrabold tracking-[0.22em] text-[#1E1418] tabular-nums">
            {session.verificationCode}
          </div>
          <p className="text-[11px] text-[#3A4D5C] leading-snug max-w-xs mx-auto">
            {t.auth.verificationCodeHint}
          </p>
        </GlassSurface>
      )}

      {/* Primary Telegram deep-link CTA (uses anchor, never window.open) */}
      <a
        href={session.botUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`w-full ${compact ? 'min-h-[44px] py-2.5 px-4 text-xs sm:text-sm' : 'min-h-[50px] py-3 px-5 text-sm'} rounded-full bg-gradient-to-r from-[#2AABEE] to-[#229ED9] hover:from-[#229ED9] hover:to-[#1B8CC2] text-white font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 border border-white/25`}
      >
        <TelegramPlaneIcon className={compact ? 'w-4 h-4 shrink-0' : 'w-5 h-5 shrink-0'} />
        <span>{compact ? t.auth.telegramBtnCompact : t.auth.telegramBtn}</span>
        {botHandle && (
          <span className="text-[11px] opacity-90 font-semibold hidden sm:inline">
            @{botHandle}
          </span>
        )}
        <ExternalLink className="w-3.5 h-3.5 opacity-85 shrink-0" aria-hidden="true" />
      </a>

      {/* Desktop QR code */}
      {!compact && qrDataUrl && (
        <GlassSurface
          variant="subtle"
          rounded="2xl"
          className="hidden lg:flex items-center gap-4 p-3.5"
        >
          <div className="p-1.5 rounded-xl bg-white border border-black/8 shadow-xs shrink-0">
            <img
              src={qrDataUrl}
              alt={t.auth.telegramBtn}
              className="w-24 h-24 object-contain rounded-lg"
            />
          </div>
          <div className="text-left space-y-1">
            <p className="text-xs font-bold text-[#1E1418] leading-snug">{t.auth.qrScanHint}</p>
            {botHandle && (
              <p className="text-[11px] font-mono text-[#229ED9] font-semibold">@{botHandle}</p>
            )}
          </div>
        </GlassSurface>
      )}

      {/* Live polling indicator + remaining time */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] font-semibold text-[#4A383F]">
        <span className="inline-flex items-center gap-2">
          <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2AABEE] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#229ED9]" />
          </span>
          <span>{t.auth.waitingBotConfirm}</span>
        </span>
        <span className="inline-flex items-center gap-1 tabular-nums text-[#5C4F48]">
          <Clock className="w-3 h-3 shrink-0" aria-hidden="true" />
          <span>{formatCountdown(msLeft)}</span>
        </span>
      </div>

      {/* 4-step guide (full view) */}
      {!compact && (
        <GlassSurface variant="subtle" rounded="2xl" className="p-4 space-y-2 text-left">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#5C4F48]">
            {t.auth.tgStepsTitle}
          </div>
          <ol className="space-y-1.5 text-xs text-[#3A2D28]">
            {[t.auth.tgStep1, t.auth.tgStep2, t.auth.tgStep3, t.auth.tgStep4].map((stepText, idx) => (
              <li key={idx} className="flex items-start gap-2 leading-snug">
                <span className="w-4 h-4 rounded-full bg-[#2AABEE]/15 text-[#1B6EA0] text-[10px] font-extrabold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                  {idx + 1}
                </span>
                <span>{stepText}</span>
              </li>
            ))}
          </ol>
        </GlassSurface>
      )}
    </div>
  );
};
