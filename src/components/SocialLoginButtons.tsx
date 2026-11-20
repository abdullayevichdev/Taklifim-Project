import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../locales';
import { GlassButton } from './glass';

// Official Google 4-color SVG
export const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5 shrink-0' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

// Official Apple SVG
export const AppleIcon: React.FC<{ className?: string }> = ({
  className = 'w-5 h-5 fill-current shrink-0',
}) => (
  <svg className={className} viewBox="0 0 170 170" aria-hidden="true">
    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-6.3-9.67-11.08-20.9-14.34-33.69-3.26-12.79-4.89-24.97-4.89-36.54 0-14.34 3.58-26.17 10.74-35.5 7.16-9.33 16.27-14.07 27.32-14.22 4.8 0 10.3 1.34 16.51 4.02 6.21 2.68 10.15 4.08 11.83 4.2 2.01-.22 6.15-1.68 12.43-4.39 6.28-2.7 11.84-3.95 16.69-3.76 12.63.65 22.84 5.34 30.63 14.07-11.08 6.74-16.51 16.08-16.29 28.02.22 9.35 3.8 17.18 10.74 23.51 6.94 6.33 15.19 10.05 24.75 11.16-2.18 6.74-4.89 13.91-8.14 21.52zM119.22 31.85c0-7.17 2.58-13.88 7.74-20.13 5.16-6.25 11.66-10.28 19.5-12.09.43 1.09.65 2.28.65 3.58 0 7.39-2.72 14.32-8.16 20.79-5.43 6.47-11.95 10.3-19.55 11.49-.11-1.2-.18-2.41-.18-3.64z" />
  </svg>
);

interface SocialLoginButtonsProps {
  /** Called after a successful popup sign-in. */
  onSuccess?: () => void;
  /** Called right before a sign-in attempt starts (e.g. to save a draft). */
  onBeforeSignIn?: () => void;
  /** Smaller side-by-side buttons for inline prompts. */
  compact?: boolean;
}

export const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = ({
  onSuccess,
  onBeforeSignIn,
  compact = false,
}) => {
  const { loginWithGoogle, loginWithApple } = useAuth();
  const { t } = useLanguage();
  const [submitting, setSubmitting] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState<string>('');

  const run = async (provider: 'google' | 'apple') => {
    if (submitting) return;
    setError('');
    setSubmitting(provider);
    onBeforeSignIn?.();
    try {
      const res = provider === 'google' ? await loginWithGoogle() : await loginWithApple();
      if (res.success) {
        onSuccess?.();
      } else if (res.message) {
        setError(res.message);
      }
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="space-y-3 min-w-0">
      {error && (
        <div
          role="alert"
          className="text-xs text-rose-800 font-semibold flex items-start gap-2 bg-rose-50/95 p-3 rounded-xl border border-rose-200"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className={compact ? 'grid grid-cols-1 sm:grid-cols-2 gap-2' : 'space-y-3'}>
        <GlassButton
          type="button"
          tone="light"
          size={compact ? 'sm' : 'lg'}
          disabled={Boolean(submitting)}
          loading={submitting === 'google'}
          onClick={() => run('google')}
          leftIcon={submitting === 'google' ? undefined : <GoogleIcon className={compact ? 'w-4 h-4 shrink-0' : 'w-5 h-5 shrink-0'} />}
          className="w-full justify-center"
        >
          {submitting === 'google' ? t.auth.connecting : t.auth.googleLoginBtn}
        </GlassButton>

        <button
          type="button"
          disabled={Boolean(submitting)}
          onClick={() => run('apple')}
          className={`w-full ${
            compact ? 'min-h-[40px] py-2 px-3.5 text-xs font-bold' : 'min-h-[48px] py-3 px-4 text-sm font-semibold'
          } rounded-full bg-[#1E1418] hover:bg-black text-white shadow-md hover:shadow-lg transition-colors flex items-center justify-center gap-2.5 disabled:opacity-60 border border-white/15 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E1418]`}
        >
          {submitting === 'apple' ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <AppleIcon className="w-4 h-4 fill-white shrink-0" />
          )}
          <span>{submitting === 'apple' ? t.auth.connecting : t.auth.appleLoginBtn}</span>
        </button>
      </div>
    </div>
  );
};
