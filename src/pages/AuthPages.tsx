import React, { useEffect, useMemo } from 'react';
import { useRouter, Link } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../locales';
import { GlassSurface, GlassButton } from '../components/glass';
import { TelegramLoginWidget } from '../components/TelegramLoginWidget';
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';

export const AuthPages: React.FC = () => {
  const { path, navigate } = useRouter();
  const { t } = useLanguage();
  const { user, isLoggedIn, authReady, hasFirebaseSession } = useAuth();

  const redirectTarget = useMemo(() => {
    try {
      const search = path.includes('?')
        ? path.slice(path.indexOf('?'))
        : typeof window !== 'undefined'
        ? window.location.search
        : '';
      const raw = new URLSearchParams(search).get('redirect') || '';
      if (
        raw.startsWith('/') &&
        !raw.startsWith('//') &&
        !raw.startsWith('/login') &&
        !raw.startsWith('/register')
      ) {
        return raw;
      }
    } catch {}
    return '/my-invitations';
  }, [path]);

  useEffect(() => {
    if (authReady && isLoggedIn && user && hasFirebaseSession) {
      const timer = setTimeout(() => {
        navigate(redirectTarget);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [authReady, isLoggedIn, user, hasFirebaseSession, navigate, redirectTarget]);

  if (authReady && isLoggedIn && user && hasFirebaseSession) {
    return (
      <div className="taklifim-page-top taklifim-page-bottom min-h-screen flex items-center justify-center px-3.5 sm:px-4 relative">
        <GlassSurface
          variant="elevated"
          rounded="3xl"
          className="w-full max-w-md p-8 sm:p-10 space-y-6 text-center animate-fadeIn"
        >
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#F5C9D8] to-[#C94F79] text-white flex items-center justify-center mx-auto shadow-lg">
            <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 block">
              {t.auth.alreadyLoggedSub}
            </span>
            <h1 className="font-playfair text-2xl sm:text-3xl font-bold text-[#1E1418]">
              {t.auth.alreadyLoggedWelcomePrefix} {user.name}!
            </h1>
            <p className="text-xs text-[#5C4F48] tabular-nums">{user.phone}</p>
          </div>
          <div className="pt-2">
            <GlassButton
              tone="tinted"
              size="lg"
              onClick={() => navigate(redirectTarget)}
              rightIcon={<ArrowRight className="w-4 h-4 shrink-0" />}
              className="w-full justify-center"
            >
              {t.auth.goMyInvitationsCta}
            </GlassButton>
          </div>
        </GlassSurface>
      </div>
    );
  }

  return (
    <div className="taklifim-page-top taklifim-page-bottom min-h-screen flex items-center justify-center px-3.5 sm:px-4 relative">
      <GlassSurface
        variant="elevated"
        rounded="3xl"
        className="w-full max-w-md min-w-0 p-5 sm:p-8 space-y-5 relative"
      >
        {/* Header with untouched Logo */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <div className="w-12 h-12 rounded-2xl p-0.5 bg-gradient-to-tr from-[#F5C9D8] via-white to-[#B9DFFA] shadow-md border border-white">
              <img
                src="/logo.jpg"
                alt={t.brandName}
                className="w-full h-full object-cover rounded-[14px]"
              />
            </div>
          </Link>
          <h1 className="font-playfair text-2xl sm:text-3xl font-extrabold text-[#1E1418]">
            {t.auth.loginTitle}
          </h1>
          <p className="text-xs text-[#4A383F] leading-relaxed">{t.auth.loginSubtitle}</p>
        </div>

        {/* Welcome Card */}
        <GlassSurface
          variant="tinted-pink"
          rounded="2xl"
          className="p-3.5 flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2AABEE] to-[#229ED9] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="text-xs min-w-0">
            <span className="font-extrabold text-[#1E1418] block">
              {t.auth.welcomeCardTitle}
            </span>
            <span className="text-[11px] text-[#4A383F]">{t.auth.welcomeCardDesc}</span>
          </div>
        </GlassSurface>

        {/* Telegram Bot Login Widget */}
        <TelegramLoginWidget onSuccess={() => navigate(redirectTarget)} />

        {/* Benefits */}
        <GlassSurface
          variant="subtle"
          rounded="2xl"
          className="p-3 text-[11px] text-[#5C4F48] text-center space-y-1"
        >
          <div>{t.auth.noPasswordNeeded}</div>
          <div>{t.auth.realtimeSyncBadge}</div>
        </GlassSurface>

        {/* Legal Notice */}
        <p className="text-[11px] text-center text-[#5C4F48] leading-relaxed">
          {t.auth.termsAgreePrefix}{' '}
          <Link to="/terms" className="text-[#C94F79] underline font-bold">
            {t.auth.termsLinkText}
          </Link>{' '}
          {t.auth.termsAndText}{' '}
          <Link to="/privacy" className="text-[#C94F79] underline font-bold">
            {t.auth.privacyLinkText}
          </Link>
          {t.auth.termsAgreeSuffix}
        </p>

        {/* Security Badge */}
        <div className="pt-3 border-t border-black/8 flex items-center justify-center gap-2 text-[11px] text-[#5C4F48]">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
          <span>{t.auth.securityBadgeAlt}</span>
        </div>
      </GlassSurface>
    </div>
  );
};
