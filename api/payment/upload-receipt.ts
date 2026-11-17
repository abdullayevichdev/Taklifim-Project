import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyBearerToken } from '../_lib/firebaseAdmin.js';
import { cleanAndValidateUzPhone } from '../_lib/phone.js';
import { processUploadReceipt } from '../_lib/uploadReceiptService.js';

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

    const cleanPhone = cleanAndValidateUzPhone(customerPhone);
    if (!orderId || !cleanPhone || (!fileBase64 && !fileUrl)) {
      return res.status(400).json({
        success: false,
        error: "Iltimos, to'g'ri O'zbekiston telefon raqamini kiriting (+998 XX XXX XX XX) va chek faylini yuklang.",
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

    const result = await processUploadReceipt({
      verifiedUid: authUser.uid,
      orderId: String(orderId),
      invitationId: invitationId ? String(invitationId) : undefined,
      invitationSlug: invitationSlug ? String(invitationSlug) : undefined,
      templateId: templateId ? String(templateId) : undefined,
      templateSlug: templateSlug ? String(templateSlug) : undefined,
      customerName: customerName ? String(customerName) : '',
      customerPhone: cleanPhone,
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
