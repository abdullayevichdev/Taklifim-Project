import React from 'react';
import { InvitationData, Language, GuestRSVP } from '../types';
import { mockTemplates } from '../data/mockTemplates';
import { TemplateRenderProps } from './types';

// Individual template designs
import { Template01_AureliaRoyal } from './designs/Template01_AureliaRoyal';
import { Template02_WhiteSerenade } from './designs/Template02_WhiteSerenade';
import { Template03_VelvetSharqona } from './designs/Template03_VelvetSharqona';
import { Template04_GoldenSymphony } from './designs/Template04_GoldenSymphony';
import { Template05_EmeraldGrace } from './designs/Template05_EmeraldGrace';
import { Template06_PastelRomance } from './designs/Template06_PastelRomance';
import { Template07_BlushElegance } from './designs/Template07_BlushElegance';
import { Template08_FloralHarmony } from './designs/Template08_FloralHarmony';
import { Template09_CrystalPure } from './designs/Template09_CrystalPure';
import { Template10_MidnightSapphire } from './designs/Template10_MidnightSapphire';
import { Template11_PearlMinimal } from './designs/Template11_PearlMinimal';
import { Template12_VintageCharm } from './designs/Template12_VintageCharm';
import { Template13_RoseGoldLuxe } from './designs/Template13_RoseGoldLuxe';
import { Template14_BotanicalGarden } from './designs/Template14_BotanicalGarden';
import { Template15_CelestialDream } from './designs/Template15_CelestialDream';
import { Template16_SunlitTerracotta } from './designs/Template16_SunlitTerracotta';
import { Template17_IvoryBlossom } from './designs/Template17_IvoryBlossom';
import { Template18_RoyalRuby } from './designs/Template18_RoyalRuby';
import { Template19_ModernNoir } from './designs/Template19_ModernNoir';
import { Template20_SweetButterfly } from './designs/Template20_SweetButterfly';

export interface TemplateRendererProps {
  invitation: InvitationData;
  language?: Language;
  isPreview?: boolean;
  onRSVPSubmit?: (rsvp: Partial<GuestRSVP>) => Promise<boolean>;
  onWishSubmit?: (wish: { name: string; message: string }) => Promise<boolean>;
  wishesList?: Array<{ id: string; name: string; message: string; date: string }>;
  interactiveMap?: React.ReactNode;
  musicPlayer?: React.ReactNode;
}

const TEMPLATE_COMPONENTS: Record<string, React.FC<TemplateRenderProps>> = {
  // Slug mappings
  'template-1': Template01_AureliaRoyal,
  'template-2': Template02_WhiteSerenade,
  'template-3': Template03_VelvetSharqona,
  'template-4': Template04_GoldenSymphony,
  'template-5': Template05_EmeraldGrace,
  'template-6': Template06_PastelRomance,
  'template-7': Template07_BlushElegance,
  'template-8': Template08_FloralHarmony,
  'template-9': Template09_CrystalPure,
  'template-10': Template10_MidnightSapphire,
  'template-11': Template11_PearlMinimal,
  'template-12': Template12_VintageCharm,
  'template-13': Template13_RoseGoldLuxe,
  'template-14': Template14_BotanicalGarden,
  'template-15': Template15_CelestialDream,
  'template-16': Template16_SunlitTerracotta,
  'template-17': Template17_IvoryBlossom,
  'template-18': Template18_RoyalRuby,
  'template-19': Template19_ModernNoir,
  'template-20': Template20_SweetButterfly,

  // ID mappings (tpl-1, tpl-2, etc.)
  'tpl-1': Template01_AureliaRoyal,
  'tpl-2': Template02_WhiteSerenade,
  'tpl-3': Template03_VelvetSharqona,
  'tpl-4': Template04_GoldenSymphony,
  'tpl-5': Template05_EmeraldGrace,
  'tpl-6': Template06_PastelRomance,
  'tpl-7': Template07_BlushElegance,
  'tpl-8': Template08_FloralHarmony,
  'tpl-9': Template09_CrystalPure,
  'tpl-10': Template10_MidnightSapphire,
  'tpl-11': Template11_PearlMinimal,
  'tpl-12': Template12_VintageCharm,
  'tpl-13': Template13_RoseGoldLuxe,
  'tpl-14': Template14_BotanicalGarden,
  'tpl-15': Template15_CelestialDream,
  'tpl-16': Template16_SunlitTerracotta,
  'tpl-17': Template17_IvoryBlossom,
  'tpl-18': Template18_RoyalRuby,
  'tpl-19': Template19_ModernNoir,
  'tpl-20': Template20_SweetButterfly,
};

export const TemplateRenderer: React.FC<TemplateRendererProps> = ({
  invitation,
  language = 'uz',
  isPreview = false,
  onRSVPSubmit,
  onWishSubmit,
  wishesList,
  interactiveMap,
  musicPlayer,
}) => {
  // 1. Resolve template definition
  const templateDef =
    mockTemplates.find(
      (t) => t.slug === invitation.templateSlug || t.id === invitation.templateId
    ) || mockTemplates[0];

  // 2. Resolve template component
  const key = invitation.templateSlug || invitation.templateId || templateDef.slug;
  if (!TEMPLATE_COMPONENTS[key] && !TEMPLATE_COMPONENTS[templateDef.slug]) {
    console.error(
      `[TemplateRenderer] templateId "${invitation.templateId}" yoki templateSlug "${invitation.templateSlug}" shablonlar ro'yxatida topilmadi! Default shablonga o'tildi.`
    );
  }
  const Component = TEMPLATE_COMPONENTS[key] || TEMPLATE_COMPONENTS[templateDef.slug] || Template01_AureliaRoyal;

  // 3. Colors and Typography
  const isDarkTheme =
    templateDef.slug === 'template-19' ||
    templateDef.slug === 'template-10' ||
    templateDef.slug === 'template-18' ||
    templateDef.slug === 'template-3' ||
    templateDef.slug === 'template-5';

  const primaryColor = invitation.customColors?.primary || templateDef.colorStyle.primary;
  const secondaryColor = invitation.customColors?.secondary || templateDef.colorStyle.secondary;
  const accentColor = invitation.customColors?.accent || templateDef.colorStyle.accent;
  const bgColor = invitation.customColors?.background || templateDef.colorStyle.background;
  const textColor = invitation.customColors?.text || templateDef.colorStyle.text;
  const headingFont = invitation.customFonts?.heading || templateDef.typography.headingFont;

  return (
    <Component
      invitation={invitation}
      template={templateDef}
      language={language}
      isDarkTheme={isDarkTheme}
      isPreview={isPreview}
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
      accentColor={accentColor}
      bgColor={bgColor}
      textColor={textColor}
      headingFont={headingFont}
      onRSVPSubmit={onRSVPSubmit}
      onWishSubmit={onWishSubmit}
      wishesList={wishesList}
      interactiveMap={interactiveMap}
      musicPlayer={musicPlayer}
    />
  );
};
