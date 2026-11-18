/**
 * Slug generator and transliteration utility for Taklifim invitations.
 */

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  ғ: 'g',
  қ: 'q',
  ҳ: 'h',
  ў: 'o',
};

const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'create',
  'templates',
  'dashboard',
  'login',
  'register',
  'i',
  'faq',
  'pricing',
  'contact',
  'my-invitations',
  'privacy',
  'terms',
]);

/**
 * Clean and transliterate a name string into a sanitized Latin slug part.
 */
export function cleanNameForSlug(nameStr: string): string {
  if (!nameStr) return '';

  let str = nameStr.toLowerCase().trim();

  // Normalize Uzbek special characters (o', g', etc.)
  str = str
    .replace(/o[‘'ʻ`’]/g, 'o')
    .replace(/g[‘'ʻ`’]/g, 'g')
    .replace(/[‘'ʻ`’ʼ]/g, '');

  // Transliterate Cyrillic to Latin character by character
  let transliterated = '';
  for (const char of str) {
    if (CYRILLIC_TO_LATIN[char] !== undefined) {
      transliterated += CYRILLIC_TO_LATIN[char];
    } else {
      transliterated += char;
    }
  }

  // Replace invalid characters with hyphens
  let slugPart = transliterated
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slugPart;
}

/**
 * Parse host names string (e.g. "Asrorbek & Madina", "Asrorbek va Madina", "Шохрух + Дилноза")
 * into groom and bride names if separate parameters are not provided.
 */
export function parseHostNames(hostNames?: string, partner1?: string, partner2?: string): { groom: string; bride: string } {
  let groom = partner1 ? partner1.trim() : '';
  let bride = partner2 ? partner2.trim() : '';

  if ((!groom || !bride) && hostNames) {
    const parts = hostNames.split(/&|\+|\bva\b|\bи\b|\band\b/i);
    if (parts.length >= 2) {
      if (!groom) groom = parts[0].trim();
      if (!bride) bride = parts[1].trim();
    } else if (!groom && !bride) {
      groom = hostNames.trim();
    }
  }

  return { groom, bride };
}

/**
 * Generate a 4-digit random number string
 */
export function generate4DigitCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Main invitation slug generation function.
 * Format: {groom}-{bride}-{code} or {groom}-{code} or taklifnoma-{code}
 */
export function generateInvitationSlug(
  groomName?: string,
  brideName?: string,
  customCode?: string
): string {
  const code = customCode && customCode.trim() ? customCode.trim() : generate4DigitCode();

  const cleanGroom = cleanNameForSlug(groomName || '');
  const cleanBride = cleanNameForSlug(brideName || '');

  let basePart = '';
  if (cleanGroom && cleanBride) {
    basePart = `${cleanGroom}-${cleanBride}`;
  } else if (cleanGroom) {
    basePart = cleanGroom;
  } else if (cleanBride) {
    basePart = cleanBride;
  } else {
    basePart = 'taklifnoma';
  }

  // Max total length 50 chars (including code suffix)
  const maxBaseLen = 50 - (code.length + 1); // e.g. 50 - 5 = 45
  if (basePart.length > maxBaseLen) {
    basePart = basePart.slice(0, maxBaseLen).replace(/-+$/, '');
  }

  let finalSlug = `${basePart}-${code}`.toLowerCase();

  // If slug starts with or matches a reserved word, prefix with 't-'
  if (RESERVED_SLUGS.has(finalSlug) || RESERVED_SLUGS.has(basePart)) {
    finalSlug = `t-${finalSlug}`;
  }

  return finalSlug;
}
