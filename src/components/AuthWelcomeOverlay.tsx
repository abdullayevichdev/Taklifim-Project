import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Check } from 'lucide-react';
import { useLanguage } from '../locales';
import { getPortalRoot } from '../utils/portalRoot';

const EVENT = 'tashrifim:welcome';

interface WelcomeDetail {
  name: string;
  isNew: boolean;
}

/** Fires the site-wide sign-in celebration (works even if the sign-in form unmounts right after). */
export function showAuthWelcome(detail: WelcomeDetail): void {
  window.dispatchEvent(new CustomEvent<WelcomeDetail>(EVENT, { detail }));
}

const T = {
  uz: { welcomeNew: 'Tabriklaymiz', welcomeBack: 'Xush kelibsiz', text: 'Siz muvaffaqiyatli kirdingiz. Endi o‘z taklifnomangizni yaratishingiz mumkin!', go: 'Davom etish' },
  ru: { welcomeNew: 'Поздравляем', welcomeBack: 'С возвращением', text: 'Вы успешно вошли. Теперь можно создать своё приглашение!', go: 'Продолжить' },
  en: { welcomeNew: 'Congratulations', welcomeBack: 'Welcome back', text: 'You are signed in. Now you can create your invitation!', go: 'Continue' },
};

async function burst() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  try {
    const confetti = (await import('canvas-confetti')).default;
    const colors = ['#F5C9D8', '#D9658B', '#B48B47', '#FFD700', '#B9DFFA'];
    confetti({ particleCount: 90, spread: 80, origin: { y: 0.55 }, colors, zIndex: 10001 });
    window.setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors, zIndex: 10001 }), 220);
    window.setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors, zIndex: 10001 }), 380);
  } catch {
    /* decorative only */
  }
}

/** Mounted once in the app shell; shows the welcome card + confetti after an Apple/phone sign-in. */
export const AuthWelcomeOverlay: React.FC = () => {
  const { language } = useLanguage();
  const t = T[language as keyof typeof T] || T.uz;
  const [detail, setDetail] = useState<WelcomeDetail | null>(null);

  useEffect(() => {
    const onWelcome = (e: Event) => {
      setDetail((e as CustomEvent<WelcomeDetail>).detail);
      burst();
    };
    window.addEventListener(EVENT, onWelcome);
    return () => window.removeEventListener(EVENT, onWelcome);
  }, []);

  useEffect(() => {
    if (!detail) return;
    const onKey = (e: KeyboardEvent) => (e.key === 'Escape' || e.key === 'Enter') && setDetail(null);
    window.addEventListener('keydown', onKey);
    const timer = window.setTimeout(() => setDetail(null), 6000);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(timer);
    };
  }, [detail]);

  const root = typeof document !== 'undefined' ? getPortalRoot() : null;
  if (!detail || !root) return null;
  const first = detail.name.split(' ')[0];

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center px-5" role="dialog" aria-modal="true" aria-live="polite">
      <div className="absolute inset-0 bg-black/40 apple-backdrop-in" onClick={() => setDetail(null)} />
      <div className="relative w-full max-w-sm bg-[#FBF9F8] rounded-[28px] shadow-2xl px-6 pt-9 pb-7 text-center space-y-4 apple-sheet-in">
        <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-[#2BB673] to-[#1A8F57] flex items-center justify-center shadow-lg apple-check-pop">
          <Check className="w-10 h-10 text-white stroke-[3]" />
        </div>
        <h2 className="font-playfair text-2xl font-bold text-[#1E1418] apple-rise" style={{ animationDelay: '120ms' }}>
          {detail.isNew ? t.welcomeNew : t.welcomeBack}
          {first ? `, ${first}` : ''}! 🎉
        </h2>
        <p className="text-sm text-[#4A3E39] apple-rise" style={{ animationDelay: '220ms' }}>
          {t.text}
        </p>
        <button
          type="button"
          autoFocus
          onClick={() => setDetail(null)}
          className="apple-rise w-full min-h-[52px] rounded-2xl bg-[#1E1418] text-white font-bold inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          style={{ animationDelay: '320ms' }}
        >
          {t.go} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>,
    root
  );
};

export default AuthWelcomeOverlay;
