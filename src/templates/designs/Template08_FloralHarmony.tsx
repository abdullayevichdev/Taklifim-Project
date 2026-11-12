import React from 'react';
import { TemplateRenderProps } from '../types';
import { SharedCountdown } from '../components/SharedCountdown';
import { SharedLocation } from '../components/SharedLocation';
import { SharedSchedule } from '../components/SharedSchedule';
import { SharedGallery } from '../components/SharedGallery';
import { SharedRSVP } from '../components/SharedRSVP';
import { SharedWishes } from '../components/SharedWishes';
import { Leaf } from 'lucide-react';

export const Template08_FloralHarmony: React.FC<TemplateRenderProps> = (props) => {
  const { invitation, template, language, onRSVPSubmit, onWishSubmit, wishesList, interactiveMap, musicPlayer, headingFont } = props;
  const primary = template.colorStyle.primary; // #5C7449
  const bg = template.colorStyle.background; // #F7F9F5

  return (
    <div className="w-full min-h-screen text-[#1E2B16] relative overflow-hidden" style={{ backgroundColor: bg }}>
      {musicPlayer && <div className="fixed top-4 right-4 z-50">{musicPlayer}</div>}

      <div className="max-w-xl mx-auto px-4 py-12 relative z-10 space-y-12">
        {/* HERO: Sage Botanical Garden Wreath Card */}
        <div className="relative rounded-[36px] p-8 sm:p-12 text-center space-y-6 bg-white/95 border-2 border-[#5C7449]/25 shadow-[0_20px_50px_rgba(92,116,73,0.12)]">
          <div className="flex items-center justify-center gap-2 text-[#5C7449]">
            <Leaf className="w-4 h-4" />
            <span className="text-[10px] tracking-[0.3em] uppercase font-bold">
              {invitation.eventType || 'FLORAL HARMONY'}
            </span>
            <Leaf className="w-4 h-4 scale-x-[-1]" />
          </div>

          <div className="space-y-2">
            <h1
              className="text-4xl sm:text-5xl font-black tracking-tight text-[#1E2B16]"
              style={{ fontFamily: headingFont || 'Playfair Display' }}
            >
              {invitation.hostNames}
            </h1>
            <div className="flex items-center justify-center gap-2 text-[#5C7449]">
              <span>🌿</span>
              <div className="w-20 h-px bg-[#5C7449]/30" />
              <span>🌿</span>
            </div>
          </div>

          {invitation.coverImage && (
            <div className="relative rounded-2xl overflow-hidden shadow-md border-2 border-[#5C7449]/30 aspect-[4/3] max-w-sm mx-auto">
              <img src={invitation.coverImage} alt={invitation.hostNames} className="w-full h-full object-cover" />
            </div>
          )}

          {invitation.invitationQuote && (
            <p className="font-serif italic text-xs sm:text-sm text-[#4E623E] max-w-md mx-auto leading-relaxed">
              {invitation.invitationQuote}
            </p>
          )}

          <div className="inline-flex items-center gap-2 py-2 px-6 rounded-full bg-[#EBF2E6] border border-[#5C7449]/30 text-[#1E2B16] font-bold text-xs shadow-xs">
            <span>{invitation.eventDate}</span>
            <span>•</span>
            <span>{invitation.startTime}</span>
          </div>
        </div>

        <SharedCountdown eventDate={invitation.eventDate} startTime={invitation.startTime} language={language} primaryColor={primary} />
        {invitation.invitationMessage && (
          <div className="rounded-3xl p-6 sm:p-8 text-center space-y-3 bg-white/90 border border-green-100 shadow-xs">
            <p className="text-xs sm:text-sm leading-relaxed text-[#1E2B16] font-medium max-w-md mx-auto">"{invitation.invitationMessage}"</p>
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
