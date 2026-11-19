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
  Phone,
} from 'lucide-react';
import { Language } from '../types';
import { FlagIcon } from './FlagIcon';
import { CustomDropdown, GlassActionMenu, DropdownOption, GlassMenuItem } from './CustomDropdown';
import { GlassNavbar, GlassNavbarItem, GlassButton } from './glass';

export const Header: React.FC = () => {
  const { path, navigate } = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const { isLoggedIn, user, logout } = useAuth();

  const headerRef = React.useRef<HTMLElement | null>(null);
  const lastScrollYRef = React.useRef<number>(0);
  const isScrolledRef = React.useRef<boolean>(false);
  const isHiddenMobileRef = React.useRef<boolean>(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHiddenMobile, setIsHiddenMobile] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  // Track lg+ breakpoint so desktop <GlassNavbar> and <GlassButton> do not mount hidden on mobile phones
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const syncDesktop = () => setIsDesktopViewport(mq.matches);
    syncDesktop();
    mq.addEventListener('change', syncDesktop);
    return () => mq.removeEventListener('change', syncDesktop);
  }, []);

  // Keep --header-visible-h synced with mobile scroll-hide without tearing down ResizeObserver
  useEffect(() => {
    isHiddenMobileRef.current = isHiddenMobile;
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    const h = document.documentElement.style.getPropertyValue('--header-h') || '64px';
    const isMobile = window.innerWidth < 1024;
    document.documentElement.style.setProperty(
      '--header-visible-h',
      isMobile && isHiddenMobile ? '0px' : h
    );
  }, [isHiddenMobile]);

  // Sync --header-h dynamically via ResizeObserver only when layout structure changes
  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof document === 'undefined') return;

    const updateVars = () => {
      const h = Math.ceil(el.getBoundingClientRect().height || 64);
      const isMobile = window.innerWidth < 1024;
      document.documentElement.style.setProperty('--header-h', `${h}px`);
      document.documentElement.style.setProperty(
        '--header-visible-h',
        isMobile && isHiddenMobileRef.current ? '0px' : `${h}px`
      );
    };

    updateVars();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateVars) : null;
    ro?.observe(el);
    window.addEventListener('resize', updateVars, { passive: true });
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', updateVars);
    };
  }, [language, isLoggedIn, isDesktopViewport]);

  // Reset mobile header visibility on route navigation
  useEffect(() => {
    isHiddenMobileRef.current = false;
    setIsHiddenMobile(false);
  }, [path]);

  // rAF-throttled scroll handler avoids redundant React state updates on 60-120Hz touch flings
  useEffect(() => {
    let rafId = 0;

    const processScroll = () => {
      rafId = 0;
      const currentY = Math.max(0, window.scrollY || 0);
      const nextScrolled = currentY > 20;
      if (nextScrolled !== isScrolledRef.current) {
        isScrolledRef.current = nextScrolled;
        setIsScrolled(nextScrolled);
      }

      const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const isMobile = window.innerWidth < 1024;

      if (!isMobile || prefersReduced) {
        if (isHiddenMobileRef.current) {
          isHiddenMobileRef.current = false;
          setIsHiddenMobile(false);
        }
        lastScrollYRef.current = currentY;
        return;
      }

      const delta = currentY - lastScrollYRef.current;
      let nextHidden = isHiddenMobileRef.current;
      if (currentY <= 56) {
        nextHidden = false;
      } else if (delta > 10 && currentY > 88) {
        nextHidden = true;
      } else if (delta < -8) {
        nextHidden = false;
      }

      if (nextHidden !== isHiddenMobileRef.current) {
        isHiddenMobileRef.current = nextHidden;
        setIsHiddenMobile(nextHidden);
      }
      lastScrollYRef.current = currentY;
    };

    const handleScroll = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(processScroll);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
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
    <header
      ref={headerRef}
      style={{ paddingTop: 'max(10px, env(safe-area-inset-top))' }}
      className={`fixed top-0 inset-x-0 z-50 pb-2 px-3 sm:px-5 lg:px-6 pointer-events-none transition-[transform,opacity] duration-250 ease-out motion-reduce:transition-none lg:translate-y-0 lg:opacity-100 ${
        isHiddenMobile
          ? '-translate-y-full opacity-0'
          : 'translate-y-0 opacity-100'
      }`}
    >
      {/* Fast multi-stop top scrim: avoids expensive full-width offscreen blur + mask compositing during mobile scroll */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -bottom-4 pointer-events-none -z-10"
        style={{
          background:
            'linear-gradient(180deg, rgba(252, 238, 244, 0.96) 0%, rgba(252, 238, 244, 0.88) 64%, rgba(252, 238, 244, 0) 100%)',
        }}
      />

      <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-2 xl:gap-3">
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
              alt="INVITE Logo"
              className="w-full h-full object-cover rounded-[10px]"
            />
          </div>
          <span className="font-playfair text-base sm:text-lg xl:text-xl font-bold tracking-wider uppercase text-[#1E1418] whitespace-nowrap pr-0.5">
            Tashrifim
          </span>
        </Link>

        {/* Desktop Center Floating Capsule Navigation & Controls (unmounted on mobile/tablet so hidden <lg-*> never runs) */}
        {isDesktopViewport && (
          <>
            <div className="pointer-events-auto flex items-center justify-center min-w-0">
              <GlassNavbar
                items={navItems}
                currentPath={path}
                onNavigate={handleNavNavigate}
                ariaLabel={t.nav.primaryNavigation}
              />
            </div>

            <div className="pointer-events-auto flex items-center gap-1.5 xl:gap-2 shrink-0">
              {/* Liquid Glass VIP Contact Pill */}
              <a
                href="tel:+998933223580"
                aria-label="+998 933223580 — Avazxanov Abdulhay"
                className={`hidden min-[1160px]:inline-flex items-center gap-2 shrink-0 min-h-[38px] xl:min-h-[40px] px-2.5 xl:px-3 py-1 rounded-full lg-contact-pill group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D66389] ${
                  isScrolled ? 'shadow-[0_12px_30px_-8px_rgba(198,72,115,0.24)]' : ''
                }`}
              >
                <span className="w-6 h-6 xl:w-7 xl:h-7 rounded-full bg-gradient-to-br from-[#F5C9D8]/90 via-white to-[#B9DFFA]/85 flex items-center justify-center border border-white shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_3px_8px_rgba(198,72,115,0.18)] transition-transform duration-250 group-hover:-translate-y-0.5">
                  <Phone className="w-3 h-3 xl:w-3.5 xl:h-3.5 text-[#B23864]" aria-hidden="true" />
                </span>
                <span className="flex flex-col leading-none text-left pr-0.5">
                  <span className="text-[13px] xl:text-[13.5px] font-bold tracking-tight text-[#1E1418] tabular-nums whitespace-nowrap">
                    +998 933223580
                  </span>
                  <span className="text-[11px] xl:text-[11.5px] font-semibold tracking-[0.02em] text-[#8A3152] whitespace-nowrap mt-0.5">
                    Avazxanov Abdulhay
                  </span>
                </span>
              </a>

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
                    <span className="font-bold text-[13px] xl:text-[13.5px] tracking-wide">
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
          </>
        )}

        {/* Mobile Compact Header Controls (NO duplicated hamburger drawer — handled by GlassBottomNav) */}
        <div className="pointer-events-auto flex items-center gap-1.5 lg:hidden shrink-0">
          <a
            href="tel:+998933223580"
            aria-label="+998 933223580 — Avazxanov Abdulhay"
            className="hidden sm:inline-flex items-center gap-2 shrink-0 min-h-[42px] px-3 py-1 rounded-full lg-contact-pill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D66389]"
          >
            <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#F5C9D8]/90 via-white to-[#B9DFFA]/85 flex items-center justify-center border border-white shrink-0 shadow-xs">
              <Phone className="w-3 h-3 text-[#B23864]" aria-hidden="true" />
            </span>
            <span className="flex flex-col leading-none text-left pr-0.5">
              <span className="text-[13px] font-bold tracking-tight text-[#1E1418] tabular-nums whitespace-nowrap">
                +998 933223580
              </span>
              <span className="text-[11px] font-semibold tracking-[0.02em] text-[#8A3152] whitespace-nowrap mt-0.5">
                Avazxanov Abdulhay
              </span>
            </span>
          </a>

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
                <span className="font-bold text-[12.5px] tracking-wide">
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
