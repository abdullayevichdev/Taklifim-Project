import React, { useState, useEffect } from 'react';
import { useRouter, Link } from '../context/RouterContext';
import { useLanguage } from '../locales';
import { useAuth } from '../context/AuthContext';
import { mockTemplates } from '../data/mockTemplates';
import { api } from '../services/api';
import { Template } from '../types';
import { mockFaq, mockStats } from '../data/mockFaq';
import { formatPriceUZS } from '../utils/logic';
import { LuxuryEnvelope } from '../components/LuxuryEnvelope';
import {
  ArrowRight,
  Eye,
  CheckCircle2,
  Calendar,
  MapPin,
  Music,
  Share2,
  Smartphone,
  QrCode,
  Users,
  ChevronDown,
  Star,
  Layers,
  Heart,
  Clock,
  ShieldCheck,
  Send,
  HeartHandshake,
  Gem,
  Flame,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { navigate } = useRouter();
  const { t, language } = useLanguage();
  const { showToast } = useAuth();

  // FAQ accordion state
  const [openFaqId, setOpenFaqId] = useState<string>('faq-1');
  const [allTemplates, setAllTemplates] = useState<Template[]>(mockTemplates);

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

  // Featured templates
  const featuredTemplates = allTemplates.slice(0, 8);

  return (
    <div className="pt-24 pb-20 space-y-28 overflow-hidden relative">
      {/* 6.1 HERO SECTION */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 lg:pt-14">
        {/* Soft Pink and Sky Blue floating ambient orbs */}
        <div className="absolute top-10 left-10 w-96 h-96 bg-gradient-to-tr from-[#F5C9D8]/50 to-transparent rounded-full blur-3xl pointer-events-none -z-10 animate-pulse duration-5000" />
        <div className="absolute top-20 right-10 w-96 h-96 bg-gradient-to-bl from-[#B9DFFA]/50 to-transparent rounded-full blur-3xl pointer-events-none -z-10 animate-pulse duration-7000" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Hero Content */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Wedding Badge with Pink & Sky Blue Glass */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-liquid-pink border border-white/90 shadow-[0_4px_20px_rgba(245,201,216,0.35)]">
              <span className="text-xs font-extrabold tracking-wide uppercase text-[#3A1C25]">
                To‘y va tantanalar uchun nafis raqamli taklifnomalar
              </span>
            </div>

            {/* Calligraphic Sub-title in cursive */}
            <div className="font-script text-3xl sm:text-4xl text-[#E27B9B] tracking-wide -mb-2">
              Baxtli lahzalar, muqaddas rishta...
            </div>

            {/* Main Headline */}
            <h1 className="font-playfair text-4xl sm:text-6xl lg:text-6xl font-extrabold text-[#1E1418] tracking-tight leading-[1.12]">
              {t.hero.title}
            </h1>

            <p className="text-base sm:text-lg text-[#4A383F] max-w-xl leading-relaxed">
              {t.hero.subtitle}
            </p>

            {/* CTA Buttons in Liquid Glass Pink & Sky */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/templates"
                className="flex items-center gap-2.5 px-7 py-4 rounded-2xl text-sm font-extrabold text-[#1E1418] bg-gradient-to-r from-[#F5C9D8] via-white to-[#B9DFFA] hover:shadow-[0_10px_30px_rgba(226,123,155,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-md border border-white/90"
              >
                <span>{t.hero.createBtn}</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>

              <Link
                to="/templates"
                className="flex items-center gap-2 px-6 py-4 rounded-2xl text-sm font-bold text-[#3A242B] glass-panel-elevated hover:bg-white transition-all duration-200 border border-white/90 shadow-sm"
              >
                <Eye className="w-4 h-4 text-[#4A9BD4]" />
                <span>{t.hero.exploreBtn}</span>
              </Link>
            </div>

            {/* Social Proof with Stars */}
            <div className="pt-4 flex items-center gap-6 border-t border-white/60">
              <div className="flex -space-x-2.5">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
                  alt="Mijoz"
                  className="w-9 h-9 rounded-full border-2 border-white object-cover shadow-xs"
                />
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80"
                  alt="Mijoz"
                  className="w-9 h-9 rounded-full border-2 border-white object-cover shadow-xs"
                />
                <img
                  src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80"
                  alt="Mijoz"
                  className="w-9 h-9 rounded-full border-2 border-white object-cover shadow-xs"
                />
              </div>
              <div className="text-xs text-[#4A383F]">
                <div className="flex items-center gap-1.5 font-bold">
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-[#1E1418] font-extrabold">5.0</span>
                  <span className="text-[#7A6A63] font-normal ml-1">
                    (3,400+ baxtli to‘y va tantanalar)
                  </span>
                </div>
                <span className="text-[11px] text-[#6B5A62]">
                  Mehmonlaringizning qalbiga yetib boruvchi go‘zal taklif
                </span>
              </div>
            </div>
          </div>

          {/* Right Hero Mockup: Modernized Ultra-Luxury iPhone Titanium Interactive Showcase */}
          <div className="lg:col-span-5 relative flex justify-center items-center py-6 select-none -translate-y-[60px]">
            {/* Luxury Ambient Lighting halos */}
            <div className="absolute w-80 h-80 rounded-full bg-gradient-to-tr from-[#F5C9D8]/60 via-[#E27B9B]/25 to-[#B9DFFA]/50 blur-3xl -z-10 animate-pulse-glow" />
            <div className="absolute -bottom-10 -right-10 w-64 h-64 rounded-full bg-[#4A9BD4]/25 blur-3xl -z-10" />

            {/* Restored Floating Card 1: RSVP Confirmation Status (Top Left) */}
            <div className="absolute -top-3 -left-3 sm:-left-10 z-40 bg-white/95 backdrop-blur-xl rounded-2xl p-3 sm:p-4 shadow-[0_15px_35px_rgba(226,123,155,0.22)] border border-white/80 flex items-center gap-3 animate-float-smooth">
              <div className="w-10 h-10 rounded-xl bg-[#FDECEF] flex items-center justify-center text-[#E27B9B] shadow-inner">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-[#8C7A82]">
                  <span>RSVP TASDIQ</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-semibold text-emerald-600">LIVE</span>
                </div>
                <div className="text-sm font-extrabold text-[#1E1418]">148 kishi qatnashadi</div>
                <div className="text-[10px] text-emerald-600 font-medium">Real-time sinxronizatsiya</div>
              </div>
            </div>

            {/* Restored Floating Card 2: Background Music Track Status (Bottom Right) */}
            <div className="absolute -bottom-3 -right-3 sm:-right-8 z-40 bg-white/95 backdrop-blur-xl rounded-2xl p-3 sm:p-4 shadow-[0_15px_35px_rgba(74,155,212,0.22)] border border-white/80 flex items-center gap-3 animate-float-smooth" style={{ animationDelay: '2.5s' }}>
              <div className="w-10 h-10 rounded-xl bg-[#E8F4FC] flex items-center justify-center text-[#4A9BD4] shadow-inner">
                <Music className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-[#8C7A82]">
                  <span>FON KUYI</span>
                  <span className="flex gap-0.5 items-end h-2.5">
                    <span className="w-0.5 h-2 bg-[#4A9BD4] animate-pulse" />
                    <span className="w-0.5 h-3.5 bg-[#4A9BD4] animate-pulse delay-75" />
                    <span className="w-0.5 h-1.5 bg-[#4A9BD4] animate-pulse delay-150" />
                  </span>
                </div>
                <div className="text-sm font-extrabold text-[#1E1418]">Nafis to‘y valsi</div>
                <div className="text-[10px] text-[#4A9BD4] font-medium">Stereo audio player</div>
              </div>
            </div>

            {/* Apple iPhone 16 Pro Style Titanium Device Showcase with Luxury Envelope */}
            <div className="relative group transition-transform duration-500 hover:scale-[1.01] z-20">
              <div className="block relative rounded-[50px] p-[10px] bg-gradient-to-b from-[#3D3338] via-[#211A1E] to-[#140F12] shadow-[0_30px_90px_rgba(30,16,22,0.45),0_0_0_1px_rgba(255,255,255,0.25)] ring-1 ring-white/20">
                {/* Outer Titanium Rim reflection */}
                <div className="relative rounded-[42px] overflow-hidden bg-[#FAF6F0] w-[275px] sm:w-[310px] aspect-[9/18.5] flex flex-col items-center justify-between shadow-inner border border-black/10">
                  
                  {/* Dynamic Island Notch */}
                  <div className="absolute top-3.5 z-40 w-28 h-6 bg-black rounded-full flex items-center justify-between px-3 shadow-md pointer-events-none">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#1A1A1A] border border-white/20" />
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[9px] font-bold text-white/90 tracking-wider">LIVE</span>
                    </div>
                  </div>

                  {/* Rebuilt Pure React + SVG + HTML Luxury Wedding Invitation Envelope */}
                  <div className="w-full h-full relative overflow-hidden">
                    <LuxuryEnvelope
                      hostNames="Nodirbek & Malika"
                      eventDate="2026.10.25 • 18:00"
                      venueName="«Versal» Saroyi, Toshkent"
                      buttonLabel="Taklifnomani ochish"
                      onViewFullSite={() => navigate('/i/nodir-malika-wedding')}
                    />
                  </div>

                  {/* Home Indicator Bar */}
                  <div className="absolute bottom-2 z-40 w-32 h-1 bg-black/30 rounded-full pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6.2 SERVICE CATEGORIES: Liquid Glass Pink vs Sky Blue */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="font-script text-2xl text-[#E27B9B] block">
            {language === 'ru' ? 'Премиальные форматы' : language === 'en' ? 'Signature Formats' : 'Eng zamonaviy imkoniyatlar'}
          </span>
          <h2 className="font-playfair text-3xl sm:text-5xl font-extrabold text-[#1E1418] mt-1">
            {t.services.title}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: Interactive Website Invitations in Soft Pink Liquid Glass */}
          <div className="glass-liquid-pink rounded-3xl p-8 sm:p-10 border border-white/95 shadow-xl flex flex-col justify-between group hover:shadow-[0_20px_50px_rgba(245,201,216,0.4)] transition-all duration-300">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-white/90 flex items-center justify-center mb-6 text-[#E27B9B] shadow-sm">
                <Smartphone className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#E27B9B]">
                {language === 'ru' ? 'Веб-приглашение' : language === 'en' ? 'Web Invitation' : 'Veb Sahifa Taklifnomasi'}
              </span>
              <h3 className="font-playfair text-2xl sm:text-3xl font-bold text-[#1E1418] mb-3 mt-1">
                {t.services.webTitle}
              </h3>
              <p className="text-sm text-[#4A383F] leading-relaxed mb-6">
                {t.services.webDesc}
              </p>

              <div className="space-y-2.5 mb-8">
                {[
                  language === 'ru' ? 'Персональная ссылка и QR-код' : language === 'en' ? 'Personalized link and QR code' : 'Shaxsiy havola va individual QR-kod',
                  language === 'ru' ? 'Музыка и галерея высокой чёткости' : language === 'en' ? 'Background music and photo gallery' : 'To‘y musiqasi va yuqori sifatli fotogalereya',
                  language === 'ru' ? 'Навигация Yandex & Google Maps' : language === 'en' ? 'Yandex & Google Maps directions' : 'Yandex & Google Maps xarita navigatsiyasi',
                  language === 'ru' ? 'Учёт гостей и подтверждение RSVP' : language === 'en' ? 'Guest attendance & RSVP tracking' : 'Mehmonlar RSVP tashrif tasdig‘i (Mijoz kabineti)',
                  language === 'ru' ? 'Таймер до свадьбы и дресс-код' : language === 'en' ? 'Live countdown and dress code palette' : 'Haqiqiy vaqt taymeri va dres-kod tavsiyasi',
                ].map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-xs text-[#2A1C22] font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              to="/templates"
              className="w-full py-4 rounded-2xl text-xs font-extrabold text-[#1E1418] bg-white hover:bg-white/90 shadow-md transition-all text-center flex items-center justify-center gap-2"
            >
              <span>{t.services.webCta}</span>
              <ArrowRight className="w-4 h-4 text-[#E27B9B]" />
            </Link>
          </div>

          {/* Card 2: Individual VIP Digital Invitations in Sky Blue Liquid Glass */}
          <div className="glass-liquid-sky rounded-3xl p-8 sm:p-10 border border-white/95 shadow-xl flex flex-col justify-between group hover:shadow-[0_20px_50px_rgba(185,223,250,0.4)] transition-all duration-300">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-white/90 flex items-center justify-center mb-6 text-[#4A9BD4] shadow-sm">
                <Gem className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#4A9BD4]">
                {language === 'ru' ? 'Индивидуальный VIP Дизайн' : language === 'en' ? 'Bespoke VIP Craft' : 'VIP Individual Xizmat'}
              </span>
              <h3 className="font-playfair text-2xl sm:text-3xl font-bold text-[#1E1418] mb-3 mt-1">
                {language === 'ru' ? 'Персональная монограмма и VIP сайт' : language === 'en' ? 'Bespoke Monogram & VIP Website' : 'Maxsus Monogramma & VIP Taklifnoma'}
              </h3>
              <p className="text-sm text-[#4A383F] leading-relaxed mb-6">
                {language === 'ru'
                  ? 'Эксклюзивная разработка уникального веб-приглашения с личной монограммой, QR-кодами для входа и персональным доменом.'
                  : language === 'en'
                  ? 'Exclusive custom-tailored invitation with personalized royal monogram, VIP QR entry cards, and vanity domain link.'
                  : 'Sizning to‘yingiz uchun professional dizayner tomonidan alohida monogramma, shaxsiy havola va VIP mehmonlar QR ruxsatnomasi.'}
              </p>

              <div className="space-y-2.5 mb-8">
                {[
                  language === 'ru' ? 'Персональная дизайнерская монограмма' : language === 'en' ? 'Personalized royal monogram' : 'Alohida shaxsiy monogramma yaratish',
                  language === 'ru' ? 'Красивая персональная ссылка (домен)' : language === 'en' ? 'Custom vanity URL & private link' : 'Chiroyli shaxsiy havola (masalan: baxtli-juftlik)',
                  language === 'ru' ? 'QR-коды для индивидуального входа' : language === 'en' ? 'VIP guest QR-code entrance cards' : 'Har bir mehmonga shaxsiy QR-kodli ruxsatnoma',
                  language === 'ru' ? 'Неограниченный список гостей и RSVP' : language === 'en' ? 'Unlimited guest catalog & real-time RSVP' : 'Cheksiz mehmonlar ro‘yxati va real-vaqt RSVP javoblari',
                  language === 'ru' ? 'Премиум поддержка и персональный менеджер' : language === 'en' ? 'Dedicated concierge & 24/7 care' : 'Shaxsiy menejer va to‘liq texnik ko‘mak',
                ].map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-xs text-[#1E2D38] font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              to="/pricing"
              className="w-full py-4 rounded-2xl text-xs font-extrabold text-[#1E1418] bg-white hover:bg-white/90 shadow-md transition-all text-center flex items-center justify-center gap-2"
            >
              <span>{language === 'ru' ? 'Смотреть VIP тариф' : language === 'en' ? 'Explore VIP Plan' : 'VIP Tarifni Tanlash'}</span>
              <ArrowRight className="w-4 h-4 text-[#4A9BD4]" />
            </Link>
          </div>
        </div>
      </section>

      {/* 6.3 HOW IT WORKS (4-STEP WEDDING FLOW) */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="font-script text-2xl text-[#E27B9B] block">
            Qulay va oson
          </span>
          <h2 className="font-playfair text-3xl sm:text-5xl font-extrabold text-[#1E1418] mt-1">
            Qanday Ishlaydi?
          </h2>
          <p className="text-xs sm:text-sm text-[#4A383F] mt-2">
            {t.how.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              num: '01',
              title: t.how.step1Title,
              desc: t.how.step1Desc,
              color: 'from-[#F5C9D8] to-white',
              textColor: 'text-[#E27B9B]',
            },
            {
              num: '02',
              title: t.how.step2Title,
              desc: t.how.step2Desc,
              color: 'from-[#B9DFFA] to-white',
              textColor: 'text-[#4A9BD4]',
            },
            {
              num: '03',
              title: t.how.step3Title,
              desc: t.how.step3Desc,
              color: 'from-[#F5C9D8] via-white to-[#B9DFFA]',
              textColor: 'text-[#B48B47]',
            },
            {
              num: '04',
              title: t.how.step4Title,
              desc: t.how.step4Desc,
              color: 'from-[#B9DFFA] to-[#F5C9D8]',
              textColor: 'text-emerald-700',
            },
          ].map((step, idx) => (
            <div
              key={idx}
              className="glass-liquid-wedding rounded-3xl p-6 border border-white/95 shadow-md relative flex flex-col justify-between hover:-translate-y-2 transition-all duration-300"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${step.color} flex items-center justify-center shadow-xs text-base font-extrabold ${step.textColor}`}>
                    {step.num}
                  </div>
                </div>
                <h3 className="font-playfair text-lg font-bold text-[#1E1418] mb-2">
                  {step.title}
                </h3>
                <p className="text-xs text-[#5C4F48] leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6.4 FEATURED TEMPLATES (8 ORIGINAL DESIGNS) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-12">
          <div>
            <span className="font-script text-2xl text-[#E27B9B] block">
              Har bir did uchun
            </span>
            <h2 className="font-playfair text-3xl sm:text-5xl font-extrabold text-[#1E1418] mt-1">
              Ommabop Shablonlar
            </h2>
          </div>
          <Link
            to="/templates"
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl glass-liquid-pink text-xs font-extrabold text-[#1E1418] hover:bg-white transition-all shadow-xs"
          >
            <span>Barcha shablonlarni ko‘rish</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredTemplates.map((template) => (
            <div
              key={template.id}
              className="glass-panel-elevated rounded-3xl overflow-hidden border border-white/95 shadow-lg glass-card-hover flex flex-col justify-between group"
            >
              <div>
                {/* Image preview container with pink/sky badges */}
                <div className="relative h-64 overflow-hidden bg-[#ECE4D8]">
                  <img
                    src={template.previewImage}
                    alt={template.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  {/* Subtle glass overlay tag */}
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    {template.isPopular && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#F5C9D8]/95 text-[#2E141E] backdrop-blur-md shadow-xs border border-white/60">
                        Ommabop
                      </span>
                    )}
                    {template.isNew && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#B9DFFA]/95 text-[#142636] backdrop-blur-md shadow-xs border border-white/60">
                        Yangi
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full text-[11px] font-extrabold bg-[#1E1418]/75 text-white backdrop-blur-md border border-white/30">
                    {formatPriceUZS(template.price)}
                  </div>
                </div>

                {/* Template Meta */}
                <div className="p-5">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-[#E27B9B] mb-1">
                    {template.category}
                  </div>
                  <h3 className="font-playfair text-lg font-bold text-[#1E1418] mb-1.5">
                    {template.name}
                  </h3>
                  <p className="text-xs text-[#5C4F48] line-clamp-2 leading-relaxed">
                    {template.description[language] || template.description.uz}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="p-5 pt-0 grid grid-cols-2 gap-2 border-t border-black/5 mt-2">
                <Link
                  to={`/templates/${template.slug}`}
                  className="py-2.5 px-3 rounded-xl text-xs font-bold text-[#4A383F] glass-panel hover:bg-white text-center transition-colors flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5 text-[#4A9BD4]" />
                  <span>Ko‘rish</span>
                </Link>

                <Link
                  to={`/create/${template.slug}`}
                  className="py-2.5 px-3 rounded-xl text-xs font-extrabold text-[#1E1418] bg-gradient-to-r from-[#F5C9D8] to-[#B9DFFA] hover:shadow-md text-center transition-all flex items-center justify-center gap-1"
                >
                  <span>Tanlash</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6.6 PLATFORM BENEFITS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="font-script text-2xl text-[#E27B9B] block">
            Qulaylik va Tejamkorlik
          </span>
          <h2 className="font-playfair text-3xl sm:text-5xl font-extrabold text-[#1E1418] mt-1">
            Nega Aynan Taklifim?
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Smartphone,
              title: language === 'ru' ? 'Подходит для любых смартфонов' : language === 'en' ? 'Perfect for Any Smartphone' : 'Har qanday smartfonga mos',
              desc: language === 'ru' ? 'Плавная и мгновенная загрузка на iOS и Android прямо в браузере.' : language === 'en' ? 'Opens smoothly like an app on both iOS and Android.' : 'iOS va Android qurilmalarida ilovadek mayin va bir zumda ochiladi.',
              gradient: 'from-[#F5C9D8] to-white',
            },
            {
              icon: Share2,
              title: language === 'ru' ? 'Отправка в один клик' : language === 'en' ? 'One-Click Sharing' : 'Bir bosishda ulashish',
              desc: language === 'ru' ? 'Отправляйте красивую ссылку гостям через Telegram, WhatsApp и соцсети.' : language === 'en' ? 'Send a personalized invitation link via Telegram, WhatsApp, and social apps.' : 'Telegram, WhatsApp va ijtimoiy tarmoqlar orqali chiroyli havola jo‘nating.',
              gradient: 'from-[#B9DFFA] to-white',
            },
            {
              icon: QrCode,
              title: language === 'ru' ? 'Индивидуальный QR-код' : language === 'en' ? 'Custom QR Code' : 'Individual QR-kod',
              desc: language === 'ru' ? 'Генерация персонального QR-кода для печати на открытках и бонбоньерках.' : language === 'en' ? 'High-res QR code generated for printed cards and souvenir gifts.' : 'Bosma otkritka yoki sovg‘alarga tushirish uchun maxsus QR-kod generatsiyasi.',
              gradient: 'from-[#F5C9D8] via-white to-[#B9DFFA]',
            },
            {
              icon: Users,
              title: language === 'ru' ? 'Система учёта гостей (RSVP)' : language === 'en' ? 'Guest RSVP Tracking' : 'Mehmonlar RSVP tizimi',
              desc: language === 'ru' ? 'Удобный онлайн-контроль списков гостей, их подтверждений и выбора меню.' : language === 'en' ? 'Track guest confirmations, party sizes, and banquet meal preferences online.' : 'Mehmonlarning qatnashish tasdig‘i va taom tanlovini onlayn kuzatib boring.',
              gradient: 'from-[#B9DFFA] to-white',
            },
            {
              icon: MapPin,
              title: language === 'ru' ? 'Карта и навигация' : language === 'en' ? 'Interactive Maps & Directions' : 'Xarita va navigatsiya',
              desc: language === 'ru' ? 'Точный маршрут к банкетному залу через Яндекс Карты и Google Maps.' : language === 'en' ? 'Precise turn-by-turn navigation via Yandex Maps & Google Maps.' : 'Yandex Maps va Google Maps orqali to‘yxonagacha bo‘lgan aniq yo‘nalish.',
              gradient: 'from-[#F5C9D8] to-white',
            },
            {
              icon: Music,
              title: language === 'ru' ? 'Элегантная музыка' : language === 'en' ? 'Atmospheric Music' : 'Nafis musiqiy jo‘rlik',
              desc: language === 'ru' ? 'Пленительный свадебный вальс или национальные мелодии при открытии.' : language === 'en' ? 'Enchanting romantic wedding soundtrack automatically playing upon opening.' : 'Taklifnomani ochganda yangraydigan yoqimli to‘y valsi yoki milliy kuylar.',
              gradient: 'from-[#F5C9D8] to-[#B9DFFA]',
            },
          ].map((benefit, idx) => {
            const Icon = benefit.icon;
            return (
              <div
                key={idx}
                className="glass-liquid-wedding rounded-3xl p-6 border border-white/90 shadow-sm hover:shadow-xl transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${benefit.gradient} flex items-center justify-center text-[#1E1418] mb-4 shadow-xs border border-white/80`}>
                  <Icon className="w-5 h-5 text-[#E27B9B]" />
                </div>
                <h3 className="font-playfair text-lg font-bold text-[#1E1418] mb-2">
                  {benefit.title}
                </h3>
                <p className="text-xs text-[#5C4F48] leading-relaxed">
                  {benefit.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6.7 STATISTICS (DEMONSTRATION) IN LIQUID GLASS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-liquid-wedding rounded-3xl p-8 sm:p-12 border-2 border-white/95 shadow-xl">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            <div>
              <div className="font-playfair text-3xl sm:text-5xl font-extrabold text-[#1E1418]">
                {mockStats.totalInvitations.toLocaleString()}+
              </div>
              <div className="text-xs font-bold text-[#E27B9B] mt-1 uppercase tracking-wider">
                Yaratilgan Taklifnomalar
              </div>
            </div>
            <div>
              <div className="font-playfair text-3xl sm:text-5xl font-extrabold text-[#E27B9B]">
                {mockStats.totalTemplates}+
              </div>
              <div className="text-xs font-bold text-[#3A1C25] mt-1 uppercase tracking-wider">
                Mualliflik Shablonlari
              </div>
            </div>
            <div>
              <div className="font-playfair text-3xl sm:text-5xl font-extrabold text-[#4A9BD4]">
                {mockStats.totalGuests.toLocaleString()}+
              </div>
              <div className="text-xs font-bold text-[#1E3A5F] mt-1 uppercase tracking-wider">
                Taklif Qilingan Mehmonlar
              </div>
            </div>
            <div>
              <div className="font-playfair text-3xl sm:text-5xl font-extrabold text-[#B48B47]">
                {mockStats.totalViews.toLocaleString()}+
              </div>
              <div className="text-xs font-bold text-[#6B5A62] mt-1 uppercase tracking-wider">
                Ko‘rishlar Soni
              </div>
            </div>
          </div>
          <p className="text-[11px] text-center text-[#7A6A63] mt-6 italic">
            * {mockStats.isDemoNotice}
          </p>
        </div>
      </section>

      {/* 6.8 PRICING PREVIEW */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="font-script text-2xl text-[#E27B9B] block">
            Shaffof va Qulay
          </span>
          <h2 className="font-playfair text-3xl sm:text-5xl font-extrabold text-[#1E1418] mt-1">
            Tariflarimiz
          </h2>
          <p className="text-xs text-[#5C4F48] mt-2">
            Hech qanday yashirin to‘lovlarsiz, to‘liq imkoniyatlar
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* Standard */}
          <div className="glass-panel-elevated rounded-3xl p-7 border border-white/90 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-playfair text-xl font-bold text-[#1E1418]">Standard</h3>
              <p className="text-xs text-[#7A6A63] mt-1">Tezkor va qulay taklifnoma</p>
              <div className="my-5">
                <span className="font-playfair text-3xl font-extrabold text-[#1E1418]">
                  50 000
                </span>
                <span className="text-xs text-[#7A6A63] ml-1">so‘m</span>
              </div>
              <ul className="space-y-2.5 text-xs text-[#3A242B] font-semibold">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Katalogdagi 1 ta shablon</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Xarita va manzil navigatsiyasi</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Musiqa va shaxsiy havola</span>
                </li>
              </ul>
            </div>
            <Link
              to="/templates"
              className="mt-6 w-full py-3.5 rounded-xl text-xs font-bold text-[#1E1418] bg-white hover:bg-black/5 border border-white shadow-xs text-center block transition-colors"
            >
              Tanlash
            </Link>
          </div>

          {/* Personalized (Recommended) in Soft Pink & Sky Blue Glass */}
          <div className="glass-liquid-pink rounded-3xl p-8 border-2 border-white shadow-2xl relative flex flex-col justify-between -translate-y-2">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[#E27B9B] to-[#4A9BD4] text-white text-[10px] font-extrabold uppercase tracking-wider shadow-md">
              Eng Ommabop
            </div>
            <div>
              <h3 className="font-playfair text-2xl font-bold text-[#1E1418]">Personalized</h3>
              <p className="text-xs text-[#6B5A62] mt-1">Fotoalbom va RSVP boshqaruvi</p>
              <div className="my-5">
                <span className="font-playfair text-4xl font-extrabold text-[#1E1418]">
                  60 000
                </span>
                <span className="text-xs text-[#6B5A62] ml-1">so‘m</span>
              </div>
              <ul className="space-y-2.5 text-xs text-[#2E141E] font-bold">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Standard rejadagi barcha imkoniyatlar</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>10 tagacha fotosuratlar galereyasi</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Dastur (Schedule) va Dres-kod tavsiyasi</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Mehmonlar RSVP ro‘yxati (Kabinet)</span>
                </li>
              </ul>
            </div>
            <Link
              to="/pricing"
              className="mt-6 w-full py-4 rounded-xl text-xs font-extrabold text-[#1E1418] bg-white hover:bg-white/90 shadow-md text-center block transition-all"
            >
              Ushbu Tarifni Tanlash
            </Link>
          </div>

          {/* Individual Premium in Sky Blue Liquid Glass */}
          <div className="glass-liquid-sky rounded-3xl p-7 border border-white/90 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-playfair text-xl font-bold text-[#1E1418]">
                Individual Premium
              </h3>
              <p className="text-xs text-[#7A6A63] mt-1">Eksklyuziv VIP Xizmat</p>
              <div className="my-5">
                <span className="font-playfair text-3xl font-extrabold text-[#1E1418]">
                  70 000
                </span>
                <span className="text-xs text-[#7A6A63] ml-1">so‘m</span>
              </div>
              <ul className="space-y-2.5 text-xs text-[#1E2D38] font-semibold">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Personalized dagi barcha funksiyalar</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Shaxsiy Domen & QR Kodli Maxsus Taklifnoma</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Individual monogramma dizayni</span>
                </li>
              </ul>
            </div>
            <Link
              to="/pricing"
              className="mt-6 w-full py-3.5 rounded-xl text-xs font-bold text-[#1E1418] bg-white hover:bg-black/5 border border-white shadow-xs text-center block transition-colors"
            >
              Batafsil Ko‘rish
            </Link>
          </div>
        </div>
      </section>

      {/* 6.9 FAQ ACCORDION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <span className="font-script text-2xl text-[#E27B9B] block">
              Yordam va Javoblar
            </span>
            <h2 className="font-playfair text-3xl font-extrabold text-[#1E1418] mt-1">
              Ko‘p Beriladigan Savollar
            </h2>
          </div>

          <div className="space-y-3">
            {mockFaq.slice(0, 5).map((faq) => {
              const isOpen = openFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="glass-panel-elevated rounded-2xl border border-white/90 overflow-hidden shadow-xs transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqId(isOpen ? '' : faq.id)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-[#1E1418] hover:bg-white/40 transition-colors"
                  >
                    <span>{faq.question[language] || faq.question.uz}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#E27B9B] shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 pt-1 text-xs text-[#5C4F48] leading-relaxed border-t border-black/5 animate-fadeIn">
                      {faq.answer[language] || faq.answer.uz}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FINAL CALL TO ACTION: Liquid Glass Wedding Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl p-8 sm:p-14 bg-gradient-to-r from-[#24151C] via-[#351D29] to-[#172533] text-white shadow-2xl overflow-hidden text-center border-2 border-white/30">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#E27B9B]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#4A9BD4]/20 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-2xl mx-auto space-y-5 relative z-10">
            <span className="inline-block px-4 py-1 rounded-full bg-white/10 text-xs text-[#F5C9D8] font-extrabold tracking-wider uppercase border border-white/20">
              Birgalikda quvonch ulashamiz
            </span>
            <h2 className="font-playfair text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              To‘yingiz uchun mukammal taklifnomani hoziroq yarating
            </h2>
            <p className="text-xs sm:text-sm text-[#E8DCE2] leading-relaxed">
              Atigi bir necha daqiqada tayyorlanadigan va mehmonlaringizning qalbini zabt etadigan nafis interaktiv taklifnoma.
            </p>
            <div className="pt-3 flex flex-wrap justify-center gap-3">
              <Link
                to="/templates"
                className="px-8 py-4 rounded-2xl text-xs font-extrabold text-[#1E1418] bg-gradient-to-r from-[#F5C9D8] via-white to-[#B9DFFA] hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
              >
                Shablonni Tanlash
              </Link>
              <Link
                to="/pricing"
                className="px-7 py-4 rounded-2xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 transition-all border border-white/20"
              >
                Tariflar va Narxlar
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
