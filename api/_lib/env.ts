import crypto from 'node:crypto';

export function cleanEnvString(val?: string): string {
  if (!val) return '';
  let str = val.trim();
  if (
    (str.startsWith('"') && str.endsWith('"')) ||
    (str.startsWith("'") && str.endsWith("'"))
  ) {
    str = str.slice(1, -1).trim();
  }
  return str;
}

export function cleanPrivateKey(val?: string): string {
  if (!val) return '';
  let str = val.trim();

  // Handle accidental trailing comma copied from JSON ("private_key": "...",)
  if (str.endsWith(',')) {
    str = str.slice(0, -1).trim();
  }

  // Strip surrounding matching quotes (up to 2 layers if double-quoted)
  for (let i = 0; i < 2; i++) {
    if (
      (str.startsWith('"') && str.endsWith('"')) ||
      (str.startsWith("'") && str.endsWith("'"))
    ) {
      str = str.slice(1, -1).trim();
    }
  }

  // Convert escaped newlines (both \\n and \n, \\r\\n and \r\n) and Windows CRLF/CR into real \n
  str = str
    .replace(/\\\\r\\\\n/g, '\n')
    .replace(/\\\\n/g, '\n')
    .replace(/\\\\r/g, '\n')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const BEGIN = '-----BEGIN PRIVATE KEY-----';
  const END = '-----END PRIVATE KEY-----';

  // If Vercel/dashboard pasted the PEM onto a single line with spaces instead of newlines,
  // reconstruct a valid multi-line 64-char-wrapped PKCS#8 PEM block cleanly.
  if (str.includes(BEGIN) && str.includes(END)) {
    const startIdx = str.indexOf(BEGIN) + BEGIN.length;
    const endIdx = str.indexOf(END, startIdx);
    if (endIdx > startIdx) {
      const compactBody = str.slice(startIdx, endIdx).replace(/\s+/g, '');
      if (compactBody.length > 0) {
        const wrappedBody = compactBody.match(/.{1,64}/g)?.join('\n') || compactBody;
        return `${BEGIN}\n${wrappedBody}\n${END}\n`;
      }
    }
  }

  const lines = str
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.length > 0 ? `${lines.join('\n')}\n` : '';
}

export function validatePrivateKeyPem(
  privateKey: string
): { ok: true } | { ok: false; reason: string } {
  const trimmed = String(privateKey || '').trim();
  if (!trimmed) {
    return { ok: false, reason: 'FIREBASE_PRIVATE_KEY is empty.' };
  }

  const BEGIN = '-----BEGIN PRIVATE KEY-----';
  const END = '-----END PRIVATE KEY-----';

  if (!trimmed.startsWith(BEGIN)) {
    return {
      ok: false,
      reason: 'FIREBASE_PRIVATE_KEY must start with -----BEGIN PRIVATE KEY-----.',
    };
  }

  if (!trimmed.endsWith(END)) {
    return {
      ok: false,
      reason: 'FIREBASE_PRIVATE_KEY must end with -----END PRIVATE KEY-----.',
    };
  }

  const body = trimmed.slice(BEGIN.length, trimmed.length - END.length).trim();
  if (!body || body.length < 64) {
    return {
      ok: false,
      reason: 'FIREBASE_PRIVATE_KEY PEM body is missing or truncated.',
    };
  }

  if (!/^[A-Za-z0-9+/=\n]+$/.test(body)) {
    return {
      ok: false,
      reason: 'FIREBASE_PRIVATE_KEY contains invalid characters inside PEM body.',
    };
  }

  try {
    crypto.createPrivateKey({
      key: `${BEGIN}\n${body}\n${END}\n`,
      format: 'pem',
      type: 'pkcs8',
    });
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : 'unsupported key format';
    const safeMsg = rawMsg.replace(/-----BEGIN[\s\S]*?END[^-]*-----/g, '[REDACTED]');
    return {
      ok: false,
      reason: `FIREBASE_PRIVATE_KEY failed PEM PKCS#8 validation (${safeMsg}).`,
    };
  }

  return { ok: true };
}

export function requireEnv(name: string): string {
  const value = cleanEnvString(process.env[name]);
  if (!value) {
    throw new Error(`${name} environment variable is not set`);
  }
  return value;
}

export type TelegramRuntimeEnv = 'production' | 'preview' | 'development';

export function getTelegramRuntimeEnv(): TelegramRuntimeEnv {
  const raw = cleanEnvString(process.env.VERCEL_ENV).toLowerCase();
  if (raw === 'production') return 'production';
  if (raw === 'preview') return 'preview';
  return 'development';
}

/**
 * Payment & admin notification bot config.
 * Always reads the primary payment bot credentials (never overridden by Preview test auth vars).
 */
export function getPaymentTelegramConfig() {
  return {
    botToken: cleanEnvString(process.env.TELEGRAM_BOT_TOKEN) || 'MOCK_BOT_TOKEN',
    adminChatId: cleanEnvString(process.env.TELEGRAM_ADMIN_CHAT_ID) || 'MOCK_ADMIN_CHAT_ID',
    webhookSecret: cleanEnvString(process.env.TELEGRAM_WEBHOOK_SECRET) || '',
  };
}

/**
 * Backwards-compatible alias for payment/shared Telegram configuration.
 */
export function getTelegramConfig() {
  return getPaymentTelegramConfig();
}

export function getBrandName(): string {
  return (
    cleanEnvString(process.env.BRAND_NAME) ||
    cleanEnvString(process.env.VITE_BRAND_NAME) ||
    'Tashrifim'
  );
}

export function getPublicSiteUrl(): string {
  const candidate =
    cleanEnvString(process.env.PUBLIC_SITE_URL) ||
    cleanEnvString(process.env.APP_URL) ||
    cleanEnvString(process.env.VITE_SITE_URL) ||
    cleanEnvString(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    cleanEnvString(process.env.VERCEL_URL);
  if (!candidate) return '';
  const withProtocol = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
  return withProtocol.replace(/\/+$/, '');
}

export function getUpstashConfig(): { url: string; token: string } | null {
  const url = cleanEnvString(process.env.UPSTASH_REDIS_REST_URL).replace(/\/+$/, '');
  const token = cleanEnvString(process.env.UPSTASH_REDIS_REST_TOKEN);
  if (!url || !token) return null;
  return { url, token };
}

export function getFirebaseDatabaseUrl(): string {
  const url = cleanEnvString(process.env.FIREBASE_DATABASE_URL).replace(/\/+$/, '');
  return url || 'https://teklifim-9dae7-default-rtdb.firebaseio.com';
}
