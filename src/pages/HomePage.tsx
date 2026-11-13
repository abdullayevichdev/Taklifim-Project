import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, Link } from '../context/RouterContext';
import { useLanguage, translateCategory } from '../locales';
import { mockTemplates } from '../data/mockTemplates';
import { api } from '../services/api';
import { Template } from '../types';
import { mockFaq, mockStats } from '../data/mockFaq';
import { formatPriceUZS } from '../utils/logic';
import { LuxuryEnvelope } from '../components/LuxuryEnvelope';
import { GlassSurface, GlassButton, GlassAccordion } from '../components/glass';
import {
  ArrowRight,
  Eye,
  CheckCircle2,
  MapPin,
  Music,
  Share2,
  Smartphone,
  QrCode,
  Users,
  Gem,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { navigate } = useRouter();
  const { t, language } = useLanguage();

  const [openFaqId, setOpenFaqId] = useState<string>('faq-1');
  const [allTemplates, setAllTemplates] = useState<Template[]>(mockTemplates);
  const [heroImgLoaded, setHeroImgLoaded] = useState<boolean>(false);
  const [heroImgFailed, setHeroImgFailed] = useState<boolean>(false);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const heroImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (heroImgRef.current?.complete && heroImgRef.current.naturalWidth > 0) {
      setHeroImgLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobileViewport(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    async function load() {
      const list = await api.getTemplates();
      if (list && list.length > 0) {
        setAllTemplates(list);
      }
    }
    load();

    const unsub = api.subscribe<Template[]>('templates', (updated) => {
      setAllTemplates(updated);
    });

    return () => {
      unsub();
    };
  }, []);

  const featuredTemplates = allTemplates.slice(0, 8);

  const benefitIcons = [Smartphone, Share2, QrCode, Users, MapPin, Music];
  const benefitGradients = [
    'from-[#F5C9D8] to-white',
    'from-[#B9DFFA] to-white',
    'from-[#F5C9D8] via-white to-[#B9DFFA]',
    'from-[#B9DFFA] to-white',
    'from-[#F5C9D8] to-white',
    'from-[#F5C9D8] to-[#B9DFFA]',
  ];

  const faqItems = useMemo(
    () =>
      mockFaq.slice(0, 5).map((faq) => ({
        id: faq.id,
        question: faq.question[language] || faq.question.uz,
        answer: faq.answer[language] || faq.answer.uz,
      })),
    [language]
  );

  return (
    <div className="pb-20 space-y-20 sm:space-y-28 overflow-x-hidden relative">
      {/* 6.1 HERO SECTION — Full-bleed pastel wedding glass photo backdrop with real refraction on desktop */}
      <section
        data-lg-backdrop={!isMobileViewport && !heroImgFailed ? '#hero-backdrop-img' : undefined}
        className="relative w-full overflow-hidden pt-24 sm:pt-28 lg:pt-32 pb-14 sm:pb-20 rounded-b-[32px] sm:rounded-b-[48px]"
      >
        {/* Hero Background Photo + Soft Readability & Edge Blend Gradients (graceful fallback to CSS gradient mesh) */}
        {!heroImgFailed && (
          <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
            <picture className="block w-full h-full">
              <source
                type="image/avif"
                srcSet="/images/hero/hero-backdrop-mobile.avif 768w, /images/hero/hero-backdrop-desktop.avif 1672w"
                sizes="100vw"
              />
              <source
                type="image/webp"
                srcSet="/images/hero/hero-backdrop-mobile.webp 768w, /images/hero/hero-backdrop-desktop.webp 1672w"
                sizes="100vw"
              />
              <img
                ref={heroImgRef}
                id="hero-backdrop-img"
                src="/images/hero/hero-backdrop-desktop.webp"
                width={1672}
                height={941}
                fetchPriority="high"
                decoding="async"
                alt=""
                aria-hidden="true"
                onLoad={() => setHeroImgLoaded(true)}
                onError={() => setHeroImgFailed(true)}
                style={{ backgroundColor: '#FCECF2' }}
                className={`w-full h-full object-cover object-center sm:object-[62%_center] transition-opacity duration-500 ${
                  heroImgLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </picture>

            {/* Soft directional light scrim for >=4.5:1 open text contrast while keeping rings/roses visible */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(100deg, rgba(255, 249, 252, 0.72) 0%, rgba(255, 246, 250, 0.42) 48%, rgba(255, 248, 252, 0.1) 100%)',
              }}
            />

            {/* Feathered bottom blend into the page gradient mesh so edges never show a hard seam */}
            <div
              className="absolute inset-x-0 bottom-0 h-24 sm:h-32"
              style={{
                background:
                  'linear-gradient(to top, rgba(253, 242, 234, 0.96) 0%, rgba(252, 238, 244, 0.62) 55%, rgba(252, 238, 244, 0) 100%)',
              }}
            />
          </div>
        )}

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Hero Content — open layout directly over the photo backdrop (no enclosing box) */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <GlassSurface
                variant="tinted-pink"
                rounded="full"
                className="inline-flex items-center px-3.5 sm:px-4 py-1.5"
              >
                <span className="text-[11px] sm:text-xs font-extrabold tracking-wide uppercase text-[#3A1C25]">
                  {t.hero.badge}
                </span>
              </GlassSurface>

              <div className="font-script text-3xl sm:text-4xl text-[#A8325B] tracking-wide -mb-2 drop-shadow-[0_1px_1px_rgba(255,255,255,0.85)]">
                {t.hero.script}
              </div>

              <h1 className="font-playfair text-4xl sm:text-6xl font-extrabold text-[#1E1418] tracking-tight leading-[1.12] [text-wrap:balance] drop-shadow-[0_1px_1px_rgba(255,255,255,0.65)]">
                {t.hero.title}
              </h1>

              <p className="text-base sm:text-lg text-[#2F2027] max-w-xl leading-relaxed font-medium drop-shadow-[0_1px_1px_rgba(255,255,255,0.75)]">
                {t.hero.subtitle}
              </p>

              {/* Primary & Secondary Liquid Glass CTAs over photo backdrop */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <GlassButton
                  tone="tinted"
                  size="lg"
                  cssOnly={isMobileViewport || heroImgFailed}
                  href="/templates"
                  onAnchorClick={(e) => {
                    e.preventDefault();
                    navigate('/templates');
                  }}
                  rightIcon={<ArrowRight className="w-4 h-4 shrink-0" />}
                >
                  {t.hero.createBtn}
                </GlassButton>

                <GlassButton
                  tone="clear"
                  size="lg"
                  cssOnly={isMobileViewport || heroImgFailed}
                  href="/templates"
                  onAnchorClick={(e) => {
                    e.preventDefault();
                    navigate('/templates');
                  }}
                  leftIcon={<Eye className="w-4 h-4 text-[#1E5B8A] shrink-0" />}
                >
                  {t.hero.exploreBtn}
                </GlassButton>
              </div>
            </div>

            {/* Right Hero Mockup: Clean iPhone Showcase ONLY (no floating RSVP/Music cards) */}
            <div className="lg:col-span-5 relative flex items-center justify-center py-4 lg:py-6 select-none">
              <div className="relative z-20 mx-auto">
                <div className="block relative rounded-[50px] p-[10px] bg-gradient-to-b from-[#3D3338] via-[#211A1E] to-[#140F12] shadow-[0_30px_80px_rgba(30,16,22,0.34)] ring-1 ring-white/30">
                  <div className="relative rounded-[42px] overflow-hidden bg-[#FAF6F0] w-[275px] sm:w-[304px] aspect-[9/18.5] flex flex-col items-center justify-between shadow-inner border border-black/10">
                    {/* Clean Dynamic Island Notch */}
                    <div
                      className="absolute top-3.5 z-40 w-24 h-5 bg-black rounded-full flex items-center justify-start px-2.5 shadow-md pointer-events-none"
                      aria-hidden="true"
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-[#1A1A1A] border border-white/20" />
                    </div>

                    <div className="w-full h-full relative overflow-hidden">
                      <LuxuryEnvelope
                        hostNames={t.hero.sampleGroomBride}
                        eventDate={t.hero.sampleDate}
                        venueName={t.hero.sampleVenue}
                        buttonLabel={t.hero.openEnvelopeBtn}
                        headerLabel={t.hero.envelopeHeader}
                        ceremonyLabel={t.hero.sampleCeremony}
                        scriptSubtitle={t.hero.sampleScriptSubtitle}
                        quote={t.hero.sampleQuote}
                        viewSiteLabel={t.hero.viewFullSiteBtn}
                        sealHint={t.hero.sealHint}
                        onViewFullSite={() => navigate('/i/nodir-malika-wedding')}
                      />
                    </div>

                    <div className="absolute bottom-2 z-40 w-32 h-1 bg-black/30 rounded-full pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6.2 SERVICE CATEGORIES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="font-script text-2xl text-[#C94F79] block">{t.services.script}</span>
          <h2 className="font-playfair text-3xl sm:text-5xl font-extrabold text-[#1E1418] mt-1">
            {t.services.title}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <GlassSurface
            variant="tinted-pink"
            rounded="3xl"
            interactive
            className="p-8 sm:p-10 flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-white/90 flex items-center justify-center mb-6 text-[#C94F79] shadow-sm border border-white">
                <Smartphone className="w-7 h-7" aria-hidden="true" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#9E3E60]">
                {t.services.webLabel}
              </span>
              <h3 className="font-playfair text-2xl sm:text-3xl font-bold text-[#1E1418] mb-3 mt-1">
                {t.services.webTitle}
              </h3>
              <p className="text-sm text-[#4A383F] leading-relaxed mb-6">{t.services.webDesc}</p>

              <div className="space-y-2.5 mb-8">
                {t.services.webFeatures.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-xs text-[#1E1418] font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              to="/templates"
              className="w-full min-h-[48px] py-3.5 px-5 rounded-2xl text-xs sm:text-sm font-extrabold text-[#1E1418] bg-white/95 hover:bg-white shadow-sm transition-colors text-center flex items-center justify-center gap-2 border border-white"
            >
              <span>{t.services.webCta}</span>
              <ArrowRight className="w-4 h-4 text-[#C94F79] shrink-0" aria-hidden="true" />
            </Link>
          </GlassSurface>

          <GlassSurface
            variant="tinted-sky"
            rounded="3xl"
            interactive
            className="p-8 sm:p-10 flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-white/90 flex items-center justify-center mb-6 text-[#3B88C3] shadow-sm border border-white">
                <Gem className="w-7 h-7" aria-hidden="true" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#2B6EA3]">
                {t.services.vipLabel}
              </span>
              <h3 className="font-playfair text-2xl sm:text-3xl font-bold text-[#1E1418] mb-3 mt-1">
                {t.services.videoTitle}
              </h3>
              <p className="text-sm text-[#4A383F] leading-relaxed mb-6">{t.services.videoDesc}</p>

              <div className="space-y-2.5 mb-8">
                {t.services.vipFeatures.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-xs text-[#1E1418] font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              to="/pricing"
              className="w-full min-h-[48px] py-3.5 px-5 rounded-2xl text-xs sm:text-sm font-extrabold text-[#1E1418] bg-white/95 hover:bg-white shadow-sm transition-colors text-center flex items-center justify-center gap-2 border border-white"
            >
              <span>{t.services.videoCta}</span>
              <ArrowRight className="w-4 h-4 text-[#3B88C3] shrink-0" aria-hidden="true" />
            </Link>
          </GlassSurface>
        </div>
      </section>

      {/* 6.3 HOW IT WORKS */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="font-script text-2xl text-[#C94F79] block">{t.how.script}</span>
          <h2 className="font-playfair text-3xl sm:text-5xl font-extrabold text-[#1E1418] mt-1">
            {t.how.title}
          </h2>
          <p className="text-xs sm:text-sm text-[#4A383F] mt-2">{t.how.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              num: '01',
              title: t.how.step1Title,
              desc: t.how.step1Desc,
              color: 'from-[#F5C9D8] to-white',
              textColor: 'text-[#9E3E60]',
            },
            {
              num: '02',
              title: t.how.step2Title,
              desc: t.how.step2Desc,
              color: 'from-[#B9DFFA] to-white',
              textColor: 'text-[#2B6EA3]',
            },
            {
              num: '03',
              title: t.how.step3Title,
              desc: t.how.step3Desc,
              color: 'from-[#F5C9D8] via-white to-[#B9DFFA]',
              textColor: 'text-[#8D6829]',
            },
            {
              num: '04',
              title: t.how.step4Title,
              desc: t.how.step4Desc,
              color: 'from-[#B9DFFA] to-[#F5C9D8]',
              textColor: 'text-emerald-800',
            },
          ].map((step, idx) => (
            <GlassSurface key={idx} variant="default" rounded="3xl" interactive className="p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${step.color} flex items-center justify-center shadow-xs text-base font-extrabold tabular-nums border border-white ${step.textColor}`}
                  >
                    {step.num}
                  </div>
                </div>
                <h3 className="font-playfair text-lg font-bold text-[#1E1418] mb-2">{step.title}</h3>
                <p className="text-xs text-[#4A383F] leading-relaxed">{step.desc}</p>
              </div>
            </GlassSurface>
          ))}
        </div>
      </section>

      {/* 6.4 FEATURED TEMPLATES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-10">
          <div>
            <span className="font-script text-2xl text-[#C94F79] block">{t.templatesSection.script}</span>
            <h2 className="font-playfair text-3xl sm:text-5xl font-extrabold text-[#1E1418] mt-1">
              {t.templatesSection.title}
            </h2>
          </div>
          <Link
            to="/templates"
            className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 rounded-full glass-surface text-xs font-extrabold text-[#1E1418] hover:bg-white transition-colors whitespace-nowrap"
          >
            <span>{t.templatesSection.viewAll}</span>
            <ArrowRight className="w-4 h-4 text-[#C94F79] shrink-0" aria-hidden="true" />
          </Link>
        </div>

        {/* Lightweight glass cards (.glass-card-lite): fast 8px blur desktop / 0px blur mobile, no nested blurs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredTemplates.map((template) => (
            <div
              key={template.id}
              className="glass-card-lite glass-card-hover rounded-3xl overflow-hidden flex flex-col justify-between group"
            >
              <div>
                <div className="relative h-64 overflow-hidden bg-[#ECE4D8]">
                  <img
                    src={template.previewImage}
                    alt={template.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-95"
                    loading="lazy"
                  />
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    {template.isPopular && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#F5C9D8]/95 text-[#2E141E] shadow-xs border border-white/80">
                        {t.templatesSection.popular}
                      </span>
                    )}
                    {template.isNew && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#B9DFFA]/95 text-[#142636] shadow-xs border border-white/80">
                        {t.templatesSection.newBadge}
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full text-[11px] font-extrabold bg-[#1E1418]/85 text-white border border-white/30 tabular-nums">
                    {formatPriceUZS(template.price, language)}
                  </div>
                </div>

                <div className="p-5">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-[#9E3E60] mb-1">
                    {translateCategory(template.category, language)}
                  </div>
                  <h3 className="font-playfair text-lg font-bold text-[#1E1418] mb-1.5">{template.name}</h3>
                  <p className="text-xs text-[#4A383F] line-clamp-2 leading-relaxed">
                    {template.description[language] || template.description.uz}
                  </p>
                </div>
              </div>

              <div className="p-5 pt-0 grid grid-cols-2 gap-2 border-t border-black/5 mt-2">
                <Link
                  to={`/templates/${template.slug}`}
                  className="min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold text-[#1E1418] bg-white/85 hover:bg-white border border-black/8 text-center transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <Eye className="w-3.5 h-3.5 text-[#3B88C3] shrink-0" aria-hidden="true" />
                  <span>{t.templatesSection.shortPreview}</span>
                </Link>

                <Link
                  to={`/create/${template.slug}`}
                  className="min-h-[44px] py-2 px-3 rounded-xl text-xs font-extrabold text-[#1E1418] bg-gradient-to-r from-[#F5C9D8] to-[#B9DFFA] hover:brightness-105 text-center transition-all flex items-center justify-center gap-1 whitespace-nowrap"
                >
                  <span>{t.templatesSection.selectShort}</span>
                  <ArrowRight className="w-3 h-3 shrink-0" aria-hidden="true" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6.6 PLATFORM BENEFITS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="font-script text-2xl text-[#C94F79] block">{t.benefits.script}</span>
          <h2 className="font-playfair text-3xl sm:text-5xl font-extrabold text-[#1E1418] mt-1">
            {t.benefits.title}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {t.benefits.items.map((benefit, idx) => {
            const Icon = benefitIcons[idx % benefitIcons.length];
            const gradient = benefitGradients[idx % benefitGradients.length];
            return (
              <GlassSurface key={idx} variant="default" rounded="3xl" interactive className="p-6">
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${gradient} flex items-center justify-center text-[#1E1418] mb-4 shadow-xs border border-white`}
                >
                  <Icon className="w-5 h-5 text-[#C94F79]" aria-hidden="true" />
                </div>
                <h3 className="font-playfair text-lg font-bold text-[#1E1418] mb-2">{benefit.title}</h3>
                <p className="text-xs text-[#4A383F] leading-relaxed">{benefit.desc}</p>
              </GlassSurface>
            );
          })}
        </div>
      </section>

      {/* 6.7 STATISTICS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <GlassSurface variant="elevated" rounded="3xl" className="p-8 sm:p-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            <div>
              <div className="font-playfair text-3xl sm:text-5xl font-extrabold text-[#1E1418] tabular-nums">
                {mockStats.totalInvitations.toLocaleString()}+
              </div>
              <div className="text-xs font-bold text-[#9E3E60] mt-1 uppercase tracking-wider">
                {t.stats.invitations}
              </div>
            </div>
            <div>
              <div className="font-playfair text-3xl sm:text-5xl font-extrabold text-[#C94F79] tabular-nums">
                {mockStats.totalTemplates}+
              </div>
              <div className="text-xs font-bold text-[#3A1C25] mt-1 uppercase tracking-wider">
                {t.stats.templates}
              </div>
            </div>
            <div>
              <div className="font-playfair text-3xl sm:text-5xl font-extrabold text-[#2B6EA3] tabular-nums">
                {mockStats.totalGuests.toLocaleString()}+
              </div>
              <div className="text-xs font-bold text-[#1E3A5F] mt-1 uppercase tracking-wider">
                {t.stats.guests}
              </div>
            </div>
            <div>
              <div className="font-playfair text-3xl sm:text-5xl font-extrabold text-[#8D6829] tabular-nums">
                {mockStats.totalViews.toLocaleString()}+
              </div>
              <div className="text-xs font-bold text-[#4A383F] mt-1 uppercase tracking-wider">
                {t.stats.views}
              </div>
            </div>
          </div>
          <p className="text-[11px] text-center text-[#5C4F48] mt-6 italic">* {t.stats.demoNotice}</p>
        </GlassSurface>
      </section>

      {/* 6.8 PRICING PREVIEW */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="font-script text-2xl text-[#C94F79] block">{t.pricing.script}</span>
          <h2 className="font-playfair text-3xl sm:text-5xl font-extrabold text-[#1E1418] mt-1">
            {t.pricing.title}
          </h2>
          <p className="text-xs sm:text-sm text-[#4A383F] mt-2">{t.pricing.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          <GlassSurface variant="elevated" rounded="3xl" className="p-7 flex flex-col justify-between">
            <div>
              <h3 className="font-playfair text-xl font-bold text-[#1E1418]">{t.pricing.standard.name}</h3>
              <p className="text-xs text-[#5C4F48] mt-1">{t.pricing.standard.tagline}</p>
              <div className="my-5">
                <span className="font-playfair text-3xl font-extrabold text-[#1E1418] tabular-nums">
                  50 000
                </span>
                <span className="text-xs text-[#5C4F48] ml-1">{t.common.priceUzs}</span>
              </div>
              <ul className="space-y-2.5 text-xs text-[#1E1418] font-semibold">
                {t.pricing.standard.features.map((feat, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Link
              to="/templates"
              className="mt-6 w-full min-h-[44px] py-3 rounded-xl text-xs font-bold text-[#1E1418] bg-white/95 hover:bg-white border border-black/8 shadow-xs flex items-center justify-center transition-colors whitespace-nowrap"
            >
              {t.pricing.choosePlan}
            </Link>
          </GlassSurface>

          <GlassSurface
            variant="tinted-pink"
            rounded="3xl"
            className="p-8 border-2 border-white ring-2 ring-[#D66389]/25 relative flex flex-col justify-between md:-translate-y-2"
          >
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[#D66389] to-[#3B88C3] text-white text-[10px] font-extrabold uppercase tracking-wider shadow-md whitespace-nowrap">
              {t.pricing.mostPopular}
            </div>
            <div>
              <h3 className="font-playfair text-2xl font-bold text-[#1E1418]">
                {t.pricing.personalized.name}
              </h3>
              <p className="text-xs text-[#4A383F] mt-1">{t.pricing.personalized.tagline}</p>
              <div className="my-5">
                <span className="font-playfair text-4xl font-extrabold text-[#1E1418] tabular-nums">
                  60 000
                </span>
                <span className="text-xs text-[#4A383F] ml-1">{t.common.priceUzs}</span>
              </div>
              <ul className="space-y-2.5 text-xs text-[#1E1418] font-bold">
                {t.pricing.personalized.features.map((feat, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Link
              to="/pricing"
              className="mt-6 w-full min-h-[46px] py-3.5 rounded-xl text-xs font-extrabold text-[#1E1418] bg-white hover:bg-white/90 shadow-md flex items-center justify-center transition-colors whitespace-nowrap"
            >
              {t.pricing.chooseRecommended}
            </Link>
          </GlassSurface>

          <GlassSurface variant="tinted-sky" rounded="3xl" className="p-7 flex flex-col justify-between">
            <div>
              <h3 className="font-playfair text-xl font-bold text-[#1E1418]">{t.pricing.premium.name}</h3>
              <p className="text-xs text-[#5C4F48] mt-1">{t.pricing.premium.tagline}</p>
              <div className="my-5">
                <span className="font-playfair text-3xl font-extrabold text-[#1E1418] tabular-nums">
                  70 000
                </span>
                <span className="text-xs text-[#5C4F48] ml-1">{t.common.priceUzs}</span>
              </div>
              <ul className="space-y-2.5 text-xs text-[#1E1418] font-semibold">
                {t.pricing.premium.features.map((feat, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Link
              to="/pricing"
              className="mt-6 w-full min-h-[44px] py-3 rounded-xl text-xs font-bold text-[#1E1418] bg-white/95 hover:bg-white border border-black/8 shadow-xs flex items-center justify-center transition-colors whitespace-nowrap"
            >
              {t.pricing.detailsBtn}
            </Link>
          </GlassSurface>
        </div>
      </section>

      {/* 6.9 FAQ ACCORDION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <span className="font-script text-2xl text-[#C94F79] block">{t.faq.badge}</span>
            <h2 className="font-playfair text-3xl font-extrabold text-[#1E1418] mt-1">{t.faq.title}</h2>
          </div>

          <GlassAccordion items={faqItems} openId={openFaqId} onToggle={setOpenFaqId} />
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl p-8 sm:p-14 bg-gradient-to-r from-[#24151C] via-[#351D29] to-[#172533] text-white shadow-2xl overflow-hidden text-center border border-white/25">
          <div className="max-w-2xl mx-auto space-y-5 relative z-10">
            <span className="inline-block px-4 py-1 rounded-full bg-white/10 text-xs text-[#F5C9D8] font-extrabold tracking-wider uppercase border border-white/20">
              {t.ctaBanner.badge}
            </span>
            <h2 className="font-playfair text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight [text-wrap:balance]">
              {t.ctaBanner.title}
            </h2>
            <p className="text-xs sm:text-sm text-[#E8DCE2] leading-relaxed">{t.ctaBanner.subtitle}</p>
            <div className="pt-3 flex flex-wrap justify-center gap-3">
              <GlassButton
                tone="light"
                size="lg"
                href="/templates"
                onAnchorClick={(e) => {
                  e.preventDefault();
                  navigate('/templates');
                }}
                rightIcon={<ArrowRight className="w-4 h-4 shrink-0" />}
              >
                {t.ctaBanner.primaryBtn}
              </GlassButton>
              <Link
                to="/pricing"
                className="min-h-[48px] px-7 py-3 rounded-full text-sm font-bold text-white bg-white/15 hover:bg-white/25 transition-colors border border-white/25 flex items-center justify-center whitespace-nowrap"
              >
                {t.ctaBanner.secondaryBtn}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
