import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check, AlertCircle } from 'lucide-react';
import { useLanguage, translations } from '../locales';
import { Language } from '../types';
import { getPortalRoot } from '../utils/portalRoot';

export interface CountryInfo {
  code: string;
  names: Record<Language, string>;
  dialCode: string;
  mask: string;
  digitCount: number;
  example: string;
}

export const COUNTRIES: CountryInfo[] = [
  { code: 'UZ', names: { uz: 'O‘zbekiston', ru: 'Узбекистан', en: 'Uzbekistan' }, dialCode: '+998', mask: '## ### ## ##', digitCount: 9, example: '90 123 45 67' },
  { code: 'RU', names: { uz: 'Rossiya', ru: 'Россия', en: 'Russia' }, dialCode: '+7', mask: '(###) ###-##-##', digitCount: 10, example: '(999) 123-45-67' },
  { code: 'KZ', names: { uz: 'Qozog‘iston', ru: 'Казахстан', en: 'Kazakhstan' }, dialCode: '+7', mask: '(###) ###-##-##', digitCount: 10, example: '(777) 123-45-67' },
  { code: 'KG', names: { uz: 'Qirg‘iziston', ru: 'Кыргызстан', en: 'Kyrgyzstan' }, dialCode: '+996', mask: '### ### ###', digitCount: 9, example: '555 123 456' },
  { code: 'TJ', names: { uz: 'Tojikiston', ru: 'Таджикистан', en: 'Tajikistan' }, dialCode: '+992', mask: '## ### ####', digitCount: 9, example: '92 123 4567' },
  { code: 'TM', names: { uz: 'Turkmaniston', ru: 'Туркменистан', en: 'Turkmenistan' }, dialCode: '+993', mask: '## ######', digitCount: 8, example: '65 123456' },
  { code: 'TR', names: { uz: 'Turkiya', ru: 'Турция', en: 'Turkey' }, dialCode: '+90', mask: '### ### ## ##', digitCount: 10, example: '532 123 45 67' },
  { code: 'AE', names: { uz: 'BAA (Dubay)', ru: 'ОАЭ (Дубай)', en: 'UAE (Dubai)' }, dialCode: '+971', mask: '## ### ####', digitCount: 9, example: '50 123 4567' },
  { code: 'SA', names: { uz: 'Saudiya Arabistoni', ru: 'Саудовская Аравия', en: 'Saudi Arabia' }, dialCode: '+966', mask: '## ### ####', digitCount: 9, example: '50 123 4567' },
  { code: 'US', names: { uz: 'AQSH / Kanada', ru: 'США / Канада', en: 'USA / Canada' }, dialCode: '+1', mask: '(###) ###-####', digitCount: 10, example: '(555) 123-4567' },
  { code: 'DE', names: { uz: 'Germaniya', ru: 'Германия', en: 'Germany' }, dialCode: '+49', mask: '### ########', digitCount: 11, example: '151 12345678' },
  { code: 'GB', names: { uz: 'Buyuk Britaniya', ru: 'Великобритания', en: 'United Kingdom' }, dialCode: '+44', mask: '#### ######', digitCount: 10, example: '7911 123456' },
  { code: 'KR', names: { uz: 'Janubiy Koreya', ru: 'Южная Корея', en: 'South Korea' }, dialCode: '+82', mask: '## #### ####', digitCount: 10, example: '10 1234 5678' },
  { code: 'JP', names: { uz: 'Yaponiya', ru: 'Япония', en: 'Japan' }, dialCode: '+81', mask: '## #### ####', digitCount: 10, example: '90 1234 5678' },
  { code: 'CN', names: { uz: 'Xitoy', ru: 'Китай', en: 'China' }, dialCode: '+86', mask: '### #### ####', digitCount: 11, example: '138 1234 5678' },
  { code: 'AZ', names: { uz: 'Ozarbayjon', ru: 'Азербайджан', en: 'Azerbaijan' }, dialCode: '+994', mask: '## ### ## ##', digitCount: 9, example: '50 123 45 67' },
];

export function applyMask(rawDigits: string, mask: string): string {
  let result = '';
  let digitIndex = 0;

  for (let i = 0; i < mask.length && digitIndex < rawDigits.length; i++) {
    if (mask[i] === '#') {
      result += rawDigits[digitIndex];
      digitIndex++;
    } else {
      result += mask[i];
    }
  }

  return result;
}

interface PhoneInputProps {
  value: string;
  onChange: (fullPhoneNumber: string, isValid: boolean) => void;
  required?: boolean;
  error?: string;
  className?: string;
  id?: string;
  placeholder?: string;
  autoFocus?: boolean;
  language?: Language;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  required = false,
  error,
  className = '',
  id,
  autoFocus = false,
  language,
}) => {
  const { language: ctxLanguage } = useLanguage();
  const activeLang = language || ctxLanguage;
  const t = translations[activeLang] || translations.uz;

  const [selectedCountry, setSelectedCountry] = useState<CountryInfo>(() => {
    if (!value) return COUNTRIES[0];
    const match = COUNTRIES.find((c) => value.startsWith(c.dialCode));
    return match || COUNTRIES[0];
  });

  const [digits, setDigits] = useState<string>(() => {
    if (!value) return '';
    if (value.startsWith(selectedCountry.dialCode)) {
      const remaining = value.slice(selectedCountry.dialCode.length);
      return remaining.replace(/\D/g, '').slice(0, selectedCountry.digitCount);
    }
    return value.replace(/\D/g, '').slice(0, selectedCountry.digitCount);
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; left: number; width: number; maxHeight: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const portalMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const numberInputRef = useRef<HTMLInputElement>(null);

  const updateMenuPosition = useCallback(() => {
    if (!dropdownRef.current) return;
    const rect = dropdownRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 8;
    const width = Math.min(288, vw - margin * 2);
    const left = Math.max(margin, Math.min(rect.left, vw - width - margin));
    const spaceBelow = vh - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const openUpward = spaceBelow < 200 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(160, Math.min(288, (openUpward ? spaceAbove : spaceBelow) - 4));
    setMenuPos({
      top: openUpward ? undefined : rect.bottom + 6,
      bottom: openUpward ? vh - rect.top + 6 : undefined,
      left,
      width,
      maxHeight,
    });
  }, []);

  useLayoutEffect(() => {
    if (isDropdownOpen) {
      updateMenuPosition();
    } else {
      setMenuPos(null);
    }
  }, [isDropdownOpen, updateMenuPosition]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        (!portalMenuRef.current || !portalMenuRef.current.contains(target))
      ) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('resize', updateMenuPosition);
      window.addEventListener('scroll', updateMenuPosition, true);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isDropdownOpen, updateMenuPosition]);

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return COUNTRIES;
    const q = searchQuery.toLowerCase().trim();
    return COUNTRIES.filter(
      (c) =>
        c.names[activeLang].toLowerCase().includes(q) ||
        c.names.uz.toLowerCase().includes(q) ||
        c.names.en.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [searchQuery, activeLang]);

  const formattedNumber = useMemo(() => {
    return applyMask(digits, selectedCountry.mask);
  }, [digits, selectedCountry]);

  const handleDigitsChange = (newDigitsRaw: string) => {
    const cleaned = newDigitsRaw.replace(/\D/g, '').slice(0, selectedCountry.digitCount);
    setDigits(cleaned);

    const formatted = applyMask(cleaned, selectedCountry.mask);
    const fullValue = cleaned.length > 0 ? `${selectedCountry.dialCode} ${formatted}` : '';
    const isValid = cleaned.length === selectedCountry.digitCount;

    onChange(fullValue, isValid);
  };

  const handleCountrySelect = (country: CountryInfo) => {
    setSelectedCountry(country);
    setIsDropdownOpen(false);
    setSearchQuery('');

    const adjustedDigits = digits.slice(0, country.digitCount);
    setDigits(adjustedDigits);

    const formatted = applyMask(adjustedDigits, country.mask);
    const fullValue = adjustedDigits.length > 0 ? `${country.dialCode} ${formatted}` : '';
    const isValid = adjustedDigits.length === country.digitCount;

    onChange(fullValue, isValid);
    setTimeout(() => numberInputRef.current?.focus(), 100);
  };

  const remainingDigits = selectedCountry.digitCount - digits.length;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div
        className={`relative flex items-center rounded-[var(--lg-radius)] glass-surface-subtle bg-white/80 min-h-[44px] focus-within:bg-white/95 focus-within:ring-2 focus-within:ring-[#D66389]/35 focus-within:border-[#D66389]/60 transition-all ${
          error ? 'ring-2 ring-rose-500/40 border-rose-400' : ''
        }`}
      >
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="min-h-[44px] px-3 flex items-center gap-1.5 bg-white/55 hover:bg-white/90 rounded-l-[var(--lg-radius)] border-r border-black/10 text-xs font-bold text-[#1E1418] transition-colors select-none shrink-0 cursor-pointer"
            title={`${selectedCountry.names[activeLang]} (${selectedCountry.dialCode})`}
            aria-label={t.shared.phoneCountryAria}
            aria-expanded={isDropdownOpen}
          >
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-[#1E1418]/10 text-[9px] font-extrabold tracking-tight text-[#1E1418]">
              {selectedCountry.code}
            </span>
            <span className="font-mono tabular-nums text-xs font-bold text-[#1E1418]">{selectedCountry.dialCode}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-[#4A383F] transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-[#9E3E60]' : ''}`} aria-hidden="true" />
          </button>

          {isDropdownOpen &&
            menuPos &&
            getPortalRoot() &&
            createPortal(
              <div
                ref={portalMenuRef}
                style={{
                  position: 'fixed',
                  top: menuPos.top,
                  bottom: menuPos.bottom,
                  left: menuPos.left,
                  width: menuPos.width,
                  maxHeight: menuPos.maxHeight,
                }}
                className="glass-surface-elevated rounded-[var(--lg-radius-lg)] shadow-2xl border border-white/95 z-[9500] overflow-hidden flex flex-col animate-fadeIn"
              >
                <div className="p-2.5 border-b border-black/5 bg-white/60 sticky top-0">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#4A383F] absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t.shared.phoneSearchPlaceholder}
                      className="w-full pl-8 pr-3 py-1.5 bg-white/90 rounded-xl border border-black/10 text-xs text-[#1E1418] placeholder-[#7A6A63] outline-none focus:ring-2 focus:ring-[#D66389]/35 focus:border-[#D66389]/60"
                    />
                  </div>
                </div>

                <div className="overflow-y-auto flex-1 divide-y divide-black/5">
                  {filteredCountries.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#4A383F]">
                      {t.shared.phoneNotFound}
                    </div>
                  ) : (
                    filteredCountries.map((c) => {
                      const isSelected = c.code === selectedCountry.code && c.dialCode === selectedCountry.dialCode;
                      return (
                        <button
                          key={`${c.code}-${c.dialCode}`}
                          type="button"
                          onClick={() => handleCountrySelect(c)}
                          className={`w-full px-3 py-2.5 text-left text-xs flex items-center justify-between hover:bg-white/80 transition-colors cursor-pointer ${
                            isSelected ? 'bg-rose-50/90 text-[#9E3E60] font-bold' : 'text-[#1E1418]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="inline-flex items-center justify-center w-6 py-0.5 rounded bg-black/5 text-[9px] font-extrabold text-[#1E1418] shrink-0">
                              {c.code}
                            </span>
                            <span className="truncate">{c.names[activeLang]}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 pl-2">
                            <span className="font-mono tabular-nums text-xs text-[#4A383F] font-semibold">{c.dialCode}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#9E3E60]" aria-hidden="true" />}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>,
              getPortalRoot()!
            )}
        </div>

        <input
          ref={numberInputRef}
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          autoFocus={autoFocus}
          value={formattedNumber}
          onChange={(e) => handleDigitsChange(e.target.value)}
          placeholder={selectedCountry.example}
          required={required}
          className="flex-1 min-h-[44px] px-3.5 bg-transparent text-xs sm:text-[13px] font-mono tabular-nums font-bold text-[#1E1418] placeholder:text-[#7A6A63] placeholder:font-normal outline-none"
        />

        {digits.length > 0 && (
          <div className="pr-3 flex items-center">
            {digits.length === selectedCountry.digitCount ? (
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold" title={t.shared.phoneComplete}>
                ✓
              </span>
            ) : (
              <span
                className="text-[10px] font-mono tabular-nums text-[#4A383F]"
                title={`${t.shared.phoneRemainingPrefix} ${remainingDigits} ${t.shared.phoneRemainingSuffix}`}
              >
                {digits.length}/{selectedCountry.digitCount}
              </span>
            )}
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50/90 border border-rose-200/80 text-[11px] font-semibold text-rose-700 animate-fadeIn"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
