import { getTelegramConfig } from './env.js';
import { formatUzPhoneForDisplay } from './phone.js';
import {
  decideOrderPayment,
} from './firebaseAdmin.js';

function escapeTelegramHtml(value?: string | number | null): string {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function tgApi(method: string, body: Record<string, unknown> | FormData) {
  const { botToken } = getTelegramConfig();
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
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
}

export async function handleTelegramUpdate(update: any): Promise<void> {
  if (!update?.callback_query) return;

  const { adminChatId } = getTelegramConfig();
  const callback = update.callback_query;
  const callbackId = callback.id;
  const callbackData = callback.data || '';
  const message = callback.message;
  const fromChatId = String(callback.message?.chat?.id ?? callback.from?.id ?? '');

  if (adminChatId && adminChatId !== 'YOUR_ADMIN_CHAT_ID' && adminChatId !== 'MOCK_ADMIN_CHAT_ID' && fromChatId !== String(adminChatId)) {
    try {
      await tgApi('answerCallbackQuery', {
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
      await tgApi('answerCallbackQuery', {
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
      await tgApi('answerCallbackQuery', {
        callback_query_id: callbackId,
        text: `⚠️ Ushbu buyurtma allaqachon ${statusText}!`,
        show_alert: true,
      });
      return;
    }
    const originalCaption = message?.caption || message?.text || '';
    const statusBadge =
      action === 'confirm'
        ? `\n\n✅ <b>TO'LOV TASDIQLANDI</b> (Admin: ${adminName})`
        : `\n\n❌ <b>TO'LOV RAD ETILDI</b> (Admin: ${adminName})`;
    const updatedCaption = originalCaption + statusBadge;

    if (message?.caption !== undefined) {
      await tgApi('editMessageCaption', {
        chat_id: message.chat.id,
        message_id: message.message_id,
        caption: updatedCaption,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [] },
      });
    } else if (message?.message_id) {
      await tgApi('editMessageText', {
        chat_id: message.chat.id,
        message_id: message.message_id,
        text: updatedCaption,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [] },
      });
    }

    await tgApi('answerCallbackQuery', {
      callback_query_id: callbackId,
      text:
        action === 'confirm'
          ? "✅ To'lov muvaffaqiyatli tasdiqlandi!"
          : "❌ To'lov rad etildi!",
      show_alert: true,
    });
  } catch (err) {
    console.error('Telegram callback handler error:', err);
    try {
      await tgApi('answerCallbackQuery', {
        callback_query_id: callbackId,
        text: 'Xatolik yuz berdi. Qayta urinib ko‘ring.',
        show_alert: true,
      });
    } catch {
      /* ignore */
    }
  }
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
  const { botToken, adminChatId } = getTelegramConfig();

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

    return tgApi(tgMethod, formData);
  };

  let tgData: any;

  if (params.fileUrl) {
    tgData = await tgApi(tgMethod, {
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
  const { botToken, adminChatId } = getTelegramConfig();

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
    const tgData = await tgApi('sendMessage', {
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
    return { ok: false, error: err?.message || 'Telegram alert exception' };
  }
}
