import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getOrder,
  updateInvitationStatus,
  upsertOrder,
} from '../_lib/firebaseAdmin';
import { checkRateLimit } from '../_lib/rateLimit';
import { sendReceiptToTelegram } from '../_lib/telegram';

/** Max decoded image ~1.5MB; base64 string ceiling with margin under Vercel ~4.5MB body. */
const MAX_IMAGE_BASE64_CHARS = Math.ceil(1.5 * 1024 * 1024 * 1.4);
/** PDF via base64 must stay under ~3.2MB raw to fit Vercel body; larger PDFs use fileUrl (Storage). */
const MAX_PDF_BASE64_CHARS = Math.ceil(3.2 * 1024 * 1024 * 1.37);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const {
      orderId,
      invitationId,
      invitationSlug,
      customerName,
      customerPhone,
      templateName,
      weddingDate,
      venueName,
      price,
      fileName,
      fileType,
      fileBase64,
      fileUrl,
    } = req.body || {};

    if (!orderId || !customerPhone || (!fileBase64 && !fileUrl)) {
      return res.status(400).json({
        success: false,
        error: "Barcha majburiy maydonlar va chek fayli kiritilishi shart.",
      });
    }

    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown';
    const clientKey = `${clientIp}_${customerPhone}`;
    if (!checkRateLimit(clientKey)) {
      return res.status(429).json({
        success: false,
        error:
          "Juda ko'p so'rov yuborildi. Iltimos, 10 soniya kutib qayta urinib ko'ring.",
      });
    }

    const isPdf =
      fileType === 'application/pdf' ||
      (typeof fileName === 'string' && fileName.toLowerCase().endsWith('.pdf'));

    let fileBuffer: Buffer | undefined;

    if (fileBase64) {
      if (isPdf && fileBase64.length > MAX_PDF_BASE64_CHARS) {
        return res.status(400).json({
          success: false,
          error:
            "PDF hajmi Vercel so'rov limitidan oshib ketdi. Iltimos 4 MB dan kichik PDF yuklang yoki qayta urinib ko'ring.",
        });
      }
      if (!isPdf && fileBase64.length > MAX_IMAGE_BASE64_CHARS) {
        return res.status(400).json({
          success: false,
          error: 'Rasm hajmi 1.5 MB dan oshmasligi kerak. Qayta siqib yuklang.',
        });
      }

      const base64Data = String(fileBase64).replace(/^data:[^;]+;base64,/, '');
      fileBuffer = Buffer.from(base64Data, 'base64');
    }

    const nowIso = new Date().toISOString();
    const existing = await getOrder(orderId);

    const orderData = {
      id: orderId,
      orderId,
      invitationId: invitationId || existing?.invitationId,
      invitationSlug: invitationSlug || existing?.invitationSlug,
      customerName: customerName || existing?.customerName || 'Mijoz',
      customerPhone: customerPhone || existing?.customerPhone || '+998',
      templateName: templateName || existing?.templateName || 'Standart Shablon',
      weddingDate: weddingDate || existing?.weddingDate || '-',
      venueName: venueName || existing?.venueName || '-',
      price: Number(price) || existing?.price || 180000,
      status: 'pending_review' as const,
      receiptUrl: fileUrl || existing?.receiptUrl || undefined,
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    await upsertOrder(orderId, orderData);

    if (orderData.invitationId) {
      await updateInvitationStatus(orderData.invitationId, 'pending_review', nowIso);
    }

    const tgResult = await sendReceiptToTelegram({
      orderId: orderData.orderId,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      templateName: orderData.templateName || 'Standart Shablon',
      weddingDate: orderData.weddingDate || '-',
      venueName: orderData.venueName || '-',
      price: orderData.price,
      isPdf,
      fileName,
      fileType,
      fileBuffer,
      fileUrl: fileUrl || undefined,
    });

    if (!tgResult.ok) {
      return res.status(500).json({
        success: false,
        error: tgResult.error || 'Telegram xatosi',
      });
    }

    await upsertOrder(orderId, {
      telegramMessageId: tgResult.messageId,
      updatedAt: new Date().toISOString(),
    });

    return res.json({
      success: true,
      orderId: orderData.orderId,
      status: orderData.status,
      message: "Chekingiz adminga yuborildi, tasdiqlanishini kuting.",
    });
  } catch (err: any) {
    console.error('Upload receipt handler error:', err);
    return res.status(500).json({
      success: false,
      error: 'Serverda xatolik yuz berdi: ' + (err.message || "Noma'lum xatolik"),
    });
  }
}
