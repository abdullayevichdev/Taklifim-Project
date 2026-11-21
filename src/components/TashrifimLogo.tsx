import React, { useId } from 'react';

interface TashrifimMarkProps {
  className?: string;
  title?: string;
}

/** Tashrifim brand mark: rose envelope with a golden heart seal (inline SVG, crisp at any size). */
export const TashrifimMark: React.FC<TashrifimMarkProps> = ({ className = 'w-8 h-8', title }) => {
  const uid = useId().replace(/:/g, '');
  const bg = `tsBg${uid}`;
  const gold = `tsGold${uid}`;
  return (
    <svg
      viewBox="0 0 64 64"
      className={`shrink-0 ${className}`}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <linearGradient id={bg} x1="6" y1="4" x2="58" y2="62" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#EE8FB0" />
          <stop offset="0.55" stopColor="#D2557F" />
          <stop offset="1" stopColor="#9E2F58" />
        </linearGradient>
        <linearGradient id={gold} x1="24" y1="30" x2="40" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FBE3A6" />
          <stop offset="1" stopColor="#D9A649" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="17" fill={`url(#${bg})`} />
      <rect x="2.75" y="2.75" width="58.5" height="58.5" rx="16.25" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="1.5" />
      <rect x="13" y="21" width="38" height="26" rx="4.5" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinejoin="round" />
      <path d="M14.5 23.5 L32 36 L49.5 23.5" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M32 44.2c-.5 0-6.8-4.2-6.8-8.6 0-2.3 1.7-3.9 3.7-3.9 1.4 0 2.5.7 3.1 1.8.6-1.1 1.7-1.8 3.1-1.8 2 0 3.7 1.6 3.7 3.9 0 4.4-6.3 8.6-6.8 8.6z"
        fill={`url(#${gold})`}
        stroke="#9E2F58"
        strokeWidth="1.3"
      />
      <path d="M47 11.5l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z" fill="#fff" fillOpacity=".9" />
    </svg>
  );
};

interface TashrifimLogoProps {
  /** Size classes for the mark. */
  className?: string;
  showText?: boolean;
  textClassName?: string;
  /** Show the small "Onlayn taklifnomalar" tagline under the wordmark. */
  tagline?: string;
}

/** Full Tashrifim logo: mark + serif wordmark. */
export const TashrifimLogo: React.FC<TashrifimLogoProps> = ({
  className = 'w-6 h-6',
  showText = false,
  textClassName = 'text-base',
  tagline,
}) => (
  <span className="inline-flex items-center gap-2.5">
    <TashrifimMark className={className} title={showText ? undefined : 'Tashrifim'} />
    {showText && (
      <span className="flex flex-col leading-none">
        <span className={`font-playfair font-bold tracking-[0.08em] uppercase text-[#1E1418] whitespace-nowrap ${textClassName}`}>
          Tashrifim
        </span>
        {tagline && (
          <span className="mt-1 text-[9px] font-semibold tracking-[0.22em] uppercase text-[#A8395F] whitespace-nowrap">
            {tagline}
          </span>
        )}
      </span>
    )}
  </span>
);

export default TashrifimLogo;
