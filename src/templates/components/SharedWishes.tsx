import React, { useState } from 'react';
import { Language } from '../../types';
import { MessageSquareHeart, Send } from 'lucide-react';

interface SharedWishesProps {
  wishes?: Array<{ id: string; name: string; message: string; date: string }>;
  language?: Language;
  primaryColor?: string;
  isDarkTheme?: boolean;
  headingFont?: string;
  onWishSubmit?: (wish: { name: string; message: string }) => Promise<boolean>;
}

export const SharedWishes: React.FC<SharedWishesProps> = ({
  wishes = [],
  language = 'uz',
  primaryColor = '#B48B47',
  isDarkTheme = false,
  headingFont = 'Playfair Display',
  onWishSubmit,
}) => {
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const labels = {
    uz: {
      title: 'Tilaklar va Tabriklar',
      subtitle: 'Aziz mehmonlarimizning dildan bildirilgan samimiy tilaklari',
      name: 'Ismingiz',
      wish: 'Samimiy tilagingizni yozing...',
      send: 'Tilak qoldirish',
      empty: 'Birinchi bo‘lib samimiy tilak qoldiring!',
    },
    ru: {
      title: 'Пожелания и Поздравления',
      subtitle: 'Искренние слова и теплые пожелания от дорогих гостей',
      name: 'Ваше имя',
      wish: 'Напишите ваше поздравление...',
      send: 'Оставить пожелание',
      empty: 'Будьте первым, кто оставит пожелание!',
    },
    en: {
      title: 'Wishes & Blessings',
      subtitle: 'Heartfelt wishes and congratulations from beloved guests',
      name: 'Your Name',
      wish: 'Write your warm blessings...',
      send: 'Leave a Wish',
      empty: 'Be the first to share your warm wishes!',
    },
  }[language] || {
    title: 'Tilaklar va Tabriklar',
    subtitle: 'Aziz mehmonlarimizning dildan bildirilgan samimiy tilaklari',
    name: 'Ismingiz',
    wish: 'Samimiy tilagingizni yozing...',
    send: 'Tilak qoldirish',
    empty: 'Birinchi bo‘lib samimiy tilak qoldiring!',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !msg.trim()) return;

    setSubmitting(true);
    if (onWishSubmit) {
      await onWishSubmit({ name: name.trim(), message: msg.trim() });
    }
    setName('');
    setMsg('');
    setSubmitting(false);
  };

  return (
    <div className="space-y-6 text-center">
      <div>
        <span className="text-[11px] uppercase tracking-widest font-bold" style={{ color: primaryColor }}>
          {labels.title}
        </span>
        <h3 className={`text-xl sm:text-2xl font-bold mt-1 ${isDarkTheme ? 'text-white' : 'text-[#231E1B]'}`} style={{ fontFamily: headingFont }}>
          {labels.subtitle}
        </h3>
      </div>

      {/* Wishes List */}
      <div className="max-w-md mx-auto space-y-3 text-left">
        {wishes.length === 0 ? (
          <div className={`p-6 rounded-2xl text-center text-xs ${isDarkTheme ? 'text-white/60 bg-white/5 border border-white/10' : 'text-[#7A6A63] bg-white/70 border border-black/5'}`}>
            <MessageSquareHeart className="w-8 h-8 mx-auto mb-2 opacity-50" style={{ color: primaryColor }} />
            <p>{labels.empty}</p>
          </div>
        ) : (
          wishes.map((w, idx) => (
            <div
              key={`${w.id || 'wish'}-${idx}`}
              className={`p-4 rounded-2xl border shadow-xs transition-all ${
                isDarkTheme ? 'bg-white/5 border-white/10 text-white' : 'bg-white/85 border-black/5 text-[#231E1B]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-xs" style={{ color: primaryColor }}>
                  {w.name}
                </span>
                <span className={`text-[10px] ${isDarkTheme ? 'text-white/50' : 'text-[#7A6A63]'}`}>
                  {w.date}
                </span>
              </div>
              <p className={`text-xs leading-relaxed italic ${isDarkTheme ? 'text-white/85' : 'text-[#4A3E39]'}`}>
                "{w.message}"
              </p>
            </div>
          ))
        )}
      </div>

      {/* Add Wish Form */}
      {onWishSubmit && (
        <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-2 text-left">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={labels.name}
            className={`w-full p-2.5 rounded-xl border outline-none text-xs ${
              isDarkTheme ? 'bg-white/10 border-white/15 text-white placeholder-white/40' : 'bg-white border-black/10 text-[#231E1B]'
            }`}
          />
          <textarea
            rows={2}
            required
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder={labels.wish}
            className={`w-full p-2.5 rounded-xl border outline-none text-xs ${
              isDarkTheme ? 'bg-white/10 border-white/15 text-white placeholder-white/40' : 'bg-white border-black/10 text-[#231E1B]'
            }`}
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95 transition-all"
            style={{ backgroundColor: primaryColor }}
          >
            <Send className="w-3.5 h-3.5" />
            <span>{submitting ? '...' : labels.send}</span>
          </button>
        </form>
      )}
    </div>
  );
};
