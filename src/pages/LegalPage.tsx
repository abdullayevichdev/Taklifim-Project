import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from '../context/RouterContext';
import { useLanguage } from '../locales';
import {
  GlassSurface,
  GlassSegmented,
  GlassSegmentedOption,
} from '../components/glass';

type LegalTab = 'privacy' | 'terms';

export const LegalPage: React.FC = () => {
  const { path, navigate } = useRouter();
  const { t } = useLanguage();
  const [tab, setTab] = useState<LegalTab>(path.includes('/terms') ? 'terms' : 'privacy');

  useEffect(() => {
    setTab(path.includes('/terms') ? 'terms' : 'privacy');
  }, [path]);

  const tabOptions: GlassSegmentedOption<LegalTab>[] = useMemo(
    () => [
      { value: 'privacy', label: t.legal.privacyTab },
      { value: 'terms', label: t.legal.termsTab },
    ],
    [t]
  );

  const sections = tab === 'privacy' ? t.legal.privacySections : t.legal.termsSections;

  return (
    <div className="pt-28 pb-20 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="font-playfair text-3xl sm:text-4xl font-extrabold text-[#1E1418]">
            {tab === 'privacy' ? t.legal.privacyTitle : t.legal.termsTitle}
          </h1>
          <p className="text-xs text-[#5C4F48]">{t.legal.lastUpdated}</p>
        </div>

        {/* Tab switch via GlassSegmented */}
        <div className="w-full overflow-x-auto pb-1 no-scrollbar flex justify-center">
          <GlassSegmented<LegalTab>
            options={tabOptions}
            value={tab}
            onChange={(val) => {
              setTab(val);
              navigate(val === 'terms' ? '/terms' : '/privacy');
            }}
            ariaLabel={`${t.legal.privacyTab} / ${t.legal.termsTab}`}
            className="taklifim-auth-seg w-max"
          />
        </div>

        {/* Content */}
        <GlassSurface
          variant="elevated"
          rounded="3xl"
          className="p-6 sm:p-10 text-xs sm:text-sm text-[#3A2D28] space-y-5 leading-relaxed"
        >
          {sections.map((section, idx) => (
            <React.Fragment key={idx}>
              <h2 className="font-playfair text-lg font-bold text-[#1E1418]">{section.title}</h2>
              <p>{section.body}</p>
            </React.Fragment>
          ))}
        </GlassSurface>
      </div>
    </div>
  );
};
