import React from 'react';
import { Home, LayoutGrid, HeartHandshake, User } from 'lucide-react';
import { useRouter } from '../../context/RouterContext';
import { useLanguage } from '../../locales';
import { useAuth } from '../../context/AuthContext';

/**
 * Determines whether the mobile floating bottom tab-bar should be visible.
 * Intentionally hidden on:
 * - Guest invitations (`/i/...`) — restyled separately in Stage 5
 * - Builder & Payment / Receipt Upload (`/create/...`) — avoids covering CTA / upload buttons
 * - Dashboard / Order Status (`/dashboard...`) — avoids covering mobile action bars
 */
export function shouldShowBottomNav(path: string): boolean {
  if (path.startsWith('/i/')) return false;
  if (path.startsWith('/create/')) return false;
  if (path.startsWith('/dashboard')) return false;
  return true;
}

export const GlassBottomNav: React.FC = () => {
  const { path, navigate } = useRouter();
  const { t } = useLanguage();
  const { isLoggedIn } = useAuth();
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const isVisible = shouldShowBottomNav(path);

  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!isVisible) {
      document.documentElement.style.setProperty('--bottom-nav-h', '0px');
      return;
    }
    const el = wrapRef.current;
    if (!el) return;

    const updateVar = () => {
      const h = Math.ceil(el.getBoundingClientRect().height || 76);
      document.documentElement.style.setProperty('--bottom-nav-h', `${h}px`);
    };

    updateVar();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateVar) : null;
    ro?.observe(el);
    window.addEventListener('resize', updateVar, { passive: true });
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', updateVar);
    };
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  const profileRoute = isLoggedIn ? '/dashboard' : '/login';

  const tabs = [
    {
      to: '/',
      label: t.nav.tabHome,
      ariaLabel: t.nav.home,
      icon: Home,
      isActive: path === '/' || path === '' || path === '/how-it-works' || path === '/#how-it-works',
    },
    {
      to: '/templates',
      label: t.nav.tabTemplates,
      ariaLabel: t.nav.templates,
      icon: LayoutGrid,
      isActive: path.startsWith('/templates'),
    },
    {
      to: '/my-invitations',
      label: t.nav.tabInvitations,
      ariaLabel: t.nav.myInvitations,
      icon: HeartHandshake,
      isActive: path === '/my-invitations' || path === '/taklifnomalarim',
    },
    {
      to: profileRoute,
      label: t.nav.tabProfile,
      ariaLabel: isLoggedIn ? t.nav.dashboard : t.nav.profile,
      icon: User,
      isActive: path === '/login' || path === '/register' || path === '/forgot-password' || path.startsWith('/dashboard'),
    },
  ];

  return (
    <div
      ref={wrapRef}
      className="taklifim-bottom-nav fixed bottom-0 inset-x-0 z-50 px-2.5 sm:px-4 pt-3 pointer-events-none lg:hidden transition-opacity duration-200"
      style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}
    >
      {/* Soft top-fading scrim so page copy behind/below the floating bar isn't readable */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -top-4 pointer-events-none -z-10"
        style={{
          background:
            'linear-gradient(to top, rgba(252, 238, 244, 0.96) 0%, rgba(252, 238, 244, 0.86) 56%, rgba(252, 238, 244, 0) 100%)',
        }}
      />

      <nav
        aria-label={t.nav.mobileNavigation}
        className="pointer-events-auto mx-auto w-full max-w-[460px] bg-white/96 md:bg-white/94 md:backdrop-blur-[12px] border border-white rounded-[26px] p-1.5 flex items-center justify-between gap-1 shadow-[0_14px_34px_-8px_rgba(30,20,24,0.22),inset_0_1.5px_0_rgba(255,255,255,1)]"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <a
              key={tab.to}
              href={tab.to}
              aria-label={tab.ariaLabel}
              aria-current={tab.isActive ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault();
                navigate(tab.to);
              }}
              className={`flex-1 min-w-[44px] min-h-[48px] px-1 py-1.5 rounded-[20px] flex flex-col items-center justify-center gap-0.5 transition-all duration-200 select-none ${
                tab.isActive
                  ? 'bg-gradient-to-b from-[#FFF5F8] to-white text-[#9E3E60] shadow-[0_6px_16px_-4px_rgba(214,99,137,0.28),inset_0_1px_0_rgba(255,255,255,1)] border border-[#F5C9D8]/80'
                  : 'text-[#4A383F] hover:text-[#1E1418] hover:bg-white/70'
              }`}
            >
              <Icon className={`w-[18px] h-[18px] shrink-0 ${tab.isActive ? 'stroke-[2.25]' : 'stroke-[1.9]'}`} aria-hidden="true" />
              <span className="text-[12px] leading-tight font-semibold tracking-tight truncate max-w-full px-0.5">
                {tab.label}
              </span>
            </a>
          );
        })}
      </nav>
    </div>
  );
};
