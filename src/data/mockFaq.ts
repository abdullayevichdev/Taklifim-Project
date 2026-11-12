import { FAQItem } from '../types';

export const mockFaq: FAQItem[] = [
  {
    id: 'faq-1',
    category: 'website',
    question: {
      uz: 'Raqamli veb-taklifnoma qanday ishlaydi?',
      ru: 'Как работает цифровое веб-приглашение?',
      en: 'How does a digital web invitation work?',
    },
    answer: {
      uz: 'Siz tanlagan shablon asosida shaxsiy havola (masalan, taklifim.uz/i/nodir-malika) yaratiladi. Mehmonlar havolani bosganda, ularning telefonida audio, fotoalbom, xarita va RSVP tashrif tasdiqlash imkoniyati bo‘lgan go‘zal interaktiv sahifa ochiladi.',
      ru: 'Создаётся уникальная ссылка (например, taklifim.uz/i/nodir-malika). Переходя по ней, гости открывают на своём телефоне персональную интерактивную страницу с музыкой, галереей, локацией на карте и кнопкой подтверждения присутствия.',
      en: 'A personalized link is generated for your event. When guests tap the link on mobile or desktop, an elegant webpage opens featuring music, interactive map directions, photo galleries, and instant RSVP attendance confirmation.',
    },
  },
  {
    id: 'faq-2',
    category: 'website',
    question: {
      uz: 'Mehmonlarim RSVP orqali javob berishsa, buni qayerda ko‘raman?',
      ru: 'Где я увижу ответы гостей на RSVP?',
      en: 'Where do I view guest RSVP responses?',
    },
    answer: {
      uz: 'Taklifim mijoz kabinetida (Dashboard) maxsus «Mehmonlar ro‘yxati» bo‘limi mavjud. U yerda kimlar qatnashishi, necha kishi bo‘lib kelishi, ularning taom tanlovi va ezgu tilaklari real vaqtda jadval ko‘rinishida jamlanadi.',
      ru: 'В личном кабинете на платформе доступна вкладка «Список гостей (RSVP)». Там в режиме реального времени отображаются все подтверждения: кто придёт, количество гостей, предпочтения по блюдам и пожелания.',
      en: 'In your Taklifim Customer Dashboard under "Guest List (RSVP)", all confirmations, companion counts, dietary selections, and congratulations are automatically cataloged and synced in real time.',
    },
  },
  {
    id: 'faq-3',
    category: 'website',
    question: {
      uz: 'Taklifnomani yaratish va ulashish qancha vaqt oladi?',
      ru: 'Сколько времени занимает создание и отправка приглашения?',
      en: 'How long does creating and sharing an invitation take?',
    },
    answer: {
      uz: 'Shablonni tanlab, to‘y sanasi, manzili va fotosuratlaringizni kiritish atigi 2-3 daqiqa vaqt oladi. Tayyor bo‘lgan shaxsiy havolani darhol Telegram, Instagram va WhatsApp orqali barcha mehmonlaringizga yuborishingiz mumkin.',
      ru: 'Выбор шаблона, ввод даты, локации и фото занимает всего 2-3 минуты. Готовую персональную ссылку можно сразу же отправлять гостям в Telegram, Instagram и WhatsApp.',
      en: 'Selecting a template and customizing details, date, and photos takes only 2-3 minutes. Your personalized invitation link can be instantly shared via Telegram, WhatsApp, or Instagram.',
    },
  },
  {
    id: 'faq-4',
    category: 'general',
    question: {
      uz: 'Taklifnomani bir nechta tilda yaratish mumkinmi?',
      ru: 'Можно ли создать приглашение на нескольких языках?',
      en: 'Can invitations be presented in multiple languages?',
    },
    answer: {
      uz: 'Ha! Taklifim o‘zbekcha, ruscha va inglizcha tillarni to‘liq qo‘llab-quvvatlaydi. Mehmon taklifnoma sahifasida o‘zi xohlagan tilni bir zumda tanlashi mumkin.',
      ru: 'Да! Платформа Taklifim полностью поддерживает узбекский, русский и английский языки. Гости могут переключать язык приглашения в один клик.',
      en: 'Yes! Taklifim natively supports Uzbek, Russian, and English. Guests can effortlessly switch languages directly from the invitation header.',
    },
  },
  {
    id: 'faq-5',
    category: 'payment',
    question: {
      uz: 'To‘lov usullari qanday?',
      ru: 'Какие способы оплаты поддерживаются?',
      en: 'What payment methods are supported?',
    },
    answer: {
      uz: 'Platformada Payme, Click va Uzum Bank orqali xavfsiz onlayn to‘lovlar yo‘lga qo‘yilgan. Shuningdek, 1 martalik bepul tarifdan darhol foydalanishingiz mumkin.',
      ru: 'На платформе поддерживаются безопасные платежи через Payme, Click и Uzum Bank. Также доступен 1 бесплатный пробный тариф.',
      en: 'Secure online checkouts via Payme, Click, and Uzum Bank are integrated. A complimentary 1-time free invitation tier is also available immediately.',
    },
  },
];

export const mockStats = {
  totalInvitations: 3420,
  totalTemplates: 8,
  totalGuests: 84500,
  totalViews: 412000,
  isDemoNotice: 'Ushbu ko‘rsatkichlar platformaning umumiy statistikasidir.',
};
