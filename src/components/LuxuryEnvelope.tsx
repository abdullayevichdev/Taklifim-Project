import React, { useState } from 'react';
import { ArrowRight, Sparkles, Heart, MapPin, Calendar } from 'lucide-react';

interface LuxuryEnvelopeProps {
  isOpen?: boolean;
  onOpen?: () => void;
  hostNames?: string;
  eventDate?: string;
  venueName?: string;
  className?: string;
  buttonLabel?: string;
  onViewFullSite?: () => void;
}

export const LuxuryEnvelope: React.FC<LuxuryEnvelopeProps> = ({
  isOpen: controlledIsOpen,
  onOpen,
  hostNames = 'Nodirbek & Malika',
  eventDate = '2026.10.25 • 18:00',
  venueName = '«Versal» Saroyi, Toshkent',
  className = '',
  buttonLabel = 'Taklifnomani ochish',
  onViewFullSite,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpened = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleOpenClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOpened) {
      setInternalIsOpen(true);
      if (onOpen) {
        onOpen();
      }
    }
  };

  const handleSiteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onViewFullSite) {
      onViewFullSite();
    }
  };

  return (
    <div
      className={`relative w-full h-full select-none overflow-hidden bg-[#FAF7F2] ${className}`}
      style={{
        boxShadow: 'inset 0 0 50px rgba(185, 165, 140, 0.28)',
      }}
    >
      {/* SVG Definitions for Paper Texture, Embossing and Metallic Foil */}
      <svg className="absolute w-0 h-0" aria-hidden="true" focusable="false">
        <defs>
          {/* Embossed Botanical Pattern (Handcrafted Jasmin Flora) */}
          <g id="botanical-branch-embossed">
            {/* Elegant curving vine */}
            <path
              d="M 14 12 Q 32 65 24 135 T 32 230 T 20 325 T 32 420 T 16 510"
              fill="none"
              stroke="#ECE5D8"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            {/* Fine secondary stems */}
            <path d="M 24 60 Q 38 52 46 55" fill="none" stroke="#ECE5D8" strokeWidth="1.2" />
            <path d="M 22 105 Q 10 95 6 98" fill="none" stroke="#ECE5D8" strokeWidth="1.2" />
            <path d="M 28 175 Q 45 165 52 170" fill="none" stroke="#ECE5D8" strokeWidth="1.2" />
            <path d="M 24 245 Q 12 235 8 240" fill="none" stroke="#ECE5D8" strokeWidth="1.2" />
            <path d="M 30 315 Q 48 305 56 312" fill="none" stroke="#ECE5D8" strokeWidth="1.2" />
            <path d="M 25 385 Q 12 375 7 380" fill="none" stroke="#ECE5D8" strokeWidth="1.2" />
            <path d="M 28 455 Q 44 445 50 450" fill="none" stroke="#ECE5D8" strokeWidth="1.2" />

            {/* Embossed Leaf Clusters (layered for tactile bevel) */}
            {/* Cluster 1 */}
            <path d="M 24 55 C 32 40, 48 46, 48 60 C 40 68, 28 64, 24 55 Z" fill="#F8F4EC" />
            <path d="M 22 75 C 10 65, 5 78, 8 85 C 16 88, 24 82, 22 75 Z" fill="#F8F4EC" />
            <circle cx="50" cy="58" r="2.5" fill="#F4EDE0" />

            {/* Cluster 2 with 5-petal flower */}
            <path d="M 26 115 C 38 100, 56 108, 54 122 C 44 130, 32 125, 26 115 Z" fill="#F8F4EC" />
            <path d="M 23 140 C 12 130, 6 142, 9 150 C 18 152, 25 146, 23 140 Z" fill="#F8F4EC" />
            {/* Flower 1 */}
            <g transform="translate(52, 145)">
              <circle cx="0" cy="-6" r="3.5" fill="#FAF7F0" />
              <circle cx="6" cy="-2" r="3.5" fill="#F7F3E9" />
              <circle cx="4" cy="5" r="3.5" fill="#F5EFE3" />
              <circle cx="-4" cy="5" r="3.5" fill="#F5EFE3" />
              <circle cx="-6" cy="-2" r="3.5" fill="#F7F3E9" />
              <circle cx="0" cy="0" r="2" fill="#E8DCC8" />
            </g>

            {/* Cluster 3 */}
            <path d="M 28 185 C 44 170, 60 178, 58 194 C 48 202, 34 196, 28 185 Z" fill="#F8F4EC" />
            <path d="M 25 210 C 14 200, 8 212, 11 220 C 20 224, 27 218, 25 210 Z" fill="#F8F4EC" />

            {/* Cluster 4 with larger blossom */}
            <path d="M 30 260 C 46 246, 62 254, 60 270 C 50 278, 36 272, 30 260 Z" fill="#F8F4EC" />
            <path d="M 26 288 C 14 278, 8 290, 12 300 C 20 304, 28 298, 26 288 Z" fill="#F8F4EC" />
            {/* Flower 2 */}
            <g transform="translate(56, 298)">
              <circle cx="0" cy="-7" r="4" fill="#FAF7F0" />
              <circle cx="7" cy="-2" r="4" fill="#F7F3E9" />
              <circle cx="4" cy="6" r="4" fill="#F5EFE3" />
              <circle cx="-4" cy="6" r="4" fill="#F5EFE3" />
              <circle cx="-7" cy="-2" r="4" fill="#F7F3E9" />
              <circle cx="0" cy="0" r="2.2" fill="#E8DCC8" />
            </g>

            {/* Cluster 5 */}
            <path d="M 25 335 C 42 322, 58 330, 55 345 C 45 352, 32 346, 25 335 Z" fill="#F8F4EC" />
            <path d="M 22 360 C 10 350, 6 362, 9 370 C 18 374, 24 368, 22 360 Z" fill="#F8F4EC" />

            {/* Cluster 6 with Flower 3 */}
            <path d="M 28 410 C 46 398, 60 406, 58 420 C 48 428, 34 422, 28 410 Z" fill="#F8F4EC" />
            <path d="M 24 435 C 12 425, 8 438, 11 445 C 19 450, 26 444, 24 435 Z" fill="#F8F4EC" />
            <g transform="translate(52, 435)">
              <circle cx="0" cy="-5" r="3" fill="#FAF7F0" />
              <circle cx="5" cy="-1.5" r="3" fill="#F7F3E9" />
              <circle cx="3" cy="4" r="3" fill="#F5EFE3" />
              <circle cx="-3" cy="4" r="3" fill="#F5EFE3" />
              <circle cx="-5" cy="-1.5" r="3" fill="#F7F3E9" />
              <circle cx="0" cy="0" r="1.6" fill="#E8DCC8" />
            </g>

            {/* Cluster 7 (Bottom trailing) */}
            <path d="M 20 475 C 34 466, 44 472, 42 485 C 34 492, 24 486, 20 475 Z" fill="#F8F4EC" />
            <path d="M 16 495 C 8 488, 5 498, 7 504 C 14 508, 18 502, 16 495 Z" fill="#F8F4EC" />
          </g>

          {/* Gradients for Flap Shadows & Warm Ivory Paper */}
          <linearGradient id="top-fold-shadow" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#FFFDF9" />
            <stop offset="65%" stopColor="#FAF5EB" />
            <stop offset="98%" stopColor="#EDE3D1" />
            <stop offset="100%" stopColor="#D9CEBB" />
          </linearGradient>

          <linearGradient id="left-fold-grad" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#FAF7F1" stopOpacity="0.4" />
            <stop offset="85%" stopColor="#F2ECE0" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#E5DC Flora" stopOpacity="0.9" />
          </linearGradient>

          <linearGradient id="right-fold-grad" x1="100%" y1="50%" x2="0%" y2="50%">
            <stop offset="0%" stopColor="#FAF7F1" stopOpacity="0.4" />
            <stop offset="85%" stopColor="#F2ECE0" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#E5DC Flora" stopOpacity="0.9" />
          </linearGradient>

          <linearGradient id="bottom-fold-grad" x1="50%" y1="100%" x2="50%" y2="0%">
            <stop offset="0%" stopColor="#FAF6EF" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#EEE6D7" stopOpacity="0.98" />
          </linearGradient>

          {/* Gold Foil Metallic Accent */}
          <linearGradient id="gold-foil" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F5E4B5" />
            <stop offset="25%" stopColor="#D4AF37" />
            <stop offset="50%" stopColor="#AA7C11" />
            <stop offset="75%" stopColor="#E5C158" />
            <stop offset="100%" stopColor="#FFF3CE" />
          </linearGradient>
        </defs>
      </svg>

      {/* Layer 1: Luxury Paper Foundation with Warm Ivory Radiance */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#FCFAF6] via-[#F8F4EC] to-[#EFE7D8]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 25%, #FFFFFF 0%, #FAF6EE 55%, #EDE4D3 100%)',
        }}
      />

      {/* Subtle Handcrafted Paper Grain Overlay */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Layer 2: Inner Luxury Wedding Invitation Card (Slides out smoothly when opened) */}
      <div
        className={`absolute inset-x-3 sm:inset-x-5 top-7 bottom-14 rounded-2xl bg-[#FFFDFB] border border-[#E8DEC8] flex flex-col justify-between p-5 sm:p-7 text-center transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpened
            ? 'translate-y-[-20px] opacity-100 scale-100 z-30 shadow-[0_25px_50px_-12px_rgba(80,50,30,0.3)]'
            : 'translate-y-10 opacity-0 scale-95 pointer-events-none z-10'
        }`}
      >
        {/* Ornate Gold Border Inner Frame */}
        <div className="absolute inset-2 rounded-xl border border-[#D4AF37]/30 pointer-events-none" />
        <div className="absolute inset-2.5 rounded-lg border border-[#D4AF37]/15 pointer-events-none" />

        {/* Card Header */}
        <div className="pt-2 relative z-10">
          <div className="flex items-center justify-center gap-1.5 text-[9px] tracking-[0.28em] uppercase text-[#B8860B] font-extrabold mb-1">
            <Sparkles className="w-2.5 h-2.5 text-[#D4AF37]" />
            <span>Taklifnoma</span>
            <Sparkles className="w-2.5 h-2.5 text-[#D4AF37]" />
          </div>
          <div className="w-12 h-[1px] mx-auto bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
        </div>

        {/* Couple Names & Ceremony */}
        <div className="py-2 space-y-1.5 relative z-10">
          <p className="text-[11px] uppercase tracking-widest text-[#8A776A] font-medium">
            To‘y & Nikoh Marosimi
          </p>
          <h2 className="font-playfair text-2xl sm:text-[28px] font-bold text-[#2A1820] leading-tight">
            {hostNames}
          </h2>
          <p className="font-script text-2xl sm:text-3xl text-[#C0607D]">
            Visol Oqshomi
          </p>
        </div>

        {/* Invitation Message Snippet */}
        <div className="text-[11px] leading-relaxed text-[#6E5E58] italic px-2 relative z-10">
          «Hayotimizning eng quvonchli va unutilmas kunida siz azizlarni faxriy mehmonimiz bo‘lishga taklif etamiz!»
        </div>

        {/* Event Details: Date & Venue */}
        <div className="border-t border-[#EFE7D8] pt-2.5 space-y-1.5 text-xs text-[#52443E] relative z-10">
          <div className="inline-flex items-center gap-1.5 font-bold text-[#8A5A1B] text-[11px]">
            <Calendar className="w-3.5 h-3.5 text-[#B8860B]" />
            <span>{eventDate}</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#7A6A64]">
            <MapPin className="w-3.5 h-3.5 text-[#C0607D]" />
            <span>{venueName}</span>
          </div>
        </div>

        {/* Action Button: Open Full Interactive Website */}
        {onViewFullSite && (
          <div className="pt-2 relative z-10">
            <button
              type="button"
              onClick={handleSiteClick}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#2B1B22] to-[#42212E] hover:from-[#3D2530] hover:to-[#542B3B] text-[#FFF4E4] font-bold text-xs tracking-wider uppercase shadow-md flex items-center justify-center gap-2 group transition-all"
            >
              <span>Saytni To‘liq Ko‘rish</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#E27B9B] group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}
      </div>

      {/* Layer 3: Embossed Botanical Flora (Left Flap Edge) */}
      <div
        className="absolute left-0 top-0 bottom-0 w-24 sm:w-28 pointer-events-none z-10 overflow-hidden"
        style={{
          filter:
            'drop-shadow(-0.8px -0.8px 0.5px rgba(255, 255, 255, 0.98)) drop-shadow(1.2px 1.2px 1.2px rgba(150, 130, 110, 0.45))',
        }}
      >
        <svg
          viewBox="0 0 80 540"
          className="w-full h-full object-cover"
          preserveAspectRatio="none"
        >
          <use href="#botanical-branch-embossed" />
        </svg>
      </div>

      {/* Layer 4: Embossed Botanical Flora (Right Flap Edge - Perfectly Symmetrical Mirror) */}
      <div
        className="absolute right-0 top-0 bottom-0 w-24 sm:w-28 pointer-events-none z-10 overflow-hidden -scale-x-100"
        style={{
          filter:
            'drop-shadow(-0.8px -0.8px 0.5px rgba(255, 255, 255, 0.98)) drop-shadow(1.2px 1.2px 1.2px rgba(150, 130, 110, 0.45))',
        }}
      >
        <svg
          viewBox="0 0 80 540"
          className="w-full h-full object-cover"
          preserveAspectRatio="none"
        >
          <use href="#botanical-branch-embossed" />
        </svg>
      </div>

      {/* Layer 5: Symmetrical Diagonal Envelope Folds (Left, Right & Bottom Flaps) */}
      <svg
        viewBox="0 0 320 540"
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        preserveAspectRatio="none"
      >
        {/* Left Flap */}
        <path
          d="M 0 0 L 160 270 L 0 540 Z"
          fill="url(#left-fold-grad)"
          opacity="0.95"
        />
        {/* Right Flap */}
        <path
          d="M 320 0 L 160 270 L 320 540 Z"
          fill="url(#right-fold-grad)"
          opacity="0.95"
        />
        {/* Bottom Flap upward triangle */}
        <path
          d="M 0 540 L 160 270 L 320 540 Z"
          fill="url(#bottom-fold-grad)"
          opacity="0.98"
          style={{
            filter: 'drop-shadow(0px -3px 6px rgba(110, 85, 65, 0.12))',
          }}
        />

        {/* Diagonal Crease Paper Fold Relief Lines */}
        {/* Left-to-Center Top Crease */}
        <line
          x1="0"
          y1="0"
          x2="160"
          y2="270"
          stroke="rgba(255, 255, 255, 0.9)"
          strokeWidth="1.2"
        />
        <line
          x1="0"
          y1="0"
          x2="160"
          y2="270"
          stroke="rgba(140, 115, 95, 0.28)"
          strokeWidth="0.8"
        />

        {/* Right-to-Center Top Crease */}
        <line
          x1="320"
          y1="0"
          x2="160"
          y2="270"
          stroke="rgba(255, 255, 255, 0.9)"
          strokeWidth="1.2"
        />
        <line
          x1="320"
          y1="0"
          x2="160"
          y2="270"
          stroke="rgba(140, 115, 95, 0.28)"
          strokeWidth="0.8"
        />

        {/* Left-to-Center Bottom Crease */}
        <line
          x1="0"
          y1="540"
          x2="160"
          y2="270"
          stroke="rgba(255, 255, 255, 0.85)"
          strokeWidth="1.2"
        />
        <line
          x1="0"
          y1="540"
          x2="160"
          y2="270"
          stroke="rgba(140, 115, 95, 0.25)"
          strokeWidth="0.8"
        />

        {/* Right-to-Center Bottom Crease */}
        <line
          x1="320"
          y1="540"
          x2="160"
          y2="270"
          stroke="rgba(255, 255, 255, 0.85)"
          strokeWidth="1.2"
        />
        <line
          x1="320"
          y1="540"
          x2="160"
          y2="270"
          stroke="rgba(140, 115, 95, 0.25)"
          strokeWidth="0.8"
        />
      </svg>

      {/* Layer 6: Top Flap (Lid that flips open smoothly with 3D perspective) */}
      <div
        className="absolute top-0 inset-x-0 h-1/2 z-20 pointer-events-none transition-transform duration-800 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
        style={{
          transformOrigin: 'top center',
          transform: isOpened ? 'rotateX(175deg)' : 'rotateX(0deg)',
          perspective: '1200px',
        }}
      >
        <svg
          viewBox="0 0 320 270"
          className="w-full h-full"
          preserveAspectRatio="none"
          style={{
            filter: isOpened
              ? 'none'
              : 'drop-shadow(0 6px 12px rgba(120, 95, 75, 0.18)) drop-shadow(0 2px 4px rgba(0,0,0,0.08))',
          }}
        >
          {/* Top Triangle Fold */}
          <path
            d="M 0 0 L 320 0 L 160 270 Z"
            fill="url(#top-fold-shadow)"
          />
          {/* Highlight along the edges */}
          <line
            x1="0"
            y1="0"
            x2="160"
            y2="270"
            stroke="rgba(255, 255, 255, 0.95)"
            strokeWidth="1.2"
          />
          <line
            x1="320"
            y1="0"
            x2="160"
            y2="270"
            stroke="rgba(255, 255, 255, 0.95)"
            strokeWidth="1.2"
          />
        </svg>
      </div>

      {/* Layer 7: Realistic Dark Burgundy Wax Seal (Centrally Placed & Interactive) */}
      <div
        onClick={handleOpenClick}
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 cursor-pointer transition-all duration-700 ease-out group ${
          isOpened
            ? 'scale-125 opacity-0 pointer-events-none'
            : 'hover:scale-105 active:scale-95'
        }`}
        title="Taklifnomani ochish uchun muhr ustiga bosing"
        style={{
          width: '106px',
          height: '106px',
        }}
      >
        {/* Soft natural drop-shadow under the wax seal */}
        <div className="absolute inset-1.5 rounded-full bg-[#180206]/45 blur-md translate-y-2 pointer-events-none" />

        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
          <defs>
            {/* Dark Burgundy 3D Radial Depth */}
            <radialGradient id="wax-body-grad" cx="36%" cy="32%" r="65%">
              <stop offset="0%" stopColor="#B62842" />
              <stop offset="25%" stopColor="#8D1429" />
              <stop offset="60%" stopColor="#600C1D" />
              <stop offset="88%" stopColor="#3C0511" />
              <stop offset="100%" stopColor="#220208" />
            </radialGradient>

            {/* Inner Depressed Bed */}
            <radialGradient id="wax-bed-grad" cx="44%" cy="42%" r="56%">
              <stop offset="0%" stopColor="#7E1225" />
              <stop offset="48%" stopColor="#5E0B1B" />
              <stop offset="92%" stopColor="#38040F" />
              <stop offset="100%" stopColor="#220208" />
            </radialGradient>

            {/* Interlocking Rings Gold Gradient */}
            <linearGradient id="rings-gold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF6D8" />
              <stop offset="30%" stopColor="#ECCB7E" />
              <stop offset="55%" stopColor="#C99838" />
              <stop offset="80%" stopColor="#E6C470" />
              <stop offset="100%" stopColor="#FFF9E5" />
            </linearGradient>

            {/* Specular Gleam Sweep */}
            <linearGradient id="wax-gleam-sweep" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
              <stop offset="30%" stopColor="rgba(255,255,255,0.18)" />
              <stop offset="60%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>

          {/* Organic Scalloped Molten Wax Outer Contour */}
          <path
            d="M 50 4
               C 62 3, 71 8, 79 16
               C 87 24, 94 32, 96 44
               C 98 56, 93 68, 86 77
               C 79 86, 69 94, 56 96
               C 44 98, 30 94, 21 86
               C 12 78, 5 68, 4 56
               C 3 44, 8 32, 16 23
               C 24 14, 35 5, 50 4 Z"
            fill="url(#wax-body-grad)"
            stroke="#4A0614"
            strokeWidth="0.8"
          />

          {/* Glossy Upper Highlight Bevel Arc */}
          <path
            d="M 20 25
               C 28 14, 42 7, 56 6
               C 70 5, 82 13, 88 23
               C 80 18, 66 12, 52 13
               C 38 14, 26 19, 20 25 Z"
            fill="url(#wax-gleam-sweep)"
            opacity="0.75"
          />

          {/* Depressed Stamped Inner Circle Bed */}
          <circle
            cx="50"
            cy="50"
            r="32.5"
            fill="url(#wax-bed-grad)"
            stroke="#260309"
            strokeWidth="1.2"
          />
          {/* Inner Rim Embossed Ridge for 3D tactile depth */}
          <circle
            cx="50"
            cy="50"
            r="33.2"
            fill="none"
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth="0.8"
          />
          <circle
            cx="50"
            cy="50.8"
            r="31.2"
            fill="none"
            stroke="rgba(0, 0, 0, 0.5)"
            strokeWidth="1"
          />

          {/* Two Interlocking Gold Wedding Rings (Centrally Engraved) */}
          <g
            style={{
              filter:
                'drop-shadow(0 1.2px 1.5px rgba(0,0,0,0.7)) drop-shadow(0 -0.6px 0.6px rgba(255,255,255,0.45))',
            }}
          >
            {/* Left Ring */}
            <circle
              cx="43.5"
              cy="50"
              r="13"
              fill="none"
              stroke="url(#rings-gold)"
              strokeWidth="3.2"
            />
            {/* Right Ring (Interlocking) */}
            <circle
              cx="56.5"
              cy="50"
              r="13"
              fill="none"
              stroke="url(#rings-gold)"
              strokeWidth="3.2"
            />
            {/* Interlocking Overlap Arc */}
            <path
              d="M 47.5 40 A 13 13 0 0 1 54 44"
              fill="none"
              stroke="url(#rings-gold)"
              strokeWidth="3.2"
            />
            {/* Brilliant Diamond Sparkle on the Left Ring */}
            <circle cx="36" cy="40.5" r="2.2" fill="#FFFFFF" />
            <polygon
              points="36,36.5 37.5,40.5 41.5,40.5 38.2,42.5 39.5,46 36,43.5 32.5,46 33.8,42.5 30.5,40.5 34.5,40.5"
              fill="#FFFFFF"
              opacity="0.95"
            />
          </g>
        </svg>

        {/* Ambient Pulsing Glow on Hover */}
        <div className="absolute inset-0 rounded-full border border-amber-300/35 group-hover:scale-110 transition-transform duration-500 pointer-events-none" />
      </div>

      {/* Layer 8: Bottom Floating "Taklifnomani ochish" Button */}
      {!isOpened && (
        <div className="absolute bottom-5 inset-x-0 z-30 flex justify-center px-4 pointer-events-auto animate-bounce-gentle">
          <button
            type="button"
            onClick={handleOpenClick}
            className="flex items-center justify-center gap-2.5 px-6 py-3 rounded-full bg-white text-[#1E1418] font-extrabold text-xs tracking-wide shadow-[0_10px_25px_rgba(40,20,30,0.18)] hover:shadow-[0_14px_30px_rgba(226,123,155,0.35)] hover:scale-105 active:scale-95 transition-all duration-300 border border-white/90 group backdrop-blur-md"
          >
            <span className="text-sm">💌</span>
            <span>{buttonLabel}</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#E27B9B] group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}
    </div>
  );
};

export default LuxuryEnvelope;
