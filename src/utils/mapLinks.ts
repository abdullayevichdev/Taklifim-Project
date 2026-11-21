/**
 * Keyless Yandex Maps / Google Maps helpers.
 * Uses only the official embed widgets and public deep links, so no API key is required.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export type MapProvider = 'yandex' | 'google';

const round = (n: number) => Math.round(n * 1e6) / 1e6;

export function isValidLatLng(lat?: number | null, lng?: number | null): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

const yandexLang = (lang?: string) => (lang === 'ru' ? 'ru_RU' : lang === 'en' ? 'en_US' : 'uz_UZ');

/** Official Yandex "map-widget" iframe with a red pin at the venue. */
export function yandexEmbedUrl(point: LatLng | null, query = '', lang?: string, zoom = 16): string {
  const base = 'https://yandex.uz/map-widget/v1/';
  if (point) {
    const ll = `${round(point.lng)},${round(point.lat)}`;
    return `${base}?ll=${ll}&z=${zoom}&pt=${ll},pm2rdl&lang=${yandexLang(lang)}`;
  }
  return `${base}?text=${encodeURIComponent(query)}&z=${zoom}&lang=${yandexLang(lang)}`;
}

/** Google Maps embed (output=embed works without an API key). */
export function googleEmbedUrl(point: LatLng | null, query = '', lang?: string, zoom = 16): string {
  const q = point ? `${round(point.lat)},${round(point.lng)}` : query;
  const hl = lang === 'ru' ? 'ru' : lang === 'en' ? 'en' : 'uz';
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=${zoom}&hl=${hl}&output=embed`;
}

/** Opens Yandex Maps / Yandex Go with a route to the venue. */
export function yandexRouteUrl(point: LatLng | null, query = ''): string {
  if (point) return `https://yandex.uz/maps/?rtext=~${round(point.lat)}%2C${round(point.lng)}&rtt=auto`;
  return `https://yandex.uz/maps/?text=${encodeURIComponent(query)}`;
}

/** Opens Google Maps navigation to the venue. */
export function googleRouteUrl(point: LatLng | null, query = ''): string {
  const dest = point ? `${round(point.lat)},${round(point.lng)}` : query;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
}

/** Public "view on map" link (stored as invitation.mapUrl). */
export function yandexPlaceUrl(point: LatLng): string {
  const ll = `${round(point.lng)},${round(point.lat)}`;
  return `https://yandex.uz/maps/?ll=${ll}&z=17&pt=${ll},pm2rdl`;
}

function pair(a: string, b: string, order: 'latlng' | 'lnglat'): LatLng | null {
  const x = parseFloat(a);
  const y = parseFloat(b);
  const lat = order === 'latlng' ? x : y;
  const lng = order === 'latlng' ? y : x;
  return isValidLatLng(lat, lng) ? { lat: round(lat), lng: round(lng) } : null;
}

const NUM = '(-?\\d{1,3}(?:\\.\\d+)?)';

/**
 * Extracts coordinates from a full Yandex / Google Maps URL or a plain "lat, lng" text.
 * Returns null for short links (they need server-side resolving) or unknown formats.
 */
export function parseCoordsFromText(raw: string): LatLng | null {
  const text = (raw || '').trim();
  if (!text) return null;

  let decoded = text;
  try {
    decoded = decodeURIComponent(text);
  } catch {
    /* keep raw */
  }

  // Plain coordinates: "41.311, 69.279"
  const plain = decoded.match(new RegExp(`^${NUM}\\s*[,; ]\\s*${NUM}$`));
  if (plain) return pair(plain[1], plain[2], 'latlng');

  const isYandex = /yandex\.|ya\.ru/i.test(decoded);
  const isGoogle = /google\.|goo\.gl/i.test(decoded);

  if (isYandex) {
    // Yandex uses lng,lat order in ll= / pt= / whatppoint
    for (const key of ['pt', 'whatshere%5Bpoint%5D', 'whatshere[point]', 'll']) {
      const m = decoded.match(new RegExp(`[?&]${key.replace(/[[\]]/g, '\\$&')}=${NUM},${NUM}`));
      if (m) return pair(m[1], m[2], 'lnglat');
    }
    const rtext = decoded.match(new RegExp(`rtext=[^&]*~${NUM},${NUM}`));
    if (rtext) return pair(rtext[1], rtext[2], 'latlng');
  }

  if (isGoogle || !isYandex) {
    // Precise place marker: !3d<lat>!4d<lng>
    const bang = decoded.match(new RegExp(`!3d${NUM}!4d${NUM}`));
    if (bang) return pair(bang[1], bang[2], 'latlng');
    for (const key of ['q', 'query', 'destination', 'daddr', 'll', 'center']) {
      const m = decoded.match(new RegExp(`[?&]${key}=(?:loc:)?${NUM},\\s*${NUM}`));
      if (m) return pair(m[1], m[2], 'latlng');
    }
    const at = decoded.match(new RegExp(`/@${NUM},${NUM}`));
    if (at) return pair(at[1], at[2], 'latlng');
    const place = decoded.match(new RegExp(`/(?:place|search)/${NUM},\\s*${NUM}`));
    if (place) return pair(place[1], place[2], 'latlng');
  }

  return null;
}

/** True for short share links (yandex.uz/maps/-/..., maps.app.goo.gl/..., goo.gl/maps/...). */
export function isShortMapLink(raw: string): boolean {
  return /^(https?:\/\/)?((www\.)?yandex\.[a-z.]+\/maps\/-\/|maps\.app\.goo\.gl\/|goo\.gl\/maps\/)/i.test(
    (raw || '').trim()
  );
}

export function looksLikeMapLink(raw: string): boolean {
  return /^(https?:\/\/)?([a-z0-9-]+\.)*(yandex\.[a-z.]+|google\.[a-z.]+|goo\.gl|ya\.ru)\//i.test(
    (raw || '').trim()
  );
}
