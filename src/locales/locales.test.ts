import { describe, it, expect } from 'vitest';
import {
  uz,
  ru,
  en,
  pluralizeRu,
  formatPersonCount,
  formatGuestCount,
  formatTemplateCount,
  formatItemCount,
  translateCategory,
  translateOrderStatus,
} from './index';
import { formatPriceUZS, validateRSVPForm } from '../utils/logic';

function collectStructureIssues(
  base: unknown,
  target: unknown,
  prefix = '',
  lang = ''
): string[] {
  const issues: string[] = [];

  if (typeof base === 'string') {
    if (typeof target !== 'string') {
      issues.push(`[${lang}] Expected string at "${prefix}", got ${typeof target}`);
    } else if (target.trim().length === 0) {
      issues.push(`[${lang}] Empty string at "${prefix}"`);
    }
    return issues;
  }

  if (Array.isArray(base)) {
    if (!Array.isArray(target)) {
      issues.push(`[${lang}] Expected array at "${prefix}"`);
      return issues;
    }
    if (target.length !== base.length) {
      issues.push(
        `[${lang}] Array length mismatch at "${prefix}": expected ${base.length}, got ${target.length}`
      );
    }
    for (let i = 0; i < Math.min(base.length, target.length); i++) {
      issues.push(...collectStructureIssues(base[i], target[i], `${prefix}[${i}]`, lang));
    }
    return issues;
  }

  if (base && typeof base === 'object') {
    if (!target || typeof target !== 'object' || Array.isArray(target)) {
      issues.push(`[${lang}] Expected object at "${prefix}"`);
      return issues;
    }
    const baseObj = base as Record<string, unknown>;
    const targetObj = target as Record<string, unknown>;

    for (const key of Object.keys(baseObj)) {
      const nextPath = prefix ? `${prefix}.${key}` : key;
      if (!(key in targetObj)) {
        issues.push(`[${lang}] Missing key "${nextPath}"`);
      } else {
        issues.push(...collectStructureIssues(baseObj[key], targetObj[key], nextPath, lang));
      }
    }

    for (const extraKey of Object.keys(targetObj)) {
      if (!(extraKey in baseObj)) {
        const nextPath = prefix ? `${prefix}.${extraKey}` : extraKey;
        issues.push(`[${lang}] Extra unexpected key "${nextPath}"`);
      }
    }
  }

  return issues;
}

describe('i18n locale parity & helpers', () => {
  it('keeps exact recursive key parity, array lengths, and non-empty strings across uz, ru, en', () => {
    const ruIssues = collectStructureIssues(uz, ru, '', 'ru');
    const enIssues = collectStructureIssues(uz, en, '', 'en');
    const uzSelfIssues = collectStructureIssues(uz, uz, '', 'uz');

    expect(uzSelfIssues).toEqual([]);
    expect(ruIssues).toEqual([]);
    expect(enIssues).toEqual([]);
  });

  it('pluralizes Russian nouns accurately including 11-19 and multi-digit endings', () => {
    const forms: [string, string, string] = ['гость', 'гостя', 'гостей'];
    expect(pluralizeRu(1, forms)).toBe('гость');
    expect(pluralizeRu(2, forms)).toBe('гостя');
    expect(pluralizeRu(4, forms)).toBe('гостя');
    expect(pluralizeRu(5, forms)).toBe('гостей');
    expect(pluralizeRu(11, forms)).toBe('гостей');
    expect(pluralizeRu(14, forms)).toBe('гостей');
    expect(pluralizeRu(21, forms)).toBe('гость');
    expect(pluralizeRu(22, forms)).toBe('гостя');
    expect(pluralizeRu(148, forms)).toBe('гостей');
  });

  it('formats person and guest attendance counts properly in uz, ru, and en', () => {
    expect(formatPersonCount(1, 'ru')).toBe('1 гость');
    expect(formatPersonCount(4, 'ru')).toBe('4 гостя');
    expect(formatPersonCount(11, 'ru')).toBe('11 гостей');
    expect(formatPersonCount(1, 'en')).toBe('1 guest');
    expect(formatPersonCount(5, 'en')).toBe('5 guests');
    expect(formatPersonCount(5, 'uz')).toBe('5 kishi');

    expect(formatGuestCount(1, 'ru')).toBe('1 гость придёт');
    expect(formatGuestCount(2, 'ru')).toBe('2 гостя придут');
    expect(formatGuestCount(14, 'ru')).toBe('14 гостей придут');
    expect(formatGuestCount(21, 'ru')).toBe('21 гость придёт');
    expect(formatGuestCount(148, 'ru')).toBe('148 гостей придут');
    expect(formatGuestCount(1, 'en')).toBe('1 guest attending');
    expect(formatGuestCount(148, 'en')).toBe('148 guests attending');
    expect(formatGuestCount(148, 'uz')).toBe('148 kishi qatnashadi');
  });

  it('formats template and item counts cleanly per language', () => {
    expect(formatTemplateCount(1, 'ru')).toBe('1 шаблон');
    expect(formatTemplateCount(3, 'ru')).toBe('3 шаблона');
    expect(formatTemplateCount(12, 'ru')).toBe('12 шаблонов');
    expect(formatTemplateCount(1, 'en')).toBe('1 template');
    expect(formatTemplateCount(3, 'en')).toBe('3 templates');
    expect(formatTemplateCount(3, 'uz')).toBe('3 ta shablon');

    expect(formatItemCount(5, 'ru')).toBe('5 шт.');
    expect(formatItemCount(5, 'en')).toBe('5');
    expect(formatItemCount(5, 'uz')).toBe('5 ta');
  });

  it('translates template categories and order statuses across uz, ru, and en', () => {
    expect(translateCategory('weddings', 'uz')).toBe(uz.categories.weddings);
    expect(translateCategory('weddings', 'ru')).toBe(ru.categories.weddings);
    expect(translateCategory('weddings', 'en')).toBe(en.categories.weddings);
    expect(translateCategory('beshik-toy', 'ru')).toBe(ru.categories.beshikToy);

    expect(translateOrderStatus('pending_review', 'uz')).toBe(uz.dashboard.orderStatus.pending_review);
    expect(translateOrderStatus('pending_review', 'ru')).toBe(ru.dashboard.orderStatus.pending_review);
    expect(translateOrderStatus('pending_review', 'en')).toBe(en.dashboard.orderStatus.pending_review);
    expect(translateOrderStatus('rejected', 'en')).toBe(en.dashboard.orderStatus.rejected);
  });

  it('formats UZS prices and validates RSVP forms in uz, ru, and en', () => {
    expect(formatPriceUZS(60000, 'uz')).toBe(`60 000 ${uz.common.priceUzs}`);
    expect(formatPriceUZS(60000, 'ru')).toBe(`60 000 ${ru.common.priceUzs}`);
    expect(formatPriceUZS(60000, 'en')).toBe(`60 000 ${en.common.priceUzs}`);

    const uzErr = validateRSVPForm({ fullName: '', attending: true, guestCount: 0, phone: '123' }, 'uz');
    const ruErr = validateRSVPForm({ fullName: '', attending: true, guestCount: 0, phone: '123' }, 'ru');
    const enErr = validateRSVPForm({ fullName: '', attending: true, guestCount: 0, phone: '123' }, 'en');

    expect(uzErr.isValid).toBe(false);
    expect(uzErr.errors.fullName).toBe(uz.validation.rsvpNameRequired);
    expect(ruErr.errors.fullName).toBe(ru.validation.rsvpNameRequired);
    expect(enErr.errors.fullName).toBe(en.validation.rsvpNameRequired);
    expect(ruErr.errors.phone).toBe(ru.validation.rsvpPhoneIncomplete);
    expect(enErr.errors.guestCount).toBe(en.validation.rsvpMinGuests);
  });
});
