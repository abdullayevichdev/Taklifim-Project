import React from 'react';
import type { Language } from '../../types';
import { getWeddingPoem, POEM_SECTION_LABEL } from '../../data/weddingPoems';

interface SharedPoemProps {
  templateSlug?: string;
  language?: Language;
  primaryColor?: string;
  headingFont?: string;
  isDarkTheme?: boolean;
}

/** Template-specific wedding poem (uz / ru / en) shown on every invitation. */
export const SharedPoem: React.FC<SharedPoemProps> = ({
  templateSlug,
  language = 'uz',
  primaryColor = '#B48B47',
  headingFont,
  isDarkTheme = false,
}) => {
  const poem = getWeddingPoem(templateSlug, language);
  if (!poem) return null;

  const label = POEM_SECTION_LABEL[language] || POEM_SECTION_LABEL.uz;

  return (
    <section
      className={`taklifim-tpl-card rounded-3xl text-center space-y-5 shadow-md border ${
        isDarkTheme ? 'bg-white/5 border-white/10' : 'bg-white/90'
      }`}
      style={isDarkTheme ? undefined : { borderColor: `${primaryColor}33` }}
      aria-label={poem.title}
    >
      <div className="space-y-2">
        <span
          className="block text-[11px] font-bold uppercase tracking-[0.18em]"
          style={{ color: primaryColor }}
        >
          {label}
        </span>
        <h3
          className={`text-2xl sm:text-3xl font-bold leading-tight ${isDarkTheme ? 'text-white' : 'text-[#2A2420]'}`}
          style={{ fontFamily: headingFont || 'Cormorant Garamond' }}
        >
          {poem.title}
        </h3>
        <div className="flex items-center justify-center gap-3" aria-hidden="true">
          <span className="h-px w-12" style={{ background: `linear-gradient(to right, transparent, ${primaryColor})` }} />
          <span className="text-xs" style={{ color: primaryColor }}>❦</span>
          <span className="h-px w-12" style={{ background: `linear-gradient(to left, transparent, ${primaryColor})` }} />
        </div>
      </div>

      <div className="space-y-5 max-w-md mx-auto">
        {poem.stanzas.map((stanza, i) => (
          <p
            key={i}
            className={`italic text-[15px] sm:text-base leading-[1.75] break-words ${
              isDarkTheme ? 'text-white/85' : 'text-[#3E3430]'
            }`}
          >
            {stanza.map((line, j) => (
              <React.Fragment key={j}>
                {line}
                {j < stanza.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        ))}
      </div>

      <span className="block text-sm" style={{ color: primaryColor }} aria-hidden="true">
        ✦ ✦ ✦
      </span>
    </section>
  );
};

export default SharedPoem;
