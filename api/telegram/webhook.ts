import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPaymentTelegramConfig } from '../_lib/env.js';
import {
  handlePaymentBotWebhookUpdate,
  sanitizeTelegramErrorMessage,
} from '../_lib/telegram.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { webhookSecret } = getPaymentTelegramConfig();
    const secretHeader = req.headers['x-telegram-bot-api-secret-token'];

    if (!webhookSecret || typeof secretHeader !== 'string' || secretHeader !== webhookSecret) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const update = req.body;
    if (update) {
      await handlePaymentBotWebhookUpdate(update);
    }

    return res.status(200).json({ status: 'ok' });
  } catch (err: any) {
    const safeMsg = sanitizeTelegramErrorMessage(err);
    console.error('Telegram payment webhook handler error:', safeMsg);
    return res.status(500).json({ error: safeMsg || 'Webhook error' });
  }
}
