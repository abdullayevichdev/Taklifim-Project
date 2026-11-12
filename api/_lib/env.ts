export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is not set`);
  }
  return value;
}

export function getTelegramConfig() {
  return {
    botToken: requireEnv('TELEGRAM_BOT_TOKEN'),
    adminChatId: requireEnv('TELEGRAM_ADMIN_CHAT_ID'),
    webhookSecret: requireEnv('TELEGRAM_WEBHOOK_SECRET'),
  };
}

export function getFirebaseDatabaseUrl(): string {
  return (
    process.env.FIREBASE_DATABASE_URL ||
    'https://teklifim-9dae7-default-rtdb.firebaseio.com'
  );
}
