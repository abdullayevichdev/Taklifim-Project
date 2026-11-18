import React, { createContext, useContext, useState } from 'react';
import { Language } from '../types';
import { uz } from './uz';
import { ru } from './ru';
import { en } from './en';

const translations = { uz, ru, en };

export function getStoredLanguage(): Language {
  try {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('taklifim_language') : null;
    if (saved === 'uz' || saved === 'ru' || saved === 'en') {
      return saved;
    }
  } catch {
    // ignore storage errors
  }
  return 'uz';
}

export function pluralizeRu(count: number, forms: [string, string, string]): string {
  const abs = Math.abs(count);
  const mod100 = abs % 100;
  const mod10 = abs % 10;
  if (mod100 >= 11 && mod100 <= 19) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

export function formatPersonCount(count: number, language: Language): string {
  if (language === 'ru') {
    return `${count} ${pluralizeRu(count, ['гость', 'гостя', 'гостей'])}`;
  }
  if (language === 'en') {
    return `${count} ${count === 1 ? 'guest' : 'guests'}`;
  }
  return `${count} kishi`;
}

export function formatGuestCount(count: number, language: Language): string {
  if (language === 'ru') {
    const guestWord = pluralizeRu(count, ['гость', 'гостя', 'гостей']);
    const verb = pluralizeRu(count, ['придёт', 'придут', 'придут']);
    return `${count} ${guestWord} ${verb}`;
  }
  if (language === 'en') {
    return `${count} ${count === 1 ? 'guest' : 'guests'} attending`;
  }
  return `${count} kishi qatnashadi`;
}

export function formatTemplateCount(count: number, language: Language): string {
  if (language === 'ru') {
    return `${count} ${pluralizeRu(count, ['шаблон', 'шаблона', 'шаблонов'])}`;
  }
  if (language === 'en') {
    return `${count} ${count === 1 ? 'template' : 'templates'}`;
  }
  return `${count} ta shablon`;
}

export function formatItemCount(count: number, language: Language): string {
  if (language === 'ru') {
    return `${count} шт.`;
  }
  if (language === 'en') {
    return `${count}`;
  }
  return `${count} ta`;
}

export function translateCategory(category: string, language: Language): string {
  const dict = translations[language]?.categories || uz.categories;
  const map: Record<string, string> = {
    all: dict.all,
    weddings: dict.weddings,
    engagements: dict.engagements,
    traditional: dict.traditional,
    birthdays: dict.birthdays,
    baby_showers: dict.baby_showers,
    anniversaries: dict.anniversaries,
    beshikToy: dict.beshikToy,
    'beshik-toy': dict.beshikToy,
    sunnatToy: dict.sunnatToy,
    'sunnat-toy': dict.sunnatToy,
    jubilee: dict.jubilee,
    vip: dict.vip,
  };
  return map[category] || category;
}

export function translateOrderStatus(status: string, language: Language): string {
  const dict = translations[language]?.dashboard.orderStatus || uz.dashboard.orderStatus;
  if (status === 'paid') return dict.paid;
  if (status === 'confirmed') return dict.confirmed;
  if (status === 'demo') return dict.demo;
  if (status === 'pending_review') return dict.pending_review;
  if (status === 'rejected') return dict.rejected;
  return dict.pending;
}

if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
  const collectIssues = (base: unknown, target: unknown, prefix = '', langLabel = ''): string[] => {
    const issues: string[] = [];
    if (typeof base === 'string') {
      if (typeof target !== 'string') {
        issues.push(`[i18n:${langLabel}] Missing string at "${prefix}"`);
      }
      return issues;
    }
    if (Array.isArray(base)) {
      if (!Array.isArray(target) || target.length !== base.length) {
        issues.push(`[i18n:${langLabel}] Array length mismatch at "${prefix}"`);
      }
      return issues;
    }
    if (base && typeof base === 'object') {
      const baseRec = base as Record<string, unknown>;
      const targetRec = (target && typeof target === 'object' ? target : {}) as Record<string, unknown>;
      for (const key of Object.keys(baseRec)) {
        const nextPath = prefix ? `${prefix}.${key}` : key;
        if (!(key in targetRec)) {
          issues.push(`[i18n:${langLabel}] Missing key "${nextPath}"`);
        } else {
          issues.push(...collectIssues(baseRec[key], targetRec[key], nextPath, langLabel));
        }
      }
    }
    return issues;
  };

  for (const lang of ['ru', 'en'] as const) {
    const issues = collectIssues(uz, translations[lang], '', lang);
    if (issues.length > 0) {
      console.warn(issues.join('\n'));
    }
  }
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof uz;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'uz',
  setLanguage: () => {},
  t: uz,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => getStoredLanguage());

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('taklifim_language', lang);
    } catch {
      // ignore
    }
  };

  const t = translations[language] || uz;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
export { uz, ru, en, translations };
