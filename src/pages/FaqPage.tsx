import React, { useState, useMemo } from 'react';
import { useLanguage } from '../locales';
import { mockFaq } from '../data/mockFaq';
import {
  GlassSurface,
  GlassInput,
  GlassSegmented,
  GlassAccordion,
  GlassSegmentedOption,
} from '../components/glass';
import { Search, HelpCircle } from 'lucide-react';

type FaqCategory = 'all' | 'website' | 'general' | 'payment';

export const FaqPage: React.FC = () => {
  const { language, t } = useLanguage();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<FaqCategory>('all');
  const [openId, setOpenId] = useState<string>('faq-1');

  const categoryOptions: GlassSegmentedOption<FaqCategory>[] = useMemo(
    () => [
      { value: 'all', label: t.faq.cats.all },
      { value: 'website', label: t.faq.cats.website },
      { value: 'general', label: t.faq.cats.general },
      { value: 'payment', label: t.faq.cats.payment },
    ],
    [t]
  );

  const filteredFaq = useMemo(() => {
    return mockFaq
      .filter((f) => {
        const matchCat = category === 'all' || f.category === category;
        const q = search.toLowerCase().trim();
        const question = (f.question[language] || f.question.uz).toLowerCase();
        const answer = (f.answer[language] || f.answer.uz).toLowerCase();
        const matchSearch = !q || question.includes(q) || answer.includes(q);
        return matchCat && matchSearch;
      })
      .map((item) => ({
        id: item.id,
        question: item.question[language] || item.question.uz,
        answer: item.answer[language] || item.answer.uz,
      }));
  }, [category, search, language]);

  return (
    <div className="pt-28 pb-20 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-10">
        <div className="text-center space-y-3">
          <GlassSurface
            variant="tinted-pink"
            rounded="full"
            className="inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-bold text-[#9E3E60]"
          >
            <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t.faq.badge}</span>
          </GlassSurface>
          <h1 className="font-playfair text-4xl sm:text-5xl font-extrabold text-[#1E1418]">
            {t.faq.title}
          </h1>
          <p className="text-sm text-[#4A383F]">{t.faq.subtitle}</p>
        </div>

        {/* Search bar & Category segmented filter */}
        <GlassSurface variant="elevated" rounded="3xl" className="p-4 sm:p-5 space-y-3.5">
          <GlassInput
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.faq.searchPlaceholder}
            aria-label={t.faq.searchPlaceholder}
            leftIcon={<Search className="w-4 h-4" aria-hidden="true" />}
          />

          <div className="w-full overflow-x-auto pb-1 no-scrollbar">
            <GlassSegmented<FaqCategory>
              options={categoryOptions}
              value={category}
              onChange={(val) => setCategory(val)}
              ariaLabel={t.faq.cats.all}
              className="w-max"
            />
          </div>
        </GlassSurface>

        {/* Accordions */}
        {filteredFaq.length === 0 ? (
          <GlassSurface variant="subtle" rounded="2xl" className="text-center py-12 px-4 text-xs text-[#4A383F]">
            {t.faq.empty}
          </GlassSurface>
        ) : (
          <GlassAccordion items={filteredFaq} openId={openId} onToggle={setOpenId} />
        )}
      </div>
    </div>
  );
};
