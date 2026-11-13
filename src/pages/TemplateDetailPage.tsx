import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, Link } from '../context/RouterContext';
import { useLanguage, translateCategory } from '../locales';
import { mockTemplates } from '../data/mockTemplates';
import { api } from '../services/api';
import { formatPriceUZS } from '../utils/logic';
import { Template } from '../types';
import {
  GlassSurface,
  GlassButton,
  GlassSegmented,
  GlassSegmentedOption,
} from '../components/glass';
import {
  ArrowLeft,
  Smartphone,
  Monitor,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Eye,
  Calendar,
  MapPin,
} from 'lucide-react';

export const TemplateDetailPage: React.FC = () => {
  const { params, navigate } = useRouter();
  const { language, t } = useLanguage();
  const slug = params.slug;

  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [allTemplates, setAllTemplates] = useState<Template[]>(mockTemplates);

  useEffect(() => {
    async function load() {
      const list = await api.getTemplates();
      setAllTemplates(list);
    }
    load();
  }, []);

  const deviceOptions: GlassSegmentedOption<'mobile' | 'desktop'>[] = useMemo(
    () => [
      {
        value: 'mobile',
        label: t.templateDetail.mobileView,
        icon: <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />,
      },
      {
        value: 'desktop',
        label: t.templateDetail.desktopView,
        icon: <Monitor className="w-3.5 h-3.5" aria-hidden="true" />,
      },
    ],
    [t]
  );

  const template = allTemplates.find((tpl) => tpl.slug === slug);

  if (!template) {
    return (
      <div className="pt-32 pb-24 max-w-lg mx-auto px-4 text-center">
        <GlassSurface variant="elevated" rounded="3xl" className="p-8 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-[#F5EBDD] mx-auto flex items-center justify-center text-[#5C4F48]">
            <Eye className="w-8 h-8" aria-hidden="true" />
          </div>
          <h1 className="font-playfair text-3xl font-bold text-[#1E1418]">
            {t.templateDetail.notFoundTitle}
          </h1>
          <p className="text-xs text-[#4A383F]">{t.templateDetail.notFoundDesc}</p>
          <div className="pt-2 flex justify-center">
            <GlassButton
              tone="tinted"
              size="md"
              href="/templates"
              onAnchorClick={(e) => {
                e.preventDefault();
                navigate('/templates');
              }}
              leftIcon={<ArrowLeft className="w-4 h-4" aria-hidden="true" />}
            >
              {t.templateDetail.backToCatalogFull}
            </GlassButton>
          </div>
        </GlassSurface>
      </div>
    );
  }

  const relatedTemplates = mockTemplates.filter((tpl) => tpl.slug !== template.slug).slice(0, 3);
  const categoryLabel = translateCategory(template.category, language);

  return (
    <div className="pt-24 sm:pt-28 pb-20 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Top Breadcrumb & Device Preview Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/templates"
            className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-full glass-surface text-xs font-semibold text-[#1E1418] hover:bg-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>{t.templateDetail.backToCatalog}</span>
          </Link>

          <GlassSegmented<'mobile' | 'desktop'>
            options={deviceOptions}
            value={previewDevice}
            onChange={(val) => setPreviewDevice(val)}
            ariaLabel={t.templateDetail.mobileView}
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Preview Container wrapped in Glass Frame */}
          <div className="lg:col-span-7">
            <GlassSurface variant="elevated" rounded="3xl" className="p-4 sm:p-8 flex justify-center">
              {previewDevice === 'mobile' ? (
                <div className="w-[296px] sm:w-[336px] rounded-[44px] p-4 bg-[#231E1B] shadow-2xl ring-1 ring-white/25 relative">
                  <div className="absolute top-5 left-1/2 -translate-x-1/2 w-24 h-4 bg-[#151210] rounded-full z-30" />

                  <div
                    className="w-full h-[600px] rounded-[36px] overflow-y-auto overflow-x-hidden relative p-6 pt-9 text-center flex flex-col justify-between border border-black/10 select-none shadow-inner"
                    style={{ backgroundColor: template.colorStyle.background }}
                  >
                    <div className="space-y-4">
                      <div
                        className="text-[10px] tracking-widest uppercase font-bold"
                        style={{ color: template.colorStyle.primary }}
                      >
                        {categoryLabel.toUpperCase()} • {t.templateDetail.sampleTag}
                      </div>

                      <h2
                        className="text-2xl font-bold tracking-tight"
                        style={{
                          fontFamily: template.typography.headingFont,
                          color: template.colorStyle.text,
                        }}
                      >
                        {t.hero.sampleGroomBride}
                      </h2>

                      <div
                        className="w-10 h-0.5 mx-auto opacity-50"
                        style={{ backgroundColor: template.colorStyle.primary }}
                      />

                      <div className="w-full h-48 rounded-2xl overflow-hidden shadow-sm border border-white/60">
                        <img src={template.previewImage} alt={template.name} className="w-full h-full object-cover" />
                      </div>

                      <p
                        className="text-xs leading-relaxed italic px-2"
                        style={{ color: template.colorStyle.text, opacity: 0.85 }}
                      >
                        {t.templateDetail.sampleQuote}
                      </p>

                      <div className="py-2 space-y-1 text-xs">
                        <div
                          className="font-bold flex items-center justify-center gap-1.5"
                          style={{ color: template.colorStyle.primary }}
                        >
                          <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{t.hero.sampleDate}</span>
                        </div>
                        <div
                          className="text-[11px] flex items-center justify-center gap-1"
                          style={{ color: template.colorStyle.text, opacity: 0.78 }}
                        >
                          <MapPin className="w-3 h-3" aria-hidden="true" />
                          <span>{t.hero.sampleVenue}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-black/5">
                      <div
                        className="w-full py-2.5 rounded-xl text-xs font-bold text-white shadow-xs"
                        style={{ backgroundColor: template.colorStyle.primary }}
                      >
                        {t.templateDetail.sampleButton}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full rounded-3xl p-3 bg-[#231E1B] shadow-2xl ring-1 ring-white/25">
                  <div className="flex items-center gap-1.5 pb-2 px-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] text-white/60 ml-2 font-mono truncate">
                      taklifim.uz/i/{template.slug}-demo
                    </span>
                  </div>
                  <div
                    className="w-full h-[480px] rounded-2xl overflow-y-auto p-8 text-center flex flex-col justify-between"
                    style={{ backgroundColor: template.colorStyle.background }}
                  >
                    <div className="max-w-md mx-auto space-y-4">
                      <div
                        className="text-xs tracking-widest uppercase font-bold"
                        style={{ color: template.colorStyle.primary }}
                      >
                        {categoryLabel}
                      </div>
                      <h2
                        className="text-3xl font-bold tracking-tight"
                        style={{
                          fontFamily: template.typography.headingFont,
                          color: template.colorStyle.text,
                        }}
                      >
                        {t.hero.sampleGroomBride}
                      </h2>
                      <div className="w-full h-44 rounded-2xl overflow-hidden shadow-xs border border-white">
                        <img src={template.previewImage} alt={template.name} className="w-full h-full object-cover" />
                      </div>
                      <p
                        className="text-sm leading-relaxed italic"
                        style={{ color: template.colorStyle.text, opacity: 0.85 }}
                      >
                        {t.templateDetail.sampleQuoteDesktop}
                      </p>
                    </div>
                    <div className="pt-4">
                      <span
                        className="inline-block px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs"
                        style={{ backgroundColor: template.colorStyle.primary }}
                      >
                        {t.templateDetail.sampleRsvpShort}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </GlassSurface>
          </div>

          {/* Right Details Container */}
          <GlassSurface variant="elevated" rounded="3xl" className="lg:col-span-5 p-6 sm:p-8 space-y-6">
            <div className="space-y-3">
              <GlassSurface
                variant="tinted-pink"
                rounded="full"
                className="inline-flex items-center gap-2 px-3 py-1 text-xs font-bold text-[#9E3E60]"
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="uppercase tracking-wider">{categoryLabel}</span>
              </GlassSurface>

              <h1 className="font-playfair text-3xl sm:text-4xl font-extrabold text-[#1E1418]">
                {template.name}
              </h1>

              <div className="flex items-baseline gap-2 pt-1">
                <span className="font-playfair text-3xl font-black text-[#1E1418] tabular-nums">
                  {formatPriceUZS(template.price, language)}
                </span>
                <span className="text-xs text-[#5C4F48]">{t.templateDetail.priceSuffix}</span>
              </div>

              <p className="text-sm text-[#4A383F] leading-relaxed pt-2">
                {template.description[language] || template.description.uz}
              </p>
            </div>

            {/* Color Palette & Fonts */}
            <GlassSurface variant="subtle" rounded="2xl" className="p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E1418]">
                {t.templateDetail.paletteTitle}
              </h4>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-6 h-6 rounded-full border border-black/15 shadow-xs"
                    style={{ backgroundColor: template.colorStyle.primary }}
                    title={t.templateDetail.colorPrimary}
                    aria-label={t.templateDetail.colorPrimary}
                  />
                  <div
                    className="w-6 h-6 rounded-full border border-black/15 shadow-xs"
                    style={{ backgroundColor: template.colorStyle.accent }}
                    title={t.templateDetail.colorAccent}
                    aria-label={t.templateDetail.colorAccent}
                  />
                  <div
                    className="w-6 h-6 rounded-full border border-black/15 shadow-xs"
                    style={{ backgroundColor: template.colorStyle.secondary }}
                    title={t.templateDetail.colorSecondary}
                    aria-label={t.templateDetail.colorSecondary}
                  />
                </div>
                <span className="text-xs text-[#4A383F] font-mono">
                  {t.templateDetail.headingFontLabel} {template.typography.headingFont}
                </span>
              </div>
            </GlassSurface>

            {/* Feature List */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E1418]">
                {t.templateDetail.includedFeatures}
              </h4>
              <div className="space-y-2">
                {(template.features[language] || template.features.uz).map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-[#1E1418] font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Suitable For */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#1E1418]">
                {t.templateDetail.idealEvents}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {(template.suitableFor[language] || template.suitableFor.uz).map((item, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full text-xs font-semibold bg-[#F5EBDD] text-[#231E1B]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Primary & Secondary CTAs */}
            <div className="pt-4 border-t border-black/8 space-y-3">
              <GlassButton
                tone="tinted"
                size="lg"
                href={`/create/${template.slug}`}
                onAnchorClick={(e) => {
                  e.preventDefault();
                  navigate(`/create/${template.slug}`);
                }}
                rightIcon={<ArrowRight className="w-4 h-4 shrink-0" />}
                className="w-full justify-center"
              >
                {t.templateDetail.createWithTemplate}
              </GlassButton>

              <GlassButton
                tone="light"
                size="md"
                href="/i/nodir-malika-wedding"
                onAnchorClick={(e) => {
                  e.preventDefault();
                  navigate('/i/nodir-malika-wedding');
                }}
                className="w-full justify-center"
              >
                {t.templateDetail.liveDemo}
              </GlassButton>
            </div>
          </GlassSurface>
        </div>

        {/* Related Templates */}
        <div className="pt-10 border-t border-black/8 space-y-6">
          <h3 className="font-playfair text-2xl font-bold text-[#1E1418]">
            {t.templateDetail.similarTemplates}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {relatedTemplates.map((rel) => (
              <Link
                key={rel.id}
                to={`/templates/${rel.slug}`}
                className="glass-card-lite glass-card-hover rounded-2xl p-4 flex items-center gap-4 group"
              >
                <img
                  src={rel.previewImage}
                  alt={rel.name}
                  className="w-16 h-16 rounded-xl object-cover shrink-0"
                />
                <div className="min-w-0">
                  <h4 className="font-playfair text-sm font-bold text-[#1E1418] group-hover:text-[#C94F79] transition-colors truncate">
                    {rel.name}
                  </h4>
                  <p className="text-[11px] text-[#5C4F48]">{translateCategory(rel.category, language)}</p>
                  <p className="text-xs font-bold text-[#1E1418] mt-1 tabular-nums">
                    {formatPriceUZS(rel.price, language)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
