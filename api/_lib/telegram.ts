import { getTelegramConfig } from './env.js';
import { formatUzPhoneForDisplay } from './phone.js';
import {
  getOrder,
  updateInvitationStatus,
  upsertOrder,
  type OrderStatus,
} from './firebaseAdmin.js';

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
  return res.json();
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
    let order = await getOrder(orderId);

    if (order && (order.status === 'paid' || order.status === 'rejected')) {
      const statusText = order.status === 'paid' ? 'TASDIQLANGAN ✅' : 'RAD ETILGAN ❌';
      await tgApi('answerCallbackQuery', {
        callback_query_id: callbackId,
        text: `⚠️ Ushbu buyurtma allaqachon ${statusText}!`,
        show_alert: true,
      });
      return;
    }

    const newStatus: OrderStatus = action === 'confirm' ? 'paid' : 'rejected';
    const nowIso = new Date().toISOString();

    await upsertOrder(orderId, {
      id: orderId,
      status: newStatus,
      updatedAt: nowIso,
      customerName: order?.customerName || 'Mijoz',
      customerPhone: order?.customerPhone || '',
      price: order?.price || 0,
      createdAt: order?.createdAt || nowIso,
    });

    const invitationId = order?.invitationId;
    if (invitationId) {
      try {
        await updateInvitationStatus(invitationId, newStatus, nowIso);
      } catch (err) {
        console.warn('Invitation status sync warning:', err);
      }
    }

    const adminName =
      `${callback.from?.first_name || ''} ${callback.from?.last_name || ''}`.trim() || 'Admin';
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
  const { adminChatId } = getTelegramConfig();

  const formattedPrice = new Intl.NumberFormat('uz-UZ').format(params.price);
  const formattedDate = new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' });

  const captionHtml =
    `🧾 <b>YANGI TO'LOV CHEKI #${params.orderId}</b>\n\n` +
    `👤 <b>Mijoz:</b> ${params.customerName}\n` +
    `📞 <b>Telefon:</b> ${formatUzPhoneForDisplay(params.customerPhone)}\n` +
    `🎨 <b>Shablon:</b> ${params.templateName}\n` +
    `📅 <b>To'y sanasi:</b> ${params.weddingDate}\n` +
    `📍 <b>To'yxona:</b> ${params.venueName}\n` +
    `💰 <b>To'lov summasi:</b> ${formattedPrice} so'm\n` +
    `💳 <b>Karta:</b> 5614 6822 0920 2581 (ABDULLA DEDAXANOV)\n` +
    `⏱ <b>Yuklangan vaqt:</b> ${formattedDate}\n\n` +
    `👇 <i>Iltimos, to'lovni tasdiqlang yoki rad eting:</i>`;

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

  let tgData: any;

  if (params.fileUrl) {
    tgData = await tgApi(tgMethod, {
      chat_id: adminChatId,
      [fieldName]: params.fileUrl,
      caption: captionHtml,
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    });
  } else if (params.fileBuffer) {
    const formData = new FormData();
    formData.append('chat_id', adminChatId);
    formData.append('caption', captionHtml);
    formData.append('parse_mode', 'HTML');
    formData.append('reply_markup', JSON.stringify(replyMarkup));

    const fileBlob = new Blob([new Uint8Array(params.fileBuffer)], {
      type: params.isPdf ? 'application/pdf' : params.fileType || 'image/jpeg',
    });
    const fileExt = params.isPdf ? '.pdf' : '.jpg';
    formData.append(
      fieldName,
      fileBlob,
      params.fileName || `receipt_${params.orderId}${fileExt}`
    );

    tgData = await tgApi(tgMethod, formData);
  } else {
    return { ok: false, error: 'Fayl topilmadi' };
  }

  if (!tgData?.ok) {
    console.error('Telegram Bot API Error:', tgData);
    return {
      ok: false,
      error:
        "Telegram botga xabar yuborishda xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.",
    };
  }

  return { ok: true, messageId: tgData.result?.message_id };
}
