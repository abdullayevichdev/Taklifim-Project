/**
 * Validates and normalizes Uzbek phone numbers on backend.
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
  const match = cleanPhone.match(/^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/);
  if (!match) return cleanPhone;
  return `+998 ${match[1]} ${match[2]} ${match[3]} ${match[4]}`;
}
