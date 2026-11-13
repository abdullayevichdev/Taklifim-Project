import React, { useEffect, useRef } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { useLanguage, translations } from '../locales';
import { Language } from '../types';

interface InteractiveMapProps {
  latitude?: number;
  longitude?: number;
  venueName: string;
  venueAddress: string;
  mapUrl?: string;
  primaryColor?: string;
  className?: string;
  language?: Language;
}

const DEFAULT_LAT = 41.2995;
const DEFAULT_LNG = 69.2401;

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  latitude,
  longitude,
  venueName,
  venueAddress,
  mapUrl,
  primaryColor = '#B48B47',
  className = '',
  language,
}) => {
  const { language: ctxLanguage } = useLanguage();
  const activeLang = language || ctxLanguage;
  const t = translations[activeLang] || translations.uz;

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);

  const lat = latitude || DEFAULT_LAT;
  const lng = longitude || DEFAULT_LNG;

  useEffect(() => {
    let L: typeof import('leaflet');
    let map: ReturnType<typeof import('leaflet').map>;

    const initMap = async () => {
      try {
        L = await import('leaflet');

        const DefaultIcon = L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        });
        L.Marker.prototype.options.icon = DefaultIcon;

        if (!mapRef.current) return;

        if (mapInstanceRef.current) {
          (mapInstanceRef.current as ReturnType<typeof L.map>).remove();
        }

        map = L.map(mapRef.current, {
          center: [lat, lng],
          zoom: 15,
          zoomControl: true,
          scrollWheelZoom: false,
        });

        mapInstanceRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        const customIcon = L.divIcon({
          html: `
            <div style="
              background: ${primaryColor};
              width: 36px;
              height: 36px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              border: 3px solid white;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <div style="
                transform: rotate(45deg);
                color: white;
                font-size: 14px;
                margin-top: -2px;
              ">📍</div>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 36],
          popupAnchor: [0, -36],
          className: '',
        });

        const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
        marker
          .bindPopup(
            `
            <div style="font-family: system-ui, sans-serif; min-width: 160px;">
              <strong style="font-size: 13px; color: #231E1B; display: block; margin-bottom: 4px;">
                ${venueName}
              </strong>
              <p style="font-size: 11px; color: #7A6A63; margin: 0;">
                ${venueAddress}
              </p>
            </div>
          `,
            { maxWidth: 220 }
          )
          .openPopup();

        map.setView([lat, lng], 15);
      } catch (err) {
        console.warn('Leaflet map init note:', err);
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        try {
          (mapInstanceRef.current as ReturnType<typeof import('leaflet').map>).remove();
          mapInstanceRef.current = null;
        } catch {
          // ignore
        }
      }
    };
  }, [lat, lng, venueName, venueAddress, primaryColor]);

  const googleRouteUrl = mapUrl && mapUrl.includes('google')
    ? mapUrl
    : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const yandexMapsUrl = mapUrl && mapUrl.includes('yandex')
    ? mapUrl
    : `https://yandex.uz/maps/?rtext=~${lat}%2C${lng}&rtt=auto`;

  return (
    <div className={`space-y-3 ${className}`}>
      <div
        className="relative rounded-2xl overflow-hidden border border-black/10 shadow-sm"
        style={{ height: '280px' }}
      >
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          crossOrigin=""
        />

        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        <div
          className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(255,255,255,0.3), transparent)',
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <a
          href={googleRouteUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-[#4285F4] text-white hover:bg-[#3367D6] shadow-sm transition-all text-xs font-bold"
        >
          <Navigation className="w-4 h-4" />
          <span>{t.shared.mapGoogleBtn}</span>
        </a>

        <a
          href={yandexMapsUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-[#FC3F1D] text-white hover:bg-[#D92C0D] shadow-sm transition-all text-xs font-bold"
        >
          <MapPin className="w-4 h-4" />
          <span>{t.shared.mapYandexBtn}</span>
        </a>
      </div>

      <div className="flex items-center gap-2 text-xs text-[#5C4F48] bg-black/5 p-2.5 rounded-xl border border-black/5">
        <MapPin className="w-4 h-4 shrink-0 text-[#E27B9B]" />
        <span className="font-medium truncate">{venueName}: {venueAddress}</span>
      </div>
    </div>
  );
};

export default InteractiveMap;
