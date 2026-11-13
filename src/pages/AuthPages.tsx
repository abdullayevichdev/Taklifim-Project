import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, Link } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../locales';
import {
  GlassSurface,
  GlassInput,
  GlassButton,
  GlassSegmented,
  GlassSwitch,
  GlassSegmentedOption,
} from '../components/glass';
import {
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  Lock,
  Mail,
  User,
  ShieldCheck,
  Smartphone,
  KeyRound,
  RefreshCw,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { PhoneInput } from '../components/PhoneInput';

// Official Google 4-color SVG
const GoogleIcon: React.FC = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
const AppleIcon: React.FC<{ className?: string }> = ({
  className = 'w-5 h-5 fill-current shrink-0',
}) => (
  <svg className={className} viewBox="0 0 170 170" aria-hidden="true">
    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-6.3-9.67-11.08-20.9-14.34-33.69-3.26-12.79-4.89-24.97-4.89-36.54 0-14.34 3.58-26.17 10.74-35.5 7.16-9.33 16.27-14.07 27.32-14.22 4.8 0 10.3 1.34 16.51 4.02 6.21 2.68 10.15 4.08 11.83 4.2 2.01-.22 6.15-1.68 12.43-4.39 6.28-2.7 11.84-3.95 16.69-3.76 12.63.65 22.84 5.34 30.63 14.07-11.08 6.74-16.51 16.08-16.29 28.02.22 9.35 3.8 17.18 10.74 23.51 6.94 6.33 15.19 10.05 24.75 11.16-2.18 6.74-4.89 13.91-8.14 21.52zM119.22 31.85c0-7.17 2.58-13.88 7.74-20.13 5.16-6.25 11.66-10.28 19.5-12.09.43 1.09.65 2.28.65 3.58 0 7.39-2.72 14.32-8.16 20.79-5.43 6.47-11.95 10.3-19.55 11.49-.11-1.2-.18-2.41-.18-3.64z" />
  </svg>
);

type AuthTab = 'social' | 'phone' | 'email';
type AuthModeToggle = 'login' | 'register';

export const AuthPages: React.FC<{ initialMode?: 'login' | 'register' | 'forgot' }> = ({
  initialMode = 'login',
}) => {
  const { path, navigate } = useRouter();
  const { language, t } = useLanguage();
  const {
    user,
    isLoggedIn,
    loginWithGoogle,
    loginWithApple,
    sendPhoneOtp,
    verifyPhoneOtp,
    loginWithEmail,
    registerWithEmail,
    showToast,
  } = useAuth();

  useEffect(() => {
    if (isLoggedIn && user) {
      const timer = setTimeout(() => {
        navigate('/my-invitations');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn, user, navigate]);

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(() => {
    if (path.includes('/register')) return 'register';
    if (path.includes('/forgot-password')) return 'forgot';
    return initialMode;
  });

  const [activeTab, setActiveTab] = useState<AuthTab>('social');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const modeOptions: GlassSegmentedOption<AuthModeToggle>[] = useMemo(
    () => [
      { value: 'login', label: t.auth.loginTab },
      { value: 'register', label: t.auth.registerTab },
    ],
    [t]
  );

  const methodOptions: GlassSegmentedOption<AuthTab>[] = useMemo(
    () => [
      { value: 'social', label: t.auth.socialTabLabel },
      {
        value: 'phone',
        label: t.auth.phoneTab,
        icon: <Smartphone className="w-3.5 h-3.5 text-[#3B88C3]" aria-hidden="true" />,
      },
      {
        value: 'email',
        label: t.auth.emailTab,
        icon: <Mail className="w-3.5 h-3.5 text-[#C94F79]" aria-hidden="true" />,
      },
    ],
    [t]
  );

  const reportError = (msg: string) => {
    setFormError(msg);
    showToast(msg, 'error');
  };

  // 1. Google Auth
  const handleGoogleAuth = async () => {
    if (isSubmitting) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      const success = await loginWithGoogle();
      if (success) {
        navigate('/my-invitations');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Apple Auth
  const handleAppleAuth = async () => {
    if (isSubmitting) return;
    setFormError(null);
    setIsSubmitting(true);
    try {
      const success = await loginWithApple();
      if (success) {
        navigate('/my-invitations');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Phone OTP Send
  const handleSendOtp = async () => {
    setFormError(null);
    if (!phone.trim() || !isPhoneValid) {
      reportError(t.auth.errPhoneRequired);
      return;
    }
    setIsSubmitting(true);
    const res = await sendPhoneOtp(phone);
    setIsSubmitting(false);
    if (res.success) {
      setIsOtpSent(true);
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (res.message) {
      setFormError(res.message);
    }
  };

  // 4. Phone OTP Verify
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!otpCode.trim()) {
      reportError(t.auth.errOtpInvalid);
      return;
    }
    if (mode === 'register' && name.trim().length < 2) {
      reportError(t.auth.errNameMin);
      return;
    }

    setIsSubmitting(true);
    const res = await verifyPhoneOtp(phone, otpCode.trim(), name);
    setIsSubmitting(false);
    if (res.success) {
      navigate('/my-invitations');
    } else if (res.message) {
      setFormError(res.message);
    }
  };

  // 5. Traditional Email Submit
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError(null);

    if (mode === 'forgot') {
      if (!email.trim() || !email.includes('@')) {
        reportError(t.auth.errEmailInvalid);
        return;
      }
      setRecoverySent(true);
      showToast(t.auth.toastResetSent, 'info');
      return;
    }

    if (mode === 'login') {
      if (!email.trim() || !password) {
        reportError(t.auth.errEmailOrPassMissing);
        return;
      }
      setIsSubmitting(true);
      const res = await loginWithEmail(email, password);
      setIsSubmitting(false);
      if (res.success) {
        navigate('/my-invitations');
      } else if (res.message) {
        setFormError(res.message);
      }
      return;
    }

    // Register
    if (name.trim().length < 2) {
      reportError(t.auth.errNameMin);
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      reportError(t.auth.errEmailInvalid);
      return;
    }
    if (password.length < 6) {
      reportError(t.auth.errPasswordMin);
      return;
    }
    if (password !== confirmPassword) {
      reportError(t.auth.errPasswordMismatch);
      return;
    }
    if (!acceptTerms) {
      reportError(t.auth.errAcceptTerms);
      return;
    }

    setIsSubmitting(true);
    const res = await registerWithEmail({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
    });
    setIsSubmitting(false);
    if (res.success) {
      navigate('/my-invitations');
    } else if (res.message) {
      setFormError(res.message);
    }
  };

  // If already logged in, show instant confirmation glass card and navigate
  if (isLoggedIn && user) {
    return (
      <div className="pt-28 pb-20 min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
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
            <p className="text-xs text-[#5C4F48]">{user.email || user.phone}</p>
          </div>
          <div className="pt-2">
            <GlassButton
              tone="tinted"
              size="lg"
              onClick={() => navigate('/my-invitations')}
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
    <div className="pt-28 pb-20 min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <GlassSurface
        variant="elevated"
        rounded="3xl"
        className="w-full max-w-md p-6 sm:p-9 space-y-5 relative"
      >
        {/* Header with Logo */}
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
            {mode === 'login'
              ? t.auth.loginTitle
              : mode === 'register'
              ? t.auth.registerTitle
              : t.auth.forgotTitle}
          </h1>
          <p className="text-xs text-[#4A383F]">
            {mode === 'login'
              ? t.auth.loginSubtitle
              : mode === 'register'
              ? t.auth.registerSubtitle
              : t.auth.forgotSubtitle}
          </p>
        </div>

        {/* Welcome Banner */}
        {mode === 'register' && (
          <GlassSurface
            variant="tinted-pink"
            rounded="2xl"
            className="p-3.5 flex items-center gap-3 animate-fadeIn"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#F5C9D8] to-[#C94F79] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="text-xs min-w-0">
              <span className="font-extrabold text-[#1E1418] block">
                {t.auth.welcomeCardTitle}
              </span>
              <span className="text-[11px] text-[#4A383F]">{t.auth.welcomeCardDesc}</span>
            </div>
          </GlassSurface>
        )}

        {/* Mode toggle buttons (GlassSegmented) */}
        {mode !== 'forgot' && (
          <GlassSegmented<AuthModeToggle>
            fullWidth
            options={modeOptions}
            value={mode === 'register' ? 'register' : 'login'}
            onChange={(val) => {
              setFormError(null);
              setMode(val);
              navigate(val === 'register' ? '/register' : '/login');
            }}
            ariaLabel={`${t.auth.loginTab} / ${t.auth.registerTab}`}
            className="taklifim-auth-seg"
          />
        )}

        {/* Auth Method Tabs (GlassSegmented) */}
        {mode !== 'forgot' && (
          <div className="space-y-2">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#5C4F48] text-center">
              {t.auth.chooseMethodLabel}
            </div>
            <div className="w-full overflow-x-auto pb-1 no-scrollbar flex justify-center">
              <GlassSegmented<AuthTab>
                options={methodOptions}
                value={activeTab}
                onChange={(val) => {
                  setFormError(null);
                  setActiveTab(val);
                }}
                ariaLabel={t.auth.chooseMethodLabel}
                className="taklifim-auth-seg w-max sm:w-full"
                fullWidth
              />
            </div>
          </div>
        )}

        {/* Glass Inline Error Alert */}
        {formError && (
          <GlassSurface
            variant="tinted-pink"
            rounded="2xl"
            className="p-3 flex items-center gap-2.5 border border-rose-300/80 text-xs font-semibold text-rose-800 animate-fadeIn"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{formError}</span>
          </GlassSurface>
        )}

        {/* TAB 1: GOOGLE & APPLE AUTH */}
        {mode !== 'forgot' && activeTab === 'social' && (
          <div className="space-y-3 pt-1 animate-fadeIn">
            <GlassButton
              tone="light"
              size="lg"
              type="button"
              disabled={isSubmitting}
              loading={isSubmitting}
              onClick={handleGoogleAuth}
              leftIcon={<GoogleIcon />}
              className="w-full justify-center"
            >
              {isSubmitting
                ? t.auth.googleConnecting
                : mode === 'login'
                ? t.auth.googleLoginBtn
                : t.auth.googleRegisterBtn}
            </GlassButton>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleAppleAuth}
              className="w-full min-h-[48px] py-3 px-4 rounded-full bg-[#1E1418] hover:bg-black text-white font-semibold text-sm shadow-md hover:shadow-lg transition-colors flex items-center justify-center gap-2.5 disabled:opacity-60 border border-white/15 cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <AppleIcon className="w-4 h-4 fill-white" />
              )}
              <span>
                {isSubmitting
                  ? t.auth.googleConnecting
                  : mode === 'login'
                  ? t.auth.appleLoginBtn
                  : t.auth.appleRegisterBtn}
              </span>
            </button>

            <GlassSurface
              variant="subtle"
              rounded="2xl"
              className="p-3 text-[11px] text-[#5C4F48] text-center space-y-1"
            >
              <div>{t.auth.noPasswordNeeded}</div>
              <div>{t.auth.realtimeSyncBadge}</div>
            </GlassSurface>
          </div>
        )}

        {/* TAB 2: PHONE (SMS OTP) AUTH */}
        {mode !== 'forgot' && activeTab === 'phone' && (
          <div className="space-y-4 pt-1 animate-fadeIn">
            {!isOtpSent ? (
              <div className="space-y-3.5 text-xs">
                {mode === 'register' && (
                  <GlassInput
                    type="text"
                    required
                    label={t.auth.fullNameLabel}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder={t.auth.fullNamePlaceholder}
                    leftIcon={<User className="w-4 h-4" aria-hidden="true" />}
                  />
                )}

                <div className="space-y-1">
                  <label className="font-bold text-[#3A2D28] block text-[11px]">
                    {t.auth.phoneLabel}
                  </label>
                  <PhoneInput
                    value={phone}
                    onChange={(fullVal, valid) => {
                      setPhone(fullVal);
                      setIsPhoneValid(valid);
                      if (formError) setFormError(null);
                    }}
                    language={language}
                    required
                  />
                  <span className="text-[10px] text-[#5C4F48] block pt-0.5">
                    {t.auth.smsCodeHint}
                  </span>
                </div>

                <GlassButton
                  type="button"
                  tone="tinted"
                  size="lg"
                  disabled={isSubmitting || !phone}
                  loading={isSubmitting}
                  onClick={handleSendOtp}
                  leftIcon={<Smartphone className="w-4 h-4" aria-hidden="true" />}
                  rightIcon={<ArrowRight className="w-4 h-4" aria-hidden="true" />}
                  className="w-full justify-center"
                >
                  {isSubmitting ? t.auth.sendingOtpBtn : t.auth.sendOtpBtn}
                </GlassButton>
              </div>
            ) : (
              <form noValidate onSubmit={handleVerifyOtp} className="space-y-4 text-xs animate-fadeIn">
                <GlassSurface
                  variant="tinted-sky"
                  rounded="2xl"
                  className="p-3 text-[#1E3A5F] text-xs flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <span className="font-bold block">{t.auth.otpSentDescPrefix}</span>
                    <span className="text-[11px] opacity-85 truncate block">{phone}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOtpSent(false);
                      setFormError(null);
                    }}
                    className="min-h-[36px] px-2.5 text-[11px] font-bold text-[#2B6EA3] hover:underline shrink-0 cursor-pointer"
                  >
                    {t.auth.changePhoneBtn}
                  </button>
                </GlassSurface>

                <GlassInput
                  type="text"
                  maxLength={6}
                  autoFocus
                  required
                  label={t.auth.otpCodeTitle}
                  value={otpCode}
                  onChange={(e) => {
                    setOtpCode(e.target.value.replace(/\D/g, ''));
                    if (formError) setFormError(null);
                  }}
                  placeholder="• • • • • •"
                  leftIcon={<KeyRound className="w-4 h-4" aria-hidden="true" />}
                  className="text-center text-base tracking-[0.4em] font-extrabold"
                />

                <GlassButton
                  type="submit"
                  tone="tinted"
                  size="lg"
                  disabled={isSubmitting || otpCode.length < 4}
                  loading={isSubmitting}
                  leftIcon={<CheckCircle2 className="w-4 h-4" aria-hidden="true" />}
                  className="w-full justify-center"
                >
                  {isSubmitting ? t.auth.verifyingBtn : t.auth.verifyLoginBtn}
                </GlassButton>

                <div className="text-center pt-1">
                  {countdown > 0 ? (
                    <span className="text-[11px] text-[#5C4F48]">
                      {t.auth.resendOtpPrefix} {countdown} {t.auth.resendSecUnit}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="min-h-[36px] px-3 text-[11px] font-bold text-[#2B6EA3] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" aria-hidden="true" />
                      <span>{t.auth.resendOtpBtn}</span>
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 3: EMAIL / PASSWORD */}
        {(mode === 'forgot' || activeTab === 'email') && (
          <>
            {recoverySent && mode === 'forgot' ? (
              <div className="text-center py-6 space-y-4 animate-fadeIn">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center border border-white shadow-xs">
                  <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
                </div>
                <h2 className="font-bold text-sm text-[#1E1418]">{t.auth.resetLinkSentTitle}</h2>
                <p className="text-xs text-[#4A383F] max-w-xs mx-auto leading-relaxed">
                  «{email}» {t.auth.resetLinkSentDescSuffix}
                </p>
                <div className="flex justify-center">
                  <GlassButton
                    type="button"
                    tone="tinted"
                    size="md"
                    onClick={() => {
                      setRecoverySent(false);
                      setFormError(null);
                      setMode('login');
                    }}
                  >
                    {t.auth.backToLoginBtn}
                  </GlassButton>
                </div>
              </div>
            ) : (
              <form noValidate onSubmit={handleEmailSubmit} className="space-y-3.5 text-xs animate-fadeIn">
                {mode === 'register' && (
                  <GlassInput
                    type="text"
                    required
                    label={t.auth.fullNameLabel}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder={t.auth.fullNamePlaceholder}
                    leftIcon={<User className="w-4 h-4" aria-hidden="true" />}
                  />
                )}

                <GlassInput
                  type="email"
                  required
                  label={t.auth.emailLabel}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder={t.auth.emailPlaceholder}
                  leftIcon={<Mail className="w-4 h-4" aria-hidden="true" />}
                />

                {mode !== 'forgot' && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#3A2D28] text-[11px]">
                        {t.auth.passwordLabel}
                      </span>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormError(null);
                            setMode('forgot');
                          }}
                          className="text-[11px] text-[#C94F79] hover:underline font-bold cursor-pointer"
                        >
                          {t.auth.forgotPasswordBtn}
                        </button>
                      )}
                    </div>
                    <GlassInput
                      type={showPassword ? 'text' : 'password'}
                      required
                      aria-label={t.auth.passwordLabel}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      placeholder={t.auth.passwordPlaceholder}
                      leftIcon={<Lock className="w-4 h-4" aria-hidden="true" />}
                      rightElement={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={t.auth.togglePasswordVisibility}
                          className="w-9 h-9 flex items-center justify-center rounded-lg text-[#5C4F48] hover:text-[#1E1418] cursor-pointer"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" aria-hidden="true" />
                          ) : (
                            <Eye className="w-4 h-4" aria-hidden="true" />
                          )}
                        </button>
                      }
                    />
                  </div>
                )}

                {mode === 'register' && (
                  <GlassInput
                    type={showPassword ? 'text' : 'password'}
                    required
                    label={t.auth.confirmPasswordLabel}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder={t.auth.confirmPasswordPlaceholder}
                    leftIcon={<Lock className="w-4 h-4" aria-hidden="true" />}
                  />
                )}

                {mode === 'register' && (
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <span className="text-[11px] text-[#4A383F] leading-snug">
                      {t.auth.termsAgreePrefix}{' '}
                      <Link to="/terms" className="text-[#C94F79] underline font-bold">
                        {t.auth.termsLinkText}
                      </Link>{' '}
                      {t.auth.termsAndText}{' '}
                      <Link to="/privacy" className="text-[#C94F79] underline font-bold">
                        {t.auth.privacyLinkText}
                      </Link>
                      {t.auth.termsAgreeSuffix}
                    </span>
                    <GlassSwitch
                      checked={acceptTerms}
                      onChange={(checked) => {
                        setAcceptTerms(checked);
                        if (formError) setFormError(null);
                      }}
                      name="acceptTerms"
                    />
                  </div>
                )}

                {mode === 'forgot' && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setFormError(null);
                        setMode('login');
                      }}
                      className="text-[11px] font-bold text-[#2B6EA3] hover:underline cursor-pointer"
                    >
                      {t.auth.backToLoginBtn}
                    </button>
                  </div>
                )}

                <div className="pt-2">
                  <GlassButton
                    type="submit"
                    tone="tinted"
                    size="lg"
                    disabled={isSubmitting}
                    loading={isSubmitting}
                    rightIcon={<ArrowRight className="w-4 h-4" aria-hidden="true" />}
                    className="w-full justify-center"
                  >
                    {isSubmitting
                      ? t.auth.loggingInBtn
                      : mode === 'login'
                      ? t.auth.loginBtn
                      : mode === 'register'
                      ? t.auth.registerBtn
                      : t.auth.sendResetBtn}
                  </GlassButton>
                </div>
              </form>
            )}
          </>
        )}

        {/* Security badge */}
        <div className="pt-3 border-t border-black/8 flex items-center justify-center gap-2 text-[11px] text-[#5C4F48]">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
          <span>{t.auth.securityBadgeAlt}</span>
        </div>
      </GlassSurface>
    </div>
  );
};
