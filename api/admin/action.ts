import type { VercelRequest, VercelResponse } from '../_lib/http.js';
import { verifyAdminRequest } from '../_lib/adminAuth.js';
import { decideOrderPayment, getOrder, getRtdb, hasFirebaseAdmin } from '../_lib/firebaseAdmin.js';
import { markTelegramReceiptDecided } from '../_lib/telegram.js';

const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;

type ActionBody =
  | { type: 'order.decide'; orderId: string; decision: 'paid' | 'rejected'; reason?: string }
  | { type: 'invitation.setStatus'; invitationId: string; status: 'paid' | 'pending_payment' }
  | { type: 'invitation.delete'; invitationId: string }
  | { type: 'message.setStatus'; messageId: string; status: 'new' | 'read' | 'replied' }
  | { type: 'message.delete'; messageId: string };

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
        return res.json({ ok: true });
      }

      case 'message.setStatus': {
        if (!SAFE_ID.test(body.messageId) || !['new', 'read', 'replied'].includes(body.status)) break;
        await db.ref(`messages/${body.messageId}/status`).set(body.status);
        return res.json({ ok: true });
      }

      case 'message.delete': {
        if (!SAFE_ID.test(body.messageId)) break;
        await db.ref(`messages/${body.messageId}`).remove();
        return res.json({ ok: true });
      }
    }
    return res.status(400).json({ ok: false, error: 'Noma’lum yoki noto‘g‘ri amal.' });
  } catch (err: any) {
    console.error('Admin action error:', err?.message || err);
    return res.status(500).json({ ok: false, error: 'Amalni bajarib bo‘lmadi. Qayta urinib ko‘ring.' });
  }
}
