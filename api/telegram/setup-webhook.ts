import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'node:crypto';

function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const da = crypto.createHash('sha256').update(a, 'utf8').digest();
  const db = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(da, db);
}

/**
 * One-time helper that (re)registers the payment bot webhook so the
 * "✅ To'lovni tasdiqlash" / "❌ Rad etish" buttons reach /api/telegram/webhook.
 *
 * Usage (open in a browser once after deploy):
 *   https://<your-domain>/api/telegram/setup-webhook?key=<TELEGRAM_WEBHOOK_SECRET>
 * The webhook is registered on the domain you open this URL from (override with &base=https://domain).
 * Add &check=1 to only read the current webhook status without changing it.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  res.setHeader('Cache-Control', 'no-store');

  const { getPaymentTelegramConfig, getPublicSiteUrl, getAcceptedTelegramWebhookSecrets, getTelegramWebhookRegistrationSecret } =
    await import('../_lib/env.js');
  const { botToken } = getPaymentTelegramConfig();
  const webhookSecret = getTelegramWebhookRegistrationSecret();

  if (!botToken || botToken === 'MOCK_BOT_TOKEN') {
    return res.status(500).json({ ok: false, error: 'TELEGRAM_BOT_TOKEN is not set on the server.' });
  }

  // ?key= may be TELEGRAM_WEBHOOK_SECRET or, when no secret is configured, the bot token itself.
  const key = typeof req.query.key === 'string' ? req.query.key : '';
  const validKeys = [...getAcceptedTelegramWebhookSecrets(), botToken].filter(Boolean);
  if (!validKeys.some((k) => safeEqual(k, key))) {
    return res.status(401).json({
      ok: false,
      error: 'Invalid key. Use ?key=<TELEGRAM_WEBHOOK_SECRET> (or ?key=<TELEGRAM_BOT_TOKEN>).',
    });
  }

  const tg = async (method: string, body?: Record<string, unknown>) => {
    try {
      const r = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {}),
      });
      return await r.json();
    } catch (err) {
      return { ok: false, description: err instanceof Error ? err.message : 'Telegram request failed' };
    }
  };

  const describeInfo = (info: any) => {
    const r = info?.result || {};
    return {
      url: r.url || '',
      pendingUpdateCount: r.pending_update_count ?? 0,
      allowedUpdates: r.allowed_updates || 'all',
      lastErrorDate: r.last_error_date ? new Date(r.last_error_date * 1000).toISOString() : null,
      lastErrorMessage: r.last_error_message || null,
    };
  };

  const before = describeInfo(await tg('getWebhookInfo'));
  if (req.query.check === '1') {
    return res.status(200).json({ ok: true, webhook: before });
  }

  // Register the webhook on the exact domain this page was opened from (it is reachable by definition).
  // ?base=https://example.com overrides it; PUBLIC_SITE_URL is only a last resort.
  const firstHeader = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || '';
  const proto = firstHeader(req.headers['x-forwarded-proto']).split(',')[0].trim() || 'https';
  const host = firstHeader(req.headers['x-forwarded-host']).split(',')[0].trim() || firstHeader(req.headers.host);
  const requestBase = host && !/^(localhost|127\.|0\.0\.0\.0)/i.test(host) ? `https://${host}` : '';
  const overrideBase =
    typeof req.query.base === 'string' && /^https:\/\/[a-z0-9.-]+(:\d+)?\/?$/i.test(req.query.base)
      ? req.query.base
      : '';
  const base = overrideBase || requestBase || getPublicSiteUrl() || (host ? `${proto}://${host}` : '');
  if (!base) {
    return res.status(500).json({ ok: false, error: 'Could not determine site URL. Add ?base=https://your-domain' });
  }
  const webhookUrl = `${base.replace(/\/+$/, '')}/api/telegram/webhook`;

  const setResult = await tg('setWebhook', {
    url: webhookUrl,
    secret_token: webhookSecret,
    allowed_updates: ['callback_query', 'message'],
    max_connections: 20,
  });
  const after = describeInfo(await tg('getWebhookInfo'));

  return res.status(setResult?.ok ? 200 : 502).json({
    ok: Boolean(setResult?.ok),
    webhookUrl,
    telegram: setResult?.description || null,
    before,
    after,
  });
}
