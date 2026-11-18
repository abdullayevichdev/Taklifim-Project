import { Language } from '../types';
import { translations, uz } from '../locales';

/**
 * Taklifim To'lov Sozlamalari (Single Source of Truth)
 * Barcha karta va to'lov ma'lumotlari faqat shu faylda saqlanadi.
 */

export const PAYMENT_CONFIG = {
  // Karta raqami (proba bilan va probasiz)
  cardNumberRaw: '5614682209202581',
  cardNumberFormatted: '5614 6822 0920 2581',

  // Qabul qiluvchi
  cardHolder: 'ABDULLA DEDAXANOV',

  // Bank / Tizim
  cardBank: 'Uzcard / Humo',

  // Yo'riqnoma va Ogohlantirishlar (default UZ fallback)
  instructionText: uz.payment.instructionText,
  warningText: uz.payment.warningText,
};

export function getPaymentCopy(language: Language = 'uz') {
  return translations[language]?.payment || uz.payment;
}
