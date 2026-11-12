import React, { useState, useEffect, useRef } from 'react';
import { useRouter, Link } from '../context/RouterContext';
import { useLanguage } from '../locales';
import { useAuth } from '../context/AuthContext';
import { mockTemplates } from '../data/mockTemplates';
import { mockPlans } from '../data/mockPlans';
import { InvitationData, ScheduleItem, DressCodeColor, Template, OrderStatus } from '../types';
import { PAYMENT_CONFIG } from '../config/payment';
import { CustomDropdown } from '../components/CustomDropdown';
import { TemplateThemeDecoration } from '../components/TemplateThemeDecoration';
import { TemplateRenderer } from '../templates/TemplateRenderer';
import { LocationPickerMap } from '../components/LocationPickerMap';
import { audioStorage } from '../utils/audioStorage';
import { api } from '../services/api';
import { formatPriceUZS } from '../utils/logic';
import {
  compressImageForUpload,
  validatePdfFile,
  MAX_PDF_BYTES,
} from '../utils/receiptCompress';
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
  const { showToast, isLoggedIn, canUseFreePlan, markFreePlanUsed, user } = useAuth();
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
  const [selectedPlanId, setSelectedPlanId] = useState<string>('plan-free');
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
      slug: `toylarimiz-${Math.floor(1000 + Math.random() * 9000)}`,
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

    showToast(`«${tpl.name}» shabloni tanlandi!`, 'info');
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
          showToast("✅ To'lovingiz tasdiqlandi! Taklifnomangiz faollashtirildi.", 'success');
          try {
            confetti({ particleCount: 160, spread: 90, origin: { y: 0.5 }, colors: ['#F5C9D8', '#B9DFFA', '#B48B47', '#D9658B', '#FFD700'] });
          } catch {}
        } else if (res.status === 'rejected') {
          showToast("❌ To'lov cheki admin tomonidan rad etildi. Iltimos chekni qayta yuklang.", 'error');
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
      showToast('Karta raqami nusxalandi ✅', 'success');
      setTimeout(() => setCopiedCard(false), 2500);
    } catch {
      showToast('Karta raqami: ' + PAYMENT_CONFIG.cardNumberFormatted, 'info');
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
      setUploadError('Faqat rasm (JPG, PNG) yoki PDF fayl yuklash mumkin.');
      return;
    }

    if (isPdf) {
      const pdfError = validatePdfFile(file);
      if (pdfError) {
        setUploadError(pdfError);
        return;
      }
      setSelectedFile(file);
      setPreparedFileType('application/pdf');
      setPreparedFileName(file.name);
      setFileBase64(''); // PDF goes via Firebase Storage on submit
      return;
    }

    setIsPreparingFile(true);
    try {
      const compressed = await compressImageForUpload(file);
      setSelectedFile(file);
      setFileBase64(compressed.base64);
      setPreparedFileType(compressed.fileType);
      setPreparedFileName(compressed.fileName);
    } catch (err: any) {
      setSelectedFile(null);
      setUploadError(err.message || 'Rasmni siqib bo‘lmadi. Boshqa fayl tanlang.');
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
      setUploadError("Iltimos, avval to'lov cheki faylini tanlang.");
      return;
    }

    if (isPdf && selectedFile.size > MAX_PDF_BYTES) {
      setUploadError('PDF fayl hajmi 4 MB dan oshmasligi kerak.');
      return;
    }

    setIsUploadingReceipt(true);
    setUploadError('');

    try {
      const currentTemplate = availableTemplates.find((t) => t.slug === invitationState.templateSlug) || initialTemplate;
      const finalPrice = canUseFreePlan() ? 0 : (currentTemplate?.price || 180000);

      let orderId = activeOrderId;
      if (!orderId) {
        const order = await api.createOrder({
          serviceType: 'website_invitation',
          serviceName: `${invitationState.eventTitle} (${invitationState.hostNames})`,
          planName: `${currentTemplate.name} (${formatPriceUZS(finalPrice)})`,
          price: finalPrice,
          customerName: invitationState.hostNames,
          customerPhone: user?.phone || '+998900000000',
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

      // Also save invitation as pending_review
      await api.saveInvitation({
        ...invitationState,
        status: 'pending_review',
        orderId,
        ownerId: user?.id || 'anonymous',
        updatedAt: new Date().toISOString(),
      });

      let fileUrl: string | undefined;
      let fileBase64Payload: string | undefined = fileBase64 || undefined;

      // PDFs: upload to Firebase Storage to stay under Vercel ~4.5MB body limit
      if (isPdf) {
        if (!isFirebaseConfigured() || !storage) {
          throw new Error('PDF yuklash uchun Firebase Storage sozlanmagan.');
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
        customerPhone: user?.phone || '+998900000000',
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
        showToast("Chekingiz adminga yuborildi, tasdiqlanishini kuting", 'success');
      } else {
        setUploadError(res.error || "Chek yuborishda xatolik yuz berdi.");
        showToast(res.error || "Xatolik yuz berdi, qayta urinib ko'ring", 'error');
      }
    } catch (err: any) {
      setUploadError("Server ulanishda xatolik: " + err.message);
      showToast("Xatolik yuz berdi, qayta urinib ko'ring", 'error');
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
      showToast(t.builder.draftSavedMsg, 'success');
    } catch {
      showToast('Qoralamani saqlashda xatolik', 'error');
    }
  };

  const handleStartOver = () => {
    if (confirm('Barcha kiritilgan o‘zgarishlarni bekor qilib, boshidan boshlamoqchimisiz?')) {
      localStorage.removeItem('taklifim_builder_draft');
      window.location.reload();
    }
  };

  // Schedule management
  const handleAddScheduleItem = () => {
    const newItem: ScheduleItem = {
      id: `s-${Date.now()}`,
      time: '19:00',
      title: 'Tantanali qism',
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
            showToast(`${fileList.length} ta fotosurat qo‘shildi!`, 'success');
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
    showToast('Surat olib tashlandi', 'info');
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

  // Music upload handler (Supports multiple audio files via IndexedDB without localStorage quota limits)
  const handleMusicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let firstUploadedKey = '';
    let firstUploadedTitle = '';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|ogg|m4a|aac)$/i)) {
        continue;
      }

      try {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_]+/g, ' ').trim() || 'Yuklangan musiqa';
        const trackId = `track_${Date.now()}_${i}`;
        const storageKey = await audioStorage.saveAudioFile(`audio_${invitationState.id}_${trackId}`, file);

        if (!firstUploadedKey) {
          firstUploadedKey = storageKey;
          firstUploadedTitle = cleanName;
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

        showToast(`«${cleanName}» muvaffaqiyatli yuklandi! 🎵`, 'success');
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
    showToast(`«${track.title}» tanlandi! 🎵`, 'success');
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
    showToast('Qo‘shiq olib tashlandi', 'info');
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
    showToast('Barcha musiqalar olib tashlandi', 'info');
  };

  // Checkout submission: 1-martalik bepul, keyingi safar esa aynan shablonning narxi
  const handleFinalCheckout = async () => {
    if (isDemoSubmitting) return;

    const currentTemplate = availableTemplates.find((t) => t.slug === invitationState.templateSlug) || initialTemplate;
    const isFree = canUseFreePlan();
    const finalPrice = isFree ? 0 : (currentTemplate?.price || 180000);

    if (isFree) {
      if (!isLoggedIn) {
        showToast('1 martalik bepul taklifnomani faollashtirish uchun tizimga kiring yoki ro‘yxatdan o‘ting!', 'info');
        navigate('/login');
        return;
      }
    }

    setIsDemoSubmitting(true);

    try {
      // 1. Save invitation as published
      const saved = await api.saveInvitation({
        ...invitationState,
        status: 'published',
        ownerId: user?.id || 'anonymous', // Invitation egasini belgilash
        updatedAt: new Date().toISOString(),
      });

      // 2. Create order record
      await api.createOrder({
        serviceType: 'website_invitation',
        serviceName: `${invitationState.eventTitle} (${invitationState.hostNames})`,
        planName: isFree ? '1 Martalik Bepul' : `${currentTemplate.name} (${formatPriceUZS(finalPrice)})`,
        price: finalPrice,
        customerName: invitationState.hostNames,
        invitationId: saved.id,
      });

      // 3. Agar bepul tarif bo'lsa, 1 martalik cheklovni belgilash
      if (isFree) {
        markFreePlanUsed();
      }

      // Clear draft
      try { localStorage.removeItem('taklifim_builder_draft'); } catch { /* ignore */ }

      setPublishedSlug(saved.slug);
      setIsOrderComplete(true);

      // Celebration confetti
      try {
        confetti({ particleCount: 160, spread: 90, origin: { y: 0.5 }, colors: ['#F5C9D8', '#B9DFFA', '#B48B47', '#D9658B', '#FFD700'] });
      } catch {}

      showToast(isFree ? "Tabriklaymiz! 1 martalik bepul taklifnomangiz muvaffaqiyatli faollashtirildi!" : "Taklifnoma muvaffaqiyatli faollashtirildi!", 'success');
    } catch (err) {
      console.error('Checkout error:', err);
      showToast('Faollashtirishda xatolik yuz berdi. Iltimos qaytadan urinib ko‘ring.', 'error');
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
        <div className="w-full max-w-lg glass-panel-elevated rounded-3xl p-8 sm:p-10 border border-white/95 shadow-2xl text-center space-y-6 animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-100 to-teal-100 mx-auto flex items-center justify-center text-emerald-600 shadow-sm">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              {selectedPlanId === 'plan-free' ? '🎁 Tekin Taklifnoma Faollashtirildi' : 'Buyurtma Tasdiqlandi'}
            </span>
            <h1 className="font-playfair text-3xl font-bold text-[#231E1B]">
              Muborak Bo‘lsin!
            </h1>
            <p className="text-xs sm:text-sm text-[#5C4F48] leading-relaxed">
              Sizning raqamli taklifnomangiz muvaffaqiyatli saqlandi va real vaqtda mehmonlarga ulashish uchun faol holatga keltirildi.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/80 border border-black/5 text-xs text-left space-y-2.5">
            <div className="flex justify-between border-b pb-1.5">
              <span className="text-[#8A7C74]">Tadbir:</span>
              <strong className="text-[#231E1B]">{invitationState.eventTitle}</strong>
            </div>
            <div className="flex justify-between border-b pb-1.5">
              <span className="text-[#8A7C74]">Ismlar:</span>
              <strong className="text-[#231E1B]">{invitationState.hostNames}</strong>
            </div>
            <div className="flex justify-between border-b pb-1.5">
              <span className="text-[#8A7C74]">Sana:</span>
              <strong className="text-[#231E1B]">{invitationState.eventDate} ({invitationState.startTime})</strong>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-[#8A7C74]">Havola:</span>
              <span className="font-mono text-[#D9658B] font-bold truncate max-w-[200px]">
                {liveUrl}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <Link
              to={liveUrl}
              className="w-full py-3.5 px-4 rounded-2xl text-xs font-bold text-white bg-[#231E1B] hover:bg-black transition-all shadow-sm flex items-center justify-center gap-2 hover:scale-[1.02]"
            >
              <Eye className="w-4 h-4" />
              <span>Taklifnomani ochish</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(fullLiveUrl);
                  showToast('Havola nusxalandi!', 'success');
                }
              }}
              className="w-full py-3.5 px-4 rounded-2xl text-xs font-bold text-[#231E1B] glass-panel hover:bg-white transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              <span>Havolani nusxalash</span>
            </button>
          </div>

          <div className="pt-2 border-t border-black/5">
            <Link
              to="/dashboard"
              className="text-xs font-semibold text-[#8A7C74] hover:text-[#231E1B] flex items-center justify-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Mijoz kabinetiga o‘tish (RSVP va mehmonlarni boshqarish)</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Top Builder Bar */}
        <div className="glass-panel-elevated rounded-3xl p-4 sm:p-5 border border-white/95 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/templates"
              className="p-2 rounded-xl hover:bg-black/5 text-[#5C4F48] transition-colors"
              title="Ortga"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="font-playfair text-xl font-bold text-[#231E1B]">
                Taklifnoma Konstruktori
              </h1>
              <p className="text-[11px] text-[#7A6A63]">
                {stepsList[currentStep - 1]?.title} bosqichi ({currentStep}/11)
              </p>
            </div>
          </div>

          {/* Quick Draft Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveDraft}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#4A3E39] glass-panel hover:bg-white border border-black/5"
              title="Qoralamani saqlash"
            >
              <Save className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Qoralamani saqlash</span>
            </button>
            <button
              onClick={handleStartOver}
              className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors"
              title="Boshidan boshlash"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Mobile View Toggle */}
            <div className="flex lg:hidden items-center p-1 rounded-xl bg-black/5">
              <button
                onClick={() => setActiveTabMobile('settings')}
                className={`px-3 py-1 rounded-lg text-xs font-bold ${
                  activeTabMobile === 'settings' ? 'bg-white shadow-xs text-[#231E1B]' : 'text-[#7A6A63]'
                }`}
              >
                Sozlamalar
              </button>
              <button
                onClick={() => setActiveTabMobile('preview')}
                className={`px-3 py-1 rounded-lg text-xs font-bold ${
                  activeTabMobile === 'preview' ? 'bg-white shadow-xs text-[#231E1B]' : 'text-[#7A6A63]'
                }`}
              >
                Ko‘rinish
              </button>
            </div>
          </div>
        </div>

        {/* Steps Progress Pills (Horizontal Scrollable) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar">
          {stepsList.map((st) => (
            <button
              key={st.num}
              onClick={() => setCurrentStep(st.num)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                currentStep === st.num
                  ? 'bg-[#231E1B] text-white shadow-xs'
                  : currentStep > st.num
                  ? 'bg-[#E8F3FA] text-[#1E3A5F]'
                  : 'glass-panel text-[#8A7C74] hover:bg-white'
              }`}
            >
              <span>{st.num}. {st.title}</span>
            </button>
          ))}
        </div>

        {/* SPLIT LAYOUT: Settings Panel on Left, Reactive Live Preview on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: STEP SETTINGS PANEL */}
          <div
            className={`lg:col-span-6 glass-panel-elevated rounded-3xl p-6 sm:p-8 border border-white/95 shadow-lg space-y-6 ${
              activeTabMobile === 'preview' ? 'hidden lg:block' : 'block'
            }`}
          >
            {/* STEP 1: Select Template */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="font-playfair text-xl font-bold text-[#231E1B]">
                  1. Shablonni tanlang
                </h3>
                <p className="text-xs text-[#7A6A63]">
                  Taklifnomangiz qiyofasini belgilovchi dizaynni tanlang:
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
                        <div className="text-[10px] text-[#7A6A63]">{tpl.category}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: Event Details */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <h3 className="font-playfair text-xl font-bold text-[#231E1B]">
                  2. Tadbir ma’lumotlari
                </h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-[#3A2D28] block mb-1">Tadbir turi</label>
                    <input
                      type="text"
                      value={invitationState.eventType}
                      onChange={(e) =>
                        setInvitationState((p) => ({ ...p, eventType: e.target.value }))
                      }
                      className="w-full p-2.5 rounded-xl glass-panel border border-black/10 outline-none text-[#231E1B]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#3A2D28] block mb-1">
                      Asosiy sarlavha (Kelin va kuyov yoki Mezbon)
                    </label>
                    <input
                      type="text"
                      value={invitationState.hostNames}
                      onChange={(e) =>
                        setInvitationState((p) => ({ ...p, hostNames: e.target.value }))
                      }
                      placeholder="Masalan: Nodir & Malika"
                      className="w-full p-2.5 rounded-xl glass-panel border border-black/10 outline-none text-[#231E1B]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-[#3A2D28] block mb-1">To‘y sanasi</label>
                      <input
                        type="date"
                        value={invitationState.eventDate}
                        onChange={(e) =>
                          setInvitationState((p) => ({ ...p, eventDate: e.target.value }))
                        }
                        className="w-full p-2.5 rounded-xl glass-panel border border-black/10 outline-none text-[#231E1B]"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-[#3A2D28] block mb-1">Boshlanish vaqti</label>
                      <input
                        type="time"
                        value={invitationState.startTime}
                        onChange={(e) =>
                          setInvitationState((p) => ({ ...p, startTime: e.target.value }))
                        }
                        className="w-full p-2.5 rounded-xl glass-panel border border-black/10 outline-none text-[#231E1B]"
                      />
                    </div>
                  </div>

                  {/* Tadbir joylashuvi: To'yxonada yoki Uyda */}
                  <div>
                    <label className="font-bold text-[#3A2D28] block mb-1.5">
                      Tadbir qayerda o‘tkaziladi?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setInvitationState((p) => ({
                            ...p,
                            venueLocationType: 'restaurant',
                            venueName: p.venueName === 'Xonadonda' || p.venueName === 'Uyda' ? '' : p.venueName,
                          }))
                        }
                        className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-center transition-all border ${
                          (invitationState.venueLocationType || 'restaurant') === 'restaurant'
                            ? 'bg-white border-[#D9658B] text-[#D9658B] shadow-xs font-bold ring-2 ring-[#D9658B]/20'
                            : 'bg-white/60 border-black/10 text-[#5C4F48] hover:bg-white'
                        }`}
                      >
                        <span className="text-xl">🏛️</span>
                        <span className="text-xs font-bold">To‘yxonada / Restoranda</span>
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
                        className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-center transition-all border ${
                          invitationState.venueLocationType === 'home'
                            ? 'bg-white border-[#D9658B] text-[#D9658B] shadow-xs font-bold ring-2 ring-[#D9658B]/20'
                            : 'bg-white/60 border-black/10 text-[#5C4F48] hover:bg-white'
                        }`}
                      >
                        <span className="text-xl">🏡</span>
                        <span className="text-xs font-bold">Uyda (Xonadonda)</span>
                      </button>
                    </div>
                  </div>

                  {/* Agar To'yxonada bo'lsa: Erkaklarnikimi, Ayollarnikimi yoki Erkaklar va Ayollarnikimi deb so'raydi, keyin To'yxona nomini kiritadi */}
                  {(invitationState.venueLocationType || 'restaurant') === 'restaurant' && (
                    <div className="space-y-3 pt-1 animate-fadeIn">
                      <div>
                        <label className="font-bold text-[#3A2D28] block mb-1.5">
                          Tadbir kimlar uchun o‘tkaziladi?
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'men', label: 'Erkaklarniki', icon: '👔' },
                            { id: 'women', label: 'Ayollarniki', icon: '👗' },
                            { id: 'all', label: 'Erkaklar va Ayollar', icon: '👫' },
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
                              className={`py-2 px-1.5 rounded-xl text-center transition-all border flex flex-col items-center gap-1 ${
                                (invitationState.celebrationAudience || 'all') === item.id
                                  ? 'bg-white border-[#D9658B] text-[#D9658B] shadow-xs font-bold ring-2 ring-[#D9658B]/15'
                                  : 'bg-white/60 border-black/10 text-[#5C4F48] hover:bg-white'
                              }`}
                            >
                              <span className="text-base">{item.icon}</span>
                              <span className="text-[11px] leading-tight font-medium">{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="font-bold text-[#3A2D28] block mb-1">To‘yxona / Joy nomi</label>
                        <input
                          type="text"
                          value={invitationState.venueName === 'Xonadonda' ? '' : invitationState.venueName}
                          onChange={(e) =>
                            setInvitationState((p) => ({ ...p, venueName: e.target.value }))
                          }
                          placeholder="«Navbahor» Tantanalar Majmuasi"
                          className="w-full p-2.5 rounded-xl glass-panel border border-black/10 outline-none text-[#231E1B]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Aniq manzil har doim so'raladi */}
                  <div>
                    <label className="font-bold text-[#3A2D28] block mb-1">
                      {invitationState.venueLocationType === 'home' ? 'Xonadon manzili' : 'Aniq manzil'}
                    </label>
                    <input
                      type="text"
                      value={invitationState.venueAddress}
                      onChange={(e) =>
                        setInvitationState((p) => ({ ...p, venueAddress: e.target.value }))
                      }
                      placeholder={invitationState.venueLocationType === 'home' ? 'Namangan sh., Chortoq ko‘chasi, 15-uy' : 'Namangan shahar, ...'}
                      className="w-full p-2.5 rounded-xl glass-panel border border-black/10 outline-none text-[#231E1B]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Invitation Text */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <h3 className="font-playfair text-xl font-bold text-[#231E1B]">
                  3. Taklif matni va hikmat
                </h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-[#3A2D28] block mb-1">
                      Samimiy taklif matni
                    </label>
                    <textarea
                      rows={5}
                      value={invitationState.invitationMessage}
                      onChange={(e) =>
                        setInvitationState((p) => ({ ...p, invitationMessage: e.target.value }))
                      }
                      className="w-full p-2.5 rounded-xl glass-panel border border-black/10 outline-none text-[#231E1B] leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[#3A2D28] block mb-1">
                      Hikmatli so‘z yoki shior (Iqtibos)
                    </label>
                    <input
                      type="text"
                      value={invitationState.invitationQuote || ''}
                      onChange={(e) =>
                        setInvitationState((p) => ({ ...p, invitationQuote: e.target.value }))
                      }
                      className="w-full p-2.5 rounded-xl glass-panel border border-black/10 outline-none text-[#231E1B]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Design & Colors */}
            {currentStep === 4 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-playfair text-xl font-bold text-[#231E1B]">
                      4. Ranglar va Shriftlar
                    </h3>
                    <p className="text-xs text-[#7A6A63] mt-0.5">
                      Taklifnomaning har bir rangini o‘zingiz erkin sozlang
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
                      showToast('Ranglar shablon holatiga qaytarildi', 'info');
                    }}
                    className="text-[11px] font-semibold text-[#8A7C74] hover:text-[#231E1B] underline"
                  >
                    Shablon rangiga qaytarish
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Color Grid with Color Picker AND Manual Hex Input */}
                  <div className="grid grid-cols-1 gap-2.5">
                    {([
                      { key: 'primary', label: 'Asosiy rang (Tugmalar, sarlavhalar)', default: '#B48B47' },
                      { key: 'secondary', label: 'Ikkilamchi rang (Aksent belgilar)', default: '#D9658B' },
                      { key: 'accent', label: 'Ajratuvchi rang (Hoshiya, bezak)', default: '#C9A96E' },
                      { key: 'background', label: 'Fon rangi (Sahifa orqa foni)', default: '#FAF6F0' },
                      { key: 'text', label: 'Matn rangi (Asosiy yozuvlar)', default: '#231E1B' },
                    ] as { key: keyof NonNullable<typeof invitationState.customColors>; label: string; default: string }[]).map((item) => {
                      const { key, label } = item;
                      const currentVal = invitationState.customColors?.[key] || item.default;
                      return (
                        <div key={key} className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/70 border border-black/8 hover:bg-white hover:shadow-xs transition-all">
                          {/* Native color picker */}
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

                          {/* Label and description */}
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[#231E1B] truncate">{label}</p>
                            <p className="text-[10px] text-[#8A7C74]">HEX kodini kiriting yoki tanlang</p>
                          </div>

                          {/* Manual HEX code input */}
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
                      Tayyor nafis rang palitralari (1 bosishda o‘zgartirish)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { name: 'Oltin Nafosat', colors: { primary: '#B48B47', secondary: '#D9658B', accent: '#C9A96E', background: '#FAF6F0', text: '#231E1B' } },
                        { name: 'Pushti Romantika', colors: { primary: '#D9658B', secondary: '#F5C9D8', accent: '#E8A0B8', background: '#FFF5F8', text: '#2A1520' } },
                        { name: 'Moviy Dengiz', colors: { primary: '#2A6F97', secondary: '#B9DFFA', accent: '#61A5C2', background: '#F0F8FF', text: '#1A2A35' } },
                        { name: 'Zumrad Tabiat', colors: { primary: '#2D6A4F', secondary: '#95D5B2', accent: '#52B788', background: '#F2FBF5', text: '#1B3A2B' } },
                        { name: 'Qirollik Binafsha', colors: { primary: '#7209B7', secondary: '#F72585', accent: '#B5179E', background: '#FAF5FF', text: '#240046' } },
                        { name: 'Monoxrom Klassika', colors: { primary: '#1F2937', secondary: '#6B7280', accent: '#4B5563', background: '#FFFFFF', text: '#111827' } },
                      ].map((palette) => (
                        <button
                          key={palette.name}
                          type="button"
                          onClick={() => {
                            setInvitationState((p) => ({ ...p, customColors: palette.colors }));
                            showToast(`«${palette.name}» palitrasi qo‘llandi!`, 'info');
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
                    <label className="font-bold text-[#3A2D28] block mb-1">Sarlavha shrifti (Typography)</label>
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
                        { value: 'Playfair Display', label: 'Playfair Display (Klassik va nafis serif)' },
                        { value: 'Cinzel', label: 'Cinzel (Qirollik monoxrom serifi)' },
                        { value: 'Great Vibes', label: 'Great Vibes (Qo‘lyozma romantik)' },
                        { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans (Zamonaviy toza modern)' },
                      ]}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: Photos */}
            {currentStep === 5 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-playfair text-xl font-bold text-[#231E1B]">
                    5. Fotosuratlar galereyasi
                  </h3>
                  <p className="text-xs text-[#7A6A63] mt-1">
                    Taklifnomangizga mehmonlar zavqlanib tomosha qilishi uchun romantik va unutilmas suratlarni joylang.
                  </p>
                </div>

                {/* Surat bo'limi turi (Sarlavhasi) */}
                <div className="p-3.5 rounded-2xl bg-white/70 border border-black/5 space-y-2.5">
                  <label className="font-bold text-xs text-[#3A2D28] block">
                    Surat bo‘limining turi (Shablonda ko‘rinadigan sarlavha):
                  </label>
                  <CustomDropdown
                    value={
                      ['Bizning suratlarimiz', 'To‘y jarayoni suratlari', 'To‘yxona suratlari'].includes(invitationState.galleryTitle || '')
                        ? invitationState.galleryTitle || 'Bizning suratlarimiz'
                        : 'Boshqa'
                    }
                    onChange={(val) => {
                      if (val === 'Boshqa') {
                        setInvitationState((p) => ({ ...p, galleryTitle: '' }));
                      } else {
                        setInvitationState((p) => ({ ...p, galleryTitle: val }));
                      }
                    }}
                    options={[
                      { value: 'Bizning suratlarimiz', label: '💑 Bizning suratlarimiz' },
                      { value: 'To‘y jarayoni suratlari', label: '📸 To‘y jarayoni suratlari' },
                      { value: 'To‘yxona suratlari', label: '🏛️ To‘yxona suratlari' },
                      { value: 'Boshqa', label: '✏️ Boshqa (O‘zingiz yozing)' },
                    ]}
                    className="w-full"
                    buttonClassName="w-full justify-between text-xs"
                    dropdownClassName="w-full left-0 right-0"
                  />

                  {/* Boshqa tanlanganda erkin sarlavha kiritish maydoni */}
                  {(!['Bizning suratlarimiz', 'To‘y jarayoni suratlari', 'To‘yxona suratlari'].includes(invitationState.galleryTitle || '') || invitationState.galleryTitle === '') && (
                    <div className="pt-1.5 animate-fadeIn">
                      <label className="text-[11px] font-semibold text-[#7A6A63] block mb-1">
                        O‘zingiz istagan sarlavhani yozing:
                      </label>
                      <input
                        type="text"
                        value={invitationState.galleryTitle || ''}
                        onChange={(e) => setInvitationState((p) => ({ ...p, galleryTitle: e.target.value }))}
                        placeholder="Masalan: Muhabbat qissasi, Fotoxotiralar..."
                        className="w-full p-2.5 rounded-xl bg-white border border-black/10 text-xs outline-none focus:border-[#D9658B] transition-all"
                      />
                    </div>
                  )}
                </div>

                {/* Suratlar bo'limining joylashuv o'rni */}
                <div className="p-3.5 rounded-2xl bg-white/70 border border-black/5 space-y-2">
                  <label className="font-bold text-xs text-[#3A2D28] block">
                    Shablonda suratlar bo‘limi qayerda joylashsin?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'after_message', label: 'Taklif matnidan so‘ng', badge: 'Tavsiya' },
                      { id: 'after_date', label: 'Sana va manzildan so‘ng', badge: 'Klassik' },
                      { id: 'after_schedule', label: 'Dastur jadvalidan so‘ng', badge: 'Pastda' },
                    ].map((pos) => {
                      const isSel = (invitationState.galleryPosition || 'after_message') === pos.id;
                      return (
                        <button
                          key={pos.id}
                          type="button"
                          onClick={() => setInvitationState((p) => ({ ...p, galleryPosition: pos.id as any }))}
                          className={`p-2.5 rounded-xl text-left border transition-all text-xs flex flex-col justify-between gap-1.5 ${
                            isSel
                              ? 'bg-gradient-to-tr from-[#FFF5F8] to-[#F0F8FF] border-[#D9658B] shadow-xs ring-1 ring-[#D9658B]/30'
                              : 'bg-white/80 border-black/10 hover:border-black/20'
                          }`}
                        >
                          <span className={`font-bold ${isSel ? 'text-[#D9658B]' : 'text-[#3A2D28]'}`}>
                            {pos.label}
                          </span>
                          <span className="text-[10px] text-[#7A6A63] font-medium bg-black/5 px-2 py-0.5 rounded-full w-max">
                            {pos.badge}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Yuklash maydoni */}
                <div className="border-2 border-dashed border-[#B48B47]/40 rounded-2xl p-6 text-center hover:bg-white/40 transition-colors bg-white/20">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="photo-upload-input"
                  />
                  <label htmlFor="photo-upload-input" className="cursor-pointer space-y-2 block">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#F5C9D8] to-[#B9DFFA] flex items-center justify-center mx-auto text-[#231E1B] shadow-xs">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-bold text-[#231E1B]">
                      Yangi fotosurat(lar) tanlash
                    </div>
                    <div className="text-[11px] text-[#7A6A63]">
                      PNG, JPG — bir vaqtda bir nechta surat tanlashingiz mumkin
                    </div>
                  </label>
                </div>

                {/* Yuklangan suratlar ro'yxati va tartibini o'zgartirish */}
                {invitationState.galleryImages.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-[#3A2D28]">
                      <span>Yuklangan suratlar ({invitationState.galleryImages.length} ta)</span>
                      <span className="text-[10px] font-normal text-[#7A6A63]">
                        ← → tugmalari orqali tartibini o‘zgartiring
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
                            <img src={img} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                            
                            {/* Tartib raqami */}
                            <span className="absolute top-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                              #{idx + 1} {isCover && '★ Muqova'}
                            </span>

                            {/* O'chirish tugmasi */}
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(idx)}
                              className="absolute top-1 right-1 p-1 rounded-md bg-black/60 text-white hover:bg-rose-600 transition-colors"
                              title="O‘chirish"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Pastki boshqaruv paneli (Chapga / O'ngga surish) */}
                            <div className="absolute bottom-0 inset-x-0 p-1 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMovePhoto(idx, idx - 1)}
                                className="p-1 rounded bg-white/20 text-white hover:bg-white/40 disabled:opacity-20 transition-all text-[10px] font-bold flex items-center"
                                title="Chapga surish"
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setInvitationState((p) => ({ ...p, coverImage: img }));
                                  showToast('Ushbu surat asosiy muqova qilib belgilandi!', 'success');
                                }}
                                className="text-[9px] px-1.5 py-0.5 rounded bg-white/30 hover:bg-white text-black font-semibold transition-all truncate"
                              >
                                {isCover ? 'Asosiy' : 'Muqova qilish'}
                              </button>

                              <button
                                type="button"
                                disabled={idx === invitationState.galleryImages.length - 1}
                                onClick={() => handleMovePhoto(idx, idx + 1)}
                                className="p-1 rounded bg-white/20 text-white hover:bg-white/40 disabled:opacity-20 transition-all text-[10px] font-bold flex items-center"
                                title="O‘ngga surish"
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
                    Hozircha suratlar yo‘q. Yangi surat qo‘shsangiz, taklifnomada unutilmas fotogalereya paydo bo‘ladi!
                  </div>
                )}
              </div>
            )}

            {/* STEP 6: Schedule */}
            {currentStep === 6 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-playfair text-xl font-bold text-[#231E1B]">
                    6. Tadbir dasturi (Jadval)
                  </h3>
                  <button
                    onClick={handleAddScheduleItem}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#231E1B] text-white text-xs font-semibold hover:bg-black"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Qo‘shish</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {invitationState.schedule.map((item, idx) => (
                    <div key={item.id} className="p-3 rounded-2xl glass-panel border border-black/10 flex items-center gap-2">
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
                        className="w-24 p-1.5 rounded-lg text-xs font-bold border border-black/10 bg-white"
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
                        placeholder="Bosqich nomi"
                        className="flex-1 p-1.5 rounded-lg text-xs border border-black/10 bg-white"
                      />
                      <button
                        onClick={() => handleRemoveScheduleItem(item.id)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 7: Venue & Map */}
            {currentStep === 7 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-playfair text-xl font-bold text-[#231E1B]">
                    7. Manzil va Google Xaritasi
                  </h3>
                  <p className="text-xs text-[#7A6A63] mt-0.5">
                    Mehmonlar adashmasdan to‘g‘ri yetib kelishlari uchun aniq manzil va Google Maps lokatsiyasini kiriting.
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  {/* To'yxona nomi (faqat restoranda bo'lsa) */}
                  {(invitationState.venueLocationType || 'restaurant') === 'restaurant' && (
                    <div>
                      <label className="font-bold text-[#3A2D28] block mb-1">To‘yxona / Bino nomi</label>
                      <input
                        type="text"
                        value={invitationState.venueName === 'Xonadonda' ? '' : invitationState.venueName}
                        onChange={(e) => setInvitationState((p) => ({ ...p, venueName: e.target.value }))}
                        placeholder="«Versal» Tantanalar Majmuasi"
                        className="w-full p-2.5 rounded-xl glass-panel border border-black/10 outline-none text-[#231E1B]"
                      />
                    </div>
                  )}

                  {/* Aniq manzil */}
                  <div>
                    <label className="font-bold text-[#3A2D28] block mb-1">
                      {invitationState.venueLocationType === 'home' ? 'Xonadonning aniq manzili' : 'Aniq yo‘nalish manzili'}
                    </label>
                    <input
                      type="text"
                      value={invitationState.venueAddress}
                      onChange={(e) => setInvitationState((p) => ({ ...p, venueAddress: e.target.value }))}
                      placeholder={invitationState.venueLocationType === 'home' ? 'Namangan sh., Chortoq ko‘chasi, 15-uy' : 'Toshkent sh., Shayxontohur tumani, Navoiy ko‘chasi, 42-uy'}
                      className="w-full p-2.5 rounded-xl glass-panel border border-black/10 outline-none text-[#231E1B]"
                    />
                  </div>

                  {/* Saytning o'zidagi ixcham Interaktiv Google/OSM Xaritasi */}
                  <div className="space-y-2">
                    <label className="font-bold text-[#1E1418] block">
                      📍 Interaktiv Xaritada {invitationState.venueLocationType === 'home' ? 'xonadon' : 'to‘yxona'} lokatsiyasini belgilang:
                    </label>
                    <LocationPickerMap
                      latitude={invitationState.latitude || 41.3217}
                      longitude={invitationState.longitude || 69.2415}
                      onLocationSelect={(lat, lng, detectedAddress) => {
                        setInvitationState((p) => {
                          const updated = {
                            ...p,
                            latitude: lat,
                            longitude: lng,
                            venueAddress: detectedAddress || p.venueAddress,
                            mapUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
                          };
                          // Zudlik bilan avto-saqlash
                          try {
                            localStorage.setItem('taklifim_builder_draft', JSON.stringify(updated));
                          } catch {}
                          return updated;
                        });
                        showToast(`Xaritada lokatsiya muvaffaqiyatli belgilandi! 📍 (${lat}, ${lng})`, 'success');
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
                  <h3 className="font-playfair text-xl font-bold text-[#231E1B]">
                    8. Fon Musiqasi va Pleylist
                  </h3>
                  <p className="text-xs text-[#7A6A63] mt-1">
                    Taklifnomangiz uchun xohlagancha qo‘shiq yuklang yoki sara to‘y kuylaridan tanlang. Musiqalar qayerlarda va qanday yangrashini o‘zingiz belgilang.
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Musiqani yoqish/o'chirish */}
                  <label className="flex items-center gap-3 cursor-pointer p-3.5 rounded-2xl bg-white/70 border border-black/5 hover:bg-white transition-all shadow-xs">
                    <input
                      type="checkbox"
                      checked={invitationState.musicEnabled}
                      onChange={(e) => setInvitationState((p) => ({ ...p, musicEnabled: e.target.checked }))}
                      className="w-4 h-4 rounded text-[#D9658B]"
                    />
                    <div>
                      <span className="font-bold text-sm text-[#231E1B] block">Musiqiy jo‘rlikni yoqish</span>
                      <span className="text-[11px] text-[#7A6A63]">Mehmonlar taklifnomani ko‘rishida nafis musiqa yangrashi</span>
                    </div>
                  </label>

                  {invitationState.musicEnabled && (
                    <div className="space-y-5 pt-1 animate-fadeIn">
                      {/* Musiqa qayerlarda yangrashini tanlash (Joylashuv va ijro uslubi) */}
                      <div className="p-4 rounded-2xl bg-gradient-to-tr from-[#FFF5F8] via-white to-[#F0F8FF] border border-[#D9658B]/30 space-y-3 shadow-xs">
                        <label className="font-bold text-xs text-[#231E1B] block">
                          🎵 Musiqa qayerda va qanday yangrasin? (Joylashuvni tanlang):
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <button
                            type="button"
                            onClick={() => setInvitationState((p) => ({ ...p, musicPlacement: 'all' }))}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              (!invitationState.musicPlacement || invitationState.musicPlacement === 'all')
                                ? 'bg-white border-[#D9658B] ring-2 ring-[#D9658B]/20 shadow-xs'
                                : 'bg-white/60 border-black/5 hover:bg-white'
                            }`}
                          >
                            <span className="text-base block mb-1">🌟</span>
                            <span className="font-bold text-[11px] text-[#231E1B] block">Butun sahifada</span>
                            <span className="text-[10px] text-[#7A6A63] block mt-0.5">Boshidan oxirigacha uzluksiz chalinadi</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setInvitationState((p) => ({ ...p, musicPlacement: 'cover' }))}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              invitationState.musicPlacement === 'cover'
                                ? 'bg-white border-[#D9658B] ring-2 ring-[#D9658B]/20 shadow-xs'
                                : 'bg-white/60 border-black/5 hover:bg-white'
                            }`}
                          >
                            <span className="text-base block mb-1">💌</span>
                            <span className="font-bold text-[11px] text-[#231E1B] block">Taklifnomani ochganda</span>
                            <span className="text-[10px] text-[#7A6A63] block mt-0.5">Ochilgach 5 soniyada asta yangraydi</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setInvitationState((p) => ({ ...p, musicPlacement: 'floating' }))}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              invitationState.musicPlacement === 'floating'
                                ? 'bg-white border-[#D9658B] ring-2 ring-[#D9658B]/20 shadow-xs'
                                : 'bg-white/60 border-black/5 hover:bg-white'
                            }`}
                          >
                            <span className="text-base block mb-1">🎧</span>
                            <span className="font-bold text-[11px] text-[#231E1B] block">Suzuvchi pleyer</span>
                            <span className="text-[10px] text-[#7A6A63] block mt-0.5">Ekranning pastki qismidagi pult orqali</span>
                          </button>
                        </div>
                      </div>

                      {/* Xohlagancha musiqa yuklash (Multiple Uploads) */}
                      <div className="border-2 border-dashed border-[#B48B47]/40 rounded-2xl p-5 text-center hover:bg-white/60 transition-colors bg-white/30 space-y-2">
                        <input
                          type="file"
                          accept="audio/*"
                          multiple
                          onChange={handleMusicUpload}
                          className="hidden"
                          id="music-upload-input"
                        />
                        <label htmlFor="music-upload-input" className="cursor-pointer space-y-2 block">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#F5C9D8] to-[#B9DFFA] flex items-center justify-center mx-auto text-[#231E1B] shadow-xs">
                            <Music className="w-6 h-6 text-[#D9658B]" />
                          </div>
                          <div className="text-xs font-bold text-[#231E1B]">
                            + O‘z kompyuter yoki telefoningizdan xohlagancha audio yuklang
                          </div>
                          <div className="text-[11px] text-[#7A6A63]">
                            Bir vaqtning o‘zida bir nechta MP3, WAV, OGG yoki M4A audio fayllarni yuklashingiz mumkin
                          </div>
                        </label>
                      </div>

                      {/* Yuklangan qo'shiqlar ro'yxati (User Uploaded Tracks Playlist) */}
                      {invitationState.musicTracks && invitationState.musicTracks.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-[#231E1B]">
                              Yuklagan qo‘shiqlaringiz ({invitationState.musicTracks.length} ta):
                            </span>
                            <button
                              type="button"
                              onClick={handleRemoveMusic}
                              className="text-[11px] text-rose-500 hover:text-rose-700 font-semibold"
                            >
                              Barchasini tozalash
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
                                          ✓ Faol ijro etilmoqda
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
                                      {isActive ? '✓ Tanlangan' : 'Tanlash'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveTrack(track.id)}
                                      className="p-1 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                      title="O‘chirish"
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

                      {/* Mashhur to'y kuylaridan tanlash */}
                      <div>
                        <label className="font-bold text-[#3A2D28] block mb-2 flex items-center justify-between">
                          <span>Kutubxonadagi sara romantik to‘y kuylari:</span>
                          <span className="text-[10px] text-[#D9658B] font-semibold">Tayyor & kafolatlangan audio</span>
                        </label>
                        <div className="space-y-1.5">
                          {PRESET_MUSIC_TRACKS.map((track, idx) => {
                            const isSelected = invitationState.musicUrl === track.url;
                            return (
                              <div
                                key={idx}
                                onClick={() => {
                                  setInvitationState((p) => ({
                                    ...p,
                                    musicEnabled: true,
                                    musicTitle: track.title,
                                    musicUrl: track.url,
                                    musicFileData: undefined,
                                  }));
                                  setPreviewAudioUrl(track.url);
                                  showToast(`«${track.title}» tanlandi! 🎵`, 'success');
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
                                    {track.title}
                                  </span>
                                </div>
                                <span className="text-[10px] font-bold shrink-0 px-2.5 py-1 rounded-full bg-black/5 text-[#5A4A52]">
                                  {isSelected ? '✓ Tanlangan' : 'Tanlash'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Hozirgi faol musiqa tekshiruv paneli */}
                      {invitationState.musicUrl && (
                        <div className="p-4 rounded-2xl bg-gradient-to-tr from-[#FFF5F8] to-[#F0F8FF] border border-[#D9658B]/30 shadow-xs space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-[#D9658B] text-white flex items-center justify-center shadow-xs shrink-0">
                                <Music className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-xs text-[#231E1B] block truncate">
                                  {invitationState.musicTitle || 'Tanlangan musiqa'}
                                </span>
                                <span className="text-[10px] text-emerald-600 font-semibold block">
                                  ✓ Hozirda ushbu qo‘shiq taklifnomaga biriktirilgan
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Joyida tinglab ko'rish */}
                          <div className="pt-1">
                            <audio controls src={previewAudioUrl || invitationState.musicUrl} key={previewAudioUrl || invitationState.musicUrl} className="w-full h-8 rounded-lg" />
                          </div>

                          {/* Kuy nomini tahrirlash */}
                          <div>
                            <label className="font-bold text-[#3A2D28] block mb-1 text-[11px]">
                              Mehmonlar ko‘radigan qo‘shiq nomi:
                            </label>
                            <input
                              type="text"
                              value={invitationState.musicTitle || ''}
                              onChange={(e) => setInvitationState((p) => ({ ...p, musicTitle: e.target.value }))}
                              placeholder="Masalan: Asrorbek & Madina to‘y valsi"
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
                <h3 className="font-playfair text-xl font-bold text-[#231E1B]">
                  9. RSVP va Mehmonlar sozlamalari
                </h3>
                <div className="space-y-3 text-xs">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={invitationState.rsvpEnabled}
                      onChange={(e) => setInvitationState((p) => ({ ...p, rsvpEnabled: e.target.checked }))}
                      className="w-4 h-4 rounded text-[#D9658B]"
                    />
                    <span className="font-bold text-sm text-[#231E1B]">Mehmonlar RSVP tizimini yoqish</span>
                  </label>

                  <div>
                    <label className="font-bold text-[#3A2D28] block mb-1">
                      Tasdiqlashning so‘nggi muddati (Deadline)
                    </label>
                    <input
                      type="date"
                      value={invitationState.rsvpDeadline}
                      onChange={(e) => setInvitationState((p) => ({ ...p, rsvpDeadline: e.target.value }))}
                      className="w-full p-2.5 rounded-xl glass-panel border border-black/10"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer pt-2">
                    <input
                      type="checkbox"
                      checked={invitationState.allowCompanion}
                      onChange={(e) => setInvitationState((p) => ({ ...p, allowCompanion: e.target.checked }))}
                      className="rounded text-[#D9658B]"
                    />
                    <span>Hamroh (oila a’zolari) bilan kelishga ruxsat berish</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={invitationState.askMealPreference}
                      onChange={(e) => setInvitationState((p) => ({ ...p, askMealPreference: e.target.checked }))}
                      className="rounded text-[#D9658B]"
                    />
                    <span>Taom afzalligini so‘rash (Milliy osh / Go‘sht / Baliq / Vegetarian)</span>
                  </label>

                  {/* Mezbonlar ijtimoiy tarmoqlari va aloqa (Instagram, Telegram, Telegram kanal, Telefon) */}
                  <div className="pt-4 border-t border-black/10 space-y-3">
                    <div>
                      <h4 className="font-bold text-sm text-[#231E1B] flex items-center gap-2">
                        <span>📲 Mezbonlar bilan aloqa & Ijtimoiy tarmoqlar</span>
                      </h4>
                      <p className="text-[11px] text-[#7A6A63] mt-0.5">
                        Taklifnoma oxirida mehmonlar siz bilan bog‘lanishi, to‘y kanaliga qo‘shilishi yoki tabrik yuborishi uchun havolalarni kiriting:
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      {/* Instagram */}
                      <div>
                        <label className="font-bold text-[#3A2D28] block mb-1 text-[11px] flex items-center gap-1.5">
                          <span className="text-[#E4405F]">📸</span>
                          <span>Instagram sahifa yoki havola:</span>
                        </label>
                        <input
                          type="text"
                          value={invitationState.socialLinks?.instagram || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setInvitationState((p) => ({
                              ...p,
                              socialLinks: { ...p.socialLinks, instagram: val },
                            }));
                          }}
                          placeholder="Masalan: https://instagram.com/asrorbek_madina yoki @asrorbek_madina"
                          className="w-full p-2.5 rounded-xl bg-white border border-black/10 text-xs outline-none focus:border-[#D9658B]"
                        />
                      </div>

                      {/* Telegram shaxsiy */}
                      <div>
                        <label className="font-bold text-[#3A2D28] block mb-1 text-[11px] flex items-center gap-1.5">
                          <span className="text-[#229ED9]">✈️</span>
                          <span>Telegram shaxsiy profil (tabriklar uchun):</span>
                        </label>
                        <input
                          type="text"
                          value={invitationState.socialLinks?.telegram || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setInvitationState((p) => ({
                              ...p,
                              socialLinks: { ...p.socialLinks, telegram: val },
                            }));
                          }}
                          placeholder="Masalan: https://t.me/asrorbek yoki @asrorbek"
                          className="w-full p-2.5 rounded-xl bg-white border border-black/10 text-xs outline-none focus:border-[#D9658B]"
                        />
                      </div>

                      {/* Telegram kanal */}
                      <div>
                        <label className="font-bold text-[#3A2D28] block mb-1 text-[11px] flex items-center gap-1.5">
                          <span className="text-[#0088cc]">📢</span>
                          <span>Telegram kanal (To‘y foto/video kanali):</span>
                        </label>
                        <input
                          type="text"
                          value={invitationState.socialLinks?.telegramChannel || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setInvitationState((p) => ({
                              ...p,
                              socialLinks: { ...p.socialLinks, telegramChannel: val },
                            }));
                          }}
                          placeholder="Masalan: https://t.me/asrorbek_madina_toylarimiz"
                          className="w-full p-2.5 rounded-xl bg-white border border-black/10 text-xs outline-none focus:border-[#D9658B]"
                        />
                      </div>

                      {/* Telefon raqam */}
                      <div>
                        <label className="font-bold text-[#3A2D28] block mb-1 text-[11px] flex items-center gap-1.5">
                          <span className="text-emerald-600">📞</span>
                          <span>Telefon raqam (qo‘ng‘iroq qilish uchun):</span>
                        </label>
                        <input
                          type="tel"
                          value={invitationState.socialLinks?.phone || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setInvitationState((p) => ({
                              ...p,
                              socialLinks: { ...p.socialLinks, phone: val },
                            }));
                          }}
                          placeholder="Masalan: +998 90 123 45 67"
                          className="w-full p-2.5 rounded-xl bg-white border border-black/10 text-xs outline-none focus:border-[#D9658B]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 10: Review */}
            {currentStep === 10 && (
              <div className="space-y-4">
                <h3 className="font-playfair text-xl font-bold text-[#231E1B]">
                  10. Taklifnomani yakuniy ko‘rib chiqish
                </h3>
                <div className="p-4 rounded-2xl bg-white/70 border border-black/5 text-xs space-y-2.5">
                  <div className="flex justify-between border-b pb-1.5">
                    <span className="text-[#8A7C74]">Tadbir:</span>
                    <strong className="text-[#231E1B]">{invitationState.eventTitle}</strong>
                  </div>
                  <div className="flex justify-between border-b pb-1.5">
                    <span className="text-[#8A7C74]">Ismlar:</span>
                    <strong className="text-[#231E1B]">{invitationState.hostNames}</strong>
                  </div>
                  <div className="flex justify-between border-b pb-1.5">
                    <span className="text-[#8A7C74]">Sana va vaqt:</span>
                    <strong className="text-[#231E1B]">
                      {invitationState.eventDate} ({invitationState.startTime})
                    </strong>
                  </div>
                  <div className="flex justify-between border-b pb-1.5">
                    <span className="text-[#8A7C74]">To‘yxona:</span>
                    <strong className="text-[#231E1B]">{invitationState.venueName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8A7C74]">Fotosuratlar:</span>
                    <strong className="text-[#231E1B]">{invitationState.galleryImages.length} ta rasm</strong>
                  </div>
                </div>
                <p className="text-xs text-emerald-700 font-medium">
                  ✓ Barcha asosiy maydonlar to‘ldirildi. Keyingi bosqichda tarifni tanlab, taklifnomani jonli rejimga chiqaring!
                </p>
              </div>
            )}

            {/* STEP 11: Plan & Manual Card Payment */}
            {currentStep === 11 && (() => {
              const currentTemplate = availableTemplates.find((t) => t.slug === invitationState.templateSlug) || initialTemplate;
              const isFreeAvailable = canUseFreePlan();
              const templatePrice = currentTemplate?.price || 180000;

              return (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <h3 className="font-playfair text-xl font-bold text-[#231E1B]">
                      11. To'lov va Faollashtirish
                    </h3>
                    <p className="text-xs text-[#7A6A63]">
                      {isFreeAvailable
                        ? 'Siz uchun 1 martalik bepul faollashtirish imkoniyati faol!'
                        : `Tanlangan «${currentTemplate.name}» shabloni uchun to‘lov miqdori:`}
                    </p>
                  </div>

                  {/* 1-MARTALIK BEPUL TARIF */}
                  {isFreeAvailable ? (
                    <div className="p-5 rounded-3xl border-2 border-emerald-500 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 shadow-md space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          🎁 1 MARTALIK BEPUL SOVG‘A
                        </span>
                        <span className="text-xl font-extrabold text-emerald-700">0 so‘m</span>
                      </div>
                      <h4 className="font-playfair text-lg font-bold text-[#231E1B]">
                        Birinchi taklifnomangiz mutlaqo bepul!
                      </h4>
                      <p className="text-xs text-[#5C4F48] leading-relaxed">
                        Siz ushbu hisobingizdan ilk taklifnomangizni hech qanday to‘lovsiz, to‘liq barcha imkoniyatlari bilan faollashtirishingiz mumkin.
                      </p>

                      <button
                        type="button"
                        disabled={isDemoSubmitting}
                        onClick={handleFinalCheckout}
                        className="w-full mt-2 py-4 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all shadow-md bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-200 hover:shadow-lg hover:scale-[1.01]"
                      >
                        {isDemoSubmitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Faollashtirilmoqda...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>🎁 Bepul Faollashtirish (0 so‘m)</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    /* PULLIK SHABLON UCHUN KARTA ORQALI TO'LOV VA CHEK YUKLASH */
                    <div className="space-y-5">
                      {/* Karta Ma'lumotlari Box */}
                      <div className="p-5 rounded-3xl border-2 border-[#D9658B]/40 bg-gradient-to-br from-white via-[#FFF8FA] to-[#FAF6F0] shadow-md space-y-4 relative overflow-hidden">
                        <div className="flex items-center justify-between border-b border-black/5 pb-3">
                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#FFF5F8] text-[#D9658B] border border-[#D9658B]/30">
                            «{currentTemplate.name}» Shablon
                          </span>
                          <span className="text-2xl font-extrabold text-[#231E1B]">
                            {formatPriceUZS(templatePrice)}
                          </span>
                        </div>

                        {/* Karta Raqami va Nusxa Olish */}
                        <div className="p-4 rounded-2xl bg-white border border-black/10 shadow-xs space-y-2">
                          <div className="text-[11px] font-semibold text-[#8A7C74] uppercase tracking-wider flex items-center justify-between">
                            <span>To'lov Kartasi</span>
                            <span className="text-emerald-700 font-bold">Uzcard / Humo</span>
                          </div>
                          
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <span className="font-mono text-lg sm:text-xl font-extrabold text-[#231E1B] tracking-wider">
                              {PAYMENT_CONFIG.cardNumberFormatted}
                            </span>
                            <button
                              type="button"
                              onClick={handleCopyCardNumber}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                                copiedCard
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-[#231E1B] text-white hover:bg-black active:scale-95'
                              }`}
                            >
                              {copiedCard ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Nusxalandi ✅</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Nusxa olish</span>
                                </>
                              )}
                            </button>
                          </div>

                          <div className="text-xs font-bold text-[#3A2D28] pt-1">
                            Qabul qiluvchi: <span className="text-[#D9658B] uppercase">{PAYMENT_CONFIG.cardHolder}</span>
                          </div>
                        </div>

                        {/* Ko'rsatmalari */}
                        <div className="text-xs text-[#5C4F48] space-y-2 leading-relaxed bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200/80">
                          <p className="font-medium text-[#3A2D28]">
                            📌 <strong>Ko'rsatma:</strong> {PAYMENT_CONFIG.instructionText}
                          </p>
                          <p className="text-[11px] text-amber-900/90 font-semibold">
                            ⚠️ {PAYMENT_CONFIG.warningText}
                          </p>
                        </div>
                      </div>

                      {/* BUYURTMA HOLATLARI BO'YICHA KO'RINISH */}
                      {orderStatus === 'pending_review' ? (
                        /* PENDING REVIEW VIEW */
                        <div className="p-6 rounded-3xl bg-amber-50/90 border-2 border-amber-300 shadow-md text-center space-y-4 animate-fadeIn">
                          <div className="w-14 h-14 rounded-full bg-amber-200/80 mx-auto flex items-center justify-center text-amber-800 shadow-xs relative">
                            <RefreshCw className="w-7 h-7 animate-spin" />
                          </div>
                          
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-800 bg-amber-200/60 px-2.5 py-0.5 rounded-full">
                              Buyurtma #{activeOrderId}
                            </span>
                            <h4 className="font-playfair text-lg sm:text-xl font-bold text-[#231E1B]">
                              To'lov chekingiz adminga yuborildi
                            </h4>
                          </div>

                          <p className="text-xs sm:text-sm font-semibold text-[#5C4F48] leading-relaxed max-w-md mx-auto">
                            2 soat ichida javob qaytariladi
                          </p>

                          <div className="inline-flex items-center gap-2 text-[11px] text-amber-800 font-semibold bg-white/80 px-3 py-1.5 rounded-xl border border-amber-200 shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
                            <span>Har 5 soniyada holat tekshirilmoqda...</span>
                          </div>
                        </div>
                      ) : (
                        /* FILE UPLOAD FORM VIEW (for draft, pending_payment or rejected) */
                        <div className="p-5 rounded-3xl bg-white border border-black/10 shadow-sm space-y-4">
                          {orderStatus === 'rejected' && (
                            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                              <div>
                                <strong>To'lov tasdiqlanmadi:</strong> Admin tomonidan chek rad etildi. Iltimos to'lov chekini qayta tekshirib, to'g'ri faylni yuklang.
                              </div>
                            </div>
                          )}

                          <div className="space-y-2">
                            <label className="text-xs font-bold text-[#231E1B] block">
                              To'lov Chekini Yuklash (Rasm ≤1.5 MB, PDF ≤4 MB) *
                            </label>

                            <div className="relative border-2 border-dashed border-[#D9658B]/40 hover:border-[#D9658B] rounded-2xl p-4 text-center bg-[#FFF8FA] transition-colors cursor-pointer group">
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,application/pdf"
                                onChange={handleReceiptFileChange}
                                disabled={isPreparingFile || isUploadingReceipt}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                              />
                              <div className="space-y-2 flex flex-col items-center justify-center">
                                <div className="w-10 h-10 rounded-full bg-[#FFF5F8] text-[#D9658B] flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <Upload className="w-5 h-5" />
                                </div>
                                {isPreparingFile ? (
                                  <div>
                                    <span className="text-xs font-bold text-[#231E1B] block">
                                      Rasm siqilmoqda...
                                    </span>
                                    <span className="text-[10px] text-[#7A6A63]">
                                      1.5 MB gacha optimallashtiriladi
                                    </span>
                                  </div>
                                ) : selectedFile ? (
                                  <div>
                                    <span className="text-xs font-bold text-[#231E1B] block truncate max-w-xs">
                                      📄 {preparedFileName || selectedFile.name}
                                    </span>
                                    <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                                      Fayl tayyor — yuborish mumkin
                                    </span>
                                  </div>
                                ) : (
                                  <div>
                                    <span className="text-xs font-bold text-[#231E1B] block">
                                      Faylni tanlash uchun shu yerga bosing
                                    </span>
                                    <span className="text-[10px] text-[#7A6A63]">
                                      JPG/PNG avtomatik siqiladi; PDF max 4 MB
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {uploadError && (
                            <div className="text-xs text-rose-600 font-semibold flex items-center gap-1.5 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              <span>{uploadError}</span>
                            </div>
                          )}

                          <button
                            type="button"
                            disabled={
                              isUploadingReceipt ||
                              isPreparingFile ||
                              !selectedFile ||
                              (preparedFileType !== 'application/pdf' && !fileBase64)
                            }
                            onClick={handleSubmitReceiptUpload}
                            className={`w-full py-4 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all shadow-md ${
                              isUploadingReceipt ||
                              isPreparingFile ||
                              !selectedFile ||
                              (preparedFileType !== 'application/pdf' && !fileBase64)
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-[#E27B9B] via-[#D9658B] to-[#B9DFFA] text-white hover:shadow-lg hover:scale-[1.01] active:scale-95'
                            }`}
                          >
                            {isUploadingReceipt ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Chek adminga yuborilmoqda...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4" />
                                <span>🚀 Chekni Yuborish (Adminga yuboriladi)</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Navigation buttons: Prev / Next */}
            <div className="pt-6 border-t border-black/5 flex items-center justify-between">
              {currentStep > 1 ? (
                <button
                  onClick={() => setCurrentStep((p) => p - 1)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5C4F48] glass-panel hover:bg-white"
                >
                  {t.builder.prevStep}
                </button>
              ) : (
                <div />
              )}

              {currentStep < 11 && (
                <button
                  onClick={() => {
                    setCurrentStep((p) => p + 1);
                    // Qadam o'zgarganda qoralamani zudlik bilan avto-sinxronizatsiya qilish
                    try {
                      localStorage.setItem('taklifim_builder_draft', JSON.stringify(invitationState));
                    } catch {}
                    api.saveInvitation({
                      ...invitationState,
                      ownerId: user?.id || 'anonymous',
                    }).catch(() => {});
                  }}
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#231E1B] hover:bg-black transition-colors"
                >
                  <span>{t.builder.nextStep}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

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
                {/* Device View Toggle: Telefon | Kompyuter */}
                <div className="mb-4 inline-flex items-center gap-1.5 p-1 rounded-2xl glass-panel-elevated border border-black/5 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      previewDevice === 'mobile'
                        ? 'bg-[#231E1B] text-white shadow-xs'
                        : 'text-[#6E5D53] hover:text-[#231E1B]'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Telefon</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      previewDevice === 'desktop'
                        ? 'bg-[#231E1B] text-white shadow-xs'
                        : 'text-[#6E5D53] hover:text-[#231E1B]'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Kompyuter</span>
                  </button>
                </div>

                {previewDevice === 'mobile' ? (
                  <div className="w-[320px] sm:w-[350px] rounded-[44px] p-4 bg-[#231E1B] shadow-2xl ring-1 ring-white/20 relative transition-all">
                    {/* Speaker Notch */}
                    <div className="absolute top-5 left-1/2 -translate-x-1/2 w-24 h-4 bg-[#151210] rounded-full z-30" />

                    <div className="w-full h-[620px] rounded-[36px] overflow-y-auto overflow-x-hidden pt-6 border border-black/10 select-none shadow-inner relative bg-white">
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
                        taklifim.uz/invitation/{invitationState.templateSlug}
                      </div>
                      <div className="w-8" />
                    </div>

                    <div className="w-full h-[600px] overflow-y-auto overflow-x-hidden select-none shadow-inner relative bg-white">
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
    </div>
  );
};
