import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDefaultTelegramAuthDeps } from '../../_lib/telegram.js';
import { startTelegramLogin } from '../../_lib/telegramAuth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    let parsedBody: Record<string, unknown> = {};
    if (typeof req.body === 'string') {
      try {
        parsedBody = JSON.parse(req.body);
      } catch {
        return res.status(400).json({ success: false, error: 'Invalid JSON request body.' });
      }
    } else if (req.body && typeof req.body === 'object') {
      parsedBody = req.body as Record<string, unknown>;
    }

    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown';

    const result = await startTelegramLogin(
      {
        claimSecret: parsedBody.claimSecret,
        lang: parsedBody.lang,
        clientIp,
      },
      getDefaultTelegramAuthDeps()
    );

    return res.status(result.statusCode).json(result.body);
  } catch (err: any) {
    console.error('Telegram auth start handler error:', {
      message: err?.message,
      code: err?.code,
    });
    return res.status(500).json({
      success: false,
      error: 'Internal server error while starting Telegram login.',
    });
  }
}
