/**
 * Compatibility alias: the Telegram bot webhook may still point to the old login-webhook URL.
 * Every update is handled exactly like /api/telegram/webhook (payment confirm/reject buttons).
 */
export { default } from './webhook.js';
