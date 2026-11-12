import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getTelegramConfig } from '../_lib/env.js';
import { handleTelegramUpdate } from '../_lib/telegram.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { webhookSecret } = getTelegramConfig();
    const secretHeader = req.headers['x-telegram-bot-api-secret-token'];

    if (!secretHeader || secretHeader !== webhookSecret) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const update = req.body;
    if (update) {
      await handleTelegramUpdate(update);
    }

    return res.status(200).json({ status: 'ok' });
  } catch (err: any) {
    console.error('Telegram webhook handler error:', err);
    return res.status(500).json({ error: err.message || 'Webhook error' });
  }
}
