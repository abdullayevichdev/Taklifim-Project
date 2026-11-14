import React from 'react';
import { TemplateRenderProps } from '../types';
import { SharedCountdown } from '../components/SharedCountdown';
import { SharedLocation } from '../components/SharedLocation';
import { SharedSchedule } from '../components/SharedSchedule';
import { SharedGallery } from '../components/SharedGallery';
import { SharedRSVP } from '../components/SharedRSVP';
import { SharedWishes } from '../components/SharedWishes';
import { TemplateFitTitle } from '../components/TemplateFitTitle';
import { Sun } from 'lucide-react';

export const Template16_SunlitTerracotta: React.FC<TemplateRenderProps> = (props) => {
  const { invitation, template, language, onRSVPSubmit, onWishSubmit, wishesList, interactiveMap, musicPlayer, headingFont } = props;
  const primary = template.colorStyle.primary; // #C06C54
  const bg = template.colorStyle.background; // #FCF8F5

  return (
    <div className="taklifim-tpl-root w-full min-h-screen text-[#3A1E17] relative overflow-hidden" style={{ backgroundColor: bg }}>
      {musicPlayer && <div className="fixed top-4 right-4 z-50">{musicPlayer}</div>}

      <div className="taklifim-tpl-wrap relative z-10 space-y-12">
        {/* HERO: Warm Terracotta Boho Arch Card */}
        <div className="taklifim-tpl-hero-card relative rounded-[40px] text-center space-y-6 bg-gradient-to-b from-[#FFF5F0] to-white border-2 border-[#C06C54]/25 shadow-[0_20px_50px_rgba(192,108,84,0.15)]">
          <div className="flex items-center justify-center gap-2 text-[#C06C54] min-w-0">
            <Sun className="w-4 h-4 shrink-0 animate-spin-slow" />
            <span className="taklifim-tpl-eyebrow uppercase font-bold min-w-0">
              {invitation.eventType || 'SUNLIT TERRACOTTA'}
            </span>
            <Sun className="w-4 h-4 shrink-0 animate-spin-slow" />
          </div>

          <div className="space-y-2">
            <TemplateFitTitle
              text={invitation.hostNames}
              className="font-black tracking-tight text-[#3A1E17]"
              style={{ fontFamily: headingFont || 'Playfair Display' }}
            />
            <div className="flex items-center justify-center gap-2 text-[#C06C54]">
              <span>☀️</span>
              <div className="w-20 h-px bg-[#C06C54]/30" />
              <span>☀️</span>
            </div>
          </div>

          {invitation.coverImage && (
            <div className="relative rounded-t-[90px] rounded-b-2xl overflow-hidden shadow-md border-3 border-[#C06C54]/30 aspect-[4/3] max-w-sm mx-auto">
              <img src={invitation.coverImage} alt={invitation.hostNames} className="w-full h-full object-cover" />
            </div>
          )}

          {invitation.invitationQuote && (
            <p className="font-serif italic text-xs sm:text-sm text-[#7A4031] max-w-md mx-auto leading-relaxed">
              {invitation.invitationQuote}
            </p>
          )}

          <div className="taklifim-tpl-date-pill inline-flex items-center gap-2 rounded-full bg-[#FCECE8] border border-[#C06C54]/30 text-[#3A1E17] font-bold shadow-xs">
            <span>{invitation.eventDate}</span>
            <span>•</span>
            <span>{invitation.startTime}</span>
          </div>
        </div>

        <SharedCountdown eventDate={invitation.eventDate} startTime={invitation.startTime} language={language} primaryColor={primary} />
        {invitation.invitationMessage && (
          <div className="taklifim-tpl-card rounded-3xl text-center space-y-3 bg-white/90 border border-orange-100 shadow-xs">
            <p className="text-xs sm:text-sm leading-relaxed text-[#3A1E17] font-medium max-w-md mx-auto break-words">"{invitation.invitationMessage}"</p>
          </div>
        )}
        {invitation.schedule && invitation.schedule.length > 0 && <SharedSchedule schedule={invitation.schedule} language={language} primaryColor={primary} />}
        {invitation.galleryImages && invitation.galleryImages.length > 0 && <SharedGallery images={invitation.galleryImages} title={invitation.galleryTitle} language={language} primaryColor={primary} />}
        <SharedLocation venueName={invitation.venueName} venueAddress={invitation.venueAddress} venueLocationType={invitation.venueLocationType} celebrationAudience={invitation.celebrationAudience} eventDate={invitation.eventDate} startTime={invitation.startTime} endTime={invitation.endTime} hostNames={invitation.hostNames} eventType={invitation.eventType} mapUrl={invitation.mapUrl} language={language} primaryColor={primary} interactiveMap={interactiveMap} />
        {invitation.rsvpEnabled && <SharedRSVP language={language} primaryColor={primary} deadline={invitation.rsvpDeadline} askMealPreference={invitation.askMealPreference} onRSVPSubmit={onRSVPSubmit} />}
        <SharedWishes wishes={wishesList} language={language} primaryColor={primary} onWishSubmit={onWishSubmit} />
      </div>
    </div>
  );
};
