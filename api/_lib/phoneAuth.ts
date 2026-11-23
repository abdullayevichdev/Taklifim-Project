import crypto from 'node:crypto';

/**
 * Phone + 4-digit PIN accounts (the "Apple orqali kirish" flow).
 * The phone number is the account key; the PIN protects it from anyone who merely knows the number.
 */
export const PHONE_UID_PREFIX = 'ph_';
export const MAX_FAILED_PINS = 5;
export const PIN_LOCK_MS = 15 * 60 * 1000;

/** +998XXXXXXXXX → "998XXXXXXXXX" (digits only), or null when not a valid Uzbek mobile number. */
export function normalizeUzPhoneDigits(raw: unknown): string | null {
  const digits = String(raw ?? '').replace(/\D/g, '');
  const full = digits.length === 9 ? `998${digits}` : digits;
  return /^998\d{9}$/.test(full) ? full : null;
}

export const phoneUid = (digits: string) => `${PHONE_UID_PREFIX}${digits}`;

export function phoneFromUid(uid: string): string | null {
  const m = /^ph_(998\d{9})$/.exec(uid || '');
  return m ? m[1] : null;
}

/** Person names: 2–40 letters (any alphabet), spaces, apostrophes and hyphens. */
export function cleanPersonName(raw: unknown): string | null {
  const v = String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (v.length < 2 || v.length > 40) return null;
  if (!/^[\p{L}][\p{L}\s'‘’ʻʼ`-]*$/u.test(v)) return null;
  return v;
}

export function cleanOptionalEmail(raw: unknown): string | null | undefined {
  const v = String(raw ?? '').trim().toLowerCase();
  if (!v) return undefined;
  if (v.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return null;
  return v;
}

/** 4 digits, rejecting the most guessable codes. */
export function validatePin(raw: unknown): { ok: true; pin: string } | { ok: false; error: string } {
  const pin = String(raw ?? '').trim();
  if (!/^\d{4}$/.test(pin)) return { ok: false, error: 'PIN 4 ta raqamdan iborat bo‘lishi kerak.' };
  if (/^(\d)\1{3}$/.test(pin) || ['1234', '4321', '0123', '1212', '2580'].includes(pin)) {
    return { ok: false, error: 'Bu PIN juda oson. Boshqa 4 ta raqam tanlang.' };
  }
  return { ok: true, pin };
}

export function hashPin(pin: string, salt = crypto.randomBytes(16)): string {
  const hash = crypto.scryptSync(pin, salt, 32, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [scheme, saltB64, hashB64] = String(stored || '').split('$');
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = crypto.scryptSync(pin, Buffer.from(saltB64, 'base64'), expected.length, { N: 16384, r: 8, p: 1 });
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

/** Random PIN for admin resets (never a "weak" one). */
export function generatePin(): string {
  for (;;) {
    const pin = String(crypto.randomInt(0, 10000)).padStart(4, '0');
    if (validatePin(pin).ok) return pin;
  }
}

export const formatUzPhone = (digits: string) =>
  `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
