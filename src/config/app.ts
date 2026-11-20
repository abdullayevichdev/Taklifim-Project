export function getBrandName(): string {
  const raw =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_BRAND_NAME
      : undefined;
  return String(raw || 'Tashrifim').trim() || 'Tashrifim';
}

export function getTelegramBotUsername(): string {
  const raw =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_TELEGRAM_BOT_USERNAME
      : undefined;
  return String(raw || '').replace(/^@+/, '').trim();
}
