import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getTelegramAuthConfig } from '../_lib/env.js';
import {
  handleLoginTelegramUpdate,
  sanitizeTelegramErrorMessage,
} from '../_lib/telegram.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { webhookSecret } = getTelegramAuthConfig();
    const secretHeader = req.headers['x-telegram-bot-api-secret-token'];

    if (!webhookSecret || typeof secretHeader !== 'string' || secretHeader !== webhookSecret) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const update = req.body;
    if (update) {
      await handleLoginTelegramUpdate(update);
    }

    return res.status(200).json({ status: 'ok' });
  } catch (err: any) {
    const safeMsg = sanitizeTelegramErrorMessage(err);
    console.error('Telegram login webhook handler error:', safeMsg);
    return res.status(500).json({ error: safeMsg || 'Login webhook error' });
  }
}
