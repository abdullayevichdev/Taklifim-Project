import type { VercelRequest, VercelResponse } from '../_lib/http.js';

/**
 * Single serverless function for the whole admin panel API (keeps the deployment under the
 * Vercel Hobby limit of 12 functions). URLs are unchanged:
 *   POST /api/admin/login   · POST /api/admin/action   · GET /api/admin/data
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const op = String(req.query.op || '');
  switch (op) {
    case 'login':
      return (await import('../_lib/admin/login.js')).default(req, res);
    case 'action':
      return (await import('../_lib/admin/action.js')).default(req, res);
    case 'data':
      return (await import('../_lib/admin/data.js')).default(req, res);
    default:
      res.setHeader('Cache-Control', 'no-store');
      return res.status(404).json({ ok: false, error: 'Not found' });
  }
}
