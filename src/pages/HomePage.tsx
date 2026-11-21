import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, Link } from '../context/RouterContext';
import { useLanguage } from '../locales';
import { mockTemplates } from '../data/mockTemplates';
import { api } from '../services/api';
import { Template } from '../types';
import { mockFaq, mockStats } from '../data/mockFaq';
import { LuxuryEnvelope } from '../components/LuxuryEnvelope';
import { TemplateCard } from '../components/TemplateCard';
import { GlassSurface, GlassButton, GlassAccordion } from '../components/glass';
import { useInViewReveal } from '../hooks/useInViewReveal';
import { AnimatedStatNumber } from '../components/AnimatedStatNumber';
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
  Sparkles,
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

  const servicesReveal = useInViewReveal();
  const howReveal = useInViewReveal();
  const benefitsReveal = useInViewReveal();
  const statsReveal = useInViewReveal();
  const pricingReveal = useInViewReveal();
  const faqReveal = useInViewReveal();
  const ctaReveal = useInViewReveal();

  useEffect(() => {
    if (heroImgRef.current?.complete && heroImgRef.current.naturalWidth > 0) {
      setHeroImgLoaded(true);
      return;
    }
    const timer = window.setTimeout(() => {
      setHeroImgLoaded(true);
    }, 1800);
    return () => window.clearTimeout(timer);
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
    <div className="taklifim-page-bottom space-y-20 sm:space-y-28 overflow-x-clip relative">
      {/* 6.1 HERO SECTION — Full-bleed pastel wedding glass photo backdrop with real refraction on desktop */}
      <section
        data-lg-backdrop={!isMobileViewport && !heroImgFailed ? '#hero-backdrop-img' : undefined}
        className="relative w-full overflow-hidden pt-[calc(var(--header-h,64px)+20px)] sm:pt-[calc(var(--header-h,68px)+28px)] pb-14 sm:pb-20 rounded-b-[32px] sm:rounded-b-[48px]"
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
                <span className="text-[12px] sm:text-[13px] font-bold tracking-[0.08em] uppercase text-[#3A1C25]">
                  {t.hero.badge}
                </span>
              </GlassSurface>

              <div className="font-script text-[34px] sm:text-[44px] lg:text-[48px] font-semibold text-[#A8325B] tracking-wide leading-[1.15] -mb-2 drop-shadow-[0_1px_1px_rgba(255,255,255,0.88)]">
                {t.hero.script}
              </div>

              <h1 className="font-playfair text-4xl sm:text-[54px] lg:text-[60px] font-bold text-[#1E1418] tracking-tight leading-[1.14] [text-wrap:balance] drop-shadow-[0_1px_1px_rgba(255,255,255,0.68)]">
                {t.hero.title}
              </h1>

              <p className="text-[18px] sm:text-[19px] text-[#2F2027] max-w-xl leading-relaxed font-medium drop-shadow-[0_1px_1px_rgba(255,255,255,0.78)]">
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
      <section
        ref={servicesReveal.ref}
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 lg-reveal-group ${
          servicesReveal.isVisible ? 'is-visible' : ''
        }`}
      >
        <div
          className="text-center max-w-3xl mx-auto mb-12 lg-reveal-item"
          style={{ '--lg-stagger': 0 } as React.CSSProperties}
        >
          <h2 className="font-playfair text-3xl sm:text-[44px] lg:text-5xl font-extrabold text-[#1E1418] tracking-tight leading-[1.15] [text-wrap:balance]">
            {t.services.title}
          </h2>
          <div
            aria-hidden="true"
            className="w-16 h-[3px] rounded-full bg-gradient-to-r from-[#D66389] via-[#E27B9B] to-[#4A9BD4] mx-auto my-3.5 shadow-[0_2px_10px_rgba(214,99,137,0.28)]"
          />
          <p className="text-sm sm:text-base text-[#4A383F] max-w-2xl mx-auto leading-relaxed font-medium [text-wrap:balance]">
            {t.services.subtitle}
          </p>
        </div>

        <div className="relative">
          {/* Subtle ambient pastel refraction pools behind the two glass cards on desktop */}
          <div
            aria-hidden="true"
            className="hidden md:block pointer-events-none absolute -inset-6 -z-10 rounded-[44px] opacity-85"
            style={{
              background:
                'radial-gradient(44% 65% at 22% 45%, rgba(242, 138, 178, 0.28) 0%, transparent 72%), radial-gradient(44% 65% at 78% 45%, rgba(118, 194, 248, 0.28) 0%, transparent 72%)',
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <GlassSurface
              variant="tinted-pink"
              rounded="3xl"
              interactive
              style={{ '--lg-stagger': 1 } as React.CSSProperties}
              className="lg-optical-card lg-reveal-item group p-8 sm:p-10 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-6">
                  <div className="w-14 h-14 rounded-2xl lg-icon-orb bg-gradient-to-br from-white/95 via-[#FCE6EE]/85 to-white/75 flex items-center justify-center text-[#C94F79] border border-white">
                    <Smartphone className="w-7 h-7" aria-hidden="true" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/65 border border-white/90 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-[#9E3E60] shadow-[inset_0_1px_0_rgba(255,255,255,1)]">
                    <Sparkles className="w-3 h-3 text-[#C94F79]" aria-hidden="true" />
                    <span>{t.services.webLabel}</span>
                  </span>
                </div>

                <h3 className="font-playfair text-2xl sm:text-3xl font-bold text-[#1E1418] mb-3">
                  {t.services.webTitle}
                </h3>
                <p className="text-sm text-[#4A383F] leading-relaxed mb-6">{t.services.webDesc}</p>

                <div className="space-y-3 mb-8 pt-5 border-t border-white/65">
                  {t.services.webFeatures.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 text-xs text-[#1E1418] font-semibold transition-transform duration-200 group-hover:translate-x-0.5"
                    >
                      <span className="w-5 h-5 rounded-full bg-emerald-500/12 border border-emerald-600/20 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                      </span>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                to="/templates"
                className="group/btn w-full min-h-[48px] py-3.5 px-5 rounded-2xl text-xs sm:text-sm font-extrabold text-[#1E1418] bg-gradient-to-r from-white/86 via-[#FFF6FA]/82 to-white/76 md:backdrop-blur-md hover:from-white hover:to-white shadow-[inset_0_1.5px_0_rgba(255,255,255,1),0_10px_24px_-8px_rgba(198,72,115,0.2)] transition-all duration-200 text-center flex items-center justify-center gap-2 border border-white/95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D66389]"
              >
                <span>{t.services.webCta}</span>
                <ArrowRight className="w-4 h-4 text-[#C94F79] shrink-0 transition-transform duration-200 group-hover/btn:translate-x-1" aria-hidden="true" />
              </Link>
            </GlassSurface>

            <GlassSurface
              variant="tinted-sky"
              rounded="3xl"
              interactive
              style={{ '--lg-stagger': 2 } as React.CSSProperties}
              className="lg-optical-card lg-reveal-item group p-8 sm:p-10 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-6">
                  <div className="w-14 h-14 rounded-2xl lg-icon-orb bg-gradient-to-br from-white/95 via-[#E4F2FE]/85 to-white/75 flex items-center justify-center text-[#2B7AB8] border border-white">
                    <Gem className="w-7 h-7" aria-hidden="true" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/65 border border-white/90 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-[#246394] shadow-[inset_0_1px_0_rgba(255,255,255,1)]">
                    <Sparkles className="w-3 h-3 text-[#3B88C3]" aria-hidden="true" />
                    <span>{t.services.vipLabel}</span>
                  </span>
                </div>

                <h3 className="font-playfair text-2xl sm:text-3xl font-bold text-[#1E1418] mb-3">
                  {t.services.videoTitle}
                </h3>
                <p className="text-sm text-[#4A383F] leading-relaxed mb-6">{t.services.videoDesc}</p>

                <div className="space-y-3 mb-8 pt-5 border-t border-white/65">
                  {t.services.vipFeatures.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 text-xs text-[#1E1418] font-semibold transition-transform duration-200 group-hover:translate-x-0.5"
                    >
                      <span className="w-5 h-5 rounded-full bg-emerald-500/12 border border-emerald-600/20 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                      </span>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                to="/pricing"
                className="group/btn w-full min-h-[48px] py-3.5 px-5 rounded-2xl text-xs sm:text-sm font-extrabold text-[#1E1418] bg-gradient-to-r from-white/86 via-[#F3F9FF]/82 to-white/76 md:backdrop-blur-md hover:from-white hover:to-white shadow-[inset_0_1.5px_0_rgba(255,255,255,1),0_10px_24px_-8px_rgba(74,155,212,0.2)] transition-all duration-200 text-center flex items-center justify-center gap-2 border border-white/95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B88C3]"
              >
                <span>{t.services.videoCta}</span>
                <ArrowRight className="w-4 h-4 text-[#3B88C3] shrink-0 transition-transform duration-200 group-hover/btn:translate-x-1" aria-hidden="true" />
              </Link>
            </GlassSurface>
          </div>
        </div>
      </section>

      {/* 6.3 HOW IT WORKS */}
      <section
        id="how-it-works"
        ref={howReveal.ref}
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 lg-reveal-group ${
          howReveal.isVisible ? 'is-visible' : ''
        }`}
      >
        <div
          className="text-center max-w-2xl mx-auto mb-12 lg-reveal-item"
          style={{ '--lg-stagger': 0 } as React.CSSProperties}
        >
          <span className="font-script text-2xl text-[#C94F79] block">{t.how.script}</span>
          <h2 className="font-playfair text-3xl sm:text-5xl font-extrabold text-[#1E1418] mt-1">
            {t.how.title}
          </h2>
          <p className="text-xs sm:text-sm text-[#4A383F] mt-2">{t.how.subtitle}</p>
        </div>

        <div className="relative">
          {/* Desktop Liquid Glass step progression filament */}
          <div
            aria-hidden="true"
            className="hidden lg:block pointer-events-none absolute top-[52px] left-[10%] right-[10%] h-[2px] rounded-full bg-gradient-to-r from-[#E27B9B]/35 via-[#4A9BD4]/35 to-emerald-500/35"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
            {[
              {
                num: '01',
                title: t.how.step1Title,
                desc: t.how.step1Desc,
                color: 'from-[#F5C9D8]/90 via-white to-[#FCECF2]',
                accentBar: 'from-[#E27B9B]/70 to-[#F5C9D8]/20',
                textColor: 'text-[#9E3E60]',
              },
              {
                num: '02',
                title: t.how.step2Title,
                desc: t.how.step2Desc,
                color: 'from-[#B9DFFA]/90 via-white to-[#ECF6FE]',
                accentBar: 'from-[#4A9BD4]/70 to-[#B9DFFA]/20',
                textColor: 'text-[#2B6EA3]',
              },
              {
                num: '03',
                title: t.how.step3Title,
                desc: t.how.step3Desc,
                color: 'from-[#F5C9D8]/85 via-white to-[#B9DFFA]/75',
                accentBar: 'from-[#C99B4E]/70 to-[#F5C9D8]/20',
                textColor: 'text-[#8D6829]',
              },
              {
                num: '04',
                title: t.how.step4Title,
                desc: t.how.step4Desc,
                color: 'from-[#B9DFFA]/85 via-white to-[#D5F5E3]/80',
                accentBar: 'from-emerald-600/65 to-[#B9DFFA]/20',
                textColor: 'text-emerald-800',
              },
            ].map((step, idx) => (
              <GlassSurface
                key={idx}
                variant="elevated"
                rounded="3xl"
                interactive
                style={{ '--lg-stagger': idx + 1 } as React.CSSProperties}
                className="lg-optical-card lg-reveal-item group p-6 sm:p-7 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div
                      className={`w-12 h-12 rounded-2xl lg-icon-orb bg-gradient-to-tr ${step.color} flex items-center justify-center text-base font-extrabold tabular-nums border border-white ${step.textColor}`}
                    >
                      {step.num}
                    </div>
                    {idx < 3 && (
                      <span
                        aria-hidden="true"
                        className="hidden lg:inline-flex w-7 h-7 rounded-full bg-white/65 border border-white/90 items-center justify-center text-[#9E3E60]/60 shadow-[inset_0_1px_0_rgba(255,255,255,1)] transition-transform duration-300 group-hover:translate-x-1"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <div
                    aria-hidden="true"
                    className={`h-[2px] w-10 rounded-full bg-gradient-to-r ${step.accentBar} mb-3.5`}
                  />
                  <h3 className="font-playfair text-lg font-bold text-[#1E1418] mb-2">{step.title}</h3>
                  <p className="text-xs text-[#4A383F] leading-relaxed">{step.desc}</p>
                </div>
              </GlassSurface>
            ))}
          </div>
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

        {/* Rich pastel gradient mesh behind cards */}
        <div className="taklifim-section-mesh">
          {/* Phones: one swipeable row (like the desktop row) instead of 8 full-screen cards stacked vertically */}
          <div className="flex sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:auto-rows-fr gap-4 sm:gap-5 lg:gap-6 items-stretch relative z-10 overflow-x-auto sm:overflow-visible snap-x snap-mandatory scroll-px-4 sm:scroll-px-0 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pb-2 sm:pb-0 overscroll-x-contain">
            {featuredTemplates.map((template, idx) => (
              <div key={template.id} className="w-[78vw] max-w-[320px] shrink-0 snap-start sm:w-auto sm:max-w-none sm:shrink">
                <TemplateCard template={template} priority={idx < 2} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6.6 PLATFORM BENEFITS */}
      <section
        ref={benefitsReveal.ref}
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 lg-reveal-group ${
          benefitsReveal.isVisible ? 'is-visible' : ''
        }`}
      >
        <div
          className="text-center max-w-2xl mx-auto mb-12 lg-reveal-item"
          style={{ '--lg-stagger': 0 } as React.CSSProperties}
        >
          <span className="font-script text-2xl text-[#C94F79] block">{t.benefits.script}</span>
          <h2 className="font-playfair text-3xl sm:text-5xl font-extrabold text-[#1E1418] mt-1">
            {t.benefits.title}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {t.benefits.items.map((benefit, idx) => {
            const Icon = benefitIcons[idx % benefitIcons.length];
            const gradient = benefitGradients[idx % benefitGradients.length];
            const iconAccent = idx % 2 === 0 ? 'text-[#C94F79]' : 'text-[#2B7AB8]';
            return (
              <GlassSurface
                key={idx}
                variant="elevated"
                rounded="3xl"
                interactive
                style={{ '--lg-stagger': idx + 1 } as React.CSSProperties}
                className="lg-optical-card lg-reveal-item group p-6 sm:p-7"
              >
                <div
                  className={`w-12 h-12 rounded-2xl lg-icon-orb bg-gradient-to-tr ${gradient} flex items-center justify-center mb-5 border border-white`}
                >
                  <Icon className={`w-5 h-5 ${iconAccent}`} aria-hidden="true" />
                </div>
                <h3 className="font-playfair text-lg font-bold text-[#1E1418] mb-2">{benefit.title}</h3>
                <p className="text-xs text-[#4A383F] leading-relaxed">{benefit.desc}</p>
              </GlassSurface>
            );
          })}
        </div>
      </section>

      {/* 6.7 STATISTICS */}
      <section
        ref={statsReveal.ref}
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 lg-reveal-group ${
          statsReveal.isVisible ? 'is-visible' : ''
        }`}
      >
        <GlassSurface
          variant="elevated"
          rounded="3xl"
          style={{ '--lg-stagger': 0 } as React.CSSProperties}
          className="lg-optical-card lg-reveal-item p-8 sm:p-12"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x lg:divide-white/75 text-center">
            <div className="px-2 sm:px-4 py-1 transition-transform duration-300 hover:-translate-y-0.5">
              <div className="font-playfair text-3xl sm:text-5xl font-extrabold text-[#1E1418] tabular-nums">
                <AnimatedStatNumber target={mockStats.totalInvitations} active={statsReveal.isVisible} />
              </div>
              <div className="text-xs font-bold text-[#9E3E60] mt-1.5 uppercase tracking-wider">
                {t.stats.invitations}
              </div>
            </div>
            <div className="px-2 sm:px-4 py-1 transition-transform duration-300 hover:-translate-y-0.5">
              <div className="font-playfair text-3xl sm:text-5xl font-extrabold text-[#C94F79] tabular-nums">
                <AnimatedStatNumber target={mockStats.totalTemplates} active={statsReveal.isVisible} />
              </div>
              <div className="text-xs font-bold text-[#3A1C25] mt-1.5 uppercase tracking-wider">
                {t.stats.templates}
              </div>
            </div>
            <div className="px-2 sm:px-4 py-1 transition-transform duration-300 hover:-translate-y-0.5">
              <div className="font-playfair text-3xl sm:text-5xl font-extrabold text-[#2B6EA3] tabular-nums">
                <AnimatedStatNumber target={mockStats.totalGuests} active={statsReveal.isVisible} />
              </div>
              <div className="text-xs font-bold text-[#1E3A5F] mt-1.5 uppercase tracking-wider">
                {t.stats.guests}
              </div>
            </div>
            <div className="px-2 sm:px-4 py-1 transition-transform duration-300 hover:-translate-y-0.5">
              <div className="font-playfair text-3xl sm:text-5xl font-extrabold text-[#8D6829] tabular-nums">
                <AnimatedStatNumber target={mockStats.totalViews} active={statsReveal.isVisible} />
              </div>
              <div className="text-xs font-bold text-[#4A383F] mt-1.5 uppercase tracking-wider">
                {t.stats.views}
              </div>
            </div>
          </div>
          <p className="text-[13px] text-center text-[#4A383F] mt-7 pt-5 border-t border-white/60 italic">
            * {t.stats.demoNotice}
          </p>
        </GlassSurface>
      </section>

      {/* 6.8 PRICING PREVIEW */}
      <section
        ref={pricingReveal.ref}
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 lg-reveal-group ${
          pricingReveal.isVisible ? 'is-visible' : ''
        }`}
      >
        <div
          className="text-center max-w-2xl mx-auto mb-12 lg-reveal-item"
          style={{ '--lg-stagger': 0 } as React.CSSProperties}
        >
          <span className="font-script text-2xl text-[#C94F79] block">{t.pricing.script}</span>
          <h2 className="font-playfair text-3xl sm:text-5xl font-extrabold text-[#1E1418] mt-1">
            {t.pricing.title}
          </h2>
          <p className="text-xs sm:text-sm text-[#4A383F] mt-2">{t.pricing.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          <GlassSurface
            variant="elevated"
            rounded="3xl"
            interactive
            style={{ '--lg-stagger': 1 } as React.CSSProperties}
            className="lg-optical-card lg-reveal-item group p-7 flex flex-col justify-between"
          >
            <div>
              <h3 className="font-playfair text-xl font-bold text-[#1E1418]">{t.pricing.standard.name}</h3>
              <p className="text-xs text-[#5C4F48] mt-1">{t.pricing.standard.tagline}</p>
              <div className="my-5 pb-5 border-b border-white/65">
                <span className="font-playfair text-3xl font-extrabold text-[#1E1418] tabular-nums">
                  50 000
                </span>
                <span className="text-xs text-[#5C4F48] ml-1">{t.common.priceUzs}</span>
              </div>
              <ul className="space-y-2.5 text-xs text-[#1E1418] font-semibold">
                {t.pricing.standard.features.map((feat, idx) => (
                  <li key={idx} className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/12 border border-emerald-600/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                    </span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Link
              to="/templates"
              className="group/btn mt-7 w-full min-h-[44px] py-3 px-4 rounded-xl text-xs font-bold text-[#1E1418] bg-white/78 md:backdrop-blur-md hover:bg-white/95 border border-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_8px_20px_-8px_rgba(30,20,24,0.12)] flex items-center justify-center gap-2 transition-all duration-200 whitespace-nowrap"
            >
              <span>{t.pricing.choosePlan}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#C94F79] shrink-0 transition-transform duration-200 group-hover/btn:translate-x-1" aria-hidden="true" />
            </Link>
          </GlassSurface>

          <div
            style={{ '--lg-stagger': 2 } as React.CSSProperties}
            className="relative flex flex-col lg-reveal-item md:-translate-y-2"
          >
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 px-4 py-1 rounded-full bg-gradient-to-r from-[#D66389] to-[#3B88C3] text-white text-[10px] font-extrabold uppercase tracking-wider shadow-[0_8px_20px_-6px_rgba(214,99,137,0.48),inset_0_1px_0_rgba(255,255,255,0.5)] border border-white/60 whitespace-nowrap">
              {t.pricing.mostPopular}
            </div>
            <GlassSurface
              variant="tinted-pink"
              rounded="3xl"
              interactive
              className="lg-optical-card group p-8 border-2 border-white ring-2 ring-[#D66389]/25 flex-1 flex flex-col justify-between"
            >
              <div>
                <h3 className="font-playfair text-2xl font-bold text-[#1E1418]">
                  {t.pricing.personalized.name}
                </h3>
                <p className="text-xs text-[#4A383F] mt-1">{t.pricing.personalized.tagline}</p>
                <div className="my-5 pb-5 border-b border-white/65">
                  <span className="font-playfair text-4xl font-extrabold text-[#1E1418] tabular-nums">
                    60 000
                  </span>
                  <span className="text-xs text-[#4A383F] ml-1">{t.common.priceUzs}</span>
                </div>
                <ul className="space-y-2.5 text-xs text-[#1E1418] font-bold">
                  {t.pricing.personalized.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/14 border border-emerald-600/25 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                      </span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                to="/pricing"
                className="group/btn mt-7 w-full min-h-[46px] py-3.5 px-4 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-[#D45682] to-[#B23864] hover:brightness-105 border border-white/55 shadow-[0_12px_28px_-8px_rgba(184,62,106,0.45),inset_0_1px_0_rgba(255,255,255,0.45)] flex items-center justify-center gap-2 transition-all duration-200 whitespace-nowrap"
              >
                <span>{t.pricing.chooseRecommended}</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover/btn:translate-x-1" aria-hidden="true" />
              </Link>
            </GlassSurface>
          </div>

          <GlassSurface
            variant="tinted-sky"
            rounded="3xl"
            interactive
            style={{ '--lg-stagger': 3 } as React.CSSProperties}
            className="lg-optical-card lg-reveal-item group p-7 flex flex-col justify-between"
          >
            <div>
              <h3 className="font-playfair text-xl font-bold text-[#1E1418]">{t.pricing.premium.name}</h3>
              <p className="text-xs text-[#5C4F48] mt-1">{t.pricing.premium.tagline}</p>
              <div className="my-5 pb-5 border-b border-white/65">
                <span className="font-playfair text-3xl font-extrabold text-[#1E1418] tabular-nums">
                  70 000
                </span>
                <span className="text-xs text-[#5C4F48] ml-1">{t.common.priceUzs}</span>
              </div>
              <ul className="space-y-2.5 text-xs text-[#1E1418] font-semibold">
                {t.pricing.premium.features.map((feat, idx) => (
                  <li key={idx} className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/12 border border-emerald-600/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                    </span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Link
              to="/pricing"
              className="group/btn mt-7 w-full min-h-[44px] py-3 px-4 rounded-xl text-xs font-bold text-[#1E1418] bg-white/78 md:backdrop-blur-md hover:bg-white/95 border border-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_8px_20px_-8px_rgba(74,155,212,0.16)] flex items-center justify-center gap-2 transition-all duration-200 whitespace-nowrap"
            >
              <span>{t.pricing.detailsBtn}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#3B88C3] shrink-0 transition-transform duration-200 group-hover/btn:translate-x-1" aria-hidden="true" />
            </Link>
          </GlassSurface>
        </div>
      </section>

      {/* 6.9 FAQ ACCORDION */}
      <section
        ref={faqReveal.ref}
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 lg-reveal-group ${
          faqReveal.isVisible ? 'is-visible' : ''
        }`}
      >
        <div className="max-w-3xl mx-auto">
          <div
            className="text-center mb-8 lg-reveal-item"
            style={{ '--lg-stagger': 0 } as React.CSSProperties}
          >
            <span className="font-script text-2xl text-[#C94F79] block">{t.faq.badge}</span>
            <h2 className="font-playfair text-3xl font-extrabold text-[#1E1418] mt-1">{t.faq.title}</h2>
          </div>

          <div
            className="lg-reveal-item"
            style={{ '--lg-stagger': 1 } as React.CSSProperties}
          >
            <GlassAccordion items={faqItems} openId={openFaqId} onToggle={setOpenFaqId} />
          </div>
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section
        ref={ctaReveal.ref}
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 lg-reveal-single ${
          ctaReveal.isVisible ? 'is-visible' : ''
        }`}
      >
        <div className="lg-dark-glass rounded-3xl p-8 sm:p-14 text-white text-center">
          {/* Subtle inner refraction pools for Apple Dark Liquid Glass depth */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -left-16 w-72 h-72 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(226, 123, 155, 0.24) 0%, transparent 72%)',
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -right-16 w-80 h-80 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(74, 155, 212, 0.22) 0%, transparent 72%)',
            }}
          />

          <div className="max-w-2xl mx-auto space-y-5 relative z-10">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/10 md:backdrop-blur-md text-xs text-[#F5C9D8] font-extrabold tracking-wider uppercase border border-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]">
              <Sparkles className="w-3.5 h-3.5 text-[#F5C9D8]" aria-hidden="true" />
              <span>{t.ctaBanner.badge}</span>
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
                className="min-h-[48px] px-7 py-3 rounded-full text-sm font-bold text-white bg-white/12 md:backdrop-blur-md hover:bg-white/22 transition-colors border border-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] flex items-center justify-center whitespace-nowrap"
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
