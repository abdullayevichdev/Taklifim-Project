import { useEffect, useState } from 'react';
import { ref, onValue, get } from 'firebase/database';
import { rtdb } from './firebase';
import type { Template } from '../types';

/**
 * Public site settings editable from the admin panel (settings/public in RTDB).
 * Defaults are used until (or if) the database value is available.
 */
export interface SiteSettings {
  phone: string; // digits with country code, e.g. 998933223580
  ownerName: string;
  cardNumber: string; // digits only
  cardHolder: string;
  cardBank: string;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  phone: '998933223580',
  ownerName: 'Avazxanov Abdulhay',
  cardNumber: '5614682209202581',
  cardHolder: 'ABDULLA DEDAXANOV',
  cardBank: 'Uzcard / Humo',
};

export interface TemplateOverride {
  price?: number;
  hidden?: boolean;
  isPopular?: boolean;
  isNew?: boolean;
}

let current: SiteSettings = DEFAULT_SITE_SETTINGS;
let overrides: Record<string, TemplateOverride> = {};
const listeners = new Set<() => void>();
let started = false;

function clean(raw: any): SiteSettings {
  const str = (v: unknown, fallback: string, max = 80) =>
    typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : fallback;
  return {
    phone: str(raw?.phone, DEFAULT_SITE_SETTINGS.phone, 20).replace(/\D/g, '') || DEFAULT_SITE_SETTINGS.phone,
    ownerName: str(raw?.ownerName, DEFAULT_SITE_SETTINGS.ownerName),
    cardNumber: str(raw?.cardNumber, DEFAULT_SITE_SETTINGS.cardNumber, 24).replace(/\D/g, '') || DEFAULT_SITE_SETTINGS.cardNumber,
    cardHolder: str(raw?.cardHolder, DEFAULT_SITE_SETTINGS.cardHolder),
    cardBank: str(raw?.cardBank, DEFAULT_SITE_SETTINGS.cardBank),
  };
}

function start() {
  if (started || !rtdb) return;
  started = true;
  onValue(
    ref(rtdb, 'settings/public'),
    (snap) => {
      current = clean(snap.val());
      listeners.forEach((l) => l());
    },
    () => {}
  );
  onValue(
    ref(rtdb, 'templateOverrides'),
    (snap) => {
      overrides = (snap.val() as Record<string, TemplateOverride>) || {};
      listeners.forEach((l) => l());
    },
    () => {}
  );
}

export function getSiteSettings(): SiteSettings {
  start();
  return current;
}

/** Live site settings (updates instantly when the admin saves new values). */
export function useSiteSettings(): SiteSettings {
  const [, force] = useState(0);
  useEffect(() => {
    start();
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return current;
}

/** Applies admin price / visibility / badge overrides (keyed by template slug). */
export function applyTemplateOverrides(list: Template[]): Template[] {
  if (!overrides || Object.keys(overrides).length === 0) return list;
  return list.map((t) => {
    const o = overrides[t.slug] || overrides[t.id];
    if (!o) return t;
    return {
      ...t,
      ...(typeof o.price === 'number' && o.price > 0 ? { price: o.price } : {}),
      ...(typeof o.hidden === 'boolean' ? { hidden: o.hidden } : {}),
      ...(typeof o.isPopular === 'boolean' ? { isPopular: o.isPopular } : {}),
      ...(typeof o.isNew === 'boolean' ? { isNew: o.isNew } : {}),
    };
  });
}

/** One-shot load of template overrides (used before the first getTemplates call returns). */
export async function loadTemplateOverrides(): Promise<void> {
  start();
  if (!rtdb || Object.keys(overrides).length > 0) return;
  try {
    const snap = await Promise.race([
      get(ref(rtdb, 'templateOverrides')),
      new Promise<null>((r) => setTimeout(() => r(null), 2500)),
    ]);
    if (snap && (snap as any).exists?.()) overrides = (snap as any).val() || {};
  } catch {
    /* defaults */
  }
}

export const formatCardNumber = (digits: string) => digits.replace(/(\d{4})(?=\d)/g, '$1 ');
export const formatPhoneDisplay = (digits: string) => {
  const d = digits.replace(/\D/g, '');
  return d.length === 12 ? `+${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}` : `+${d}`;
};
