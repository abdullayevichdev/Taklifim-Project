import React from 'react';
import { useRouter } from '../context/RouterContext';
import { useLanguage } from '../locales';
import { GlassSurface, GlassButton } from '../components/glass';
import { ArrowLeft, Sparkles, Compass } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const { navigate } = useRouter();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen pt-32 pb-20 flex items-center justify-center px-4 text-center">
      <GlassSurface variant="elevated" rounded="3xl" className="max-w-md w-full p-8 sm:p-10 space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#F5C9D8] to-[#B9DFFA] mx-auto flex items-center justify-center text-[#1E1418] shadow-sm border border-white">
          <Compass className="w-8 h-8" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <span className="font-mono text-3xl font-extrabold text-[#C94F79]">404</span>
          <h1 className="font-playfair text-2xl font-bold text-[#1E1418]">
            {t.notFound.title}
          </h1>
          <p className="text-xs sm:text-sm text-[#4A383F] leading-relaxed">
            {t.notFound.desc}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <GlassButton
            tone="tinted"
            size="md"
            href="/"
            onAnchorClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
            leftIcon={<ArrowLeft className="w-4 h-4 shrink-0" />}
            className="w-full justify-center"
          >
            {t.notFound.homeBtn}
          </GlassButton>

          <GlassButton
            tone="light"
            size="md"
            href="/templates"
            onAnchorClick={(e) => {
              e.preventDefault();
              navigate('/templates');
            }}
            leftIcon={<Sparkles className="w-3.5 h-3.5 text-[#C94F79] shrink-0" />}
            className="w-full justify-center"
          >
            {t.notFound.catalogBtn}
          </GlassButton>
        </div>
      </GlassSurface>
    </div>
  );
};
