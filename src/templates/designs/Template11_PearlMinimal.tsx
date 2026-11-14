import React from 'react';
import { TemplateRenderProps } from '../types';
import { SharedCountdown } from '../components/SharedCountdown';
import { SharedLocation } from '../components/SharedLocation';
import { SharedSchedule } from '../components/SharedSchedule';
import { SharedGallery } from '../components/SharedGallery';
import { SharedRSVP } from '../components/SharedRSVP';
import { SharedWishes } from '../components/SharedWishes';
import { TemplateFitTitle } from '../components/TemplateFitTitle';

export const Template11_PearlMinimal: React.FC<TemplateRenderProps> = (props) => {
  const { invitation, template, language, onRSVPSubmit, onWishSubmit, wishesList, interactiveMap, musicPlayer, headingFont } = props;
  const primary = template.colorStyle.primary; // #475569
  const bg = template.colorStyle.background; // #F8FAFC

  return (
    <div className="taklifim-tpl-root w-full min-h-screen text-[#0F172A] relative overflow-hidden font-sans" style={{ backgroundColor: bg }}>
      {musicPlayer && <div className="fixed top-4 right-4 z-50">{musicPlayer}</div>}

      <div className="taklifim-tpl-wrap relative z-10 space-y-14">
        {/* HERO: Editorial Minimalist Oyster Pearl Card */}
        <div className="taklifim-tpl-hero-card-spacious relative rounded-3xl text-center space-y-8 bg-white border border-slate-200 shadow-sm">
          <div className="taklifim-tpl-eyebrow uppercase font-bold text-slate-400">
            {invitation.eventType || 'SAVE THE DATE'}
          </div>

          <div className="space-y-4">
            <TemplateFitTitle
              text={invitation.hostNames}
              maxFontSize={56}
              className="font-light tracking-tight text-slate-900 uppercase"
              style={{ fontFamily: headingFont || 'Playfair Display' }}
            />
            <div className="w-8 h-px bg-slate-300 mx-auto" />
          </div>

          {invitation.coverImage && (
            <div className="relative rounded-xl overflow-hidden shadow-sm aspect-[4/3] max-w-sm mx-auto border border-slate-100">
              <img src={invitation.coverImage} alt={invitation.hostNames} className="w-full h-full object-cover" />
            </div>
          )}

          {invitation.invitationQuote && (
            <p className="font-light italic text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
              {invitation.invitationQuote}
            </p>
          )}

          <div className="text-[clamp(11px,2.8cqw,12px)] uppercase tracking-widest font-semibold text-slate-600 text-center break-words">
            {invitation.eventDate} — {invitation.startTime}
          </div>
        </div>

        <SharedCountdown eventDate={invitation.eventDate} startTime={invitation.startTime} language={language} primaryColor={primary} />
        {invitation.invitationMessage && (
          <div className="taklifim-tpl-card rounded-2xl text-center space-y-3 bg-white border border-slate-100 shadow-xs">
            <p className="text-xs sm:text-sm leading-relaxed text-slate-600 font-light max-w-md mx-auto break-words">"{invitation.invitationMessage}"</p>
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
