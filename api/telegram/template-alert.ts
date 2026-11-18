import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkRateLimit } from '../_lib/rateLimit.js';
import { sendTemplateErrorAlertToTelegram } from '../_lib/telegram.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    let body: Record<string, any> = {};
    if (typeof req.body === 'string') {
      try {
        body = JSON.parse(req.body);
      } catch {
        return res.status(400).json({ ok: false, error: 'Invalid JSON' });
      }
    } else if (req.body && typeof req.body === 'object') {
      body = req.body;
    }

    const source = String(body.source || '').trim().slice(0, 60);
    const templateId = String(body.templateId || '').trim().slice(0, 100);
    const templateSlug = String(body.templateSlug || '').trim().slice(0, 100);
    const invitationId = String(body.invitationId || '').trim().slice(0, 100);
    const invitationSlug = String(body.invitationSlug || '').trim().slice(0, 100);
    const routePath = String(body.routePath || '').trim().slice(0, 180);

    if (!source) {
      return res.status(400).json({ ok: false, error: 'Missing source' });
    }

    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown';
    const rateKey = `tpl_alert:${clientIp}:${source}:${templateSlug}:${templateId}:${invitationId}`;

    if (!checkRateLimit(rateKey, 60_000)) {
      return res.status(200).json({ ok: true, deduplicated: true });
    }

    const result = await sendTemplateErrorAlertToTelegram({
      source,
      templateId,
      templateSlug,
      invitationId,
      invitationSlug,
      routePath,
    });

    return res.status(200).json(result);
  } catch (err: any) {
    console.warn('Template alert endpoint error:', err?.message || err);
    return res.status(200).json({ ok: false });
  }
}
