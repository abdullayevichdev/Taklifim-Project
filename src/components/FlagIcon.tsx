import React from 'react';
import { Language } from '../types';

interface FlagIconProps {
  code: Language;
  className?: string;
}

export const FlagIcon: React.FC<FlagIconProps> = ({ code, className = 'w-4 h-3 rounded-[2px]' }) => {
  if (code === 'uz') {
    return (
      <svg
        viewBox="0 0 24 16"
        className={`${className} shrink-0 shadow-[0_0_0_0.5px_rgba(0,0,0,0.12)]`}
        aria-hidden="true"
        focusable="false"
      >
        <rect width="24" height="5" y="0" fill="#1EB5E0" />
        <rect width="24" height="0.7" y="5" fill="#CE1126" />
        <rect width="24" height="4.6" y="5.7" fill="#FFFFFF" />
        <rect width="24" height="0.7" y="10.3" fill="#CE1126" />
        <rect width="24" height="5" y="11" fill="#1EB53A" />
        <circle cx="4.5" cy="2.5" r="1.4" fill="#FFFFFF" />
        <circle cx="5.1" cy="2.5" r="1.15" fill="#1EB5E0" />
        <circle cx="7.6" cy="1.8" r="0.35" fill="#FFFFFF" />
        <circle cx="8.8" cy="1.8" r="0.35" fill="#FFFFFF" />
        <circle cx="7.6" cy="3.1" r="0.35" fill="#FFFFFF" />
        <circle cx="8.8" cy="3.1" r="0.35" fill="#FFFFFF" />
      </svg>
    );
  }

  if (code === 'ru') {
    return (
      <svg
        viewBox="0 0 24 16"
        className={`${className} shrink-0 shadow-[0_0_0_0.5px_rgba(0,0,0,0.12)]`}
        aria-hidden="true"
        focusable="false"
      >
        <rect width="24" height="5.34" y="0" fill="#FFFFFF" />
        <rect width="24" height="5.34" y="5.33" fill="#0039A6" />
        <rect width="24" height="5.34" y="10.66" fill="#D52B1E" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 16"
      className={`${className} shrink-0 shadow-[0_0_0_0.5px_rgba(0,0,0,0.12)]`}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="24" height="16" fill="#012169" />
      <path d="M0 0 L24 16 M24 0 L0 16" stroke="#FFFFFF" strokeWidth="3.2" />
      <path d="M0 0 L24 16 M24 0 L0 16" stroke="#C8102E" strokeWidth="1.6" />
      <path d="M12 0 V16 M0 8 H24" stroke="#FFFFFF" strokeWidth="4.6" />
      <path d="M12 0 V16 M0 8 H24" stroke="#C8102E" strokeWidth="2.6" />
    </svg>
  );
};
