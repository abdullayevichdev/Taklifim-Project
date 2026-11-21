import React, { useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import type { Language } from '../types';
import {
  googleEmbedUrl,
  googleRouteUrl,
  isValidLatLng,
  MapProvider,
  yandexEmbedUrl,
  yandexRouteUrl,
} from '../utils/mapLinks';

interface VenueMapProps {
  latitude?: number;
  longitude?: number;
  /** Used when there are no coordinates (search by venue name / address). */
  query?: string;
  language?: Language | string;
  className?: string;
  /** Height of the map frame in px. */
  height?: number;
  showRouteButtons?: boolean;
  defaultProvider?: MapProvider;
}

const LABELS = {
  uz: { yandex: 'Yandex xarita', google: 'Google Maps', routeYandex: 'Yandex orqali yo‘l', routeGoogle: 'Google orqali yo‘l', loading: 'Xarita yuklanmoqda…' },
  ru: { yandex: 'Яндекс Карты', google: 'Google Maps', routeYandex: 'Маршрут в Яндекс', routeGoogle: 'Маршрут в Google', loading: 'Карта загружается…' },
  en: { yandex: 'Yandex Maps', google: 'Google Maps', routeYandex: 'Route in Yandex', routeGoogle: 'Route in Google', loading: 'Loading map…' },
};

/**
 * Venue map with a Yandex / Google switch and one-tap route buttons.
 * Uses the official keyless embed widgets, so it works without any API key.
 */
export const VenueMap: React.FC<VenueMapProps> = ({
  latitude,
  longitude,
  query = '',
  language = 'uz',
  className = '',
  height = 260,
  showRouteButtons = true,
  defaultProvider = 'yandex',
}) => {
  const [provider, setProvider] = useState<MapProvider>(defaultProvider);
  const [loadedSrc, setLoadedSrc] = useState('');
  const l = LABELS[(language as keyof typeof LABELS) || 'uz'] || LABELS.uz;

  const point = isValidLatLng(latitude, longitude) ? { lat: latitude as number, lng: longitude as number } : null;
  const cleanQuery = query.trim();
  if (!point && !cleanQuery) return null;

  const src =
    provider === 'yandex'
      ? yandexEmbedUrl(point, cleanQuery, String(language))
      : googleEmbedUrl(point, cleanQuery, String(language));

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="relative rounded-2xl overflow-hidden border border-black/10 bg-[#F3EEEA] shadow-sm" style={{ height }}>
        {loadedSrc !== src && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-xs font-semibold text-[#7A6A63] animate-pulse">
            <MapPin className="w-4 h-4" aria-hidden="true" />
            {l.loading}
          </div>
        )}
        <iframe
          key={src}
          title={provider === 'yandex' ? l.yandex : l.google}
          src={src}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          onLoad={() => setLoadedSrc(src)}
          className="relative w-full h-full border-0"
        />
        <div
          role="tablist"
          aria-label="Map provider"
          className="absolute top-2 left-2 flex gap-1 p-1 rounded-full bg-white/92 shadow-md border border-black/5 backdrop-blur"
        >
          {(['yandex', 'google'] as MapProvider[]).map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={provider === p}
              onClick={() => setProvider(p)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${
                provider === p ? 'bg-[#1E1418] text-white' : 'text-[#4A3E39] hover:bg-black/5'
              }`}
            >
              {p === 'yandex' ? l.yandex : l.google}
            </button>
          ))}
        </div>
      </div>

      {showRouteButtons && (
        <div className="grid grid-cols-2 gap-2">
          <a
            href={yandexRouteUrl(point, cleanQuery)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-2xl bg-[#FC3F1D] text-white hover:bg-[#D92C0D] shadow-sm transition-colors text-xs font-bold text-center"
          >
            <Navigation className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{l.routeYandex}</span>
          </a>
          <a
            href={googleRouteUrl(point, cleanQuery)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-2xl bg-[#1A73E8] text-white hover:bg-[#1557B0] shadow-sm transition-colors text-xs font-bold text-center"
          >
            <Navigation className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{l.routeGoogle}</span>
          </a>
        </div>
      )}
    </div>
  );
};

export default VenueMap;
