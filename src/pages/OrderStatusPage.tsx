import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../locales';
import { api } from '../services/api';
import { OrderItem, OrderStatus } from '../types';
import {
  formatPriceUZS,
  formatRelativeTimeLocalized,
  isReviewOverdue,
  resolveInvitationPaymentStatus,
  truncateFilenameMiddle,
  formatFileSize,
} from '../utils/logic';
import {
  compressImageForUpload,
  validatePdfFile,
  MAX_PDF_BYTES,
} from '../utils/receiptCompress';
import {
  generateIdempotencyKey,
  isNetworkOrTimeoutError,
} from '../utils/receiptUpload';
import { resolveLegacyOrderTemplate } from '../utils/templateResolver';
import { cleanAndValidateUzPhone } from '../utils/phone.js';
import { PAYMENT_CONFIG, getPaymentCopy } from '../config/payment';
import { isFirebaseConfigured, storage } from '../services/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ShareModal } from '../components/ShareModal';
import { ReceiptAuthPrompt } from '../components/ReceiptAuthPrompt';
import { PhoneInput } from '../components/PhoneInput';
import { GlassSurface, GlassButton } from '../components/glass';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Share2,
  Eye,
  Upload,
  FileText,
  AlertCircle,
  RefreshCw,
  Send,
  ShieldAlert,
} from 'lucide-react';

interface OrderViewState {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  invitationId?: string;
  invitationSlug?: string;
  customerName?: string;
  customerPhone?: string;
  templateId?: string;
  templateSlug?: string;
  templateName?: string;
  weddingDate?: string;
  venueName?: string;
  price?: number;
  receiptSentAt?: string;
  decidedAt?: string;
  rejectReason?: string;
  updatedAt?: string;
}

const ADMIN_SUPPORT_TELEGRAM_URL = 'https://t.me/taklifim_support';

export const OrderStatusPage: React.FC = () => {
  const { params, navigate } = useRouter();
  const { user, authReady, hasFirebaseSession, showToast } = useAuth();
  const { language, t } = useLanguage();
  const paymentCopy = getPaymentCopy(language);
  const orderId = params.orderId || '';

  const [order, setOrder] = useState<OrderViewState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorCode, setErrorCode] = useState<'none' | 'unauthorized' | 'not_found'>('none');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [copiedCard, setCopiedCard] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  // Re-upload form states (used when rejected or awaiting receipt)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [preparedFileType, setPreparedFileType] = useState<string>('');
  const [preparedFileName, setPreparedFileName] = useState<string>('');
  const [isPreparingFile, setIsPreparingFile] = useState<boolean>(false);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [uploadIsNetworkError, setUploadIsNetworkError] = useState<boolean>(false);
  const [uploadAttemptMsg, setUploadAttemptMsg] = useState<string>('');
  const [receiptIdempotencyKey, setReceiptIdempotencyKey] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>(user?.phone || '');
  const receiptInputRef = useRef<HTMLInputElement | null>(null);
  const receiptSubmitLockRef = useRef<boolean>(false);

  // Track status transitions only after initial resolution (no toast on F5 load)
  const lastStatusRef = useRef<string | null>(null);

  const applyResolvedStatus = useCallback(
    (incoming: Partial<OrderViewState>, source: 'api' | 'rtdb') => {
      if (!incoming.status) return;
      setOrder((prev) => {
        const merged: OrderViewState = {
          orderId,
          orderNumber: incoming.orderNumber || prev?.orderNumber || orderId,
          status: incoming.status!,
          invitationId: incoming.invitationId ?? prev?.invitationId,
          invitationSlug: incoming.invitationSlug ?? prev?.invitationSlug,
          customerName: incoming.customerName ?? prev?.customerName,
          customerPhone: incoming.customerPhone ?? prev?.customerPhone,
          templateId: incoming.templateId ?? prev?.templateId,
          templateSlug: incoming.templateSlug ?? prev?.templateSlug,
          templateName: incoming.templateName ?? prev?.templateName,
          weddingDate: incoming.weddingDate ?? prev?.weddingDate,
          venueName: incoming.venueName ?? prev?.venueName,
          price: incoming.price ?? prev?.price,
          receiptSentAt: incoming.receiptSentAt ?? prev?.receiptSentAt,
          decidedAt: incoming.decidedAt ?? prev?.decidedAt,
          rejectReason: incoming.rejectReason !== undefined ? incoming.rejectReason : prev?.rejectReason,
          updatedAt: incoming.updatedAt ?? prev?.updatedAt,
        };
        return merged;
      });

      setErrorCode('none');

      const canonical = resolveInvitationPaymentStatus(null, { status: incoming.status });
      const prevCanonical = lastStatusRef.current;
      if (prevCanonical !== null && prevCanonical !== canonical) {
        if (prevCanonical === 'pending_review' && canonical === 'paid') {
          showToast(t.myInvitations.toastApproved, 'success');
          try {
            confetti({
              particleCount: 140,
              spread: 85,
              origin: { y: 0.5 },
              colors: ['#F5C9D8', '#B9DFFA', '#B48B47', '#D9658B', '#10B981'],
            });
          } catch {}
        } else if (prevCanonical === 'pending_review' && canonical === 'rejected') {
          showToast(t.myInvitations.toastRejected, 'error');
        }
      }
      if (source === 'api' || prevCanonical !== null) {
        lastStatusRef.current = canonical;
      } else {
        lastStatusRef.current = canonical;
      }
    },
    [orderId, showToast, t.myInvitations.toastApproved, t.myInvitations.toastRejected]
  );

  const fetchOrderFromApi = useCallback(
    async (isManual = false) => {
      if (!orderId) {
        setErrorCode('not_found');
        setLoading(false);
        return;
      }
      if (isManual) setRefreshing(true);

      try {
        const res = await api.getOrderStatus(orderId);
        if (res.success && res.status) {
          applyResolvedStatus(
            {
              orderId: res.orderId || orderId,
              status: res.status,
              invitationId: res.invitationId,
              invitationSlug: res.invitationSlug,
              customerName: res.customerName,
              templateId: res.templateId,
              templateSlug: res.templateSlug,
              templateName: res.templateName,
              weddingDate: res.weddingDate,
              venueName: res.venueName,
              price: res.price,
              receiptSentAt: res.receiptSentAt,
              decidedAt: res.decidedAt,
              rejectReason: res.rejectReason,
              updatedAt: res.updatedAt,
            },
            'api'
          );
          if (res.invitationId && (!res.invitationSlug || !res.templateSlug)) {
            const inv = await api.getInvitationById(res.invitationId);
            if (inv) {
              setOrder((prev) =>
                prev
                  ? {
                      ...prev,
                      invitationSlug: prev.invitationSlug || inv.slug,
                      customerName: prev.customerName || inv.hostNames,
                      customerPhone: prev.customerPhone || inv.socialLinks?.phone,
                      templateId: prev.templateId || inv.templateId,
                      templateSlug: prev.templateSlug || inv.templateSlug,
                    }
                  : prev
              );
            }
          }
        } else if (res.statusCode === 401 || res.statusCode === 403) {
          setErrorCode('unauthorized');
          setOrder(null);
        } else {
          // Try RTDB / local fallback if API didn't know yet
          const fallback = await api.getOrderById(orderId);
          if (fallback && (!fallback.ownerUid || !user?.id || fallback.ownerUid === user.id)) {
            applyResolvedStatus(
              {
                orderId: fallback.id,
                orderNumber: fallback.orderNumber,
                status: fallback.status,
                invitationId: fallback.invitationId,
                invitationSlug: fallback.invitationSlug,
                customerName: fallback.customerName,
                customerPhone: fallback.customerPhone,
                templateId: fallback.templateId,
                templateSlug: fallback.templateSlug,
                templateName: fallback.templateName,
                weddingDate: fallback.weddingDate,
                venueName: fallback.venueName,
                price: fallback.price,
                receiptSentAt: fallback.receiptSentAt || fallback.submittedAt,
                decidedAt: fallback.decidedAt,
                rejectReason: fallback.rejectReason,
                updatedAt: fallback.updatedAt,
              },
              'api'
            );
          } else {
            setErrorCode('not_found');
          }
        }
      } finally {
        setLoading(false);
        if (isManual) setRefreshing(false);
      }
    },
    [orderId, user?.id, applyResolvedStatus]
  );

  // Initial load + Real-time RTDB subscription (wait for Firebase authReady first)
  useEffect(() => {
    if (!authReady) return;
    lastStatusRef.current = null;
    setLoading(true);
    setErrorCode('none');

    fetchOrderFromApi(false);

    if (!hasFirebaseSession) {
      return;
    }

    const unsubRtdb = api.subscribeOrder(
      orderId,
      (rtdbOrder: OrderItem | null) => {
        if (!rtdbOrder) return;
        if (rtdbOrder.ownerUid && user?.id && rtdbOrder.ownerUid !== user.id) return;
        applyResolvedStatus(
          {
            orderId: rtdbOrder.id || orderId,
            orderNumber: rtdbOrder.orderNumber,
            status: rtdbOrder.status,
            invitationId: rtdbOrder.invitationId,
            invitationSlug: rtdbOrder.invitationSlug,
            customerName: rtdbOrder.customerName,
            customerPhone: rtdbOrder.customerPhone,
            templateId: rtdbOrder.templateId,
            templateSlug: rtdbOrder.templateSlug,
            templateName: rtdbOrder.templateName,
            weddingDate: rtdbOrder.weddingDate,
            venueName: rtdbOrder.venueName,
            price: rtdbOrder.price,
            receiptSentAt: rtdbOrder.receiptSentAt || rtdbOrder.submittedAt,
            decidedAt: rtdbOrder.decidedAt,
            rejectReason: rtdbOrder.rejectReason,
            updatedAt: rtdbOrder.updatedAt,
          },
          'rtdb'
        );
        setLoading(false);
      },
      (err) => {
        if (err.message?.toLowerCase().includes('permission')) {
          setErrorCode((prev) => (prev === 'none' && !order ? 'unauthorized' : prev));
        }
      }
    );

    return () => {
      unsubRtdb();
    };
  }, [authReady, hasFirebaseSession, orderId, user?.id, fetchOrderFromApi, applyResolvedStatus]);

  // 5s background polling ONLY when pending_review & document is visible; instant refresh on visibilitychange
  useEffect(() => {
    if (!order || order.status !== 'pending_review') return;

    let timerId: number | null = null;

    const startPolling = () => {
      if (timerId !== null || document.hidden) return;
      timerId = window.setInterval(() => {
        if (!document.hidden) {
          fetchOrderFromApi(false);
        }
      }, 5000);
    };

    const stopPolling = () => {
      if (timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        fetchOrderFromApi(false);
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [order?.status, fetchOrderFromApi]);

  // Keep phone fallback synchronized if user profile updates
  useEffect(() => {
    if (!contactPhone && (order?.customerPhone || user?.phone)) {
      setContactPhone(order?.customerPhone || user?.phone || '');
    }
  }, [order?.customerPhone, user?.phone]);

  const handleCopyCard = () => {
    try {
      navigator.clipboard.writeText(PAYMENT_CONFIG.cardNumberRaw);
      setCopiedCard(true);
      showToast(t.builder.toasts.cardCopied, 'success');
      setTimeout(() => setCopiedCard(false), 2500);
    } catch {
      showToast(`${t.builder.cardNumberLabel}: ${PAYMENT_CONFIG.cardNumberFormatted}`, 'info');
    }
  };

  const handleCopyInviteLink = (slug: string) => {
    const fullUrl = `${window.location.origin}/i/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    showToast(t.common.linkCopied, 'success');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleReceiptFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isUploadingReceipt || receiptSubmitLockRef.current) return;
    setUploadError('');
    setUploadIsNetworkError(false);
    setFileBase64('');
    setPreparedFileType('');
    setPreparedFileName('');
    setReceiptIdempotencyKey('');
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (!isImage && !isPdf) {
      setUploadError(t.builder.toasts.invalidReceiptFormat);
      return;
    }

    if (isPdf) {
      const pdfError = validatePdfFile(file, language);
      if (pdfError) {
        setUploadError(pdfError);
        return;
      }
      setSelectedFile(file);
      setPreparedFileType('application/pdf');
      setPreparedFileName(file.name);
      setReceiptIdempotencyKey(generateIdempotencyKey());
      return;
    }

    setIsPreparingFile(true);
    try {
      const compressed = await compressImageForUpload(file, undefined, language);
      setSelectedFile(file);
      setFileBase64(compressed.base64);
      setPreparedFileType(compressed.fileType);
      setPreparedFileName(compressed.fileName);
      setReceiptIdempotencyKey(generateIdempotencyKey());
    } catch (err: any) {
      setSelectedFile(null);
      setUploadError(err.message || t.builder.toasts.receiptReadError);
    } finally {
      setIsPreparingFile(false);
    }
  };

  useEffect(() => {
    if (hasFirebaseSession) {
      setUploadError('');
    }
  }, [hasFirebaseSession]);

  const handleReuploadSubmit = async () => {
    if (!order || receiptSubmitLockRef.current || isUploadingReceipt) return;

    if (!hasFirebaseSession) {
      setUploadError(
        t.auth?.errors?.receiptAuthRequiredDesc ||
          'Chek yuborish uchun Google, Apple ID yoki Email orqali hisobingizga kirilgan bo‘lishi kerak.'
      );
      return;
    }

    const isPdf =
      preparedFileType === 'application/pdf' ||
      selectedFile?.type === 'application/pdf' ||
      (selectedFile?.name || '').toLowerCase().endsWith('.pdf');

    if (!selectedFile || (!fileBase64 && !isPdf)) {
      setUploadError(t.builder.toasts.uploadReceiptFirst);
      return;
    }

    const cleanPhone = cleanAndValidateUzPhone(
      contactPhone || order.customerPhone || user?.phone || ''
    );
    if (!cleanPhone) {
      setUploadError(t.auth?.errors?.invalidPhone || 'Iltimos, to‘g‘ri telefon raqam kiriting');
      return;
    }

    if (isPdf && selectedFile.size > MAX_PDF_BYTES) {
      setUploadError(t.validation.receiptPdfTooLarge);
      return;
    }

    const idemKey = receiptIdempotencyKey || generateIdempotencyKey();
    if (!receiptIdempotencyKey) {
      setReceiptIdempotencyKey(idemKey);
    }

    receiptSubmitLockRef.current = true;
    setIsUploadingReceipt(true);
    setUploadError('');
    setUploadIsNetworkError(false);
    setUploadAttemptMsg('');

    try {
      let fileUrl: string | undefined;
      let fileBase64Payload: string | undefined = fileBase64 || undefined;

      if (isPdf) {
        if (!isFirebaseConfigured() || !storage) {
          throw new Error(t.builder.toasts.pdfStorageError);
        }
        const path = `receipts/${order.orderId}/${Date.now()}_${selectedFile.name}`;
        const ref = storageRef(storage, path);
        await uploadBytes(ref, selectedFile, { contentType: 'application/pdf' });
        fileUrl = await getDownloadURL(ref);
        fileBase64Payload = undefined;
      }

      const legacyTplMeta = resolveLegacyOrderTemplate({
        templateId: order.templateId,
        templateSlug: order.templateSlug,
        templateName: order.templateName,
      });

      const res = await api.uploadReceipt(
        {
          orderId: order.orderId,
          invitationId: order.invitationId,
          invitationSlug: order.invitationSlug,
          customerName: order.customerName || user?.name || 'Mijoz',
          customerPhone: cleanPhone,
          templateId: order.templateId || legacyTplMeta?.templateId,
          templateSlug: order.templateSlug || legacyTplMeta?.templateSlug,
          templateName: order.templateName || legacyTplMeta?.templateName,
          weddingDate: order.weddingDate,
          venueName: order.venueName,
          price: order.price || 60000,
          fileName: preparedFileName || selectedFile.name,
          fileType: preparedFileType || selectedFile.type,
          fileBase64: fileBase64Payload,
          fileUrl,
          idempotencyKey: idemKey,
        },
        {
          onAttempt: (attempt, max) => {
            if (attempt > 1) {
              const templateStr = (t.builder as any).uploadingAttemptLabel || 'Qayta urinilmoqda ({attempt}/{max})...';
              setUploadAttemptMsg(templateStr.replace('{attempt}', String(attempt)).replace('{max}', String(max)));
            } else {
              setUploadAttemptMsg('');
            }
          },
        }
      );

      if (res.success === true) {
        setSelectedFile(null);
        setFileBase64('');
        setPreparedFileType('');
        setPreparedFileName('');
        setReceiptIdempotencyKey('');
        setUploadIsNetworkError(false);
        lastStatusRef.current = 'pending_review';
        setOrder((prev) =>
          prev
            ? {
                ...prev,
                status: 'pending_review',
                receiptSentAt: res.receiptSentAt || new Date().toISOString(),
                rejectReason: undefined,
                decidedAt: undefined,
              }
            : prev
        );
        showToast(t.builder.toasts.receiptSent, 'success');
      } else {
        if (res.isNetworkError) {
          setUploadIsNetworkError(true);
          setUploadError(t.builder.uploadNetworkError);
          showToast(t.builder.uploadNetworkError, 'error');
        } else {
          setUploadIsNetworkError(false);
          setUploadError(res.error || t.builder.toasts.receiptSendError);
          showToast(res.error || t.builder.toasts.receiptSendError, 'error');
        }
      }
    } catch (err: any) {
      const classified = isNetworkOrTimeoutError(err);
      if (classified.isNetwork) {
        setUploadIsNetworkError(true);
        setUploadError(t.builder.uploadNetworkError);
        showToast(t.builder.uploadNetworkError, 'error');
      } else {
        setUploadIsNetworkError(false);
        setUploadError(`${t.builder.toasts.serverErrorPrefix} ${err.message}`);
        showToast(t.builder.toasts.receiptSendError, 'error');
      }
    } finally {
      receiptSubmitLockRef.current = false;
      setIsUploadingReceipt(false);
    }
  };

  if (loading) {
    return (
      <div className="taklifim-page-top taklifim-page-bottom min-h-screen max-w-3xl mx-auto px-4 sm:px-6 flex items-center justify-center">
        <GlassSurface variant="elevated" rounded="3xl" className="w-full p-8 text-center space-y-4">
          <div className="w-10 h-10 border-[3px] border-[#E27B9B] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#4A383F]">{t.orderStatusPage.loading}</p>
        </GlassSurface>
      </div>
    );
  }

  if (!order || errorCode !== 'none') {
    return (
      <div className="taklifim-page-top taklifim-page-bottom min-h-screen max-w-xl mx-auto px-4 sm:px-6 flex items-center justify-center">
        <GlassSurface variant="elevated" rounded="3xl" className="w-full p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h1 className="font-playfair text-2xl font-bold text-[#1E1418]">
              {t.orderStatusPage.notFoundTitle}
            </h1>
            <p className="text-xs sm:text-sm text-[#4A383F] leading-relaxed">
              {errorCode === 'unauthorized'
                ? t.orderStatusPage.unauthorizedDesc
                : t.orderStatusPage.notFoundDesc}
            </p>
          </div>
          {errorCode === 'unauthorized' && authReady && !hasFirebaseSession && (
            <div className="text-left">
              <ReceiptAuthPrompt />
            </div>
          )}
          <GlassButton
            tone="tinted"
            size="md"
            href="/my-invitations"
            onAnchorClick={(e) => {
              e.preventDefault();
              navigate('/my-invitations');
            }}
            leftIcon={<ArrowLeft className="w-4 h-4" aria-hidden="true" />}
          >
            {t.orderStatusPage.backToInvitations}
          </GlassButton>
        </GlassSurface>
      </div>
    );
  }

  const canonical = resolveInvitationPaymentStatus(null, { status: order.status });
  const sentIso = order.receiptSentAt;
  const relativeSent = formatRelativeTimeLocalized(sentIso, language);
  const formattedSent = sentIso ? new Date(sentIso).toLocaleString(language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : 'uz-UZ', { dateStyle: 'medium', timeStyle: 'short' }) : '';
  const overdue = canonical === 'pending_review' && isReviewOverdue(sentIso, 2);
  const existingPhoneValid = Boolean(cleanAndValidateUzPhone(contactPhone || order.customerPhone || user?.phone || ''));
  const canSubmitReceipt =
    !isUploadingReceipt &&
    !isPreparingFile &&
    Boolean(selectedFile) &&
    (preparedFileType === 'application/pdf' || Boolean(fileBase64));

  return (
    <div className="taklifim-page-top taklifim-page-bottom min-h-screen max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
      {/* Top back bar */}
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/my-invitations"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full glass-surface-subtle hover:bg-white text-xs font-bold text-[#1E1418] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>{t.orderStatusPage.backToInvitations}</span>
        </Link>

        <span className="font-mono tabular-nums text-xs font-bold px-3 py-1.5 rounded-full glass-surface-subtle text-[#4A383F]">
          {t.orderStatusPage.orderNumPrefix}{order.orderNumber || order.orderId}
        </span>
      </div>

      {/* Main Status Card */}
      <GlassSurface variant="elevated" rounded="3xl" className="p-6 sm:p-8 space-y-6">
        {/* Status Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/8 pb-5">
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#9E3E60]">
              {t.orderStatusPage.badge}
            </span>
            <h1 className="font-playfair text-2xl sm:text-3xl font-bold text-[#1E1418]">
              {canonical === 'paid'
                ? t.orderStatusPage.paidTitle
                : canonical === 'rejected'
                ? t.orderStatusPage.rejectedTitle
                : t.orderStatusPage.pendingTitle}
            </h1>
          </div>

          {canonical === 'paid' ? (
            <span className="inline-flex items-center gap-1.5 self-start sm:self-center px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />
              <span>{t.orderStatusPage.paidBadge}</span>
            </span>
          ) : canonical === 'rejected' ? (
            <span className="inline-flex items-center gap-1.5 self-start sm:self-center px-3.5 py-1.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold shrink-0">
              <XCircle className="w-4 h-4 text-rose-700" aria-hidden="true" />
              <span>{t.orderStatusPage.rejectedBadge}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 self-start sm:self-center px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold shrink-0">
              <Clock className="w-4 h-4 text-amber-700" aria-hidden="true" />
              <span>{t.orderStatusPage.pendingBadge}</span>
            </span>
          )}
        </div>

        {/* Order Metadata Summary */}
        <GlassSurface variant="subtle" rounded="2xl" className="p-4 text-xs space-y-2">
          {order.customerName && (
            <div className="flex justify-between gap-3">
              <span className="text-[#4A383F]">{t.orderStatusPage.invitationLabel}</span>
              <strong className="text-[#1E1418] text-right">{order.customerName}</strong>
            </div>
          )}
          {typeof order.price === 'number' && order.price > 0 && (
            <div className="flex justify-between gap-3">
              <span className="text-[#4A383F]">{t.orderStatusPage.amountLabel}</span>
              <strong className="text-[#1E1418] tabular-nums">{formatPriceUZS(order.price, language)}</strong>
            </div>
          )}
          {sentIso && (
            <div className="flex justify-between gap-3">
              <span className="text-[#4A383F]">{t.orderStatusPage.sentTimeLabel}</span>
              <strong className="text-[#1E1418] tabular-nums text-right">
                {relativeSent ? `${relativeSent} (${formattedSent})` : formattedSent}
              </strong>
            </div>
          )}
          {order.decidedAt && canonical !== 'pending_review' && (
            <div className="flex justify-between gap-3">
              <span className="text-[#4A383F]">{t.orderStatusPage.decidedTimeLabel}</span>
              <strong className="text-[#1E1418] tabular-nums text-right">
                {new Date(order.decidedAt).toLocaleString(
                  language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : 'uz-UZ',
                  { dateStyle: 'medium', timeStyle: 'short' }
                )}
              </strong>
            </div>
          )}
        </GlassSurface>

        {/* STATE A: PENDING REVIEW */}
        {canonical === 'pending_review' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/85 border border-amber-200/90 space-y-3">
              <p className="text-xs sm:text-sm font-medium text-[#1E1418] leading-relaxed">
                {t.orderStatusPage.pendingBody}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-amber-900">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-700" aria-hidden="true" />
                  <span>{t.orderStatusPage.pendingAutoNote}</span>
                </span>

                <GlassButton
                  type="button"
                  tone="light"
                  size="sm"
                  loading={refreshing}
                  onClick={() => fetchOrderFromApi(true)}
                  leftIcon={!refreshing ? <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> : undefined}
                >
                  {t.orderStatusPage.checkNowBtn}
                </GlassButton>
              </div>
            </div>

            {overdue && (
              <div className="p-4 rounded-2xl glass-surface-tinted-pink border border-[#C64873]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-[#1E1418] font-medium leading-relaxed">
                  {t.orderStatusPage.overdueNote}
                </p>
                <a
                  href={ADMIN_SUPPORT_TELEGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-[#1E1418] text-white text-xs font-bold hover:bg-black transition-colors shrink-0"
                >
                  <Send className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t.orderStatusPage.overdueTelegramCta}</span>
                </a>
              </div>
            )}
          </div>
        )}

        {/* STATE B: PAID / ACTIVE */}
        {canonical === 'paid' && (
          <div className="space-y-5 animate-fadeIn">
            <div className="p-5 rounded-2xl bg-emerald-50/85 border border-emerald-200 text-emerald-950 space-y-2">
              <p className="text-xs sm:text-sm font-medium leading-relaxed">
                {t.orderStatusPage.paidBody}
              </p>
              {order.invitationSlug && (
                <div className="pt-1 flex flex-wrap items-center justify-between gap-2 bg-white/85 rounded-xl px-3.5 py-2.5 border border-emerald-200/80">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                      {t.orderStatusPage.liveLinkLabel}
                    </span>
                    <span className="font-mono text-xs font-bold text-[#9E3E60] truncate block">
                      {`${window.location.origin}/i/${order.invitationSlug}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyInviteLink(order.invitationSlug!)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-surface-subtle hover:bg-white text-xs font-bold text-[#1E1418] cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                        <span>{t.shared.copiedBtn}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#9E3E60]" aria-hidden="true" />
                        <span>{t.shared.copyBtn}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {order.invitationSlug && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <GlassButton
                  tone="tinted"
                  size="lg"
                  href={`/i/${order.invitationSlug}`}
                  onAnchorClick={(e) => {
                    e.preventDefault();
                    navigate(`/i/${order.invitationSlug}`);
                  }}
                  leftIcon={<Eye className="w-4 h-4" aria-hidden="true" />}
                  className="w-full"
                >
                  {t.orderStatusPage.openInviteBtn}
                </GlassButton>

                <GlassButton
                  type="button"
                  tone="light"
                  size="lg"
                  onClick={() => setShowShareModal(true)}
                  leftIcon={<Share2 className="w-4 h-4 text-[#9E3E60]" aria-hidden="true" />}
                  className="w-full"
                >
                  {t.common.share}
                </GlassButton>
              </div>
            )}
          </div>
        )}

        {/* STATE C: REJECTED OR NEEDS RECEIPT */}
        {(canonical === 'rejected' || canonical === 'pending_payment' || canonical === 'draft') && (
          <div className="space-y-5 animate-fadeIn">
            {canonical === 'rejected' && (
              <div className="p-4 rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-900 space-y-1.5">
                <div className="flex items-start gap-2 text-xs sm:text-sm font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{t.orderStatusPage.rejectedTitle}</span>
                </div>
                <p className="text-xs text-rose-800 pl-6 leading-relaxed">
                  <strong>{t.myInvitations.rejectionReasonLabel}</strong>{' '}
                  {order.rejectReason || t.orderStatusPage.rejectedDefaultReason}
                </p>
              </div>
            )}

            {/* Payment Card Info */}
            <GlassSurface variant="tinted-pink" rounded="2xl" className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-bold text-[#4A383F] uppercase">{t.builder.paymentCardTitle}</span>
                <span className="font-bold text-emerald-700">{PAYMENT_CONFIG.cardBank}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono tabular-nums text-base sm:text-lg font-extrabold text-[#1E1418]">
                  {PAYMENT_CONFIG.cardNumberFormatted}
                </span>
                <GlassButton
                  type="button"
                  tone={copiedCard ? 'light' : 'tinted'}
                  size="sm"
                  onClick={handleCopyCard}
                  leftIcon={copiedCard ? <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
                >
                  {copiedCard ? t.builder.copiedCardBtn : t.builder.copyCardBtn}
                </GlassButton>
              </div>
              <div className="text-[11px] text-[#3A2D28]">
                {paymentCopy.warningText}
              </div>
            </GlassSurface>

            {/* Re-upload Receipt Form */}
            <div className="space-y-4">
              <h2 className="font-playfair text-lg font-bold text-[#1E1418]">
                {t.orderStatusPage.reuploadHeading}
              </h2>

              {authReady && !hasFirebaseSession && <ReceiptAuthPrompt />}

              {!existingPhoneValid && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#1E1418]">
                    {t.orderStatusPage.phoneNeededHint}
                  </label>
                  <PhoneInput
                    value={contactPhone}
                    onChange={(val) => setContactPhone(val)}
                    language={language}
                  />
                </div>
              )}

              <input
                ref={receiptInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleReceiptFileChange}
                disabled={isPreparingFile || isUploadingReceipt}
                className="sr-only"
              />

              <div
                onClick={() => {
                  if (!isPreparingFile && !isUploadingReceipt && !selectedFile) {
                    receiptInputRef.current?.click();
                  }
                }}
                className={`glass-surface-subtle border-2 border-dashed border-[#C64873]/40 rounded-2xl p-4 sm:p-5 transition-colors overflow-hidden ${
                  !selectedFile && !isPreparingFile ? 'hover:border-[#C64873] hover:bg-white/80 cursor-pointer' : ''
                }`}
              >
                {isPreparingFile ? (
                  <div className="flex flex-col items-center justify-center text-center gap-2 py-2">
                    <Upload className="w-6 h-6 text-[#9E3E60] animate-pulse" aria-hidden="true" />
                    <span className="text-xs font-bold text-[#1E1418]">{t.builder.compressingImage}</span>
                  </div>
                ) : selectedFile ? (
                  <div className="flex flex-col gap-3 w-full min-w-0">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/92 border border-emerald-200/90">
                      <div className="flex-none w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <FileText className="w-5 h-5" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-mono text-xs font-bold text-[#1E1418] block truncate">
                          {truncateFilenameMiddle(preparedFileName || selectedFile.name, 26)}
                        </span>
                        <span className="text-[11px] text-emerald-700 font-semibold">
                          {selectedFile.size > 0 ? `${formatFileSize(selectedFile.size, language)} · ` : ''}
                          {t.builder.fileReadyText}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isUploadingReceipt}
                      onClick={() => receiptInputRef.current?.click()}
                      className="min-h-[38px] px-4 py-1.5 rounded-xl bg-white/90 hover:bg-white border border-black/10 text-xs font-bold text-[#9E3E60] self-center cursor-pointer"
                    >
                      {t.builder.replaceReceiptFileBtn}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center gap-2 py-2">
                    <div className="w-11 h-11 rounded-2xl glass-surface-tinted-pink text-[#9E3E60] flex items-center justify-center">
                      <Upload className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <span className="text-xs font-bold text-[#1E1418]">{t.builder.clickToChooseFile}</span>
                    <span className="text-[10px] text-[#4A383F]">{t.builder.fileSizeRules}</span>
                  </div>
                )}
              </div>

              {isUploadingReceipt && (
                <div
                  role="status"
                  aria-live="polite"
                  className="p-3 rounded-xl bg-amber-50/90 border border-amber-200/90 space-y-2"
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" aria-hidden="true" />
                    <span>{uploadAttemptMsg || t.builder.uploadingProgressLabel}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-amber-200/70 overflow-hidden">
                    <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-[#C64873] to-[#E27B9B] animate-pulse" />
                  </div>
                </div>
              )}

              {uploadError && (
                <div
                  role="alert"
                  className="text-xs text-rose-700 font-semibold flex flex-col gap-2.5 bg-rose-50/90 p-3.5 rounded-xl border border-rose-200"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span className="leading-relaxed">
                      {uploadIsNetworkError ? t.builder.uploadNetworkError : uploadError}
                    </span>
                  </div>
                  {selectedFile && !isUploadingReceipt && (
                    <GlassButton
                      type="button"
                      tone="tinted"
                      size="sm"
                      onClick={handleReuploadSubmit}
                      leftIcon={<RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />}
                      className="self-start"
                    >
                      {t.builder.retryUploadBtn}
                    </GlassButton>
                  )}
                </div>
              )}

              <GlassButton
                type="button"
                tone="tinted"
                size="lg"
                loading={isUploadingReceipt}
                disabled={!canSubmitReceipt || isUploadingReceipt}
                onClick={handleReuploadSubmit}
                leftIcon={!isUploadingReceipt ? <Upload className="w-4 h-4" aria-hidden="true" /> : undefined}
                className="w-full"
              >
                {isUploadingReceipt
                  ? t.builder.uploadingProgressLabel
                  : t.myInvitations.reuploadReceiptBtn}
              </GlassButton>
            </div>
          </div>
        )}
      </GlassSurface>

      {showShareModal && order.invitationSlug && (
        <ShareModal
          url={`/i/${order.invitationSlug}`}
          title={order.customerName || 'Taklifnoma'}
          language={language}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
};
