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
  getOrder,
  updateInvitationStatus,
  upsertOrder,
} from './api/_lib/firebaseAdmin.js';
import { checkRateLimit } from './api/_lib/rateLimit.js';
import { handleTelegramUpdate, sendReceiptToTelegram } from './api/_lib/telegram.js';
import { getTelegramConfig } from './api/_lib/env.js';

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

      const clientKey = `${req.ip}_${customerPhone}`;
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
  });

  app.get('/api/payment/status/:orderId', async (req: Request, res: Response) => {
    try {
      const orderId = req.params.orderId;
      const order = await getOrder(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Buyurtma topilmadi.',
        });
      }

      return res.json({
        success: true,
        orderId: order.id || orderId,
        status: order.status,
        invitationId: order.invitationId,
        invitationSlug: order.invitationSlug,
        customerName: order.customerName,
        price: order.price,
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
