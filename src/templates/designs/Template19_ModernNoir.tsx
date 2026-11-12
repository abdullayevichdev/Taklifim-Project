import React from 'react';
import { TemplateRenderProps } from '../types';
import { SharedCountdown } from '../components/SharedCountdown';
import { SharedLocation } from '../components/SharedLocation';
import { SharedSchedule } from '../components/SharedSchedule';
import { SharedGallery } from '../components/SharedGallery';
import { SharedRSVP } from '../components/SharedRSVP';
import { SharedWishes } from '../components/SharedWishes';

export const Template19_ModernNoir: React.FC<TemplateRenderProps> = (props) => {
  const { invitation, template, language, onRSVPSubmit, onWishSubmit, wishesList, interactiveMap, musicPlayer, headingFont } = props;
  const primary = template.colorStyle.primary; // #D4AF37
  const bg = template.colorStyle.background; // #0B1522

  return (
    <div className="w-full min-h-screen text-white relative overflow-hidden" style={{ backgroundColor: bg }}>
      {musicPlayer && <div className="fixed top-4 right-4 z-50">{musicPlayer}</div>}

      {/* Art Deco Geometric Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,#D4AF37_1px,transparent_1px),linear-gradient(to_bottom,#D4AF37_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      <div className="max-w-xl mx-auto px-4 py-12 relative z-10 space-y-12">
        {/* HERO: Art-Deco Obsidian & Gold VIP Card */}
        <div className="relative rounded-3xl p-8 sm:p-14 text-center space-y-6 bg-black/90 backdrop-blur-2xl border-2 border-[#D4AF37] shadow-[0_30px_90px_rgba(0,0,0,0.9)]">
          {/* Geometric Corner Accents */}
          <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-[#D4AF37]" />
          <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-[#D4AF37]" />
          <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-[#D4AF37]" />
          <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-[#D4AF37]" />

          <div className="text-[11px] tracking-[0.4em] uppercase font-mono font-bold text-amber-300">
            {invitation.eventType || 'EXCLUSIVE VIP GALA'}
          </div>

          <div className="space-y-3">
            <h1
              className="text-4xl sm:text-5xl font-black tracking-tight text-white uppercase drop-shadow-md"
              style={{ fontFamily: headingFont || 'Playfair Display' }}
            >
              {invitation.hostNames}
            </h1>
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-px bg-[#D4AF37]" />
              <span className="text-[#D4AF37] text-xs">◆</span>
              <div className="w-12 h-px bg-[#D4AF37]" />
            </div>
          </div>

          {invitation.coverImage && (
            <div className="relative rounded-xl overflow-hidden shadow-2xl border-2 border-[#D4AF37]/50 aspect-[4/3] max-w-sm mx-auto">
              <img src={invitation.coverImage} alt={invitation.hostNames} className="w-full h-full object-cover" />
            </div>
          )}

          {invitation.invitationQuote && (
            <p className="font-serif italic text-xs sm:text-sm text-amber-100/90 max-w-md mx-auto leading-relaxed">
              {invitation.invitationQuote}
            </p>
          )}

          <div className="inline-flex items-center gap-2 py-2 px-6 rounded-none border border-[#D4AF37] bg-black/60 text-amber-300 font-mono text-xs tracking-wider">
            <span>{invitation.eventDate}</span>
            <span>//</span>
            <span>{invitation.startTime}</span>
          </div>
        </div>

        <SharedCountdown eventDate={invitation.eventDate} startTime={invitation.startTime} language={language} primaryColor="#D4AF37" isDarkTheme={true} />
        {invitation.invitationMessage && (
          <div className="rounded-2xl p-6 sm:p-8 text-center space-y-3 bg-black/80 border border-white/10 shadow-xs">
            <p className="text-xs sm:text-sm leading-relaxed text-white/90 font-medium max-w-md mx-auto">"{invitation.invitationMessage}"</p>
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
