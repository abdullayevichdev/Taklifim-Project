import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, Link } from '../context/RouterContext';
import { useLanguage, formatItemCount, translateCategory } from '../locales';
import { useAuth } from '../context/AuthContext';
import { mockTemplates } from '../data/mockTemplates';
import { mockPlans } from '../data/mockPlans';
import { InvitationData, ScheduleItem, DressCodeColor, Template, OrderStatus, OrderItem } from '../types';
import { PAYMENT_CONFIG, getPaymentCopy } from '../config/payment';
import { CustomDropdown } from '../components/CustomDropdown';
import { TemplateThemeDecoration } from '../components/TemplateThemeDecoration';
import { TemplateRenderer } from '../templates/TemplateRenderer';
import { InvitationShell } from '../components/InvitationShell';
import { LocationPickerMap } from '../components/LocationPickerMap';
import { BuilderSectionToggle } from '../components/BuilderSectionToggle';
import { yandexPlaceUrl } from '../utils/mapLinks';
import { audioStorage } from '../utils/audioStorage';
import { api } from '../services/api';
import { ReceiptAuthPrompt } from '../components/ReceiptAuthPrompt';
import { resolveTemplate } from '../utils/templateResolver';
import { reportTemplateResolutionError } from '../utils/templateAlert';
import { TemplateResolutionError } from '../components/TemplateResolutionError';
import {
  formatPriceUZS,
  normalizeTime24h,
  get24hTimeSlots,
  formatLocalizedFullDate,
  deriveEventTitleFromHosts,
  healStaleBuilderDraft,
  truncateFilenameMiddle,
  formatFileSize,
  resolveInvitationPaymentStatus,
  formatRelativeTimeLocalized,
  isReviewOverdue,
} from '../utils/logic';
import { generateInvitationSlug, cleanNameForSlug, parseHostNames, generate4DigitCode } from '../utils/slug';
import {
  compressImageForUpload,
  validatePdfFile,
  MAX_PDF_BYTES,
} from '../utils/receiptCompress';
import {
  generateIdempotencyKey,
  isNetworkOrTimeoutError,
} from '../utils/receiptUpload';
import { cleanAndValidateUzPhone } from '../utils/phone.js';
import { PhoneInput } from '../components/PhoneInput';
import { isFirebaseConfigured, getStorageLazy } from '../services/firebase';
import { SocialLoginButtons } from '../components/SocialLoginButtons';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Save,
  RotateCcw,
  Gem,
  Smartphone,
  Monitor,
  Calendar,
  Clock,
  MapPin,
  Music,
  Image as ImageIcon,
  Plus,
  Trash2,
  Users,
  Eye,
  Sliders,
  Palette,
  Type,
  FileText,
  CreditCard,
  Share2,
  CheckCircle2,
  Copy,
  Upload,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Play,
  Pause,
  Compass,
  Navigation,
  Search,
  ExternalLink,
  Instagram,
  Send,
  Phone,
} from 'lucide-react';
import { TashrifimLogo } from '../components/TashrifimLogo';
import {
  GlassSurface,
  GlassButton,
  GlassSwitch,
  GlassSegmented,
  GlassInput,
  GlassTextarea,
  GlassModal,
} from '../components/glass';

const GLASS_FIELD_CLS =
  'w-full min-h-[42px] px-3.5 py-2 rounded-[var(--lg-radius)] glass-surface-subtle bg-white/80 text-xs sm:text-[13px] text-[#1E1418] placeholder-[#7A6A63] outline-none transition-all focus:bg-white/95 focus:ring-2 focus:ring-[#D66389]/35 focus:border-[#D66389]/60';

// Mashhur tantanalar zallari va ularning aniq koordinatalari
const POPULAR_VENUES = [
  { name: '«Versal» Tantanalar Majmuasi', address: 'Toshkent sh., Shayxontohur t., Navoiy ko‘chasi, 42', lat: 41.3217, lng: 69.2415 },
  { name: '«Yakkasaroy» Tantanalar Saroyi', address: 'Toshkent sh., Shota Rustaveli ko‘chasi, 82', lat: 41.2785, lng: 69.2458 },
  { name: '«Ezidiyor» Majmuasi', address: 'Toshkent sh., Chilonzor tumani, Bunyodkor shoh ko‘chasi', lat: 41.2721, lng: 69.2014 },
  { name: '«Hyatt Regency Tashkent» Ballroom', address: 'Toshkent sh., Navoiy shoh ko‘chasi, 1-A', lat: 41.3168, lng: 69.2788 },
  { name: '«Hilton Tashkent City»', address: 'Toshkent sh., Islom Karimov ko‘chasi, 2', lat: 41.3121, lng: 69.2512 },
  { name: '«Osiyo Grand»', address: 'Toshkent sh., Yunusobod tumani, A. Temur shoh ko‘chasi', lat: 41.3541, lng: 69.2890 },
  { name: '«Mumtoz» Tantanalar Saroyi', address: 'Toshkent sh., Qorasaroy ko‘chasi, 312', lat: 41.3489, lng: 69.2312 },
  { name: '«Sayohat» Restorani', address: 'Toshkent sh., Mirzo Ulug‘bek tumani, Buyuk Ipak Yo‘li ko‘chasi, 115', lat: 41.3245, lng: 69.3142 },
];

// Sara to'y taronalari kutubxonasi (100% ishlaydigan audio fayllar)
const PRESET_MUSIC_TRACKS = [
  { title: 'Nafis To‘y Valsi (Pianino va Skripka)', url: '/audio/wedding_vals.mp3' },
  { title: 'Romantik Sevgi Taronasi (Sweet Love)', url: '/audio/romantic_love.mp3' },
];

// Google Maps havolasidan yoki matndan koordinatalarni aniqlovchi aqlli parser
function parseGoogleMapsInput(input: string): { lat?: number; lng?: number } | null {
  if (!input) return null;
  const coordRegex = /(-?\d{1,2}\.\d+)[,\s]+(-?\d{1,3}\.\d+)/;
  const match = input.match(coordRegex);
  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }
  return null;
}

/**
 * The builder has 4 simple stages; internally they reuse the original step numbers:
 * 1 = template, 2 = details (+ venue map), 3 = optional customization, 11 = review & payment.
 */
const SIMPLE_STEPS = [1, 2, 3, 11] as const;
function toSimpleStep(step: number): number {
  if (step <= 2) return Math.max(1, step);
  if (step === 7) return 2;
  if (step >= 10) return 11;
  return 3;
}

/** Legacy offline ids that were never real Firebase accounts. */
function isLegacyLocalOwnerId(id: string): boolean {
  return /^(usr_|phone_|google_|apple_|tg_|telegram_)/.test(id);
}

/** True when a cached builder draft belongs to an account other than `uid`. */
function isDraftForeignToUser(
  draft: Pick<InvitationData, 'ownerId' | 'ownerUid' | 'orderId'> | null | undefined,
  uid: string | undefined
): boolean {
  if (!draft) return false;
  const owners = [draft.ownerUid, draft.ownerId].filter(
    (v): v is string =>
      typeof v === 'string' && v !== '' && v !== 'anonymous' && !isLegacyLocalOwnerId(v)
  );
  if (owners.length > 0) {
    return !uid || owners.some((o) => o !== uid);
  }
  // An order can only be created while signed in, so an ownerless draft with an order is stale.
  return Boolean(draft.orderId);
}

export const BuilderPage: React.FC = () => {
  const { params, navigate } = useRouter();
  const { t, language } = useLanguage();
  const { showToast, isLoggedIn, authReady, hasFirebaseSession, user, updateUserProfile } = useAuth();
  const paymentCopy = getPaymentCopy(language);

  const [availableTemplates, setAvailableTemplates] = useState<Template[]>(mockTemplates);
  const routeTemplateResolution = resolveTemplate(params.templateSlug, availableTemplates);

  useEffect(() => {
    async function loadTpls() {
      const list = await api.getTemplates();
      setAvailableTemplates(list);
    }
    loadTpls();

    const unsub = api.subscribe<Template[]>('templates', (updated) => {
      setAvailableTemplates(updated);
    });
    return () => unsub();
  }, []);

  const initialSearchParams =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const queryInvitationId = initialSearchParams?.get('invitationId') || '';
  const initialQueryStepRaw = parseInt(initialSearchParams?.get('step') || '', 10);
  const initialQueryStep =
    Number.isFinite(initialQueryStepRaw) && initialQueryStepRaw >= 1 && initialQueryStepRaw <= 11
      ? initialQueryStepRaw
      : 1;

  const [currentStep, setCurrentStep] = useState<number>(() => toSimpleStep(initialQueryStep));
  // Which optional "Customize" section is expanded (one at a time keeps the page short).
  const [openSection, setOpenSection] = useState<number | null>(null);
  const [isLoadingInvitation, setIsLoadingInvitation] = useState<boolean>(Boolean(queryInvitationId));
  const [activeTabMobile, setActiveTabMobile] = useState<'settings' | 'preview'>('settings');
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [isPreviewCoverOpened, setIsPreviewCoverOpened] = useState<boolean>(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [isOrderComplete, setIsOrderComplete] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const syncDesktop = () => setIsDesktopViewport(mq.matches);
    syncDesktop();
    mq.addEventListener('change', syncDesktop);
    return () => mq.removeEventListener('change', syncDesktop);
  }, []);
  const [publishedSlug, setPublishedSlug] = useState<string>('');
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string>('');

  // Payment Receipt and Telegram Integration States
  const [activeOrderId, setActiveOrderId] = useState<string>('');
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('draft');
  const [orderRejectReason, setOrderRejectReason] = useState<string>('');
  const [orderSentAt, setOrderSentAt] = useState<string>('');
  const [copiedCard, setCopiedCard] = useState<boolean>(false);
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
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [showStep11AuthModal, setShowStep11AuthModal] = useState<boolean>(false);
  const [contactPhone, setContactPhone] = useState<string>('');
  const receiptInputRef = useRef<HTMLInputElement | null>(null);
  const receiptSubmitLockRef = useRef<boolean>(false);
  const lastMapToastRef = useRef<string>('');
  const existingSlugsRef = useRef<Set<string>>(new Set());
  const isSlugManualRef = useRef<boolean>(Boolean(queryInvitationId));
  const isTitleManualRef = useRef<boolean>(Boolean(queryInvitationId));
  const sessionSlugCodeRef = useRef<string>(generate4DigitCode());
  const orderTransitionBaselineRef = useRef<string | null>(null);

  const createFreshInvitation = (): InvitationData => {
    const initialCode = sessionSlugCodeRef.current;
    const initResolved = resolveTemplate(params.templateSlug, mockTemplates);
    const seedTemplate = initResolved?.template || mockTemplates[0];

    return {
      id: `inv-${Date.now()}`,
      slug: generateInvitationSlug('Asrorbek', 'Madina', initialCode),
      templateId: initResolved ? initResolved.templateId : '',
      templateSlug: initResolved ? initResolved.templateSlug : params.templateSlug || '',
      language: 'uz',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      eventType: 'To‘y va Nikoh Oqshomi',
      eventTitle: 'Asrorbek & Madina Nikoh To‘yi',
      hostNames: 'Asrorbek & Madina',
      partner1Name: 'Asrorbek',
      partner2Name: 'Madina',
      eventDate: '2026-09-24',
      startTime: '18:00',
      venueLocationType: 'restaurant',
      celebrationAudience: 'all',
      venueName: '',
      venueAddress: '',
      city: 'Toshkent',
      latitude: undefined,
      longitude: undefined,
      mapUrl: '',
      invitationMessage:
        'Sizni baxtli oqshomimiz — Nikoh to‘yimiz munosabati bilan yoziladigan dasturxonimizga lutfan taklif etamiz. Tashrifingiz bizga quvonch bag‘ishlaydi!',
      invitationQuote: '«Sizni muqaddas rishta — nikoh to‘yimiz munosabati bilan yoziladigan dasturxonimizga lutfan taklif etamiz.»',
      coverImage: seedTemplate.previewImage,
      galleryImages: [
        seedTemplate.previewImage,
      ],
      galleryTitle: 'Bizning suratlarimiz',
      galleryPosition: 'after_message',
      musicEnabled: true,
      musicTitle: 'Nafis To‘y Valsi (Pianino va Skripka)',
      musicUrl: '/audio/wedding_vals.mp3',
      musicFileData: undefined,
      musicPlacement: 'all',
      socialLinks: {
        instagram: '',
        telegram: '',
        telegramChannel: '',
        phone: '',
      },
      schedule: [
        { id: '1', time: '17:30', title: 'Mehmonlarni kutib olish', description: 'Jonli musiqa' },
        { id: '2', time: '18:30', title: 'Tantanali kirish', description: 'Ilk raqs' },
        { id: '3', time: '21:00', title: 'To‘y torti marosimi' },
      ],
      dressCodeEnabled: false,
      dressCodeTitle: 'Pastel & Elegant Glamour',
      dressCodeDescription: 'Och pastel va oqshom liboslari tavsiya etiladi.',
      dressCodeColors: [
        { name: 'Cream', hex: '#F5EBDD' },
        { name: 'Blush Pink', hex: '#F5C9D8' },
        { name: 'Sky Blue', hex: '#B9DFFA' },
      ],
      rsvpEnabled: true,
      rsvpDeadline: '2026-09-15',
      allowCompanion: true,
      maxCompanions: 2,
      askMealPreference: true,
      customColors: {
        primary: seedTemplate.colorStyle.primary,
        secondary: seedTemplate.colorStyle.secondary,
        accent: seedTemplate.colorStyle.accent,
        background: seedTemplate.colorStyle.background,
        text: seedTemplate.colorStyle.text,
      },
      customFonts: {
        heading: seedTemplate.typography.headingFont,
        body: seedTemplate.typography.bodyFont,
      },
    };
  };

  // Main Builder State (Live reactive)
  const [invitationState, setInvitationState] = useState<InvitationData>(() => {
    // Only hydrate local draft when NOT explicitly opening a specific ?invitationId=...
    if (!queryInvitationId) {
      try {
        const draft = localStorage.getItem('taklifim_builder_draft');
        if (draft) {
          const parsed = JSON.parse(draft);
          const healed = healStaleBuilderDraft(parsed);
          if (healed.startTime) {
            healed.startTime = normalizeTime24h(healed.startTime, '18:00');
          }
          if (Array.isArray(healed.schedule)) {
            healed.schedule = healed.schedule.map((item: ScheduleItem) => ({
              ...item,
              time: normalizeTime24h(item.time, '18:00'),
            }));
          }
          const tailMatch = typeof healed.slug === 'string' ? healed.slug.match(/-(\d{4})$/) : null;
          if (tailMatch) {
            sessionSlugCodeRef.current = tailMatch[1];
          }
          if (params.templateSlug) {
            const matchResolved = resolveTemplate(params.templateSlug, mockTemplates);
            if (matchResolved) {
              const matchTpl = matchResolved.template;
              if (
                healed.templateSlug !== matchResolved.templateSlug ||
                healed.templateId !== matchResolved.templateId
              ) {
                healed.templateId = matchResolved.templateId;
                healed.templateSlug = matchResolved.templateSlug;
                healed.coverImage = matchTpl.previewImage;
                healed.galleryImages = [matchTpl.previewImage, ...(healed.galleryImages?.slice(1) || [])];
                healed.customColors = { ...matchTpl.colorStyle };
                healed.customFonts = {
                  heading: matchTpl.typography.headingFont,
                  body: matchTpl.typography.bodyFont,
                };
              }
            } else {
              // Invalid URL template slug must NOT silently inherit a cached or default template
              healed.templateId = '';
              healed.templateSlug = params.templateSlug;
            }
          }
          return healed;
        }
      } catch {
        // ignore
      }
    }

    return createFreshInvitation();
  });

  // Track last synced route slug to avoid reverting user template selection
  const lastSyncedSlugRef = useRef<string>(params.templateSlug || '');
  const isSlugLocked =
    invitationState.status !== 'draft' || Boolean(activeOrderId) || isOrderComplete;

  const draftClaimedForUidRef = useRef<string>('');

  /** Drops the current (foreign / inaccessible) draft and starts a clean invitation for this user. */
  const resetToFreshDraft = () => {
    try { localStorage.removeItem('taklifim_builder_draft'); } catch {}
    sessionSlugCodeRef.current = generate4DigitCode();
    isSlugManualRef.current = false;
    isTitleManualRef.current = false;
    orderTransitionBaselineRef.current = null;
    draftClaimedForUidRef.current = '';
    setInvitationState(createFreshInvitation());
    setActiveOrderId('');
    setOrderStatus('draft');
    setOrderRejectReason('');
    setOrderSentAt('');
    setPublishedSlug('');
    setIsOrderComplete(false);
    setCurrentStep((prev) => (prev === 11 ? 1 : prev));
  };

  // Hydrate existing invitation / order status from Firebase on load or F5 reload (wait for authReady first)
  useEffect(() => {
    if (!authReady) return;
    let active = true;

    async function hydrateFromServer() {
      // A locally cached draft that belongs to another account (e.g. the previous user on this
      // browser) must never be shown, polled or re-saved under the current account.
      if (!queryInvitationId && isDraftForeignToUser(invitationState, user?.id)) {
        resetToFreshDraft();
        setIsLoadingInvitation(false);
        return;
      }

      const targetId = queryInvitationId || invitationState.id;
      const storedOrderId = !queryInvitationId ? invitationState.orderId : '';

      if (queryInvitationId) {
        setIsLoadingInvitation(true);
      }

      try {
        let remoteInv: InvitationData | null = null;
        if (targetId && (queryInvitationId || storedOrderId || invitationState.status !== 'draft')) {
          remoteInv = await api.getInvitationById(targetId);
        }

        if (!active) return;

        if (remoteInv) {
          isSlugManualRef.current = true;
          isTitleManualRef.current = true;
          lastSyncedSlugRef.current = remoteInv.templateSlug || lastSyncedSlugRef.current;

          const normalizedInv: InvitationData = {
            ...remoteInv,
            startTime: normalizeTime24h(remoteInv.startTime, '18:00'),
            schedule: Array.isArray(remoteInv.schedule)
              ? remoteInv.schedule.map((s) => ({ ...s, time: normalizeTime24h(s.time, '18:00') }))
              : [],
          };

          setInvitationState(normalizedInv);

          const ordId = normalizedInv.orderId || storedOrderId || '';
          if (ordId) {
            setActiveOrderId(ordId);
            const ordRes = await api.getOrderStatus(ordId);
            if (!active) return;
            const canonical = resolveInvitationPaymentStatus(
              normalizedInv,
              ordRes.success && ordRes.status ? { status: ordRes.status } : null
            );
            orderTransitionBaselineRef.current = canonical;
            setOrderStatus(canonical);
            if (ordRes.rejectReason || normalizedInv.rejectReason) {
              setOrderRejectReason(ordRes.rejectReason || normalizedInv.rejectReason || '');
            }
            if (ordRes.receiptSentAt || normalizedInv.receiptSentAt) {
              setOrderSentAt(ordRes.receiptSentAt || normalizedInv.receiptSentAt || '');
            }
            if (canonical === 'paid' && !queryInvitationId) {
              try { localStorage.removeItem('taklifim_builder_draft'); } catch {}
              setPublishedSlug(normalizedInv.slug);
              setIsOrderComplete(true);
            } else if (canonical === 'paid' && initialQueryStep === 11) {
              setPublishedSlug(normalizedInv.slug);
              setIsOrderComplete(true);
            } else if (
              initialQueryStep === 1 ||
              (!initialSearchParams?.get('step') &&
                (canonical === 'pending_review' || canonical === 'rejected'))
            ) {
              if (!initialSearchParams?.get('step') && (canonical === 'pending_review' || canonical === 'rejected')) {
                setCurrentStep(11);
              }
            }
          } else {
            const canonical = resolveInvitationPaymentStatus(normalizedInv, null);
            orderTransitionBaselineRef.current = canonical;
            setOrderStatus(canonical);
          }
        } else if (storedOrderId) {
          setActiveOrderId(storedOrderId);
          const ordRes = await api.getOrderStatus(storedOrderId);
          if (!active) return;
          if (ordRes.success && ordRes.status) {
            const canonical = resolveInvitationPaymentStatus(null, { status: ordRes.status });
            orderTransitionBaselineRef.current = canonical;
            setOrderStatus(canonical);
            if (ordRes.rejectReason) setOrderRejectReason(ordRes.rejectReason);
            if (ordRes.receiptSentAt) setOrderSentAt(ordRes.receiptSentAt);
            if (canonical === 'paid') {
              try { localStorage.removeItem('taklifim_builder_draft'); } catch {}
              setPublishedSlug(ordRes.invitationSlug || invitationState.slug);
              setIsOrderComplete(true);
            } else if (canonical === 'pending_review' || canonical === 'rejected') {
              setCurrentStep(11);
            }
          }
        }
      } finally {
        if (active) setIsLoadingInvitation(false);
      }
    }

    hydrateFromServer();

    return () => {
      active = false;
    };
  }, [authReady, queryInvitationId]);

  const saveDraftLocally = useCallback(
    (inv?: InvitationData) => {
      if (queryInvitationId) return;
      try {
        localStorage.setItem('taklifim_builder_draft', JSON.stringify(inv || invitationState));
      } catch {}
    },
    [invitationState, queryInvitationId]
  );

  // Auto-persist guest draft edits locally so login or reload never loses form progress
  useEffect(() => {
    if (queryInvitationId || isLoadingInvitation || invitationState.status !== 'draft') return;
    const timer = window.setTimeout(() => {
      saveDraftLocally(invitationState);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [invitationState, isLoadingInvitation, queryInvitationId, saveDraftLocally]);

  // Bind any guest draft to the newly authenticated user and persist to RTDB
  useEffect(() => {
    if (!authReady || !hasFirebaseSession || !user?.id || queryInvitationId || isLoadingInvitation) {
      return;
    }
    if (invitationState.ownerUid === user.id && invitationState.ownerId === user.id) {
      return;
    }
    // Drafts of another account are discarded by the hydration effect; never claim them.
    if (isDraftForeignToUser(invitationState, user.id)) {
      return;
    }
    if (draftClaimedForUidRef.current === `${user.id}:${invitationState.id}`) {
      return;
    }
    draftClaimedForUidRef.current = `${user.id}:${invitationState.id}`;

    const boundDraft: InvitationData = {
      ...invitationState,
      ownerId: user.id,
      ownerUid: user.id,
      updatedAt: new Date().toISOString(),
    };
    setInvitationState(boundDraft);
    saveDraftLocally(boundDraft);

    api
      .saveInvitation(boundDraft)
      .then((saved) => {
        if (
          saved.id !== boundDraft.id ||
          saved.slug !== boundDraft.slug ||
          saved.ownerId !== boundDraft.ownerId ||
          saved.ownerUid !== boundDraft.ownerUid
        ) {
          setInvitationState((prev) => ({
            ...prev,
            id: saved.id,
            slug: saved.slug,
            ownerId: saved.ownerId,
            ownerUid: saved.ownerUid,
          }));
          saveDraftLocally({ ...boundDraft, id: saved.id, slug: saved.slug });
        }
      })
      .catch(() => {});
  }, [
    authReady,
    hasFirebaseSession,
    user?.id,
    queryInvitationId,
    isLoadingInvitation,
    invitationState,
    saveDraftLocally,
  ]);

  const goToStep = useCallback(
    (targetStep: number) => {
      const clamped = toSimpleStep(Math.max(1, Math.min(11, targetStep)));
      if (clamped === 11 && authReady && (!isLoggedIn || !hasFirebaseSession)) {
        saveDraftLocally();
        setShowStep11AuthModal(true);
        return;
      }

      setCurrentStep(clamped);
      saveDraftLocally();

      if (hasFirebaseSession && user?.id) {
        api
          .saveInvitation({
            ...invitationState,
            ownerId: user.id,
            ownerUid: user.id,
          })
          .then((saved) => {
            if (
              saved.id !== invitationState.id ||
              saved.slug !== invitationState.slug ||
              saved.ownerId !== invitationState.ownerId ||
              saved.ownerUid !== invitationState.ownerUid
            ) {
              setInvitationState((prev) => ({
                ...prev,
                id: saved.id,
                slug: saved.slug,
                ownerId: saved.ownerId,
                ownerUid: saved.ownerUid,
              }));
              saveDraftLocally(saved);
            }
          })
          .catch(() => {});
      }
    },
    [authReady, isLoggedIn, hasFirebaseSession, user?.id, invitationState, saveDraftLocally]
  );

  // Load user's known slugs once for uniqueness checks during auto-slug updates (only when Firebase session is active)
  useEffect(() => {
    let active = true;
    if (!authReady || !user?.id || !hasFirebaseSession) return;
    api
      .getInvitations(user.id)
      .then((list) => {
        if (!active || !Array.isArray(list)) return;
        const slugs = new Set<string>();
        list.forEach((inv) => {
          if (inv?.slug && inv.id !== invitationState.id) {
            slugs.add(inv.slug.toLowerCase());
          }
        });
        existingSlugsRef.current = slugs;
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [authReady, hasFirebaseSession, invitationState.id, user?.id]);

  // Debounced automatic slug regeneration from hostNames while draft & not manually edited
  useEffect(() => {
    if (isSlugLocked || isSlugManualRef.current || isLoadingInvitation) return;

    const timer = window.setTimeout(() => {
      const { groom, bride } = parseHostNames(invitationState.hostNames);
      let code = sessionSlugCodeRef.current || generate4DigitCode();
      let candidate = generateInvitationSlug(groom, bride, code);
      let attempts = 0;
      while (existingSlugsRef.current.has(candidate.toLowerCase()) && attempts < 8) {
        code = generate4DigitCode();
        candidate = generateInvitationSlug(groom, bride, code);
        attempts++;
      }
      sessionSlugCodeRef.current = code;

      setInvitationState((prev) => {
        if (prev.slug === candidate) return prev;
        return { ...prev, slug: candidate };
      });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [invitationState.hostNames, isSlugLocked, isLoadingInvitation]);

  // Keep template sync if changed
  const handleSelectTemplate = (tpl: Template) => {
    lastSyncedSlugRef.current = tpl.slug;
    setInvitationState((prev) => ({
      ...prev,
      templateId: tpl.id,
      templateSlug: tpl.slug,
      coverImage: tpl.previewImage,
      galleryImages: [tpl.previewImage, ...(prev.galleryImages ? prev.galleryImages.slice(1) : [])],
      customColors: {
        primary: tpl.colorStyle.primary,
        secondary: tpl.colorStyle.secondary,
        accent: tpl.colorStyle.accent,
        background: tpl.colorStyle.background,
        text: tpl.colorStyle.text,
      },
      customFonts: {
        heading: tpl.typography.headingFont,
        body: tpl.typography.bodyFont,
      },
    }));

    // Update browser URL silently while preserving ?invitationId=...&step=... query params
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState({}, '', `/create/${tpl.slug}${window.location.search || ''}`);
    }

    showToast(`«${tpl.name}» ${t.builder.toasts.templateSelectedSuffix}`, 'info');
  };

  // Synchronize ONLY when route URL templateSlug parameter changes externally
  useEffect(() => {
    if (queryInvitationId) return;
    if (params.templateSlug && params.templateSlug !== lastSyncedSlugRef.current) {
      lastSyncedSlugRef.current = params.templateSlug;
      const matchResolved = resolveTemplate(params.templateSlug, availableTemplates);
      if (matchResolved) {
        handleSelectTemplate(matchResolved.template);
      }
    }
  }, [params.templateSlug, availableTemplates, queryInvitationId]);

  const handleResolvedOrderUpdate = useCallback(
    (nextStatus: OrderStatus, reason?: string, sentAt?: string, slug?: string) => {
      const canonical = resolveInvitationPaymentStatus(null, { status: nextStatus });
      const prevCanonical = orderTransitionBaselineRef.current;

      setOrderStatus(canonical);
      if (reason !== undefined) setOrderRejectReason(reason);
      if (sentAt) setOrderSentAt(sentAt);

      if (canonical === 'paid') {
        try { localStorage.removeItem('taklifim_builder_draft'); } catch {}
        setInvitationState((prev) => ({
          ...prev,
          status: 'paid',
          paymentStatus: 'paid',
          orderId: activeOrderId || prev.orderId,
        }));
        setPublishedSlug(slug || invitationState.slug);
        setIsOrderComplete(true);
        if (prevCanonical && prevCanonical !== 'paid') {
          showToast(t.builder.toasts.invitationActivated, 'success');
          try {
            confetti({
              particleCount: 160,
              spread: 90,
              origin: { y: 0.5 },
              colors: ['#F5C9D8', '#B9DFFA', '#B48B47', '#D9658B', '#FFD700'],
            });
          } catch {}
        }
      } else if (canonical === 'rejected' && prevCanonical && prevCanonical !== 'rejected') {
        setInvitationState((prev) => ({
          ...prev,
          status: 'rejected',
          paymentStatus: 'rejected',
          rejectReason: reason,
        }));
        showToast(t.builder.toasts.receiptRejected, 'error');
      }

      orderTransitionBaselineRef.current = canonical;
    },
    [activeOrderId, invitationState.slug, showToast, t.builder.toasts.invitationActivated, t.builder.toasts.receiptRejected]
  );

  // Real-time RTDB subscription + visibility-aware 5s polling while order is pending_review
  useEffect(() => {
    if (!authReady || !activeOrderId || orderStatus !== 'pending_review') return;

    const unsubRtdb = api.subscribeOrder(activeOrderId, (ord: OrderItem | null) => {
      if (!ord?.status) return;
      handleResolvedOrderUpdate(
        ord.status,
        ord.rejectReason,
        ord.receiptSentAt || ord.submittedAt,
        ord.invitationSlug
      );
    });

    let timerId: number | null = null;
    const pollOnce = async () => {
      const res = await api.getOrderStatus(activeOrderId);
      if (!res.success && res.statusCode === 403 && !queryInvitationId) {
        // This order belongs to another account (stale browser draft) — stop polling and start clean.
        stopPolling();
        resetToFreshDraft();
        return;
      }
      if (res.success && res.status) {
        handleResolvedOrderUpdate(
          res.status,
          res.rejectReason,
          res.receiptSentAt,
          res.invitationSlug
        );
      }
    };

    const startPolling = () => {
      if (timerId !== null || document.hidden) return;
      timerId = window.setInterval(() => {
        if (!document.hidden) pollOnce();
      }, 5000);
    };

    const stopPolling = () => {
      if (timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        pollOnce();
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      unsubRtdb();
      stopPolling();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [authReady, hasFirebaseSession, activeOrderId, orderStatus, handleResolvedOrderUpdate]);

  // Copy Card Number to clipboard
  const handleCopyCardNumber = () => {
    try {
      navigator.clipboard.writeText(PAYMENT_CONFIG.cardNumberRaw);
      setCopiedCard(true);
      showToast(t.builder.toasts.cardCopied, 'success');
      setTimeout(() => setCopiedCard(false), 2500);
    } catch {
      showToast(`${t.builder.cardNumberLabel}: ${PAYMENT_CONFIG.cardNumberFormatted}`, 'info');
    }
  };

  // Handle receipt file change (images compressed to max 1600px width, quality 0.8, target <800KB; PDF ≤4MB)
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
      setFileBase64('');
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

  // Upload receipt and send to Telegram admin (server atomically commits order & pending_review)
  const handleSubmitReceiptUpload = async () => {
    if (receiptSubmitLockRef.current || isUploadingReceipt) return;

    if (!hasFirebaseSession) {
      setUploadError(
        t.auth?.errors?.receiptAuthRequiredDesc ||
          'Chek yuborish uchun Google yoki Apple ID orqali hisobingizga kirilgan bo‘lishi kerak.'
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
      contactPhone || invitationState.socialLinks?.phone || user?.phone || ''
    );
    if (!cleanPhone) {
      setUploadError(t.auth.errors.invalidPhone);
      return;
    }

    if (isPdf && selectedFile.size > MAX_PDF_BYTES) {
      setUploadError(t.validation.receiptPdfTooLarge);
      return;
    }

    const resolvedTpl = resolveTemplate(invitationState, availableTemplates);
    if (!resolvedTpl) {
      setUploadError(t.templateError.orderBlockedError);
      showToast(t.templateError.orderBlockedError, 'error');
      reportTemplateResolutionError({
        source: 'BuilderPage',
        templateId: invitationState.templateId,
        templateSlug: invitationState.templateSlug,
        invitationId: invitationState.id,
        invitationSlug: invitationState.slug,
      });
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
      const currentTemplate = resolvedTpl.template;
      const finalPrice = currentTemplate.price || 60000;

      let orderId = activeOrderId || invitationState.orderId || '';
      if (!orderId) {
        const order = await api.createOrder({
          serviceType: 'website_invitation',
          serviceName: `${invitationState.eventTitle} (${invitationState.hostNames})`,
          planName: `${currentTemplate.name} (${formatPriceUZS(finalPrice, language)})`,
          price: finalPrice,
          customerName: invitationState.hostNames,
          customerPhone: cleanPhone,
          ownerUid: user?.id,
          invitationId: invitationState.id,
          invitationSlug: invitationState.slug,
          templateId: resolvedTpl.templateId,
          templateSlug: resolvedTpl.templateSlug,
          templateName: currentTemplate.name,
          weddingDate: invitationState.eventDate,
          venueName: invitationState.venueName,
          status: 'pending_payment',
        });
        orderId = order.id;
        setActiveOrderId(orderId);
      }

      // Save invitation content first; keep draft/pending_payment client-side (server sets pending_review atomically)
      const safeClientStatus =
        invitationState.status === 'draft' || invitationState.status === 'pending_payment'
          ? 'pending_payment'
          : invitationState.status;
      const savedInv = await api.saveInvitation({
        ...invitationState,
        templateId: resolvedTpl.templateId,
        templateSlug: resolvedTpl.templateSlug,
        status: safeClientStatus,
        ownerId: user?.id || invitationState.ownerId,
        ownerUid: user?.id || invitationState.ownerUid,
        updatedAt: new Date().toISOString(),
      });

      if (
        savedInv.id !== invitationState.id ||
        savedInv.slug !== invitationState.slug ||
        savedInv.ownerId !== invitationState.ownerId ||
        savedInv.ownerUid !== invitationState.ownerUid
      ) {
        setInvitationState((prev) => ({
          ...prev,
          id: savedInv.id,
          slug: savedInv.slug,
          ownerId: savedInv.ownerId,
          ownerUid: savedInv.ownerUid,
        }));
      }

      let fileUrl: string | undefined;
      let fileBase64Payload: string | undefined = fileBase64 || undefined;

      if (isPdf) {
        const storage = isFirebaseConfigured() ? await getStorageLazy() : null;
        const { ref: storageRef, uploadBytes, getDownloadURL } = await import('firebase/storage');
        if (!storage) {
          throw new Error(t.builder.toasts.pdfStorageError);
        }
        const path = `receipts/${orderId}/${Date.now()}_${selectedFile.name}`;
        const ref = storageRef(storage, path);
        await uploadBytes(ref, selectedFile, { contentType: 'application/pdf' });
        fileUrl = await getDownloadURL(ref);
        fileBase64Payload = undefined;
      }

      const res = await api.uploadReceipt(
        {
          orderId,
          invitationId: savedInv.id,
          invitationSlug: savedInv.slug,
          customerName: savedInv.hostNames,
          customerPhone: cleanPhone,
          templateId: resolvedTpl.templateId,
          templateSlug: resolvedTpl.templateSlug,
          templateName: currentTemplate.name,
          weddingDate: savedInv.eventDate,
          venueName: savedInv.venueName,
          price: finalPrice,
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
        if (user && cleanAndValidateUzPhone(user.phone || '') !== cleanPhone) {
          updateUserProfile({ phone: cleanPhone }).catch(() => {});
        }
        const nowSentAt = res.receiptSentAt || new Date().toISOString();
        orderTransitionBaselineRef.current = 'pending_review';
        setActiveOrderId(orderId);
        setOrderStatus('pending_review');
        setOrderRejectReason('');
        setOrderSentAt(nowSentAt);
        setSelectedFile(null);
        setFileBase64('');
        setPreparedFileType('');
        setPreparedFileName('');
        setReceiptIdempotencyKey('');
        setUploadIsNetworkError(false);

        const updatedInv: InvitationData = {
          ...invitationState,
          id: savedInv.id,
          slug: savedInv.slug,
          status: 'pending_review',
          paymentStatus: 'pending_review',
          orderId,
          receiptSentAt: nowSentAt,
          ownerId: savedInv.ownerId || user?.id || invitationState.ownerId,
          ownerUid: savedInv.ownerUid || user?.id || invitationState.ownerUid,
        };
        setInvitationState(updatedInv);
        try {
          if (!queryInvitationId) {
            localStorage.setItem('taklifim_builder_draft', JSON.stringify(updatedInv));
          }
          if (typeof window !== 'undefined' && window.history?.replaceState) {
            window.history.replaceState(
              {},
              '',
              `/create/${updatedInv.templateSlug}?invitationId=${encodeURIComponent(updatedInv.id)}&step=11`
            );
          }
        } catch {}

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

  // Draft management
  useEffect(() => {
    if (!invitationState.musicUrl) {
      setPreviewAudioUrl('');
      return;
    }
    audioStorage.getAudioUrl(invitationState.musicUrl).then((resolved) => {
      setPreviewAudioUrl(resolved || invitationState.musicUrl || '');
    });
  }, [invitationState.musicUrl]);

  const handleSaveDraft = async () => {
    try {
      const saved = await api.saveInvitation({
        ...invitationState,
        ownerId: user?.id || invitationState.ownerId,
        ownerUid: user?.id || invitationState.ownerUid,
      });
      setInvitationState((prev) => ({
        ...prev,
        id: saved.id,
        slug: saved.slug,
        ownerId: saved.ownerId,
        ownerUid: saved.ownerUid,
      }));
      if (!queryInvitationId) {
        localStorage.setItem('taklifim_builder_draft', JSON.stringify(saved));
      }
      showToast(t.builder.toasts.draftSaved, 'success');
    } catch {
      showToast(t.builder.toasts.draftSaveError, 'error');
    }
  };

  const handleStartOverConfirm = () => {
    localStorage.removeItem('taklifim_builder_draft');
    setShowResetModal(false);
    if (queryInvitationId) {
      navigate(`/create/${invitationState.templateSlug}`);
      return;
    }
    window.location.reload();
  };

  // Schedule management
  const handleAddScheduleItem = () => {
    const newItem: ScheduleItem = {
      id: `s-${Date.now()}`,
      time: '19:00',
      title: t.builder.defaultScheduleTitle,
      description: '',
    };
    setInvitationState((prev) => ({
      ...prev,
      schedule: [...prev.schedule, newItem],
    }));
  };

  const handleRemoveScheduleItem = (id: string) => {
    setInvitationState((prev) => ({
      ...prev,
      schedule: prev.schedule.filter((s) => s.id !== id),
    }));
  };

  // Photo gallery upload with multi-select and live preview sync
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    let loadedCount = 0;
    const newUrls: string[] = [];

    fileList.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          newUrls.push(uploadEvent.target.result as string);
          loadedCount++;
          if (loadedCount === fileList.length) {
            setInvitationState((prev) => {
              const updatedGallery = [...prev.galleryImages, ...newUrls];
              return {
                ...prev,
                galleryImages: updatedGallery,
                coverImage: updatedGallery[0] || prev.coverImage,
              };
            });
            showToast(`${fileList.length} ${t.builder.toasts.photosAddedSuccess}`, 'success');
          }
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    setInvitationState((prev) => {
      const updated = prev.galleryImages.filter((_, i) => i !== index);
      return {
        ...prev,
        galleryImages: updated,
        coverImage: updated.length > 0 ? updated[0] : prev.coverImage,
      };
    });
    showToast(t.builder.toasts.photoRemoved, 'info');
  };

  const handleMovePhoto = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setInvitationState((prev) => {
      const updated = [...prev.galleryImages];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return {
        ...prev,
        galleryImages: updated,
        coverImage: updated[0] || prev.coverImage,
      };
    });
  };

  // Music upload handler
  const handleMusicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let firstUploadedKey = '';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|ogg|m4a|aac)$/i)) {
        continue;
      }

      try {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_]+/g, ' ').trim() || t.shared.musicDefaultTitle;
        const trackId = `track_${Date.now()}_${i}`;
        const storageKey = await audioStorage.saveAudioFile(`audio_${invitationState.id}_${trackId}`, file);

        if (!firstUploadedKey) {
          firstUploadedKey = storageKey;
        }

        setInvitationState((prev) => {
          const prevTracks = prev.musicTracks || [];
          const newTrack = { id: trackId, title: cleanName, url: storageKey };
          const updatedTracks = [...prevTracks, newTrack];
          const updated = {
            ...prev,
            musicEnabled: true,
            musicTitle: prev.musicTitle || cleanName,
            musicUrl: prev.musicUrl || storageKey,
            musicTracks: updatedTracks,
            musicPlacement: prev.musicPlacement || 'all',
          };
          try {
            localStorage.setItem('taklifim_builder_draft', JSON.stringify(updated));
          } catch {}
          return updated;
        });

        showToast(`${t.builder.toasts.musicLoaded} ${cleanName}`, 'success');
      } catch (err) {
        console.error('Audio upload error:', err);
      }
    }

    if (firstUploadedKey) {
      const resolved = await audioStorage.getAudioUrl(firstUploadedKey);
      setPreviewAudioUrl(resolved);
    }

    e.target.value = '';
  };

  const handleSelectTrack = (track: { id: string; title: string; url: string }) => {
    setInvitationState((prev) => ({
      ...prev,
      musicEnabled: true,
      musicTitle: track.title,
      musicUrl: track.url,
    }));
    audioStorage.getAudioUrl(track.url).then((resolved) => {
      setPreviewAudioUrl(resolved);
    });
    showToast(`${t.builder.toasts.musicLoaded} ${track.title}`, 'success');
  };

  const handleRemoveTrack = (trackId: string) => {
    setInvitationState((prev) => {
      const remaining = (prev.musicTracks || []).filter((t) => t.id !== trackId);
      const activeUrl = prev.musicUrl;
      const willResetActive = remaining.every((t) => t.url !== activeUrl);
      return {
        ...prev,
        musicTracks: remaining,
        musicTitle: willResetActive ? (remaining[0]?.title || '') : prev.musicTitle,
        musicUrl: willResetActive ? (remaining[0]?.url || '') : prev.musicUrl,
        musicEnabled: remaining.length > 0 ? prev.musicEnabled : false,
      };
    });
    showToast(t.builder.toasts.trackRemoved, 'info');
  };

  const handleRemoveMusic = () => {
    setInvitationState((prev) => ({
      ...prev,
      musicEnabled: false,
      musicTitle: '',
      musicUrl: '',
      musicTracks: [],
      musicFileData: undefined,
    }));
    setPreviewAudioUrl('');
    showToast(t.builder.toasts.allMusicRemoved, 'info');
  };

  const stepsList = [
    { num: 1, title: t.builder.simple.stageTemplate },
    { num: 2, title: t.builder.simple.stageDetails },
    { num: 3, title: t.builder.simple.stageCustomize },
    { num: 11, title: t.builder.simple.stageCheckout },
  ];
  const currentStageIndex = Math.max(0, stepsList.findIndex((st) => st.num === currentStep));
  const prevSimpleStep = SIMPLE_STEPS[Math.max(0, currentStageIndex - 1)];
  const nextSimpleStep = SIMPLE_STEPS[Math.min(SIMPLE_STEPS.length - 1, currentStageIndex + 1)];
  const isSampleHostNames = /^\s*asrorbek\s*&\s*madina\s*$/i.test(invitationState.hostNames || '');


  const stateTemplateResolution = resolveTemplate(invitationState, availableTemplates);
  const isTemplateResolutionError =
    !isLoadingInvitation &&
    ((!queryInvitationId && !routeTemplateResolution) || !stateTemplateResolution);

  useEffect(() => {
    if (isTemplateResolutionError && !isOrderComplete) {
      reportTemplateResolutionError({
        source: 'BuilderPage',
        templateId: invitationState.templateId,
        templateSlug: params.templateSlug || invitationState.templateSlug,
        invitationId: invitationState.id,
        invitationSlug: invitationState.slug,
      });
    }
  }, [
    isTemplateResolutionError,
    isOrderComplete,
    invitationState.templateId,
    invitationState.templateSlug,
    invitationState.id,
    invitationState.slug,
    params.templateSlug,
  ]);

  if (isOrderComplete) {
    const liveUrl = `/i/${publishedSlug || invitationState.slug}`;
    const fullLiveUrl = typeof window !== 'undefined' ? `${window.location.origin}${liveUrl}` : liveUrl;

    return (
      <div className="taklifim-page-top pb-16 min-h-screen flex items-center justify-center px-4">
        <GlassSurface variant="elevated" rounded="3xl" className="w-full max-w-lg p-6 sm:p-10 text-center space-y-6 animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 mx-auto flex items-center justify-center text-emerald-700 shadow-xs">
            <CheckCircle2 className="w-9 h-9" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <span className="inline-block text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              {t.builder.orderCompleteBadge}
            </span>
            <h1 className="font-playfair text-3xl font-bold text-[#1E1418]">
              {t.builder.orderCompleteHeading}
            </h1>
            <p className="text-xs sm:text-sm text-[#4A383F] leading-relaxed">
              {t.builder.orderCompleteDesc}
            </p>
          </div>

          <GlassSurface variant="subtle" rounded="2xl" className="p-4 text-xs text-left space-y-2.5">
            <div className="flex justify-between gap-3 border-b border-black/8 pb-2">
              <span className="text-[#4A383F] shrink-0">{t.guestGate.eventLabel}:</span>
              <strong className="text-[#1E1418] text-right min-w-0 break-words">{invitationState.eventTitle}</strong>
            </div>
            <div className="flex justify-between gap-3 border-b border-black/8 pb-2">
              <span className="text-[#4A383F] shrink-0">{t.builder.reviewCouple}</span>
              <strong className="text-[#1E1418] text-right min-w-0 break-words">{invitationState.hostNames}</strong>
            </div>
            <div className="flex justify-between gap-3 border-b border-black/8 pb-2">
              <span className="text-[#4A383F] shrink-0">{t.guestGate.dateLabel}:</span>
              <strong className="text-[#1E1418] tabular-nums text-right min-w-0 break-words">
                {formatLocalizedFullDate(invitationState.eventDate, language)} ({normalizeTime24h(invitationState.startTime)})
              </strong>
            </div>
            <div className="flex justify-between items-center gap-3 pt-0.5">
              <span className="text-[#4A383F] shrink-0">{t.builder.linkLabel}</span>
              <span className="font-mono text-[#9E3E60] font-bold truncate max-w-[200px]">
                {liveUrl}
              </span>
            </div>
          </GlassSurface>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <GlassButton
              tone="tinted"
              size="md"
              href={liveUrl}
              onAnchorClick={(e) => {
                e.preventDefault();
                navigate(liveUrl);
              }}
              leftIcon={<Eye className="w-4 h-4" aria-hidden="true" />}
              className="w-full"
            >
              {t.builder.viewInvitationBtn}
            </GlassButton>

            <GlassButton
              type="button"
              tone="light"
              size="md"
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(fullLiveUrl);
                  showToast(t.common.linkCopied, 'success');
                }
              }}
              leftIcon={<Share2 className="w-4 h-4 text-[#9E3E60]" aria-hidden="true" />}
              className="w-full"
            >
              {t.common.copyLink}
            </GlassButton>
          </div>

          <div className="pt-2 border-t border-black/5">
            <Link
              to="/my-invitations"
              className="text-xs font-semibold text-[#4A383F] hover:text-[#1E1418] inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              <Users className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.builder.goMyInvitationsBtn}</span>
            </Link>
          </div>
        </GlassSurface>
      </div>
    );
  }

  if (isLoadingInvitation) {
    return (
      <div className="taklifim-page-top pb-16 min-h-screen flex items-center justify-center px-4">
        <GlassSurface variant="elevated" rounded="3xl" className="p-8 text-center space-y-3 max-w-xs w-full">
          <div className="w-9 h-9 border-[3px] border-[#E27B9B] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-[#4A383F]">{t.builder.loadingDraft}</p>
        </GlassSurface>
      </div>
    );
  }

  if (isTemplateResolutionError) {
    return (
      <TemplateResolutionError
        language={language}
        templateSlug={params.templateSlug || invitationState.templateSlug}
        templateId={invitationState.templateId}
        onNavigate={navigate}
      />
    );
  }

  return (
    <div className="taklifim-page-top pb-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 space-y-5 sm:space-y-6">
        {/* Top Builder Bar */}
        <GlassSurface variant="elevated" rounded="3xl" className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/templates"
              className="min-h-[40px] min-w-[40px] rounded-full glass-surface-subtle hover:bg-white text-[#4A383F] hover:text-[#1E1418] flex items-center justify-center transition-colors"
              title={t.common.back}
              aria-label={t.common.back}
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            </Link>
            <div>
              <h1 className="font-playfair text-xl font-bold text-[#1E1418]">
                {t.builder.title}
              </h1>
              <p className="text-[11px] text-[#4A383F] tabular-nums">
                {stepsList[currentStageIndex]?.title} ·{' '}
                {t.builder.simple.progress
                  .replace('{current}', String(currentStageIndex + 1))
                  .replace('{total}', String(stepsList.length))}
              </p>
            </div>
          </div>

          {/* Quick Draft Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <GlassButton
              type="button"
              tone="light"
              size="sm"
              onClick={handleSaveDraft}
              leftIcon={<Save className="w-3.5 h-3.5 text-[#9E3E60]" aria-hidden="true" />}
              title={t.builder.saveDraft}
            >
              <span className="hidden sm:inline">{t.builder.saveDraft}</span>
            </GlassButton>
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="min-h-[40px] min-w-[40px] rounded-full glass-surface-subtle hover:bg-rose-50 text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
              title={t.builder.startOver}
              aria-label={t.builder.startOver}
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
            </button>

            {/* Mobile View Toggle */}
            <div className="lg:hidden">
              <GlassSegmented
                ariaLabel={t.builder.title}
                value={activeTabMobile}
                onChange={(val) => setActiveTabMobile(val)}
                options={[
                  { value: 'settings', label: t.builder.settingsTab },
                  { value: 'preview', label: t.builder.previewShortTab },
                ]}
              />
            </div>
          </div>
        </GlassSurface>

        {/* Simple 4-stage stepper */}
        <ol className="grid grid-cols-4 gap-1.5 sm:gap-2.5" aria-label={t.builder.title}>
          {stepsList.map((st, idx) => {
            const isActive = currentStep === st.num;
            const isDone = currentStageIndex > idx;
            return (
              <li key={st.num} className="min-w-0">
                <button
                  type="button"
                  onClick={() => goToStep(st.num)}
                  aria-current={isActive ? 'step' : undefined}
                  className={`w-full min-h-[52px] px-1.5 sm:px-3 py-2 rounded-2xl flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-center transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#1E1418] text-white shadow-md'
                      : isDone
                      ? 'glass-surface-tinted-sky text-[#1E3A5F] hover:bg-white/90'
                      : 'glass-surface-subtle text-[#4A383F] hover:bg-white/90'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                      isActive ? 'bg-white text-[#1E1418]' : isDone ? 'bg-[#1E3A5F] text-white' : 'bg-black/8 text-[#4A383F]'
                    }`}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" aria-hidden="true" /> : idx + 1}
                  </span>
                  <span className="text-[10.5px] sm:text-xs font-semibold leading-tight line-clamp-2">{st.title}</span>
                </button>
              </li>
            );
          })}
        </ol>

        {/* SPLIT LAYOUT: Settings Panel on Left, Reactive Live Preview on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: STEP SETTINGS PANEL */}
          <GlassSurface
            variant="elevated"
            rounded="3xl"
            className={`lg:col-span-6 p-6 sm:p-8 space-y-6 ${
              activeTabMobile === 'preview' ? 'hidden lg:block' : 'block'
            }`}
          >
            {/* STEP 1: Select Template */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="font-playfair text-xl font-bold text-[#231E1B]">
                  {t.builder.step1Heading}
                </h3>
                <p className="text-xs text-[#7A6A63]">
                  {t.builder.step1Desc}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[560px] overflow-y-auto pr-1">
                  {availableTemplates.map((tpl) => {
                    const isSelected =
                      invitationState.templateSlug === tpl.slug ||
                      invitationState.templateId === tpl.id;

                    return (
                      <button
                        type="button"
                        key={tpl.id}
                        onClick={() => handleSelectTemplate(tpl)}
                        className={`text-left cursor-pointer rounded-2xl overflow-hidden border-2 transition-all p-2 relative group focus:outline-none ${
                          isSelected
                            ? 'border-[#D9658B] ring-2 ring-[#D9658B]/30 bg-white shadow-md'
                            : 'border-transparent hover:border-black/10 glass-panel hover:bg-white/70'
                        }`}
                      >
                        <div className="relative">
                          <img
                            src={tpl.previewImage}
                            alt={tpl.name}
                            className="w-full aspect-[4/5] object-cover object-center rounded-xl mb-2 bg-[#F7F1EE]"
                            loading="lazy"
                            decoding="async"
                          />
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#D9658B] text-white flex items-center justify-center text-xs shadow-md">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <div className="text-xs font-bold text-[#231E1B] truncate">{tpl.name}</div>
                        <div className="text-[10px] text-[#7A6A63]">{translateCategory(tpl.category, language)}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: Event Details */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-playfair text-xl font-bold text-[#1E1418]">
                    {t.builder.step2Heading}
                  </h3>
                  <p className="text-xs text-[#4A383F] mt-0.5">{t.builder.simple.detailsHint}</p>
                </div>
                <div className="space-y-3.5 text-xs">
                  <GlassInput
                    type="text"
                    label={t.builder.eventTypeLabel}
                    value={invitationState.eventType}
                    onChange={(e) =>
                      setInvitationState((p) => ({ ...p, eventType: e.target.value }))
                    }
                  />

                  <GlassInput
                    type="text"
                    label={t.builder.hostNamesLabel}
                    value={invitationState.hostNames}
                    onChange={(e) => {
                      const nextHosts = e.target.value;
                      setInvitationState((p) => {
                        const parsed = parseHostNames(nextHosts);
                        const derivedTitle = !isTitleManualRef.current
                          ? deriveEventTitleFromHosts(nextHosts, p.hostNames, p.eventTitle)
                          : { nextTitle: p.eventTitle, wasAutoDerived: false };
                        return {
                          ...p,
                          hostNames: nextHosts,
                          partner1Name: parsed.groom,
                          partner2Name: parsed.bride,
                          eventTitle: derivedTitle.nextTitle,
                        };
                      });
                    }}
                    placeholder={t.builder.hostNamesPlaceholder}
                  />

                  <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3">
                    <div className="min-w-0">
                      <label className="font-bold text-[11px] text-[#3A2D28] block mb-1.5">{t.builder.weddingDateLabel}</label>
                      <input
                        type="date"
                        value={invitationState.eventDate}
                        onChange={(e) =>
                          setInvitationState((p) => ({ ...p, eventDate: e.target.value }))
                        }
                        className={`${GLASS_FIELD_CLS} min-h-[44px]`}
                      />
                      {invitationState.eventDate && (
                        <span className="text-[11px] font-medium text-[#4A383F] block mt-1.5 capitalize">
                          {formatLocalizedFullDate(invitationState.eventDate, language)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <label className="font-bold text-[11px] text-[#3A2D28] block mb-1.5">{t.builder.startTimeLabel}</label>
                      <div className="relative">
                        <Clock className="w-3.5 h-3.5 text-[#9E3E60] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                        <select
                          aria-label={t.builder.startTimeLabel}
                          value={normalizeTime24h(invitationState.startTime, '18:00')}
                          onChange={(e) =>
                            setInvitationState((p) => ({ ...p, startTime: normalizeTime24h(e.target.value, '18:00') }))
                          }
                          className={`${GLASS_FIELD_CLS} min-h-[44px] pl-9 font-bold tabular-nums cursor-pointer`}
                        >
                          {get24hTimeSlots(invitationState.startTime).map((slot) => (
                            <option key={slot} value={slot}>
                              {slot}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Venue location type */}
                  <div>
                    <label className="font-bold text-[11px] text-[#3A2D28] block mb-1.5">
                      {t.builder.venueWhereLabel}
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          setInvitationState((p) => ({
                            ...p,
                            venueLocationType: 'restaurant',
                            venueName: p.venueName === 'Xonadonda' || p.venueName === 'Uyda' ? '' : p.venueName,
                          }))
                        }
                        className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-center transition-all border cursor-pointer ${
                          (invitationState.venueLocationType || 'restaurant') === 'restaurant'
                            ? 'glass-surface-tinted-pink border-[#C64873] text-[#9E3E60] shadow-xs font-bold'
                            : 'glass-surface-subtle text-[#4A383F] hover:bg-white/90'
                        }`}
                      >
                        <span className="text-xl">🏛️</span>
                        <span className="text-xs font-bold">{t.builder.venueRestaurantBtn}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setInvitationState((p) => ({
                            ...p,
                            venueLocationType: 'home',
                            venueName: 'Xonadonda',
                          }))
                        }
                        className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-center transition-all border cursor-pointer ${
                          invitationState.venueLocationType === 'home'
                            ? 'glass-surface-tinted-pink border-[#C64873] text-[#9E3E60] shadow-xs font-bold'
                            : 'glass-surface-subtle text-[#4A383F] hover:bg-white/90'
                        }`}
                      >
                        <span className="text-xl">🏡</span>
                        <span className="text-xs font-bold">{t.builder.venueHomeBtn}</span>
                      </button>
                    </div>
                  </div>

                  {(invitationState.venueLocationType || 'restaurant') === 'restaurant' && (
                    <div className="space-y-3 pt-1 animate-fadeIn">
                      <div>
                        <label className="font-bold text-[11px] text-[#3A2D28] block mb-1.5">
                          {t.builder.audienceLabel}
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'men', label: t.builder.audienceMen, icon: '👔' },
                            { id: 'women', label: t.builder.audienceWomen, icon: '👗' },
                            { id: 'all', label: t.builder.audienceAll, icon: '👫' },
                          ].map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() =>
                                setInvitationState((p) => ({
                                  ...p,
                                  celebrationAudience: item.id as 'all' | 'men' | 'women',
                                }))
                              }
                              className={`py-2.5 px-2 rounded-xl text-center transition-all border flex flex-col items-center gap-1 cursor-pointer ${
                                (invitationState.celebrationAudience || 'all') === item.id
                                  ? 'glass-surface-tinted-pink border-[#C64873] text-[#9E3E60] shadow-xs font-bold'
                                  : 'glass-surface-subtle text-[#4A383F] hover:bg-white/90'
                              }`}
                            >
                              <span className="text-base">{item.icon}</span>
                              <span className="text-[11px] leading-tight font-medium">{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <GlassInput
                        type="text"
                        label={t.builder.venueHallLabel}
                        value={invitationState.venueName === 'Xonadonda' ? '' : invitationState.venueName}
                        onChange={(e) =>
                          setInvitationState((p) => ({ ...p, venueName: e.target.value }))
                        }
                        placeholder={t.builder.venueHallPlaceholder}
                      />
                    </div>
                  )}

                  <GlassInput
                    type="text"
                    label={invitationState.venueLocationType === 'home' ? t.builder.homeAddressLabel : t.builder.exactAddressLabel}
                    value={invitationState.venueAddress}
                    onChange={(e) =>
                      setInvitationState((p) => ({ ...p, venueAddress: e.target.value }))
                    }
                    placeholder={invitationState.venueLocationType === 'home' ? t.builder.homeAddressPlaceholder : t.builder.venueAddressPlaceholder}
                  />
                </div>
              </div>
            )}

            {/* Customize stage intro */}
            {currentStep === 3 && (
              <div className="space-y-1.5">
                <h3 className="font-playfair text-xl font-bold text-[#1E1418]">{t.builder.simple.customizeTitle}</h3>
                <p className="text-xs leading-relaxed text-[#4A383F]">{t.builder.simple.customizeHint}</p>
              </div>
            )}

            {/* Optional section 3 */}
            {currentStep === 3 && (
              <BuilderSectionToggle
                icon="✍️"
                title={t.builder.steps.message}
                optionalLabel={t.builder.simple.optional}
                isOpen={openSection === 3}
                onToggle={() => setOpenSection((prev) => (prev === 3 ? null : 3))}
              />
            )}
            {currentStep === 3 && openSection === 3 && (
              <div className="space-y-4">
                <h3 className="font-playfair text-xl font-bold text-[#1E1418]">
                  {t.builder.step3Heading}
                </h3>
                <div className="space-y-3.5 text-xs">
                  <GlassTextarea
                    rows={5}
                    label={t.builder.sincereMessageLabel}
                    value={invitationState.invitationMessage}
                    onChange={(e) =>
                      setInvitationState((p) => ({ ...p, invitationMessage: e.target.value }))
                    }
                    className="leading-relaxed"
                  />

                  <GlassInput
                    type="text"
                    label={t.builder.quoteLabel}
                    value={invitationState.invitationQuote || ''}
                    onChange={(e) =>
                      setInvitationState((p) => ({ ...p, invitationQuote: e.target.value }))
                    }
                  />
                </div>
              </div>
            )}

            {/* Optional section 4 */}
            {currentStep === 3 && (
              <BuilderSectionToggle
                icon="🎨"
                title={t.builder.steps.design}
                optionalLabel={t.builder.simple.optional}
                isOpen={openSection === 4}
                onToggle={() => setOpenSection((prev) => (prev === 4 ? null : 4))}
              />
            )}
            {currentStep === 3 && openSection === 4 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-playfair text-xl font-bold text-[#231E1B]">
                      {t.builder.step4Heading}
                    </h3>
                    <p className="text-xs text-[#7A6A63] mt-0.5">
                      {t.builder.step4Desc}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const activeTpl = stateTemplateResolution?.template || routeTemplateResolution?.template;
                      if (!activeTpl) return;
                      setInvitationState((p) => ({
                        ...p,
                        customColors: {
                          primary: activeTpl.colorStyle.primary,
                          secondary: activeTpl.colorStyle.secondary,
                          accent: activeTpl.colorStyle.accent,
                          background: activeTpl.colorStyle.background,
                          text: activeTpl.colorStyle.text,
                        },
                      }));
                      showToast(t.builder.toasts.colorsReset, 'info');
                    }}
                    className="text-[11px] font-semibold text-[#8A7C74] hover:text-[#231E1B] underline"
                  >
                    {t.builder.resetColorsBtn}
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 gap-2.5">
                    {([
                      { key: 'primary', label: t.builder.colorPrimaryFull, default: '#B48B47' },
                      { key: 'secondary', label: t.builder.colorSecondaryFull, default: '#D9658B' },
                      { key: 'accent', label: t.builder.colorAccentFull, default: '#C9A96E' },
                      { key: 'background', label: t.builder.colorBackgroundFull, default: '#FAF6F0' },
                      { key: 'text', label: t.builder.colorTextFull, default: '#231E1B' },
                    ] as { key: keyof NonNullable<typeof invitationState.customColors>; label: string; default: string }[]).map((item) => {
                      const { key, label } = item;
                      const currentVal = invitationState.customColors?.[key] || item.default;
                      return (
                        <div key={key} className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/70 border border-black/8 hover:bg-white hover:shadow-xs transition-all">
                          <div className="relative">
                            <input
                              type="color"
                              value={currentVal.startsWith('#') && currentVal.length === 7 ? currentVal : '#B48B47'}
                              onChange={(e) =>
                                setInvitationState((p) => ({
                                  ...p,
                                  customColors: { ...p.customColors, [key]: e.target.value },
                                }))
                              }
                              className="w-10 h-10 rounded-xl cursor-pointer border-2 border-white shadow-xs p-0 bg-transparent flex-shrink-0"
                              title={label}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[#231E1B] truncate">{label}</p>
                            <p className="text-[10px] text-[#8A7C74]">{t.builder.colorHexHint}</p>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <input
                              type="text"
                              value={currentVal}
                              maxLength={7}
                              onChange={(e) => {
                                const val = e.target.value;
                                setInvitationState((p) => ({
                                  ...p,
                                  customColors: { ...p.customColors, [key]: val },
                                }));
                              }}
                              placeholder="#000000"
                              className="w-[96px] shrink-0 px-1.5 py-1 rounded-lg border border-black/10 bg-white font-mono text-xs text-[#231E1B] uppercase text-center focus:ring-1 focus:ring-[#D9658B] outline-none"
                            />
                            <div
                              className="w-7 h-7 rounded-lg border border-black/10 shadow-inner flex-shrink-0"
                              style={{ backgroundColor: currentVal }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Curated Pre-made Themes */}
                  <div className="pt-2">
                    <label className="font-bold text-[#3A2D28] block mb-2">
                      {t.builder.curatedPalettesLabel}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { name: t.builder.paletteNames.gold, colors: { primary: '#B48B47', secondary: '#D9658B', accent: '#C9A96E', background: '#FAF6F0', text: '#231E1B' } },
                        { name: t.builder.paletteNames.rose, colors: { primary: '#D9658B', secondary: '#F5C9D8', accent: '#E8A0B8', background: '#FFF5F8', text: '#2A1520' } },
                        { name: t.builder.paletteNames.blue, colors: { primary: '#2A6F97', secondary: '#B9DFFA', accent: '#61A5C2', background: '#F0F8FF', text: '#1A2A35' } },
                        { name: t.builder.paletteNames.emerald, colors: { primary: '#2D6A4F', secondary: '#95D5B2', accent: '#52B788', background: '#F2FBF5', text: '#1B3A2B' } },
                        { name: t.builder.paletteNames.royal, colors: { primary: '#7209B7', secondary: '#F72585', accent: '#B5179E', background: '#FAF5FF', text: '#240046' } },
                        { name: t.builder.paletteNames.mono, colors: { primary: '#1F2937', secondary: '#6B7280', accent: '#4B5563', background: '#FFFFFF', text: '#111827' } },
                      ].map((palette) => (
                        <button
                          key={palette.name}
                          type="button"
                          onClick={() => {
                            setInvitationState((p) => ({ ...p, customColors: palette.colors }));
                            showToast(`«${palette.name}» ${t.builder.toasts.paletteAppliedSuffix}`, 'info');
                          }}
                          className="flex items-center gap-2 p-2 rounded-xl border border-black/8 bg-white/80 hover:bg-white hover:shadow-xs transition-all text-left group"
                        >
                          <div className="flex gap-0.5 flex-shrink-0">
                            {Object.values(palette.colors).slice(0, 3).map((c, i) => (
                              <div key={i} className="w-3.5 h-3.5 rounded-full border border-white/80 shadow-xs" style={{ backgroundColor: c }} />
                            ))}
                          </div>
                          <span className="text-[11px] font-semibold text-[#3A2D28] truncate group-hover:text-black">
                            {palette.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Typography Font selector */}
                  <div className="pt-2">
                    <label className="font-bold text-[#3A2D28] block mb-1">{t.builder.fontLabel}</label>
                    <CustomDropdown
                      value={invitationState.customFonts?.heading || 'Cormorant Garamond'}
                      onChange={(val) =>
                        setInvitationState((p) => ({
                          ...p,
                          customFonts: { ...p.customFonts, heading: val },
                        }))
                      }
                      className="w-full"
                      buttonClassName="w-full justify-between"
                      dropdownClassName="w-full left-0 right-0"
                      options={[
                        { value: 'Cormorant Garamond', label: `Cormorant Garamond — ${t.builder.fontClassic}` },
                        { value: 'Cormorant Garamond Serif', label: `Cormorant Garamond — ${t.builder.fontRoyal}` },
                        { value: 'Cormorant Garamond Italic', label: `Cormorant Garamond — ${t.builder.fontScript}` },
                        { value: 'Cormorant Garamond Clean', label: `Cormorant Garamond — ${t.builder.fontModern}` },
                        ...(invitationState.customFonts?.heading &&
                        ![
                          'Cormorant Garamond',
                          'Cormorant Garamond Serif',
                          'Cormorant Garamond Italic',
                          'Cormorant Garamond Clean',
                        ].includes(invitationState.customFonts.heading)
                          ? [
                              {
                                value: invitationState.customFonts.heading,
                                label: `Cormorant Garamond (${invitationState.customFonts.heading})`,
                              },
                            ]
                          : []),
                      ]}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Optional section 5 */}
            {currentStep === 3 && (
              <BuilderSectionToggle
                icon="📷"
                title={t.builder.steps.photos}
                optionalLabel={t.builder.simple.optional}
                isOpen={openSection === 5}
                onToggle={() => setOpenSection((prev) => (prev === 5 ? null : 5))}
              />
            )}
            {currentStep === 3 && openSection === 5 && (() => {
              const galleryPresetOptions = [
                { id: 'Bizning suratlarimiz', uz: 'Bizning suratlarimiz', ru: 'Наши фотографии', en: 'Our Photos', icon: '💑' },
                { id: 'To‘y jarayoni suratlari', uz: 'To‘y jarayoni suratlari', ru: 'Фото со свадьбы', en: 'Wedding Moments', icon: '📸' },
                { id: 'To‘yxona suratlari', uz: 'To‘yxona suratlari', ru: 'Фото банкетного зала', en: 'Venue Photos', icon: '🏛️' },
              ];
              const matchedPreset = galleryPresetOptions.find(
                (opt) =>
                  opt.uz === invitationState.galleryTitle ||
                  opt.ru === invitationState.galleryTitle ||
                  opt.en === invitationState.galleryTitle
              );

              return (
              <div className="space-y-5">
                <div>
                  <h3 className="font-playfair text-xl font-bold text-[#231E1B]">
                    {t.builder.step5Heading}
                  </h3>
                  <p className="text-xs text-[#7A6A63] mt-1">
                    {t.builder.step5Desc}
                  </p>
                </div>

                {/* Gallery section title */}
                <GlassSurface variant="subtle" rounded="2xl" className="p-3.5 space-y-2.5">
                  <label className="font-bold text-xs text-[#3A2D28] block">
                    {t.builder.galleryTitleTypeLabel}
                  </label>
                  <CustomDropdown
                    value={matchedPreset ? matchedPreset.id : 'Boshqa'}
                    onChange={(val) => {
                      if (val === 'Boshqa') {
                        setInvitationState((p) => ({ ...p, galleryTitle: '' }));
                      } else {
                        const found = galleryPresetOptions.find((o) => o.id === val);
                        setInvitationState((p) => ({ ...p, galleryTitle: found ? found[language] : val }));
                      }
                    }}
                    options={[
                      ...galleryPresetOptions.map((o) => ({
                        value: o.id,
                        label: `${o.icon} ${o[language]}`,
                      })),
                      { value: 'Boshqa', label: `✏️ ${t.builder.galleryTitleOptionCustom}` },
                    ]}
                    className="w-full"
                    buttonClassName="w-full justify-between text-xs min-h-[42px] rounded-[var(--lg-radius)]"
                    dropdownClassName="w-full left-0 right-0"
                  />

                  {/* Custom title input */}
                  {(!matchedPreset || invitationState.galleryTitle === '') && (
                    <div className="pt-1.5 animate-fadeIn">
                      <GlassInput
                        type="text"
                        label={t.builder.galleryCustomTitleLabel}
                        value={invitationState.galleryTitle || ''}
                        onChange={(e) => setInvitationState((p) => ({ ...p, galleryTitle: e.target.value }))}
                        placeholder={t.builder.galleryCustomTitlePlaceholder}
                      />
                    </div>
                  )}
                </GlassSurface>

                {/* Gallery position */}
                <GlassSurface variant="subtle" rounded="2xl" className="p-3.5 space-y-2">
                  <label className="font-bold text-xs text-[#3A2D28] block">
                    {t.builder.galleryPositionLabel}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'after_message', label: t.builder.galleryPosAfterMsg, badge: t.builder.galleryPosAfterMsgBadge },
                      { id: 'after_date', label: t.builder.galleryPosAfterDate, badge: t.builder.galleryPosAfterDateBadge },
                      { id: 'after_schedule', label: t.builder.galleryPosAfterSched, badge: t.builder.galleryPosAfterSchedBadge },
                    ].map((pos) => {
                      const isSel = (invitationState.galleryPosition || 'after_message') === pos.id;
                      return (
                        <button
                          key={pos.id}
                          type="button"
                          onClick={() => setInvitationState((p) => ({ ...p, galleryPosition: pos.id as any }))}
                          className={`p-2.5 rounded-xl text-left border transition-all text-xs flex flex-col justify-between gap-1.5 cursor-pointer ${
                            isSel
                              ? 'glass-surface-tinted-pink border-[#C64873] shadow-xs'
                              : 'bg-white/75 border-black/10 hover:bg-white'
                          }`}
                        >
                          <span className={`font-bold ${isSel ? 'text-[#9E3E60]' : 'text-[#3A2D28]'}`}>
                            {pos.label}
                          </span>
                          <span className="text-[10px] text-[#4A383F] font-medium bg-black/5 px-2 py-0.5 rounded-full w-max">
                            {pos.badge}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </GlassSurface>

                {/* Photo upload */}
                <div className="glass-surface-subtle border-2 border-dashed border-[#C64873]/40 hover:border-[#C64873] rounded-2xl p-6 text-center hover:bg-white/80 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="photo-upload-input"
                  />
                  <label htmlFor="photo-upload-input" className="cursor-pointer space-y-2 block">
                    <div className="w-12 h-12 rounded-2xl glass-surface-tinted-pink flex items-center justify-center mx-auto text-[#9E3E60] shadow-xs">
                      <ImageIcon className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <div className="text-xs font-bold text-[#1E1418]">
                      {t.builder.selectNewPhotosLabel}
                    </div>
                    <div className="text-[11px] text-[#4A383F]">
                      {t.builder.selectNewPhotosHint}
                    </div>
                  </label>
                </div>

                {/* Uploaded photos list */}
                {invitationState.galleryImages.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-[#3A2D28]">
                      <span>{t.builder.uploadedPhotosLabel} ({formatItemCount(invitationState.galleryImages.length, language)})</span>
                      <span className="text-[10px] font-normal text-[#7A6A63]">
                        {t.builder.reorderHint}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {invitationState.galleryImages.map((img, idx) => {
                        const isCover = (invitationState.coverImage || invitationState.galleryImages[0]) === img;
                        return (
                          <div
                            key={idx}
                            className={`relative group rounded-xl overflow-hidden h-28 shadow-xs border transition-all ${
                              isCover ? 'ring-2 ring-[#D9658B] border-[#D9658B]' : 'border-black/10'
                            }`}
                          >
                            <img src={img} alt={`${t.builder.photoTitlePrefix} ${idx + 1}`} className="w-full h-full object-cover" />
                            
                            {/* Order index */}
                            <span className="absolute top-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                              #{idx + 1} {isCover && `★ ${t.builder.coverBadge}`}
                            </span>

                            {/* Delete button */}
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(idx)}
                              className="absolute top-1 right-1 p-1 rounded-md bg-black/60 text-white hover:bg-rose-600 transition-colors"
                              title={t.dashboard.deleteActionTitle}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Bottom controls */}
                            <div className="absolute bottom-0 inset-x-0 p-1 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMovePhoto(idx, idx - 1)}
                                className="p-1 rounded bg-white/20 text-white hover:bg-white/40 disabled:opacity-20 transition-all text-[10px] font-bold flex items-center"
                                title={t.builder.moveLeftTitle}
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setInvitationState((p) => ({ ...p, coverImage: img }));
                                  showToast(t.builder.toasts.coverPhotoSet, 'success');
                                }}
                                className="text-[9px] px-1.5 py-0.5 rounded bg-white/30 hover:bg-white text-black font-semibold transition-all truncate"
                              >
                                {isCover ? t.builder.mainCoverLabel : t.builder.makeCoverBtn}
                              </button>

                              <button
                                type="button"
                                disabled={idx === invitationState.galleryImages.length - 1}
                                onClick={() => handleMovePhoto(idx, idx + 1)}
                                className="p-1 rounded bg-white/20 text-white hover:bg-white/40 disabled:opacity-20 transition-all text-[10px] font-bold flex items-center"
                                title={t.builder.moveRightTitle}
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 text-center font-medium">
                    {t.builder.emptyGalleryHint}
                  </div>
                )}
              </div>
              );
            })()}

            {/* Optional section 6 */}
            {currentStep === 3 && (
              <BuilderSectionToggle
                icon="🕰️"
                title={t.builder.steps.schedule}
                optionalLabel={t.builder.simple.optional}
                isOpen={openSection === 6}
                onToggle={() => setOpenSection((prev) => (prev === 6 ? null : 6))}
              />
            )}
            {currentStep === 3 && openSection === 6 && (
              <div className="space-y-4">
                <div className="flex flex-col min-[380px]:flex-row min-[380px]:items-center justify-between gap-2.5">
                  <h3 className="font-playfair text-xl font-bold text-[#1E1418] min-w-0">
                    {t.builder.step6Heading}
                  </h3>
                  <GlassButton
                    type="button"
                    tone="tinted"
                    size="sm"
                    onClick={handleAddScheduleItem}
                    leftIcon={<Plus className="w-3.5 h-3.5" aria-hidden="true" />}
                    className="w-full min-[380px]:w-auto shrink-0"
                  >
                    {t.builder.addScheduleItem}
                  </GlassButton>
                </div>

                <div className="space-y-3">
                  {invitationState.schedule.map((item) => {
                    const normalizedSlot = normalizeTime24h(item.time, '18:00');
                    const titleValue = typeof item.title === 'string' ? item.title : item.title.uz;
                    return (
                      <GlassSurface
                        key={item.id}
                        variant="subtle"
                        rounded="2xl"
                        className="p-3 min-w-0 grid grid-cols-[minmax(0,1fr)_auto] min-[420px]:grid-cols-[108px_minmax(0,1fr)_auto] items-center gap-2"
                      >
                        <div className="relative min-w-0">
                          <Clock className="w-3.5 h-3.5 text-[#9E3E60] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                          <select
                            aria-label={t.builder.startTimeLabel}
                            value={normalizedSlot}
                            onChange={(e) => {
                              const val = normalizeTime24h(e.target.value, '18:00');
                              setInvitationState((p) => ({
                                ...p,
                                schedule: p.schedule.map((s) => (s.id === item.id ? { ...s, time: val } : s)),
                              }));
                            }}
                            className="w-full min-h-[44px] pl-8 pr-2 py-1.5 rounded-xl text-xs font-bold border border-black/10 bg-white/95 text-[#1E1418] tabular-nums outline-none focus:ring-2 focus:ring-[#D66389]/35 cursor-pointer"
                          >
                            {get24hTimeSlots(normalizedSlot).map((slot) => (
                              <option key={slot} value={slot}>
                                {slot}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveScheduleItem(item.id)}
                          aria-label={t.dashboard.deleteActionTitle}
                          className="min-h-[44px] min-w-[44px] min-[420px]:col-start-3 min-[420px]:row-start-1 rounded-xl text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>

                        <input
                          type="text"
                          value={titleValue}
                          onChange={(e) => {
                            const val = e.target.value;
                            setInvitationState((p) => ({
                              ...p,
                              schedule: p.schedule.map((s) => (s.id === item.id ? { ...s, title: val } : s)),
                            }));
                          }}
                          placeholder={t.builder.stepNamePlaceholder}
                          className="col-span-2 min-[420px]:col-span-1 min-[420px]:col-start-2 min-[420px]:row-start-1 w-full min-w-0 min-h-[44px] px-3 py-2 rounded-xl text-xs border border-black/10 bg-white/95 text-[#1E1418] outline-none focus:ring-2 focus:ring-[#D66389]/35"
                        />
                      </GlassSurface>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Venue map (part of the Details stage) */}
            {currentStep === 2 && (
              <div className="space-y-5">
                <div className="space-y-4 text-xs">
                  {/* Interactive Map */}
                  <div className="space-y-2">
                    <label className="font-bold text-[#1E1418] block">
                      📍 {invitationState.venueLocationType === 'home' ? t.builder.venueMapHomeLabel : t.builder.venueMapHallLabel}
                    </label>
                    <LocationPickerMap
                      latitude={invitationState.latitude}
                      longitude={invitationState.longitude}
                      language={language}
                      onLocationSelect={(lat, lng, detectedAddress, sourceLink) => {
                        setInvitationState((p) => {
                          const updated = {
                            ...p,
                            latitude: lat,
                            longitude: lng,
                            venueAddress: detectedAddress || p.venueAddress,
                            mapUrl: sourceLink || yandexPlaceUrl({ lat, lng }),
                          };
                          try {
                            if (!queryInvitationId) {
                              localStorage.setItem('taklifim_builder_draft', JSON.stringify(updated));
                            }
                          } catch {}
                          return updated;
                        });
                        const pointKey = `${lat},${lng}`;
                        if (lastMapToastRef.current !== pointKey) {
                          lastMapToastRef.current = pointKey;
                          showToast(`${t.builder.toasts.mapPointSet} 📍`, 'success');
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Optional section 8 */}
            {currentStep === 3 && (
              <BuilderSectionToggle
                icon="🎵"
                title={t.builder.steps.music}
                optionalLabel={t.builder.simple.optional}
                isOpen={openSection === 8}
                onToggle={() => setOpenSection((prev) => (prev === 8 ? null : 8))}
              />
            )}
            {currentStep === 3 && openSection === 8 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-playfair text-xl font-bold text-[#1E1418]">
                    {t.builder.step8Heading}
                  </h3>
                  <p className="text-xs text-[#4A383F] mt-1">
                    {t.builder.step8Desc}
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Music toggle */}
                  <GlassSurface variant="subtle" rounded="2xl" className="p-3.5">
                    <GlassSwitch
                      checked={invitationState.musicEnabled}
                      onChange={(checked) => setInvitationState((p) => ({ ...p, musicEnabled: checked }))}
                      label={t.builder.musicToggleTitle}
                      description={t.builder.musicToggleDesc}
                    />
                  </GlassSurface>

                  {invitationState.musicEnabled && (
                    <div className="space-y-5 pt-1 animate-fadeIn">
                      {/* Music placement */}
                      <GlassSurface variant="tinted-pink" rounded="2xl" className="p-4 space-y-3">
                        <label className="font-bold text-xs text-[#1E1418] block">
                          🎵 {t.builder.musicPlacementTitle}
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <button
                            type="button"
                            onClick={() => setInvitationState((p) => ({ ...p, musicPlacement: 'all' }))}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              (!invitationState.musicPlacement || invitationState.musicPlacement === 'all')
                                ? 'bg-white/95 border-[#C64873] shadow-xs'
                                : 'bg-white/65 border-white/80 hover:bg-white'
                            }`}
                          >
                            <span className="text-base block mb-1">🌟</span>
                            <span className="font-bold text-[11px] text-[#1E1418] block">{t.builder.musicPlaceAll}</span>
                            <span className="text-[10px] text-[#4A383F] block mt-0.5">{t.builder.musicPlaceAllDesc}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setInvitationState((p) => ({ ...p, musicPlacement: 'cover' }))}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              invitationState.musicPlacement === 'cover'
                                ? 'bg-white/95 border-[#C64873] shadow-xs'
                                : 'bg-white/65 border-white/80 hover:bg-white'
                            }`}
                          >
                            <span className="text-base block mb-1">💌</span>
                            <span className="font-bold text-[11px] text-[#1E1418] block">{t.builder.musicPlaceCover}</span>
                            <span className="text-[10px] text-[#4A383F] block mt-0.5">{t.builder.musicPlaceCoverDesc}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setInvitationState((p) => ({ ...p, musicPlacement: 'floating' }))}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              invitationState.musicPlacement === 'floating'
                                ? 'bg-white/95 border-[#C64873] shadow-xs'
                                : 'bg-white/65 border-white/80 hover:bg-white'
                            }`}
                          >
                            <span className="text-base block mb-1">🎧</span>
                            <span className="font-bold text-[11px] text-[#1E1418] block">{t.builder.musicPlaceFloating}</span>
                            <span className="text-[10px] text-[#4A383F] block mt-0.5">{t.builder.musicPlaceFloatingDesc}</span>
                          </button>
                        </div>
                      </GlassSurface>

                      {/* Multiple Audio Uploads */}
                      <div className="glass-surface-subtle border-2 border-dashed border-[#C64873]/40 hover:border-[#C64873] rounded-2xl p-5 text-center hover:bg-white/80 transition-colors space-y-2">
                        <input
                          type="file"
                          accept="audio/*"
                          multiple
                          onChange={handleMusicUpload}
                          className="hidden"
                          id="music-upload-input"
                        />
                        <label htmlFor="music-upload-input" className="cursor-pointer space-y-2 block">
                          <div className="w-12 h-12 rounded-2xl glass-surface-tinted-pink flex items-center justify-center mx-auto text-[#9E3E60] shadow-xs">
                            <Music className="w-6 h-6" aria-hidden="true" />
                          </div>
                          <div className="text-xs font-bold text-[#1E1418]">
                            {t.builder.uploadMultipleAudioTitle}
                          </div>
                          <div className="text-[11px] text-[#4A383F]">
                            {t.builder.uploadMultipleAudioDesc}
                          </div>
                        </label>
                      </div>

                      {/* User Uploaded Tracks Playlist */}
                      {invitationState.musicTracks && invitationState.musicTracks.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-[#231E1B]">
                              {t.builder.yourTracksLabel} ({formatItemCount(invitationState.musicTracks.length, language)}):
                            </span>
                            <button
                              type="button"
                              onClick={handleRemoveMusic}
                              className="text-[11px] text-rose-500 hover:text-rose-700 font-semibold"
                            >
                              {t.builder.clearAllBtn}
                            </button>
                          </div>

                          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                            {invitationState.musicTracks.map((track) => {
                              const isActive = invitationState.musicUrl === track.url;
                              return (
                                <div
                                  key={track.id}
                                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                                    isActive
                                      ? 'bg-gradient-to-r from-[#FFF5F8] to-[#F0F8FF] border-[#D9658B] ring-1 ring-[#D9658B]/30 shadow-xs'
                                      : 'bg-white/80 border-black/5 hover:bg-white'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div
                                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                                        isActive ? 'bg-[#D9658B] text-white' : 'bg-black/5 text-[#5A4A52]'
                                      }`}
                                    >
                                      <Music className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className={`text-xs font-bold truncate ${isActive ? 'text-[#D9658B]' : 'text-[#231E1B]'}`}>
                                        {track.title}
                                      </p>
                                      {isActive && (
                                        <span className="text-[10px] text-emerald-600 font-semibold block">
                                          {t.builder.activePlayingBadge}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleSelectTrack(track)}
                                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                                        isActive
                                          ? 'bg-[#D9658B] text-white shadow-xs'
                                          : 'bg-black/5 text-[#5A4A52] hover:bg-black/10'
                                      }`}
                                    >
                                      {isActive ? `✓ ${t.builder.selectedBtn}` : t.builder.selectBtn}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveTrack(track.id)}
                                      className="p-1 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                      title={t.dashboard.deleteActionTitle}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Preset romantic wedding music */}
                      <div>
                        <label className="font-bold text-[#3A2D28] block mb-2 flex items-center justify-between">
                          <span>{t.builder.presetRomanticLabel}</span>
                          <span className="text-[10px] text-[#D9658B] font-semibold">{t.builder.presetGuaranteedBadge}</span>
                        </label>
                        <div className="space-y-1.5">
                          {PRESET_MUSIC_TRACKS.map((track, idx) => {
                            const isSelected = invitationState.musicUrl === track.url;
                            const displayTitle = t.builder.tracks[idx]?.name || track.title;
                            return (
                              <div
                                key={idx}
                                onClick={() => {
                                  setInvitationState((p) => ({
                                    ...p,
                                    musicEnabled: true,
                                    musicTitle: displayTitle,
                                    musicUrl: track.url,
                                    musicFileData: undefined,
                                  }));
                                  setPreviewAudioUrl(track.url);
                                  showToast(`«${displayTitle}» ${t.builder.selectedBtn.toLowerCase()}! 🎵`, 'success');
                                }}
                                className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                                  isSelected
                                    ? 'bg-gradient-to-r from-[#FFF5F8] to-[#F0F8FF] border-[#D9658B] shadow-xs ring-1 ring-[#D9658B]/30'
                                    : 'bg-white/80 border-black/5 hover:bg-white hover:border-black/15'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                                    isSelected ? 'bg-[#D9658B] text-white' : 'bg-black/5 text-[#5A4A52]'
                                  }`}>
                                    <Music className="w-3.5 h-3.5" />
                                  </div>
                                  <span className={`text-xs font-bold truncate ${isSelected ? 'text-[#D9658B]' : 'text-[#231E1B]'}`}>
                                    {displayTitle}
                                  </span>
                                </div>
                                <span className="text-[10px] font-bold shrink-0 px-2.5 py-1 rounded-full bg-black/5 text-[#5A4A52]">
                                  {isSelected ? `✓ ${t.builder.selectedBtn}` : t.builder.selectBtn}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Active track preview panel */}
                      {invitationState.musicUrl && (
                        <div className="p-4 rounded-2xl bg-gradient-to-tr from-[#FFF5F8] to-[#F0F8FF] border border-[#D9658B]/30 shadow-xs space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-[#D9658B] text-white flex items-center justify-center shadow-xs shrink-0">
                                <Music className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-xs text-[#231E1B] block truncate">
                                  {invitationState.musicTitle || t.shared.musicDefaultTitle}
                                </span>
                                <span className="text-[10px] text-emerald-600 font-semibold block">
                                  {t.builder.attachedTrackNotice}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-1">
                            <audio controls preload="none" src={previewAudioUrl || invitationState.musicUrl} key={previewAudioUrl || invitationState.musicUrl} className="w-full h-8 rounded-lg" />
                          </div>

                          <div>
                            <label className="font-bold text-[#3A2D28] block mb-1 text-[11px]">
                              {t.builder.guestVisibleTitleLabel}
                            </label>
                            <input
                              type="text"
                              value={invitationState.musicTitle || ''}
                              onChange={(e) => setInvitationState((p) => ({ ...p, musicTitle: e.target.value }))}
                              placeholder={t.builder.guestVisibleTitlePlaceholder}
                              className="w-full p-2.5 rounded-xl bg-white border border-black/10 text-xs outline-none focus:border-[#D9658B] text-[#231E1B] font-semibold"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Optional section: invitation link (slug) */}
            {currentStep === 3 && (
              <BuilderSectionToggle
                icon="🔗"
                title={t.builder.simple.linkSection}
                optionalLabel={t.builder.simple.optional}
                isOpen={openSection === 12}
                onToggle={() => setOpenSection((prev) => (prev === 12 ? null : 12))}
              />
            )}
            {currentStep === 3 && openSection === 12 && (
              <div className="text-xs builder-section-body">
                  <div className="space-y-1.5 min-w-0">
                    <label className="font-bold text-[11px] text-[#3A2D28] block">
                      {t.builder.slugLabel}
                    </label>
                    <div className="rounded-[var(--lg-radius)] overflow-hidden border border-black/10 bg-white/85 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#D66389]/35 focus-within:border-[#D66389]/60">
                      <div className="px-3.5 py-1.5 bg-white/70 border-b border-black/8 font-mono text-[11px] text-[#4A383F] break-all">
                        {(typeof window !== 'undefined' ? window.location.origin : 'https://tashrifim.uz')}/i/
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 min-w-0">
                        <input
                          type="text"
                          value={invitationState.slug}
                          disabled={isSlugLocked}
                          onChange={(e) => {
                            if (isSlugLocked) return;
                            isSlugManualRef.current = true;
                            const raw = e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9-]+/g, '-')
                              .replace(/-+/g, '-')
                              .replace(/^-+/, '');
                            setInvitationState((p) => ({ ...p, slug: raw }));
                          }}
                          onBlur={() => {
                            if (isSlugLocked) return;
                            setInvitationState((p) => ({
                              ...p,
                              slug: cleanNameForSlug(p.slug) || generateInvitationSlug(p.partner1Name, p.partner2Name, sessionSlugCodeRef.current),
                            }));
                          }}
                          placeholder="asrorbek-madina-4135"
                          className="flex-1 min-w-0 min-h-[40px] px-1.5 bg-transparent font-mono text-xs sm:text-[13px] text-[#1E1418] font-bold outline-none disabled:opacity-65"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const origin = typeof window !== 'undefined' ? window.location.origin : 'https://tashrifim.uz';
                            const url = `${origin}/i/${invitationState.slug}`;
                            if (navigator.clipboard) {
                              navigator.clipboard.writeText(url);
                              showToast(t.builder.slugCopiedToast, 'success');
                            }
                          }}
                          aria-label={t.builder.copyLinkBtn}
                          className="min-h-[40px] px-3 rounded-xl glass-surface-subtle hover:bg-white text-[11px] font-bold text-[#9E3E60] inline-flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span>{t.builder.copyLinkBtn}</span>
                        </button>
                      </div>
                    </div>
                    <div className="text-[11px] text-[#4A383F] bg-white/55 px-3 py-1.5 rounded-xl border border-black/6">
                      <span className="font-semibold text-[#3A2D28]">{t.builder.fullLinkPreviewLabel} </span>
                      <span className="font-mono text-[#9E3E60] font-bold break-all">
                        {(typeof window !== 'undefined' ? window.location.origin : 'https://tashrifim.uz')}/i/{invitationState.slug}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#4A383F] block">
                      {isSlugLocked ? t.builder.slugLockedNotice : t.builder.slugHint}
                    </span>
                  </div>

              </div>
            )}

            {/* Optional section 9 */}
            {currentStep === 3 && (
              <BuilderSectionToggle
                icon="💌"
                title={t.builder.steps.rsvp}
                optionalLabel={t.builder.simple.optional}
                isOpen={openSection === 9}
                onToggle={() => setOpenSection((prev) => (prev === 9 ? null : 9))}
              />
            )}
            {currentStep === 3 && openSection === 9 && (
              <div className="space-y-4">
                <h3 className="font-playfair text-xl font-bold text-[#1E1418]">
                  {t.builder.step9Heading}
                </h3>
                <div className="space-y-3 text-xs">
                  <GlassSurface variant="subtle" rounded="2xl" className="p-3.5">
                    <GlassSwitch
                      checked={invitationState.rsvpEnabled}
                      onChange={(checked) => setInvitationState((p) => ({ ...p, rsvpEnabled: checked }))}
                      label={t.builder.enableRsvpCheckbox}
                    />
                  </GlassSurface>

                  <div>
                    <label className="font-bold text-[11px] text-[#3A2D28] block mb-1.5">
                      {t.builder.rsvpDeadlineLabel}
                    </label>
                    <input
                      type="date"
                      value={invitationState.rsvpDeadline}
                      onChange={(e) => setInvitationState((p) => ({ ...p, rsvpDeadline: e.target.value }))}
                      className={GLASS_FIELD_CLS}
                    />
                  </div>

                  <GlassSurface variant="subtle" rounded="2xl" className="p-3.5 space-y-3">
                    <GlassSwitch
                      checked={invitationState.allowCompanion}
                      onChange={(checked) => setInvitationState((p) => ({ ...p, allowCompanion: checked }))}
                      label={t.builder.allowCompanionCheckbox}
                    />
                    <div className="border-t border-black/5 pt-3">
                      <GlassSwitch
                        checked={Boolean(invitationState.askMealPreference)}
                        onChange={(checked) => setInvitationState((p) => ({ ...p, askMealPreference: checked }))}
                        label={t.builder.askMealCheckbox}
                      />
                    </div>
                  </GlassSurface>

                  {/* Host social links & contact */}
                  <div className="pt-4 border-t border-black/8 space-y-3">
                    <div>
                      <h4 className="font-bold text-sm text-[#1E1418] flex items-center gap-2">
                        <span>📲 {t.builder.socialSectionTitle}</span>
                      </h4>
                      <p className="text-[11px] text-[#4A383F] mt-0.5">
                        {t.builder.socialSectionDesc}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <GlassInput
                        type="text"
                        label={`📸 ${t.builder.instagramProfileLabel}`}
                        value={invitationState.socialLinks?.instagram || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setInvitationState((p) => ({
                            ...p,
                            socialLinks: { ...p.socialLinks, instagram: val },
                          }));
                        }}
                        placeholder="https://instagram.com/asrorbek_madina"
                      />

                      <GlassInput
                        type="text"
                        label={`✈️ ${t.builder.telegramPersonalLabel}`}
                        value={invitationState.socialLinks?.telegram || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setInvitationState((p) => ({
                            ...p,
                            socialLinks: { ...p.socialLinks, telegram: val },
                          }));
                        }}
                        placeholder="https://t.me/asrorbek"
                      />

                      <GlassInput
                        type="text"
                        label={`📢 ${t.builder.telegramChannelLabel}`}
                        value={invitationState.socialLinks?.telegramChannel || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setInvitationState((p) => ({
                            ...p,
                            socialLinks: { ...p.socialLinks, telegramChannel: val },
                          }));
                        }}
                        placeholder="https://t.me/asrorbek_madina_wedding"
                      />

                      <GlassInput
                        type="tel"
                        label={`📞 ${t.builder.phoneCallLabel}`}
                        value={invitationState.socialLinks?.phone || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setInvitationState((p) => ({
                            ...p,
                            socialLinks: { ...p.socialLinks, phone: val },
                          }));
                        }}
                        placeholder="+998 90 123 45 67"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Review summary (top of the checkout stage) */}
            {currentStep === 11 && isSampleHostNames && !isOrderComplete && (
              <div role="alert" className="flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-3.5 py-3 text-xs font-semibold text-amber-900">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span className="flex-1">{t.builder.simple.sampleNamesWarning}</span>
                <button type="button" onClick={() => goToStep(2)} className="underline whitespace-nowrap">
                  {t.builder.simple.editDetails}
                </button>
              </div>
            )}
            {currentStep === 11 && orderStatus !== 'pending_review' && orderStatus !== 'paid' && (
              <div className="space-y-4">
                <h3 className="font-playfair text-xl font-bold text-[#1E1418]">
                  {t.builder.step10Heading}
                </h3>
                <GlassSurface variant="subtle" rounded="2xl" className="p-4 text-xs space-y-2.5">
                  <div className="flex justify-between gap-3 border-b border-black/8 pb-2">
                    <span className="text-[#4A383F] shrink-0">{t.guestGate.eventLabel}:</span>
                    <strong className="text-[#1E1418] text-right min-w-0 break-words">{invitationState.eventTitle}</strong>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-black/8 pb-2">
                    <span className="text-[#4A383F] shrink-0">{t.builder.reviewCouple}</span>
                    <strong className="text-[#1E1418] text-right min-w-0 break-words">{invitationState.hostNames}</strong>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-black/8 pb-2">
                    <span className="text-[#4A383F] shrink-0">{t.builder.reviewDate}</span>
                    <strong className="text-[#1E1418] tabular-nums text-right min-w-0 break-words capitalize">
                      {formatLocalizedFullDate(invitationState.eventDate, language)} ({normalizeTime24h(invitationState.startTime, '18:00')})
                    </strong>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-black/8 pb-2">
                    <span className="text-[#4A383F] shrink-0">{t.builder.reviewVenue}</span>
                    <strong className="text-[#1E1418] text-right min-w-0 break-words">
                      {invitationState.venueName || (invitationState.venueLocationType === 'home' ? 'Xonadonda' : '—')}
                    </strong>
                  </div>
                  <div className="flex justify-between gap-3 pt-0.5">
                    <span className="text-[#4A383F] shrink-0">{t.builder.reviewPhotos}</span>
                    <strong className="text-[#1E1418] tabular-nums">{formatItemCount(invitationState.galleryImages.length, language)}</strong>
                  </div>
                </GlassSurface>
                <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                  <span>{t.builder.reviewSuccessText}</span>
                </p>
              </div>
            )}

            {/* STEP 11: Plan & Manual Card Payment */}
            {currentStep === 11 && (() => {
              const currentTemplate = stateTemplateResolution?.template || routeTemplateResolution?.template;
              if (!currentTemplate) return null;
              const templatePrice = currentTemplate.price || 60000;
              const receiptPhoneValid = Boolean(
                cleanAndValidateUzPhone(
                  contactPhone || invitationState.socialLinks?.phone || user?.phone || ''
                )
              );
              const canSubmitReceipt =
                !isUploadingReceipt &&
                !isPreparingFile &&
                Boolean(selectedFile) &&
                (preparedFileType === 'application/pdf' || Boolean(fileBase64));

              return (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <h3 className="font-playfair text-xl font-bold text-[#1E1418]">
                      {t.builder.step11Heading}
                    </h3>
                    <p className="text-xs text-[#4A383F]">
                      «{currentTemplate.name}» — {t.builder.step11SelectedTemplateDesc}
                    </p>
                  </div>

                  {/* Card payment and receipt upload */}
                  <div className="space-y-5">
                    <GlassSurface variant="tinted-pink" rounded="3xl" className="p-5 sm:p-6 space-y-4 relative overflow-hidden">
                      <div className="flex items-center justify-between gap-2 border-b border-black/8 pb-3">
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/85 text-[#9E3E60] border border-white">
                          «{currentTemplate.name}» {t.builder.templateBadgeSuffix}
                        </span>
                        <span className="text-2xl font-extrabold text-[#1E1418] tabular-nums">
                          {formatPriceUZS(templatePrice, language)}
                        </span>
                      </div>

                      <GlassSurface variant="elevated" rounded="2xl" className="p-4 space-y-2.5">
                        <div className="text-[11px] font-semibold text-[#4A383F] uppercase tracking-wider flex items-center justify-between">
                          <span>{t.builder.paymentCardTitle}</span>
                          <span className="text-emerald-700 font-bold">{PAYMENT_CONFIG.cardBank}</span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                          <span className="font-mono tabular-nums text-lg sm:text-xl font-extrabold text-[#1E1418] tracking-wider">
                            {PAYMENT_CONFIG.cardNumberFormatted}
                          </span>
                          <GlassButton
                            type="button"
                            size="sm"
                            tone={copiedCard ? 'light' : 'tinted'}
                            onClick={handleCopyCardNumber}
                            leftIcon={copiedCard ? <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
                            className="shrink-0"
                          >
                            {copiedCard ? t.builder.copiedCardBtn : t.builder.copyCardBtn}
                          </GlassButton>
                        </div>

                        <div className="text-xs font-bold text-[#3A2D28] pt-0.5">
                          {t.builder.cardHolderLabel}: <span className="text-[#9E3E60] uppercase">{PAYMENT_CONFIG.cardHolder}</span>
                        </div>
                      </GlassSurface>

                      <div className="text-xs text-[#3A2D28] space-y-2 leading-relaxed bg-amber-50/85 backdrop-blur-sm p-3.5 rounded-2xl border border-amber-200/90">
                        <p className="font-medium text-[#1E1418]">
                          📌 <strong>{t.builder.instructionPrefix}</strong> {paymentCopy.instructionText}
                        </p>
                        <p className="text-[11px] text-amber-900 font-semibold">
                          ⚠️ {paymentCopy.warningText}
                        </p>
                      </div>
                    </GlassSurface>

                    {orderStatus === 'pending_review' ? (
                      /* PENDING REVIEW VIEW */
                      <GlassSurface variant="elevated" rounded="3xl" className="p-6 bg-amber-50/85 border border-amber-200 text-center space-y-4 animate-fadeIn">
                        <div className="w-14 h-14 rounded-full bg-amber-100 border border-amber-200 mx-auto flex items-center justify-center text-amber-800 shadow-xs">
                          <RefreshCw className="w-7 h-7 animate-spin" aria-hidden="true" />
                        </div>

                        <div className="space-y-1.5">
                          <span className="inline-block text-[10px] font-mono tabular-nums font-bold uppercase tracking-widest text-amber-900 bg-amber-200/70 px-3 py-0.5 rounded-full">
                            {t.builder.orderNumberLabel}{activeOrderId}
                          </span>
                          <h4 className="font-playfair text-lg sm:text-xl font-bold text-[#1E1418]">
                            {t.builder.receiptSentHeading}
                          </h4>
                          {orderSentAt && (
                            <p className="text-[11px] font-semibold text-amber-900">
                              {t.myInvitations.receiptSentAtPrefix} {formatRelativeTimeLocalized(orderSentAt, language)}
                            </p>
                          )}
                        </div>

                        <p className="text-xs sm:text-sm font-semibold text-[#4A383F] leading-relaxed max-w-md mx-auto">
                          {t.builder.receiptReplyTime}
                        </p>

                        <div className="inline-flex items-center gap-2 text-[11px] text-amber-900 font-semibold bg-white/85 px-3.5 py-1.5 rounded-full border border-amber-200">
                          <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" aria-hidden="true" />
                          <span>{t.builder.autoCheckStatus}</span>
                        </div>

                        {isReviewOverdue(orderSentAt, 2) && (
                          <div className="p-3 rounded-2xl bg-white/80 border border-amber-200 text-xs text-amber-950 space-y-2">
                            <p className="font-medium">{t.myInvitations.overdueHint}</p>
                            <a
                              href="https://t.me/avazxanovvv_700"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#1E1418] text-white text-xs font-bold hover:bg-black transition-colors"
                            >
                              <Send className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>{t.myInvitations.overdueTelegramBtn}</span>
                            </a>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                          {activeOrderId && (
                            <GlassButton
                              tone="tinted"
                              size="sm"
                              href={`/order/${encodeURIComponent(activeOrderId)}`}
                              onAnchorClick={(e) => {
                                e.preventDefault();
                                navigate(`/order/${encodeURIComponent(activeOrderId)}`);
                              }}
                            >
                              {t.builder.trackOrderBtn}
                            </GlassButton>
                          )}
                          <GlassButton
                            tone="light"
                            size="sm"
                            href="/my-invitations"
                            onAnchorClick={(e) => {
                              e.preventDefault();
                              navigate('/my-invitations');
                            }}
                          >
                            {t.builder.goMyInvitationsBtn}
                          </GlassButton>
                        </div>
                      </GlassSurface>
                    ) : (
                      /* FILE UPLOAD FORM VIEW */
                      <GlassSurface variant="elevated" rounded="3xl" className="p-5 space-y-4">
                        {orderStatus === 'rejected' && (
                          <div className="p-3.5 rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                            <div>
                              <strong>{t.builder.receiptRejectedTitle}</strong>{' '}
                              {orderRejectReason || t.builder.receiptRejectedBody}
                            </div>
                          </div>
                        )}

                        {authReady && !hasFirebaseSession ? (
                          <ReceiptAuthPrompt
                            onBeforeSignIn={() => saveDraftLocally()}
                          />
                        ) : (
                          <>
                            {(!receiptPhoneValid || contactPhone) && (
                              <div className="space-y-1.5 min-w-0">
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

                            <div className="space-y-2 min-w-0">
                              <label className="text-xs font-bold text-[#1E1418] block">
                                {t.builder.receiptUploadLabel}
                              </label>

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
                                    <div className="w-11 h-11 rounded-2xl glass-surface-tinted-pink text-[#9E3E60] flex items-center justify-center shadow-xs">
                                      <Upload className="w-5 h-5 animate-pulse" aria-hidden="true" />
                                    </div>
                                    <div>
                                      <span className="text-xs font-bold text-[#1E1418] block">
                                        {t.builder.compressingImage}
                                      </span>
                                      <span className="text-[10px] text-[#4A383F]">
                                        {t.builder.compressingSub}
                                      </span>
                                    </div>
                                  </div>
                                ) : selectedFile ? (
                                  <div className="flex flex-col gap-3 w-full min-w-0">
                                    <div className="flex items-center gap-3 w-full min-w-0 max-w-full p-2.5 sm:p-3 rounded-xl bg-white/92 border border-emerald-200/90 shadow-xs">
                                      <div className="flex-none w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                                        <FileText className="w-5 h-5" aria-hidden="true" />
                                      </div>
                                      <div className="flex-1 min-w-0 text-left">
                                        <span
                                          title={preparedFileName || selectedFile.name}
                                          className="font-mono text-xs font-bold text-[#1E1418] block truncate"
                                        >
                                          {truncateFilenameMiddle(preparedFileName || selectedFile.name, 22)}
                                        </span>
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] mt-0.5">
                                          {selectedFile.size > 0 && (
                                            <span className="text-[#4A383F] tabular-nums">
                                              {formatFileSize(selectedFile.size, language)}
                                            </span>
                                          )}
                                          <span className="text-emerald-700 font-semibold">
                                            {t.builder.fileReadyText}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      disabled={isUploadingReceipt}
                                      onClick={() => receiptInputRef.current?.click()}
                                      className="min-h-[40px] w-full sm:w-auto sm:self-center px-4 py-1.5 rounded-xl bg-white/90 hover:bg-white border border-black/10 text-xs font-bold text-[#9E3E60] transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                      {t.builder.replaceReceiptFileBtn}
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center justify-center text-center gap-2 py-2">
                                    <div className="w-11 h-11 rounded-2xl glass-surface-tinted-pink text-[#9E3E60] flex items-center justify-center shadow-xs">
                                      <Upload className="w-5 h-5" aria-hidden="true" />
                                    </div>
                                    <div>
                                      <span className="text-xs font-bold text-[#1E1418] block">
                                        {t.builder.clickToChooseFile}
                                      </span>
                                      <span className="text-[10px] text-[#4A383F]">
                                        {t.builder.fileSizeRules}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
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
                                    onClick={handleSubmitReceiptUpload}
                                    leftIcon={<RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />}
                                    className="self-start"
                                  >
                                    {t.builder.retryUploadBtn}
                                  </GlassButton>
                                )}
                              </div>
                            )}

                            <div className="space-y-1.5">
                              <GlassButton
                                type="button"
                                tone="tinted"
                                size="lg"
                                multiline
                                loading={isUploadingReceipt}
                                disabled={!canSubmitReceipt || isUploadingReceipt}
                                onClick={handleSubmitReceiptUpload}
                                leftIcon={!isUploadingReceipt ? <Upload className="w-4 h-4" aria-hidden="true" /> : undefined}
                                className="w-full min-h-[52px]"
                              >
                                {isUploadingReceipt
                                  ? t.builder.uploadingProgressLabel
                                  : t.builder.submitReceiptPrimaryBtn}
                              </GlassButton>
                              <p className="text-[11px] font-medium text-[#4A383F] text-center">
                                {t.builder.submitReceiptHelperCaption}
                              </p>
                            </div>
                          </>
                        )}
                      </GlassSurface>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Navigation buttons: Prev / Next */}
            <div className="pt-6 border-t border-black/8 flex items-center justify-between gap-3">
              {currentStep > 1 ? (
                <GlassButton
                  type="button"
                  tone="light"
                  size="sm"
                  onClick={() => setCurrentStep(prevSimpleStep)}
                  leftIcon={<ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />}
                >
                  {t.builder.prevStep}
                </GlassButton>
              ) : (
                <div />
              )}

              {currentStep !== 11 && (
                <GlassButton
                  type="button"
                  tone="tinted"
                  size="sm"
                  onClick={() => goToStep(nextSimpleStep)}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />}
                >
                  {currentStep === 3 ? t.builder.simple.skipToCheckout : t.builder.simple.next}
                </GlassButton>
              )}
            </div>
          </GlassSurface>

          {/* RIGHT: LIVE REACTIVE PREVIEW (mounted on mobile only when Preview tab is active so settings typing has zero hidden re-render overhead) */}
          {(isDesktopViewport || activeTabMobile === 'preview') && (
            <div className="lg:col-span-6 flex flex-col items-center lg:sticky lg:top-[var(--header-sticky-top,76px)]">
              {/* Device View & Cover/Content Toggle */}
              <div className="mb-4 flex flex-wrap items-center justify-center gap-2.5">
                <GlassSegmented
                  ariaLabel={t.builder.previewShortTab}
                  value={previewDevice}
                  onChange={(val) => setPreviewDevice(val)}
                  options={[
                    {
                      value: 'mobile',
                      label: t.builder.mobileView,
                      icon: <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />,
                    },
                    {
                      value: 'desktop',
                      label: t.builder.desktopView,
                      icon: <Monitor className="w-3.5 h-3.5" aria-hidden="true" />,
                    },
                  ]}
                />

                <GlassSegmented<'cover' | 'content'>
                  ariaLabel={t.hero.envelopeHeader}
                  value={isPreviewCoverOpened ? 'content' : 'cover'}
                  onChange={(val) => setIsPreviewCoverOpened(val === 'content')}
                  options={[
                    { value: 'cover', label: t.hero.envelopeHeader },
                    { value: 'content', label: t.builder.previewShortTab },
                  ]}
                />
              </div>

              {previewDevice === 'mobile' ? (
                <div className="w-[320px] sm:w-[350px] rounded-[44px] p-4 bg-[#231E1B] shadow-2xl ring-1 ring-white/20 relative transition-all">
                  {/* Speaker Notch */}
                  <div className="absolute top-5 left-1/2 -translate-x-1/2 w-24 h-4 bg-[#151210] rounded-full z-40 pointer-events-none" />

                  <div className="w-full h-[620px] rounded-[36px] overflow-hidden border border-black/10 select-none shadow-inner relative bg-white">
                    <InvitationShell
                      coverTemplate={stateTemplateResolution?.template.slug || invitationState.templateSlug}
                      isOpened={isPreviewCoverOpened}
                      onOpen={() => setIsPreviewCoverOpened(true)}
                      enableConfetti={true}
                      variant="frame"
                      frameRadiusClass="rounded-[36px]"
                      compact={true}
                      headerLabel={t.hero.envelopeHeader}
                      ceremonyLabel={invitationState.eventType || t.hero.sampleCeremony}
                      hostNames={invitationState.hostNames || t.hero.sampleGroomBride}
                      openButtonLabel={t.hero.openEnvelopeBtn}
                    >
                      <div className="w-full h-full overflow-y-auto overflow-x-hidden taklifim-preview-scroll pt-6">
                        <TemplateRenderer
                          invitation={invitationState}
                          language={language}
                          isPreview={true}
                        />
                      </div>
                    </InvitationShell>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-[560px] rounded-2xl bg-[#231E1B] shadow-2xl ring-1 ring-white/20 overflow-hidden transition-all">
                  {/* Desktop Browser Window Header */}
                  <div className="px-4 py-2.5 bg-[#151210] flex items-center justify-between border-b border-white/10">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                    </div>
                    <div className="flex-1 mx-4 px-3 py-1 rounded-lg bg-black/40 text-[10px] text-gray-400 font-mono truncate text-center border border-white/5">
                      tashrifim.uz/i/{invitationState.slug || invitationState.templateSlug}
                    </div>
                    <div className="w-8" />
                  </div>

                  <div className="w-full h-[600px] overflow-hidden select-none shadow-inner relative bg-white">
                    <InvitationShell
                      coverTemplate={stateTemplateResolution?.template.slug || invitationState.templateSlug}
                      isOpened={isPreviewCoverOpened}
                      onOpen={() => setIsPreviewCoverOpened(true)}
                      enableConfetti={true}
                      variant="frame"
                      frameRadiusClass="rounded-none"
                      compact={false}
                      headerLabel={t.hero.envelopeHeader}
                      ceremonyLabel={invitationState.eventType || t.hero.sampleCeremony}
                      hostNames={invitationState.hostNames || t.hero.sampleGroomBride}
                      openButtonLabel={t.hero.openEnvelopeBtn}
                    >
                      <div className="w-full h-full overflow-y-auto overflow-x-hidden taklifim-preview-scroll">
                        <TemplateRenderer
                          invitation={invitationState}
                          language={language}
                          isPreview={true}
                        />
                      </div>
                    </InvitationShell>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <GlassModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        size="sm"
        ariaLabel={t.builder.startOver}
        closeLabel={t.common.close}
      >
        <div className="space-y-5 text-center pt-1">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center mx-auto">
            <RotateCcw className="w-6 h-6" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-playfair text-xl font-bold text-[#1E1418]">
              {t.builder.startOver}
            </h3>
            <p className="text-xs text-[#4A383F] leading-relaxed">
              {t.builder.confirmStartOver}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <GlassButton
              type="button"
              tone="light"
              size="sm"
              onClick={() => setShowResetModal(false)}
              className="w-full"
            >
              {t.common.cancel}
            </GlassButton>
            <button
              type="button"
              onClick={handleStartOverConfirm}
              className="min-h-[42px] py-2.5 px-4 rounded-full text-xs font-bold text-white bg-[#C81E4A] hover:bg-[#A6143A] shadow-sm transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C81E4A]"
            >
              {t.builder.startOver}
            </button>
          </div>
        </div>
      </GlassModal>

      {/* Step 11 Payment Gate — Google / Apple Login Modal */}
      <GlassModal
        isOpen={showStep11AuthModal}
        onClose={() => setShowStep11AuthModal(false)}
        size="md"
        ariaLabel={t.auth.step11GateTitle}
        closeLabel={t.common.close}
      >
        <div className="space-y-4 pt-1">
          <div className="text-center space-y-1.5">
            <h3 className="font-playfair text-xl font-bold text-[#1E1418]">
              {t.auth.step11GateTitle}
            </h3>
            <p className="text-xs text-[#4A383F] leading-relaxed">
              {t.auth.step11GateDesc}
            </p>
          </div>
          <SocialLoginButtons
            onBeforeSignIn={() => saveDraftLocally()}
            onSuccess={() => {
              setShowStep11AuthModal(false);
              setCurrentStep(11);
            }}
          />
        </div>
      </GlassModal>
    </div>
  );
};
