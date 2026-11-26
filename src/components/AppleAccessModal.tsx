import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, EyeOff, Loader2, Lock, Phone, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../locales';
import { getPortalRoot } from '../utils/portalRoot';
import { useSiteSettings, formatPhoneDisplay } from '../services/siteSettings';
import { AppleIcon, GoogleIcon } from './SocialLoginButtons';
import { showAuthWelcome } from './AuthWelcomeOverlay';

type Mode = 'register' | 'login';

const L = {
  uz: {
    gTitle: 'Google orqali kirish',
    gSubtitle: 'Telefon raqam va 4 xonali PIN bilan oson va xavfsiz kirish',
    title: 'Apple orqali kirish',
    subtitle: 'iPhone foydalanuvchilari uchun telefon raqam va PIN bilan oson kirish',
    tabRegister: 'Yangi akkaunt',
    tabLogin: 'Menda akkaunt bor',
    firstName: 'Ism',
    lastName: 'Familiya',
    phone: 'Telefon raqam',
    email: 'Email (ixtiyoriy)',
    emailHint: 'Google yoki Apple (iCloud) emailingiz',
    pin: '4 xonali PIN o‘ylab toping',
    pinConfirm: 'PIN’ni takrorlang',
    pinLogin: 'PIN kod',
    pinNote: 'Keyingi safar shu raqam va PIN bilan kirasiz. PIN’ni hech kimga aytmang.',
    register: 'Ro‘yxatdan o‘tish',
    login: 'Kirish',
    pinMismatch: 'PIN kodlar mos kelmadi.',
    pinShort: 'PIN 4 ta raqamdan iborat bo‘lsin.',
    phoneBad: 'Telefon raqamni to‘liq kiriting (9 ta raqam).',
    forgot: 'PIN’ni unutdingizmi? Admin bilan bog‘laning:',
    network: 'Server bilan bog‘lanib bo‘lmadi. Internetni tekshiring.',
    close: 'Yopish',
    show: 'Ko‘rsatish',
    hide: 'Yashirish',
  },
  ru: {
    gTitle: 'Вход через Google',
    gSubtitle: 'Простой и безопасный вход по номеру телефона и 4-значному PIN',
    title: 'Вход через Apple',
    subtitle: 'Простой вход для пользователей iPhone по номеру телефона и PIN',
    tabRegister: 'Новый аккаунт',
    tabLogin: 'У меня есть аккаунт',
    firstName: 'Имя',
    lastName: 'Фамилия',
    phone: 'Номер телефона',
    email: 'Email (необязательно)',
    emailHint: 'Ваш Google или Apple (iCloud) email',
    pin: 'Придумайте 4-значный PIN',
    pinConfirm: 'Повторите PIN',
    pinLogin: 'PIN-код',
    pinNote: 'В следующий раз входите по этому номеру и PIN. Никому не сообщайте PIN.',
    register: 'Зарегистрироваться',
    login: 'Войти',
    pinMismatch: 'PIN-коды не совпадают.',
    pinShort: 'PIN должен состоять из 4 цифр.',
    phoneBad: 'Введите номер полностью (9 цифр).',
    forgot: 'Забыли PIN? Свяжитесь с администратором:',
    network: 'Нет связи с сервером. Проверьте интернет.',
    close: 'Закрыть',
    show: 'Показать',
    hide: 'Скрыть',
  },
  en: {
    gTitle: 'Continue with Google',
    gSubtitle: 'Easy, secure sign-in with your phone number and a 4-digit PIN',
    title: 'Continue with Apple',
    subtitle: 'Easy sign-in for iPhone users with phone number and PIN',
    tabRegister: 'New account',
    tabLogin: 'I have an account',
    firstName: 'First name',
    lastName: 'Last name',
    phone: 'Phone number',
    email: 'Email (optional)',
    emailHint: 'Your Google or Apple (iCloud) email',
    pin: 'Choose a 4-digit PIN',
    pinConfirm: 'Repeat the PIN',
    pinLogin: 'PIN code',
    pinNote: 'Next time sign in with this number and PIN. Never share your PIN.',
    register: 'Create account',
    login: 'Sign in',
    pinMismatch: 'PINs do not match.',
    pinShort: 'PIN must be 4 digits.',
    phoneBad: 'Enter the full phone number (9 digits).',
    forgot: 'Forgot your PIN? Contact the admin:',
    network: 'Cannot reach the server. Check your connection.',
    close: 'Close',
    show: 'Show',
    hide: 'Hide',
  },
};

const maskUz = (digits: string) => {
  const d = digits.slice(0, 9);
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');
};

const FIELD =
  'w-full min-h-[48px] px-4 rounded-2xl border border-black/10 bg-white text-[15px] text-[#1E1418] outline-none transition-shadow focus:border-[#1E1418] focus:ring-2 focus:ring-black/10';

/** 4-box PIN entry backed by a single numeric input (works with paste and mobile keyboards). */
const PinField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  visible: boolean;
  autoComplete: string;
  id: string;
}> = ({ label, value, onChange, visible, autoComplete, id }) => {
  const ref = useRef<HTMLInputElement | null>(null);
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-[#4A3E39] mb-1.5">
        {label}
      </label>
      <div className="relative" onClick={() => ref.current?.focus()}>
        <input
          ref={ref}
          id={id}
          type={visible ? 'text' : 'password'}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={autoComplete}
          maxLength={4}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-text"
          aria-label={label}
        />
        <div className="grid grid-cols-4 gap-2.5 pointer-events-none" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => {
            const filled = i < value.length;
            const active = focused && i === Math.min(value.length, 3);
            return (
              <div
                key={i}
                className={`h-14 rounded-2xl border-2 flex items-center justify-center text-2xl font-bold transition-colors ${
                  filled ? 'border-[#1E1418] bg-white' : active ? 'border-[#1E1418]/50 bg-white' : 'border-black/10 bg-[#F7F3F1]'
                }`}
              >
                {filled ? (visible ? value[i] : <span className="w-3 h-3 rounded-full bg-[#1E1418] apple-dot-pop" />) : ''}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface AppleAccessModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** Which button opened the sheet — both use the same phone + PIN accounts. */
  brand?: 'apple' | 'google';
}

/**
 * "Apple orqali kirish": Apple users sign up with first/last name, phone, optional email and a
 * 4-digit PIN; later they sign in with phone + PIN (the phone number is the account key).
 */
export const AppleAccessModal: React.FC<AppleAccessModalProps> = ({ open, onClose, onSuccess, brand = 'apple' }) => {
  const { language } = useLanguage();
  const l = L[language as keyof typeof L] || L.uz;
  const { loginWithPhoneToken } = useAuth();
  const isGoogle = brand === 'google';
  const site = useSiteSettings();

  const [mode, setMode] = useState<Mode>('register');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, busy, onClose]);

  useEffect(() => {
    if (!open) {
      setError('');
      setPin('');
      setPin2('');
      setBusy(false);
    }
  }, [open]);

  if (!open) return null;
  const root = getPortalRoot();
  if (!root) return null;

  const fail = (msg: string) => {
    setError(msg);
    setShake((n) => n + 1);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    if (phone.length !== 9) return fail(l.phoneBad);
    if (pin.length !== 4) return fail(l.pinShort);
    if (mode === 'register' && pin !== pin2) return fail(l.pinMismatch);

    setBusy(true);
    try {
      const res = await fetch('/api/auth/phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'register'
            ? { mode, firstName, lastName, phone: `998${phone}`, email, pin, via: brand }
            : { mode, phone: `998${phone}`, pin }
        ),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok || !data.token) {
        if (data?.code === 'PHONE_TAKEN') {
          setMode('login');
          setPin('');
          setPin2('');
        } else if (data?.code === 'NOT_FOUND') {
          setMode('register');
          setPin('');
        } else if (mode === 'login') {
          setPin('');
        }
        fail(data?.error || l.network);
        return;
      }
      const signIn = await loginWithPhoneToken(data.token);
      if (!signIn.success) {
        fail(signIn.message || l.network);
        return;
      }
      showAuthWelcome({ name: String(data.name || ''), isNew: Boolean(data.isNew) });
      onSuccess?.();
      onClose();
    } catch {
      fail(l.network);
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={l.title}>
      <div className="absolute inset-0 bg-black/45 apple-backdrop-in" onClick={() => !busy && onClose()} />

      <div
        key={shake}
        className={`relative w-full sm:max-w-md max-h-[92dvh] overflow-y-auto bg-[#FBF9F8] rounded-t-[28px] sm:rounded-[28px] shadow-2xl ${
          shake ? 'apple-shake' : 'apple-sheet-in'
        }`}
      >
        <form onSubmit={submit} className="px-5 sm:px-6 pt-5 pb-6 space-y-4" noValidate>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-md ${
                    isGoogle ? 'bg-white border border-black/10' : 'bg-[#1E1418]'
                  }`}
                >
                  {isGoogle ? <GoogleIcon className="w-5 h-5 shrink-0" /> : <AppleIcon className="w-5 h-5 fill-white shrink-0" />}
                </span>
                <div>
                  <h2 className="font-bold text-lg text-[#1E1418] leading-tight">{isGoogle ? l.gTitle : l.title}</h2>
                  <p className="text-xs text-[#7A6A63] leading-snug">{isGoogle ? l.gSubtitle : l.subtitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                aria-label={l.close}
                className="w-9 h-9 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 p-1 rounded-2xl bg-black/5 relative" role="tablist">
              <span
                className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl bg-white shadow-sm transition-transform duration-300 ease-out"
                style={{ transform: mode === 'login' ? 'translateX(calc(100% + 0px))' : 'translateX(0)', left: 4 }}
                aria-hidden="true"
              />
              {(['register', 'login'] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => {
                    setMode(m);
                    setError('');
                  }}
                  className={`relative z-[1] min-h-[40px] rounded-xl text-sm font-semibold transition-colors ${mode === m ? 'text-[#1E1418]' : 'text-[#7A6A63]'}`}
                >
                  {m === 'register' ? l.tabRegister : l.tabLogin}
                </button>
              ))}
            </div>

            <div key={mode} className="space-y-3 apple-fade">
              {mode === 'register' && (
                <div className="grid grid-cols-2 gap-2.5">
                  <label className="block">
                    <span className="block text-xs font-semibold text-[#4A3E39] mb-1.5">{l.firstName}</span>
                    <input className={FIELD} value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" maxLength={40} required />
                  </label>
                  <label className="block">
                    <span className="block text-xs font-semibold text-[#4A3E39] mb-1.5">{l.lastName}</span>
                    <input className={FIELD} value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" maxLength={40} required />
                  </label>
                </div>
              )}

              <label className="block">
                <span className="block text-xs font-semibold text-[#4A3E39] mb-1.5">{l.phone}</span>
                <div className="flex items-stretch rounded-2xl border border-black/10 bg-white focus-within:border-[#1E1418] focus-within:ring-2 focus-within:ring-black/10 overflow-hidden">
                  <span className="flex items-center gap-1.5 px-3.5 bg-[#F7F3F1] border-r border-black/10 text-[15px] font-semibold text-[#1E1418] shrink-0">
                    <Phone className="w-4 h-4 text-[#7A6A63]" /> +998
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="90 123 45 67"
                    value={maskUz(phone)}
                    onChange={(e) => {
                      let d = e.target.value.replace(/\D/g, '');
                      if (d.startsWith('998') && d.length > 9) d = d.slice(3);
                      setPhone(d.slice(0, 9));
                    }}
                    className="flex-1 min-w-0 min-h-[48px] px-3.5 text-[15px] tracking-wide outline-none bg-transparent tabular-nums"
                    required
                  />
                </div>
              </label>

              {mode === 'register' && (
                <label className="block">
                  <span className="block text-xs font-semibold text-[#4A3E39] mb-1.5">{l.email}</span>
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="name@icloud.com"
                    className={FIELD}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={120}
                  />
                  <span className="block text-[11px] text-[#7A6A63] mt-1">{l.emailHint}</span>
                </label>
              )}

              <PinField
                id="apple-pin"
                label={mode === 'register' ? l.pin : l.pinLogin}
                value={pin}
                onChange={setPin}
                visible={showPin}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              />
              {mode === 'register' && (
                <PinField id="apple-pin2" label={l.pinConfirm} value={pin2} onChange={setPin2} visible={showPin} autoComplete="new-password" />
              )}
              <button
                type="button"
                onClick={() => setShowPin((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4A3E39]"
              >
                {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />} {showPin ? l.hide : l.show}
              </button>

              {mode === 'register' ? (
                <p className="flex items-start gap-2 text-[11.5px] leading-relaxed text-[#4A3E39] bg-[#F3EEEA] rounded-xl px-3 py-2">
                  <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {l.pinNote}
                </p>
              ) : (
                <p className="text-[11.5px] text-[#7A6A63]">
                  {l.forgot}{' '}
                  <a href={`tel:+${site.phone}`} className="font-semibold text-[#1E1418] underline">
                    {formatPhoneDisplay(site.phone)}
                  </a>
                </p>
              )}
            </div>

            {error && (
              <p role="alert" className="text-sm font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full min-h-[52px] rounded-2xl bg-[#1E1418] hover:bg-black text-white font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition-transform"
            >
              {busy ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isGoogle ? (
                <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                  <GoogleIcon className="w-4 h-4 shrink-0" />
                </span>
              ) : (
                <AppleIcon className="w-4 h-4 fill-white shrink-0" />
              )}
              {mode === 'register' ? l.register : l.login}
            </button>
        </form>
      </div>
    </div>,
    root
  );
};

export default AppleAccessModal;
