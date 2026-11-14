import React from 'react';
import { TemplateRenderProps } from '../types';
import { SharedCountdown } from '../components/SharedCountdown';
import { SharedLocation } from '../components/SharedLocation';
import { SharedSchedule } from '../components/SharedSchedule';
import { SharedGallery } from '../components/SharedGallery';
import { SharedRSVP } from '../components/SharedRSVP';
import { SharedWishes } from '../components/SharedWishes';
import { TemplateFitTitle } from '../components/TemplateFitTitle';
import { Sparkles } from 'lucide-react';

export const Template20_SweetButterfly: React.FC<TemplateRenderProps> = (props) => {
  const { invitation, template, language, onRSVPSubmit, onWishSubmit, wishesList, interactiveMap, musicPlayer, headingFont } = props;
  const primary = template.colorStyle.primary; // #4A8BB8
  const bg = template.colorStyle.background; // #F5FAFE

  return (
    <div className="taklifim-tpl-root w-full min-h-screen text-[#142A3B] relative overflow-hidden" style={{ backgroundColor: bg }}>
      {musicPlayer && <div className="fixed top-4 right-4 z-50">{musicPlayer}</div>}

      <div className="taklifim-tpl-wrap relative z-10 space-y-12">
        {/* HERO: Sweet Butterfly Sky Cloud Card */}
        <div className="taklifim-tpl-hero-card relative rounded-[36px] text-center space-y-6 bg-white/95 border-2 border-[#4A8BB8]/20 shadow-[0_20px_50px_rgba(74,139,184,0.15)]">
          <div className="flex items-center justify-center gap-2 text-[#4A8BB8] min-w-0">
            <span className="text-base shrink-0 animate-bounce">🦋</span>
            <span className="taklifim-tpl-eyebrow uppercase font-bold min-w-0">
              {invitation.eventType || 'SWEET BUTTERFLY'}
            </span>
            <span className="text-base shrink-0 animate-bounce">🦋</span>
          </div>

          <div className="space-y-2">
            <TemplateFitTitle
              text={invitation.hostNames}
              className="font-black tracking-tight text-[#142A3B]"
              style={{ fontFamily: headingFont || 'Playfair Display' }}
            />
            <div className="flex items-center justify-center gap-2 text-[#4A8BB8]">
              <span>☁️</span>
              <div className="w-20 h-px bg-[#4A8BB8]/30" />
              <span>☁️</span>
            </div>
          </div>

          {invitation.coverImage && (
            <div className="relative rounded-3xl overflow-hidden shadow-md border-3 border-[#4A8BB8]/30 aspect-[4/3] max-w-sm mx-auto">
              <img src={invitation.coverImage} alt={invitation.hostNames} className="w-full h-full object-cover" />
            </div>
          )}

          {invitation.invitationQuote && (
            <p className="font-serif italic text-xs sm:text-sm text-[#42647D] max-w-md mx-auto leading-relaxed">
              {invitation.invitationQuote}
            </p>
          )}

          <div className="taklifim-tpl-date-pill inline-flex items-center gap-2 rounded-full bg-[#EAF4FB] border border-[#4A8BB8]/30 text-[#142A3B] font-bold shadow-xs">
            <span>{invitation.eventDate}</span>
            <span>•</span>
            <span>{invitation.startTime}</span>
          </div>
        </div>

        <SharedCountdown eventDate={invitation.eventDate} startTime={invitation.startTime} language={language} primaryColor={primary} />
        {invitation.invitationMessage && (
          <div className="taklifim-tpl-card rounded-3xl text-center space-y-3 bg-white/90 border border-sky-100 shadow-xs">
            <p className="text-xs sm:text-sm leading-relaxed text-[#142A3B] font-medium max-w-md mx-auto break-words">"{invitation.invitationMessage}"</p>
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
