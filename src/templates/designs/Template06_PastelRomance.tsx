import React from 'react';
import { TemplateRenderProps } from '../types';
import { SharedCountdown } from '../components/SharedCountdown';
import { SharedLocation } from '../components/SharedLocation';
import { SharedSchedule } from '../components/SharedSchedule';
import { SharedGallery } from '../components/SharedGallery';
import { SharedRSVP } from '../components/SharedRSVP';
import { SharedWishes } from '../components/SharedWishes';
import { TemplateFitTitle } from '../components/TemplateFitTitle';
import { Heart } from 'lucide-react';

export const Template06_PastelRomance: React.FC<TemplateRenderProps> = (props) => {
  const { invitation, template, language, onRSVPSubmit, onWishSubmit, wishesList, interactiveMap, musicPlayer, headingFont } = props;
  const primary = template.colorStyle.primary; // #E27B9B
  const bg = template.colorStyle.background; // #FCF8FA

  return (
    <div className="taklifim-tpl-root w-full min-h-screen text-[#2D1B22] relative overflow-hidden" style={{ backgroundColor: bg }}>
      {musicPlayer && <div className="fixed top-4 right-4 z-50">{musicPlayer}</div>}

      <div className="taklifim-tpl-wrap relative z-10 space-y-12">
        {/* HERO: Pastel Watercolor Dream Card */}
        <div className="taklifim-tpl-hero-card relative rounded-[36px] text-center space-y-6 bg-gradient-to-b from-[#FFF0F5] to-white/90 border border-pink-100 shadow-[0_20px_50px_rgba(226,123,155,0.18)]">
          <div className="flex items-center justify-center gap-2 text-[#E27B9B]">
            <Heart className="w-4 h-4 shrink-0 fill-current opacity-80" />
            <span className="font-script text-[clamp(1.25rem,5.5cqw,1.65rem)] leading-tight text-[#E27B9B]">Pastel sevgi qissasi</span>
            <Heart className="w-4 h-4 shrink-0 fill-current opacity-80" />
          </div>

          <div className="space-y-2">
            <TemplateFitTitle
              text={invitation.hostNames}
              className="font-black tracking-tight text-[#2D1B22]"
              style={{ fontFamily: headingFont || 'Playfair Display' }}
            />
            <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-[#E27B9B] to-transparent mx-auto" />
          </div>

          {invitation.coverImage && (
            <div className="relative rounded-3xl overflow-hidden shadow-md border-4 border-white aspect-[4/3] max-w-sm mx-auto">
              <img src={invitation.coverImage} alt={invitation.hostNames} className="w-full h-full object-cover" />
            </div>
          )}

          {invitation.invitationQuote && (
            <p className="font-serif italic text-xs sm:text-sm text-[#7D5A68] max-w-md mx-auto leading-relaxed">
              {invitation.invitationQuote}
            </p>
          )}

          <div className="taklifim-tpl-date-pill inline-flex items-center gap-2 rounded-full bg-pink-50 border border-pink-200 text-[#2D1B22] font-bold shadow-xs">
            <span>{invitation.eventDate}</span>
            <span>•</span>
            <span>{invitation.startTime}</span>
          </div>
        </div>

        <SharedCountdown eventDate={invitation.eventDate} startTime={invitation.startTime} language={language} primaryColor={primary} />
        {invitation.invitationMessage && (
          <div className="taklifim-tpl-card rounded-3xl text-center space-y-3 bg-white/90 border border-pink-100 shadow-xs">
            <p className="text-xs sm:text-sm leading-relaxed text-[#4A3E39] font-medium max-w-md mx-auto break-words">"{invitation.invitationMessage}"</p>
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
