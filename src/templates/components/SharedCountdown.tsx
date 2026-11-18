import React, { useState, useEffect } from 'react';
import { Language } from '../../types';

interface SharedCountdownProps {
  eventDate: string;
  startTime?: string;
  language?: Language;
  primaryColor?: string;
  isDarkTheme?: boolean;
  variant?: 'royal' | 'floral' | 'oriental' | 'minimal' | 'glass' | 'ruby' | 'sapphire';
}

export const SharedCountdown: React.FC<SharedCountdownProps> = ({
  eventDate,
  startTime = '18:00',
  language = 'uz',
  primaryColor = '#B48B47',
  isDarkTheme = false,
  variant = 'royal',
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPassed: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isPassed: false });

  useEffect(() => {
    const calc = () => {
      const target = new Date(`${eventDate}T${startTime}:00`);
      const now = new Date();
      const diff = target.getTime() - now.getTime();

      if (isNaN(diff) || diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPassed: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds, isPassed: false });
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [eventDate, startTime]);

  const labels = {
    uz: { title: 'Tantana boshlanishiga qoldi', days: 'Kun', hours: 'Soat', min: 'Daqiqa', sec: 'Soniya', passed: 'Tadbir boshlandi' },
    ru: { title: 'До торжества осталось', days: 'Дней', hours: 'Часов', min: 'Минут', sec: 'Секунд', passed: 'Торжество началось' },
    en: { title: 'Countdown to the Celebration', days: 'Days', hours: 'Hours', min: 'Mins', sec: 'Secs', passed: 'The celebration has begun' },
  }[language] || { title: 'Tantana boshlanishiga qoldi', days: 'Kun', hours: 'Soat', min: 'Daqiqa', sec: 'Soniya', passed: 'Tadbir boshlandi' };

  if (timeLeft.isPassed) {
    return (
      <div className={`p-4 rounded-2xl text-center text-xs font-bold ${isDarkTheme ? 'bg-amber-400/10 text-amber-300' : 'bg-amber-50 text-amber-900 border border-amber-200'}`}>
        🎉 {labels.passed}!
      </div>
    );
  }

  return (
    <div className="w-full text-center space-y-3">
      <div className="text-[11px] uppercase tracking-widest font-bold" style={{ color: primaryColor }}>
        {labels.title}
      </div>

      <div className="taklifim-cq-countdown-grid max-w-sm mx-auto">
        {[
          { val: timeLeft.days, label: labels.days },
          { val: timeLeft.hours, label: labels.hours },
          { val: timeLeft.minutes, label: labels.min },
          { val: timeLeft.seconds, label: labels.sec },
        ].map((item, idx) => (
          <div
            key={idx}
            className={`p-2 sm:p-3 rounded-2xl min-w-0 flex flex-col items-center justify-center transition-all ${
              isDarkTheme
                ? 'bg-white/5 border border-white/10 shadow-lg text-white'
                : 'bg-white/85 border border-black/5 shadow-xs text-[#231E1B]'
            }`}
          >
            <span className="font-playfair text-lg sm:text-2xl font-black tabular-nums leading-none" style={{ color: primaryColor }}>
              {String(item.val).padStart(2, '0')}
            </span>
            <span className={`text-[8.5px] sm:text-[10px] uppercase font-bold tracking-wider mt-1 truncate max-w-full ${isDarkTheme ? 'text-white/60' : 'text-[#7A6A63]'}`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
