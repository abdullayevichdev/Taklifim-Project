import { Template, GuestRSVP, Language } from '../types';
import { translations, uz } from '../locales';

export interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPassed: boolean;
}

/**
 * Calculates remaining time until the target date/time
 */
export function calculateCountdown(targetDate?: string, targetTime?: string, now: Date = new Date()): CountdownResult {
  if (!targetDate) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPassed: true };
  }

  const timeStr = typeof targetTime === 'string' && targetTime.length >= 4 ? targetTime : '18:00';
  const targetStr = `${targetDate}T${timeStr.length === 5 ? timeStr : '18:00'}:00`;
  const targetTimeMs = new Date(targetStr).getTime();
  const nowMs = now.getTime();

  const diffMs = targetTimeMs - nowMs;

  if (diffMs <= 0 || isNaN(diffMs)) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isPassed: true,
    };
  }

  const seconds = Math.floor((diffMs / 1000) % 60);
  const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return {
    days,
    hours,
    minutes,
    seconds,
    isPassed: false,
  };
}

/**
 * Validates RSVP form fields
 */
export function validateRSVPForm(
  data: {
    fullName: string;
    attending: boolean;
    guestCount: number;
    phone?: string;
    isPhoneValid?: boolean;
  },
  language: Language = 'uz'
): { isValid: boolean; errors: Record<string, string> } {
  const v = translations[language]?.validation || uz.validation;
  const errors: Record<string, string> = {};

  if (!data.fullName || data.fullName.trim().length < 2) {
    errors.fullName = v.rsvpNameRequired;
  }

  if (data.phone && data.phone.trim()) {
    const rawDigits = data.phone.replace(/\D/g, '');
    if (rawDigits.length < 8 || data.isPhoneValid === false) {
      errors.phone = v.rsvpPhoneIncomplete;
    }
  }

  if (data.attending) {
    if (!data.guestCount || data.guestCount < 1) {
      errors.guestCount = v.rsvpMinGuests;
    } else if (data.guestCount > 10) {
      errors.guestCount = v.rsvpMaxGuests;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Formats monetary amounts in UZS according to UI language
 */
export function formatPriceUZS(amount: number, language: Language = 'uz'): string {
  const unit = translations[language]?.common.priceUzs || uz.common.priceUzs;
  if (amount === 0) return `0 ${unit}`;
  const formatted = amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formatted} ${unit}`;
}

/**
 * Filters and sorts template catalog items
 */
export function filterTemplates(
  templates: Template[],
  options: {
    category?: string;
    query?: string;
    sortBy?: 'popular' | 'newest' | 'price_asc' | 'price_desc';
    maxPrice?: number;
    freeOnly?: boolean;
  }
): Template[] {
  let result = [...templates];

  // Category filter
  if (options.category && options.category !== 'all') {
    result = result.filter((t) => t.category === options.category);
  }

  // Search query
  if (options.query && options.query.trim()) {
    const q = options.query.toLowerCase().trim();
    result = result.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.description?.uz && t.description.uz.toLowerCase().includes(q))
    );
  }

  // Max price filter
  if (options.maxPrice && options.maxPrice > 0) {
    result = result.filter((t) => t.price <= options.maxPrice!);
  }

  // Sorting
  if (options.sortBy) {
    switch (options.sortBy) {
      case 'popular':
        result.sort((a, b) => (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0));
        break;
      case 'newest':
        result.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
        break;
      case 'price_asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        result.sort((a, b) => b.price - a.price);
        break;
    }
  }

  return result;
}

/**
 * Calculates aggregated RSVP statistics
 */
export function calculateRSVPStats(rsvps: GuestRSVP[]) {
  const total = rsvps.length;
  const attendingList = rsvps.filter((r) => r.attending);
  const declinedList = rsvps.filter((r) => !r.attending);

  const attendingCount = attendingList.length;
  const declinedCount = declinedList.length;
  const totalGuests = attendingList.reduce((acc, curr) => acc + (curr.guestCount || 1), 0);

  const acceptanceRate = total > 0 ? Math.round((attendingCount / total) * 100) : 0;

  return {
    total,
    attendingCount,
    declinedCount,
    totalGuests,
    acceptanceRate,
  };
}
