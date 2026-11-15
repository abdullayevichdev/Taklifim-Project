import { Template, GuestRSVP, Language } from '../types';
import { translations, uz } from '../locales';
import { parseHostNames, generateInvitationSlug } from './slug';

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
        (t.description?.uz && t.description.uz.toLowerCase().includes(q)) ||
        (t.description?.ru && t.description.ru.toLowerCase().includes(q)) ||
        (t.description?.en && t.description.en.toLowerCase().includes(q))
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

/**
 * Normalizes 12h or 24h time strings (e.g. "6:00 PM", "6:00PM", "9:5", "18:00")
 * into canonical 24-hour "HH:MM" format.
 */
export function normalizeTime24h(rawTime?: string, fallback = '18:00'): string {
  if (!rawTime || typeof rawTime !== 'string') return fallback;
  const trimmed = rawTime.trim();
  if (!trimmed) return fallback;

  const amPmMatch = trimmed.match(/^(\d{1,2}):(\d{1,2})\s*(am|pm)$/i);
  if (amPmMatch) {
    let hours = parseInt(amPmMatch[1], 10);
    const minutes = parseInt(amPmMatch[2], 10);
    const period = amPmMatch[3].toLowerCase();
    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return fallback;
    if (period === 'pm' && hours !== 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  const hhmmMatch = trimmed.match(/^(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/);
  if (hhmmMatch) {
    const hours = parseInt(hhmmMatch[1], 10);
    const minutes = parseInt(hhmmMatch[2], 10);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return fallback;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  return fallback;
}

/**
 * Returns sorted 24-hour "HH:MM" time options in 15-minute increments,
 * ensuring any existing normalized time value is also present in the list.
 */
export function get24hTimeSlots(currentValue?: string): string[] {
  const slots = new Set<string>();
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      slots.add(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  const normalized = currentValue ? normalizeTime24h(currentValue, '') : '';
  if (normalized) {
    slots.add(normalized);
  }
  return Array.from(slots).sort();
}

const UZ_MONTHS_LOWER = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr',
];

const UZ_WEEKDAYS_LOWER = [
  'yakshanba',
  'dushanba',
  'seshanba',
  'chorshanba',
  'payshanba',
  'juma',
  'shanba',
];

/**
 * Formats an ISO date ("YYYY-MM-DD") into a human-readable localized date with weekday.
 * Examples:
 * - uz: "24 sentabr 2026, payshanba"
 * - ru: "24 сентября 2026, четверг"
 * - en: "24 September 2026, Thursday"
 */
export function formatLocalizedFullDate(isoDate?: string, language: Language = 'uz'): string {
  if (!isoDate || typeof isoDate !== 'string') return '';
  const match = isoDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return isoDate;

  const year = parseInt(match[1], 10);
  const monthIdx = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  const dateObj = new Date(year, monthIdx, day, 12, 0, 0);

  if (isNaN(dateObj.getTime()) || monthIdx < 0 || monthIdx > 11 || day < 1 || day > 31) {
    return isoDate;
  }

  if (language === 'uz') {
    const monthName = UZ_MONTHS_LOWER[monthIdx] || '';
    const weekdayName = UZ_WEEKDAYS_LOWER[dateObj.getDay()] || '';
    return `${day} ${monthName} ${year}, ${weekdayName}`;
  }

  const localeTag = language === 'ru' ? 'ru-RU' : 'en-GB';
  try {
    if (language === 'ru') {
      const datePart = new Intl.DateTimeFormat(localeTag, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
        .format(dateObj)
        .replace(/\s*г\.?$/i, '')
        .trim();
      const weekdayPart = new Intl.DateTimeFormat(localeTag, { weekday: 'long' })
        .format(dateObj)
        .toLowerCase();
      return `${datePart}, ${weekdayPart}`;
    }

    const datePart = new Intl.DateTimeFormat(localeTag, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(dateObj);
    const weekdayPart = new Intl.DateTimeFormat(localeTag, { weekday: 'long' }).format(dateObj);
    return `${datePart}, ${weekdayPart}`;
  } catch {
    return isoDate;
  }
}

/**
 * Derives an updated eventTitle from hostNames when the user hasn't customized eventTitle.
 */
export function deriveEventTitleFromHosts(
  newHostNames: string,
  prevHostNames: string,
  currentTitle: string
): { nextTitle: string; wasAutoDerived: boolean } {
  const trimmedHosts = newHostNames.trim();
  const prevTrimmed = prevHostNames.trim();
  const defaultSuffix = 'Nikoh To‘yi';
  const defaultFullTitle = `${prevTrimmed} ${defaultSuffix}`.trim();

  const isDefaultOrSynced =
    !currentTitle.trim() ||
    currentTitle.trim() === defaultSuffix ||
    currentTitle.trim() === 'Asrorbek & Madina Nikoh To‘yi' ||
    (prevTrimmed.length > 0 &&
      (currentTitle.trim() === prevTrimmed || currentTitle.trim() === defaultFullTitle));

  if (!isDefaultOrSynced) {
    return { nextTitle: currentTitle, wasAutoDerived: false };
  }

  if (!trimmedHosts) {
    return { nextTitle: defaultSuffix, wasAutoDerived: true };
  }

  return {
    nextTitle: `${trimmedHosts} ${defaultSuffix}`,
    wasAutoDerived: true,
  };
}

export interface BuilderDraftFields {
  status?: string;
  slug?: string;
  hostNames?: string;
  eventTitle?: string;
  partner1Name?: string;
  partner2Name?: string;
}

/**
 * Repairs stale saved drafts where hostNames was edited away from the demo default
 * ("Asrorbek & Madina") in an older build while eventTitle/partner/slug remained stuck.
 */
export function healStaleBuilderDraft<T extends BuilderDraftFields>(draft: T): T {
  const hosts = typeof draft.hostNames === 'string' ? draft.hostNames.trim() : '';
  if (!hosts || hosts === 'Asrorbek & Madina') {
    return draft;
  }

  const next = { ...draft };
  const { groom, bride } = parseHostNames(hosts);

  if (!next.eventTitle?.trim() || next.eventTitle.trim() === 'Asrorbek & Madina Nikoh To‘yi') {
    next.eventTitle = `${hosts} Nikoh To‘yi`;
  }

  if (!next.partner1Name?.trim() || next.partner1Name.trim() === 'Asrorbek') {
    next.partner1Name = groom;
    next.partner2Name = bride;
  }

  if (
    (!next.status || next.status === 'draft') &&
    typeof next.slug === 'string' &&
    next.slug.toLowerCase().startsWith('asrorbek-')
  ) {
    const tailMatch = next.slug.match(/-(\d{4})$/);
    next.slug = generateInvitationSlug(groom, bride, tailMatch?.[1]);
  }

  return next;
}

/**
 * Middle-truncates long filenames while preserving the extension,
 * e.g. "file_000000008a9882109d0d73368c0a7c3a.jpg" -> "file_0000…c3a.jpg"
 */
export function truncateFilenameMiddle(filename: string, maxLength = 24): string {
  if (!filename) return '';
  if (filename.length <= maxLength) return filename;

  const lastDot = filename.lastIndexOf('.');
  const hasExt = lastDot > 0 && filename.length - lastDot <= 6;
  const ext = hasExt ? filename.slice(lastDot) : '';
  const base = hasExt ? filename.slice(0, lastDot) : filename;

  const available = maxLength - ext.length - 1; // 1 for ellipsis "…"
  if (available <= 4) {
    return `${base.slice(0, Math.max(2, maxLength - ext.length - 1))}…${ext}`;
  }

  const startChars = Math.max(4, Math.ceil(available * 0.65));
  const endChars = Math.max(2, available - startChars);
  return `${base.slice(0, startChars)}…${base.slice(-endChars)}${ext}`;
}

/**
 * Formats byte size cleanly in localized B / KB / MB units.
 */
export function formatFileSize(bytes?: number, language: Language = 'uz'): string {
  if (!bytes || bytes <= 0 || !Number.isFinite(bytes)) return '';
  const unitMB = language === 'ru' ? 'МБ' : 'MB';
  const unitKB = language === 'ru' ? 'КБ' : 'KB';
  const unitB = language === 'ru' ? 'Б' : 'B';

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} ${unitMB}`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} ${unitKB}`;
  }
  return `${bytes} ${unitB}`;
}

