import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getOrder } from '../../_lib/firebaseAdmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const orderId = String(req.query.orderId || '');
    if (!orderId) {
      return res.status(400).json({ success: false, error: 'orderId majburiy' });
    }

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
}
