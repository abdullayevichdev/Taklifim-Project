import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage, formatItemCount } from '../locales';
import { mockTemplates } from '../data/mockTemplates';
import { api } from '../services/api';
import { filterTemplates, formatPriceUZS } from '../utils/logic';
import { EventCategory, Template } from '../types';
import { CustomDropdown } from '../components/CustomDropdown';
import { TemplateCard } from '../components/TemplateCard';
import {
  GlassSurface,
  GlassInput,
  GlassSegmented,
  GlassSlider,
  GlassButton,
  GlassSegmentedOption,
} from '../components/glass';
import {
  Search,
  ArrowUpDown,
  Sparkles,
  SlidersHorizontal,
  X,
} from 'lucide-react';

export const TemplatesPage: React.FC = () => {
  const { t, language } = useLanguage();

  const [templates, setTemplates] = useState<Template[]>(mockTemplates);
  const [category, setCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'price_asc' | 'price_desc'>('popular');
  const [maxPrice, setMaxPrice] = useState<number>(70000);
  const [showFiltersMobile, setShowFiltersMobile] = useState<boolean>(false);

  useEffect(() => {
    async function load() {
      const list = await api.getTemplates();
      setTemplates(list);
    }
    load();

    const unsub = api.subscribe<Template[]>('templates', (updated) => {
      setTemplates(updated);
    });
    return () => unsub();
  }, []);

  const categories: GlassSegmentedOption<EventCategory>[] = useMemo(
    () => [
      { value: 'all', label: t.categories.all },
      { value: 'weddings', label: t.categories.weddings },
      { value: 'engagements', label: t.categories.engagements },
      { value: 'traditional', label: t.categories.traditional },
      { value: 'birthdays', label: t.categories.birthdays },
      { value: 'baby_showers', label: t.categories.baby_showers },
      { value: 'anniversaries', label: t.categories.anniversaries },
    ],
    [t]
  );

  const filteredTemplates = useMemo(() => {
    return filterTemplates(templates, {
      category,
      query: searchQuery,
      sortBy,
      maxPrice,
    });
  }, [templates, category, searchQuery, sortBy, maxPrice]);

  const hasActiveFilters = category !== 'all' || Boolean(searchQuery) || maxPrice < 70000;

  const resetAllFilters = () => {
    setCategory('all');
    setSearchQuery('');
    setMaxPrice(70000);
  };

  return (
    <div className="pt-28 pb-20 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header Title */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <GlassSurface
            variant="tinted-pink"
            rounded="full"
            className="inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-bold text-[#9E3E60]"
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t.templatesPage.script}</span>
          </GlassSurface>
          <h1 className="font-playfair text-4xl sm:text-5xl font-extrabold text-[#1E1418] tracking-tight">
            {t.templatesPage.title}
          </h1>
          <p className="text-sm text-[#4A383F] leading-relaxed">{t.templatesPage.subtitle}</p>
        </div>

        {/* Search & Filter Bar (<lg-*> controls harmonized with 28px Liquid Glass geometry) */}
        <GlassSurface
          variant="elevated"
          className="rounded-[28px] p-4 sm:p-5 space-y-4"
        >
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="w-full md:w-96">
              <GlassInput
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.templatesPage.searchPlaceholder}
                aria-label={t.templatesPage.searchPlaceholder}
                leftIcon={<Search className="w-4 h-4" aria-hidden="true" />}
                rightElement={
                  searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="w-8 h-8 flex items-center justify-center rounded-full text-[#5C4F48] hover:text-[#1E1418] hover:bg-white/70 cursor-pointer"
                      aria-label={t.common.close}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : undefined
                }
              />
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
              <CustomDropdown
                value={sortBy}
                onChange={(val) => setSortBy(val as typeof sortBy)}
                icon={<ArrowUpDown className="w-3.5 h-3.5" />}
                buttonClassName="min-h-[44px] px-4"
                options={[
                  { value: 'popular', label: t.templatesPage.sortPopular },
                  { value: 'newest', label: t.templatesPage.sortNewest },
                  { value: 'price_asc', label: t.templatesPage.sortPriceAsc },
                  { value: 'price_desc', label: t.templatesPage.sortPriceDesc },
                ]}
              />

              <button
                type="button"
                aria-expanded={showFiltersMobile}
                onClick={() => setShowFiltersMobile(!showFiltersMobile)}
                className={`md:hidden flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  showFiltersMobile || maxPrice < 70000
                    ? 'bg-white text-[#C94F79] shadow-xs border border-white'
                    : 'glass-surface text-[#1E1418] hover:bg-white/90'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t.templatesPage.filtersTitle}</span>
              </button>
            </div>
          </div>

          {/* Category Filter via GlassSegmented (horizontally scrollable cleanly down to 320px) */}
          <div className="w-full overflow-x-auto pb-1 no-scrollbar">
            <GlassSegmented<EventCategory>
              options={categories}
              value={category as EventCategory}
              onChange={(val) => setCategory(val)}
              ariaLabel={t.templatesSection.allCategories}
              className="w-max"
            />
          </div>

          {/* Price Slider via GlassSlider: always visible on md+ desktop, toggleable on mobile */}
          <div
            className={`pt-4 border-t border-[#1E1418]/8 grid-cols-1 md:grid-cols-2 gap-4 items-center animate-fadeIn ${
              showFiltersMobile ? 'grid' : 'hidden md:grid'
            }`}
          >
            <GlassSlider
              min={50000}
              max={70000}
              step={5000}
              value={maxPrice}
              onChange={setMaxPrice}
              label={t.templatesPage.maxPriceLabel}
              valueDisplay={formatPriceUZS(maxPrice, language)}
            />

            <div className="flex items-center md:justify-end">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="min-h-[44px] px-4 rounded-full glass-surface text-xs font-bold text-[#9E3E60] hover:bg-white cursor-pointer transition-colors"
                >
                  {t.templatesPage.resetFilters}
                </button>
              )}
            </div>
          </div>
        </GlassSurface>

        {/* Results Count bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#5C4F48] px-2">
          <span>
            {t.templatesPage.foundCountLabel}:{' '}
            <strong className="text-[#1E1418] font-bold">
              {formatItemCount(filteredTemplates.length, language)}
            </strong>
          </span>
          <span className="text-[11px]">{t.templatesPage.responsiveHint}</span>
        </div>

        {/* Templates Grid or Liquid Glass Empty State over pastel mesh */}
        <div className="taklifim-section-mesh">
          {filteredTemplates.length === 0 ? (
            <div className="glass-template-card p-10 sm:p-12 text-center max-w-md mx-auto space-y-4 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FFE5EF] to-[#E2F3FF] border border-white mx-auto flex items-center justify-center text-[#9E3E60] shadow-xs">
                <Search className="w-6 h-6" aria-hidden="true" />
              </div>
              <h3 className="font-playfair text-xl font-bold text-[#1E1418]">
                {t.templatesPage.emptyTitle}
              </h3>
              <p className="text-xs text-[#4A383F] leading-relaxed">
                {t.templatesPage.emptyDesc}
              </p>
              <div className="pt-1 flex justify-center">
                <GlassButton tone="tinted" size="md" onClick={resetAllFilters}>
                  {t.templatesPage.showAllBtn}
                </GlassButton>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 auto-rows-fr gap-5 lg:gap-6 items-stretch relative z-10">
              {filteredTemplates.map((template, idx) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  priority={idx < 4}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
