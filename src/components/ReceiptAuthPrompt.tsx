import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { useLanguage } from '../locales';
import { GlassSurface, GlassButton } from './glass';
import { AlertCircle, Lock, Mail } from 'lucide-react';

interface ReceiptAuthPromptProps {
  onBeforeEmailNavigate?: () => void;
}

export const ReceiptAuthPrompt: React.FC<ReceiptAuthPromptProps> = ({
  onBeforeEmailNavigate,
}) => {
  const { loginWithGoogle, loginWithApple } = useAuth();
  const { path, navigate } = useRouter();
  const { t } = useLanguage();
  const [submitting, setSubmitting] = useState<'google' | 'apple' | null>(null);
  const [authError, setAuthError] = useState<string>('');

  const handleGoogle = async () => {
    if (submitting) return;
    setAuthError('');
    setSubmitting('google');
    try {
      const res = await loginWithGoogle();
      if (!res.success && res.message) {
        setAuthError(res.message);
      }
    } finally {
      setSubmitting(null);
    }
  };

  const handleApple = async () => {
    if (submitting) return;
    setAuthError('');
    setSubmitting('apple');
    try {
      const res = await loginWithApple();
      if (!res.success && res.message) {
        setAuthError(res.message);
      }
    } finally {
      setSubmitting(null);
    }
  };

  const handleEmail = () => {
    onBeforeEmailNavigate?.();
    const target = path && path.startsWith('/') ? `/login?redirect=${encodeURIComponent(path)}` : '/login';
    navigate(target);
  };

  return (
    <GlassSurface
      variant="tinted-pink"
      rounded="2xl"
      className="p-4 sm:p-5 border border-[#C64873]/30 space-y-3.5"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-white/90 border border-[#C64873]/25 text-[#9E3E60] flex items-center justify-center shrink-0 shadow-xs">
          <Lock className="w-4 h-4" aria-hidden="true" />
        </div>
        <div className="space-y-1 min-w-0">
          <h4 className="text-xs sm:text-sm font-bold text-[#1E1418]">
            {t.auth.errors.receiptAuthRequiredTitle}
          </h4>
          <p className="text-[11px] sm:text-xs text-[#4A383F] leading-relaxed">
            {t.auth.errors.receiptAuthRequiredDesc}
          </p>
        </div>
      </div>

      {authError && (
        <div
          role="alert"
          className="text-xs text-rose-800 font-semibold flex items-start gap-2 bg-rose-50/95 p-3 rounded-xl border border-rose-200"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" aria-hidden="true" />
          <span>{authError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <GlassButton
          type="button"
          tone="light"
          size="sm"
          disabled={Boolean(submitting)}
          loading={submitting === 'google'}
          onClick={handleGoogle}
          className="w-full justify-center"
        >
          {t.auth.googleLoginBtn}
        </GlassButton>

        <button
          type="button"
          disabled={Boolean(submitting)}
          onClick={handleApple}
          className="min-h-[40px] px-3.5 py-2 rounded-full bg-[#1E1418] hover:bg-black text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
        >
          {submitting === 'apple' ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : null}
          <span>{t.auth.appleLoginBtn}</span>
        </button>

        <GlassButton
          type="button"
          tone="tinted"
          size="sm"
          disabled={Boolean(submitting)}
          onClick={handleEmail}
          leftIcon={<Mail className="w-3.5 h-3.5" aria-hidden="true" />}
          className="w-full justify-center"
        >
          {t.auth.errors.receiptAuthEmailBtn}
        </GlassButton>
      </div>
    </GlassSurface>
  );
};
