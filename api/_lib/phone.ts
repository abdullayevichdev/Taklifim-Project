/**
 * Normalizes any international phone number into strict E.164 (+ followed by 8-15 digits).
 */
export function normalizePhoneE164(rawPhone?: string | number | null): string | null {
  if (rawPhone === undefined || rawPhone === null) return null;
  const digits = String(rawPhone).replace(/\D/g, '');
  if (!/^[1-9]\d{7,14}$/.test(digits)) {
    return null;
  }
  return `+${digits}`;
}

export function formatPhoneE164(rawPhone?: string | null): string {
  return normalizePhoneE164(rawPhone) || String(rawPhone || '').trim();
}

/**
 * Validates and normalizes Uzbek phone numbers server-side.
 */
export function cleanAndValidateUzPhone(rawPhone?: string): string | null {
  if (!rawPhone) return null;
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 9) {
    return `+998${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('998')) {
    return `+${digits}`;
  }
  return null;
}

export function formatUzPhoneForDisplay(cleanPhone: string): string {
  const e164 = normalizePhoneE164(cleanPhone);
  return e164 || cleanPhone;
}
