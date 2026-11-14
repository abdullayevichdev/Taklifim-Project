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

  if (!shouldShowBottomNav(path)) {
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
      className="taklifim-bottom-nav fixed bottom-0 inset-x-0 z-50 px-2 sm:px-4 pointer-events-none lg:hidden transition-opacity duration-200"
      style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}
    >
      <nav
        aria-label={t.nav.mobileNavigation}
        className="pointer-events-auto mx-auto w-full max-w-[460px] glass-surface-elevated rounded-[26px] p-1.5 flex items-center justify-between gap-1"
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
                  ? 'bg-white/95 text-[#C94F79] shadow-[0_6px_16px_-4px_rgba(214,99,137,0.28),inset_0_1px_0_rgba(255,255,255,1)] border border-white'
                  : 'text-[#5C4F48] hover:text-[#1E1418] hover:bg-white/50'
              }`}
            >
              <Icon className={`w-[18px] h-[18px] shrink-0 ${tab.isActive ? 'stroke-[2.25]' : 'stroke-[1.9]'}`} aria-hidden="true" />
              <span className="text-[10px] leading-tight font-semibold tracking-tight truncate max-w-full px-0.5">
                {tab.label}
              </span>
            </a>
          );
        })}
      </nav>
    </div>
  );
};
