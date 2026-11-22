import { Language } from '../types';
import { translations, uz } from '../locales';
import { getSiteSettings, formatCardNumber } from '../services/siteSettings';

/**
 * TASHRIFIM To'lov Sozlamalari (Single Source of Truth)
 * Barcha karta va to'lov ma'lumotlari faqat shu faylda saqlanadi.
 */

/** Card details come from the admin-editable site settings (live), with safe defaults. */
export const PAYMENT_CONFIG = {
  get cardNumberRaw(): string {
    return getSiteSettings().cardNumber;
  },
  get cardNumberFormatted(): string {
    return formatCardNumber(getSiteSettings().cardNumber);
  },
  get cardHolder(): string {
    return getSiteSettings().cardHolder;
  },
  get cardBank(): string {
    return getSiteSettings().cardBank;
  },
  instructionText: uz.payment.instructionText,
  warningText: uz.payment.warningText,
};

export function getPaymentCopy(language: Language = 'uz') {
  return translations[language]?.payment || uz.payment;
}
