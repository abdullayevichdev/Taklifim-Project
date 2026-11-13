import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, Link } from '../context/RouterContext';
import { useLanguage } from '../locales';
import { useAuth } from '../context/AuthContext';
import {
  ChevronDown,
  PlusCircle,
  LayoutDashboard,
  HeartHandshake,
  Users,
  LogOut,
  LogIn,
} from 'lucide-react';
import { Language } from '../types';
import { FlagIcon } from './FlagIcon';
import { CustomDropdown, GlassActionMenu, DropdownOption, GlassMenuItem } from './CustomDropdown';
import { GlassNavbar, GlassNavbarItem, GlassButton } from './glass';

export const Header: React.FC = () => {
  const { path, navigate } = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const { isLoggedIn, user, logout } = useAuth();

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const languageOptions: DropdownOption<Language>[] = useMemo(
    () => [
      { value: 'uz', label: 'O‘zbekcha', icon: <FlagIcon code="uz" /> },
      { value: 'ru', label: 'Русский', icon: <FlagIcon code="ru" /> },
      { value: 'en', label: 'English', icon: <FlagIcon code="en" /> },
    ],
    []
  );

  const navItems: GlassNavbarItem[] = useMemo(
    () => [
      { to: '/', matchPaths: ['/'], label: t.nav.home },
      { to: '/templates', matchPaths: ['/templates'], label: t.nav.templates },
      {
        to: '/my-invitations',
        matchPaths: ['/my-invitations', '/taklifnomalarim'],
        label: t.nav.myInvitations,
      },
      {
        to: '/how-it-works',
        matchPaths: ['/how-it-works', '/#how-it-works'],
        label: t.nav.howItWorks,
      },
      { to: '/pricing', matchPaths: ['/pricing'], label: t.nav.pricing },
      { to: '/faq', matchPaths: ['/faq'], label: t.nav.faq },
    ],
    [t]
  );

  const handleNavNavigate = (to: string) => {
    if (to === '/how-it-works') {
      navigate('/how-it-works');
      window.setTimeout(() => {
        document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
      }, 120);
      return;
    }
    navigate(to);
  };

  const userMenuItems: GlassMenuItem[] = useMemo(
    () => [
      {
        id: 'dashboard',
        label: t.nav.dashboard,
        icon: <LayoutDashboard className="w-3.5 h-3.5" />,
        onSelect: () => navigate('/dashboard'),
      },
      {
        id: 'invitations',
        label: t.dashboard.tabs.invitations,
        icon: <HeartHandshake className="w-3.5 h-3.5" />,
        onSelect: () => navigate('/dashboard/invitations'),
      },
      {
        id: 'guests',
        label: t.dashboard.tabs.guests,
        icon: <Users className="w-3.5 h-3.5" />,
        onSelect: () => navigate('/dashboard/guests'),
      },
      {
        id: 'logout',
        label: t.nav.logout,
        icon: <LogOut className="w-3.5 h-3.5" />,
        danger: true,
        onSelect: () => logout(),
      },
    ],
    [t, navigate, logout]
  );

  const userInitial = user?.name?.trim()?.charAt(0)?.toUpperCase() || 'U';
  const userFirstName = user?.name?.split(' ')[0] || user?.name || t.nav.profile;

  return (
    <header className="fixed top-0 inset-x-0 z-50 pt-2.5 sm:pt-3.5 px-3 sm:px-5 lg:px-6 pointer-events-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 xl:gap-3">
        {/* Brand Logo Pill — always visible, never clipped */}
        <Link
          to="/"
          className={`pointer-events-auto inline-flex items-center gap-2 shrink-0 min-h-[42px] px-2.5 sm:px-3.5 py-1 rounded-full transition-all duration-300 ${
            isScrolled ? 'glass-surface-elevated' : 'glass-surface'
          }`}
        >
          <div className="w-8 h-8 rounded-xl overflow-hidden p-0.5 bg-gradient-to-tr from-[#F5C9D8] via-[#F5EBDD] to-[#B9DFFA] shadow-xs shrink-0 border border-white/90">
            <img
              src="/logo.jpg"
              alt="Taklifim Logo"
              className="w-full h-full object-cover rounded-[10px]"
            />
          </div>
          <span className="font-playfair text-base sm:text-lg xl:text-xl font-bold tracking-tight text-[#1E1418] whitespace-nowrap pr-0.5">
            Taklifim
          </span>
        </Link>

        {/* Desktop Center Floating Capsule Navigation (standalone capsule — never inside another capsule) */}
        <div className="pointer-events-auto hidden lg:flex items-center justify-center min-w-0">
          <GlassNavbar
            items={navItems}
            currentPath={path}
            onNavigate={handleNavNavigate}
            ariaLabel={t.nav.primaryNavigation}
          />
        </div>

        {/* Desktop Right Controls */}
        <div className="pointer-events-auto hidden lg:flex items-center gap-1.5 xl:gap-2 shrink-0">
          <CustomDropdown<Language>
            value={language}
            onChange={(lang) => setLanguage(lang)}
            options={languageOptions}
            ariaLabel={t.nav.selectLanguage}
            title={t.nav.selectLanguage}
            buttonClassName="px-2 xl:px-2.5 py-1.5 min-h-[38px]"
            renderTriggerLabel={(selected) => (
              <span className="inline-flex items-center gap-1.5">
                <FlagIcon code={selected.value} />
                <span className="font-bold text-[11.5px] xl:text-[12px] tracking-wide">
                  {selected.value.toUpperCase()}
                </span>
              </span>
            )}
          />

          {isLoggedIn ? (
            <GlassActionMenu
              ariaLabel={t.nav.profile}
              header={
                <div className="text-xs text-[#5C4F48]">
                  <div className="font-semibold text-[#1E1418] truncate">{user?.name}</div>
                  <div className="text-[11px] truncate opacity-80">
                    {user?.phone ? user.phone : user?.email}
                  </div>
                </div>
              }
              items={userMenuItems}
              triggerClassName="min-h-[38px] px-2 xl:px-2.5"
              trigger={(isOpen) => (
                <>
                  <span className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#F5C9D8] to-[#B9DFFA] text-[#1E1418] flex items-center justify-center font-bold text-[11px] shrink-0 border border-white/80">
                    {userInitial}
                  </span>
                  <span className="truncate font-semibold max-w-[56px] xl:max-w-[88px]">
                    {userFirstName}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 opacity-60 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </>
              )}
            />
          ) : (
            <Link
              to="/login"
              className={`whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 min-h-[38px] px-2.5 xl:px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#1E1418] hover:bg-white/95 transition-all ${
                isScrolled ? 'glass-surface-elevated' : 'glass-surface'
              }`}
            >
              {t.nav.login}
            </Link>
          )}

          <GlassButton
            tone="tinted"
            size="sm"
            href="/templates"
            onAnchorClick={(e) => {
              e.preventDefault();
              navigate('/templates');
            }}
            leftIcon={<PlusCircle className="w-3.5 h-3.5 shrink-0 hidden xl:inline-block" />}
            className="taklifim-nav-cta shrink-0"
          >
            {t.nav.createInvitation}
          </GlassButton>
        </div>

        {/* Mobile Compact Header Controls (NO duplicated hamburger drawer — handled by GlassBottomNav) */}
        <div className="pointer-events-auto flex items-center gap-1.5 lg:hidden shrink-0">
          <CustomDropdown<Language>
            value={language}
            onChange={(lang) => setLanguage(lang)}
            options={languageOptions}
            ariaLabel={t.nav.selectLanguage}
            title={t.nav.selectLanguage}
            buttonClassName="px-2.5 py-1.5 min-h-[42px]"
            renderTriggerLabel={(selected) => (
              <span className="inline-flex items-center gap-1.5">
                <FlagIcon code={selected.value} />
                <span className="font-bold text-[11px] tracking-wide">
                  {selected.value.toUpperCase()}
                </span>
              </span>
            )}
          />

          {isLoggedIn ? (
            <GlassActionMenu
              ariaLabel={t.nav.profile}
              header={
                <div className="text-xs text-[#5C4F48]">
                  <div className="font-semibold text-[#1E1418] truncate">{user?.name}</div>
                  <div className="text-[11px] truncate opacity-80">
                    {user?.phone ? user.phone : user?.email}
                  </div>
                </div>
              }
              items={userMenuItems}
              triggerClassName="min-h-[42px] px-2.5"
              trigger={(isOpen) => (
                <>
                  <span className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#F5C9D8] to-[#B9DFFA] text-[#1E1418] flex items-center justify-center font-bold text-[11px] shrink-0 border border-white/80">
                    {userInitial}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 opacity-60 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </>
              )}
            />
          ) : (
            <Link
              to="/login"
              aria-label={t.nav.login}
              className="inline-flex items-center gap-1.5 min-h-[42px] px-3 py-1.5 rounded-full glass-surface text-xs font-semibold text-[#1E1418] hover:bg-white/95 transition-all whitespace-nowrap"
            >
              <LogIn className="w-3.5 h-3.5 text-[#C94F79]" aria-hidden="true" />
              <span>{t.nav.login}</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
