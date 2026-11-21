import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  getFirebaseAdminDiagnosticError,
  getUserRecord,
  getVerifiedUserPhone,
  hasFirebaseAdmin,
  verifyBearerToken,
} from '../_lib/firebaseAdmin.js';
import { cleanAndValidateUzPhone } from '../_lib/phone.js';
import { processUploadReceipt } from '../_lib/uploadReceiptService.js';
import { ensurePaymentBotWebhook } from '../_lib/telegram.js';
import { getPublicSiteUrl, getTelegramRuntimeEnv } from '../_lib/env.js';

/** Public https base URL of this deployment (skips localhost and Vercel preview deployments). */
function resolveWebhookBaseUrl(req: VercelRequest): string {
  if (getTelegramRuntimeEnv() === 'preview') return '';
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || '';
  const host = (first(req.headers['x-forwarded-host']) || first(req.headers.host)).split(',')[0].trim();
  if (host && !/^(localhost|127\.|0\.0\.0\.0|\[::1\])/i.test(host)) {
    return `https://${host}`;
  }
  const site = getPublicSiteUrl();
  return /^https:\/\//i.test(site) && !/localhost|127\.0\.0\.1/i.test(site) ? site : '';
}

/** Re-registers the bot webhook if needed so the admin's confirm/reject buttons reach this server. */
async function ensureWebhookQuietly(req: VercelRequest): Promise<void> {
  const base = resolveWebhookBaseUrl(req);
  if (!base) return;
  try {
    await Promise.race([
      ensurePaymentBotWebhook(base),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
  } catch (err: any) {
    console.warn('Telegram webhook ensure note:', err?.message || err);
  }
}

/** Max decoded image ~1.5MB; base64 string ceiling with margin under Vercel ~4.5MB body. */
const MAX_IMAGE_BASE64_CHARS = Math.ceil(1.5 * 1024 * 1024 * 1.4);
/** PDF via base64 must stay under ~3.2MB raw to fit Vercel body; larger PDFs use fileUrl (Storage). */
const MAX_PDF_BASE64_CHARS = Math.ceil(3.0 * 1024 * 1024 * 1.37);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    if (req.headers.authorization && !hasFirebaseAdmin()) {
      return res.status(500).json({
        success: false,
        error:
          getFirebaseAdminDiagnosticError() ||
          'Server Firebase Admin configuration is incomplete.',
      });
    }

    const authUser = await verifyBearerToken(req.headers.authorization);
    if (!authUser) {
      return res.status(401).json({
        success: false,
        error: "Chek yuborish uchun avval hisobingizga kiring (tasdiqlanmagan sessiya).",
      });
    }

    let parsedBody: Record<string, any> = {};
    if (typeof req.body === 'string') {
      try {
        parsedBody = JSON.parse(req.body);
      } catch {
        return res.status(400).json({ success: false, error: "So'rov formati noto'g'ri (JSON)." });
      }
    } else if (req.body && typeof req.body === 'object') {
      parsedBody = req.body;
    }

    const {
      orderId,
      invitationId,
      invitationSlug,
      templateId,
      templateSlug,
      customerName,
      customerPhone,
      templateName,
      planName,
      weddingDate,
      venueName,
      price,
      fileName,
      fileType,
      fileBase64,
      fileUrl,
      idempotencyKey,
    } = parsedBody;

    if (!orderId || (!fileBase64 && !fileUrl)) {
      return res.status(400).json({
        success: false,
        error: "Iltimos, buyurtma ma'lumotlari va chek faylini yuklang.",
      });
    }

    // Contact phone: client-entered number first, then the phone saved on the user's profile.
    let contactPhone =
      cleanAndValidateUzPhone(customerPhone ? String(customerPhone) : '') ||
      (await getVerifiedUserPhone(authUser.uid));
    if (!contactPhone) {
      const userRecord = await getUserRecord(authUser.uid);
      contactPhone = cleanAndValidateUzPhone(userRecord?.phone ? String(userRecord.phone) : '');
    }
    if (!contactPhone) {
      return res.status(400).json({
        success: false,
        error: "Iltimos, to'g'ri O'zbekiston telefon raqamini kiriting (+998 XX XXX XX XX).",
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

    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown';

    const headerIdem = req.headers['x-idempotency-key'];
    const resolvedIdem =
      typeof headerIdem === 'string'
        ? headerIdem
        : idempotencyKey
        ? String(idempotencyKey)
        : undefined;

    await ensureWebhookQuietly(req);

    const result = await processUploadReceipt({
      verifiedUid: authUser.uid,
      orderId: String(orderId),
      invitationId: invitationId ? String(invitationId) : undefined,
      invitationSlug: invitationSlug ? String(invitationSlug) : undefined,
      templateId: templateId ? String(templateId) : undefined,
      templateSlug: templateSlug ? String(templateSlug) : undefined,
      customerName: customerName ? String(customerName) : '',
      customerPhone: contactPhone,
      templateName: templateName ? String(templateName) : '',
      planName: planName ? String(planName) : undefined,
      weddingDate: weddingDate ? String(weddingDate) : '',
      venueName: venueName ? String(venueName) : '',
      price: Number(price) || 0,
      isPdf,
      fileName: fileName ? String(fileName) : undefined,
      fileType: fileType ? String(fileType) : undefined,
      fileBuffer,
      fileUrl: fileUrl ? String(fileUrl) : undefined,
      clientIp,
      idempotencyKey: resolvedIdem,
    });

    return res.status(result.statusCode).json(result.body);
  } catch (err: any) {
    console.error('Upload receipt handler error:', {
      message: err?.message,
      code: err?.code,
      stack: err?.stack,
    });
    return res.status(500).json({
      success: false,
      error: 'Serverda xatolik yuz berdi: ' + (err?.message || "Noma'lum xatolik"),
    });
  }
}
