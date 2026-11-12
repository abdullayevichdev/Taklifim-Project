import type { VercelRequest, VercelResponse } from '../_lib/types.js';
import statusHandler from './status/[orderId].js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Extract orderId from query or path
  if (!req.query.orderId) {
    const parts = (req.url || '').split('?')[0].split('/');
    const lastPart = parts[parts.length - 1];
    if (lastPart && lastPart !== 'status') {
      req.query.orderId = lastPart;
    }
  }
  return statusHandler(req, res);
}
