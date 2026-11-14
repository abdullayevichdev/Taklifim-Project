import React, { useEffect, useRef, useState } from 'react';
import { Eye, ArrowRight } from 'lucide-react';
import { Link } from '../context/RouterContext';
import { Template } from '../types';
import { useLanguage, translateCategory } from '../locales';
import { formatPriceUZS } from '../utils/logic';

interface TemplateCardProps {
  template: Template;
  priority?: boolean;
}

interface OverlayTheme {
  boxClass: string;
  eyebrowColor: string;
  headingColor: string;
  metaColor: string;
  dividerColor: string;
}

const DARK_CENTER_SLUGS = new Set(['template-19', 'template-20']);
const SATURATED_ROSE_SLUGS = new Set(['template-12']);
const BLUSH_CENTER_SLUGS = new Set(['template-6', 'template-7', 'template-8']);

const SAFE_DARK_ACCENTS: Record<string, string> = {
  'template-1': '#8C6726',
  'template-2': '#A5355D',
  'template-3': '#184738',
  'template-4': '#8B6520',
  'template-5': '#1A4331',
  'template-6': '#9B3057',
  'template-7': '#973A54',
  'template-8': '#7A2A43',
  'template-9': '#2E5A75',
  'template-10': '#9A4364',
  'template-11': '#3E4C5E',
  'template-12': '#7B4A31',
  'template-13': '#964452',
  'template-14': '#8B415A',
  'template-15': '#584880',
  'template-16': '#994732',
  'template-17': '#984C40',
  'template-18': '#963A56',
};

function getOverlayTheme(template: Template): OverlayTheme {
  if (DARK_CENTER_SLUGS.has(template.slug)) {
    return {
      boxClass: 'bg-[#0B1422]/52 border border-[#F3D998]/28 shadow-[0_8px_20px_rgba(0,0,0,0.28)]',
      eyebrowColor: '#F3D998',
      headingColor: '#FFFDF8',
      metaColor: 'rgba(255, 250, 240, 0.88)',
      dividerColor: 'rgba(243, 217, 152, 0.55)',
    };
  }

  if (SATURATED_ROSE_SLUGS.has(template.slug)) {
    return {
      boxClass: 'bg-[#FFFBF6]/92 border border-[#D4B896]/55 shadow-[0_8px_22px_rgba(44,27,20,0.12)]',
      eyebrowColor: '#7B4A31',
      headingColor: '#2C1B14',
      metaColor: '#4B3328',
      dividerColor: 'rgba(138, 93, 69, 0.45)',
    };
  }

  if (BLUSH_CENTER_SLUGS.has(template.slug)) {
    return {
      boxClass: 'bg-white/62 border border-white/80 shadow-[0_4px_16px_rgba(158,62,96,0.08)]',
      eyebrowColor: SAFE_DARK_ACCENTS[template.slug] || '#9E3E60',
      headingColor: '#25151C',
      metaColor: '#4A343D',
      dividerColor: 'rgba(158, 62, 96, 0.38)',
    };
  }

  return {
    boxClass: 'bg-white/54 border border-white/75',
    eyebrowColor: SAFE_DARK_ACCENTS[template.slug] || '#8E3856',
    headingColor: '#1E1418',
    metaColor: '#47363D',
    dividerColor: 'rgba(30, 20, 24, 0.22)',
  };
}

export const TemplateCard: React.FC<TemplateCardProps> = ({ template, priority = false }) => {
  const { t, language } = useLanguage();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      setIsLoaded(true);
    } else {
      setIsLoaded(false);
    }
  }, [template.previewImage]);

  const overlay = getOverlayTheme(template);
  const categoryLabel = translateCategory(template.category, language);
  const sampleMap = t.templatesSection.sampleTypeByCat as Record<string, string>;
  const sampleEventType = sampleMap[template.category] || categoryLabel;
  const description = template.description[language] || template.description.uz;

  return (
    <article className="glass-template-card overflow-hidden h-full flex flex-col group">
      {/* Preview Frame */}
      <div className="aspect-[4/5] w-full relative overflow-hidden rounded-t-[27px] shrink-0 bg-gradient-to-br from-[#FBF2F6] via-[#FDF9F5] to-[#EDF5FD]">
        {/* Glass Skeleton Shimmer while image loads */}
        {!isLoaded && !hasError && (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-br from-white/70 via-[#F8DCE6]/55 to-[#DCEEFF]/60 animate-pulse"
          />
        )}

        {hasError ? (
          <div
            aria-hidden="true"
            className="w-full h-full"
            style={{
              background: `linear-gradient(155deg, ${template.colorStyle.secondary} 0%, ${template.colorStyle.accent}55 100%)`,
            }}
          />
        ) : (
          <img
            ref={imgRef}
            src={template.previewImage}
            alt={template.name}
            width={480}
            height={600}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : undefined}
            decoding="async"
            referrerPolicy="no-referrer"
            onLoad={() => setIsLoaded(true)}
            onError={() => {
              setHasError(true);
              setIsLoaded(true);
            }}
            className={`w-full h-full object-cover object-center transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {/* Inner Typographic Sample Invitation Overlay */}
        <div
          aria-hidden="true"
          className="absolute inset-x-[15%] inset-y-[18%] flex items-center justify-center pointer-events-none select-none z-[3]"
        >
          <div className={`w-full rounded-2xl px-3 py-3 text-center ${overlay.boxClass}`}>
            <span
              className="block text-[8.5px] sm:text-[9px] font-extrabold uppercase tracking-[0.16em] truncate"
              style={{ color: overlay.eyebrowColor }}
            >
              {sampleEventType}
            </span>

            <p
              className="mt-1.5 text-[15px] sm:text-base font-bold leading-snug tracking-tight"
              style={{
                fontFamily: template.typography.headingFont,
                color: overlay.headingColor,
              }}
            >
              {t.hero.sampleGroomBride}
            </p>

            <div className="my-2 flex items-center justify-center gap-1.5">
              <span className="w-5 h-px" style={{ backgroundColor: overlay.dividerColor }} />
              <span
                className="w-1 h-1 rounded-full"
                style={{ backgroundColor: overlay.eyebrowColor }}
              />
              <span className="w-5 h-px" style={{ backgroundColor: overlay.dividerColor }} />
            </div>

            <p
              className="text-[9.5px] font-semibold tracking-wide"
              style={{ color: overlay.metaColor }}
            >
              {t.templatesSection.sampleDateShort}
            </p>
            <p
              className="text-[9.5px] font-medium truncate mt-0.5"
              style={{ color: overlay.metaColor }}
            >
              {t.templatesSection.sampleVenueShort}
            </p>
          </div>
        </div>

        {/* Top-Left Badges (Popular & New side-by-side cleanly) */}
        {(template.isPopular || template.isNew) && (
          <div className="absolute top-3 left-3 z-[4] flex flex-nowrap items-center gap-1.5 max-w-[calc(100%-90px)]">
            {template.isPopular && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide bg-gradient-to-br from-[#FFE5EF]/95 to-[#F9C6D9]/90 text-[#7A143A] border border-white/95 shadow-[0_4px_12px_-2px_rgba(198,72,115,0.22),inset_0_1px_0_rgba(255,255,255,1)] whitespace-nowrap">
                {t.templatesSection.popular}
              </span>
            )}
            {template.isNew && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide bg-gradient-to-br from-[#E2F3FF]/95 to-[#BFE3FD]/90 text-[#0B466E] border border-white/95 shadow-[0_4px_12px_-2px_rgba(59,136,195,0.22),inset_0_1px_0_rgba(255,255,255,1)] whitespace-nowrap">
                {t.templatesSection.newBadge}
              </span>
            )}
          </div>
        )}

        {/* Top-Right Quiet Sample Tag */}
        <div className="absolute top-3 right-3 z-[4]">
          <span className="px-2 py-0.5 rounded-full text-[9.5px] font-semibold bg-white/88 text-[#4A383F] border border-white/95 shadow-xs whitespace-nowrap">
            {t.templatesSection.exampleBadge}
          </span>
        </div>

        {/* Bottom-Right Liquid Glass Price Pill */}
        <div className="absolute bottom-3 right-3 z-[4]">
          <span className="glass-price-pill inline-flex items-center px-3 py-1 rounded-full text-[11px] font-extrabold tabular-nums tracking-tight whitespace-nowrap">
            {formatPriceUZS(template.price, language)}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex-1 flex flex-col p-4 xl:p-5 relative z-10">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase font-extrabold tracking-wider text-[#9E3E60] truncate">
            {categoryLabel}
          </span>
          <div className="flex items-center gap-1 shrink-0" aria-hidden="true">
            <span
              className="w-2.5 h-2.5 rounded-full border border-black/15"
              style={{ backgroundColor: template.colorStyle.primary }}
            />
            <span
              className="w-2.5 h-2.5 rounded-full border border-black/15"
              style={{ backgroundColor: template.colorStyle.accent }}
            />
          </div>
        </div>

        <h3
          title={template.name}
          className="font-playfair text-[17px] xl:text-lg font-bold text-[#1E1418] truncate mt-1"
        >
          {template.name}
        </h3>

        <p className="text-xs text-[#4A383F] line-clamp-2 min-h-[2.45rem] leading-[1.52] mt-1.5">
          {description}
        </p>

        {/* Uniform Bottom Action Row */}
        <div className="mt-auto pt-3.5 border-t border-[#1E1418]/8 grid grid-cols-2 gap-2">
          <Link
            to={`/templates/${template.slug}`}
            aria-label={`${t.templatesSection.shortPreview}: ${template.name}`}
            className="min-h-[44px] px-2.5 py-2 rounded-2xl text-xs font-bold text-[#1E1418] bg-white/75 hover:bg-white border border-white/95 shadow-[0_6px_16px_-6px_rgba(30,20,24,0.12),inset_0_1px_0_rgba(255,255,255,1)] transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C64873]"
          >
            <Eye className="w-3.5 h-3.5 text-[#2E6FA3] shrink-0" aria-hidden="true" />
            <span>{t.templatesSection.shortPreview}</span>
          </Link>

          <Link
            to={`/create/${template.slug}`}
            aria-label={`${t.templatesSection.selectShort}: ${template.name}`}
            className="min-h-[44px] px-2.5 py-2 rounded-2xl text-xs font-extrabold text-white bg-gradient-to-br from-[#D6517F] via-[#C64873] to-[#A7325B] hover:brightness-105 border border-white/60 shadow-[0_10px_22px_-8px_rgba(198,72,115,0.45),inset_0_1px_0_rgba(255,255,255,0.55)] transition-all flex items-center justify-center gap-1 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C64873]"
          >
            <span>{t.templatesSection.selectShort}</span>
            <ArrowRight className="w-3 h-3 shrink-0" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
};
