import type { VercelRequest, VercelResponse } from '../_lib/http.js';
import { getAdminAuth, getRtdb, hasFirebaseAdmin } from '../_lib/firebaseAdmin.js';
import { checkExternalRateLimit } from '../_lib/rateLimit.js';
import { getClientIp } from '../_lib/adminAuth.js';
import { getPaymentTelegramConfig } from '../_lib/env.js';
import { sendTelegramBotMessage } from '../_lib/telegram.js';
import { writeAdminAudit } from '../_lib/siteConfig.js';
import {
  MAX_FAILED_PINS,
  PIN_LOCK_MS,
  cleanOptionalEmail,
  cleanPersonName,
  formatUzPhone,
  hashPin,
  normalizeUzPhoneDigits,
  phoneUid,
  validatePin,
  verifyPin,
} from '../_lib/phoneAuth.js';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function notifyAdmin(text: string) {
  const { adminChatId } = getPaymentTelegramConfig();
  if (!adminChatId || adminChatId === 'MOCK_ADMIN_CHAT_ID') return;
  try {
    await sendTelegramBotMessage(adminChatId, text, { parseMode: 'HTML', timeoutMs: 4000 });
  } catch {
    /* non-fatal */
  }
}

async function issueToken(uid: string, displayName: string): Promise<string> {
  const auth = getAdminAuth();
  if (!auth) throw new Error('Firebase Admin is not configured.');
  try {
    await auth.getUser(uid);
    await auth.updateUser(uid, { displayName });
  } catch (err: any) {
    if (err?.code === 'auth/user-not-found') await auth.createUser({ uid, displayName });
    else throw err;
  }
  return auth.createCustomToken(uid, { provider: 'phone' });
}

/**
 * POST { mode: 'register', firstName, lastName, phone, email?, pin }
 * POST { mode: 'login', phone, pin }
 * → { ok, token, name } — the client signs in with the Firebase custom token.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!hasFirebaseAdmin()) return res.status(503).json({ ok: false, error: 'Server vaqtincha ishlamayapti. Keyinroq urinib ko‘ring.' });

  let body: any = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  const ip = getClientIp(req.headers as any, req.socket?.remoteAddress || 'unknown');
  const db = getRtdb();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  const phone = normalizeUzPhoneDigits(body?.phone);
  if (!phone) return res.status(400).json({ ok: false, error: 'Telefon raqamni +998 XX XXX XX XX ko‘rinishida kiriting.' });

  /* ------------------------------------------------------------ register */
  if (body?.mode === 'register') {
    const limit = await checkExternalRateLimit({ key: `phone-register:${ip}`, limit: 5, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) return res.status(429).json({ ok: false, error: 'Juda ko‘p urinish. Birozdan keyin qayta urinib ko‘ring.' });

    const firstName = cleanPersonName(body.firstName);
    const lastName = cleanPersonName(body.lastName);
    const email = cleanOptionalEmail(body.email);
    const pinCheck = validatePin(body.pin);
    if (!firstName) return res.status(400).json({ ok: false, error: 'Ismingizni to‘g‘ri kiriting (kamida 2 harf).' });
    if (!lastName) return res.status(400).json({ ok: false, error: 'Familiyangizni to‘g‘ri kiriting (kamida 2 harf).' });
    if (email === null) return res.status(400).json({ ok: false, error: 'Email manzil noto‘g‘ri.' });
    if (!pinCheck.ok) return res.status(400).json({ ok: false, error: pinCheck.error });

    const uid = phoneUid(phone);
    const name = `${firstName} ${lastName}`;
    const record = {
      uid,
      firstName,
      lastName,
      ...(email ? { email } : {}),
      pinHash: hashPin(pinCheck.pin),
      failedAttempts: 0,
      createdAt: nowIso,
      lastLoginAt: nowIso,
      createdIp: ip,
    };

    // Atomic: only one registration per phone number.
    const tx = await db.ref(`phoneAccounts/${phone}`).transaction((cur) => (cur ? undefined : record));
    if (!tx.committed) {
      return res.status(409).json({
        ok: false,
        code: 'PHONE_TAKEN',
        error: 'Bu raqam allaqachon ro‘yxatdan o‘tgan. «Kirish» bo‘limida PIN bilan kiring.',
      });
    }

    await db.ref(`users/${uid}`).update({
      id: uid,
      name,
      firstName,
      lastName,
      phone: `+${phone}`,
      phoneVerified: false,
      ...(email ? { email } : {}),
      authProvider: 'phone',
      createdAt: nowIso,
      lastLoginAt: nowIso,
    });

    let token: string;
    try {
      token = await issueToken(uid, name);
    } catch (err: any) {
      await db.ref(`phoneAccounts/${phone}`).remove().catch(() => {});
      console.error('Phone register token error:', err?.message || err);
      return res.status(500).json({ ok: false, error: 'Akkaunt yaratib bo‘lmadi. Qayta urinib ko‘ring.' });
    }

    await Promise.all([
      notifyAdmin(
        `🍏 <b>Yangi foydalanuvchi</b> (Apple orqali)\n` +
          `👤 ${esc(name)}\n` +
          `📞 ${formatUzPhone(phone)}\n` +
          (email ? `✉️ ${esc(email)}\n` : '') +
          `🕒 ${new Date(now).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}`
      ),
      writeAdminAudit({ type: 'phone.register', target: `+${phone}`, detail: name, ip }),
    ]);
    return res.json({ ok: true, token, name, isNew: true });
  }

  /* --------------------------------------------------------------- login */
  if (body?.mode === 'login') {
    const limit = await checkExternalRateLimit({ key: `phone-login:${ip}`, limit: 20, windowMs: 15 * 60 * 1000 });
    if (!limit.allowed) return res.status(429).json({ ok: false, error: 'Juda ko‘p urinish. 15 daqiqadan keyin qayta urinib ko‘ring.' });

    const pin = String(body.pin ?? '').trim();
    const snap = await db.ref(`phoneAccounts/${phone}`).get();
    const acc = snap.val();
    if (!acc) {
      return res.status(404).json({
        ok: false,
        code: 'NOT_FOUND',
        error: 'Bu raqam bilan akkaunt topilmadi. «Ro‘yxatdan o‘tish» bo‘limiga o‘ting.',
      });
    }
    if (typeof acc.lockedUntil === 'number' && acc.lockedUntil > now) {
      const min = Math.ceil((acc.lockedUntil - now) / 60000);
      return res.status(423).json({ ok: false, error: `Ko‘p marta noto‘g‘ri PIN kiritildi. ${min} daqiqadan keyin urinib ko‘ring.` });
    }
    if (!/^\d{4}$/.test(pin) || !verifyPin(pin, acc.pinHash)) {
      const failed = (Number(acc.failedAttempts) || 0) + 1;
      const locked = failed >= MAX_FAILED_PINS;
      await db.ref(`phoneAccounts/${phone}`).update({
        failedAttempts: locked ? 0 : failed,
        ...(locked ? { lockedUntil: now + PIN_LOCK_MS } : {}),
      });
      if (locked) {
        await notifyAdmin(`⚠️ <b>${formatUzPhone(phone)}</b> akkauntiga 5 marta noto‘g‘ri PIN kiritildi — 15 daqiqaga bloklandi.\nIP: <code>${esc(ip)}</code>`);
        return res.status(423).json({ ok: false, error: 'Ko‘p marta noto‘g‘ri PIN kiritildi. 15 daqiqadan keyin urinib ko‘ring.' });
      }
      const left = MAX_FAILED_PINS - failed;
      return res.status(401).json({ ok: false, error: `PIN noto‘g‘ri. Yana ${left} ta urinish qoldi.` });
    }

    const name = `${acc.firstName || ''} ${acc.lastName || ''}`.trim() || formatUzPhone(phone);
    await Promise.all([
      db.ref(`phoneAccounts/${phone}`).update({ failedAttempts: 0, lockedUntil: null, lastLoginAt: nowIso }),
      db.ref(`users/${acc.uid}`).update({ lastLoginAt: nowIso }),
    ]);
    try {
      const token = await issueToken(acc.uid, name);
      return res.json({ ok: true, token, name, isNew: false });
    } catch (err: any) {
      console.error('Phone login token error:', err?.message || err);
      return res.status(500).json({ ok: false, error: 'Kirib bo‘lmadi. Qayta urinib ko‘ring.' });
    }
  }

  return res.status(400).json({ ok: false, error: 'Noto‘g‘ri so‘rov.' });
}
