import React, { useState } from 'react';
import { GuestRSVP, Language } from '../../types';
import { CheckCircle2, Send, Users, HeartHandshake } from 'lucide-react';

interface SharedRSVPProps {
  language?: Language;
  primaryColor?: string;
  isDarkTheme?: boolean;
  headingFont?: string;
  deadline?: string;
  askMealPreference?: boolean;
  onRSVPSubmit?: (rsvp: Partial<GuestRSVP>) => Promise<boolean>;
}

export const SharedRSVP: React.FC<SharedRSVPProps> = ({
  language = 'uz',
  primaryColor = '#B48B47',
  isDarkTheme = false,
  headingFont = 'Playfair Display',
  deadline,
  askMealPreference = true,
  onRSVPSubmit,
}) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [attending, setAttending] = useState(true);
  const [guestCount, setGuestCount] = useState(1);
  const [mealPref, setMealPref] = useState('Standart');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const labels = {
    uz: {
      title: 'Tashrifingizni tasdiqlang',
      subtitle: 'Biz uchun har bir aziz mehmonimizning tashrifi katta quvonch!',
      name: 'F.I.Sh. (Ismingiz va familiyangiz)',
      phone: 'Telefon raqamingiz',
      willAttend: 'Albatta, qatnashaman',
      cannotAttend: 'Afsuski, kela olmayman',
      count: 'Necha kishi bo‘lib kelasiz?',
      meal: 'Taom afzalligingiz',
      wish: 'Kelin va kuyovga samimiy tilaklaringiz',
      submit: 'Javobni yuborish',
      thankYou: 'Tashrifingiz tasdiqlandi!',
      thankYouDesc: 'E’tiboringiz va samimiy javobingiz uchun katta rahmat. Sizni tantanamizda intizorlik bilan kutamiz!',
      deadlineText: 'Iltimos, javobingizni quyidagi sanagacha bildiring:',
    },
    ru: {
      title: 'Подтвердите присутствие',
      subtitle: 'Ваше присутствие на нашем торжестве станет для нас огромной радостью!',
      name: 'Ф.И.О. (Ваше имя и фамилия)',
      phone: 'Номер телефона',
      willAttend: 'Обязательно приду',
      cannotAttend: 'К сожалению, не смогу',
      count: 'Количество гостей',
      meal: 'Предпочтения по меню',
      wish: 'Пожелания и поздравления паре',
      submit: 'Отправить подтверждение',
      thankYou: 'Ваш ответ принят!',
      thankYouDesc: 'Большое спасибо за ваше подтверждение. С нетерпением ждём встречи с вами!',
      deadlineText: 'Пожалуйста, подтвердите до:',
    },
    en: {
      title: 'RSVP Confirmation',
      subtitle: 'Your gracious presence will bring immense joy to our celebration!',
      name: 'Full Name',
      phone: 'Phone Number',
      willAttend: 'Joyfully Accept',
      cannotAttend: 'Regretfully Decline',
      count: 'Number of Guests',
      meal: 'Dietary Preference',
      wish: 'Warm Wishes & Blessings',
      submit: 'Send RSVP',
      thankYou: 'Thank you for your RSVP!',
      thankYouDesc: 'Your response has been recorded. We eagerly look forward to celebrating together!',
      deadlineText: 'Please respond before:',
    },
  }[language] || {
    title: 'Tashrifingizni tasdiqlang',
    subtitle: 'Biz uchun har bir aziz mehmonimizning tashrifi katta quvonch!',
    name: 'F.I.Sh. (Ismingiz va familiyangiz)',
    phone: 'Telefon raqamingiz',
    willAttend: 'Albatta, qatnashaman',
    cannotAttend: 'Afsuski, kela olmayman',
    count: 'Necha kishi bo‘lib kelasiz?',
    meal: 'Taom afzalligingiz',
    wish: 'Kelin va kuyovga samimiy tilaklaringiz',
    submit: 'Javobni yuborish',
    thankYou: 'Tashrifingiz tasdiqlandi!',
    thankYouDesc: 'E’tiboringiz va samimiy javobingiz uchun katta rahmat. Sizni tantanamizda intizorlik bilan kutamiz!',
    deadlineText: 'Iltimos, javobingizni quyidagi sanagacha bildiring:',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    setSubmitting(true);
    const payload: Partial<GuestRSVP> = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      attending,
      guestCount: attending ? guestCount : 0,
      mealPreference: askMealPreference ? mealPref : undefined,
      message: message.trim(),
      submittedAt: new Date().toISOString(),
    };

    if (onRSVPSubmit) {
      await onRSVPSubmit(payload);
    }
    setSubmitting(false);
    setIsSubmitted(true);
  };

  return (
    <div
      className={`rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-md border ${
        isDarkTheme
          ? 'bg-white/5 border-white/10 text-white'
          : 'bg-white/90 border-black/5 text-[#231E1B]'
      }`}
    >
      <div className="text-center space-y-1">
        <span className="text-[11px] uppercase tracking-widest font-bold" style={{ color: primaryColor }}>
          RSVP
        </span>
        <h3 className={`text-2xl font-bold ${isDarkTheme ? 'text-white' : 'text-[#231E1B]'}`} style={{ fontFamily: headingFont }}>
          {labels.title}
        </h3>
        <p className={`text-xs max-w-sm mx-auto ${isDarkTheme ? 'text-white/70' : 'text-[#7A6A63]'}`}>
          {labels.subtitle}
        </p>
        {deadline && (
          <div className="text-[11px] font-semibold pt-1" style={{ color: primaryColor }}>
            {labels.deadlineText} {deadline}
          </div>
        )}
      </div>

      {isSubmitted ? (
        <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2 animate-fadeIn">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h4 className="text-base font-bold text-emerald-600">{labels.thankYou}</h4>
          <p className="text-xs text-emerald-700/90 leading-relaxed">{labels.thankYouDesc}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs text-left">
          {/* Attendance Choice */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAttending(true)}
              className={`p-3 rounded-2xl font-bold flex items-center justify-center gap-2 border transition-all ${
                attending
                  ? 'bg-emerald-600 text-white shadow-sm border-emerald-600'
                  : isDarkTheme
                  ? 'bg-white/5 border-white/10 text-white/70'
                  : 'bg-white border-black/10 text-[#5C4F48]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{labels.willAttend}</span>
            </button>
            <button
              type="button"
              onClick={() => setAttending(false)}
              className={`p-3 rounded-2xl font-bold flex items-center justify-center gap-2 border transition-all ${
                !attending
                  ? 'bg-rose-600 text-white shadow-sm border-rose-600'
                  : isDarkTheme
                  ? 'bg-white/5 border-white/10 text-white/70'
                  : 'bg-white border-black/10 text-[#5C4F48]'
              }`}
            >
              <span>{labels.cannotAttend}</span>
            </button>
          </div>

          {/* Full Name */}
          <div>
            <label className="font-bold block mb-1">{labels.name} *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Masalan: Sardor va Nozima Rahimovlar"
              className={`w-full p-3 rounded-xl border outline-none text-xs ${
                isDarkTheme ? 'bg-white/10 border-white/15 text-white placeholder-white/40' : 'bg-white border-black/10 text-[#231E1B]'
              }`}
            />
          </div>

          {/* Phone */}
          <div>
            <label className="font-bold block mb-1">{labels.phone}</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+998 90 123 45 67"
              className={`w-full p-3 rounded-xl border outline-none text-xs ${
                isDarkTheme ? 'bg-white/10 border-white/15 text-white placeholder-white/40' : 'bg-white border-black/10 text-[#231E1B]'
              }`}
            />
          </div>

          {attending && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="font-bold block mb-1">{labels.count}</label>
                <select
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value))}
                  className={`w-full p-3 rounded-xl border outline-none text-xs ${
                    isDarkTheme ? 'bg-[#0E1A2B] border-white/15 text-white' : 'bg-white border-black/10 text-[#231E1B]'
                  }`}
                >
                  <option value={1}>1 kishi</option>
                  <option value={2}>2 kishi (juftlik)</option>
                  <option value={3}>3 kishi (oila bilan)</option>
                  <option value={4}>4 kishi</option>
                  <option value={5}>5 kishi</option>
                </select>
              </div>

              {askMealPreference && (
                <div>
                  <label className="font-bold block mb-1">{labels.meal}</label>
                  <select
                    value={mealPref}
                    onChange={(e) => setMealPref(e.target.value)}
                    className={`w-full p-3 rounded-xl border outline-none text-xs ${
                      isDarkTheme ? 'bg-[#0E1A2B] border-white/15 text-white' : 'bg-white border-black/10 text-[#231E1B]'
                    }`}
                  >
                    <option value="Standart">Milliy taomlar / Standart</option>
                    <option value="Parhezli">Parhezli (Go‘shtsiz / Sabzavotli)</option>
                    <option value="Bolalar uchun">Bolalar menyusi</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Wish Message */}
          <div>
            <label className="font-bold block mb-1">{labels.wish}</label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Qo‘shaloq baxt, totuvlik va cheksiz quvonch tilaymiz..."
              className={`w-full p-3 rounded-xl border outline-none text-xs ${
                isDarkTheme ? 'bg-white/10 border-white/15 text-white placeholder-white/40' : 'bg-white border-black/10 text-[#231E1B]'
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow-md hover:opacity-95 transition-all"
            style={{ backgroundColor: primaryColor }}
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? 'Yuborilmoqda...' : labels.submit}</span>
          </button>
        </form>
      )}
    </div>
  );
};
