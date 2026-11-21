import React, { useEffect, useRef, useState } from 'react';
import { Search, MapPin, LocateFixed, Link2, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '../locales';
import { Language } from '../types';
import { VenueMap } from './VenueMap';
import { isShortMapLink, isValidLatLng, looksLikeMapLink, parseCoordsFromText } from '../utils/mapLinks';

interface LocationPickerMapProps {
  latitude?: number;
  longitude?: number;
  /** `sourceLink` is set when the place came from a pasted Yandex / Google link. */
  onLocationSelect: (lat: number, lng: number, detectedAddress?: string, sourceLink?: string) => void;
  className?: string;
  language?: Language;
}

interface SearchResult {
  lat: number;
  lng: number;
  title: string;
  subtitle: string;
}

const LABELS = {
  uz: {
    searchPlaceholder: 'To‘yxona nomi yoki manzil',
    search: 'Qidirish',
    gps: 'Hozir turgan joyim',
    linkPlaceholder: 'Havolani qo‘ying',
    linkLabel: 'Yoki xarita havolasini qo‘ying (eng aniq usul):',
    linkApply: 'Qo‘shish',
    noResults: 'Hech narsa topilmadi. Boshqacha yozib ko‘ring yoki xarita havolasini qo‘ying.',
    searchFailed: 'Qidiruvda xatolik. Internetni tekshirib, qayta urinib ko‘ring.',
    badLink: 'Havoladan joylashuvni aniqlab bo‘lmadi. Xaritada joyni ochib, “Ulashish” havolasini nusxalang.',
    gpsUnsupported: 'Brauzeringiz joylashuvni aniqlay olmaydi.',
    gpsDenied: 'Joylashuvga ruxsat berilmadi. Brauzer sozlamalaridan ruxsat bering.',
    selected: 'Joy belgilandi',
    notSelected: 'Hali joy tanlanmadi — yuqorida qidiring',
    tip: 'Maslahat: to‘yxona Yandex yoki Google xaritada bo‘lsa, uning havolasini qo‘yish eng aniq usul.',
  },
  ru: {
    searchPlaceholder: 'Ресторан или адрес',
    search: 'Найти',
    gps: 'Моё местоположение',
    linkPlaceholder: 'Вставьте ссылку',
    linkLabel: 'Или вставьте ссылку на карту (самый точный способ):',
    linkApply: 'Добавить',
    noResults: 'Ничего не найдено. Попробуйте иначе или вставьте ссылку на карту.',
    searchFailed: 'Ошибка поиска. Проверьте интернет и попробуйте снова.',
    badLink: 'Не удалось определить место по ссылке. Откройте место на карте и скопируйте ссылку «Поделиться».',
    gpsUnsupported: 'Браузер не поддерживает геолокацию.',
    gpsDenied: 'Доступ к геолокации запрещён. Разрешите его в настройках браузера.',
    selected: 'Место выбрано',
    notSelected: 'Место ещё не выбрано — найдите его выше',
    tip: 'Совет: самый точный способ — вставить ссылку на заведение из Яндекс или Google Карт.',
  },
  en: {
    searchPlaceholder: 'Venue or address',
    search: 'Search',
    gps: 'My location',
    linkPlaceholder: 'Paste link',
    linkLabel: 'Or paste a map link (most accurate):',
    linkApply: 'Add',
    noResults: 'Nothing found. Try different words or paste a map link.',
    searchFailed: 'Search failed. Check your connection and try again.',
    badLink: 'Could not read a location from this link. Open the place on the map and copy its “Share” link.',
    gpsUnsupported: 'Your browser cannot detect location.',
    gpsDenied: 'Location access was denied. Allow it in your browser settings.',
    selected: 'Location set',
    notSelected: 'No location yet — search above',
    tip: 'Tip: pasting the venue’s Yandex or Google Maps link is the most accurate way.',
  },
};

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

async function reverseGeocode(lat: number, lng: number, lang: string): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&accept-language=${lang},uz,ru`
    );
    if (!res.ok) return '';
    const data = await res.json();
    return typeof data?.display_name === 'string' ? data.display_name : '';
  } catch {
    return '';
  }
}

/**
 * Simple, beginner-friendly venue picker: search by name, use GPS, or paste a Yandex / Google link.
 * The chosen place is previewed on Yandex Maps / Google Maps.
 */
export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  latitude,
  longitude,
  onLocationSelect,
  className = '',
  language,
}) => {
  const { language: ctxLanguage } = useLanguage();
  const lang = (language || ctxLanguage || 'uz') as keyof typeof LABELS;
  const l = LABELS[lang] || LABELS.uz;

  const hasPoint = isValidLatLng(latitude, longitude);
  const [query, setQuery] = useState('');
  const [link, setLink] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [busy, setBusy] = useState<'search' | 'gps' | 'link' | null>(null);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const select = async (lat: number, lng: number, address?: string, sourceLink?: string) => {
    const la = round6(lat);
    const ln = round6(lng);
    setResults([]);
    setError('');
    // Report the point immediately; fill in the address once it is known.
    onLocationSelect(la, ln, address, sourceLink);
    if (!address) {
      const found = await reverseGeocode(la, ln, lang);
      if (found) onLocationSelect(la, ln, found, sourceLink);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q || busy) return;

    // People often paste a link or coordinates into the search box — handle that too.
    if (looksLikeMapLink(q) || parseCoordsFromText(q)) {
      setLink(q);
      await applyLink(q);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy('search');
    setError('');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=uz&limit=5&accept-language=${lang},uz,ru&q=${encodeURIComponent(q)}`,
        { signal: controller.signal }
      );
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string; name?: string }>;
      const list: SearchResult[] = (Array.isArray(data) ? data : [])
        .map((item) => {
          const parts = String(item.display_name || '').split(',').map((s) => s.trim());
          return {
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            title: item.name || parts[0] || q,
            subtitle: parts.slice(item.name ? 0 : 1).join(', '),
          };
        })
        .filter((r) => isValidLatLng(r.lat, r.lng));
      if (list.length === 0) {
        setError(l.noResults);
      } else if (list.length === 1) {
        await select(list[0].lat, list[0].lng, [list[0].title, list[0].subtitle].filter(Boolean).join(', '));
      } else {
        setResults(list);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') setError(l.searchFailed);
    } finally {
      setBusy(null);
    }
  };

  const applyLink = async (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    setBusy('link');
    setError('');
    try {
      let coords = parseCoordsFromText(value);
      if (!coords && (isShortMapLink(value) || looksLikeMapLink(value))) {
        const res = await fetch(`/api/maps/resolve?url=${encodeURIComponent(value)}`);
        const data = await res.json().catch(() => null);
        if (data?.ok && typeof data.url === 'string') {
          coords = parseCoordsFromText(data.url);
        }
      }
      if (!coords) {
        setError(l.badLink);
        return;
      }
      const source = looksLikeMapLink(value) ? (/^https?:\/\//i.test(value) ? value : `https://${value}`) : undefined;
      await select(coords.lat, coords.lng, undefined, source);
      setLink('');
      setQuery('');
    } catch {
      setError(l.badLink);
    } finally {
      setBusy(null);
    }
  };

  const handleGps = () => {
    setError('');
    if (!navigator.geolocation) {
      setError(l.gpsUnsupported);
      return;
    }
    setBusy('gps');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await select(pos.coords.latitude, pos.coords.longitude);
        setBusy(null);
      },
      () => {
        setError(l.gpsDenied);
        setBusy(null);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  };

  return (
    <div className={`space-y-3 rounded-2xl border border-black/10 bg-white shadow-sm p-3 sm:p-4 ${className}`}>
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-[#7A6A63] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={l.searchPlaceholder}
            aria-label={l.searchPlaceholder}
            className="w-full min-h-[46px] pl-9 pr-3 rounded-xl bg-[#F7F3F1] border border-black/5 text-sm outline-none focus:bg-white focus:border-[#D9658B] transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy !== null || !query.trim()}
            className="flex-1 sm:flex-none min-h-[46px] px-5 rounded-xl bg-[#1E1418] text-white hover:bg-black disabled:opacity-50 text-sm font-bold transition-colors inline-flex items-center justify-center gap-1.5"
          >
            {busy === 'search' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : null}
            {l.search}
          </button>
          <button
            type="button"
            onClick={handleGps}
            disabled={busy !== null}
            className="flex-1 sm:flex-none min-h-[46px] px-3.5 rounded-xl bg-[#E8F3FA] text-[#1E3A5F] hover:bg-[#B9DFFA] disabled:opacity-50 text-sm font-semibold transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            {busy === 'gps' ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <LocateFixed className="w-4 h-4" aria-hidden="true" />
            )}
            {l.gps}
          </button>
        </div>
      </form>

      {results.length > 0 && (
        <ul className="rounded-xl border border-black/10 divide-y divide-black/5 overflow-hidden">
          {results.map((r, i) => (
            <li key={`${r.lat},${r.lng},${i}`}>
              <button
                type="button"
                onClick={() => select(r.lat, r.lng, [r.title, r.subtitle].filter(Boolean).join(', '))}
                className="w-full text-left px-3 py-2.5 hover:bg-[#FCEEF4] transition-colors flex items-start gap-2"
              >
                <MapPin className="w-4 h-4 mt-0.5 text-[#D9658B] shrink-0" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[#1E1418] truncate">{r.title}</span>
                  {r.subtitle && <span className="block text-xs text-[#7A6A63] line-clamp-2">{r.subtitle}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs font-semibold text-[#4A3E39] pt-1">{l.linkLabel}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          applyLink(link);
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1 min-w-0">
          <Link2 className="w-4 h-4 text-[#7A6A63] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            type="text"
            inputMode="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData('text');
              if (pasted && (looksLikeMapLink(pasted) || parseCoordsFromText(pasted))) {
                e.preventDefault();
                setLink(pasted);
                applyLink(pasted);
              }
            }}
            placeholder={l.linkPlaceholder}
            aria-label={l.linkPlaceholder}
            className="w-full min-h-[44px] pl-9 pr-3 rounded-xl bg-[#F7F3F1] border border-dashed border-black/15 text-sm outline-none focus:bg-white focus:border-[#D9658B] transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={busy !== null || !link.trim()}
          className="min-h-[44px] px-4 rounded-xl border border-black/10 bg-white hover:bg-black/5 disabled:opacity-50 text-sm font-semibold transition-colors inline-flex items-center gap-1.5"
        >
          {busy === 'link' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : null}
          {l.linkApply}
        </button>
      </form>

      {error && (
        <div role="alert" className="flex items-start gap-1.5 text-xs font-medium text-rose-700 bg-rose-50 px-3 py-2 rounded-xl border border-rose-200">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {hasPoint ? (
        <>
          <VenueMap latitude={latitude} longitude={longitude} language={lang} height={240} showRouteButtons={false} />
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
            <Check className="w-4 h-4" aria-hidden="true" />
            {l.selected}
          </div>
        </>
      ) : (
        <div className="rounded-xl bg-[#F7F3F1] border border-dashed border-black/10 px-3 py-6 text-center text-xs text-[#7A6A63]">
          <MapPin className="w-5 h-5 mx-auto mb-1.5 text-[#D9658B]" aria-hidden="true" />
          {l.notSelected}
        </div>
      )}

    </div>
  );
};

export default LocationPickerMap;
