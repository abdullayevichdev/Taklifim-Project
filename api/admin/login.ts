import type { VercelRequest, VercelResponse } from '../_lib/http.js';
import {
  createAdminSessionToken,
  getClientIp,
  isAdminCodeConfigured,
  verifyAdminCode,
} from '../_lib/adminAuth.js';
import { checkExternalRateLimit } from '../_lib/rateLimit.js';
import { hasFirebaseAdmin } from '../_lib/firebaseAdmin.js';
import { getPaymentTelegramConfig } from '../_lib/env.js';
import { sendTelegramBotMessage } from '../_lib/telegram.js';

const PER_IP = { limit: 5, windowMs: 15 * 60 * 1000 };
const GLOBAL = { limit: 30, windowMs: 24 * 60 * 60 * 1000 };

async function notifyAdminChat(text: string): Promise<void> {
  const { adminChatId } = getPaymentTelegramConfig();
  if (!adminChatId || adminChatId === 'MOCK_ADMIN_CHAT_ID') return;
  try {
    await sendTelegramBotMessage(adminChatId, text, { parseMode: 'HTML', timeoutMs: 4000 });
  } catch {
    /* non-fatal */
  }
}

/** POST { code } → { ok, token, expiresAt } — exchanges the admin code for a Firebase custom token. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!isAdminCodeConfigured() || !hasFirebaseAdmin()) {
    return res.status(503).json({ ok: false, error: 'Admin panel serverda sozlanmagan.' });
  }

  const ip = getClientIp(req.headers as any, req.socket?.remoteAddress || 'unknown');
  const [perIp, global] = await Promise.all([
    checkExternalRateLimit({ key: `admin-login:ip:${ip}`, ...PER_IP }),
    checkExternalRateLimit({ key: 'admin-login:global', ...GLOBAL }),
  ]);
  if (!perIp.allowed || !global.allowed) {
    const retryMin = Math.max(1, Math.ceil(((perIp.allowed ? global : perIp).resetAt - Date.now()) / 60000));
    return res.status(429).json({ ok: false, error: `Juda ko‘p urinish. ${retryMin} daqiqadan keyin qayta urinib ko‘ring.` });
  }

  let body: any = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  if (!verifyAdminCode(body?.code)) {
    if (perIp.remaining <= 1) {
      await notifyAdminChat(`⚠️ <b>Admin panel</b>: noto‘g‘ri kod bilan bir necha marta kirishga urinildi.\nIP: <code>${ip}</code>`);
    }
    return res.status(401).json({ ok: false, error: 'Kod noto‘g‘ri.' });
  }

  try {
    const { token, expiresAt } = await createAdminSessionToken();
    await notifyAdminChat(
      `🔐 <b>Admin panelga kirildi</b>\nIP: <code>${ip}</code>\nVaqt: ${new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}`
    );
    return res.status(200).json({ ok: true, token, expiresAt });
  } catch (err: any) {
    console.error('Admin token error:', err?.message || err);
    return res.status(500).json({ ok: false, error: 'Sessiya yaratib bo‘lmadi.' });
  }
}
