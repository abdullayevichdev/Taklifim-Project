/**
 * Validates and normalizes Uzbek phone numbers.
 * Converts inputs like "+998 90 123 45 67", "901234567", "+998901234567"
 * into clean format "+998901234567" or returns null if invalid.
 */
export function cleanAndValidateUzPhone(rawPhone?: string): string | null {
  if (!rawPhone) return null;
  const digits = rawPhone.replace(/\D/g, '');
  
  // If user entered local 9-digit number starting with 9, 3, 5, 8, etc.
  if (digits.length === 9) {
    return `+998${digits}`;
  }
  
  // If user entered with 998 prefix (total 12 digits)
  if (digits.length === 12 && digits.startsWith('998')) {
    return `+${digits}`;
  }

  return null;
}

/**
 * Formats a clean "+998901234567" into readable "+998 90 123 45 67" for Telegram.
 */
export function formatUzPhoneForDisplay(cleanPhone: string): string {
  const match = cleanPhone.match(/^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/);
  if (!match) return cleanPhone;
  return `+998 ${match[1]} ${match[2]} ${match[3]} ${match[4]}`;
}
