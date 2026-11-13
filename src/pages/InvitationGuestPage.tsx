import React, { useState, useEffect } from 'react';
import { useRouter, Link } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { mockInvitations } from '../data/mockInvitations';
import { mockGuests } from '../data/mockGuests';
import { mockTemplates } from '../data/mockTemplates';
import { api } from '../services/api';
import { calculateCountdown, validateRSVPForm } from '../utils/logic';
import { ShareModal } from '../components/ShareModal';
import { MusicPlayer } from '../components/MusicPlayer';
import { InteractiveMap } from '../components/InteractiveMap';
import { CustomDropdown } from '../components/CustomDropdown';
import { PhoneInput } from '../components/PhoneInput';
import { TemplateThemeDecoration } from '../components/TemplateThemeDecoration';
import { TemplateRenderer } from '../templates/TemplateRenderer';
import { Language, GuestRSVP, InvitationData } from '../types';
import { translations, translateCategory } from '../locales';
import confetti from 'canvas-confetti';
import {
  Gem,
  Loader2,
  Calendar,
  Clock,
  MapPin,
  Heart,
  Share2,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  Send,
  Users,
  Utensils,
  Music,
  ExternalLink,
  MailOpen,
  Globe,
  Instagram,
  Phone,
} from 'lucide-react';
import { TaklifimLogo } from '../components/TaklifimLogo';
import { GlassSurface, GlassButton, GlassSegmented } from '../components/glass';

// Haqiqiy va to'liq ko'p tilli tarjimalar (UZ / RU / EN)
const guestTranslations: Record<Language, {
  envelopeSubtitle: string;
  weddingCeremony: string;
  defaultQuote: string;
  openEnvelope: string;
  clickToOpen: string;
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  countdownPassed: string;
  gallery: string;
  galleryTitle: string;
  schedule: string;
  scheduleSubtitle: string;
  venueTitle: string;
  openGoogleMaps: string;
  saveToCalendar: string;
  rsvpTitle: string;
  rsvpSubtitle: string;
  fullName: string;
  fullNamePlaceholder: string;
  phone: string;
  attendingQuestion: string;
  attendingYes: string;
  attendingNo: string;
  guestCount: string;
  mealPref: string;
  mealDefault: string;
  wishes: string;
  wishesPlaceholder: string;
  submitRSVP: string;
  rsvpSuccess: string;
  wishesWall: string;
  seeYou: string;
  withRespect: string;
  socialConnect: string;
  callPhone: string;
  createdOn: string;
  dearGuest: string;
  timeRemaining: string;
  timePrefix: string;
  from: string;
  to: string;
  defaultEvent: string;
  defaultMessage: string;
}> = {
  uz: {
    envelopeSubtitle: 'Baxtli lahzalar chorlovi',
    weddingCeremony: 'To‘y & Nikoh Marosimi',
    defaultQuote: '«Sizni muqaddas rishta — nikoh to‘yimiz munosabati bilan yoziladigan dasturxonimizga lutfan taklif etamiz.»',
    openEnvelope: 'Taklifnomani ochish',
    clickToOpen: 'Muborak to‘y taklifnomasini ochish uchun bosing',
    days: 'Kun',
    hours: 'Soat',
    minutes: 'Daqiqa',
    seconds: 'Soniya',
    countdownPassed: 'Tantana boshlandi!',
    gallery: 'Fotogalereya',
    galleryTitle: 'Bizning suratlarimiz',
    schedule: 'To‘y dasturi',
    scheduleSubtitle: 'Tantanali oqshom rejasi',
    venueTitle: 'Manzil va Xarita',
    openGoogleMaps: 'Google Maps‘da to‘liq ochish',
    saveToCalendar: 'Google Taqvimga saqlash',
    rsvpTitle: 'Tashrifingizni tasdiqlang (RSVP)',
    rsvpSubtitle: 'Biz uchun tashrifingiz katta quvonch. Iltimos, javobingizni bildiring.',
    fullName: 'Ism va familiyangiz',
    fullNamePlaceholder: 'To‘liq ismingizni kiriting',
    phone: 'Telefon raqamingiz',
    attendingQuestion: 'Tashrif buyura olasizmi?',
    attendingYes: 'Ha, albatta boraman',
    attendingNo: 'Uzr, bora olmayman',
    guestCount: 'Necha kishi tashrif buyurasiz?',
    mealPref: 'Taom afzalligingiz (ixtiyoriy)',
    mealDefault: 'Milliy taomlar / To‘y oshi',
    wishes: 'Kelin-kuyovga samimiy tilaklaringiz',
    wishesPlaceholder: 'Ezgu tilaklaringizni yozib qoldiring...',
    submitRSVP: 'Javobni yuborish',
    rsvpSuccess: 'Rahmat! Javobingiz muvaffaqiyatli qabul qilindi.',
    wishesWall: 'Mehmonlar tilaklari devori',
    seeYou: 'Sizni kutib qolamiz!',
    withRespect: 'Hurmat bilan, mezbonlar oilasi',
    socialConnect: 'Biz bilan bog‘lanish va to‘y yangiliklari',
    callPhone: 'Qo‘ng‘iroq qilish',
    createdOn: 'Taklifim platformasida yaratildi',
    dearGuest: 'Hurmatli Mehmonimiz!',
    timeRemaining: 'Tantanagacha qolgan vaqt',
    timePrefix: 'Soat',
    from: 'dan',
    to: 'gacha',
    defaultEvent: 'To‘y va Nikoh Oqshomi',
    defaultMessage: 'Sizni hayotimizdagi eng quvonchli va hayajonli kunimiz — Nikoh to‘yimiz munosabati bilan yoziladigan dasturxonimizga lutfan taklif etamiz. Sizning duolaringiz va samimiy tabassumlaringiz ushbu oqshomimizga o‘zgacha fayz bag‘ishlaydi.',
  },
  ru: {
    envelopeSubtitle: 'Приглашение на счастливое торжество',
    weddingCeremony: 'Свадебное Торжество',
    defaultQuote: '«Приглашаем вас разделить с нами радость создания новой семьи на нашем праздничном торжестве.»',
    openEnvelope: 'Открыть приглашение',
    clickToOpen: 'Нажмите, чтобы открыть свадебное приглашение',
    days: 'Дней',
    hours: 'Часов',
    minutes: 'Минут',
    seconds: 'Секунд',
    countdownPassed: 'Торжество началось!',
    gallery: 'Фотогалерея',
    galleryTitle: 'Наши фотографии',
    schedule: 'Программа вечера',
    scheduleSubtitle: 'Расписание торжества',
    venueTitle: 'Место проведения и Карта',
    openGoogleMaps: 'Открыть в Google Maps',
    saveToCalendar: 'Сохранить в Google Календарь',
    rsvpTitle: 'Подтвердите присутствие (RSVP)',
    rsvpSubtitle: 'Ваше присутствие для нас огромная радость. Пожалуйста, подтвердите ответ.',
    fullName: 'Ваше имя и фамилия',
    fullNamePlaceholder: 'Введите ваше полное имя',
    phone: 'Номер телефона',
    attendingQuestion: 'Сможете ли вы прийти?',
    attendingYes: 'Да, обязательно приду',
    attendingNo: 'К сожалению, не смогу',
    guestCount: 'Сколько человек будет с вами?',
    mealPref: 'Предпочтения по меню (необязательно)',
    mealDefault: 'Традиционные блюда / Плов',
    wishes: 'Ваши теплые пожелания',
    wishesPlaceholder: 'Напишите искренние пожелания молодоженам...',
    submitRSVP: 'Отправить ответ',
    rsvpSuccess: 'Спасибо! Ваш ответ успешно принят.',
    wishesWall: 'Стена пожеланий гостей',
    seeYou: 'С нетерпением ждем вас!',
    withRespect: 'С уважением, семья хозяев',
    socialConnect: 'Связаться с нами и новости свадьбы',
    callPhone: 'Позвонить',
    createdOn: 'Создано на платформе Taklifim',
    dearGuest: 'Дорогой наш Гость!',
    timeRemaining: 'До торжества осталось',
    timePrefix: 'Время:',
    from: 'с',
    to: 'до',
    defaultEvent: 'Свадебное Торжество',
    defaultMessage: 'Уважаемые родные и близкие! Мы искренне приглашаем вас разделить этот счастливый день нашего бракосочетания. Ваше присутствие и теплые пожелания станут для нас величайшей радостью.',
  },
  en: {
    envelopeSubtitle: 'An Invitation to Cherished Moments',
    weddingCeremony: 'Wedding & Marriage Ceremony',
    defaultQuote: '«We cordially invite you to celebrate the joyous union of our hearts and lives at our wedding feast.»',
    openEnvelope: 'Open Invitation',
    clickToOpen: 'Click to open the wedding invitation',
    days: 'Days',
    hours: 'Hours',
    minutes: 'Mins',
    seconds: 'Secs',
    countdownPassed: 'The celebration has begun!',
    gallery: 'Photo Gallery',
    galleryTitle: 'Our Precious Moments',
    schedule: 'Event Schedule',
    scheduleSubtitle: 'Timeline of the evening',
    venueTitle: 'Venue & Location Map',
    openGoogleMaps: 'Open in Google Maps',
    saveToCalendar: 'Add to Google Calendar',
    rsvpTitle: 'Confirm Your Attendance (RSVP)',
    rsvpSubtitle: 'Your presence would bring us immense joy. Please let us know your response.',
    fullName: 'Full Name',
    fullNamePlaceholder: 'Enter your full name',
    phone: 'Phone Number',
    attendingQuestion: 'Will you be attending?',
    attendingYes: 'Yes, I will attend',
    attendingNo: 'Regretfully, I cannot attend',
    guestCount: 'Number of guests attending?',
    mealPref: 'Meal Preference (Optional)',
    mealDefault: 'Traditional wedding banquet',
    wishes: 'Your warm wishes for the couple',
    wishesPlaceholder: 'Leave a heartfelt message...',
    submitRSVP: 'Send RSVP Response',
    rsvpSuccess: 'Thank you! Your response has been received.',
    wishesWall: 'Guest Wishes Wall',
    seeYou: 'We look forward to seeing you!',
    withRespect: 'Warmly, the host family',
    socialConnect: 'Connect with Us & Wedding Updates',
    callPhone: 'Call',
    createdOn: 'Powered by Taklifim Platform',
    dearGuest: 'Dear Beloved Guest!',
    timeRemaining: 'Countdown to Celebration',
    timePrefix: 'Time:',
    from: 'from',
    to: 'to',
    defaultEvent: 'Wedding Celebration',
    defaultMessage: 'Dear family and friends! We joyfully invite you to celebrate our special wedding day with us. Your blessings and warm presence will make our celebration truly unforgettable.',
  },
};

// Dinamik kelin-kuyov monogrammasi (Masalan, Asrorbek va Madina => "A & M")
const getMonogram = (inv: InvitationData | null): string => {
  if (!inv) return 'T';
  if (inv.partner1Name && inv.partner2Name) {
    const p1 = inv.partner1Name.trim().charAt(0).toUpperCase();
    const p2 = inv.partner2Name.trim().charAt(0).toUpperCase();
    return `${p1} & ${p2}`;
  }
  const raw = inv.hostNames || '';
  const parts = raw.split(/&|va|and|\+/i).map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const p1 = parts[0].charAt(0).toUpperCase();
    const p2 = parts[1].charAt(0).toUpperCase();
    return `${p1} & ${p2}`;
  }
  if (parts.length === 1 && parts[0].length > 0) {
    return parts[0].charAt(0).toUpperCase();
  }
  return 'A & M';
};

export const InvitationGuestPage: React.FC = () => {
  const { params, navigate } = useRouter();
  const { showToast } = useAuth();
  const slug = params.slug || 'nodir-malika-wedding';

  // Load invitation data from API / mock
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Independent invitation language setting
  const [invLang, setInvLang] = useState<Language>('uz');
  const gt = guestTranslations[invLang] || guestTranslations.uz;

  // Envelope cover opening state
  const [isCoverOpened, setIsCoverOpened] = useState<boolean>(false);
  const [isOpeningAnimation, setIsOpeningAnimation] = useState<boolean>(false);

  const handleOpenInvitation = () => {
    setIsOpeningAnimation(true);

    try {
      // 1-bosqich: Markaziy ulug'vor oltin va pushti portlash
      confetti({
        particleCount: 220,
        spread: 120,
        origin: { y: 0.5, x: 0.5 },
        colors: [primaryColor, secondaryColor, accentColor, '#FFD700', '#F5C9D8', '#B9DFFA', '#FFFFFF', '#D9658B'],
        ticks: 350,
        gravity: 0.75,
        scalar: 1.3,
      });

      // 2-bosqich: Chap tomondan romantik to'y salyuti
      setTimeout(() => {
        confetti({
          particleCount: 130,
          angle: 55,
          spread: 70,
          origin: { x: 0, y: 0.7 },
          colors: [primaryColor, '#FFD700', '#F5C9D8', '#FFFFFF', '#D9658B'],
          ticks: 300,
          gravity: 0.85,
          scalar: 1.2,
        });
      }, 180);

      // 3-bosqich: O'ng tomondan moviy va zarhal feyerverk
      setTimeout(() => {
        confetti({
          particleCount: 130,
          angle: 125,
          spread: 70,
          origin: { x: 1, y: 0.7 },
          colors: [secondaryColor, '#FFD700', '#B9DFFA', '#FFFFFF', '#4A9BD4'],
          ticks: 300,
          gravity: 0.85,
          scalar: 1.2,
        });
      }, 350);

      // 4-bosqich: Yuqoridan sekin tushuvchi zarhal yomg'ir
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 160,
          origin: { y: 0, x: 0.5 },
          colors: ['#FFD700', '#F5C9D8', '#FFFFFF', '#E27B9B'],
          ticks: 450,
          gravity: 0.6,
          scalar: 1.1,
        });
      }, 550);

      // 5-bosqich: Yakuniy tantanali to'lqin
      setTimeout(() => {
        confetti({
          particleCount: 160,
          spread: 100,
          origin: { y: 0.6, x: 0.5 },
          colors: [primaryColor, secondaryColor, '#FFD700', '#FFFFFF', accentColor],
          ticks: 300,
          gravity: 0.7,
          scalar: 1.2,
        });
      }, 750);
    } catch {
      // ignore
    }

    setTimeout(() => {
      setIsCoverOpened(true);
      setIsOpeningAnimation(false);
    }, 900);
  };

  // Countdown state
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPassed: false,
  });

  // Photo gallery lightbox
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);

  // Share modal
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  // RSVP Form state
  const [rsvpFullName, setRsvpFullName] = useState<string>('');
  const [rsvpPhone, setRsvpPhone] = useState<string>('');
  const [isRsvpPhoneValid, setIsRsvpPhoneValid] = useState<boolean>(false);
  const [rsvpAttending, setRsvpAttending] = useState<boolean>(true);
  const [rsvpGuestCount, setRsvpGuestCount] = useState<number>(1);
  const [rsvpMeal, setRsvpMeal] = useState<string>('Milliy taomlar / To‘y oshi');
  const [rsvpMessage, setRsvpMessage] = useState<string>('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isRsvpSubmitted, setIsRsvpSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Guest wishes wall
  const [guestList, setGuestList] = useState<GuestRSVP[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      let data = await api.getInvitationBySlug(slug);

      // Agar slug bo'yicha topilmasa, mockInvitations orasida qidirish
      if (!data) {
        const mockMatch = mockInvitations.find((m) => m.slug === slug || m.id === slug);
        if (mockMatch) {
          data = mockMatch;
        }
      }

      if (data) {
        setInvitation(data);
        setInvLang(data.language || 'uz');
      } else {
        // Agar umuman topilmasa, qoralamalardan yoki birinchi mavjud taklifnomadan tekshirish
        const allLocal = await api.getInvitations();
        const fallback = allLocal.find((i) => i.slug === slug) || allLocal[0] || mockInvitations[0];
        setInvitation(fallback);
        if (fallback) setInvLang(fallback.language || 'uz');
      }
      const guests = await api.getGuests(slug);
      setGuestList(guests);
      setLoading(false);

      // Increment view count in real time
      api.incrementViews(slug);
    }
    load();

    // Live subscription for real-time guest RSVP and wishes
    const unsubscribeGuests = api.subscribe<GuestRSVP[]>('guests', (allGuests) => {
      setGuestList(allGuests.filter((g) => g.invitationSlug === slug));
    });

    return () => {
      unsubscribeGuests();
    };
  }, [slug]);

  const handleAddToCalendar = () => {
    if (!invitation) return;
    const cleanDate = invitation.eventDate.replace(/-/g, '');
    const [sH, sM] = (invitation.startTime || '18:00').split(':');
    const [eH, eM] = (invitation.endTime || '23:00').split(':');
    const startIso = `${cleanDate}T${sH || '18'}${sM || '00'}00`;
    const endIso = `${cleanDate}T${eH || '23'}${eM || '00'}00`;
    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      invitation.eventTitle
    )}&dates=${startIso}/${endIso}&details=${encodeURIComponent(
      invitation.invitationMessage
    )}&location=${encodeURIComponent(invitation.venueName + ', ' + invitation.venueAddress)}`;
    window.open(gcalUrl, '_blank');
    const gateT = (translations[invLang] || translations.uz).guestGate;
    showToast(gateT.calendarOpenedToast, 'success');
  };

  // Real-time Countdown timer
  useEffect(() => {
    if (!invitation?.eventDate) return;

    const timer = setInterval(() => {
      const result = calculateCountdown(invitation.eventDate, invitation.startTime);
      setCountdown(result);
    }, 1000);

    // Initial run
    setCountdown(calculateCountdown(invitation.eventDate, invitation.startTime));

    return () => clearInterval(timer);
  }, [invitation?.eventDate, invitation?.startTime]);

  // Keyboard navigation for photo lightbox
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (activePhotoIndex === null || !invitation) return;
      if (e.key === 'Escape') setActivePhotoIndex(null);
      if (e.key === 'ArrowRight') {
        setActivePhotoIndex((prev) =>
          prev !== null ? (prev + 1) % invitation.galleryImages.length : 0
        );
      }
      if (e.key === 'ArrowLeft') {
        setActivePhotoIndex((prev) =>
          prev !== null
            ? (prev - 1 + invitation.galleryImages.length) %
              invitation.galleryImages.length
            : 0
        );
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activePhotoIndex, invitation]);

  const handleRSVPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateRSVPForm(
      {
        fullName: rsvpFullName,
        attending: rsvpAttending,
        guestCount: rsvpGuestCount,
        phone: rsvpPhone,
        isPhoneValid: isRsvpPhoneValid,
      },
      invLang
    );

    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);

    try {
      const newGuest = await api.submitRSVP({
        invitationId: invitation?.id || 'inv-1',
        invitationSlug: slug,
        invitationOwnerId: invitation?.ownerId, // Invitation egasini saqlash
        fullName: rsvpFullName.trim(),
        phone: rsvpPhone.trim(),
        attending: rsvpAttending,
        guestCount: rsvpAttending ? rsvpGuestCount : 0,
        mealPreference: rsvpMeal,
        message: rsvpMessage.trim(),
      });

      setGuestList((prev) => [newGuest, ...prev]);
      setIsRsvpSubmitted(true);

      // Celebration effect
      try {
        confetti({
          particleCount: 100,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#F5C9D8', '#B9DFFA', '#B48B47'],
        });
      } catch {
        // ignore
      }

      const gateT = (translations[invLang] || translations.uz).guestGate;
      showToast(gateT.rsvpSuccessToast, 'success');
    } catch {
      const gateT = (translations[invLang] || translations.uz).guestGate;
      showToast(gateT.genericErrorToast, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestRSVP = async (data: Partial<GuestRSVP>): Promise<boolean> => {
    const gateT = (translations[invLang] || translations.uz).guestGate;
    try {
      const newGuest = await api.submitRSVP({
        invitationId: invitation?.id || 'inv-1',
        invitationSlug: slug,
        invitationOwnerId: invitation?.ownerId,
        fullName: (data.fullName || '').trim(),
        phone: (data.phone || '').trim(),
        attending: data.attending ?? true,
        guestCount: data.attending ? (data.guestCount ?? 1) : 0,
        mealPreference: data.mealPreference,
        message: (data.message || '').trim(),
      });
      setGuestList((prev) => [newGuest, ...prev]);
      setIsRsvpSubmitted(true);
      try {
        confetti({
          particleCount: 100,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#F5C9D8', '#B9DFFA', '#B48B47'],
        });
      } catch {
        // ignore
      }
      showToast(gateT.rsvpSuccessToast, 'success');
      return true;
    } catch {
      showToast(gateT.genericErrorToast, 'error');
      return false;
    }
  };

  const handleGuestWish = async (wish: { name: string; message: string }): Promise<boolean> => {
    const gateT = (translations[invLang] || translations.uz).guestGate;
    try {
      const newGuest = await api.submitRSVP({
        invitationId: invitation?.id || 'inv-1',
        invitationSlug: slug,
        invitationOwnerId: invitation?.ownerId,
        fullName: wish.name.trim(),
        phone: '',
        attending: true,
        guestCount: 0,
        message: wish.message.trim(),
      });
      setGuestList((prev) => [newGuest, ...prev]);
      try {
        confetti({
          particleCount: 80,
          spread: 50,
          origin: { y: 0.8 },
          colors: ['#F5C9D8', '#B9DFFA', '#B48B47'],
        });
      } catch {
        // ignore
      }
      showToast(gateT.wishSuccessToast, 'success');
      return true;
    } catch {
      showToast(gateT.genericErrorToast, 'error');
      return false;
    }
  };

  const activeLocaleT = translations[invLang] || translations.uz;

  if (loading || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 taklifim-glass-backdrop">
        <GlassSurface variant="elevated" rounded="3xl" className="p-8 text-center space-y-3 max-w-xs w-full">
          <Loader2 className="w-8 h-8 text-[#C64873] animate-spin motion-reduce:animate-none mx-auto" />
          <p className="font-playfair text-sm font-semibold text-[#1E1418]">
            {activeLocaleT.guestGate.loading}
          </p>
        </GlassSurface>
      </div>
    );
  }

  // Security Gate: Ensure invitation is paid or published
  const isPaidOrPublished = invitation.status === 'paid' || invitation.status === 'published';
  if (!isPaidOrPublished) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 taklifim-glass-backdrop">
        <GlassSurface
          variant="elevated"
          rounded="3xl"
          className="max-w-md w-full p-8 text-center space-y-4 animate-fadeIn motion-reduce:animate-none"
        >
          <div className="w-16 h-16 rounded-full glass-surface-tinted-pink mx-auto flex items-center justify-center text-[#9E3E60]">
            <Clock className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/80 border border-amber-200/80 px-3 py-1 rounded-full">
              {activeLocaleT.guestGate.pendingBadge}
            </span>
            <h2 className="font-playfair text-xl font-bold text-[#1E1418]">
              {activeLocaleT.guestGate.pendingTitle}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#4A383F] leading-relaxed">
            {activeLocaleT.guestGate.pendingDesc}
          </p>
          <GlassSurface
            variant="subtle"
            rounded="2xl"
            className="p-3.5 text-xs text-[#4A383F] text-left space-y-1"
          >
            <div>
              <strong className="text-[#1E1418]">{activeLocaleT.guestGate.eventLabel}:</strong>{' '}
              {invitation.eventTitle}
            </div>
            <div>
              <strong className="text-[#1E1418]">{activeLocaleT.guestGate.dateLabel}:</strong>{' '}
              <span className="tabular-nums">{invitation.eventDate}</span>
            </div>
          </GlassSurface>
          <GlassButton
            href="/"
            tone="tinted"
            size="md"
            className="w-full"
            onAnchorClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
          >
            {activeLocaleT.guestGate.backHomeBtn}
          </GlassButton>
        </GlassSurface>
      </div>
    );
  }

  // Resolve chosen template configuration
  const templateDef =
    mockTemplates.find(
      (t) => t.slug === invitation.templateSlug || t.id === invitation.templateId
    ) || mockTemplates[0];

  const isDarkTheme =
    templateDef.slug === 'template-19' ||
    templateDef.slug === 'template-10' ||
    templateDef.slug === 'template-18' ||
    templateDef.slug === 'template-3' ||
    templateDef.slug === 'template-5' ||
    (templateDef.colorStyle.background &&
      (templateDef.colorStyle.background.startsWith('#0') ||
        templateDef.colorStyle.background.startsWith('#1') ||
        templateDef.colorStyle.background.startsWith('#2')));

  const primaryColor =
    invitation.customColors?.primary && invitation.customColors?.primary !== '#B48B47'
      ? invitation.customColors.primary
      : templateDef.colorStyle.primary;

  const secondaryColor =
    invitation.customColors?.secondary && invitation.customColors?.secondary !== '#D9658B'
      ? invitation.customColors.secondary
      : templateDef.colorStyle.secondary;

  const accentColor =
    invitation.customColors?.accent && invitation.customColors?.accent !== '#C9A96E'
      ? invitation.customColors.accent
      : templateDef.colorStyle.accent;

  const bgColor =
    invitation.customColors?.background &&
    invitation.customColors?.background !== '#FAF6F0' &&
    invitation.customColors?.background !== '#FAFAFA'
      ? invitation.customColors.background
      : templateDef.colorStyle.background;

  const textColor =
    invitation.customColors?.text &&
    invitation.customColors?.text !== '#2A2420' &&
    invitation.customColors?.text !== '#171717'
      ? invitation.customColors.text
      : templateDef.colorStyle.text;

  const headingFont =
    invitation.customFonts?.heading || templateDef.typography.headingFont || 'Playfair Display';

  // Tilga moslashtirilgan to'liq dinamik matnlar
  const getLocalizedContent = (inv: InvitationData, lang: Language) => {
    if (lang === 'ru') {
      return {
        eventType: 'СВАДЕБНОЕ ТОРЖЕСТВО',
        weddingCeremony: 'СВАДЕБНОЕ ТОРЖЕСТВО',
        invitationQuote: '«Приглашаем вас разделить с нами радость создания новой семьи на нашем праздничном торжестве.»',
        invitationMessage: 'Уважаемые родные и близкие! Мы искренне приглашаем вас разделить этот счастливый день нашего бракосочетания. Ваше присутствие станет для нас величайшей радостью.',
        translateSchedule: (title: string, desc?: string) => {
          if (/kutib|vstrech|welcome/i.test(title)) return { title: 'Встреча дорогих гостей', desc: 'Живая музыка и приветственный фуршет' };
          if (/kirib|kirish|vxod|entrance/i.test(title)) return { title: 'Торжественный выход молодоженов', desc: 'Первый свадебный танец пары' };
          if (/tabrik|duo|pozdrav|blessing/i.test(title)) return { title: 'Поздравления родителей и гостей', desc: 'Искренние пожелания и тосты' };
          if (/tort|cake/i.test(title)) return { title: 'Разрезание свадебного торта', desc: 'Праздничный торт и десерт' };
          if (/salom|konsert|final/i.test(title)) return { title: 'Келин салом и шоу-программа', desc: 'Праздничный концерт и финал' };
          return { title, desc };
        },
      };
    }
    if (lang === 'en') {
      return {
        eventType: 'WEDDING CELEBRATION',
        weddingCeremony: 'WEDDING & MARRIAGE CEREMONY',
        invitationQuote: '«We cordially invite you to celebrate the joyous union of our hearts and lives at our wedding feast.»',
        invitationMessage: 'Dear family and friends! We joyfully invite you to celebrate our special wedding day with us. Your blessings and warm presence will make our celebration truly unforgettable.',
        translateSchedule: (title: string, desc?: string) => {
          if (/kutib|vstrech|welcome/i.test(title)) return { title: 'Guest Welcome & Reception', desc: 'Live acoustic music & welcome drinks' };
          if (/kirib|kirish|vxod|entrance/i.test(title)) return { title: 'Grand Entrance & First Dance', desc: 'Welcoming the bride and groom' };
          if (/tabrik|duo|pozdrav|blessing/i.test(title)) return { title: 'Family Blessings & Speeches', desc: 'Warm heartfelt words from loved ones' };
          if (/tort|cake/i.test(title)) return { title: 'Wedding Cake Ceremony', desc: 'Cutting the celebration cake' };
          if (/salom|konsert|final/i.test(title)) return { title: 'Celebration & Grand Finale', desc: 'Music, dancing and farewell fireworks' };
          return { title, desc };
        },
      };
    }
    return {
      eventType: inv.eventType || 'TO‘Y VA NIKOH MAROSIMI',
      weddingCeremony: gt.weddingCeremony,
      invitationQuote: inv.invitationQuote || gt.defaultQuote,
      invitationMessage: inv.invitationMessage,
      translateSchedule: (title: string, desc?: string) => ({ title, desc }),
    };
  };

  const loc = getLocalizedContent(invitation, invLang);

  // 1. LUXURY WEDDING ENVELOPE COVER OPENING EFFECT
  if (!isCoverOpened) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden"
        style={{ backgroundColor: bgColor }}
      >
        {/* Template Visual Theme Backdrop */}
        {templateDef.previewImage && (
          <div
            className="fixed inset-0 pointer-events-none -z-10 bg-cover bg-center transition-opacity duration-700"
            style={{
              backgroundImage: `url(${templateDef.previewImage})`,
              opacity: isDarkTheme ? 0.38 : 0.28,
              filter: isDarkTheme ? 'contrast(1.15) brightness(0.85)' : 'contrast(1.05)',
            }}
          />
        )}

        {/* Top Floating Language Switcher for Envelope Screen */}
        <div className="fixed sm:absolute top-3 left-3 z-40">
          <GlassSegmented<Language>
            value={invLang}
            onChange={setInvLang}
            ariaLabel="UZ / RU / EN"
            options={[
              { value: 'uz', label: 'UZ' },
              { value: 'ru', label: 'RU' },
              { value: 'en', label: 'EN' },
            ]}
          />
        </div>

        {/* Soft floating romance ambient glow */}
        <div
          className="absolute top-1/4 -left-20 w-80 h-80 rounded-full blur-3xl opacity-40 pointer-events-none"
          style={{ backgroundColor: secondaryColor }}
        />
        <div
          className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full blur-3xl opacity-40 pointer-events-none"
          style={{ backgroundColor: primaryColor }}
        />

        {/* Liquid Glass Luxury Envelope Card */}
        <div
          className={`relative max-w-md w-full rounded-[36px] p-8 sm:p-10 text-center space-y-6 transition-all duration-700 motion-reduce:transition-none ${
            isDarkTheme
              ? 'bg-[#0E1A2B]/88 backdrop-blur-2xl text-white border border-amber-300/35 shadow-[0_25px_80px_rgba(0,0,0,0.65)]'
              : 'glass-surface-elevated text-[#1E1418]'
          } ${
            isOpeningAnimation ? 'opacity-80 -translate-y-4' : 'animate-fadeIn motion-reduce:animate-none'
          }`}
          style={{
            boxShadow: `0 25px 60px -15px ${primaryColor}35, 0 0 0 1px ${
              isDarkTheme ? 'rgba(212,175,55,0.28)' : 'rgba(255, 255, 255, 0.92)'
            }`,
          }}
        >
          {/* Decorative Envelope Flap Header */}
          <div className="relative pt-2">
            <div
              className="w-16 h-1 mx-auto rounded-full opacity-45 mb-3"
              style={{ backgroundColor: primaryColor }}
            />
            <span
              className="font-script text-3xl sm:text-4xl tracking-wider block font-bold leading-relaxed mb-1"
              style={{
                color: isDarkTheme ? '#F5D061' : '#7A4A28',
                textShadow: isDarkTheme
                  ? '0 2px 10px rgba(0,0,0,0.6)'
                  : '0 1px 2px rgba(255, 255, 255, 0.9)',
              }}
            >
              {gt.envelopeSubtitle}
            </span>
            <div
              className={`text-[10px] uppercase tracking-[0.25em] font-extrabold mt-1 ${
                isDarkTheme ? 'text-amber-200/85' : 'text-[#4A383F]'
              }`}
            >
              {loc.weddingCeremony}
            </div>
          </div>

          {/* Royal Wax Seal Monogram */}
          <div className="relative py-2 flex justify-center">
            <button
              type="button"
              disabled={isOpeningAnimation}
              onClick={handleOpenInvitation}
              aria-label={gt.openEnvelope}
              className={`w-24 h-24 rounded-full p-1.5 shadow-[0_12px_32px_rgba(198,72,115,0.34)] flex items-center justify-center cursor-pointer transition-all duration-700 motion-reduce:transition-none relative group ${
                isOpeningAnimation
                  ? 'rotate-180 opacity-85'
                  : 'hover:-translate-y-1'
              }`}
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
              }}
            >
              <div
                className={`w-full h-full rounded-full flex flex-col items-center justify-center border-2 border-white shadow-inner ${
                  isDarkTheme
                    ? 'bg-[#0B1525]'
                    : 'bg-gradient-to-tr from-[#FFF5F8] via-white to-[#F0F8FF]'
                }`}
              >
                <Gem className="w-4 h-4 mb-0.5" style={{ color: primaryColor }} aria-hidden="true" />
                <span
                  className={`font-playfair text-xs font-black tracking-widest ${
                    isDarkTheme ? 'text-amber-300' : 'text-[#1E1418]'
                  }`}
                >
                  {getMonogram(invitation)}
                </span>
              </div>
              <div className="absolute inset-0 rounded-full border border-white/60 opacity-40 pointer-events-none" />
            </button>
          </div>

          {/* Couple Names & Title */}
          <div className="space-y-2">
            <h1
              className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
                isDarkTheme ? 'text-white' : 'text-[#1E1418]'
              }`}
              style={{ fontFamily: headingFont }}
            >
              {invitation.hostNames}
            </h1>
            <p
              className={`text-xs sm:text-sm max-w-xs mx-auto leading-relaxed italic ${
                isDarkTheme ? 'text-slate-200' : 'text-[#4A383F]'
              }`}
            >
              {loc.invitationQuote}
            </p>
          </div>

          {/* Grand Opening Liquid Glass CTA */}
          <div className="pt-2 space-y-2.5">
            <GlassButton
              tone="tinted"
              size="lg"
              loading={isOpeningAnimation}
              onClick={handleOpenInvitation}
              className="w-full"
              leftIcon={<Heart className="w-4 h-4 fill-white text-white" aria-hidden="true" />}
              rightIcon={<MailOpen className="w-4 h-4 text-white/90" aria-hidden="true" />}
            >
              {gt.openEnvelope}
            </GlassButton>
            <span
              className={`text-[11px] block font-medium ${
                isDarkTheme ? 'text-amber-200/85' : 'text-[#4A383F]'
              }`}
            >
              {gt.clickToOpen}
            </span>
          </div>

          {/* Taklifim Platform Badge at bottom of Cover */}
          <div className="pt-2 flex items-center justify-center">
            {isDarkTheme ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-amber-200 shadow-xs">
                <TaklifimLogo className="w-3.5 h-3.5" />
                <span>{gt.createdOn}</span>
              </div>
            ) : (
              <GlassSurface
                variant="subtle"
                rounded="full"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 text-[11px] font-semibold text-[#4A383F]"
              >
                <TaklifimLogo className="w-3.5 h-3.5" />
                <span>{gt.createdOn}</span>
              </GlassSurface>
            )}
          </div>
        </div>
      </div>
    );
  }

  // GUEST PAGE FULL VIEW
  return (
    <div
      className="min-h-screen transition-colors pb-24 relative"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {/* Floating Invitation Header: Liquid Glass Language switch & Share */}
      <div className="fixed top-2.5 sm:top-3 left-2.5 sm:left-4 right-2.5 sm:right-4 z-40 max-w-4xl mx-auto flex items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto">
          <GlassSegmented<Language>
            value={invLang}
            onChange={setInvLang}
            ariaLabel="UZ / RU / EN"
            options={[
              { value: 'uz', label: 'UZ' },
              { value: 'ru', label: 'RU' },
              { value: 'en', label: 'EN' },
            ]}
          />
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <GlassButton
            tone="light"
            size="sm"
            onClick={() => setShowShareModal(true)}
            className="!min-w-[44px] !min-h-[40px] !px-3.5 shadow-[0_10px_28px_-6px_rgba(30,20,24,0.2)]"
            title={activeLocaleT.common.share}
            aria-label={activeLocaleT.common.share}
          >
            <span className="inline-flex items-center sm:gap-2">
              <Share2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline text-xs font-semibold">
                {activeLocaleT.common.share}
              </span>
            </span>
          </GlassButton>
        </div>
      </div>

      {/* Dedicated Dynamic Template Renderer */}
      <TemplateRenderer
        invitation={invitation}
        language={invLang}
        isPreview={false}
        onRSVPSubmit={handleGuestRSVP}
        onWishSubmit={handleGuestWish}
        wishesList={guestList
          .filter((g) => g.message && g.message.trim().length > 0)
          .map((g) => ({
            id: g.id,
            name: g.fullName,
            message: g.message || '',
            date: g.submittedAt || '',
          }))}
        interactiveMap={
          invitation.latitude && invitation.longitude ? (
            <div className="rounded-2xl overflow-hidden shadow-inner border border-black/5 aspect-[16/10] w-full">
              <iframe
                title="Google Maps"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                src={`https://maps.google.com/maps?q=${invitation.latitude},${invitation.longitude}&z=15&output=embed`}
              />
            </div>
          ) : undefined
        }
      />

      {/* Floating Music Player if enabled & uploaded */}
      {invitation.musicEnabled && invitation.musicUrl && (
        <MusicPlayer
          url={invitation.musicUrl}
          title={invitation.musicTitle}
          autoPlay={true}
          delaySeconds={5}
          language={invLang}
        />
      )}

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          url={`/i/${slug}`}
          title={`${invitation.hostNames} — ${invitation.eventTitle || translateCategory(invitation.eventType, invLang)}`}
          language={invLang}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
};
