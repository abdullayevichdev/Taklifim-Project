import type { VercelRequest, VercelResponse } from '../_lib/http.js';
import crypto from 'node:crypto';

function timingSafeSecretEqual(expected: string, provided: string): boolean {
  if (!expected || !provided) return false;
  const expectedDigest = crypto.createHash('sha256').update(expected, 'utf8').digest();
  const providedDigest = crypto.createHash('sha256').update(provided, 'utf8').digest();
  return crypto.timingSafeEqual(expectedDigest, providedDigest);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let acceptedSecrets: string[] = [];
  try {
    const envMod = await import('../_lib/env.js');
    acceptedSecrets = envMod.getAcceptedTelegramWebhookSecrets();
  } catch (err: any) {
    console.error('Telegram webhook config load error:', { code: err?.code || 'ENV_LOAD_ERROR' });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const secretHeader = req.headers['x-telegram-bot-api-secret-token'];
  if (
    acceptedSecrets.length === 0 ||
    typeof secretHeader !== 'string' ||
    !acceptedSecrets.some((secret) => timingSafeSecretEqual(secret, secretHeader))
  ) {
    console.warn('Telegram webhook rejected: secret token mismatch. Open /api/telegram/setup-webhook to re-register.');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let update: unknown = req.body;
  if (typeof update === 'string') {
    try {
      update = update.trim() ? JSON.parse(update) : null;
    } catch {
      return res.status(200).json({ status: 'ok' });
    }
  }

  if (update && typeof update === 'object') {
    try {
      const telegramMod = await import('../_lib/telegram.js');
      await telegramMod.handlePaymentBotWebhookUpdate(update);
    } catch (err: any) {
      // Always respond 200 quickly to Telegram after authenticating the update to prevent retry storms.
      console.error('Telegram webhook update processing error:', {
        code: err?.code || 'WEBHOOK_PROCESSING_FAILED',
      });
    }
  }

  return res.status(200).json({ status: 'ok' });
}
