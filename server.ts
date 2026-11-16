/**
 * Local development server (Express + Vite).
 * Production on Vercel uses /api/* serverless functions — no long-polling.
 */
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  getAuthorizedOrderForUser,
  verifyBearerToken,
} from './api/_lib/firebaseAdmin.js';
import { handleTelegramUpdate } from './api/_lib/telegram.js';
import { getTelegramConfig } from './api/_lib/env.js';
import { cleanAndValidateUzPhone } from './api/_lib/phone.js';
import { processUploadReceipt } from './api/_lib/uploadReceiptService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

const MAX_IMAGE_BASE64_CHARS = Math.ceil(1.5 * 1024 * 1024 * 1.4);
const MAX_PDF_BASE64_CHARS = Math.ceil(3.2 * 1024 * 1024 * 1.37);

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  app.post('/api/payment/upload-receipt', async (req: Request, res: Response) => {
    try {
      const authUser = await verifyBearerToken(req.headers.authorization);
      if (!authUser) {
        return res.status(401).json({
          success: false,
          error: "Chek yuborish uchun avval hisobingizga kiring (tasdiqlanmagan sessiya).",
        });
      }

      const {
        orderId,
        invitationId,
        invitationSlug,
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
      } = req.body || {};

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
              "PDF hajmi so'rov limitidan oshib ketdi. Iltimos 4 MB dan kichik PDF yuklang.",
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
        clientIp: req.ip,
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
  });

  app.get('/api/payment/status/:orderId', async (req: Request, res: Response) => {
    try {
      const authUser = await verifyBearerToken(req.headers.authorization);
      if (!authUser) {
        return res.status(401).json({
          success: false,
          error: 'Buyurtma holatini ko‘rish uchun tizimga kiring.',
        });
      }

      const orderId = String(req.params.orderId || '');
      if (!orderId) {
        return res.status(400).json({ success: false, error: 'orderId majburiy' });
      }

      const result = await getAuthorizedOrderForUser(orderId, authUser.uid);
      if ('error' in result) {
        return res.status(result.statusCode).json({
          success: false,
          error: result.error,
        });
      }

      const { order } = result;
      return res.json({
        success: true,
        orderId: order.id || orderId,
        status: order.status,
        invitationId: order.invitationId,
        invitationSlug: order.invitationSlug,
        customerName: order.customerName,
        templateName: order.templateName,
        weddingDate: order.weddingDate,
        venueName: order.venueName,
        price: order.price,
        receiptSentAt: order.receiptSentAt || order.submittedAt || order.createdAt,
        decidedAt: order.decidedAt || order.reviewedAt,
        rejectReason: order.rejectReason,
        updatedAt: order.updatedAt,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err.message || 'Xatolik yuz berdi',
      });
    }
  });

  app.post('/api/telegram/webhook', async (req: Request, res: Response) => {
    try {
      const { webhookSecret } = getTelegramConfig();
      const secretHeader = req.headers['x-telegram-bot-api-secret-token'];
      if (!secretHeader || secretHeader !== webhookSecret) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      if (req.body) {
        await handleTelegramUpdate(req.body);
      }
      return res.status(200).json({ status: 'ok' });
    } catch (err: any) {
      console.error('Telegram webhook handler error:', err);
      return res.status(500).json({ error: err.message || 'Webhook error' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });

    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Taklifim local server Port ${PORT} (Telegram = webhook, long-polling yo'q)`);
  });
}

startServer();
