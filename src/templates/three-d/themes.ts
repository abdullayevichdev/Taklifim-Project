/**
 * Per-template 3D themes: which motif floats in the background, the medallion style and colours.
 * Every one of the 20 templates gets its own combination.
 */
export type Motif =
  | 'petal'
  | 'leaf'
  | 'crystal'
  | 'sparkle'
  | 'heart'
  | 'ring'
  | 'pearl'
  | 'star8'
  | 'moon'
  | 'feather'
  | 'blossom'
  | 'sun'
  | 'butterfly'
  | 'diamond';

export interface Theme3D {
  /** Background floating objects (first is the main motif). */
  motifs: Motif[];
  /** Colours of floating objects (gradient from c1 to c2). */
  c1: string;
  c2: string;
  /** Medallion face gradient and rim. */
  face1: string;
  face2: string;
  rim: string;
  ink: string;
  /** Symbol on the medallion back. */
  emblem: Motif;
  dark?: boolean;
}

export const THEMES_3D: Record<string, Theme3D> = {
  'template-1': { motifs: ['leaf', 'sparkle'], c1: '#E9CF97', c2: '#B48B47', face1: '#F6E7C4', face2: '#C9A15C', rim: '#9C7638', ink: '#4A3511', emblem: 'sparkle' },
  'template-2': { motifs: ['petal', 'pearl'], c1: '#FFE3EC', c2: '#E58FAD', face1: '#FFFFFF', face2: '#F5C9D8', rim: '#D9658B', ink: '#8E2E52', emblem: 'blossom' },
  'template-3': { motifs: ['star8', 'sparkle'], c1: '#E8C77E', c2: '#B78A3C', face1: '#235C49', face2: '#123528', rim: '#C59A4E', ink: '#F4DFA8', emblem: 'star8' },
  'template-4': { motifs: ['ring', 'sparkle'], c1: '#F3DD9E', c2: '#C59A4E', face1: '#FBEFCF', face2: '#D2AA5C', rim: '#A57D33', ink: '#4D3913', emblem: 'ring' },
  'template-5': { motifs: ['crystal', 'sparkle'], c1: '#7FD1A8', c2: '#1A6B4A', face1: '#2B6B50', face2: '#123A2A', rim: '#BFA054', ink: '#F1E1A6', emblem: 'crystal' },
  'template-6': { motifs: ['heart', 'petal'], c1: '#FFD0DF', c2: '#E27B9B', face1: '#FFF4F8', face2: '#F7BCD0', rim: '#E27B9B', ink: '#9C3557', emblem: 'heart' },
  'template-7': { motifs: ['petal', 'pearl'], c1: '#F9D6DF', c2: '#C86D85', face1: '#FFF7F9', face2: '#EBC0CB', rim: '#C86D85', ink: '#7D2F45', emblem: 'blossom' },
  'template-8': { motifs: ['leaf', 'blossom'], c1: '#C5D8B4', c2: '#5C7449', face1: '#F4F8EF', face2: '#C7D7B5', rim: '#5C7449', ink: '#2E3D22', emblem: 'leaf' },
  'template-9': { motifs: ['crystal', 'sparkle'], c1: '#DDF0FF', c2: '#6FA8CF', face1: '#F7FBFF', face2: '#BFDDF3', rim: '#3B6B88', ink: '#1E3F57', emblem: 'diamond' },
  'template-10': { motifs: ['sparkle', 'moon'], c1: '#FFE9A8', c2: '#D4AF37', face1: '#22365A', face2: '#0B152A', rim: '#D4AF37', ink: '#F5DE8F', emblem: 'moon', dark: true },
  'template-11': { motifs: ['pearl', 'sparkle'], c1: '#FFFFFF', c2: '#CBD5E1', face1: '#FFFFFF', face2: '#E2E8F0', rim: '#94A3B8', ink: '#334155', emblem: 'pearl' },
  'template-12': { motifs: ['feather', 'leaf'], c1: '#E9D5B9', c2: '#8A5D45', face1: '#F8EEDD', face2: '#D4B896', rim: '#8A5D45', ink: '#4A2E20', emblem: 'feather' },
  'template-13': { motifs: ['heart', 'sparkle'], c1: '#F6D1D6', c2: '#B76E79', face1: '#FBE6E8', face2: '#D9A0A8', rim: '#B76E79', ink: '#6A2B35', emblem: 'heart' },
  'template-14': { motifs: ['leaf', 'leaf'], c1: '#B6D7BD', c2: '#3D6346', face1: '#EEF6F0', face2: '#B3D1BA', rim: '#3D6346', ink: '#1F3A26', emblem: 'leaf' },
  'template-15': { motifs: ['sparkle', 'moon'], c1: '#E3D9F2', c2: '#6B5B95', face1: '#F4F0FA', face2: '#C9BDE0', rim: '#6B5B95', ink: '#3A2D5C', emblem: 'moon' },
  'template-16': { motifs: ['sun', 'petal'], c1: '#F6C9B8', c2: '#C06C54', face1: '#FCEDE6', face2: '#E6A594', rim: '#C06C54', ink: '#6B3020', emblem: 'sun' },
  'template-17': { motifs: ['blossom', 'petal'], c1: '#FBE0DA', c2: '#C47B6E', face1: '#FFF8F6', face2: '#EBC2BA', rim: '#C47B6E', ink: '#713A30', emblem: 'blossom' },
  'template-18': { motifs: ['crystal', 'sparkle'], c1: '#FF9FB3', c2: '#9E1532', face1: '#6A1A2E', face2: '#2E0711', rim: '#D4AF37', ink: '#F7DC8F', emblem: 'diamond', dark: true },
  'template-19': { motifs: ['diamond', 'sparkle'], c1: '#F6E7B0', c2: '#D4AF37', face1: '#24344A', face2: '#0B1522', rim: '#D4AF37', ink: '#F3E5AB', emblem: 'diamond', dark: true },
  'template-20': { motifs: ['butterfly', 'sparkle'], c1: '#CDE8FB', c2: '#4A8BB8', face1: '#F5FAFE', face2: '#BFDDF2', rim: '#4A8BB8', ink: '#1F4C6B', emblem: 'butterfly' },
};

export const getTheme3D = (slug: string): Theme3D => THEMES_3D[slug] || THEMES_3D['template-2'];
