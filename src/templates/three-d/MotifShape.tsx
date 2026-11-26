import React, { useId } from 'react';
import type { Motif } from './themes';

/** Vector shape for one motif, filled with a c1 → c2 gradient (used by floating objects and the medallion). */
export const MotifShape: React.FC<{ motif: Motif; c1: string; c2: string; className?: string; style?: React.CSSProperties }> = ({
  motif,
  c1,
  c2,
  className,
  style,
}) => {
  const id = `m${useId().replace(/:/g, '')}`;
  const fill = `url(#${id})`;
  let body: React.ReactNode;
  switch (motif) {
    case 'petal':
      body = <path d="M20 2C31 12 33 26 20 38 7 26 9 12 20 2Z" fill={fill} />;
      break;
    case 'leaf':
      body = (
        <>
          <path d="M20 2C35 11 35 29 20 38 5 29 5 11 20 2Z" fill={fill} />
          <path d="M20 6V34M20 14l-6-4M20 20l7-5M20 26l-7-5" stroke={c1} strokeWidth="1.2" strokeLinecap="round" opacity=".7" />
        </>
      );
      break;
    case 'crystal':
      body = (
        <>
          <path d="M20 2 34 14 20 38 6 14Z" fill={fill} />
          <path d="M6 14H34M20 2 14 14 20 38 26 14Z" stroke="#fff" strokeWidth="1" strokeLinejoin="round" opacity=".55" fill="none" />
        </>
      );
      break;
    case 'diamond':
      body = (
        <>
          <path d="M10 6H30L37 15 20 36 3 15Z" fill={fill} />
          <path d="M3 15H37M10 6 15 15 20 36 25 15 30 6M15 15 20 6 25 15" stroke="#fff" strokeWidth="1" strokeLinejoin="round" opacity=".5" fill="none" />
        </>
      );
      break;
    case 'sparkle':
      body = <path d="M20 1 23.5 16.5 39 20 23.5 23.5 20 39 16.5 23.5 1 20 16.5 16.5Z" fill={fill} />;
      break;
    case 'heart':
      body = <path d="M20 36C6 26 1.5 17 7 10.5 12 5 17.5 7.5 20 12 22.5 7.5 28 5 33 10.5 38.5 17 34 26 20 36Z" fill={fill} />;
      break;
    case 'ring':
      body = (
        <>
          <circle cx="20" cy="22" r="12" fill="none" stroke={fill} strokeWidth="4.5" />
          <path d="M20 4 25 10H15Z" fill={c1} />
          <circle cx="20" cy="8.5" r="2.4" fill="#fff" opacity=".85" />
        </>
      );
      break;
    case 'pearl':
      body = (
        <>
          <circle cx="20" cy="20" r="15" fill={fill} />
          <circle cx="15" cy="14" r="5" fill="#fff" opacity=".75" />
        </>
      );
      break;
    case 'star8':
      body = (
        <>
          <path d="M8 8H32V32H8Z" fill={fill} />
          <path d="M20 3 37 20 20 37 3 20Z" fill={fill} />
          <circle cx="20" cy="20" r="5" fill={c1} opacity=".9" />
        </>
      );
      break;
    case 'moon':
      body = <path d="M27 4A16 16 0 1 0 36 28 13 13 0 1 1 27 4Z" fill={fill} />;
      break;
    case 'feather':
      body = (
        <>
          <path d="M33 3C15 7 7 21 7 37 21 33 33 21 33 3Z" fill={fill} />
          <path d="M7 37 30 7" stroke={c1} strokeWidth="1.3" strokeLinecap="round" opacity=".8" />
        </>
      );
      break;
    case 'blossom':
      body = (
        <>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="20" cy="10.5" rx="6.5" ry="9" fill={fill} transform={`rotate(${a} 20 20)`} />
          ))}
          <circle cx="20" cy="20" r="4.2" fill={c1} />
        </>
      );
      break;
    case 'sun':
      body = (
        <>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <ellipse key={a} cx="20" cy="7" rx="3.4" ry="7" fill={fill} transform={`rotate(${a} 20 20)`} />
          ))}
          <circle cx="20" cy="20" r="7" fill={c1} />
        </>
      );
      break;
    case 'butterfly':
      body = (
        <>
          <path d="M19 20C12 6 2 6 3 15c1 7 9 8 16 5Z" fill={fill} />
          <path d="M21 20C28 6 38 6 37 15c-1 7-9 8-16 5Z" fill={fill} />
          <path d="M19 21c-6 2-10 9-6 13 3 2 6-4 6-13Zm2 0c6 2 10 9 6 13-3 2-6-4-6-13Z" fill={fill} opacity=".85" />
          <rect x="19" y="12" width="2" height="18" rx="1" fill={c2} />
        </>
      );
      break;
  }
  return (
    <svg viewBox="0 0 40 40" className={className} style={style} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c1} />
          <stop offset="1" stopColor={c2} />
        </linearGradient>
      </defs>
      {body}
    </svg>
  );
};
