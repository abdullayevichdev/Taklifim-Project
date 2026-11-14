import React from 'react';
import { TemplateRenderProps } from '../types';
import { SharedCountdown } from '../components/SharedCountdown';
import { SharedLocation } from '../components/SharedLocation';
import { SharedSchedule } from '../components/SharedSchedule';
import { SharedGallery } from '../components/SharedGallery';
import { SharedRSVP } from '../components/SharedRSVP';
import { SharedWishes } from '../components/SharedWishes';
import { TemplateFitTitle } from '../components/TemplateFitTitle';

export const Template01_AureliaRoyal: React.FC<TemplateRenderProps> = (props) => {
  const { invitation, template, language, isPreview, onRSVPSubmit, onWishSubmit, wishesList, interactiveMap, musicPlayer, headingFont } = props;
  const primary = template.colorStyle.primary; // #B48B47
  const bg = template.colorStyle.background; // #FAF6F0

  return (
    <div className="taklifim-tpl-root w-full min-h-screen text-[#2A2420] relative overflow-hidden" style={{ backgroundColor: bg }}>
      {/* Floating music player if provided */}
      {musicPlayer && <div className="fixed top-4 right-4 z-50">{musicPlayer}</div>}

      {/* Royal Gold Filigree Background Ornaments */}
      <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(#B48B47_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-[#B48B47]/20 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-tl from-[#B48B47]/20 to-transparent blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="taklifim-tpl-wrap relative z-10 space-y-12">
        {/* HERO: Royal Double-Border Golden Crest Card */}
        <div className="relative rounded-[32px] p-2 bg-gradient-to-b from-[#E6D2B5] via-[#B48B47] to-[#E6D2B5] shadow-2xl">
          <div className="rounded-[28px] taklifim-tpl-hero-card text-center space-y-6 bg-[#FAF6F0] relative overflow-hidden border border-white">
            {/* Top Royal Crest */}
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#B48B47] to-[#F3E7D3] p-0.5 shadow-md">
                <div className="w-full h-full rounded-full bg-[#FAF6F0] flex items-center justify-center text-[#B48B47] font-serif text-xl font-bold">
                  ⚜️
                </div>
              </div>
              <div className="taklifim-tpl-eyebrow uppercase font-black text-[#B48B47]">
                {invitation.eventType || 'QIROLLIK TO‘YI'}
              </div>
            </div>

            {/* Couple Names in Golden Royal Serif */}
            <div className="space-y-2">
              <TemplateFitTitle
                text={invitation.hostNames}
                className="font-black tracking-tight text-[#2A2420] drop-shadow-xs"
                style={{ fontFamily: headingFont || 'Playfair Display' }}
              />
              <div className="flex items-center justify-center gap-3">
                <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#B48B47]" />
                <span className="text-[#B48B47] text-xs">✦</span>
                <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#B48B47]" />
              </div>
            </div>

            {/* Cover Image in Royal Gold Frame */}
            {invitation.coverImage && (
              <div className="relative rounded-2xl overflow-hidden shadow-lg border-2 border-[#B48B47]/40 aspect-[4/3] max-w-sm mx-auto">
                <img src={invitation.coverImage} alt={invitation.hostNames} className="w-full h-full object-cover" />
              </div>
            )}

            {/* Royal Quote */}
            {invitation.invitationQuote && (
              <p className="font-playfair italic text-xs sm:text-sm text-[#5A451F] max-w-md mx-auto leading-relaxed">
                {invitation.invitationQuote}
              </p>
            )}

            {/* Date Badge */}
            <div className="taklifim-tpl-date-pill inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#B48B47]/15 via-[#B48B47]/25 to-[#B48B47]/15 border border-[#B48B47]/40 text-[#2A2420] font-bold shadow-xs">
              <span>{invitation.eventDate}</span>
              <span>•</span>
              <span>{invitation.startTime}</span>
            </div>
          </div>
        </div>

        {/* 1. COUNTDOWN TIMER */}
        <SharedCountdown
          eventDate={invitation.eventDate}
          startTime={invitation.startTime}
          language={language}
          primaryColor={primary}
          variant="royal"
        />

        {/* 2. INVITATION MESSAGE */}
        {invitation.invitationMessage && (
          <div className="taklifim-tpl-card rounded-3xl text-center space-y-3 bg-white/90 border border-[#B48B47]/20 shadow-md">
            <span className="text-xl">💌</span>
            <p className="text-xs sm:text-sm leading-relaxed text-[#4A3E39] font-medium max-w-md mx-auto break-words">
              "{invitation.invitationMessage}"
            </p>
          </div>
        )}

        {/* 3. SCHEDULE */}
        {invitation.schedule && invitation.schedule.length > 0 && (
          <SharedSchedule
            schedule={invitation.schedule}
            language={language}
            primaryColor={primary}
          />
        )}

        {/* 4. GALLERY */}
        {invitation.galleryImages && invitation.galleryImages.length > 0 && (
          <SharedGallery
            images={invitation.galleryImages}
            title={invitation.galleryTitle}
            language={language}
            primaryColor={primary}
          />
        )}

        {/* 5. LOCATION & MAP */}
        <SharedLocation
          venueName={invitation.venueName}
          venueAddress={invitation.venueAddress}
          venueLocationType={invitation.venueLocationType}
          celebrationAudience={invitation.celebrationAudience}
          eventDate={invitation.eventDate}
          startTime={invitation.startTime}
          endTime={invitation.endTime}
          hostNames={invitation.hostNames}
          eventType={invitation.eventType}
          mapUrl={invitation.mapUrl}
          language={language}
          primaryColor={primary}
          interactiveMap={interactiveMap}
        />

        {/* 6. RSVP CONFIRMATION */}
        {invitation.rsvpEnabled && (
          <SharedRSVP
            language={language}
            primaryColor={primary}
            deadline={invitation.rsvpDeadline}
            askMealPreference={invitation.askMealPreference}
            onRSVPSubmit={onRSVPSubmit}
          />
        )}

        {/* 7. WISHES WALL */}
        <SharedWishes
          wishes={wishesList}
          language={language}
          primaryColor={primary}
          onWishSubmit={onWishSubmit}
        />
      </div>
    </div>
  );
};
