/**
 * Per-template animated envelope cover themes.
 * Every template gets its own paper colour, ornament style, wax seal, emblem and floating particles,
 * so invitations no longer all open with the same cover video.
 */

export type CoverOrnament = 'floral' | 'leaf' | 'deco' | 'star' | 'geometric' | 'lace' | 'minimal';
export type CoverEmblem =
  | 'rings'
  | 'heart'
  | 'monogram'
  | 'star'
  | 'crescent'
  | 'leaf'
  | 'flower'
  | 'butterfly';
export type CoverParticles = 'petals' | 'sparkles' | 'stars' | 'leaves' | 'bokeh' | 'butterflies';
/** Envelope construction + its own opening animation */
export type CoverLayout = 'cross' | 'pocket' | 'gatefold' | 'ribbon' | 'arch' | 'lotus';

export interface CoverTheme {
  layout: CoverLayout;
  /** Light flap (top) */
  paper: string;
  /** Side flaps */
  paperMid: string;
  /** Bottom / deepest flap */
  paperDeep: string;
  /** Embossed ornament colour */
  ornament: string;
  ornamentOpacity: number;
  /** Light running along the flap edges */
  glow: string;
  seal: string;
  sealDeep: string;
  emblemColor: string;
  emblem: CoverEmblem;
  ornamentStyle: CoverOrnament;
  particles: CoverParticles;
  particleColor: string;
  /** Dark paper → lighter emboss highlight */
  dark?: boolean;
}

export const COVER_THEMES: Record<string, CoverTheme> = {
  'template-2': {
    layout: 'pocket',
    paper: '#FFF9FB', paperMid: '#F7E6ED', paperDeep: '#EFD5E0',
    ornament: '#D9658B', ornamentOpacity: 0.42, glow: '#F7A9C2',
    seal: '#DD7096', sealDeep: '#9E3456', emblemColor: '#FFF1F5',
    emblem: 'heart', ornamentStyle: 'floral', particles: 'petals', particleColor: '#F2A6BF',
  },
  'template-3': {
    layout: 'arch',
    paper: '#245A48', paperMid: '#1C4A3B', paperDeep: '#153A2E',
    ornament: '#D8B46A', ornamentOpacity: 0.42, glow: '#F0CF86',
    seal: '#D6AE5C', sealDeep: '#8C6A2C', emblemColor: '#4A3410',
    emblem: 'crescent', ornamentStyle: 'geometric', particles: 'sparkles', particleColor: '#F3D58F', dark: true,
  },
  'template-4': {
    layout: 'gatefold',
    paper: '#FCF7ED', paperMid: '#F2E6CD', paperDeep: '#E8D6B2',
    ornament: '#B98E3F', ornamentOpacity: 0.36, glow: '#F4CD72',
    seal: '#8E2635', sealDeep: '#5A1420', emblemColor: '#F6DFA6',
    emblem: 'rings', ornamentStyle: 'deco', particles: 'sparkles', particleColor: '#EBC46A',
  },
  'template-5': {
    layout: 'lotus',
    paper: '#F4F9F5', paperMid: '#E0ECE3', paperDeep: '#CFE0D4',
    ornament: '#1A4331', ornamentOpacity: 0.36, glow: '#D7BE72',
    seal: '#1F5A40', sealDeep: '#0E281D', emblemColor: '#E9D18E',
    emblem: 'monogram', ornamentStyle: 'deco', particles: 'leaves', particleColor: '#7FA68C',
  },
  'template-6': {
    layout: 'ribbon',
    paper: '#FFF3F7', paperMid: '#FBDDE8', paperDeep: '#F5C9D8',
    ornament: '#E27B9B', ornamentOpacity: 0.44, glow: '#FFC1D4',
    seal: '#E8829F', sealDeep: '#B44C6F', emblemColor: '#FFF5F8',
    emblem: 'heart', ornamentStyle: 'lace', particles: 'petals', particleColor: '#F7B4C9',
  },
  'template-7': {
    layout: 'cross',
    paper: '#FCF1F4', paperMid: '#F1D8DF', paperDeep: '#E8C4CE',
    ornament: '#C86D85', ornamentOpacity: 0.38, glow: '#F3BFCC',
    seal: '#A24760', sealDeep: '#6E2639', emblemColor: '#FBE3EA',
    emblem: 'rings', ornamentStyle: 'floral', particles: 'bokeh', particleColor: '#F6C9D5',
  },
  'template-8': {
    layout: 'lotus',
    paper: '#F6F9F1', paperMid: '#E3ECD9', paperDeep: '#D2E0C3',
    ornament: '#5C7449', ornamentOpacity: 0.4, glow: '#D8E6B4',
    seal: '#6A8654', sealDeep: '#3A4D2D', emblemColor: '#F7F1DC',
    emblem: 'flower', ornamentStyle: 'floral', particles: 'petals', particleColor: '#F4CBD6',
  },
  'template-9': {
    layout: 'lotus',
    paper: '#F5FAFD', paperMid: '#E0EDF6', paperDeep: '#CDE1EF',
    ornament: '#3B6B88', ornamentOpacity: 0.4, glow: '#BFE4FC',
    seal: '#4A7FA0', sealDeep: '#22465E', emblemColor: '#EAF6FF',
    emblem: 'star', ornamentStyle: 'lace', particles: 'sparkles', particleColor: '#CDEBFF',
  },
  'template-10': {
    layout: 'gatefold',
    paper: '#1B2D55', paperMid: '#14234A', paperDeep: '#0E1A36',
    ornament: '#D4AF37', ornamentOpacity: 0.4, glow: '#8FCBF2',
    seal: '#D9B444', sealDeep: '#9C7B1C', emblemColor: '#1A2A44',
    emblem: 'star', ornamentStyle: 'star', particles: 'stars', particleColor: '#F6E7A8', dark: true,
  },
  'template-11': {
    layout: 'cross',
    paper: '#FBFCFD', paperMid: '#EDF1F5', paperDeep: '#E1E7EE',
    ornament: '#94A3B8', ornamentOpacity: 0.52, glow: '#E8EEF6',
    seal: '#56657A', sealDeep: '#2B3544', emblemColor: '#F1F5F9',
    emblem: 'monogram', ornamentStyle: 'minimal', particles: 'bokeh', particleColor: '#FFFFFF',
  },
  'template-12': {
    layout: 'pocket',
    paper: '#F6EEE2', paperMid: '#E9DAC3', paperDeep: '#DCC6A6',
    ornament: '#8A5D45', ornamentOpacity: 0.4, glow: '#EBC99B',
    seal: '#95412F', sealDeep: '#5C2318', emblemColor: '#F3DDB8',
    emblem: 'rings', ornamentStyle: 'lace', particles: 'bokeh', particleColor: '#F3DFC0',
  },
  'template-13': {
    layout: 'ribbon',
    paper: '#FCF2F2', paperMid: '#F1DADC', paperDeep: '#E6C6CA',
    ornament: '#B76E79', ornamentOpacity: 0.42, glow: '#F3C7B3',
    seal: '#C07D86', sealDeep: '#7E3F4A', emblemColor: '#FCE8DF',
    emblem: 'heart', ornamentStyle: 'deco', particles: 'sparkles', particleColor: '#F2C2AE',
  },
  'template-14': {
    layout: 'lotus',
    paper: '#F0F7F1', paperMid: '#DAEADD', paperDeep: '#C6DDCB',
    ornament: '#3D6346', ornamentOpacity: 0.4, glow: '#C2E0C8',
    seal: '#4A7553', sealDeep: '#25402B', emblemColor: '#EAF5EC',
    emblem: 'leaf', ornamentStyle: 'leaf', particles: 'leaves', particleColor: '#8EB597',
  },
  'template-15': {
    layout: 'arch',
    paper: '#2E2650', paperMid: '#241E42', paperDeep: '#1B1634',
    ornament: '#C9BCDB', ornamentOpacity: 0.36, glow: '#E6D9FA',
    seal: '#BBAAD3', sealDeep: '#6B5B95', emblemColor: '#2A2347',
    emblem: 'star', ornamentStyle: 'star', particles: 'stars', particleColor: '#F1E9FF', dark: true,
  },
  'template-16': {
    layout: 'arch',
    paper: '#FAEEE5', paperMid: '#EFD6C5', paperDeep: '#E4C1AB',
    ornament: '#C06C54', ornamentOpacity: 0.4, glow: '#F7C595',
    seal: '#C9735A', sealDeep: '#8A4532', emblemColor: '#FCE9DA',
    emblem: 'flower', ornamentStyle: 'floral', particles: 'petals', particleColor: '#EEB49A',
  },
  'template-17': {
    layout: 'pocket',
    paper: '#FFF8F4', paperMid: '#F5E2DA', paperDeep: '#EBCFC4',
    ornament: '#C47B6E', ornamentOpacity: 0.42, glow: '#F8D3C6',
    seal: '#CB8577', sealDeep: '#8E4E43', emblemColor: '#FFF1EC',
    emblem: 'flower', ornamentStyle: 'leaf', particles: 'petals', particleColor: '#F4C5BA',
  },
  'template-18': {
    layout: 'gatefold',
    paper: '#5A1628', paperMid: '#47101F', paperDeep: '#350B17',
    ornament: '#D4AF37', ornamentOpacity: 0.42, glow: '#F7C9D2',
    seal: '#D8B445', sealDeep: '#9C7B1C', emblemColor: '#4D1222',
    emblem: 'monogram', ornamentStyle: 'geometric', particles: 'sparkles', particleColor: '#F6D98A', dark: true,
  },
  'template-19': {
    layout: 'cross',
    paper: '#1B2738', paperMid: '#131D2B', paperDeep: '#0C141F',
    ornament: '#D4AF37', ornamentOpacity: 0.34, glow: '#F3E5AB',
    seal: '#D7B548', sealDeep: '#93731B', emblemColor: '#141D2A',
    emblem: 'star', ornamentStyle: 'deco', particles: 'bokeh', particleColor: '#F3E5AB', dark: true,
  },
  'template-20': {
    layout: 'ribbon',
    paper: '#F4F9FE', paperMid: '#E0EDF8', paperDeep: '#CCE1F2',
    ornament: '#4A8BB8', ornamentOpacity: 0.4, glow: '#BEE3FB',
    seal: '#5B98C4', sealDeep: '#2E6489', emblemColor: '#F2F8FD',
    emblem: 'butterfly', ornamentStyle: 'floral', particles: 'butterflies', particleColor: '#7FB4DA',
  },
};

/** Templates that keep the original (enhanced) cinematic cover video. */
const VIDEO_COVER_SLUGS = new Set(['template-1']);

function normalizeSlug(templateSlugOrId?: string | null): string {
  const raw = String(templateSlugOrId || '').trim().toLowerCase();
  if (!raw) return '';
  const tplMatch = raw.match(/^tpl-(\d{1,2})$/);
  if (tplMatch) return `template-${Number(tplMatch[1])}`;
  const slugMatch = raw.match(/^template-(\d{1,2})$/);
  if (slugMatch) return `template-${Number(slugMatch[1])}`;
  return raw;
}

/** Returns the animated cover theme for a template, or null when the video cover should be used. */
export function getCoverTheme(templateSlugOrId?: string | null): CoverTheme | null {
  const slug = normalizeSlug(templateSlugOrId);
  if (!slug || VIDEO_COVER_SLUGS.has(slug)) return null;
  return COVER_THEMES[slug] || null;
}

/** Initials for the monogram seal, e.g. "Asror & Madina" → "A&M". */
export function getMonogram(hostNames?: string | null): string {
  const parts = String(hostNames || '')
    .split(/\s*(?:&|va|и|and|\+)\s*/i)
    .map((p) => p.trim())
    .filter(Boolean);
  const letters = parts
    .slice(0, 2)
    .map((p) => Array.from(p)[0]?.toLocaleUpperCase() || '')
    .filter(Boolean);
  if (letters.length === 2) return `${letters[0]}&${letters[1]}`;
  if (letters.length === 1) return letters[0];
  return '♥';
}
