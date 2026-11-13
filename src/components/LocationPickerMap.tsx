import React, { useEffect, useRef, useState } from 'react';
import { Search, MapPin, Compass, Check, AlertCircle } from 'lucide-react';
import { useLanguage, translations } from '../locales';
import { Language } from '../types';

interface LocationPickerMapProps {
  latitude?: number;
  longitude?: number;
  onLocationSelect: (lat: number, lng: number, detectedAddress?: string) => void;
  className?: string;
  language?: Language;
}

const DEFAULT_LAT = 41.3217;
const DEFAULT_LNG = 69.2415;

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  latitude = DEFAULT_LAT,
  longitude = DEFAULT_LNG,
  onLocationSelect,
  className = '',
  language,
}) => {
  const { language: ctxLanguage } = useLanguage();
  const activeLang = language || ctxLanguage;
  const t = translations[activeLang] || translations.uz;

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: latitude || DEFAULT_LAT,
    lng: longitude || DEFAULT_LNG,
  });

  const fetchAddress = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': `${activeLang},uz,ru,en` } }
      );
      if (res.ok) {
        const data = await res.json();
        return data.display_name || '';
      }
    } catch {
      // ignore
    }
    return '';
  };

  useEffect(() => {
    let L: any;

    const init = async () => {
      try {
        L = await import('leaflet');

        if (!mapContainerRef.current) return;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
        }

        const map = L.map(mapContainerRef.current, {
          center: [currentCoords.lat, currentCoords.lng],
          zoom: 15,
          zoomControl: true,
        });

        mapInstanceRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap',
        }).addTo(map);

        const customIcon = L.divIcon({
          html: `
            <div style="
              background: #D9658B;
              width: 38px;
              height: 38px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              border: 3px solid white;
              box-shadow: 0 4px 15px rgba(217,101,139,0.5);
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
            ">
              <div style="transform: rotate(45deg); color: white; font-size: 16px; margin-top: -2px;">📍</div>
            </div>
          `,
          iconSize: [38, 38],
          iconAnchor: [19, 38],
          popupAnchor: [0, -38],
        });

        const marker = L.marker([currentCoords.lat, currentCoords.lng], {
          icon: customIcon,
          draggable: true,
        }).addTo(map);

        markerRef.current = marker;

        marker.bindPopup(`<b>${t.shared.mapDragHint}</b><br>${t.shared.mapDragSub}`).openPopup();

        map.on('click', async (e: any) => {
          setGpsError(null);
          const lat = parseFloat(e.latlng.lat.toFixed(5));
          const lng = parseFloat(e.latlng.lng.toFixed(5));
          setCurrentCoords({ lat, lng });
          marker.setLatLng([lat, lng]);
          const addr = await fetchAddress(lat, lng);
          onLocationSelect(lat, lng, addr);
        });

        marker.on('dragend', async () => {
          setGpsError(null);
          const pos = marker.getLatLng();
          const lat = parseFloat(pos.lat.toFixed(5));
          const lng = parseFloat(pos.lng.toFixed(5));
          setCurrentCoords({ lat, lng });
          const addr = await fetchAddress(lat, lng);
          onLocationSelect(lat, lng, addr);
        });
      } catch (err) {
        console.warn('Map initialization note:', err);
      }
    };

    init();

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        } catch {
          // ignore
        }
      }
    };
  }, []);

  useEffect(() => {
    if (latitude && longitude && mapInstanceRef.current && markerRef.current) {
      if (latitude !== currentCoords.lat || longitude !== currentCoords.lng) {
        setCurrentCoords({ lat: latitude, lng: longitude });
        markerRef.current.setLatLng([latitude, longitude]);
        mapInstanceRef.current.setView([latitude, longitude], 16);
      }
    }
  }, [latitude, longitude]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || isSearching) return;

    setGpsError(null);
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery + ', Uzbekistan'
        )}&limit=1`,
        { headers: { 'Accept-Language': `${activeLang},uz,ru,en` } }
      );
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const item = results[0];
          const lat = parseFloat(parseFloat(item.lat).toFixed(5));
          const lng = parseFloat(parseFloat(item.lon).toFixed(5));
          setCurrentCoords({ lat, lng });

          if (mapInstanceRef.current && markerRef.current) {
            mapInstanceRef.current.flyTo([lat, lng], 16);
            markerRef.current.setLatLng([lat, lng]);
            markerRef.current.bindPopup(`<b>${searchQuery}</b><br>${item.display_name}`).openPopup();
          }

          onLocationSelect(lat, lng, item.display_name);
        }
      }
    } catch (err) {
      console.warn('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCurrentGPS = () => {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError(t.shared.mapGpsUnsupported);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(5));
        const lng = parseFloat(pos.coords.longitude.toFixed(5));
        setCurrentCoords({ lat, lng });

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 17);
          markerRef.current.setLatLng([lat, lng]);
          markerRef.current.bindPopup(`<b>${t.shared.mapYouAreHere}</b>`).openPopup();
        }

        const addr = await fetchAddress(lat, lng);
        onLocationSelect(lat, lng, addr);
      },
      () => {
        setGpsError(t.shared.mapGpsDenied);
      }
    );
  };

  return (
    <div className={`space-y-2 rounded-2xl overflow-hidden border border-black/10 bg-white shadow-sm p-3 ${className}`}>
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#7A6A63] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.shared.mapSearchFullPlaceholder}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/5 border border-black/5 text-xs outline-none focus:bg-white focus:border-[#D9658B] transition-all"
          />
        </div>
        <button
          type="submit"
          disabled={isSearching}
          className="px-4 py-2 rounded-xl bg-[#1E1418] text-white hover:bg-black text-xs font-bold shrink-0 transition-all"
        >
          {isSearching ? t.shared.mapSearchingBtn : t.shared.mapSearchBtn}
        </button>
        <button
          type="button"
          onClick={handleCurrentGPS}
          className="p-2 rounded-xl bg-[#E8F3FA] text-[#1E3A5F] hover:bg-[#B9DFFA] shrink-0 transition-all"
          title={t.shared.mapMyGpsBtn}
          aria-label={t.shared.mapMyGpsBtn}
        >
          <Compass className="w-4 h-4" />
        </button>
      </form>

      {gpsError && (
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-rose-600 bg-rose-50 px-2.5 py-1.5 rounded-xl border border-rose-200">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{gpsError}</span>
        </div>
      )}

      <div className="relative rounded-xl overflow-hidden border border-black/10" style={{ height: '260px' }}>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossOrigin="" />
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

        <div className="absolute top-2 left-2 z-[400] bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg shadow-sm border border-black/5 text-[10px] font-bold text-[#1E1418] flex items-center gap-1.5 pointer-events-none">
          <MapPin className="w-3 h-3 text-[#D9658B]" />
          <span>{t.shared.mapTapHint}</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] pt-1">
        <span className="text-[#5C4F48] flex items-center gap-1">
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span>{t.shared.mapSelectedPoint}</span>
        </span>
        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
          {currentCoords.lat}, {currentCoords.lng}
        </span>
      </div>
    </div>
  );
};
