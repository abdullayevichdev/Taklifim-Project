import React from 'react';
import { TemplateRenderProps } from '../types';
import { SharedCountdown } from '../components/SharedCountdown';
import { SharedLocation } from '../components/SharedLocation';
import { SharedSchedule } from '../components/SharedSchedule';
import { SharedGallery } from '../components/SharedGallery';
import { SharedRSVP } from '../components/SharedRSVP';
import { SharedWishes } from '../components/SharedWishes';
import { TemplateFitTitle } from '../components/TemplateFitTitle';
import { Mail, Stamp } from 'lucide-react';

export const Template12_VintageCharm: React.FC<TemplateRenderProps> = (props) => {
  const { invitation, template, language, onRSVPSubmit, onWishSubmit, wishesList, interactiveMap, musicPlayer, headingFont } = props;
  const primary = template.colorStyle.primary; // #8A5D45
  const bg = template.colorStyle.background; // #FAF6F2

  return (
    <div className="taklifim-tpl-root w-full min-h-screen text-[#3D291E] relative overflow-hidden font-serif" style={{ backgroundColor: bg }}>
      {musicPlayer && <div className="fixed top-4 right-4 z-50">{musicPlayer}</div>}

      <div className="taklifim-tpl-wrap relative z-10 space-y-12">
        {/* HERO: Vintage Parchment Telegram Card */}
        <div className="taklifim-tpl-hero-card relative rounded-2xl text-center space-y-6 bg-[#F5EFE6] border-2 border-[#8A5D45]/30 shadow-lg">
          {/* Post Stamp Header */}
          <div className="flex items-center justify-between gap-2 border-b border-[#8A5D45]/20 pb-3">
            <span className="text-[clamp(9px,2.4cqw,10px)] tracking-widest uppercase font-mono text-[#8A5D45] text-left">
              PAR AVION • TELEGRAMME
            </span>
            <div className="w-9 h-11 shrink-0 border-2 border-dashed border-[#8A5D45]/50 rounded flex items-center justify-center text-[10px] text-[#8A5D45]">
              💌
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <TemplateFitTitle
              text={invitation.hostNames}
              className="font-black tracking-tight text-[#3D291E]"
              style={{ fontFamily: headingFont || 'Playfair Display' }}
            />
            <div className="taklifim-tpl-eyebrow font-mono text-[#8A5D45] uppercase">
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

          <div className="taklifim-tpl-date-pill inline-flex items-center gap-1.5 rounded border border-[#8A5D45] font-mono font-bold">
            DATE: {invitation.eventDate} • TIME: {invitation.startTime}
          </div>
        </div>

        <SharedCountdown eventDate={invitation.eventDate} startTime={invitation.startTime} language={language} primaryColor={primary} />
        {invitation.invitationMessage && (
          <div className="taklifim-tpl-card rounded-2xl text-center space-y-3 bg-[#F5EFE6] border border-[#8A5D45]/20 shadow-xs">
            <p className="text-xs sm:text-sm leading-relaxed text-[#3D291E] font-medium max-w-md mx-auto font-sans break-words">"{invitation.invitationMessage}"</p>
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
