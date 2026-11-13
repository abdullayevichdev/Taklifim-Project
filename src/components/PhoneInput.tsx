import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { useLanguage, translations } from '../locales';
import { Language } from '../types';

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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const numberInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isDropdownOpen]);

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
    <div className={`space-y-1 ${className}`}>
      <div className="relative flex items-center rounded-xl bg-white border border-black/10 focus-within:border-[#D9658B] focus-within:ring-2 focus-within:ring-[#D9658B]/20 transition-all shadow-xs">
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="h-11 px-3 flex items-center gap-1.5 bg-black/5 hover:bg-black/10 rounded-l-xl border-r border-black/10 text-xs font-bold text-[#1E1418] transition-colors select-none shrink-0"
            title={`${selectedCountry.names[activeLang]} (${selectedCountry.dialCode})`}
            aria-label={t.shared.phoneCountryAria}
          >
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-[#231E1B]/10 text-[9px] font-extrabold tracking-tight text-[#231E1B]">
              {selectedCountry.code}
            </span>
            <span className="font-mono text-xs font-bold text-[#231E1B]">{selectedCountry.dialCode}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-[#7A6A63] transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-12 left-0 w-72 max-h-72 bg-white rounded-2xl shadow-2xl border border-black/10 z-[9999] overflow-hidden flex flex-col animate-fadeIn">
              <div className="p-2.5 border-b border-black/5 bg-gray-50/80 sticky top-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.shared.phoneSearchPlaceholder}
                    className="w-full pl-8 pr-3 py-1.5 bg-white rounded-lg border border-black/10 text-xs outline-none focus:border-[#D9658B]"
                  />
                </div>
              </div>

              <div className="overflow-y-auto flex-1 divide-y divide-black/5">
                {filteredCountries.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-400">
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
                        className={`w-full px-3 py-2.5 text-left text-xs flex items-center justify-between hover:bg-black/5 transition-colors ${
                          isSelected ? 'bg-pink-50 text-[#D9658B] font-bold' : 'text-[#231E1B]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="inline-flex items-center justify-center w-6 py-0.5 rounded bg-black/5 text-[9px] font-extrabold text-[#231E1B] shrink-0">
                            {c.code}
                          </span>
                          <span className="truncate">{c.names[activeLang]}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 pl-2">
                          <span className="font-mono text-xs text-gray-500 font-semibold">{c.dialCode}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#D9658B]" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
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
          className="flex-1 h-11 px-3.5 bg-transparent text-xs font-mono font-bold text-[#1E1418] placeholder:text-gray-400 placeholder:font-normal outline-none"
        />

        {digits.length > 0 && (
          <div className="pr-3 flex items-center">
            {digits.length === selectedCountry.digitCount ? (
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold" title={t.shared.phoneComplete}>
                ✓
              </span>
            ) : (
              <span
                className="text-[10px] font-mono text-gray-400"
                title={`${t.shared.phoneRemainingPrefix} ${remainingDigits} ${t.shared.phoneRemainingSuffix}`}
              >
                {digits.length}/{selectedCountry.digitCount}
              </span>
            )}
          </div>
        )}
      </div>

      {error && (
        <span className="text-rose-600 text-[11px] font-medium block animate-fadeIn">
          {error}
        </span>
      )}
    </div>
  );
};
