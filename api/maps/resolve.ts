import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Expands a Yandex / Google Maps share link (yandex.uz/maps/-/..., maps.app.goo.gl/...)
 * to its full URL so the client can read the coordinates from it.
 * Only map hosts are followed (no open proxy / SSRF), max 5 redirects.
 */
const ALLOWED_HOST = /^(?:[a-z0-9-]+\.)*(?:yandex\.(?:uz|ru|com|kz|by|com\.tr)|ya\.ru|google\.[a-z.]+|goo\.gl|app\.goo\.gl)$/i;

function isAllowed(url: URL): boolean {
  return url.protocol === 'https:' && ALLOWED_HOST.test(url.hostname);
}

export async function resolveMapLink(input: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  let current: URL;
  try {
    current = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
  } catch {
    return { ok: false, error: 'INVALID_URL' };
  }
  if (current.protocol === 'http:') current.protocol = 'https:';
  if (!isAllowed(current)) return { ok: false, error: 'HOST_NOT_ALLOWED' };

  for (let hop = 0; hop < 5; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    let res: Response;
    try {
      res = await fetch(current.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TashrifimLinkResolver/1.0)' },
      });
    } catch {
      clearTimeout(timer);
      return { ok: false, error: 'FETCH_FAILED' };
    }
    clearTimeout(timer);

    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      let next: URL;
      try {
        next = new URL(location, current);
      } catch {
        return { ok: false, error: 'BAD_REDIRECT' };
      }
      if (!isAllowed(next)) return { ok: true, url: current.toString() };
      current = next;
      continue;
    }
    return { ok: true, url: current.toString() };
  }
  return { ok: true, url: current.toString() };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const raw = typeof req.query.url === 'string' ? req.query.url.slice(0, 500) : '';
  if (!raw) return res.status(400).json({ ok: false, error: 'url is required' });
  const result = await resolveMapLink(raw);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  return res.status(result.ok ? 200 : 400).json(result);
}
