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
  const cleaned = cleanEnvString(val);
  return cleaned.replace(/\\n/g, '\n');
}

export function requireEnv(name: string): string {
  const value = cleanEnvString(process.env[name]);
  if (!value) {
    throw new Error(`${name} environment variable is not set`);
  }
  return value;
}

export function getTelegramConfig() {
  return {
    botToken: cleanEnvString(process.env.TELEGRAM_BOT_TOKEN) || 'MOCK_BOT_TOKEN',
    adminChatId: cleanEnvString(process.env.TELEGRAM_ADMIN_CHAT_ID) || 'MOCK_ADMIN_CHAT_ID',
    webhookSecret: cleanEnvString(process.env.TELEGRAM_WEBHOOK_SECRET) || '',
  };
}

export function getFirebaseDatabaseUrl(): string {
  const url = cleanEnvString(process.env.FIREBASE_DATABASE_URL);
  return url || 'https://teklifim-9dae7-default-rtdb.firebaseio.com';
}
