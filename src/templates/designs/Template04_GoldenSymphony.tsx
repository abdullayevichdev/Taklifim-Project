import React from 'react';
import { TemplateRenderProps } from '../types';
import { SharedCountdown } from '../components/SharedCountdown';
import { SharedLocation } from '../components/SharedLocation';
import { SharedSchedule } from '../components/SharedSchedule';
import { SharedGallery } from '../components/SharedGallery';
import { SharedRSVP } from '../components/SharedRSVP';
import { SharedWishes } from '../components/SharedWishes';
import { Music, Sparkles } from 'lucide-react';

export const Template04_GoldenSymphony: React.FC<TemplateRenderProps> = (props) => {
  const { invitation, template, language, onRSVPSubmit, onWishSubmit, wishesList, interactiveMap, musicPlayer, headingFont } = props;
  const primary = template.colorStyle.primary; // #C59A4E
  const bg = template.colorStyle.background; // #FAF7F2

  return (
    <div className="w-full min-h-screen text-[#2E261D] relative overflow-hidden" style={{ backgroundColor: bg }}>
      {musicPlayer && <div className="fixed top-4 right-4 z-50">{musicPlayer}</div>}

      <div className="max-w-xl mx-auto px-4 py-12 relative z-10 space-y-12">
        {/* HERO: Golden Symphony Orchestra Card */}
        <div className="relative rounded-[36px] p-8 sm:p-12 text-center space-y-6 bg-white/95 border-2 border-[#C59A4E]/30 shadow-2xl">
          <div className="flex items-center justify-center gap-2 text-[#C59A4E]">
            <Music className="w-4 h-4 animate-bounce" />
            <span className="text-[10px] tracking-[0.3em] uppercase font-bold">
              {invitation.eventType || 'OLTIN SIMFONIYA TO‘YI'}
            </span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>

          <div className="space-y-2">
            <h1
              className="text-4xl sm:text-5xl font-black tracking-tight text-[#2E261D]"
              style={{ fontFamily: headingFont || 'Playfair Display' }}
            >
              {invitation.hostNames}
            </h1>
            <div className="flex items-center justify-center gap-2 text-[#C59A4E]">
              <span className="text-xs">𝄞</span>
              <div className="w-24 h-0.5 bg-[#C59A4E]/50" />
              <span className="text-xs">𝄢</span>
            </div>
          </div>

          {invitation.coverImage && (
            <div className="relative rounded-2xl overflow-hidden shadow-lg border-2 border-[#C59A4E]/40 aspect-[4/3] max-w-sm mx-auto">
              <img src={invitation.coverImage} alt={invitation.hostNames} className="w-full h-full object-cover" />
            </div>
          )}

          {invitation.invitationQuote && (
            <p className="font-serif italic text-xs sm:text-sm text-[#6E593A] max-w-md mx-auto leading-relaxed">
              {invitation.invitationQuote}
            </p>
          )}

          <div className="inline-flex items-center gap-2 py-2 px-6 rounded-full bg-gradient-to-r from-amber-100/80 via-amber-200/90 to-amber-100/80 border border-amber-300 text-[#2E261D] font-bold text-xs shadow-xs">
            <span>{invitation.eventDate}</span>
            <span>•</span>
            <span>{invitation.startTime}</span>
          </div>
        </div>

        <SharedCountdown eventDate={invitation.eventDate} startTime={invitation.startTime} language={language} primaryColor={primary} />
        {invitation.invitationMessage && (
          <div className="rounded-3xl p-6 sm:p-8 text-center space-y-3 bg-white/90 border border-amber-200 shadow-xs">
            <p className="text-xs sm:text-sm leading-relaxed text-[#4A3E39] font-medium max-w-md mx-auto">"{invitation.invitationMessage}"</p>
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
