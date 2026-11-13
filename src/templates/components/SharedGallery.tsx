import React, { useState } from 'react';
import { Language } from '../../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { translations } from '../../locales';

interface SharedGalleryProps {
  images: string[];
  title?: string;
  language?: Language;
  primaryColor?: string;
  isDarkTheme?: boolean;
  headingFont?: string;
}

export const SharedGallery: React.FC<SharedGalleryProps> = ({
  images,
  title,
  language = 'uz',
  primaryColor = '#B48B47',
  isDarkTheme = false,
  headingFont = 'Playfair Display',
}) => {
  const [activeIdx, setActiveIdx] = useState(0);

  if (!images || images.length === 0) return null;

  const t = translations[language] || translations.uz;
  const labels = {
    uz: { defaultTitle: 'Bizning baxtli lahzalarimiz', photos: 'Suratlar' },
    ru: { defaultTitle: 'Наши счастливые моменты', photos: 'Фотографии' },
    en: { defaultTitle: 'Moments of Love & Joy', photos: 'Gallery' },
  }[language] || { defaultTitle: 'Bizning baxtli lahzalarimiz', photos: 'Suratlar' };

  return (
    <div className="space-y-4 text-center">
      <div>
        <span className="text-[11px] uppercase tracking-widest font-bold" style={{ color: primaryColor }}>
          {labels.photos}
        </span>
        <h3 className={`text-xl sm:text-2xl font-bold mt-1 ${isDarkTheme ? 'text-white' : 'text-[#231E1B]'}`} style={{ fontFamily: headingFont }}>
          {title || labels.defaultTitle}
        </h3>
      </div>

      <div className="relative max-w-lg mx-auto rounded-3xl overflow-hidden shadow-xl aspect-4/3 border-2 border-white/40 group">
        <img
          src={images[activeIdx]}
          alt="Gallery"
          className="w-full h-full object-cover transition-all duration-500"
        />

        {images.length > 1 && (
          <>
            <button
              onClick={() => setActiveIdx((p) => (p > 0 ? p - 1 : images.length - 1))}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-md opacity-80 hover:opacity-100 transition-opacity"
              aria-label={t.shared.prevPhotoAria}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveIdx((p) => (p < images.length - 1 ? p + 1 : 0))}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-md opacity-80 hover:opacity-100 transition-opacity"
              aria-label={t.shared.nextPhotoAria}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md">
              {images.map((img, i) => (
                <button
                  key={`dot-${img?.slice(-10) || 'img'}-${i}`}
                  onClick={() => setActiveIdx(i)}
                  className={`w-2 h-2 rounded-full transition-all ${activeIdx === i ? 'w-4 bg-white' : 'bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex items-center justify-center gap-2 overflow-x-auto py-2 no-scrollbar">
          {images.map((img, i) => (
            <button
              key={`thumb-${img?.slice(-10) || 'img'}-${i}`}
              onClick={() => setActiveIdx(i)}
              className={`w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                activeIdx === i ? 'ring-2 ring-offset-2 scale-105' : 'opacity-60 hover:opacity-100'
              }`}
              style={{
                borderColor: activeIdx === i ? primaryColor : 'transparent',
              }}
            >
              <img src={img} alt={`Thumb ${i}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
