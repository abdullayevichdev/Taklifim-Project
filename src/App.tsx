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
const NotFoundPage = lazyWithRetry(() =>
  import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
);

const RouteLoadingFallback: React.FC = () => (
  <div className="pt-28 pb-20 min-h-[70vh] flex items-center justify-center px-4">
    <div className="glass-surface rounded-full p-4 shadow-sm">
      <div className="w-7 h-7 border-[3px] border-[#E27B9B] border-t-transparent rounded-full animate-spin" />
    </div>
  </div>
);

// Protected Route — faqat login bo'lgan foydalanuvchilar uchun
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn } = useAuth();
  const { navigate } = useRouter();
  const { t } = useLanguage();

  React.useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
    }
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div className="pt-28 pb-20 min-h-screen flex items-center justify-center">
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

  // Determine if this is a dedicated guest-facing invitation page
  const isGuestInvitation = path.startsWith('/i/');

  // Route dispatcher
  const renderCurrentPage = () => {
    // Guest Invitation
    if (path.startsWith('/i/')) {
      return <InvitationGuestPage />;
    }

    // Home
    if (path === '/' || path === '') {
      return <HomePage />;
    }

    // Templates
    if (path === '/templates') {
      return <TemplatesPage />;
    }
    if (path.startsWith('/templates/')) {
      return <TemplateDetailPage />;
    }

    // How It Works / Qanday ishlaydi
    if (path === '/how-it-works' || path === '/#how-it-works') {
      return <HomePage />;
    }

    // Builder
    if (path.startsWith('/create/')) {
      return <ProtectedRoute><BuilderPage /></ProtectedRoute>;
    }

    // Pricing
    if (path === '/pricing') {
      return <PricingPage />;
    }

    // Contact
    if (path === '/contact') {
      return <ContactPage />;
    }

    // FAQ
    if (path === '/faq') {
      return <FaqPage />;
    }

    // Legal
    if (path === '/privacy' || path === '/terms') {
      return <LegalPage />;
    }

    // Auth
    if (path === '/login' || path === '/register' || path === '/forgot-password') {
      return <AuthPages />;
    }

    // Customer Dashboard
    if (path.startsWith('/dashboard')) {
      return <ProtectedRoute><CustomerDashboard /></ProtectedRoute>;
    }

    // My Invitations / Taklifnomalarim
    if (path === '/my-invitations' || path === '/taklifnomalarim') {
      return <ProtectedRoute><MyInvitationsPage /></ProtectedRoute>;
    }

    return <NotFoundPage />;
  };

  return (
    <div
      data-lg-backdrop={!isGuestInvitation ? '#taklifim-backdrop' : undefined}
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
