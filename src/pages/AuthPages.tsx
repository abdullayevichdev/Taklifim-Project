import React, { useState, useEffect } from 'react';
import { useRouter, Link } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import {
  Loader2,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  Lock,
  Mail,
  User,
  ShieldCheck,
  Gift,
  Smartphone,
  KeyRound,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { PhoneInput } from '../components/PhoneInput';

// Official Google 4-color SVG
const GoogleIcon: React.FC = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
const AppleIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5 fill-current shrink-0" }) => (
  <svg className={className} viewBox="0 0 170 170">
    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-6.3-9.67-11.08-20.9-14.34-33.69-3.26-12.79-4.89-24.97-4.89-36.54 0-14.34 3.58-26.17 10.74-35.5 7.16-9.33 16.27-14.07 27.32-14.22 4.8 0 10.3 1.34 16.51 4.02 6.21 2.68 10.15 4.08 11.83 4.2 2.01-.22 6.15-1.68 12.43-4.39 6.28-2.7 11.84-3.95 16.69-3.76 12.63.65 22.84 5.34 30.63 14.07-11.08 6.74-16.51 16.08-16.29 28.02.22 9.35 3.8 17.18 10.74 23.51 6.94 6.33 15.19 10.05 24.75 11.16-2.18 6.74-4.89 13.91-8.14 21.52zM119.22 31.85c0-7.17 2.58-13.88 7.74-20.13 5.16-6.25 11.66-10.28 19.5-12.09.43 1.09.65 2.28.65 3.58 0 7.39-2.72 14.32-8.16 20.79-5.43 6.47-11.95 10.3-19.55 11.49-.11-1.2-.18-2.41-.18-3.64z" />
  </svg>
);

type AuthTab = 'social' | 'phone' | 'email';

export const AuthPages: React.FC<{ initialMode?: 'login' | 'register' | 'forgot' }> = ({
  initialMode = 'login',
}) => {
  const { path, navigate } = useRouter();
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
    canUseFreePlan,
  } = useAuth();

  // If already logged in, automatically redirect to My Invitations
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

  // Fields
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

  const isEligibleForFree = canUseFreePlan();

  // 1. Google Auth
  const handleGoogleAuth = async () => {
    if (isSubmitting) return;
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
    if (!phone.trim() || !isPhoneValid) {
      showToast('Iltimos, telefon raqamingizni to‘liq kiriting', 'error');
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
    }
  };

  // 4. Phone OTP Verify
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      showToast('Iltimos, 6 xonali SMS kodni kiriting', 'error');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      showToast('Iltimos, to‘liq ismingizni kiriting', 'error');
      return;
    }

    setIsSubmitting(true);
    const res = await verifyPhoneOtp(phone, otpCode.trim(), name);
    setIsSubmitting(false);
    if (res.success) {
      navigate('/my-invitations');
    }
  };

  // 5. Traditional Email Submit
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (mode === 'forgot') {
      if (!email.trim() || !email.includes('@')) {
        showToast('Iltimos, to‘g‘ri elektron pochtangizni kiriting', 'error');
        return;
      }
      setRecoverySent(true);
      showToast('Parolni tiklash havolasi elektron pochtangizga yuborildi', 'info');
      return;
    }

    if (mode === 'login') {
      if (!email.trim() || !password) {
        showToast('Elektron pochta va parolni kiriting', 'error');
        return;
      }
      setIsSubmitting(true);
      const res = await loginWithEmail(email, password);
      setIsSubmitting(false);
      if (res.success) {
        navigate('/my-invitations');
      }
      return;
    }

    // Register
    if (!name.trim()) {
      showToast('Iltimos, ism va familiyangizni kiriting', 'error');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      showToast('Iltimos, to‘g‘ri elektron pochtangizni kiriting', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('Parol kamida 6 ta belgidan iborat bo‘lishi lozim', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Kiritilgan parollar bir-biriga mos kelmadi', 'error');
      return;
    }
    if (!acceptTerms) {
      showToast('Foydalanish shartlariga rozilik bildiring', 'error');
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
    }
  };

  // If already logged in, show instant confirmation card and navigate
  if (isLoggedIn && user) {
    return (
      <div className="pt-28 pb-20 min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
        <div className="w-full max-w-md glass-panel-elevated rounded-[36px] p-8 sm:p-10 border border-white/95 shadow-[0_24px_64px_rgba(226,123,155,0.18)] space-y-6 text-center bg-white/95 backdrop-blur-2xl animate-fadeIn">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#F5C9D8] to-[#E27B9B] text-white flex items-center justify-center mx-auto shadow-lg text-2xl font-bold">
            ✓
          </div>
          <div className="space-y-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 block">
              Muvaffaqiyatli kirdingiz
            </span>
            <h2 className="font-playfair text-2xl sm:text-3xl font-bold text-[#1E1418]">
              Xush kelibsiz, {user.name}!
            </h2>
            <p className="text-xs text-[#7A6A63]">{user.email || user.phone}</p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => navigate('/my-invitations')}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#1E1418] to-[#3A242B] text-white font-bold text-xs tracking-wider uppercase shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Taklifnomalarimga o‘tish</span>
              <ArrowRight className="w-4 h-4 text-[#E27B9B] group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-20 min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background ambient orbs */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-tr from-[#F5C9D8]/35 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-gradient-to-bl from-[#B9DFFA]/35 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="w-full max-w-md glass-panel-elevated rounded-[36px] p-7 sm:p-9 border border-white/95 shadow-[0_24px_64px_rgba(226,123,155,0.18)] space-y-6 relative bg-white/92 backdrop-blur-2xl">
        {/* Header with Logo */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <div className="w-12 h-12 rounded-2xl p-0.5 bg-gradient-to-tr from-[#F5C9D8] via-white to-[#B9DFFA] shadow-md transition-transform duration-300 group-hover:scale-105 border border-white">
              <img src="/logo.jpg" alt="Taklifim" className="w-full h-full object-cover rounded-[14px]" />
            </div>
          </Link>
          <h1 className="font-playfair text-2xl sm:text-3xl font-extrabold text-[#1E1418]">
            {mode === 'login'
              ? 'Tizimga Kirish'
              : mode === 'register'
              ? 'Ro‘yxatdan O‘tish'
              : 'Parolni Tiklash'}
          </h1>
          <p className="text-xs text-[#5C4F48]">
            {mode === 'login'
              ? 'O‘z taklifnomalaringiz va mehmonlar javoblarini boshqaring'
              : mode === 'register'
              ? 'Tezkor va xavfsiz hisob oching'
              : 'Elektron pochtangizni kiriting'}
          </p>
        </div>

        {/* Welcome Banner */}
        {mode === 'register' && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#FFF5F8] to-[#F0F8FF] border border-[#E27B9B]/30 flex items-center gap-3 animate-fadeIn">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#F5C9D8] to-[#E27B9B] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <span className="font-extrabold text-[#1E1418] block">
                Xush kelibsiz!
              </span>
              <span className="text-[11px] text-[#5C4F48]">
                Zamonaviy va nafis interaktiv taklifnomalar xizmatiga ulaning.
              </span>
            </div>
          </div>
        )}

        {/* Kirish / Ro'yxatdan o'tish rejimi tugmalari */}
        {mode !== 'forgot' && (
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-black/5 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                navigate('/login');
              }}
              className={`py-2 rounded-xl transition-all ${
                mode === 'login'
                  ? 'bg-white text-[#1E1418] shadow-xs font-extrabold'
                  : 'text-[#7A6A63] hover:text-black'
              }`}
            >
              Kirish
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                navigate('/register');
              }}
              className={`py-2 rounded-xl transition-all ${
                mode === 'register'
                  ? 'bg-white text-[#1E1418] shadow-xs font-extrabold'
                  : 'text-[#7A6A63] hover:text-black'
              }`}
            >
              Ro‘yxatdan o‘tish
            </button>
          </div>
        )}

        {/* AUTH METHOD TABS: 1. Tezkor (Google & Apple) | 2. Telefon (SMS) | 3. Email */}
        {mode !== 'forgot' && (
          <div className="space-y-2">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#7A6A63] text-center">
              Kirish usulini tanlang:
            </div>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-black/5 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('social')}
                className={`py-2 px-1 rounded-xl flex items-center justify-center gap-1.5 transition-all text-center ${
                  activeTab === 'social'
                    ? 'bg-white text-[#1E1418] shadow-xs font-extrabold ring-1 ring-black/5'
                    : 'text-[#5C4F48] hover:text-black font-semibold'
                }`}
              >
                <span className="text-[11px]">Google / Apple</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('phone')}
                className={`py-2 px-1 rounded-xl flex items-center justify-center gap-1.5 transition-all text-center ${
                  activeTab === 'phone'
                    ? 'bg-white text-[#1E1418] shadow-xs font-extrabold ring-1 ring-black/5'
                    : 'text-[#5C4F48] hover:text-black font-semibold'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-[#4A9BD4]" />
                <span className="text-[11px]">Telefon (SMS)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('email')}
                className={`py-2 px-1 rounded-xl flex items-center justify-center gap-1.5 transition-all text-center ${
                  activeTab === 'email'
                    ? 'bg-white text-[#1E1418] shadow-xs font-extrabold ring-1 ring-black/5'
                    : 'text-[#5C4F48] hover:text-black font-semibold'
                }`}
              >
                <Mail className="w-3.5 h-3.5 text-[#D9658B]" />
                <span className="text-[11px]">Email</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 1: PROFESSIONAL GOOGLE & APPLE AUTH
        ======================================================== */}
        {mode !== 'forgot' && activeTab === 'social' && (
          <div className="space-y-3.5 pt-1 animate-fadeIn">
            {/* Google Button */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleGoogleAuth}
              className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-gray-50 text-[#1E1418] font-bold text-xs border border-black/15 shadow-sm hover:shadow transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-75 group cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-[#E27B9B] border-t-transparent rounded-full animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              <span>
                {isSubmitting ? 'Tizimga ulanmoqda...' : mode === 'login' ? 'Google orqali kirish' : 'Google orqali ro‘yxatdan o‘tish'}
              </span>
            </button>

            {/* Apple Button */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleAppleAuth}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#000000] hover:bg-neutral-900 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-75 group border border-white/10 cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <AppleIcon className="w-4 h-4 fill-white" />
              )}
              <span>
                {isSubmitting ? 'Tizimga ulanmoqda...' : mode === 'login' ? 'Apple ID orqali kirish' : 'Apple ID bilan davom etish'}
              </span>
            </button>

            <div className="p-3 rounded-2xl bg-black/[0.02] border border-black/5 text-[11px] text-[#7A6A63] text-center space-y-1">
              <div>✓ Parol eslab qolish shart emas</div>
              <div>✓ Real-time ma’lumotlar bazasi bilan 100% integratsiya</div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 2: PROFESSIONAL PHONE (SMS OTP) AUTH
        ======================================================== */}
        {mode !== 'forgot' && activeTab === 'phone' && (
          <div className="space-y-4 pt-1 animate-fadeIn">
            {!isOtpSent ? (
              <div className="space-y-3.5 text-xs">
                {mode === 'register' && (
                  <div className="space-y-1">
                    <label className="font-bold text-[#3A2D28] block">To‘liq ismingiz</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#7A6A63] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Masalan: Dilnoza Karimova"
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-black/10 outline-none focus:border-[#4A9BD4] text-xs text-[#1E1418]"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="font-bold text-[#3A2D28] block">Telefon raqamingiz</label>
                  <PhoneInput
                    value={phone}
                    onChange={(fullVal, valid) => {
                      setPhone(fullVal);
                      setIsPhoneValid(valid);
                    }}
                    required
                  />
                  <span className="text-[10px] text-[#7A6A63] block">
                    Ushbu raqamga 6 xonali tasdiqlash kodi yuboriladi.
                  </span>
                </div>

                <button
                  type="button"
                  disabled={isSubmitting || !phone}
                  onClick={handleSendOtp}
                  className="w-full py-3.5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-[#4A9BD4] to-[#2563EB] shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>SMS kod yuborilmoqda...</span>
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-4 h-4" />
                      <span>SMS Kod Olish</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs animate-fadeIn">
                <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold block">SMS kod yuborildi:</span>
                    <span className="text-[11px] opacity-80">{phone}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOtpSent(false)}
                    className="text-[11px] font-bold text-[#4A9BD4] hover:underline"
                  >
                    Raqamni o‘zgartirish
                  </button>
                </div>

                <div className="space-y-1.5 text-center">
                  <label className="font-bold text-[#3A2D28] block text-xs">
                    6 xonali SMS kodni kiriting
                  </label>
                  <div className="relative max-w-xs mx-auto">
                    <KeyRound className="w-4 h-4 text-[#7A6A63] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      maxLength={6}
                      autoFocus
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="• • • • • •"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-black/15 outline-none focus:border-[#4A9BD4] text-center text-base tracking-[0.4em] font-extrabold text-[#1E1418]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || otpCode.length < 4}
                  className="w-full py-3.5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Tekshirilmoqda...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Kodni Tasdiqlash va Kirish</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-1">
                  {countdown > 0 ? (
                    <span className="text-[11px] text-[#7A6A63]">
                      Qayta yuborish: {countdown} soniya
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="text-[11px] font-bold text-[#4A9BD4] hover:underline inline-flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Kodni qaytadan yuborish</span>
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 3: TRADITIONAL EMAIL / PASSWORD
        ======================================================== */}
        {(mode === 'forgot' || activeTab === 'email') && (
          <>
            {recoverySent && mode === 'forgot' ? (
              <div className="text-center py-6 space-y-4 animate-fadeIn">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-sm text-[#1E1418]">Havola jo‘natildi!</h3>
                <p className="text-xs text-[#5C4F48] max-w-xs mx-auto">
                  «{email}» manziliga parolingizni tiklash bo‘yicha ko‘rsatmalar yuborildi.
                </p>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="px-6 py-2.5 rounded-xl bg-[#1E1418] text-white text-xs font-bold hover:bg-black"
                >
                  Kirish sahifasiga qaytish
                </button>
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-3.5 text-xs animate-fadeIn">
                {mode === 'register' && (
                  <div className="space-y-1">
                    <label className="font-bold text-[#3A2D28] block">To‘liq ismingiz</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#7A6A63] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Masalan: Nodirbek Salimov"
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-black/10 outline-none focus:border-[#E27B9B] text-xs text-[#1E1418]"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="font-bold text-[#3A2D28] block">
                    Elektron pochta manzili
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#7A6A63] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="masalan: nodirbek@gmail.com"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-black/10 outline-none focus:border-[#E27B9B] text-xs text-[#1E1418]"
                    />
                  </div>
                </div>

                {mode !== 'forgot' && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-[#3A2D28]">Parol</label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => setMode('forgot')}
                          className="text-[11px] text-[#E27B9B] hover:underline font-bold"
                        >
                          Parolni unutdingizmi?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#7A6A63] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Kamida 6 ta belgi"
                        className="w-full pl-10 pr-10 py-3 rounded-2xl bg-white border border-black/10 outline-none focus:border-[#E27B9B] text-xs text-[#1E1418]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7A6A63] hover:text-black"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {mode === 'register' && (
                  <div className="space-y-1">
                    <label className="font-bold text-[#3A2D28] block">Parolni tasdiqlang</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#7A6A63] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Parolni qayta kiriting"
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-black/10 outline-none focus:border-[#E27B9B] text-xs text-[#1E1418]"
                      />
                    </div>
                  </div>
                )}

                {mode === 'register' && (
                  <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded text-[#E27B9B]"
                    />
                    <span className="text-[11px] text-[#5C4F48] leading-tight">
                      Men{' '}
                      <Link to="/terms" className="text-[#E27B9B] underline font-bold">
                        Foydalanish shartlari
                      </Link>{' '}
                      va{' '}
                      <Link to="/privacy" className="text-[#E27B9B] underline font-bold">
                        Maxfiylik siyosati
                      </Link>
                      ga roziman.
                    </span>
                  </label>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 rounded-2xl text-xs font-extrabold text-white bg-gradient-to-r from-[#E27B9B] via-[#D9658B] to-[#B9DFFA] shadow-[0_10px_30px_rgba(226,123,155,0.4)] hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Yuklanmoqda...</span>
                      </>
                    ) : (
                      <>
                        <span>
                          {mode === 'login'
                            ? 'Email orqali kirish'
                            : mode === 'register'
                            ? 'Ro‘yxatdan o‘tish'
                            : 'Tiklash havolasini yuborish'}
                        </span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* Security badge */}
        <div className="pt-2 border-t border-black/5 flex items-center justify-center gap-2 text-[11px] text-[#7A6A63]">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Real-time ma’lumotlar 100% himoyalangan</span>
        </div>
      </div>
    </div>
  );
};
