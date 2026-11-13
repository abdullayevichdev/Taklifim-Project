import React from 'react';
import { useRouter, Link } from '../context/RouterContext';
import { useLanguage } from '../locales';
import { Heart, Send, Instagram, Phone } from 'lucide-react';
import { FlagIcon } from './FlagIcon';
import { shouldShowBottomNav } from './glass/GlassBottomNav';

export const Footer: React.FC = () => {
  const { path } = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const hasBottomNav = shouldShowBottomNav(path);

  return (
    <footer
      className={`relative z-10 glass-surface-subtle border-t border-white/85 text-[#4A3E39] pt-14 ${
        hasBottomNav ? 'pb-[calc(96px+env(safe-area-inset-bottom))] lg:pb-12' : 'pb-12'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-10 border-b border-black/8">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl overflow-hidden p-0.5 bg-gradient-to-tr from-[#F5C9D8] to-[#B9DFFA] flex items-center justify-center border border-white/90 shadow-xs">
                <img
                  src="/logo.jpg"
                  alt="Taklifim Logo"
                  className="w-full h-full object-cover rounded-[12px]"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.includes('Taklifim%20logo.jpg')) {
                      target.src = '/assets/logo.jpg';
                    }
                  }}
                />
              </div>
              <span className="font-playfair text-2xl font-bold text-[#1E1418] tracking-wide">
                Taklifim
              </span>
            </Link>
            <p className="text-sm text-[#5C4F48] leading-relaxed max-w-sm">
              {t.footer?.about ||
                '«Har bir lahzaga o‘zgacha taklif.» To‘y, yubiley va marosimlaringiz uchun eng nafis raqamli interaktiv taklifnomalar yaratish platformasi.'}
            </p>
            <div className="flex items-center gap-2.5 pt-2">
              <a
                href="https://t.me/avazxanovvv_700"
                target="_blank"
                rel="noreferrer"
                className="w-11 h-11 rounded-2xl glass-surface hover:bg-white/95 hover:text-[#4A9BD4] flex items-center justify-center transition-colors text-[#4A3E39]"
                aria-label="Telegram"
                title="Telegram"
              >
                <Send className="w-4 h-4" />
              </a>
              <a
                href="https://www.instagram.com/avazxanovvv_700/"
                target="_blank"
                rel="noreferrer"
                className="w-11 h-11 rounded-2xl glass-surface hover:bg-white/95 hover:text-[#C94F79] flex items-center justify-center transition-colors text-[#4A3E39]"
                aria-label="Instagram"
                title="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="tel:+998933223580"
                className="w-11 h-11 rounded-2xl glass-surface hover:bg-white/95 hover:text-emerald-700 flex items-center justify-center transition-colors text-[#4A3E39]"
                aria-label="Telefon: +998933223580"
                title="+998933223580"
              >
                <Phone className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E1418]">
              {t.footer?.servicesTitle || 'Xizmatlar'}
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/templates" className="text-[#5C4F48] hover:text-[#C94F79] transition-colors">
                  {t.footer?.templatesLink || 'Shablonlar katalogi'}
                </Link>
              </li>
              <li>
                <Link to="/my-invitations" className="text-[#5C4F48] hover:text-[#C94F79] transition-colors">
                  {t.nav.myInvitations}
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-[#5C4F48] hover:text-[#C94F79] transition-colors">
                  {t.footer?.pricingLink || 'Tariflar va narxlar'}
                </Link>
              </li>
              <li>
                <Link
                  to="/i/nodir-malika-wedding"
                  className="text-[#C94F79] font-semibold hover:text-[#9E3E60] transition-colors"
                >
                  {t.footer?.demoLink || 'Jonli namuna (To‘y)'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support & Company */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E1418]">
              {t.footer?.companyTitle || 'Kompaniya'}
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/faq" className="text-[#5C4F48] hover:text-[#C94F79] transition-colors">
                  {t.footer?.faqLink || 'Savol-javoblar'}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-[#5C4F48] hover:text-[#C94F79] transition-colors">
                  {t.footer?.contactLink || 'Bog‘lanish'}
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-[#5C4F48] hover:text-[#C94F79] transition-colors">
                  {t.footer?.privacyLink || 'Maxfiylik siyosati'}
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-[#5C4F48] hover:text-[#C94F79] transition-colors">
                  {t.footer?.termsLink || 'Foydalanish shartlari'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Language and Region */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E1418]">
              {t.footer?.chooseLanguage || 'Tilni tanlang'}
            </h4>
            <div className="flex flex-col gap-1.5">
              {(
                [
                  { code: 'uz', label: 'O‘zbekcha' },
                  { code: 'ru', label: 'Русский' },
                  { code: 'en', label: 'English' },
                ] as const
              ).map((item) => {
                const isActive = language === item.code;
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => setLanguage(item.code)}
                    className={`flex items-center gap-2.5 px-3 py-2 min-h-[38px] rounded-xl text-xs font-medium text-left transition-all cursor-pointer ${
                      isActive
                        ? 'glass-surface-elevated text-[#1E1418] font-bold'
                        : 'text-[#5C4F48] hover:bg-white/60 hover:text-[#1E1418]'
                    }`}
                  >
                    <FlagIcon code={item.code} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#5C4F48] gap-4">
          <p>
            © {new Date().getFullYear()} Taklifim.{' '}
            {t.footer?.allRightsReserved || 'Barcha huquqlar himoyalangan.'}
          </p>
          <div className="flex items-center gap-1.5">
            <span>{t.footer?.madeWithLove || 'Yurakdan mehr bilan yaratilgan'}</span>
            <Heart className="w-3.5 h-3.5 text-[#D66389] fill-[#D66389]" aria-hidden="true" />
            <span>{t.footer?.location || 'Toshkent, O‘zbekiston'}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
