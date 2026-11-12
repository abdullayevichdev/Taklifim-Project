import React from 'react';
import { TemplateRenderProps } from '../types';
import { SharedCountdown } from '../components/SharedCountdown';
import { SharedLocation } from '../components/SharedLocation';
import { SharedSchedule } from '../components/SharedSchedule';
import { SharedGallery } from '../components/SharedGallery';
import { SharedRSVP } from '../components/SharedRSVP';
import { SharedWishes } from '../components/SharedWishes';

export const Template03_VelvetSharqona: React.FC<TemplateRenderProps> = (props) => {
  const { invitation, template, language, onRSVPSubmit, onWishSubmit, wishesList, interactiveMap, musicPlayer, headingFont } = props;
  const primary = template.colorStyle.primary; // #184738
  const accent = template.colorStyle.accent; // #C59A4E
  const bg = template.colorStyle.background; // #F9F6F0

  return (
    <div className="w-full min-h-screen text-[#1C2E25] relative overflow-hidden" style={{ backgroundColor: bg }}>
      {musicPlayer && <div className="fixed top-4 right-4 z-50">{musicPlayer}</div>}

      {/* Oriental Pattern Backdrop */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#C59A4E_1.5px,transparent_1.5px)] [background-size:28px_28px]" />

      {/* Main Container */}
      <div className="max-w-xl mx-auto px-4 py-12 relative z-10 space-y-12">
        {/* HERO: Oriental Arch / Gumbaz Motif in Emerald & Gold */}
        <div className="relative rounded-[40px] p-2 bg-gradient-to-b from-[#C59A4E] via-[#184738] to-[#C59A4E] shadow-2xl">
          <div className="rounded-[36px] p-6 sm:p-10 text-center space-y-6 bg-[#F9F6F0] relative overflow-hidden border border-white">
            {/* Top Oriental Islamic Arch Header */}
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2 text-[#C59A4E] text-lg">
                <span>✦</span>
                <span className="text-xl">🕌</span>
                <span>✦</span>
              </div>
              <div className="text-[10px] tracking-[0.3em] uppercase font-black text-[#184738]">
                {invitation.eventType || 'SHARQONA NIKOH TO‘YI'}
              </div>
            </div>

            {/* Couple Names */}
            <div className="space-y-2">
              <h1
                className="text-3xl sm:text-5xl font-black tracking-tight text-[#184738]"
                style={{ fontFamily: headingFont || 'Playfair Display' }}
              >
                {invitation.hostNames}
              </h1>
              <div className="flex items-center justify-center gap-2 text-[#C59A4E]">
                <span>❖</span>
                <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-[#C59A4E] to-transparent" />
                <span>❖</span>
              </div>
            </div>

            {/* Cover Image in Oriental Arch Frame */}
            {invitation.coverImage && (
              <div className="relative rounded-t-[100px] rounded-b-2xl overflow-hidden shadow-lg border-3 border-[#C59A4E] aspect-[4/3] max-w-sm mx-auto">
                <img src={invitation.coverImage} alt={invitation.hostNames} className="w-full h-full object-cover" />
              </div>
            )}

            {/* Quote */}
            {invitation.invitationQuote && (
              <p className="font-serif italic text-xs sm:text-sm text-[#184738] max-w-md mx-auto leading-relaxed">
                {invitation.invitationQuote}
              </p>
            )}

            {/* Date Badge */}
            <div className="inline-flex items-center gap-2 py-2 px-6 rounded-full bg-[#184738] text-[#F2E8DC] font-bold text-xs shadow-md border border-[#C59A4E]">
              <span>{invitation.eventDate}</span>
              <span>•</span>
              <span>{invitation.startTime}</span>
            </div>
          </div>
        </div>

        {/* 1. COUNTDOWN */}
        <SharedCountdown
          eventDate={invitation.eventDate}
          startTime={invitation.startTime}
          language={language}
          primaryColor={primary}
          variant="oriental"
        />

        {/* 2. INVITATION MESSAGE */}
        {invitation.invitationMessage && (
          <div className="rounded-3xl p-6 sm:p-8 text-center space-y-3 bg-white/95 border border-[#C59A4E]/30 shadow-md">
            <span className="text-[#C59A4E] text-2xl font-serif">﷽</span>
            <p className="text-xs sm:text-sm leading-relaxed text-[#1C2E25] font-medium max-w-md mx-auto">
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
