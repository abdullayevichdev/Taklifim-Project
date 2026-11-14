import React, { useState, useEffect, useRef } from 'react';
import { useRouter, Link } from '../context/RouterContext';
import { useLanguage, formatItemCount, translateCategory } from '../locales';
import { useAuth } from '../context/AuthContext';
import { mockTemplates } from '../data/mockTemplates';
import { mockPlans } from '../data/mockPlans';
import { InvitationData, ScheduleItem, DressCodeColor, Template, OrderStatus } from '../types';
import { PAYMENT_CONFIG, getPaymentCopy } from '../config/payment';
import { CustomDropdown } from '../components/CustomDropdown';
import { TemplateThemeDecoration } from '../components/TemplateThemeDecoration';
import { TemplateRenderer } from '../templates/TemplateRenderer';
import { LocationPickerMap } from '../components/LocationPickerMap';
import { audioStorage } from '../utils/audioStorage';
import { api } from '../services/api';
import { formatPriceUZS } from '../utils/logic';
import { generateInvitationSlug, cleanNameForSlug } from '../utils/slug';
import {
  compressImageForUpload,
  validatePdfFile,
  MAX_PDF_BYTES,
} from '../utils/receiptCompress';
import { cleanAndValidateUzPhone } from '../utils/phone.js';
import { isFirebaseConfigured, storage } from '../services/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
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
import { TaklifimLogo } from '../components/TaklifimLogo';
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

export const BuilderPage: React.FC = () => {
  const { params, navigate } = useRouter();
  const { t, language } = useLanguage();
  const { showToast, isLoggedIn, user } = useAuth();
  const paymentCopy = getPaymentCopy(language);
  const templateSlug = params.templateSlug || 'template-1';

  // Find template
  const initialTemplate =
    mockTemplates.find((t) => t.slug === templateSlug) || mockTemplates[0];

  const [availableTemplates, setAvailableTemplates] = useState<Template[]>(mockTemplates);

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

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [activeTabMobile, setActiveTabMobile] = useState<'settings' | 'preview'>('settings');
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('plan-standard');
  const [isDemoSubmitting, setIsDemoSubmitting] = useState<boolean>(false);
  const [isOrderComplete, setIsOrderComplete] = useState<boolean>(false);
  const [publishedSlug, setPublishedSlug] = useState<string>('');
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string>('');

  // Payment Receipt and Telegram Integration States
  const [activeOrderId, setActiveOrderId] = useState<string>('');
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('draft');
  const [copiedCard, setCopiedCard] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [preparedFileType, setPreparedFileType] = useState<string>('');
  const [preparedFileName, setPreparedFileName] = useState<string>('');
  const [isPreparingFile, setIsPreparingFile] = useState<boolean>(false);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [showResetModal, setShowResetModal] = useState<boolean>(false);

  // Main Builder State (Live reactive)
  const [invitationState, setInvitationState] = useState<InvitationData>(() => {
    // Check saved draft in localStorage
    try {
      const draft = localStorage.getItem('taklifim_builder_draft');
      if (draft) {
        const parsed = JSON.parse(draft);
        if (params.templateSlug && parsed.templateSlug !== params.templateSlug) {
          const matchTpl = mockTemplates.find((t) => t.slug === params.templateSlug);
          if (matchTpl) {
            parsed.templateId = matchTpl.id;
            parsed.templateSlug = matchTpl.slug;
            parsed.coverImage = matchTpl.previewImage;
            parsed.galleryImages = [matchTpl.previewImage, ...(parsed.galleryImages?.slice(1) || [])];
            parsed.customColors = { ...matchTpl.colorStyle };
            parsed.customFonts = {
              heading: matchTpl.typography.headingFont,
              body: matchTpl.typography.bodyFont,
            };
          }
        }
        return parsed;
      }
    } catch {
      // ignore
    }

    return {
      id: `inv-${Date.now()}`,
      slug: generateInvitationSlug('Asrorbek', 'Madina'),
      templateId: initialTemplate.id,
      templateSlug: initialTemplate.slug,
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
      coverImage: initialTemplate.previewImage,
      galleryImages: [
        initialTemplate.previewImage,
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
        primary: initialTemplate.colorStyle.primary,
        secondary: initialTemplate.colorStyle.secondary,
        accent: initialTemplate.colorStyle.accent,
        background: initialTemplate.colorStyle.background,
        text: initialTemplate.colorStyle.text,
      },
      customFonts: {
        heading: initialTemplate.typography.headingFont,
        body: initialTemplate.typography.bodyFont,
      },
    };
  });

  // Track last synced route slug to avoid reverting user template selection
  const lastSyncedSlugRef = useRef<string>(params.templateSlug || '');

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

    // Update browser URL silently without full reload
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState({}, '', `/create/${tpl.slug}`);
    }

    showToast(`«${tpl.name}» ${t.builder.toasts.templateSelectedSuffix}`, 'info');
  };

  // Synchronize ONLY when route URL templateSlug parameter changes externally
  useEffect(() => {
    if (params.templateSlug && params.templateSlug !== lastSyncedSlugRef.current) {
      lastSyncedSlugRef.current = params.templateSlug;
      const match = availableTemplates.find(
        (t) => t.slug === params.templateSlug || t.id === params.templateSlug
      );
      if (match) {
        handleSelectTemplate(match);
      }
    }
  }, [params.templateSlug, availableTemplates]);

  // Realtime 5-second status polling timer when order is pending review
  useEffect(() => {
    if (!activeOrderId || orderStatus !== 'pending_review') return;

    const interval = setInterval(async () => {
      const res = await api.getOrderStatus(activeOrderId);
      if (res.success && res.status) {
        setOrderStatus(res.status);

        if (res.status === 'paid') {
          // Activate invitation as paid
          await api.saveInvitation({
            ...invitationState,
            status: 'paid',
            orderId: activeOrderId,
            updatedAt: new Date().toISOString(),
          });

          setIsOrderComplete(true);
          setPublishedSlug(invitationState.slug);
          showToast(t.builder.toasts.invitationActivated, 'success');
          try {
            confetti({ particleCount: 160, spread: 90, origin: { y: 0.5 }, colors: ['#F5C9D8', '#B9DFFA', '#B48B47', '#D9658B', '#FFD700'] });
          } catch {}
        } else if (res.status === 'rejected') {
          showToast(t.builder.toasts.receiptRejected, 'error');
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeOrderId, orderStatus, invitationState]);

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

  // Handle receipt file change (images compressed to ≤1.5MB; PDF ≤4MB)
  const handleReceiptFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    setFileBase64('');
    setPreparedFileType('');
    setPreparedFileName('');
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
      return;
    }

    setIsPreparingFile(true);
    try {
      const compressed = await compressImageForUpload(file, undefined, language);
      setSelectedFile(file);
      setFileBase64(compressed.base64);
      setPreparedFileType(compressed.fileType);
      setPreparedFileName(compressed.fileName);
    } catch (err: any) {
      setSelectedFile(null);
      setUploadError(err.message || t.builder.toasts.receiptReadError);
    } finally {
      setIsPreparingFile(false);
    }
  };

  // Upload receipt and send to Telegram admin
  const handleSubmitReceiptUpload = async () => {
    const isPdf =
      preparedFileType === 'application/pdf' ||
      selectedFile?.type === 'application/pdf' ||
      (selectedFile?.name || '').toLowerCase().endsWith('.pdf');

    if (!selectedFile || (!fileBase64 && !isPdf)) {
      setUploadError(t.builder.toasts.uploadReceiptFirst);
      return;
    }

    const rawPhone = invitationState.socialLinks?.phone || user?.phone || '';
    const cleanPhone = cleanAndValidateUzPhone(rawPhone);
    if (!cleanPhone) {
      setUploadError(t.auth?.errors?.invalidPhone || 'Iltimos, to‘g‘ri telefon raqam kiriting (+998 90 123 45 67)');
      return;
    }

    if (isPdf && selectedFile.size > MAX_PDF_BYTES) {
      setUploadError(t.validation.receiptPdfTooLarge);
      return;
    }

    setIsUploadingReceipt(true);
    setUploadError('');

    try {
      const currentTemplate = availableTemplates.find((t) => t.slug === invitationState.templateSlug) || initialTemplate;
      const finalPrice = currentTemplate?.price || 60000;

      let orderId = activeOrderId;
      if (!orderId) {
        const order = await api.createOrder({
          serviceType: 'website_invitation',
          serviceName: `${invitationState.eventTitle} (${invitationState.hostNames})`,
          planName: `${currentTemplate.name} (${formatPriceUZS(finalPrice, language)})`,
          price: finalPrice,
          customerName: invitationState.hostNames,
          customerPhone: cleanPhone,
          invitationId: invitationState.id,
          invitationSlug: invitationState.slug,
          templateName: currentTemplate.name,
          weddingDate: invitationState.eventDate,
          venueName: invitationState.venueName,
          status: 'pending_review',
        });
        orderId = order.id;
        setActiveOrderId(orderId);
      }

      await api.saveInvitation({
        ...invitationState,
        status: 'pending_review',
        orderId,
        ownerId: user?.id || 'anonymous',
        updatedAt: new Date().toISOString(),
      });

      let fileUrl: string | undefined;
      let fileBase64Payload: string | undefined = fileBase64 || undefined;

      if (isPdf) {
        if (!isFirebaseConfigured() || !storage) {
          throw new Error(t.builder.toasts.pdfStorageError);
        }
        const path = `receipts/${orderId}/${Date.now()}_${selectedFile.name}`;
        const ref = storageRef(storage, path);
        await uploadBytes(ref, selectedFile, { contentType: 'application/pdf' });
        fileUrl = await getDownloadURL(ref);
        fileBase64Payload = undefined;
      }

      const res = await api.uploadReceipt({
        orderId,
        invitationId: invitationState.id,
        invitationSlug: invitationState.slug,
        customerName: invitationState.hostNames,
        customerPhone: cleanPhone,
        templateName: currentTemplate.name,
        weddingDate: invitationState.eventDate,
        venueName: invitationState.venueName,
        price: finalPrice,
        fileName: preparedFileName || selectedFile.name,
        fileType: preparedFileType || selectedFile.type,
        fileBase64: fileBase64Payload,
        fileUrl,
      });

      if (res.success) {
        setOrderStatus('pending_review');
        showToast(t.builder.toasts.receiptSent, 'success');
      } else {
        setUploadError(res.error || t.builder.toasts.receiptSendError);
        showToast(res.error || t.builder.toasts.receiptSendError, 'error');
      }
    } catch (err: any) {
      setUploadError(`${t.builder.toasts.serverErrorPrefix} ${err.message}`);
      showToast(t.builder.toasts.receiptSendError, 'error');
    } finally {
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
      localStorage.setItem('taklifim_builder_draft', JSON.stringify(invitationState));
      // Shuningdek, api orqali ham saqlash, shunda mehmon ko'rinishida ham darhol aks etadi
      await api.saveInvitation({
        ...invitationState,
        ownerId: user?.id || 'anonymous',
      });
      showToast(t.builder.toasts.draftSaved, 'success');
    } catch {
      showToast(t.builder.toasts.draftSaveError, 'error');
    }
  };

  const handleStartOverConfirm = () => {
    localStorage.removeItem('taklifim_builder_draft');
    setShowResetModal(false);
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

  // Checkout submission using the template's real price (50 000 - 70 000 UZS)
  const handleFinalCheckout = async () => {
    if (isDemoSubmitting) return;

    const currentTemplate = availableTemplates.find((t) => t.slug === invitationState.templateSlug) || initialTemplate;
    const finalPrice = currentTemplate?.price || 60000;

    setIsDemoSubmitting(true);

    try {
      const saved = await api.saveInvitation({
        ...invitationState,
        status: 'published',
        ownerId: user?.id || 'anonymous',
        updatedAt: new Date().toISOString(),
      });

      await api.createOrder({
        serviceType: 'website_invitation',
        serviceName: `${invitationState.eventTitle} (${invitationState.hostNames})`,
        planName: `${currentTemplate.name} (${formatPriceUZS(finalPrice, language)})`,
        price: finalPrice,
        customerName: invitationState.hostNames,
        invitationId: saved.id,
      });

      try { localStorage.removeItem('taklifim_builder_draft'); } catch { /* ignore */ }

      setPublishedSlug(saved.slug);
      setIsOrderComplete(true);

      try {
        confetti({ particleCount: 160, spread: 90, origin: { y: 0.5 }, colors: ['#F5C9D8', '#B9DFFA', '#B48B47', '#D9658B', '#FFD700'] });
      } catch {}

      showToast(t.builder.toasts.invitationActivated, 'success');
    } catch (err) {
      console.error('Checkout error:', err);
      showToast(t.builder.toasts.activateError, 'error');
    } finally {
      setIsDemoSubmitting(false);
    }
  };

  const stepsList = [
    { num: 1, title: t.builder.steps.template },
    { num: 2, title: t.builder.steps.details },
    { num: 3, title: t.builder.steps.message },
    { num: 4, title: t.builder.steps.design },
    { num: 5, title: t.builder.steps.photos },
    { num: 6, title: t.builder.steps.schedule },
    { num: 7, title: t.builder.steps.venue },
    { num: 8, title: t.builder.steps.music },
    { num: 9, title: t.builder.steps.rsvp },
    { num: 10, title: t.builder.steps.review },
    { num: 11, title: t.builder.steps.checkout },
  ];

  if (isOrderComplete) {
    const liveUrl = `/i/${publishedSlug || invitationState.slug}`;
    const fullLiveUrl = typeof window !== 'undefined' ? `${window.location.origin}${liveUrl}` : liveUrl;

    return (
      <div className="pt-28 pb-20 min-h-screen flex items-center justify-center px-4">
        <GlassSurface variant="elevated" rounded="3xl" className="w-full max-w-lg p-8 sm:p-10 text-center space-y-6 animate-fadeIn">
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
              <span className="text-[#4A383F]">{t.guestGate.eventLabel}:</span>
              <strong className="text-[#1E1418] text-right">{invitationState.eventTitle}</strong>
            </div>
            <div className="flex justify-between gap-3 border-b border-black/8 pb-2">
              <span className="text-[#4A383F]">{t.builder.reviewCouple}</span>
              <strong className="text-[#1E1418] text-right">{invitationState.hostNames}</strong>
            </div>
            <div className="flex justify-between gap-3 border-b border-black/8 pb-2">
              <span className="text-[#4A383F]">{t.guestGate.dateLabel}:</span>
              <strong className="text-[#1E1418] tabular-nums text-right">{invitationState.eventDate} ({invitationState.startTime})</strong>
            </div>
            <div className="flex justify-between items-center gap-3 pt-0.5">
              <span className="text-[#4A383F]">{t.builder.linkLabel}</span>
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
              to="/dashboard"
              className="text-xs font-semibold text-[#4A383F] hover:text-[#1E1418] inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              <Users className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.builder.goDashboardCta}</span>
            </Link>
          </div>
        </GlassSurface>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Top Builder Bar */}
        <GlassSurface variant="elevated" rounded="3xl" className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
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
                {stepsList[currentStep - 1]?.title} {t.builder.stepProgressSuffix} ({currentStep}/11)
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

        {/* Steps Progress Pills (Horizontal Scrollable) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {stepsList.map((st) => (
            <button
              key={st.num}
              type="button"
              onClick={() => setCurrentStep(st.num)}
              aria-current={currentStep === st.num ? 'step' : undefined}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer tabular-nums ${
                currentStep === st.num
                  ? 'bg-[#1E1418] text-white shadow-sm'
                  : currentStep > st.num
                  ? 'glass-surface-tinted-sky text-[#1E3A5F] hover:bg-white/90'
                  : 'glass-surface-subtle text-[#4A383F] hover:text-[#1E1418] hover:bg-white/90'
              }`}
            >
              <span>{st.num}. {st.title}</span>
            </button>
          ))}
        </div>

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
                <div className="grid grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
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
                            className="w-full h-24 object-cover rounded-xl mb-2"
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
                <h3 className="font-playfair text-xl font-bold text-[#1E1418]">
                  {t.builder.step2Heading}
                </h3>
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
                    onChange={(e) =>
                      setInvitationState((p) => ({ ...p, hostNames: e.target.value }))
                    }
                    placeholder={t.builder.hostNamesPlaceholder}
                  />

                  <div>
                    <label className="font-bold text-[11px] text-[#3A2D28] block mb-1.5">
                      {t.builder.slugLabel}
                    </label>
                    <div className="flex items-center gap-1 glass-surface-subtle bg-white/80 min-h-[44px] px-3.5 py-2 rounded-[var(--lg-radius)] text-xs focus-within:bg-white/95 focus-within:ring-2 focus-within:ring-[#D66389]/35 focus-within:border-[#D66389]/60">
                      <span className="text-[#4A383F] shrink-0 font-mono text-[11px]">{typeof window !== 'undefined' ? window.location.origin : ''}/i/</span>
                      <input
                        type="text"
                        value={invitationState.slug}
                        onChange={(e) => {
                          const cleaned = cleanNameForSlug(e.target.value);
                          setInvitationState((p) => ({ ...p, slug: cleaned }));
                        }}
                        placeholder="asrorbek-madina-4135"
                        className="w-full bg-transparent font-mono text-[#1E1418] font-bold outline-none"
                      />
                    </div>
                    <span className="text-[10px] text-[#4A383F] block mt-1">
                      {t.builder.slugHint}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-[11px] text-[#3A2D28] block mb-1.5">{t.builder.weddingDateLabel}</label>
                      <input
                        type="date"
                        value={invitationState.eventDate}
                        onChange={(e) =>
                          setInvitationState((p) => ({ ...p, eventDate: e.target.value }))
                        }
                        className={GLASS_FIELD_CLS}
                      />
                    </div>
                    <div>
                      <label className="font-bold text-[11px] text-[#3A2D28] block mb-1.5">{t.builder.startTimeLabel}</label>
                      <input
                        type="time"
                        value={invitationState.startTime}
                        onChange={(e) =>
                          setInvitationState((p) => ({ ...p, startTime: e.target.value }))
                        }
                        className={GLASS_FIELD_CLS}
                      />
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

            {/* STEP 3: Invitation Text */}
            {currentStep === 3 && (
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

            {/* STEP 4: Design & Colors */}
            {currentStep === 4 && (
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
                      setInvitationState((p) => ({
                        ...p,
                        customColors: {
                          primary: initialTemplate.colorStyle.primary,
                          secondary: initialTemplate.colorStyle.secondary,
                          accent: initialTemplate.colorStyle.accent,
                          background: initialTemplate.colorStyle.background,
                          text: initialTemplate.colorStyle.text,
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
                              className="w-20 px-2 py-1 rounded-lg border border-black/10 bg-white font-mono text-xs text-[#231E1B] uppercase text-center focus:ring-1 focus:ring-[#D9658B] outline-none"
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
                      value={invitationState.customFonts?.heading || 'Playfair Display'}
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
                        { value: 'Playfair Display', label: `Playfair Display — ${t.builder.fontClassic}` },
                        { value: 'Cinzel', label: `Cinzel — ${t.builder.fontRoyal}` },
                        { value: 'Great Vibes', label: `Great Vibes — ${t.builder.fontScript}` },
                        { value: 'Plus Jakarta Sans', label: `Plus Jakarta Sans — ${t.builder.fontModern}` },
                      ]}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: Photos */}
            {currentStep === 5 && (() => {
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

            {/* STEP 6: Schedule */}
            {currentStep === 6 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-playfair text-xl font-bold text-[#1E1418]">
                    {t.builder.step6Heading}
                  </h3>
                  <GlassButton
                    type="button"
                    tone="tinted"
                    size="sm"
                    onClick={handleAddScheduleItem}
                    leftIcon={<Plus className="w-3.5 h-3.5" aria-hidden="true" />}
                  >
                    {t.builder.addScheduleItem}
                  </GlassButton>
                </div>

                <div className="space-y-3">
                  {invitationState.schedule.map((item) => (
                    <GlassSurface key={item.id} variant="subtle" rounded="2xl" className="p-3 flex items-center gap-2">
                      <input
                        type="time"
                        value={item.time}
                        onChange={(e) => {
                          const val = e.target.value;
                          setInvitationState((p) => ({
                            ...p,
                            schedule: p.schedule.map((s) => (s.id === item.id ? { ...s, time: val } : s)),
                          }));
                        }}
                        className="w-24 min-h-[38px] px-2 py-1.5 rounded-xl text-xs font-bold border border-black/10 bg-white/90 text-[#1E1418] tabular-nums outline-none focus:ring-2 focus:ring-[#D66389]/35"
                      />
                      <input
                        type="text"
                        value={typeof item.title === 'string' ? item.title : item.title.uz}
                        onChange={(e) => {
                          const val = e.target.value;
                          setInvitationState((p) => ({
                            ...p,
                            schedule: p.schedule.map((s) => (s.id === item.id ? { ...s, title: val } : s)),
                          }));
                        }}
                        placeholder={t.builder.stepNamePlaceholder}
                        className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl text-xs border border-black/10 bg-white/90 text-[#1E1418] outline-none focus:ring-2 focus:ring-[#D66389]/35"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveScheduleItem(item.id)}
                        aria-label={t.dashboard.deleteActionTitle}
                        className="min-h-[38px] min-w-[38px] rounded-xl text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </GlassSurface>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 7: Venue & Map */}
            {currentStep === 7 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-playfair text-xl font-bold text-[#1E1418]">
                    {t.builder.step7Heading}
                  </h3>
                  <p className="text-xs text-[#4A383F] mt-0.5">
                    {t.builder.step7Desc}
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Venue name (if restaurant) */}
                  {(invitationState.venueLocationType || 'restaurant') === 'restaurant' && (
                    <GlassInput
                      type="text"
                      label={t.builder.venueHallLabel}
                      value={invitationState.venueName === 'Xonadonda' ? '' : invitationState.venueName}
                      onChange={(e) => setInvitationState((p) => ({ ...p, venueName: e.target.value }))}
                      placeholder={t.builder.venueHallPlaceholder}
                    />
                  )}

                  {/* Exact address */}
                  <GlassInput
                    type="text"
                    label={invitationState.venueLocationType === 'home' ? t.builder.homeAddressLabel : t.builder.exactAddressLabel}
                    value={invitationState.venueAddress}
                    onChange={(e) => setInvitationState((p) => ({ ...p, venueAddress: e.target.value }))}
                    placeholder={invitationState.venueLocationType === 'home' ? t.builder.homeAddressPlaceholder : t.builder.venueAddressPlaceholder}
                  />

                  {/* Interactive Map */}
                  <div className="space-y-2">
                    <label className="font-bold text-[#1E1418] block">
                      📍 {invitationState.venueLocationType === 'home' ? t.builder.venueMapHomeLabel : t.builder.venueMapHallLabel}
                    </label>
                    <LocationPickerMap
                      latitude={invitationState.latitude || 41.3217}
                      longitude={invitationState.longitude || 69.2415}
                      language={language}
                      onLocationSelect={(lat, lng, detectedAddress) => {
                        setInvitationState((p) => {
                          const updated = {
                            ...p,
                            latitude: lat,
                            longitude: lng,
                            venueAddress: detectedAddress || p.venueAddress,
                            mapUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
                          };
                          try {
                            localStorage.setItem('taklifim_builder_draft', JSON.stringify(updated));
                          } catch {}
                          return updated;
                        });
                        showToast(`${t.builder.toasts.mapPointSet} 📍 (${lat}, ${lng})`, 'success');
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 8: Music */}
            {currentStep === 8 && (
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
                            <audio controls src={previewAudioUrl || invitationState.musicUrl} key={previewAudioUrl || invitationState.musicUrl} className="w-full h-8 rounded-lg" />
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

            {/* STEP 9: RSVP Settings */}
            {currentStep === 9 && (
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

            {/* STEP 10: Review */}
            {currentStep === 10 && (
              <div className="space-y-4">
                <h3 className="font-playfair text-xl font-bold text-[#1E1418]">
                  {t.builder.step10Heading}
                </h3>
                <GlassSurface variant="subtle" rounded="2xl" className="p-4 text-xs space-y-2.5">
                  <div className="flex justify-between gap-3 border-b border-black/8 pb-2">
                    <span className="text-[#4A383F]">{t.guestGate.eventLabel}:</span>
                    <strong className="text-[#1E1418] text-right">{invitationState.eventTitle}</strong>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-black/8 pb-2">
                    <span className="text-[#4A383F]">{t.builder.reviewCouple}</span>
                    <strong className="text-[#1E1418] text-right">{invitationState.hostNames}</strong>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-black/8 pb-2">
                    <span className="text-[#4A383F]">{t.builder.reviewDate}</span>
                    <strong className="text-[#1E1418] tabular-nums text-right">
                      {invitationState.eventDate} ({invitationState.startTime})
                    </strong>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-black/8 pb-2">
                    <span className="text-[#4A383F]">{t.builder.reviewVenue}</span>
                    <strong className="text-[#1E1418] text-right">{invitationState.venueName}</strong>
                  </div>
                  <div className="flex justify-between gap-3 pt-0.5">
                    <span className="text-[#4A383F]">{t.builder.reviewPhotos}</span>
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
              const currentTemplate = availableTemplates.find((tpl) => tpl.slug === invitationState.templateSlug) || initialTemplate;
              const templatePrice = currentTemplate?.price || 60000;
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
                        </div>

                        <p className="text-xs sm:text-sm font-semibold text-[#4A383F] leading-relaxed max-w-md mx-auto">
                          {t.builder.receiptReplyTime}
                        </p>

                        <div className="inline-flex items-center gap-2 text-[11px] text-amber-900 font-semibold bg-white/85 px-3.5 py-1.5 rounded-full border border-amber-200">
                          <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" aria-hidden="true" />
                          <span>{t.builder.autoCheckStatus}</span>
                        </div>
                      </GlassSurface>
                    ) : (
                      /* FILE UPLOAD FORM VIEW */
                      <GlassSurface variant="elevated" rounded="3xl" className="p-5 space-y-4">
                        {orderStatus === 'rejected' && (
                          <div className="p-3.5 rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                            <div>
                              <strong>{t.builder.receiptRejectedTitle}</strong> {t.builder.receiptRejectedBody}
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[#1E1418] block">
                            {t.builder.receiptUploadLabel}
                          </label>

                          <div className="relative glass-surface-subtle border-2 border-dashed border-[#C64873]/40 hover:border-[#C64873] rounded-2xl p-5 text-center hover:bg-white/80 transition-colors cursor-pointer">
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,application/pdf"
                              onChange={handleReceiptFileChange}
                              disabled={isPreparingFile || isUploadingReceipt}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="space-y-2 flex flex-col items-center justify-center">
                              <div className="w-11 h-11 rounded-2xl glass-surface-tinted-pink text-[#9E3E60] flex items-center justify-center shadow-xs">
                                <Upload className="w-5 h-5" aria-hidden="true" />
                              </div>
                              {isPreparingFile ? (
                                <div>
                                  <span className="text-xs font-bold text-[#1E1418] block">
                                    {t.builder.compressingImage}
                                  </span>
                                  <span className="text-[10px] text-[#4A383F]">
                                    {t.builder.compressingSub}
                                  </span>
                                </div>
                              ) : selectedFile ? (
                                <div>
                                  <span className="text-xs font-bold text-[#1E1418] block truncate max-w-xs">
                                    📄 {preparedFileName || selectedFile.name}
                                  </span>
                                  <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                                    {t.builder.fileReadyText}
                                  </span>
                                </div>
                              ) : (
                                <div>
                                  <span className="text-xs font-bold text-[#1E1418] block">
                                    {t.builder.clickToChooseFile}
                                  </span>
                                  <span className="text-[10px] text-[#4A383F]">
                                    {t.builder.fileSizeRules}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {uploadError && (
                          <div role="alert" className="text-xs text-rose-700 font-semibold flex items-center gap-1.5 bg-rose-50/90 p-3 rounded-xl border border-rose-200">
                            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                            <span>{uploadError}</span>
                          </div>
                        )}

                        <GlassButton
                          type="button"
                          tone="tinted"
                          size="lg"
                          loading={isUploadingReceipt}
                          disabled={!canSubmitReceipt}
                          onClick={handleSubmitReceiptUpload}
                          leftIcon={!isUploadingReceipt ? <Upload className="w-4 h-4" aria-hidden="true" /> : undefined}
                          className="w-full"
                        >
                          {isUploadingReceipt
                            ? t.builder.submittingReceiptAdminBtn
                            : t.builder.submitReceiptAdminBtn}
                        </GlassButton>
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
                  onClick={() => setCurrentStep((p) => p - 1)}
                  leftIcon={<ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />}
                >
                  {t.builder.prevStep}
                </GlassButton>
              ) : (
                <div />
              )}

              {currentStep < 11 && (
                <GlassButton
                  type="button"
                  tone="tinted"
                  size="sm"
                  onClick={() => {
                    setCurrentStep((p) => p + 1);
                    try {
                      localStorage.setItem('taklifim_builder_draft', JSON.stringify(invitationState));
                    } catch {}
                    api.saveInvitation({
                      ...invitationState,
                      ownerId: user?.id || 'anonymous',
                    }).catch(() => {});
                  }}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />}
                >
                  {t.builder.nextStep}
                </GlassButton>
              )}
            </div>
          </GlassSurface>

          {/* RIGHT: LIVE REACTIVE PREVIEW ON DESKTOP & MOBILE */}
          {(() => {
            const previewTpl =
              availableTemplates.find(
                (t) =>
                  t.slug === invitationState.templateSlug ||
                  t.id === invitationState.templateId
              ) || mockTemplates[0];

            const isDarkPreview =
              invitationState.templateSlug === 'template-19' ||
              invitationState.templateSlug === 'template-10' ||
              invitationState.templateSlug === 'template-18' ||
              invitationState.templateSlug === 'template-3' ||
              invitationState.templateSlug === 'template-5' ||
              (invitationState.customColors?.background &&
                (invitationState.customColors.background.startsWith('#0') ||
                  invitationState.customColors.background.startsWith('#1') ||
                  invitationState.customColors.background.startsWith('#2')));

            return (
              <div
                className={`lg:col-span-6 flex flex-col items-center sticky top-28 ${
                  activeTabMobile === 'settings' ? 'hidden lg:flex' : 'flex'
                }`}
              >
                {/* Device View Toggle */}
                <div className="mb-4">
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
                </div>

                {previewDevice === 'mobile' ? (
                  <div className="w-[320px] sm:w-[350px] rounded-[44px] p-4 bg-[#231E1B] shadow-2xl ring-1 ring-white/20 relative transition-all">
                    {/* Speaker Notch */}
                    <div className="absolute top-5 left-1/2 -translate-x-1/2 w-24 h-4 bg-[#151210] rounded-full z-30" />

                    <div className="w-full h-[620px] rounded-[36px] overflow-y-auto overflow-x-hidden taklifim-preview-scroll pt-6 border border-black/10 select-none shadow-inner relative bg-white">
                      <TemplateRenderer
                        invitation={invitationState}
                        language={language}
                        isPreview={true}
                      />
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
                        taklifim.uz/i/{invitationState.slug || invitationState.templateSlug}
                      </div>
                      <div className="w-8" />
                    </div>

                    <div className="w-full h-[600px] overflow-y-auto overflow-x-hidden taklifim-preview-scroll select-none shadow-inner relative bg-white">
                      <TemplateRenderer
                        invitation={invitationState}
                        language={language}
                        isPreview={true}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
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
    </div>
  );
};
