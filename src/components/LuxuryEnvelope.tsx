import React, { useState } from 'react';
import { ArrowRight, Sparkles, MapPin, Calendar } from 'lucide-react';
import { InvitationShell } from './InvitationShell';

interface LuxuryEnvelopeProps {
  isOpen?: boolean;
  onOpen?: () => void;
  hostNames?: string;
  eventDate?: string;
  venueName?: string;
  className?: string;
  buttonLabel?: string;
  headerLabel?: string;
  ceremonyLabel?: string;
  scriptSubtitle?: string;
  quote?: string;
  viewSiteLabel?: string;
  sealHint?: string;
  onViewFullSite?: () => void;
}

export const LuxuryEnvelope: React.FC<LuxuryEnvelopeProps> = ({
  isOpen: controlledIsOpen,
  onOpen,
  hostNames = 'Nodirbek & Malika',
  eventDate = '2026.10.25 • 18:00',
  venueName = '«Versal» Saroyi, Namangan',
  className = '',
  buttonLabel = 'Taklifnomani ochish',
  headerLabel = 'Taklifnoma',
  ceremonyLabel = 'To‘y & Nikoh Marosimi',
  scriptSubtitle = 'Visol Oqshomi',
  quote = '«Hayotimizning eng quvonchli va unutilmas kunida siz azizlarni faxriy mehmonimiz bo‘lishga taklif etamiz!»',
  viewSiteLabel = 'Saytni To‘liq Ko‘rish',
  onViewFullSite,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpened = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleOpen = () => {
    if (!isOpened) {
      setInternalIsOpen(true);
      onOpen?.();
    }
  };

  const handleSiteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onViewFullSite?.();
  };

  return (
    <div className={`relative w-full h-full select-none overflow-hidden bg-[#FAF7F2] ${className}`}>
      <InvitationShell
        isOpened={isOpened}
        onOpen={handleOpen}
        enableConfetti={false}
        variant="frame"
        frameRadiusClass="rounded-[42px]"
        compact={true}
        headerLabel={headerLabel}
        ceremonyLabel={ceremonyLabel}
        hostNames={hostNames}
        openButtonLabel={buttonLabel}
        fallbackBgColor="#FAF7F2"
      >
        {/* Opened Luxury Wedding Invitation Card */}
        <div
          className="relative w-full h-full bg-[#FAF7F2] flex items-center justify-center p-3 sm:p-4"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 25%, #FFFFFF 0%, #FAF6EE 55%, #EDE4D3 100%)',
          }}
        >
          <div className="relative w-full h-full mt-8 mb-3 rounded-2xl bg-[#FFFDFB] border border-[#E8DEC8] flex flex-col justify-between p-4 sm:p-5 text-center shadow-[0_25px_50px_-12px_rgba(80,50,30,0.25)]">
            {/* Ornate Gold Border Inner Frame */}
            <div className="absolute inset-2 rounded-xl border border-[#D4AF37]/30 pointer-events-none" />
            <div className="absolute inset-2.5 rounded-lg border border-[#D4AF37]/15 pointer-events-none" />

            {/* Card Header */}
            <div className="pt-1 relative z-10">
              <div className="flex items-center justify-center gap-1.5 text-[11px] tracking-[0.2em] uppercase text-[#9A6E08] font-bold mb-1">
                <Sparkles className="w-2.5 h-2.5 text-[#D4AF37]" />
                <span>{headerLabel}</span>
                <Sparkles className="w-2.5 h-2.5 text-[#D4AF37]" />
              </div>
              <div className="w-12 h-[1px] mx-auto bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
            </div>

            {/* Couple Names & Ceremony */}
            <div className="py-1.5 space-y-1 relative z-10">
              <p className="text-[11.5px] uppercase tracking-[0.14em] text-[#6E5C50] font-semibold">
                {ceremonyLabel}
              </p>
              <h2 className="font-playfair text-2xl sm:text-[26px] font-bold text-[#2A1820] leading-tight">
                {hostNames}
              </h2>
              <p className="font-script text-2xl sm:text-[28px] text-[#B84C6E]">
                {scriptSubtitle}
              </p>
            </div>

            {/* Invitation Message Snippet */}
            <div className="text-[12.5px] leading-relaxed text-[#52443E] italic px-2 relative z-10">
              {quote}
            </div>

            {/* Event Details: Date & Venue */}
            <div className="border-t border-[#EFE7D8] pt-2 space-y-1 text-[13px] text-[#52443E] relative z-10">
              <div className="inline-flex items-center gap-1.5 font-bold text-[#8A5A1B] text-[13px] tabular-nums">
                <Calendar className="w-3.5 h-3.5 text-[#B8860B]" />
                <span>{eventDate}</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-[12.5px] text-[#62524C]">
                <MapPin className="w-3.5 h-3.5 text-[#C0607D]" />
                <span>{venueName}</span>
              </div>
            </div>

            {/* Action Button: Open Full Interactive Website */}
            {onViewFullSite && (
              <div className="pt-1.5 relative z-10">
                <button
                  type="button"
                  onClick={handleSiteClick}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#2B1B22] to-[#42212E] hover:from-[#3D2530] hover:to-[#542B3B] text-[#FFF4E4] font-bold text-[12.5px] tracking-[0.08em] uppercase shadow-md flex items-center justify-center gap-2 group transition-[transform,opacity] duration-200 whitespace-nowrap cursor-pointer"
                >
                  <span className="truncate">{viewSiteLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#E27B9B] group-hover:translate-x-1 transition-transform shrink-0" />
                </button>
              </div>
            )}
          </div>
        </div>
      </InvitationShell>
    </div>
  );
};

export default LuxuryEnvelope;
