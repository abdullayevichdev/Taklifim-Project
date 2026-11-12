import React from 'react';
import { TemplateRenderProps } from '../types';
import { SharedCountdown } from '../components/SharedCountdown';
import { SharedLocation } from '../components/SharedLocation';
import { SharedSchedule } from '../components/SharedSchedule';
import { SharedGallery } from '../components/SharedGallery';
import { SharedRSVP } from '../components/SharedRSVP';
import { SharedWishes } from '../components/SharedWishes';
import { Mail, Stamp } from 'lucide-react';

export const Template12_VintageCharm: React.FC<TemplateRenderProps> = (props) => {
  const { invitation, template, language, onRSVPSubmit, onWishSubmit, wishesList, interactiveMap, musicPlayer, headingFont } = props;
  const primary = template.colorStyle.primary; // #8A5D45
  const bg = template.colorStyle.background; // #FAF6F2

  return (
    <div className="w-full min-h-screen text-[#3D291E] relative overflow-hidden font-serif" style={{ backgroundColor: bg }}>
      {musicPlayer && <div className="fixed top-4 right-4 z-50">{musicPlayer}</div>}

      <div className="max-w-xl mx-auto px-4 py-12 relative z-10 space-y-12">
        {/* HERO: Vintage Parchment Telegram Card */}
        <div className="relative rounded-2xl p-8 sm:p-12 text-center space-y-6 bg-[#F5EFE6] border-2 border-[#8A5D45]/30 shadow-lg relative">
          {/* Post Stamp Header */}
          <div className="flex items-center justify-between border-b border-[#8A5D45]/20 pb-3">
            <span className="text-[10px] tracking-widest uppercase font-mono text-[#8A5D45]">
              PAR AVION • TELEGRAMME
            </span>
            <div className="w-9 h-11 border-2 border-dashed border-[#8A5D45]/50 rounded flex items-center justify-center text-[10px] text-[#8A5D45]">
              💌
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <h1
              className="text-3xl sm:text-5xl font-black tracking-tight text-[#3D291E]"
              style={{ fontFamily: headingFont || 'Playfair Display' }}
            >
              {invitation.hostNames}
            </h1>
            <div className="text-[11px] font-mono tracking-widest text-[#8A5D45] uppercase">
              {invitation.eventType || 'NOHUDIY AN’ANAVIY TO‘Y'}
            </div>
          </div>

          {invitation.coverImage && (
            <div className="relative rounded-lg overflow-hidden shadow-md border-4 border-white aspect-[4/3] max-w-sm mx-auto sepia-[0.15]">
              <img src={invitation.coverImage} alt={invitation.hostNames} className="w-full h-full object-cover" />
            </div>
          )}

          {invitation.invitationQuote && (
            <p className="italic text-xs sm:text-sm text-[#5C3F2F] max-w-md mx-auto leading-relaxed border-y border-[#8A5D45]/15 py-3">
              «{invitation.invitationQuote}»
            </p>
          )}

          <div className="inline-block py-1.5 px-6 rounded border border-[#8A5D45] font-mono font-bold text-xs">
            DATE: {invitation.eventDate} • TIME: {invitation.startTime}
          </div>
        </div>

        <SharedCountdown eventDate={invitation.eventDate} startTime={invitation.startTime} language={language} primaryColor={primary} />
        {invitation.invitationMessage && (
          <div className="rounded-2xl p-6 sm:p-8 text-center space-y-3 bg-[#F5EFE6] border border-[#8A5D45]/20 shadow-xs">
            <p className="text-xs sm:text-sm leading-relaxed text-[#3D291E] font-medium max-w-md mx-auto font-sans">"{invitation.invitationMessage}"</p>
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
