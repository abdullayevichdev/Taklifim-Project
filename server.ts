/**
 * Local development server (Express + Vite).
 * Production on Vercel uses /api/* serverless functions — no long-polling.
 */
import express, { Request, Response } from 'express';
import http from 'node:http';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  getAuthorizedOrderForUser,
  getFirebaseAdminDiagnosticError,
  getUserRecord,
  getVerifiedUserPhone,
  hasFirebaseAdmin,
  verifyBearerToken,
} from './api/_lib/firebaseAdmin.js';
import { sendTemplateErrorAlertToTelegram } from './api/_lib/telegram.js';
import { cleanAndValidateUzPhone } from './api/_lib/phone.js';
import { processUploadReceipt } from './api/_lib/uploadReceiptService.js';
import { checkRateLimit } from './api/_lib/rateLimit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

const MAX_IMAGE_BASE64_CHARS = Math.ceil(1.5 * 1024 * 1024 * 1.4);
const MAX_PDF_BASE64_CHARS = Math.ceil(3.0 * 1024 * 1024 * 1.37);

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  app.post('/api/admin/login', async (req: Request, res: Response) => {
    try {
      const { default: h } = await import('./api/_lib/admin/login.js');
      return await h(req as any, res as any);
    } catch {
      return res.status(500).json({ ok: false, error: 'ADMIN_ROUTE_FAILED' });
    }
  });

  app.post('/api/admin/action', async (req: Request, res: Response) => {
    try {
      const { default: h } = await import('./api/_lib/admin/action.js');
      return await h(req as any, res as any);
    } catch {
      return res.status(500).json({ ok: false, error: 'ADMIN_ROUTE_FAILED' });
    }
  });

  app.get('/api/admin/data', async (req: Request, res: Response) => {
    try {
      const { default: h } = await import('./api/_lib/admin/data.js');
      return await h(req as any, res as any);
    } catch {
      return res.status(500).json({ ok: false, error: 'ADMIN_ROUTE_FAILED' });
    }
  });

  app.post('/api/auth/phone', async (req: Request, res: Response) => {
    try {
      const { default: h } = await import('./api/auth/phone.js');
      return await h(req as any, res as any);
    } catch {
      return res.status(500).json({ ok: false, error: 'PHONE_AUTH_FAILED' });
    }
  });

  app.get('/api/maps/resolve', async (req: Request, res: Response) => {
    try {
      const { default: resolveHandler } = await import('./api/maps/resolve.js');
      return await resolveHandler(req as any, res as any);
    } catch {
      return res.status(500).json({ ok: false, error: 'RESOLVE_FAILED' });
    }
  });

  app.all('/api/health/config', async (req: Request, res: Response) => {
    try {
      const { default: healthHandler } = await import('./api/health/config.js');
      return await healthHandler(req as any, res as any);
    } catch {
      return res.status(500).json({
        ok: false,
        code: 'HEALTH_CHECK_FAILED',
      });
    }
  });

  app.post('/api/payment/upload-receipt', async (req: Request, res: Response) => {
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
      } = req.body || {};

      if (!orderId || (!fileBase64 && !fileUrl)) {
        return res.status(400).json({
          success: false,
          error: "Iltimos, buyurtma ma'lumotlari va chek faylini yuklang.",
        });
      }

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
              "PDF hajmi so'rov limitidan oshib ketdi. Iltimos 3 MB dan kichik PDF yuklang.",
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
        templateId: order.templateId,
        templateSlug: order.templateSlug,
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

  app.post(['/api/telegram/webhook', '/api/telegram/login-webhook'], async (req: Request, res: Response) => {
    try {
      const { default: webhookHandler } = await import('./api/telegram/webhook.js');
      return await webhookHandler(req as any, res as any);
    } catch {
      return res.status(200).json({ status: 'ok' });
    }
  });

  app.all('/api/telegram/setup-webhook', async (req: Request, res: Response) => {
    try {
      const { default: setupHandler } = await import('./api/telegram/setup-webhook.js');
      return await setupHandler(req as any, res as any);
    } catch {
      return res.status(500).json({ ok: false, error: 'Setup webhook failed' });
    }
  });

  app.post('/api/telegram/template-alert', async (req: Request, res: Response) => {
    try {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const source = String(body.source || '').trim().slice(0, 60);
      if (!source) {
        return res.status(400).json({ ok: false, error: 'Missing source' });
      }
      const templateId = String(body.templateId || '').trim().slice(0, 100);
      const templateSlug = String(body.templateSlug || '').trim().slice(0, 100);
      const invitationId = String(body.invitationId || '').trim().slice(0, 100);
      const invitationSlug = String(body.invitationSlug || '').trim().slice(0, 100);
      const routePath = String(body.routePath || '').trim().slice(0, 180);

      const rateKey = `tpl_alert:${req.ip || 'local'}:${source}:${templateSlug}:${templateId}:${invitationId}`;
      if (!checkRateLimit(rateKey, 60_000)) {
        return res.status(200).json({ ok: true, deduplicated: true });
      }

      const result = await sendTemplateErrorAlertToTelegram({
        source,
        templateId,
        templateSlug,
        invitationId,
        invitationSlug,
        routePath,
      });
      return res.status(200).json(result);
    } catch {
      return res.status(200).json({ ok: false });
    }
  });

  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
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
    app.use(
      '/video',
      express.static(path.resolve(__dirname, 'dist/video'), {
        immutable: true,
        maxAge: '365d',
      })
    );
    app.use(express.static(path.resolve(__dirname, 'dist'), { redirect: false }));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 TASHRIFIM local server Port ${PORT} (Telegram to'lov boti = webhook, long-polling yo'q)`);
  });
}

startServer();
