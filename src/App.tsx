/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense } from 'react';
import { RouterProvider, useRouter } from './context/RouterContext';
import { LanguageProvider, useLanguage } from './locales';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ToastContainer } from './components/ToastContainer';
import { GlassBackground } from './components/glass/GlassBackground';
import { GlassBottomNav } from './components/glass/GlassBottomNav';
import { useCanUseLiquidGlass } from './components/glass/loader';
import { ErrorBoundary, lazyWithRetry } from './components/ErrorBoundary';

// Keep HomePage eager for instant landing page paint
import { HomePage } from './pages/HomePage';

// Lazy-load secondary routes with automatic chunk-error recovery
const TemplatesPage = lazyWithRetry(() =>
  import('./pages/TemplatesPage').then((m) => ({ default: m.TemplatesPage }))
);
const TemplateDetailPage = lazyWithRetry(() =>
  import('./pages/TemplateDetailPage').then((m) => ({ default: m.TemplateDetailPage }))
);
const BuilderPage = lazyWithRetry(() =>
  import('./pages/BuilderPage').then((m) => ({ default: m.BuilderPage }))
);
const InvitationGuestPage = lazyWithRetry(() =>
  import('./pages/InvitationGuestPage').then((m) => ({ default: m.InvitationGuestPage }))
);
const PricingPage = lazyWithRetry(() =>
  import('./pages/PricingPage').then((m) => ({ default: m.PricingPage }))
);
const ContactPage = lazyWithRetry(() =>
  import('./pages/ContactPage').then((m) => ({ default: m.ContactPage }))
);
const FaqPage = lazyWithRetry(() =>
  import('./pages/FaqPage').then((m) => ({ default: m.FaqPage }))
);
const LegalPage = lazyWithRetry(() =>
  import('./pages/LegalPage').then((m) => ({ default: m.LegalPage }))
);
const AuthPages = lazyWithRetry(() =>
  import('./pages/AuthPages').then((m) => ({ default: m.AuthPages }))
);
const CustomerDashboard = lazyWithRetry(() =>
  import('./pages/CustomerDashboard').then((m) => ({ default: m.CustomerDashboard }))
);
const MyInvitationsPage = lazyWithRetry(() =>
  import('./pages/MyInvitationsPage').then((m) => ({ default: m.MyInvitationsPage }))
);
const OrderStatusPage = lazyWithRetry(() =>
  import('./pages/OrderStatusPage').then((m) => ({ default: m.OrderStatusPage }))
);
const NotFoundPage = lazyWithRetry(() =>
  import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
);

const RouteLoadingFallback: React.FC = () => (
  <div className="taklifim-page-top taklifim-page-bottom min-h-[70vh] flex items-center justify-center px-4">
    <div className="glass-surface rounded-full p-4 shadow-sm">
      <div className="w-7 h-7 border-[3px] border-[#E27B9B] border-t-transparent rounded-full animate-spin" />
    </div>
  </div>
);

// Protected Route — faqat login bo'lgan foydalanuvchilar uchun
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn, authReady } = useAuth();
  const { path, navigate } = useRouter();
  const { t } = useLanguage();

  React.useEffect(() => {
    if (authReady && !isLoggedIn) {
      const target = path && path.startsWith('/') && !path.startsWith('/login')
        ? `/login?redirect=${encodeURIComponent(path)}`
        : '/login';
      navigate(target);
    }
  }, [authReady, isLoggedIn, path, navigate]);

  if (!authReady || !isLoggedIn) {
    return (
      <div className="taklifim-page-top taklifim-page-bottom min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-4 border-[#E27B9B] border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-[#5C4F48]">{t.auth.googleConnecting}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { path, navigate } = useRouter();
  const { language } = useLanguage();
  const enableLgBackdrop = useCanUseLiquidGlass();

  const routePath = path.split('?')[0];

  // Determine if this is a dedicated guest-facing invitation page
  const isGuestInvitation = routePath.startsWith('/i/');

  // Route dispatcher
  const renderCurrentPage = () => {
    // Guest Invitation
    if (routePath.startsWith('/i/')) {
      return <InvitationGuestPage />;
    }

    // Home
    if (routePath === '/' || routePath === '') {
      return <HomePage />;
    }

    // Templates
    if (routePath === '/templates') {
      return <TemplatesPage />;
    }
    if (routePath.startsWith('/templates/')) {
      return <TemplateDetailPage />;
    }

    // How It Works / Qanday ishlaydi
    if (routePath === '/how-it-works' || path === '/#how-it-works') {
      return <HomePage />;
    }

    // Builder
    if (routePath.startsWith('/create/')) {
      return <ProtectedRoute><BuilderPage /></ProtectedRoute>;
    }

    // Pricing
    if (routePath === '/pricing') {
      return <PricingPage />;
    }

    // Contact
    if (routePath === '/contact') {
      return <ContactPage />;
    }

    // FAQ
    if (routePath === '/faq') {
      return <FaqPage />;
    }

    // Legal
    if (routePath === '/privacy' || routePath === '/terms') {
      return <LegalPage />;
    }

    // Auth
    if (routePath === '/login' || routePath === '/register' || routePath === '/forgot-password') {
      return <AuthPages />;
    }

    // Customer Dashboard
    if (routePath.startsWith('/dashboard')) {
      return <ProtectedRoute><CustomerDashboard /></ProtectedRoute>;
    }

    // My Invitations / Taklifnomalarim
    if (routePath === '/my-invitations' || routePath === '/taklifnomalarim') {
      return <ProtectedRoute><MyInvitationsPage /></ProtectedRoute>;
    }

    // Order Status Tracking
    if (routePath.startsWith('/order/')) {
      return <ProtectedRoute><OrderStatusPage /></ProtectedRoute>;
    }

    return <NotFoundPage />;
  };

  return (
    <div
      data-lg-backdrop={!isGuestInvitation && enableLgBackdrop ? '#taklifim-backdrop' : undefined}
      className="min-h-screen flex flex-col justify-between selection:bg-[#F5C9D8] selection:text-[#231E1B] relative"
    >
      {!isGuestInvitation && <GlassBackground />}
      {!isGuestInvitation && <Header />}

      <main className="flex-1 relative z-10">
        <ErrorBoundary
          scope="route"
          resetKey={path}
          language={language}
          onGoHome={() => navigate('/')}
        >
          <Suspense fallback={<RouteLoadingFallback />}>
            {renderCurrentPage()}
          </Suspense>
        </ErrorBoundary>
      </main>

      {!isGuestInvitation && <Footer />}
      {!isGuestInvitation && <GlassBottomNav />}

      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary scope="app">
      <LanguageProvider>
        <AuthProvider>
          <RouterProvider>
            <AppContent />
          </RouterProvider>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
