import type { VercelRequest, VercelResponse } from '../../_lib/http.js';
import {
  getAuthorizedOrderForUser,
  getFirebaseAdminDiagnosticError,
  hasFirebaseAdmin,
  verifyBearerToken,
} from '../../_lib/firebaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

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

    const orderId = String(req.query.orderId || '');
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
}
