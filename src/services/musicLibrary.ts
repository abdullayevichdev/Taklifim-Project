import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from './firebase';
import { DEFAULT_MUSIC_TITLE, DEFAULT_MUSIC_URL, PRESET_MUSIC_TRACKS } from '../data/musicLibrary';

/**
 * Live music library = built-in songs (public/audio) + songs uploaded from the admin panel,
 * with admin edits (rename, hide, order, default) stored in RTDB `musicLibrary`.
 */
export interface LibraryTrack {
  id: string;
  title: string;
  url: string;
  builtin: boolean;
  hidden: boolean;
  order: number;
  /** Index into t.builder.tracks for a translated title (built-in instrumentals only, unless renamed). */
  localeIndex?: number;
  storagePath?: string;
}

interface RawItem {
  title?: string;
  url?: string;
  hidden?: boolean;
  order?: number;
  source?: 'builtin' | 'upload';
  storagePath?: string;
  createdAt?: string;
}

let raw: { items?: Record<string, RawItem>; defaultId?: string } = {};
const listeners = new Set<() => void>();
let started = false;

function start() {
  if (started || !rtdb) return;
  started = true;
  onValue(
    ref(rtdb, 'musicLibrary'),
    (snap) => {
      raw = (snap.val() as typeof raw) || {};
      listeners.forEach((l) => l());
    },
    () => {}
  );
}

/** All tracks (including hidden ones), sorted by admin order. */
export function getAllTracks(): LibraryTrack[] {
  start();
  const items = raw.items || {};
  const builtins: LibraryTrack[] = PRESET_MUSIC_TRACKS.map((p, i) => {
    const o = items[p.id] || {};
    const renamed = typeof o.title === 'string' && o.title.trim().length > 0;
    return {
      id: p.id,
      title: renamed ? o.title!.trim() : p.title,
      url: p.url,
      builtin: true,
      hidden: o.hidden === true,
      order: typeof o.order === 'number' ? o.order : i,
      localeIndex: renamed ? undefined : p.localeIndex,
    };
  });
  const builtinIds = new Set(PRESET_MUSIC_TRACKS.map((p) => p.id));
  const uploads: LibraryTrack[] = Object.entries(items)
    .filter(([id, v]) => !builtinIds.has(id) && v && v.source === 'upload' && typeof v.url === 'string')
    .map(([id, v], i) => ({
      id,
      title: (v.title || 'Qo‘shiq').trim(),
      url: v.url!,
      builtin: false,
      hidden: v.hidden === true,
      order: typeof v.order === 'number' ? v.order : 100 + i,
      storagePath: v.storagePath,
    }));
  return [...builtins, ...uploads].sort((a, b) => a.order - b.order);
}

/** Visible tracks offered in the invitation builder. */
export function getVisibleTracks(): LibraryTrack[] {
  return getAllTracks().filter((t) => !t.hidden);
}

/** The default song for new invitations (admin-selectable; falls back to Bojalar). */
export function getDefaultMusic(): { title: string; url: string } {
  const all = getVisibleTracks();
  const chosen = all.find((t) => t.id === raw.defaultId) || all.find((t) => t.url === DEFAULT_MUSIC_URL) || all[0];
  return chosen ? { title: chosen.title, url: chosen.url } : { title: DEFAULT_MUSIC_TITLE, url: DEFAULT_MUSIC_URL };
}

export function getDefaultMusicId(): string {
  const all = getVisibleTracks();
  return (all.find((t) => t.id === raw.defaultId) || all.find((t) => t.url === DEFAULT_MUSIC_URL) || all[0])?.id || '';
}

/** Re-renders when the admin changes the library. */
export function useMusicLibrary(): { tracks: LibraryTrack[]; all: LibraryTrack[]; defaultId: string } {
  const [, force] = useState(0);
  useEffect(() => {
    start();
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return { tracks: getVisibleTracks(), all: getAllTracks(), defaultId: getDefaultMusicId() };
}
