import React, { useState } from 'react';
import { GuestRSVP, Language } from '../../types';
import { CheckCircle2, Send } from 'lucide-react';
import { translations, formatPersonCount } from '../../locales';

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
  const t = translations[language] || translations.uz;
  const rsvpT = t.rsvp;

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [attending, setAttending] = useState(true);
  const [guestCount, setGuestCount] = useState(1);
  const [mealPref, setMealPref] = useState(rsvpT.mealStandard);
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
      className={`rounded-3xl taklifim-tpl-card space-y-6 shadow-xl backdrop-blur-md border ${
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
          {rsvpT.title}
        </h3>
        <p className={`text-xs max-w-sm mx-auto ${isDarkTheme ? 'text-white/70' : 'text-[#7A6A63]'}`}>
          {rsvpT.subtitle}
        </p>
        {deadline && (
          <div className="text-[11px] font-semibold pt-1" style={{ color: primaryColor }}>
            {rsvpT.deadlineNotice} {deadline}
          </div>
        )}
      </div>

      {isSubmitted ? (
        <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2 animate-fadeIn">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h4 className="text-base font-bold text-emerald-600">{rsvpT.successTitle}</h4>
          <p className="text-xs text-emerald-700/90 leading-relaxed">{rsvpT.successDesc}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs text-left">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAttending(true)}
              className={`p-2.5 sm:p-3 rounded-2xl font-bold flex items-center justify-center gap-1.5 text-center leading-tight min-h-[44px] border transition-all ${
                attending
                  ? 'bg-emerald-600 text-white shadow-sm border-emerald-600'
                  : isDarkTheme
                  ? 'bg-white/5 border-white/10 text-white/70'
                  : 'bg-white border-black/10 text-[#5C4F48]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{rsvpT.yesAttending}</span>
            </button>
            <button
              type="button"
              onClick={() => setAttending(false)}
              className={`p-2.5 sm:p-3 rounded-2xl font-bold flex items-center justify-center gap-1.5 text-center leading-tight min-h-[44px] border transition-all ${
                !attending
                  ? 'bg-rose-600 text-white shadow-sm border-rose-600'
                  : isDarkTheme
                  ? 'bg-white/5 border-white/10 text-white/70'
                  : 'bg-white border-black/10 text-[#5C4F48]'
              }`}
            >
              <span>{rsvpT.notAttending}</span>
            </button>
          </div>

          <div>
            <label className="font-bold block mb-1">{rsvpT.fullNameLabel} *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={rsvpT.fullNamePlaceholder}
              className={`w-full p-3 rounded-xl border outline-none text-xs ${
                isDarkTheme ? 'bg-white/10 border-white/15 text-white placeholder-white/40' : 'bg-white border-black/10 text-[#231E1B]'
              }`}
            />
          </div>

          <div>
            <label className="font-bold block mb-1">{rsvpT.phoneLabel}</label>
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
            <div className="taklifim-cq-grid-2 pt-1">
              <div>
                <label className="font-bold block mb-1">{rsvpT.guestCountLabel}</label>
                <select
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value))}
                  className={`w-full p-3 rounded-xl border outline-none text-xs ${
                    isDarkTheme ? 'bg-[#0E1A2B] border-white/15 text-white' : 'bg-white border-black/10 text-[#231E1B]'
                  }`}
                >
                  {[1, 2, 3, 4, 5].map((num) => (
                    <option key={num} value={num}>
                      {formatPersonCount(num, language)}
                    </option>
                  ))}
                </select>
              </div>

              {askMealPreference && (
                <div>
                  <label className="font-bold block mb-1">{rsvpT.mealLabel}</label>
                  <select
                    value={mealPref}
                    onChange={(e) => setMealPref(e.target.value)}
                    className={`w-full p-3 rounded-xl border outline-none text-xs ${
                      isDarkTheme ? 'bg-[#0E1A2B] border-white/15 text-white' : 'bg-white border-black/10 text-[#231E1B]'
                    }`}
                  >
                    <option value={rsvpT.mealStandard}>{rsvpT.mealStandard}</option>
                    <option value={rsvpT.mealDiet}>{rsvpT.mealDiet}</option>
                    <option value={rsvpT.mealKids}>{rsvpT.mealKids}</option>
                  </select>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="font-bold block mb-1">{rsvpT.messageLabel}</label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={rsvpT.messagePlaceholder}
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
            <span>{submitting ? rsvpT.submitting : rsvpT.submit}</span>
          </button>
        </form>
      )}
    </div>
  );
};
