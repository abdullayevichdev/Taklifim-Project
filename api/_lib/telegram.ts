import { getPaymentTelegramConfig, getTelegramWebhookRegistrationSecret } from './env.js';
import { formatUzPhoneForDisplay } from './phone.js';
import { decideOrderPayment } from './firebaseAdmin.js';

function escapeTelegramHtml(value?: string | number | null): string {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function sanitizeTelegramErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err || 'Unknown Telegram error');
  return raw.replace(/\/bot[^/\s]+/gi, '/bot[REDACTED]');
}

async function tgApiWithToken(
  botToken: string,
  method: string,
  body: Record<string, unknown> | FormData,
  timeoutMs = 8000
) {
  if (!botToken || botToken === 'MOCK_BOT_TOKEN') {
    return {
      ok: false,
      error_code: 500,
      description: 'Telegram bot token is not configured.',
    };
  }

  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
      method: 'POST',
      signal: controller.signal,
      ...(isForm
        ? { body: body as FormData }
        : {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }),
    });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return {
        ok: false,
        error_code: res.status,
        description: text.slice(0, 200) || `HTTP ${res.status}`,
      };
    }
  } catch (err) {
    return {
      ok: false,
      error_code: 502,
      description: sanitizeTelegramErrorMessage(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function tgPaymentApi(method: string, body: Record<string, unknown> | FormData) {
  const { botToken } = getPaymentTelegramConfig();
  return tgApiWithToken(botToken, method, body);
}

/**
 * Sends a Telegram message using TELEGRAM_BOT_TOKEN (lazy-evaluated per call),
 * wrapped in try/catch with an AbortController timeout.
 */
export async function sendTelegramBotMessage(
  chatId: string | number,
  text: string,
  options?: {
    parseMode?: 'HTML' | 'MarkdownV2';
    replyMarkup?: Record<string, unknown>;
    disableWebPagePreview?: boolean;
    botToken?: string;
    timeoutMs?: number;
  }
) {
  try {
    const token = options?.botToken || getPaymentTelegramConfig().botToken;
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text,
    };
    if (options?.parseMode) payload.parse_mode = options.parseMode;
    if (options?.replyMarkup) payload.reply_markup = options.replyMarkup;
    if (options?.disableWebPagePreview !== undefined) {
      payload.disable_web_page_preview = options.disableWebPagePreview;
    }
    return await tgApiWithToken(token, 'sendMessage', payload, options?.timeoutMs ?? 8000);
  } catch (err) {
    return {
      ok: false,
      error_code: 500,
      description: sanitizeTelegramErrorMessage(err),
    };
  }
}

async function handleAdminCallbackQuery(callback: any): Promise<void> {
  const { adminChatId } = getPaymentTelegramConfig();
  const callbackId = callback.id;
  const callbackData = callback.data || '';
  const message = callback.message;
  const messageChatId = String(callback.message?.chat?.id ?? '');
  const pressedById = String(callback.from?.id ?? '');
  const hasAdminChat =
    Boolean(adminChatId) && adminChatId !== 'YOUR_ADMIN_CHAT_ID' && adminChatId !== 'MOCK_ADMIN_CHAT_ID';
  // The admin chat may be a private chat (id === presser id) or a group (id === message chat id).
  const isAdminPress =
    hasAdminChat && (messageChatId === String(adminChatId) || pressedById === String(adminChatId));

  if (!isAdminPress) {
    try {
      await tgPaymentApi('answerCallbackQuery', {
        callback_query_id: callbackId,
        text: '⛔ Faqat admin tasdiqlashi mumkin',
        show_alert: true,
      });
    } catch {
      /* ignore */
    }
    return;
  }

  let action: 'confirm' | 'reject' | null = null;
  let orderId = '';

  if (callbackData.startsWith('confirm_')) {
    action = 'confirm';
    orderId = callbackData.replace('confirm_', '');
  } else if (callbackData.startsWith('reject_')) {
    action = 'reject';
    orderId = callbackData.replace('reject_', '');
  }

  if (!action || !orderId) {
    try {
      await tgPaymentApi('answerCallbackQuery', {
        callback_query_id: callbackId,
        text: "Noma'lum buyurtma formati",
      });
    } catch {
      /* ignore */
    }
    return;
  }

  try {
    const newStatus = action === 'confirm' ? 'paid' : 'rejected';
    const adminName =
      `${callback.from?.first_name || ''} ${callback.from?.last_name || ''}`.trim() || 'Admin';

    const decisionResult = await decideOrderPayment({
      orderId,
      decision: newStatus,
      adminName,
    });

    if (decisionResult.alreadyDecided) {
      const statusText =
        decisionResult.existingStatus === 'paid' ? 'TASDIQLANGAN ✅' : 'RAD ETILGAN ❌';
      await tgPaymentApi('answerCallbackQuery', {
        callback_query_id: callbackId,
        text: `⚠️ Ushbu buyurtma allaqachon ${statusText}!`,
        show_alert: true,
      });
      return;
    }
    // Telegram returns the caption as plain text; escape it before re-sending with parse_mode=HTML,
    // otherwise names containing "<" or "&" make the edit fail.
    const originalCaption = escapeTelegramHtml(message?.caption || message?.text || '');
    const statusBadge =
      action === 'confirm'
        ? `\n\n✅ <b>TO'LOV TASDIQLANDI</b> (Admin: ${adminName})`
        : `\n\n❌ <b>TO'LOV RAD ETILDI</b> (Admin: ${adminName})`;
    let updatedCaption = originalCaption + statusBadge;
    const captionLimit = message?.caption !== undefined ? 1024 : 4096;
    if (updatedCaption.length > captionLimit) {
      updatedCaption = originalCaption.slice(0, Math.max(0, captionLimit - statusBadge.length - 3)) + '...' + statusBadge;
    }

    if (message?.caption !== undefined) {
      await tgPaymentApi('editMessageCaption', {
        chat_id: message.chat.id,
        message_id: message.message_id,
        caption: updatedCaption,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [] },
      });
    } else if (message?.message_id) {
      await tgPaymentApi('editMessageText', {
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: updatedCaption,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [] },
      });
    }

    await tgPaymentApi('answerCallbackQuery', {
      callback_query_id: callbackId,
      text:
        action === 'confirm'
          ? "✅ To'lov muvaffaqiyatli tasdiqlandi!"
          : "❌ To'lov rad etildi!",
      show_alert: true,
    });
  } catch (err) {
    console.error('Telegram callback handler error:', sanitizeTelegramErrorMessage(err));
    try {
      await tgPaymentApi('answerCallbackQuery', {
        callback_query_id: callbackId,
        text: 'Xatolik yuz berdi. Qayta urinib ko‘ring.',
        show_alert: true,
      });
    } catch {
      /* ignore */
    }
  }
}

/**
 * Payment & admin webhook processor (handles payment receipt confirm/reject callbacks only).
 */
export async function handlePaymentTelegramUpdate(update: any): Promise<void> {
  if (!update || typeof update !== 'object') return;
  if (update.callback_query) {
    await handleAdminCallbackQuery(update.callback_query);
  }
}

/**
 * Primary webhook handler (/api/telegram/webhook):
 * handles only payment receipt confirm/reject callbacks via the payment bot token (TELEGRAM_BOT_TOKEN).
 * Any other update type (e.g. private chat messages) is ignored.
 */
export async function handlePaymentBotWebhookUpdate(update: any): Promise<void> {
  if (!update || typeof update !== 'object') return;
  if (update.callback_query) {
    await handlePaymentTelegramUpdate(update);
    return;
  }

  // /start or /id in any chat → reply with that chat's id (helps set TELEGRAM_ADMIN_CHAT_ID).
  const msg = update.message;
  const text = typeof msg?.text === 'string' ? msg.text.trim() : '';
  if (msg?.chat?.id !== undefined && /^\/(start|id)(@\w+)?$/i.test(text)) {
    const { adminChatId } = getPaymentTelegramConfig();
    const isAdminChat = String(msg.chat.id) === String(adminChatId);
    await tgPaymentApi('sendMessage', {
      chat_id: msg.chat.id,
      parse_mode: 'HTML',
      text:
        `🆔 Chat ID: <code>${escapeTelegramHtml(msg.chat.id)}</code>\n` +
        (isAdminChat
          ? "✅ Bu chat admin sifatida sozlangan. To'lov cheklari shu yerga keladi."
          : "ℹ️ To'lov cheklari shu chatga kelishi uchun ushbu ID ni TELEGRAM_ADMIN_CHAT_ID sifatida kiriting."),
    });
  }
}

const WEBHOOK_ENSURE_TTL_MS = 10 * 60 * 1000;
let lastWebhookEnsure: { url: string; at: number } = { url: '', at: 0 };

/**
 * Makes sure the payment bot webhook points to `${baseUrl}/api/telegram/webhook` with the
 * current secret. Without a correct webhook the "✅ Tasdiqlash / ❌ Rad etish" buttons do nothing.
 * Called before each receipt is sent, so the buttons on that message always work.
 */
export async function ensurePaymentBotWebhook(
  baseUrl: string,
  options?: { force?: boolean }
): Promise<{ ok: boolean; changed: boolean; url?: string; error?: string }> {
  const { botToken } = getPaymentTelegramConfig();
  const secret = getTelegramWebhookRegistrationSecret();
  if (!botToken || botToken === 'MOCK_BOT_TOKEN' || !secret || !/^https:\/\//i.test(baseUrl || '')) {
    return { ok: false, changed: false, error: 'Webhook cannot be registered (missing token, secret or https URL).' };
  }

  const url = `${baseUrl.replace(/\/+$/, '')}/api/telegram/webhook`;
  if (
    !options?.force &&
    lastWebhookEnsure.url === url &&
    Date.now() - lastWebhookEnsure.at < WEBHOOK_ENSURE_TTL_MS
  ) {
    return { ok: true, changed: false, url };
  }

  const info = await tgApiWithToken(botToken, 'getWebhookInfo', {}, 5000);
  const current = info?.result || {};
  const allowed = current.allowed_updates;
  const lastErrorAgeSec = current.last_error_date
    ? Date.now() / 1000 - Number(current.last_error_date)
    : Infinity;
  const needsRegister =
    Boolean(options?.force) ||
    !info?.ok ||
    current.url !== url ||
    lastErrorAgeSec < 6 * 3600 ||
    (Array.isArray(allowed) && allowed.length > 0 && !allowed.includes('callback_query'));

  if (!needsRegister) {
    lastWebhookEnsure = { url, at: Date.now() };
    return { ok: true, changed: false, url };
  }

  const setResult = await tgApiWithToken(
    botToken,
    'setWebhook',
    {
      url,
      secret_token: secret,
      allowed_updates: ['callback_query', 'message'],
      max_connections: 20,
    },
    6000
  );
  if (!setResult?.ok) {
    console.error('Telegram setWebhook failed:', {
      error_code: setResult?.error_code,
      description: setResult?.description,
    });
    return { ok: false, changed: false, url, error: setResult?.description || 'setWebhook failed' };
  }
  lastWebhookEnsure = { url, at: Date.now() };
  return { ok: true, changed: true, url };
}

export async function handleTelegramUpdate(update: any): Promise<void> {
  await handlePaymentBotWebhookUpdate(update);
}

export async function sendReceiptToTelegram(params: {
  orderId: string;
  customerName: string;
  customerPhone: string;
  templateName: string;
  weddingDate: string;
  venueName: string;
  price: number;
  isPdf: boolean;
  fileName?: string;
  fileType?: string;
  fileBuffer?: Buffer;
  fileUrl?: string;
}): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  const { botToken, adminChatId } = getPaymentTelegramConfig();

  if (!botToken || botToken === 'MOCK_BOT_TOKEN' || !adminChatId || adminChatId === 'MOCK_ADMIN_CHAT_ID') {
    console.error('Telegram configuration missing:', {
      hasBotToken: Boolean(botToken && botToken !== 'MOCK_BOT_TOKEN'),
      hasAdminChatId: Boolean(adminChatId && adminChatId !== 'MOCK_ADMIN_CHAT_ID'),
    });
    return {
      ok: false,
      error: "Telegram bot sozlamalari (TELEGRAM_BOT_TOKEN / TELEGRAM_ADMIN_CHAT_ID) serverda sozlanmagan.",
    };
  }

  const safePrice = Number.isFinite(Number(params.price)) ? Number(params.price) : 0;
  const formattedPrice = new Intl.NumberFormat('uz-UZ').format(safePrice);
  const formattedDate = new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' });

  const safeOrderId = escapeTelegramHtml(params.orderId);
  const safeCustomerName = escapeTelegramHtml((params.customerName || 'Mijoz').slice(0, 120));
  const safePhone = escapeTelegramHtml(formatUzPhoneForDisplay(params.customerPhone));
  const safeTemplate = escapeTelegramHtml((params.templateName || 'Standart Shablon').slice(0, 100));
  const safeWeddingDate = escapeTelegramHtml((params.weddingDate || '-').slice(0, 60));
  const safeVenue = escapeTelegramHtml((params.venueName || '-').slice(0, 160));

  let captionHtml =
    `🧾 <b>YANGI TO'LOV CHEKI #${safeOrderId}</b>\n\n` +
    `👤 <b>Mijoz:</b> ${safeCustomerName}\n` +
    `📞 <b>Telefon:</b> ${safePhone}\n` +
    `🎨 <b>Shablon:</b> ${safeTemplate}\n` +
    `📅 <b>To'y sanasi:</b> ${safeWeddingDate}\n` +
    `📍 <b>To'yxona:</b> ${safeVenue}\n` +
    `💰 <b>To'lov summasi:</b> ${formattedPrice} so'm\n` +
    `💳 <b>Karta:</b> 5614 6822 0920 2581 (ABDULLA DEDAXANOV)\n` +
    `⏱ <b>Yuklangan vaqt:</b> ${escapeTelegramHtml(formattedDate)}\n\n` +
    `👇 <i>Iltimos, to'lovni tasdiqlang yoki rad eting:</i>`;

  if (captionHtml.length > 1000) {
    captionHtml = captionHtml.slice(0, 997) + '...';
  }

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: "✅ To'lovni tasdiqlash", callback_data: `confirm_${params.orderId}` },
        { text: '❌ Rad etish', callback_data: `reject_${params.orderId}` },
      ],
    ],
  };

  const tgMethod = params.isPdf ? 'sendDocument' : 'sendPhoto';
  const fieldName = params.isPdf ? 'document' : 'photo';

  const sendViaBuffer = async (buf: Buffer) => {
    const formData = new FormData();
    formData.append('chat_id', adminChatId);
    formData.append('caption', captionHtml);
    formData.append('parse_mode', 'HTML');
    formData.append('reply_markup', JSON.stringify(replyMarkup));

    const fileBlob = new Blob([new Uint8Array(buf)], {
      type: params.isPdf ? 'application/pdf' : params.fileType || 'image/jpeg',
    });
    const fileExt = params.isPdf ? '.pdf' : '.jpg';
    formData.append(
      fieldName,
      fileBlob,
      params.fileName || `receipt_${params.orderId}${fileExt}`
    );

    return tgPaymentApi(tgMethod, formData);
  };

  let tgData: any;

  if (params.fileUrl) {
    tgData = await tgPaymentApi(tgMethod, {
      chat_id: adminChatId,
      [fieldName]: params.fileUrl,
      caption: captionHtml,
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    });

    // If Telegram cannot fetch the Firebase Storage URL directly, fetch server-side and upload bytes
    if (!tgData?.ok) {
      try {
        const fileRes = await fetch(params.fileUrl);
        if (fileRes.ok) {
          const arrBuf = await fileRes.arrayBuffer();
          tgData = await sendViaBuffer(Buffer.from(arrBuf));
        }
      } catch (fetchErr) {
        console.warn('Fallback fileUrl download failed:', fetchErr);
      }
    }
  } else if (params.fileBuffer) {
    tgData = await sendViaBuffer(params.fileBuffer);
  } else {
    return { ok: false, error: 'Fayl topilmadi' };
  }

  if (!tgData?.ok) {
    console.error('Telegram Bot API Error:', {
      error_code: tgData?.error_code,
      description: tgData?.description,
    });
    return {
      ok: false,
      error:
        "Telegram botga xabar yuborishda xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.",
    };
  }

  return { ok: true, messageId: tgData.result?.message_id };
}

export async function sendTemplateErrorAlertToTelegram(params: {
  source: string;
  templateId?: string;
  templateSlug?: string;
  invitationId?: string;
  invitationSlug?: string;
  routePath?: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const { botToken, adminChatId } = getPaymentTelegramConfig();

  if (
    !botToken ||
    botToken === 'MOCK_BOT_TOKEN' ||
    !adminChatId ||
    adminChatId === 'MOCK_ADMIN_CHAT_ID'
  ) {
    return { ok: true, skipped: true };
  }

  const timestamp = new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' });
  const text =
    `⚠️ <b>SHABLON TOPILMADI (Template Error)</b>\n\n` +
    `📍 <b>Manba:</b> ${escapeTelegramHtml(params.source.slice(0, 60))}\n` +
    `🎨 <b>templateSlug:</b> <code>${escapeTelegramHtml((params.templateSlug || '—').slice(0, 100))}</code>\n` +
    `🆔 <b>templateId:</b> <code>${escapeTelegramHtml((params.templateId || '—').slice(0, 100))}</code>\n` +
    `📨 <b>invitationId:</b> <code>${escapeTelegramHtml((params.invitationId || '—').slice(0, 100))}</code>\n` +
    `🔗 <b>invitationSlug:</b> <code>${escapeTelegramHtml((params.invitationSlug || '—').slice(0, 100))}</code>\n` +
    `🌐 <b>Sahifa:</b> <code>${escapeTelegramHtml((params.routePath || '—').slice(0, 180))}</code>\n` +
    `⏱ <b>Vaqt:</b> ${escapeTelegramHtml(timestamp)}`;

  try {
    const tgData = await tgPaymentApi('sendMessage', {
      chat_id: adminChatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });
    if (!tgData?.ok) {
      return { ok: false, error: tgData?.description || 'Telegram alert failed' };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: sanitizeTelegramErrorMessage(err) };
  }
}

/**
 * Called when a receipt is decided from the admin panel: removes the confirm/reject buttons
 * from the original Telegram message and replies with the outcome, so the chat stays in sync.
 */
export async function markTelegramReceiptDecided(params: {
  messageId?: number;
  orderId: string;
  decision: 'paid' | 'rejected';
  reason?: string;
}): Promise<void> {
  const { adminChatId } = getPaymentTelegramConfig();
  if (!adminChatId || adminChatId === 'MOCK_ADMIN_CHAT_ID') return;
  try {
    if (params.messageId) {
      await tgPaymentApi('editMessageReplyMarkup', {
        chat_id: adminChatId,
        message_id: params.messageId,
        reply_markup: { inline_keyboard: [] },
      });
    }
    const text =
      params.decision === 'paid'
        ? `✅ <b>#${escapeTelegramHtml(params.orderId)}</b> — admin panel orqali TASDIQLANDI`
        : `❌ <b>#${escapeTelegramHtml(params.orderId)}</b> — admin panel orqali RAD ETILDI` +
          (params.reason ? `\nSabab: ${escapeTelegramHtml(params.reason.slice(0, 300))}` : '');
    await tgPaymentApi('sendMessage', {
      chat_id: adminChatId,
      text,
      parse_mode: 'HTML',
      ...(params.messageId ? { reply_to_message_id: params.messageId, allow_sending_without_reply: true } : {}),
    });
  } catch {
    /* non-fatal */
  }
}
