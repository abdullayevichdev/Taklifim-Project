import React from 'react';
import { Language } from '../../types';
import { MapPin, Calendar, ExternalLink } from 'lucide-react';

interface SharedLocationProps {
  venueName: string;
  venueAddress: string;
  venueLocationType?: 'restaurant' | 'home';
  celebrationAudience?: 'all' | 'men' | 'women';
  eventDate: string;
  startTime: string;
  endTime?: string;
  hostNames?: string;
  eventType?: string;
  mapUrl?: string;
  latitude?: number;
  longitude?: number;
  language?: Language;
  primaryColor?: string;
  isDarkTheme?: boolean;
  headingFont?: string;
  interactiveMap?: React.ReactNode;
}

export const SharedLocation: React.FC<SharedLocationProps> = ({
  venueName,
  venueAddress,
  venueLocationType = 'restaurant',
  celebrationAudience = 'all',
  eventDate,
  startTime,
  endTime,
  hostNames = 'Kelin & Kuyov',
  eventType = 'To‘y',
  mapUrl,
  language = 'uz',
  primaryColor = '#B48B47',
  isDarkTheme = false,
  headingFont = 'Playfair Display',
  interactiveMap,
}) => {
  const labels = {
    uz: {
      locationTitle: 'Manzil va Vaqt',
      date: 'Tadbir sanasi',
      time: 'Boshlanish vaqti',
      venue: 'Tadbir manzili',
      home: '🏡 Uyda (Xonadonda)',
      openMap: 'Google Maps xaritasida ko‘rish',
      calendar: 'Taqvimga saqlash',
      menAudience: '👔 Erkaklar majlisi',
      womenAudience: '👗 Ayollar davrasi',
    },
    ru: {
      locationTitle: 'Место и Время',
      date: 'Дата торжества',
      time: 'Время начала',
      venue: 'Место проведения',
      home: '🏡 В семейном кругу (Дома)',
      openMap: 'Открыть на картах Google',
      calendar: 'Добавить в календарь',
      menAudience: '👔 Мужской банкет',
      womenAudience: '👗 Женский вечер',
    },
    en: {
      locationTitle: 'Date & Location',
      date: 'Event Date',
      time: 'Start Time',
      venue: 'Event Venue',
      home: '🏡 Family Residence (Home)',
      openMap: 'Open in Google Maps',
      calendar: 'Save to Calendar',
      menAudience: '👔 Gentlemen’s Gathering',
      womenAudience: '👗 Ladies’ Celebration',
    },
  }[language] || {
    locationTitle: 'Manzil va Vaqt',
    date: 'Tadbir sanasi',
    time: 'Boshlanish vaqti',
    venue: 'Tadbir manzili',
    home: '🏡 Uyda (Xonadonda)',
    openMap: 'Google Maps xaritasida ko‘rish',
    calendar: 'Taqvimga saqlash',
    menAudience: '👔 Erkaklar majlisi',
    womenAudience: '👗 Ayollar davrasi',
  };

  const handleSaveToCalendar = () => {
    const title = `${hostNames} — ${eventType}`;
    const desc = `${venueName}, ${venueAddress}`;
    const cleanDate = eventDate.replace(/-/g, '');
    const cleanTime = startTime.replace(':', '') + '00';
    const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      title
    )}&dates=${cleanDate}T${cleanTime}/${cleanDate}T${cleanTime}&details=${encodeURIComponent(
      desc
    )}&location=${encodeURIComponent(venueAddress || venueName)}`;
    window.open(gCalUrl, '_blank');
  };

  const finalVenueDisplayName =
    venueLocationType === 'home' || venueName === 'Xonadonda' || !venueName
      ? labels.home
      : venueName;

  const resolvedMapUrl =
    mapUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${venueName || ''} ${venueAddress || ''}`
    )}`;

  return (
    <div
      className={`rounded-3xl p-6 sm:p-8 space-y-6 shadow-lg backdrop-blur-md border ${
        isDarkTheme
          ? 'bg-white/5 border-white/10 text-white'
          : 'bg-white/85 border-black/5 text-[#231E1B]'
      }`}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-left">
        {/* Date & Time */}
        <div className="flex items-start gap-3.5">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
            style={{
              backgroundColor: isDarkTheme ? `${primaryColor}20` : `${primaryColor}15`,
              color: primaryColor,
              border: `1px solid ${primaryColor}30`,
            }}
          >
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className={`text-[10px] uppercase font-bold tracking-wider ${isDarkTheme ? 'text-white/60' : 'text-[#7A6A63]'}`}>
              {labels.date}
            </span>
            <div className="text-sm font-bold mt-0.5">{eventDate}</div>
            <div className={`text-xs ${isDarkTheme ? 'text-white/70' : 'text-[#5C4F48]'}`}>
              {labels.time}: {startTime} {endTime ? `— ${endTime}` : ''}
            </div>
          </div>
        </div>

        {/* Venue & Address */}
        <div className="flex items-start gap-3.5">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
            style={{
              backgroundColor: isDarkTheme ? `${primaryColor}20` : `${primaryColor}15`,
              color: primaryColor,
              border: `1px solid ${primaryColor}30`,
            }}
          >
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <span className={`text-[10px] uppercase font-bold tracking-wider ${isDarkTheme ? 'text-white/60' : 'text-[#7A6A63]'}`}>
              {labels.venue}
            </span>
            <div className="text-sm font-bold mt-0.5">{finalVenueDisplayName}</div>
            {venueAddress && (
              <div className={`text-xs ${isDarkTheme ? 'text-white/70' : 'text-[#5C4F48]'}`}>
                {venueAddress}
              </div>
            )}
            {celebrationAudience && celebrationAudience !== 'all' && (
              <div className="mt-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D9658B]/15 text-[#D9658B] border border-[#D9658B]/20">
                  {celebrationAudience === 'men' ? labels.menAudience : labels.womenAudience}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Map */}
      {interactiveMap && <div className="pt-2">{interactiveMap}</div>}

      {/* Action Buttons */}
      <div className="pt-2 flex flex-col sm:flex-row gap-3">
        <a
          href={resolvedMapUrl}
          target="_blank"
          rel="noreferrer"
          className="flex-1 py-3 px-4 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow-xs hover:opacity-95 transition-opacity"
          style={{ backgroundColor: primaryColor }}
        >
          <MapPin className="w-4 h-4" />
          <span>{labels.openMap}</span>
          <ExternalLink className="w-3.5 h-3.5 ml-1" />
        </a>
        <button
          onClick={handleSaveToCalendar}
          className={`flex-1 py-3 px-4 rounded-2xl text-xs font-bold border flex items-center justify-center gap-2 shadow-xs transition-all ${
            isDarkTheme
              ? 'bg-white/10 hover:bg-white/20 text-white border-white/15'
              : 'bg-white hover:bg-black/5 text-[#231E1B] border-black/10'
          }`}
        >
          <Calendar className="w-4 h-4" style={{ color: primaryColor }} />
          <span>{labels.calendar}</span>
        </button>
      </div>
    </div>
  );
};
