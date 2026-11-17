import React from 'react';
import { AlertTriangle, ArrowLeft, LayoutGrid } from 'lucide-react';
import { Language } from '../types';
import { translations, uz } from '../locales';
import { GlassSurface, GlassButton } from './glass';

interface TemplateResolutionErrorProps {
  language?: Language;
  templateSlug?: string;
  templateId?: string;
  onNavigate?: (path: string) => void;
  compact?: boolean;
}

export const TemplateResolutionError: React.FC<TemplateResolutionErrorProps> = ({
  language = 'uz',
  templateSlug,
  templateId,
  onNavigate,
  compact = false,
}) => {
  const copy = translations[language]?.templateError || uz.templateError;
  const diagnosticCode = templateSlug || templateId;

  const handleGo = (path: string) => (e: React.MouseEvent<HTMLElement>) => {
    if (onNavigate) {
      e.preventDefault();
      onNavigate(path);
    }
  };

  return (
    <div
      role="alert"
      className={
        compact
          ? 'min-h-[360px] flex items-center justify-center p-4 bg-[#FAF6F0]'
          : 'min-h-screen flex items-center justify-center p-4 taklifim-glass-backdrop'
      }
    >
      <GlassSurface variant="elevated" rounded="3xl" className="max-w-md w-full p-7 sm:p-8 text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h2 className="font-playfair text-xl sm:text-2xl font-bold text-[#1E1418]">
            {copy.title}
          </h2>
          <p className="text-xs sm:text-sm text-[#4A383F] leading-relaxed">
            {copy.description}
          </p>
          {diagnosticCode && (
            <p className="inline-block font-mono text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
              {copy.missingCodeLabel}: {diagnosticCode}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <GlassButton
            href="/templates"
            tone="tinted"
            size="md"
            className="w-full"
            onAnchorClick={handleGo('/templates')}
            leftIcon={<LayoutGrid className="w-4 h-4" aria-hidden="true" />}
          >
            {copy.browseTemplatesBtn}
          </GlassButton>
          <GlassButton
            href="/"
            tone="light"
            size="md"
            className="w-full"
            onAnchorClick={handleGo('/')}
            leftIcon={<ArrowLeft className="w-4 h-4" aria-hidden="true" />}
          >
            {copy.backHomeBtn}
          </GlassButton>
        </div>
      </GlassSurface>
    </div>
  );
};
