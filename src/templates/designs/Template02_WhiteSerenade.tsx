import React from 'react';
import { TemplateRenderProps } from '../types';
import { SharedCountdown } from '../components/SharedCountdown';
import { SharedLocation } from '../components/SharedLocation';
import { SharedSchedule } from '../components/SharedSchedule';
import { SharedGallery } from '../components/SharedGallery';
import { SharedRSVP } from '../components/SharedRSVP';
import { SharedWishes } from '../components/SharedWishes';
import { Flower2, Heart } from 'lucide-react';

export const Template02_WhiteSerenade: React.FC<TemplateRenderProps> = (props) => {
  const { invitation, template, language, onRSVPSubmit, onWishSubmit, wishesList, interactiveMap, musicPlayer, headingFont } = props;
  const primary = template.colorStyle.primary; // #D9658B
  const bg = template.colorStyle.background; // #FAF6F0

  return (
    <div className="w-full min-h-screen text-[#231E1B] relative overflow-hidden" style={{ backgroundColor: bg }}>
      {musicPlayer && <div className="fixed top-4 right-4 z-50">{musicPlayer}</div>}

      {/* Floating Floral Petal Glow Accents */}
      <div className="absolute top-10 left-1/4 w-72 h-72 rounded-full bg-gradient-to-br from-[#F5C9D8]/40 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-1/4 w-80 h-80 rounded-full bg-gradient-to-tl from-[#FFF5F8] via-[#F5C9D8]/30 to-transparent blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-xl mx-auto px-4 py-12 relative z-10 space-y-12">
        {/* HERO: Romantic White & Blush Floral Card */}
        <div className="relative rounded-[36px] p-8 sm:p-12 text-center space-y-6 bg-white/90 backdrop-blur-xl border border-white shadow-[0_20px_60px_rgba(217,101,139,0.15)]">
          {/* Top Delicate Floral Blossom Wreath */}
          <div className="flex items-center justify-center gap-2 text-[#D9658B]">
            <Flower2 className="w-5 h-5 animate-pulse" />
            <span className="font-script text-2xl sm:text-3xl font-bold tracking-wide text-[#D9658B]">
              Oq gullar jilosi
            </span>
            <Flower2 className="w-5 h-5 animate-pulse" />
          </div>

          <div className="text-[10px] tracking-[0.25em] uppercase font-bold text-[#8A7C74]">
            {invitation.eventType || 'VISOL OQSHOMI'}
          </div>

          {/* Couple Names */}
          <div className="space-y-2">
            <h1
              className="text-4xl sm:text-5xl font-black tracking-tight text-[#1E1418]"
              style={{ fontFamily: headingFont || 'Playfair Display' }}
            >
              {invitation.hostNames}
            </h1>
            <div className="flex items-center justify-center gap-2 text-rose-300">
              <span>🌸</span>
              <div className="w-20 h-px bg-rose-200" />
              <span>🌸</span>
            </div>
          </div>

          {/* Cover Image in Soft Rounded Floral Frame */}
          {invitation.coverImage && (
            <div className="relative rounded-3xl overflow-hidden shadow-md border-4 border-white aspect-[4/3] max-w-sm mx-auto">
              <img src={invitation.coverImage} alt={invitation.hostNames} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Quote */}
          {invitation.invitationQuote && (
            <p className="font-serif italic text-xs sm:text-sm text-[#5C4F48] max-w-md mx-auto leading-relaxed">
              {invitation.invitationQuote}
            </p>
          )}

          {/* Date Badge */}
          <div className="inline-flex items-center gap-2 py-2 px-5 rounded-full bg-gradient-to-r from-[#FFF5F8] to-[#F5C9D8]/30 border border-[#F5C9D8] text-[#1E1418] font-bold text-xs shadow-xs">
            <span>{invitation.eventDate}</span>
            <span>•</span>
            <span>{invitation.startTime}</span>
          </div>
        </div>

        {/* 1. COUNTDOWN */}
        <SharedCountdown
          eventDate={invitation.eventDate}
          startTime={invitation.startTime}
          language={language}
          primaryColor={primary}
          variant="floral"
        />

        {/* 2. INVITATION MESSAGE */}
        {invitation.invitationMessage && (
          <div className="rounded-3xl p-6 sm:p-8 text-center space-y-3 bg-white/90 border border-white shadow-sm">
            <Heart className="w-5 h-5 text-[#D9658B] fill-current mx-auto opacity-70" />
            <p className="text-xs sm:text-sm leading-relaxed text-[#4A3E39] font-medium max-w-md mx-auto">
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

        {/* 5. LOCATION */}
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

        {/* 6. RSVP */}
        {invitation.rsvpEnabled && (
          <SharedRSVP
            language={language}
            primaryColor={primary}
            deadline={invitation.rsvpDeadline}
            askMealPreference={invitation.askMealPreference}
            onRSVPSubmit={onRSVPSubmit}
          />
        )}

        {/* 7. WISHES */}
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
