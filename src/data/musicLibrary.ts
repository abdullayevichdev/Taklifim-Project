/** Built-in wedding music library (files live in /public/audio). */
export interface PresetMusicTrack {
  /** Stable id used by the admin panel (musicLibrary/items/{id}). */
  id: string;
  title: string;
  url: string;
  /** Index into `t.builder.tracks` for a translated title (legacy instrumental tracks only). */
  localeIndex?: number;
}

export const DEFAULT_MUSIC_TITLE = 'Bojalar — To‘ylar muborak';
export const DEFAULT_MUSIC_URL = '/audio/bojalar-toylar-muborak.mp3';

export const PRESET_MUSIC_TRACKS: PresetMusicTrack[] = [
  { id: 'bojalar', title: DEFAULT_MUSIC_TITLE, url: DEFAULT_MUSIC_URL },
  { id: 'ravshan-toy-bola', title: 'Ravshan Komilov — To‘y bola', url: '/audio/ravshan-komilov-toy-bola.mp3' },
  { id: 'shoxrux-devonangman', title: 'Shoxrux & Izzat Shukurov — Devonangman', url: '/audio/shoxrux-izzat-shukurov-devonangman.mp3' },
  { id: 'abdulhay-karimov', title: 'Abdulhay Karimov — To‘y qo‘shig‘i', url: '/audio/abdulhay-karimov.mp3' },
  { id: 'atadjanov', title: 'Atadjanov — To‘y qo‘shig‘i', url: '/audio/atadjanov.mp3' },
  { id: 'wedding-vals', title: 'Nafis To‘y Valsi (Pianino va Skripka)', url: '/audio/wedding_vals.mp3', localeIndex: 0 },
  { id: 'romantic-love', title: 'Romantik Sevgi Taronasi (Sweet Love)', url: '/audio/romantic_love.mp3', localeIndex: 1 },
];
