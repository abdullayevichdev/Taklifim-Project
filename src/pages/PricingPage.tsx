import React, { useState, useMemo } from 'react';
import { useRouter } from '../context/RouterContext';
import { useLanguage } from '../locales';
import { mockPlans } from '../data/mockPlans';
import { mockFaq } from '../data/mockFaq';
import { formatPriceUZS } from '../utils/logic';
import { GlassSurface, GlassButton, GlassAccordion } from '../components/glass';
import { CheckCircle2, X, Sparkles } from 'lucide-react';

export const PricingPage: React.FC = () => {
  const { navigate } = useRouter();
  const { language, t } = useLanguage();
  const [openFaqId, setOpenFaqId] = useState<string>('faq-1');

  const faqItems = useMemo(
    () =>
      mockFaq.map((faq) => ({
        id: faq.id,
        question: faq.question[language] || faq.question.uz,
        answer: faq.answer[language] || faq.answer.uz,
      })),
    [language]
  );

  const renderCell = (val: string) => {
    if (val === '✓') {
      return <CheckCircle2 className="w-4 h-4 text-emerald-700 mx-auto" aria-hidden="true" />;
    }
    if (val === '—') {
      return <X className="w-4 h-4 text-rose-400 mx-auto" aria-hidden="true" />;
    }
    return val;
  };

  return (
    <div className="pt-28 pb-20 min-h-screen space-y-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <GlassSurface
            variant="tinted-pink"
            rounded="full"
            className="inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-bold text-[#8D6829]"
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t.pricing.badge}</span>
          </GlassSurface>
          <h1 className="font-playfair text-4xl sm:text-5xl font-extrabold text-[#1E1418] tracking-tight">
            {t.pricing.pageTitle}
          </h1>
          <p className="text-sm text-[#4A383F] leading-relaxed">{t.pricing.pageSubtitle}</p>
        </div>

        {/* 3 Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          {mockPlans.map((plan) => {
            const targetRoute = plan.slug === 'premium' ? '/contact' : '/templates';
            const ctaLabel = plan.slug === 'premium' ? t.pricing.customOrder : t.pricing.chooseTemplate;

            return (
              <GlassSurface
                key={plan.id}
                variant={plan.isPopular ? 'tinted-pink' : plan.slug === 'premium' ? 'tinted-sky' : 'elevated'}
                rounded="3xl"
                interactive
                className={`p-6 sm:p-8 flex flex-col justify-between relative ${
                  plan.isPopular ? 'border-2 border-white md:-translate-y-2 ring-2 ring-[#D66389]/30' : ''
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[#D66389] to-[#3B88C3] text-white text-[10px] font-extrabold uppercase tracking-wider shadow-md whitespace-nowrap">
                    ★ {t.pricing.mostPopular}
                  </div>
                )}

                <div>
                  <h3 className="font-playfair text-xl sm:text-2xl font-bold text-[#1E1418]">
                    {plan.name[language] || plan.name.uz}
                  </h3>

                  <p className="text-xs text-[#4A383F] mt-1.5 min-h-[38px] leading-relaxed">
                    {plan.description[language] || plan.description.uz}
                  </p>

                  <div className="my-5 pb-5 border-b border-black/8">
                    <span className="font-playfair text-3xl font-extrabold text-[#1E1418] tabular-nums">
                      {formatPriceUZS(plan.price, language)}
                    </span>
                    <span className="text-xs text-[#5C4F48] block mt-1">{t.pricing.oneTimePayment}</span>
                  </div>

                  <div className="space-y-2.5 mb-6">
                    {(plan.features[language] || plan.features.uz).map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-[#1E1418] font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                        <span className="leading-snug">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <GlassButton
                    tone={plan.isPopular ? 'tinted' : 'light'}
                    size="md"
                    href={targetRoute}
                    onAnchorClick={(e) => {
                      e.preventDefault();
                      navigate(targetRoute);
                    }}
                    className="w-full justify-center"
                  >
                    {ctaLabel}
                  </GlassButton>
                </div>
              </GlassSurface>
            );
          })}
        </div>

        {/* Plan Comparison Table */}
        <GlassSurface variant="elevated" rounded="3xl" className="p-6 sm:p-8 space-y-6 max-w-5xl mx-auto">
          <div className="text-center max-w-lg mx-auto">
            <h3 className="font-playfair text-2xl font-bold text-[#1E1418]">{t.pricing.compareTitle}</h3>
            <p className="text-xs text-[#4A383F] mt-1">{t.pricing.compareSubtitle}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-black/10 text-[#4A383F]">
                  <th className="py-3 px-4 font-bold text-[#1E1418]">{t.pricing.featureCol}</th>
                  <th className="py-3 px-4 text-center font-bold">
                    {t.pricing.standard.name} ({formatPriceUZS(50000, language)})
                  </th>
                  <th className="py-3 px-4 text-center font-bold text-[#9E3E60]">
                    {t.pricing.personalized.name} ({formatPriceUZS(60000, language)})
                  </th>
                  <th className="py-3 px-4 text-center font-bold">
                    {t.pricing.premium.name} ({formatPriceUZS(70000, language)})
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/6">
                {t.pricing.comparisonRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-[#1E1418]">{row.name}</td>
                    <td className="py-3 px-4 text-center text-[#4A383F]">{renderCell(row.s)}</td>
                    <td className="py-3 px-4 text-center font-bold text-[#1E1418]">{renderCell(row.p)}</td>
                    <td className="py-3 px-4 text-center font-semibold text-[#1E3A5F]">{renderCell(row.v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassSurface>

        {/* Pricing FAQs */}
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="text-center mb-6">
            <h3 className="font-playfair text-2xl font-bold text-[#1E1418]">{t.pricing.faqTitle}</h3>
          </div>

          <GlassAccordion items={faqItems} openId={openFaqId} onToggle={setOpenFaqId} />
        </div>
      </div>
    </div>
  );
};
