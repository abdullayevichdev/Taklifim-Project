import type { VercelRequest, VercelResponse } from '../_lib/http.js';
import { verifyAdminRequest } from '../_lib/adminAuth.js';
import { decideOrderPayment, getOrder, getRtdb, hasFirebaseAdmin } from '../_lib/firebaseAdmin.js';
import { markTelegramReceiptDecided } from '../_lib/telegram.js';
import { getClientIp } from '../_lib/adminAuth.js';
import { invalidateServerSiteSettings, writeAdminAudit } from '../_lib/siteConfig.js';

const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;

type ActionBody =
  | { type: 'order.decide'; orderId: string; decision: 'paid' | 'rejected'; reason?: string }
  | { type: 'invitation.setStatus'; invitationId: string; status: 'paid' | 'pending_payment' }
  | { type: 'invitation.delete'; invitationId: string }
  | { type: 'message.setStatus'; messageId: string; status: 'new' | 'read' | 'replied' }
  | { type: 'message.delete'; messageId: string }
  | {
      type: 'settings.update';
      settings: { phone?: string; ownerName?: string; cardNumber?: string; cardHolder?: string; cardBank?: string };
    }
  | {
      type: 'template.update';
      slug: string;
      price?: number | null;
      hidden?: boolean;
      isPopular?: boolean;
      isNew?: boolean;
    }
  | { type: 'music.add'; id: string; title: string; url: string; storagePath: string }
  | { type: 'music.update'; id: string; title?: string; hidden?: boolean }
  | { type: 'music.delete'; id: string; builtin?: boolean }
  | { type: 'music.setDefault'; id: string }
  | { type: 'music.reorder'; ids: string[] };

const MUSIC_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const STORAGE_BUCKET = (process.env.FIREBASE_STORAGE_BUCKET || 'teklifim-9dae7.firebasestorage.app').trim();

/** POST admin actions. Every request must carry a live admin-session ID token. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!hasFirebaseAdmin()) return res.status(503).json({ ok: false, error: 'Server sozlanmagan.' });
  if (!(await verifyAdminRequest(req.headers.authorization))) {
    return res.status(401).json({ ok: false, error: 'Admin sessiyasi tugagan. Kodni qayta kiriting.' });
  }

  let body: ActionBody;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ ok: false, error: 'Noto‘g‘ri so‘rov.' });
  }

  const db = getRtdb();
  const nowIso = new Date().toISOString();
  const ip = getClientIp(req.headers as any, req.socket?.remoteAddress || '');
  const audit = (target: string, detail?: string) =>
    writeAdminAudit({ type: String((body as any)?.type || 'unknown'), target, detail, ip });

  try {
    switch (body?.type) {
      case 'order.decide': {
        if (!SAFE_ID.test(body.orderId) || (body.decision !== 'paid' && body.decision !== 'rejected')) break;
        const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : undefined;
        const result = await decideOrderPayment({
          orderId: body.orderId,
          decision: body.decision,
          adminName: 'Admin panel',
          rejectReason: reason,
        });
        if (result.alreadyDecided) {
          return res.status(409).json({
            ok: false,
            error: `Bu buyurtma allaqachon ${result.existingStatus === 'paid' ? 'tasdiqlangan' : 'rad etilgan'}.`,
          });
        }
        const order = await getOrder(body.orderId);
        await markTelegramReceiptDecided({
          messageId: typeof order?.telegramMessageId === 'number' ? order.telegramMessageId : undefined,
          orderId: body.orderId,
          decision: body.decision,
          reason,
        });
        await audit(body.orderId, body.decision === 'paid' ? 'Tasdiqlandi' : `Rad etildi${reason ? `: ${reason}` : ''}`);
        return res.json({ ok: true });
      }

      case 'invitation.setStatus': {
        if (!SAFE_ID.test(body.invitationId) || (body.status !== 'paid' && body.status !== 'pending_payment')) break;
        const snap = await db.ref(`invitations/${body.invitationId}`).get();
        if (!snap.exists()) return res.status(404).json({ ok: false, error: 'Taklifnoma topilmadi.' });
        const inv = snap.val() || {};
        const updates: Record<string, unknown> = {
          [`invitations/${body.invitationId}/status`]: body.status,
          [`invitations/${body.invitationId}/paymentStatus`]: body.status,
          [`invitations/${body.invitationId}/updatedAt`]: nowIso,
        };
        if (body.status === 'paid') {
          updates[`invitations/${body.invitationId}/decidedAt`] = nowIso;
          if (inv.slug) updates[`slugs/${String(inv.slug).toLowerCase()}`] = body.invitationId;
        }
        if (inv.orderId && SAFE_ID.test(String(inv.orderId))) {
          updates[`orders/${inv.orderId}/status`] = body.status;
          updates[`orders/${inv.orderId}/updatedAt`] = nowIso;
          const owner = inv.ownerUid || inv.ownerId;
          if (owner && SAFE_ID.test(String(owner))) updates[`userOrders/${owner}/${inv.orderId}`] = body.status;
        }
        await db.ref().update(updates);
        await audit(body.invitationId, body.status === 'paid' ? 'Faollashtirildi' : 'Nofaol qilindi');
        return res.json({ ok: true });
      }

      case 'invitation.delete': {
        if (!SAFE_ID.test(body.invitationId)) break;
        const snap = await db.ref(`invitations/${body.invitationId}`).get();
        const inv = snap.exists() ? snap.val() || {} : {};
        const updates: Record<string, unknown> = { [`invitations/${body.invitationId}`]: null };
        if (inv.slug) {
          const slugSnap = await db.ref(`slugs/${String(inv.slug).toLowerCase()}`).get();
          if (slugSnap.val() === body.invitationId) updates[`slugs/${String(inv.slug).toLowerCase()}`] = null;
        }
        await db.ref().update(updates);
        await audit(body.invitationId, `O‘chirildi${inv.hostNames ? `: ${inv.hostNames}` : ''}`);
        return res.json({ ok: true });
      }

      case 'message.setStatus': {
        if (!SAFE_ID.test(body.messageId) || !['new', 'read', 'replied'].includes(body.status)) break;
        await db.ref(`messages/${body.messageId}/status`).set(body.status);
        await audit(body.messageId, body.status);
        return res.json({ ok: true });
      }

      case 'message.delete': {
        if (!SAFE_ID.test(body.messageId)) break;
        await db.ref(`messages/${body.messageId}`).remove();
        await audit(body.messageId, 'Xabar o‘chirildi');
        return res.json({ ok: true });
      }

      case 'settings.update': {
        const input = body.settings || {};
        const patch: Record<string, string> = {};
        if (typeof input.phone === 'string') {
          const d = input.phone.replace(/\D/g, '');
          if (!/^998\d{9}$/.test(d)) return res.status(400).json({ ok: false, error: 'Telefon +998 XX XXX XX XX ko‘rinishida bo‘lsin.' });
          patch.phone = d;
        }
        if (typeof input.cardNumber === 'string') {
          const d = input.cardNumber.replace(/\D/g, '');
          if (!/^\d{16}$/.test(d)) return res.status(400).json({ ok: false, error: 'Karta raqami 16 ta raqamdan iborat bo‘lsin.' });
          patch.cardNumber = d;
        }
        for (const key of ['ownerName', 'cardHolder', 'cardBank'] as const) {
          if (typeof input[key] === 'string') {
            const v = input[key]!.trim().slice(0, 80);
            if (!v) return res.status(400).json({ ok: false, error: 'Bo‘sh maydon qoldirmang.' });
            patch[key] = v;
          }
        }
        if (Object.keys(patch).length === 0) break;
        await db.ref('settings/public').update({ ...patch, updatedAt: nowIso });
        invalidateServerSiteSettings();
        await audit('settings', Object.entries(patch).map(([k, v]) => `${k}=${k === 'cardNumber' ? `****${v.slice(-4)}` : v}`).join(', '));
        return res.json({ ok: true });
      }

      case 'music.add': {
        const title = String(body.title || '').trim().slice(0, 120);
        const url = String(body.url || '');
        const path = String(body.storagePath || '');
        const urlPrefix = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/music%2F`;
        if (!MUSIC_ID.test(body.id) || !title || !url.startsWith(urlPrefix) || !/^music\/[a-z0-9-]+\.[a-z0-9]{2,4}$/.test(path)) {
          return res.status(400).json({ ok: false, error: 'Qo‘shiq ma’lumotlari noto‘g‘ri.' });
        }
        const items = (await db.ref('musicLibrary/items').get()).val() || {};
        const maxOrder = Math.max(10, ...Object.values<any>(items).map((v) => Number(v?.order) || 0));
        await db.ref(`musicLibrary/items/${body.id}`).set({
          title,
          url,
          storagePath: path,
          source: 'upload',
          hidden: false,
          order: maxOrder + 1,
          createdAt: nowIso,
        });
        await audit(body.id, `Qo‘shiq qo‘shildi: ${title}`);
        return res.json({ ok: true });
      }

      case 'music.update': {
        if (!MUSIC_ID.test(body.id)) break;
        const patch: Record<string, unknown> = { updatedAt: nowIso };
        if (typeof body.title === 'string') {
          const title = body.title.trim().slice(0, 120);
          if (!title) return res.status(400).json({ ok: false, error: 'Qo‘shiq nomi bo‘sh bo‘lmasin.' });
          patch.title = title;
        }
        if (typeof body.hidden === 'boolean') patch.hidden = body.hidden;
        await db.ref(`musicLibrary/items/${body.id}`).update(patch);
        await audit(body.id, typeof body.hidden === 'boolean' ? (body.hidden ? 'Qo‘shiq yashirildi' : 'Qo‘shiq qaytarildi') : `Nomi: ${patch.title}`);
        return res.json({ ok: true });
      }

      case 'music.delete': {
        if (!MUSIC_ID.test(body.id)) break;
        const snap = await db.ref(`musicLibrary/items/${body.id}`).get();
        const item = snap.val() || {};
        if (item.source === 'upload') {
          await db.ref(`musicLibrary/items/${body.id}`).remove();
        } else {
          // Built-in songs ship with the site, so "delete" hides them from the library.
          await db.ref(`musicLibrary/items/${body.id}`).update({ hidden: true, updatedAt: nowIso });
        }
        const def = (await db.ref('musicLibrary/defaultId').get()).val();
        if (def === body.id) await db.ref('musicLibrary/defaultId').remove();
        await audit(body.id, `Qo‘shiq o‘chirildi${item.title ? `: ${item.title}` : ''}`);
        return res.json({ ok: true });
      }

      case 'music.setDefault': {
        if (!MUSIC_ID.test(body.id)) break;
        await db.ref('musicLibrary/defaultId').set(body.id);
        await audit(body.id, 'Standart qo‘shiq qilib belgilandi');
        return res.json({ ok: true });
      }

      case 'music.reorder': {
        const ids = Array.isArray(body.ids) ? body.ids.filter((id) => MUSIC_ID.test(String(id))).slice(0, 200) : [];
        if (ids.length === 0) break;
        const updates: Record<string, unknown> = {};
        ids.forEach((id, i) => {
          updates[`musicLibrary/items/${id}/order`] = i;
        });
        await db.ref().update(updates);
        await audit('music', 'Tartib o‘zgardi');
        return res.json({ ok: true });
      }

      case 'template.update': {
        const slug = String(body.slug || '');
        if (!/^[a-z0-9_-]{1,64}$/i.test(slug)) break;
        const patch: Record<string, unknown> = { updatedAt: nowIso };
        if (body.price === null) patch.price = null;
        else if (body.price !== undefined) {
          const p = Math.round(Number(body.price));
          if (!Number.isFinite(p) || p < 1000 || p > 100_000_000) {
            return res.status(400).json({ ok: false, error: 'Narx 1 000 so‘mdan katta bo‘lsin.' });
          }
          patch.price = p;
        }
        for (const key of ['hidden', 'isPopular', 'isNew'] as const) {
          if (typeof body[key] === 'boolean') patch[key] = body[key];
        }
        await db.ref(`templateOverrides/${slug}`).update(patch);
        const { updatedAt: _u, ...shown } = patch;
        await audit(slug, Object.entries(shown).map(([k, v]) => `${k}=${v}`).join(', '));
        return res.json({ ok: true });
      }
    }
    return res.status(400).json({ ok: false, error: 'Noma’lum yoki noto‘g‘ri amal.' });
  } catch (err: any) {
    console.error('Admin action error:', err?.message || err);
    return res.status(500).json({ ok: false, error: 'Amalni bajarib bo‘lmadi. Qayta urinib ko‘ring.' });
  }
}
