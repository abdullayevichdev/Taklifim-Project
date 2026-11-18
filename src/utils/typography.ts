export const CORMORANT_FONT_STACK =
  '"Cormorant Garamond", "CormorantFallback", "Times New Roman", Georgia, serif';

export function resolveCormorantFont(_legacyOrCustomFont?: string | null): string {
  return CORMORANT_FONT_STACK;
}

export function isItalicFontPreference(font?: string | null): boolean {
  if (!font) return false;
  const lower = font.toLowerCase();
  return (
    lower.includes('italic') ||
    lower.includes('great vibes') ||
    lower.includes('script')
  );
}
