import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env
dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '9168529420:AAFj9sqit5jp8Z7zEbj1YPVx-KMvjjbhHkc';
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '6464089189';
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || 'taklifim_secret_webhook_token_2026';

// In-memory store for orders and rate limits on the server
interface ServerOrderStore {
  orderId: string;
  invitationId?: string;
  invitationSlug?: string;
  customerName: string;
  customerPhone: string;
  templateName?: string;
  weddingDate?: string;
  venueName?: string;
  price: number;
  status: 'draft' | 'pending_payment' | 'pending_review' | 'paid' | 'rejected';
  receiptUrl?: string;
  telegramMessageId?: number;
  createdAt: string;
  updatedAt: string;
}

const ordersMemoryStore = new Map<string, ServerOrderStore>();
const rateLimitMap = new Map<string, number>();

// Rate limit helper: max 1 upload per 10 seconds per IP or phone
function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const lastTime = rateLimitMap.get(key) || 0;
  if (now - lastTime < 10000) {
    return false; // rate limited
  }
  rateLimitMap.set(key, now);
  return true;
}

// Telegram Callback Processor
async function handleTelegramUpdate(update: any) {
  if (!update || !update.callback_query) return;

  const callback = update.callback_query;
  const callbackId = callback.id;
  const callbackData = callback.data || '';
  const message = callback.message;

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
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackId,
          text: "Noma'lum buyurtma formati",
        }),
      });
    } catch {}
    return;
  }

  // Get order
  let order = ordersMemoryStore.get(orderId);
  if (!order) {
    try {
      const rtdbRes = await fetch(`https://teklifim-9dae7-default-rtdb.firebaseio.com/orders/${orderId}.json`);
      if (rtdbRes.ok) {
        const data = await rtdbRes.json();
        if (data) {
          order = {
            orderId: data.id || orderId,
            invitationId: data.invitationId,
            invitationSlug: data.invitationSlug,
            customerName: data.customerName || 'Mijoz',
            customerPhone: data.customerPhone || '',
            price: data.price || 0,
            status: data.status || 'pending_review',
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }
      }
    } catch {}
  }

  // Prevent double processing
  if (order && (order.status === 'paid' || order.status === 'rejected')) {
    const statusText = order.status === 'paid' ? "TASDIQLANGAN ✅" : "RAD ETILGAN ❌";
    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackId,
          text: `⚠️ Ushbu buyurtma allaqachon ${statusText}!`,
          show_alert: true,
        }),
      });
    } catch {}
    return;
  }

  const newStatus: 'paid' | 'rejected' = action === 'confirm' ? 'paid' : 'rejected';
  const nowIso = new Date().toISOString();

  if (order) {
    order.status = newStatus;
    order.updatedAt = nowIso;
    ordersMemoryStore.set(orderId, order);
  } else {
    ordersMemoryStore.set(orderId, {
      orderId,
      customerName: 'Mijoz',
      customerPhone: '',
      price: 0,
      status: newStatus,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  // Sync RTDB
  try {
    await fetch(`https://teklifim-9dae7-default-rtdb.firebaseio.com/orders/${orderId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        updatedAt: nowIso,
      }),
    });

    const invId = order?.invitationId;
    if (invId) {
      await fetch(`https://teklifim-9dae7-default-rtdb.firebaseio.com/invitations/${invId}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          updatedAt: nowIso,
        }),
      });
    }
  } catch (rtdbErr) {
    console.warn('RTDB sync warning:', rtdbErr);
  }

  // Edit TG message
  const adminName = `${callback.from?.first_name || ''} ${callback.from?.last_name || ''}`.trim() || 'Admin';
  const originalCaption = message?.caption || message?.text || '';
  const statusBadge = action === 'confirm'
    ? `\n\n✅ <b>TO'LOV TASDIQLANDI</b> (Admin: ${adminName})`
    : `\n\n❌ <b>TO'LOV RAD ETILDI</b> (Admin: ${adminName})`;

  const updatedCaption = originalCaption + statusBadge;

  try {
    if (message?.caption !== undefined) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageCaption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: message.chat.id,
          message_id: message.message_id,
          caption: updatedCaption,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: [] },
        }),
      });
    } else if (message?.message_id) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: message.chat.id,
          message_id: message.message_id,
          text: updatedCaption,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: [] },
        }),
      });
    }
  } catch (e) {
    console.error('Error editing message:', e);
  }

  // Answer callback
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackId,
        text: action === 'confirm' ? "✅ To'lov muvaffaqiyatli tasdiqlandi!" : "❌ To'lov rad etildi!",
        show_alert: true,
      }),
    });
  } catch (e) {
    console.error('Error answering callback:', e);
  }
}

// Telegram long-polling loop
let lastUpdateId = 0;
let isPollingStarted = false;

function startTelegramLongPolling() {
  if (isPollingStarted) return;
  isPollingStarted = true;
  console.log('🤖 Telegram Bot getUpdates long-polling xizmati faollashtirildi...');

  // Clear webhook first so getUpdates works reliably
  fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`, { method: 'POST' }).catch(() => {});

  const poll = async () => {
    try {
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=5&allowed_updates=["callback_query","message"]`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            lastUpdateId = Math.max(lastUpdateId, Number(update.update_id));
            await handleTelegramUpdate(update);
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setTimeout(poll, 1500);
    }
  };

  poll();
}

async function startServer() {
  const app = express();

  // Increase payload size to 15MB for receipt images/PDFs
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // -------------------------------------------------------------
  // API ROUTE 1: Upload Payment Receipt
  // -------------------------------------------------------------
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
      } = req.body;

      if (!orderId || !customerPhone || !fileBase64) {
        return res.status(400).json({
          success: false,
          error: "Barcha majburiy maydonlar va chek fayli kiritilishi shart.",
        });
      }

      // Check rate limit
      const clientKey = `${req.ip}_${customerPhone}`;
      if (!checkRateLimit(clientKey)) {
        return res.status(429).json({
          success: false,
          error: "Juda ko'p so'rov yuborildi. Iltimos, 10 soniya kutib qayta urinib ko'ring.",
        });
      }

      // File size validation (10MB base64 approx ~14MB string length)
      if (fileBase64.length > 14 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          error: "Chek fayli hajmi 10 MB dan oshmasligi kerak.",
        });
      }

      // Convert base64 string to Buffer
      const base64Data = fileBase64.replace(/^data:[^;]+;base64,/, '');
      const fileBuffer = Buffer.from(base64Data, 'base64');

      const isPdf = fileType === 'application/pdf' || (fileName && fileName.endsWith('.pdf'));
      const isPhoto = !isPdf;

      // Prepare order object
      const nowIso = new Date().toISOString();
      const existing = ordersMemoryStore.get(orderId);
      const orderData: ServerOrderStore = {
        orderId,
        invitationId: invitationId || existing?.invitationId,
        invitationSlug: invitationSlug || existing?.invitationSlug,
        customerName: customerName || 'Mijoz',
        customerPhone: customerPhone || '+998',
        templateName: templateName || 'Standart Shablon',
        weddingDate: weddingDate || '-',
        venueName: venueName || '-',
        price: Number(price) || 180000,
        status: 'pending_review',
        createdAt: existing?.createdAt || nowIso,
        updatedAt: nowIso,
      };

      ordersMemoryStore.set(orderId, orderData);

      // Format caption for Telegram notification
      const formattedPrice = new Intl.NumberFormat('uz-UZ').format(orderData.price);
      const formattedDate = new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' });

      const captionHtml =
        `🧾 <b>YANGI TO'LOV CHEKI #${orderData.orderId}</b>\n\n` +
        `👤 <b>Mijoz:</b> ${orderData.customerName}\n` +
        `📞 <b>Telefon:</b> ${orderData.customerPhone}\n` +
        `🎨 <b>Shablon:</b> ${orderData.templateName}\n` +
        `📅 <b>To'y sanasi:</b> ${orderData.weddingDate}\n` +
        `📍 <b>To'yxona:</b> ${orderData.venueName}\n` +
        `💰 <b>To'lov summasi:</b> ${formattedPrice} so'm\n` +
        `💳 <b>Karta:</b> 5614 6822 0920 2581 (ABDULLA DEDAXANOV)\n` +
        `⏱ <b>Yuklangan vaqt:</b> ${formattedDate}\n\n` +
        `👇 <i>Iltimos, to'lovni tasdiqlang yoki rad eting:</i>`;

      const inlineKeyboard = {
        inline_keyboard: [
          [
            { text: "✅ To'lovni tasdiqlash", callback_data: `confirm_${orderData.orderId}` },
            { text: "❌ Rad etish", callback_data: `reject_${orderData.orderId}` },
          ],
        ],
      };

      // Send to Telegram Admin using native fetch and FormData
      const formData = new FormData();
      formData.append('chat_id', TELEGRAM_ADMIN_CHAT_ID);
      formData.append('caption', captionHtml);
      formData.append('parse_mode', 'HTML');
      formData.append('reply_markup', JSON.stringify(inlineKeyboard));

      const fileBlob = new Blob([fileBuffer], { type: isPdf ? 'application/pdf' : (fileType || 'image/jpeg') });
      const fieldName = isPdf ? 'document' : 'photo';
      const fileExt = isPdf ? '.pdf' : '.jpg';
      formData.append(fieldName, fileBlob, fileName || `receipt_${orderData.orderId}${fileExt}`);

      const tgMethod = isPdf ? 'sendDocument' : 'sendPhoto';
      const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${tgMethod}`, {
        method: 'POST',
        body: formData,
      });

      const tgData = await tgRes.json();

      if (!tgData.ok) {
        console.error('Telegram Bot API Error:', tgData);
        return res.status(500).json({
          success: false,
          error: "Telegram botga xabar yuborishda xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.",
        });
      }

      // Store message_id to edit message later upon callback
      orderData.telegramMessageId = tgData.result?.message_id;
      ordersMemoryStore.set(orderId, orderData);

      // Sync to Firebase Realtime Database as well
      try {
        await fetch(`https://teklifim-9dae7-default-rtdb.firebaseio.com/orders/${orderId}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'pending_review',
            updatedAt: nowIso,
          }),
        });
        if (orderData.invitationId) {
          await fetch(`https://teklifim-9dae7-default-rtdb.firebaseio.com/invitations/${orderData.invitationId}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'pending_review',
              updatedAt: nowIso,
            }),
          });
        }
      } catch (rtdbErr) {
        console.warn('RTDB sync warning:', rtdbErr);
      }

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
        error: "Serverda xatolik yuz berdi: " + (err.message || 'Noma\'lum xatolik'),
      });
    }
  });

  // -------------------------------------------------------------
  // API ROUTE 2: Get Order Status
  // -------------------------------------------------------------
  app.get('/api/payment/status/:orderId', async (req: Request, res: Response) => {
    try {
      const orderId = req.params.orderId;
      let order = ordersMemoryStore.get(orderId);

      // Fallback check from RTDB if memory store misses
      if (!order) {
        try {
          const rtdbRes = await fetch(`https://teklifim-9dae7-default-rtdb.firebaseio.com/orders/${orderId}.json`);
          if (rtdbRes.ok) {
            const data = await rtdbRes.json();
            if (data && data.status) {
              order = {
                orderId: data.id || orderId,
                customerName: data.customerName || 'Mijoz',
                customerPhone: data.customerPhone || '',
                price: data.price || 0,
                status: data.status,
                invitationId: data.invitationId,
                invitationSlug: data.invitationSlug,
                createdAt: data.createdAt || new Date().toISOString(),
                updatedAt: data.updatedAt || new Date().toISOString(),
              };
              ordersMemoryStore.set(orderId, order);
            }
          }
        } catch {
          /* ignore */
        }
      }

      if (!order) {
        return res.status(404).json({
          success: false,
          error: "Buyurtma topilmadi.",
        });
      }

      return res.json({
        success: true,
        orderId: order.orderId,
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
        error: err.message || "Xatolik yuz berdi",
      });
    }
  });

  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // API ROUTE 3: Telegram Webhook Callback Handler
  // -------------------------------------------------------------
  app.post('/api/telegram/webhook', async (req: Request, res: Response) => {
    try {
      const secretHeader = req.headers['x-telegram-bot-api-secret-token'];
      if (secretHeader && secretHeader !== TELEGRAM_WEBHOOK_SECRET) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const update = req.body;
      if (update) {
        await handleTelegramUpdate(update);
      }

      return res.status(200).json({ status: 'ok' });
    } catch (err: any) {
      console.error('Telegram webhook handler error:', err);
      return res.status(500).json({ error: err.message || "Webhook error" });
    }
  });

  // Helper route to check or trigger setWebhook
  app.get('/api/telegram/set-webhook', async (req: Request, res: Response) => {
    try {
      const host = req.headers.host;
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const webhookUrl = `${protocol}://${host}/api/telegram/webhook`;

      const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          secret_token: TELEGRAM_WEBHOOK_SECRET,
        }),
      });

      const data = await tgRes.json();
      return res.json({ webhookUrl, telegramResponse: data });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Mount Vite development middlewares or static files
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
    // Production static files
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Taklifim Full-Stack Server Port ${PORT} da muvaffaqiyatli ishga tushdi!`);
    startTelegramLongPolling();
  });
}

startServer();
