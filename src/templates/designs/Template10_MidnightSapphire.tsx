import React from 'react';
import { TemplateRenderProps } from '../types';
import { SharedCountdown } from '../components/SharedCountdown';
import { SharedLocation } from '../components/SharedLocation';
import { SharedSchedule } from '../components/SharedSchedule';
import { SharedGallery } from '../components/SharedGallery';
import { SharedRSVP } from '../components/SharedRSVP';
import { SharedWishes } from '../components/SharedWishes';
import { TemplateFitTitle } from '../components/TemplateFitTitle';
import { Sparkles, Moon } from 'lucide-react';

export const Template10_MidnightSapphire: React.FC<TemplateRenderProps> = (props) => {
  const { invitation, template, language, onRSVPSubmit, onWishSubmit, wishesList, interactiveMap, musicPlayer, headingFont } = props;
  const primary = template.colorStyle.primary; // #D4AF37
  const bg = template.colorStyle.background; // #0B152A

  return (
    <div className="taklifim-tpl-root w-full min-h-screen text-white relative overflow-hidden" style={{ backgroundColor: bg }}>
      {musicPlayer && <div className="fixed top-4 right-4 z-50">{musicPlayer}</div>}

      {/* Constellation Starlight Backdrop */}
      <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:32px_32px]" />

      <div className="taklifim-tpl-wrap relative z-10 space-y-12">
        {/* HERO: Deep Midnight Sapphire Glowing Card */}
        <div className="taklifim-tpl-hero-card relative rounded-[36px] text-center space-y-6 bg-[#0E1B33]/90 backdrop-blur-xl border-2 border-[#D4AF37]/35 shadow-[0_25px_70px_rgba(0,0,0,0.7)]">
          <div className="flex items-center justify-center gap-2 text-amber-300 min-w-0">
            <Moon className="w-4 h-4 shrink-0" />
            <span className="taklifim-tpl-eyebrow uppercase font-bold text-amber-300 min-w-0">
              {invitation.eventType || 'MIDNIGHT SAPPHIRE'}
            </span>
            <Sparkles className="w-4 h-4 shrink-0" />
          </div>

          <div className="space-y-2">
            <TemplateFitTitle
              text={invitation.hostNames}
              className="font-black tracking-tight text-white drop-shadow-md"
              style={{ fontFamily: headingFont || 'Playfair Display' }}
            />
            <div className="flex items-center justify-center gap-2 text-amber-300">
              <span>✦</span>
              <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
              <span>✦</span>
            </div>
          </div>

          {invitation.coverImage && (
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-400/40 aspect-[4/3] max-w-sm mx-auto">
              <img src={invitation.coverImage} alt={invitation.hostNames} className="w-full h-full object-cover" />
            </div>
          )}

          {invitation.invitationQuote && (
            <p className="font-serif italic text-xs sm:text-sm text-amber-100/90 max-w-md mx-auto leading-relaxed">
              {invitation.invitationQuote}
            </p>
          )}

          <div className="taklifim-tpl-date-pill inline-flex items-center gap-2 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 font-bold shadow-xs">
            <span>{invitation.eventDate}</span>
            <span>•</span>
            <span>{invitation.startTime}</span>
          </div>
        </div>

        <SharedCountdown eventDate={invitation.eventDate} startTime={invitation.startTime} language={language} primaryColor="#D4AF37" isDarkTheme={true} variant="sapphire" />
        {invitation.invitationMessage && (
          <div className="taklifim-tpl-card rounded-3xl text-center space-y-3 bg-[#0E1B33]/80 border border-white/10 shadow-xs">
            <p className="text-xs sm:text-sm leading-relaxed text-white/90 font-medium max-w-md mx-auto break-words">"{invitation.invitationMessage}"</p>
          </div>
        )}
        {invitation.schedule && invitation.schedule.length > 0 && <SharedSchedule schedule={invitation.schedule} language={language} primaryColor="#D4AF37" isDarkTheme={true} />}
        {invitation.galleryImages && invitation.galleryImages.length > 0 && <SharedGallery images={invitation.galleryImages} title={invitation.galleryTitle} language={language} primaryColor="#D4AF37" isDarkTheme={true} />}
        <SharedLocation venueName={invitation.venueName} venueAddress={invitation.venueAddress} venueLocationType={invitation.venueLocationType} celebrationAudience={invitation.celebrationAudience} eventDate={invitation.eventDate} startTime={invitation.startTime} endTime={invitation.endTime} hostNames={invitation.hostNames} eventType={invitation.eventType} mapUrl={invitation.mapUrl} language={language} primaryColor="#D4AF37" isDarkTheme={true} interactiveMap={interactiveMap} />
        {invitation.rsvpEnabled && <SharedRSVP language={language} primaryColor="#D4AF37" isDarkTheme={true} deadline={invitation.rsvpDeadline} askMealPreference={invitation.askMealPreference} onRSVPSubmit={onRSVPSubmit} />}
        <SharedWishes wishes={wishesList} language={language} primaryColor="#D4AF37" isDarkTheme={true} onWishSubmit={onWishSubmit} />
      </div>
    </div>
  );
};
