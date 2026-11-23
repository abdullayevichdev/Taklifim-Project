import type { VercelRequest, VercelResponse } from '../http.js';
import { verifyAdminRequest } from '../adminAuth.js';
import { getRtdb, hasFirebaseAdmin } from '../firebaseAdmin.js';

const SCOPES = new Set(['orders', 'invitations', 'users', 'messages', 'receiptImages', 'adminAudit', 'settings', 'templateOverrides']);

/**
 * GET ?scope=orders|invitations|users|messages (or receiptImages&id=ORD-1).
 * Fallback for the admin panel when the database rules that allow direct realtime
 * admin reads have not been deployed yet (the panel then polls this endpoint).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!hasFirebaseAdmin()) return res.status(503).json({ ok: false, error: 'Server sozlanmagan.' });
  if (!(await verifyAdminRequest(req.headers.authorization))) {
    return res.status(401).json({ ok: false, error: 'Admin sessiyasi tugagan.' });
  }
  const scope = String(req.query.scope || '');
  if (!SCOPES.has(scope)) return res.status(400).json({ ok: false, error: 'Noto‘g‘ri scope.' });

  const id = typeof req.query.id === 'string' ? req.query.id : '';
  if (scope === 'receiptImages' && !/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
    return res.status(400).json({ ok: false, error: 'id kerak.' });
  }
  const db = getRtdb();
  const snap =
    scope === 'receiptImages'
      ? await db.ref(`receiptImages/${id}`).get()
      : scope === 'adminAudit'
      ? await db.ref('adminAudit').orderByKey().limitToLast(300).get()
      : await db.ref(scope).get();
  return res.json({ ok: true, data: snap.exists() ? snap.val() : null });
}
