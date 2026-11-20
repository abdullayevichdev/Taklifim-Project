import type { VercelRequest, VercelResponse } from '@vercel/node';

function sanitizeStartError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err || 'Unknown server error');
  return raw
    .replace(/-----BEGIN[\s\S]*?END[^-]*-----/g, '[REDACTED]')
    .replace(/"private_key"\s*:\s*"[^"]*"/gi, '"private_key":"[REDACTED]"')
    .replace(/\/bot[^/\s]+/gi, '/bot[REDACTED]');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({
        ok: false,
        success: false,
        code: 'METHOD_NOT_ALLOWED',
        message: 'Method not allowed',
        error: 'Method not allowed',
      });
    }

    let parsedBody: Record<string, unknown> = {};
    if (typeof req.body === 'string') {
      try {
        parsedBody = req.body.trim() ? JSON.parse(req.body) : {};
      } catch {
        return res.status(400).json({
          ok: false,
          success: false,
          code: 'INVALID_JSON',
          message: 'Invalid JSON request body.',
          error: 'Invalid JSON request body.',
        });
      }
    } else if (req.body && typeof req.body === 'object') {
      parsedBody = req.body as Record<string, unknown>;
    }

    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown';

    let getDefaultTelegramAuthDeps: typeof import('../../_lib/telegram.js').getDefaultTelegramAuthDeps;
    let startTelegramLogin: typeof import('../../_lib/telegramAuth.js').startTelegramLogin;

    try {
      const [telegramMod, telegramAuthMod] = await Promise.all([
        import('../../_lib/telegram.js'),
        import('../../_lib/telegramAuth.js'),
      ]);
      getDefaultTelegramAuthDeps = telegramMod.getDefaultTelegramAuthDeps;
      startTelegramLogin = telegramAuthMod.startTelegramLogin;
    } catch (modErr: unknown) {
      const safeMsg = sanitizeStartError(modErr);
      console.error('Telegram auth start module load error:', safeMsg);
      return res.status(500).json({
        ok: false,
        success: false,
        code: 'MODULE_LOAD_FAILED',
        message: safeMsg || 'Failed to load authentication modules.',
        error: safeMsg || 'Failed to load authentication modules.',
      });
    }

    const result = await startTelegramLogin(
      {
        claimSecret: parsedBody.claimSecret,
        lang: parsedBody.lang,
        clientIp,
      },
      getDefaultTelegramAuthDeps()
    );

    return res.status(result.statusCode).json(result.body);
  } catch (err: unknown) {
    const safeMsg = sanitizeStartError(err);
    console.error('Telegram auth start handler error:', safeMsg);
    return res.status(500).json({
      ok: false,
      success: false,
      code: 'START_HANDLER_FAILED',
      message: safeMsg || 'Internal server error while starting Telegram login.',
      error: safeMsg || 'Internal server error while starting Telegram login.',
    });
  }
}
