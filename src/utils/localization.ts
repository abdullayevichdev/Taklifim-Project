import { InvitationData, Language } from '../types';

export function getLocalizedInvitation(inv: InvitationData, lang: Language): InvitationData {
  if (!inv || lang === 'uz') return inv;

  const isRu = lang === 'ru';
  const isEn = lang === 'en';

  const defaultEventTypeUz = ['To‘y va Nikoh Oqshomi', 'To‘y & Nikoh Marosimi', 'Nikoh To‘yi', 'To‘y', 'Tantana'];
  const defaultQuoteUz = [
    '«Sizni muqaddas rishta — nikoh to‘yimiz munosabati bilan yoziladigan dasturxonimizga lutfan taklif etamiz.»',
    '«Ikki qalbning bir butunlik sari qo‘yilgan ilk qadami muborak bo‘lsin.»',
    '«Hayotimizning eng quvonchli va unutilmas kunida siz azizlarni faxriy mehmonimiz bo‘lishga taklif etamiz!»',
  ];
  const defaultMessageUz = [
    'Hurmatli qadrdonimiz! Sizni hayotimizdagi eng quvonchli va hayajonli kunimiz — Nikoh to‘yimiz munosabati bilan yoziladigan dasturxonimizga lutfan taklif etamiz. Sizning duolaringiz va samimiy tabassumlaringiz ushbu oqshomimizga o‘zgacha fayz bag‘ishlaydi.',
    'Sizni baxtli oqshomimiz — Nikoh to‘yimiz munosabati bilan yoziladigan dasturxonimizga lutfan taklif etamiz. Tashrifingiz bizga quvonch bag‘ishlaydi!',
  ];

  let eventType = inv.eventType;
  if (!eventType || defaultEventTypeUz.some((u) => eventType.includes(u) || eventType.toLowerCase() === 'to‘y va nikoh oqshomi')) {
    eventType = isRu ? 'Свадебное торжество' : isEn ? 'Wedding Celebration' : eventType;
  }

  let eventTitle = inv.eventTitle;
  if (!eventTitle || eventTitle === 'To‘y Taklifnomasi' || eventTitle === 'Taklifnoma') {
    eventTitle = isRu ? 'Свадебное Приглашение' : isEn ? 'Wedding Invitation' : eventTitle;
  }

  let invitationQuote = inv.invitationQuote;
  if (!invitationQuote || defaultQuoteUz.some((q) => invitationQuote?.includes(q))) {
    invitationQuote = isRu
      ? '«Приглашаем вас разделить с нами радость создания новой семьи на нашем праздничном торжестве.»'
      : '«We cordially invite you to celebrate the joyous union of our hearts and lives at our wedding feast.»';
  }

  let invitationMessage = inv.invitationMessage;
  if (!invitationMessage || defaultMessageUz.some((m) => invitationMessage.includes(m))) {
    invitationMessage = isRu
      ? 'Уважаемые родные и близкие! Мы искренне приглашаем вас разделить этот счастливый день нашего бракосочетания. Ваше присутствие станет для нас величайшей радостью.'
      : 'Dear family and friends! We joyfully invite you to celebrate our special wedding day with us. Your blessings and warm presence will make our celebration truly unforgettable.';
  }

  let galleryTitle = inv.galleryTitle;
  if (!galleryTitle || galleryTitle === 'Bizning suratlarimiz' || galleryTitle === 'Baxtli lahzalar') {
    galleryTitle = isRu ? 'Наши фотографии' : 'Our Precious Photos';
  }

  let dressCodeDescription = inv.dressCodeDescription;
  if (!dressCodeDescription || dressCodeDescription.includes('milliy') || dressCodeDescription.includes('rang')) {
    dressCodeDescription = isRu
      ? 'Пожалуйста, поддержите цветовую гамму нашего торжества в ваших праздничных нарядах.'
      : 'Please consider matching the color theme of our celebration in your festive attire.';
  }

  const schedule = inv.schedule?.map((item) => {
    let tTitle = typeof item.title === 'string' ? item.title : (item.title?.uz || '');
    let tDesc = typeof item.description === 'string' ? item.description : (item.description?.uz || '');
    const lower = tTitle.toLowerCase();

    if (/kutib|vstrech|welcome/i.test(lower)) {
      tTitle = isRu ? 'Встреча дорогих гостей' : isEn ? 'Guest Welcome & Reception' : tTitle;
      tDesc = isRu ? 'Живая музыка и приветственный фуршет' : isEn ? 'Live acoustic music & welcome drinks' : tDesc;
    } else if (/kirib|kirish|vxod|entrance/i.test(lower)) {
      tTitle = isRu ? 'Торжественный выход молодоженов' : isEn ? 'Grand Entrance & First Dance' : tTitle;
      tDesc = isRu ? 'Первый свадебный танец пары' : isEn ? 'Welcoming the bride and groom' : tDesc;
    } else if (/tabrik|duo|pozdrav|blessing/i.test(lower)) {
      tTitle = isRu ? 'Поздравления родителей и гостей' : isEn ? 'Family Blessings & Speeches' : tTitle;
      tDesc = isRu ? 'Искренние пожелания и тосты' : isEn ? 'Warm heartfelt words from loved ones' : tDesc;
    } else if (/tort|cake/i.test(lower)) {
      tTitle = isRu ? 'Разрезание свадебного торта' : isEn ? 'Wedding Cake Ceremony' : tTitle;
      tDesc = isRu ? 'Праздничный торт и десерт' : isEn ? 'Cutting the celebration cake' : tDesc;
    } else if (/salom|konsert|final/i.test(lower)) {
      tTitle = isRu ? 'Келин салом и шоу-программа' : isEn ? 'Celebration & Grand Finale' : tTitle;
      tDesc = isRu ? 'Праздничный концерт и финал' : isEn ? 'Music, dancing and farewell fireworks' : tDesc;
    }
    return { ...item, title: tTitle, description: tDesc };
  });

  return {
    ...inv,
    eventType,
    eventTitle,
    invitationQuote,
    invitationMessage,
    galleryTitle,
    dressCodeDescription,
    schedule,
  };
}
