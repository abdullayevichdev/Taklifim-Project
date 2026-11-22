import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, Loader2, Music, Pause, Pencil, Play, Star, Trash2, Upload } from 'lucide-react';
import { adminAction, deleteMusicFile, uploadMusicFile } from '../../services/adminClient';
import { LibraryTrack, useMusicLibrary } from '../../services/musicLibrary';

const MAX_BYTES = 15 * 1024 * 1024;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[‘’ʻʼ'`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'qoshiq';

/** Checks that the browser can actually decode the file and returns its duration in seconds. */
function probeAudio(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const a = new Audio();
    const done = (fn: () => void) => {
      URL.revokeObjectURL(url);
      fn();
    };
    a.preload = 'metadata';
    a.onloadedmetadata = () => done(() => resolve(a.duration || 0));
    a.onerror = () => done(() => reject(new Error('decode')));
    a.src = url;
  });
}

const fmtDur = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;

/** Admin: manage the wedding-song library (upload, rename, reorder, hide, delete, default). */
export const AdminMusic: React.FC<{ onToast: (t: string, ok?: boolean) => void }> = ({ onToast }) => {
  const { all, defaultId } = useMusicLibrary();
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // upload form
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [fileInfo, setFileInfo] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => () => audioRef.current?.pause(), []);

  const togglePlay = (t: LibraryTrack) => {
    if (!audioRef.current) audioRef.current = new Audio();
    const a = audioRef.current;
    if (playing === t.id) {
      a.pause();
      setPlaying(null);
      return;
    }
    a.src = t.url;
    a.onended = () => setPlaying(null);
    a.play()
      .then(() => setPlaying(t.id))
      .catch(() => onToast('Qo‘shiqni ijro etib bo‘lmadi', false));
  };

  const act = async (id: string, body: Record<string, unknown>, okText: string) => {
    setBusyId(id);
    const r = await adminAction(body);
    setBusyId(null);
    onToast(r.ok ? okText : r.error || 'Xatolik', r.ok);
    return r.ok;
  };

  const move = (idx: number, dir: -1 | 1) => {
    const ids = all.map((t) => t.id);
    const j = idx + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    act(all[idx].id, { type: 'music.reorder', ids }, 'Tartib saqlandi');
  };

  const rename = (t: LibraryTrack) => {
    const next = window.prompt('Qo‘shiqning yangi nomi:', t.title);
    if (next && next.trim() && next.trim() !== t.title) act(t.id, { type: 'music.update', id: t.id, title: next.trim() }, 'Nomi o‘zgartirildi');
  };

  const remove = async (t: LibraryTrack) => {
    const msg = t.builtin
      ? `«${t.title}» kutubxonadan olib tashlansinmi? (Saytga o‘rnatilgan qo‘shiq — keyin "Ko‘rsatish" bilan qaytarish mumkin.)`
      : `«${t.title}» butunlay o‘chirilsinmi? Bu amalni qaytarib bo‘lmaydi.`;
    if (!window.confirm(msg)) return;
    setBusyId(t.id);
    try {
      if (!t.builtin && t.storagePath) await deleteMusicFile(t.storagePath);
    } catch {
      setBusyId(null);
      onToast('Faylni o‘chirib bo‘lmadi (Storage qoidalarini tekshiring)', false);
      return;
    }
    if (playing === t.id) {
      audioRef.current?.pause();
      setPlaying(null);
    }
    await act(t.id, { type: 'music.delete', id: t.id }, 'O‘chirildi');
  };

  const pickFile = async (f: File | null) => {
    setFile(null);
    setFileInfo('');
    if (!f) return;
    if (f.size > MAX_BYTES) {
      onToast('Fayl 15 MB dan katta bo‘lmasin', false);
      return;
    }
    try {
      const dur = await probeAudio(f);
      setFile(f);
      setFileInfo(`${(f.size / 1024 / 1024).toFixed(1)} MB · ${fmtDur(dur)}`);
      if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim());
    } catch {
      onToast('Bu faylni brauzer o‘qiy olmadi. MP3 formatidagi faylni tanlang.', false);
    }
  };

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim() || progress !== null) return;
    const id = `${slugify(title)}-${Math.random().toString(36).slice(2, 6)}`;
    setProgress(0);
    try {
      const { url, storagePath } = await uploadMusicFile(file, id, setProgress);
      const ok = await act(id, { type: 'music.add', id, title: title.trim(), url, storagePath }, `«${title.trim()}» qo‘shildi 🎵`);
      if (ok) {
        setFile(null);
        setTitle('');
        setFileInfo('');
        if (inputRef.current) inputRef.current.value = '';
      } else {
        await deleteMusicFile(storagePath).catch(() => {});
      }
    } catch (err: any) {
      const denied = String(err?.code || '').includes('unauthorized');
      onToast(denied ? 'Yuklashga ruxsat yo‘q — Firebase Storage qoidalarini yangilang' : 'Yuklashda xatolik. Qayta urinib ko‘ring.', false);
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={upload} className="bg-white rounded-2xl border border-black/5 p-4 space-y-3 admin-rise">
        <h3 className="font-bold flex items-center gap-2">
          <Upload className="w-4 h-4 text-[#C64873]" /> Yangi qo‘shiq qo‘shish
        </h3>
        <label className="flex flex-col items-center justify-center gap-1.5 min-h-[96px] rounded-2xl border-2 border-dashed border-black/10 bg-[#FAF7F5] hover:border-[#D9658B] hover:bg-[#FCEEF4] transition-colors cursor-pointer text-center px-3">
          <Music className="w-6 h-6 text-[#C64873]" />
          <span className="text-sm font-semibold">{file ? file.name : 'MP3 faylni tanlang'}</span>
          <span className="text-xs text-[#7A6A63]">{fileInfo || 'Eng ko‘pi 15 MB'}</span>
          <input
            ref={inputRef}
            type="file"
            accept="audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/aac,.mp3,.m4a"
            className="sr-only"
            onChange={(e) => pickFile(e.target.files?.[0] || null)}
          />
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Qo‘shiq nomi (masalan: Ijrochi — Qo‘shiq)"
          maxLength={120}
          className="w-full min-h-[44px] px-3 rounded-xl border border-black/10 text-sm outline-none focus:border-[#D9658B]"
        />
        {progress !== null && (
          <div className="h-2 rounded-full bg-[#F3EEEA] overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-2 bg-[#C64873] transition-[width] duration-200" style={{ width: `${progress}%` }} />
          </div>
        )}
        <button
          type="submit"
          disabled={!file || !title.trim() || progress !== null}
          className="admin-press min-h-[46px] px-5 rounded-xl bg-[#1E1418] text-white font-bold inline-flex items-center gap-2 disabled:opacity-50"
        >
          {progress !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {progress !== null ? `Yuklanmoqda… ${progress}%` : 'Yuklash'}
        </button>
      </form>

      <section className="bg-white rounded-2xl border border-black/5 p-2 sm:p-3 admin-rise" style={{ animationDelay: '60ms' }}>
        <div className="px-2 py-2">
          <h3 className="font-bold">Qo‘shiqlar kutubxonasi ({all.filter((t) => !t.hidden).length} ta faol)</h3>
          <p className="text-xs text-[#7A6A63]">⭐ — mijoz qo‘shiq tanlamasa avtomatik qo‘yiladigan qo‘shiq. O‘zgarishlar saytda darhol ko‘rinadi.</p>
        </div>
        <ul className="divide-y divide-black/5">
          {all.map((t, idx) => {
            const isDefault = t.id === defaultId;
            const busy = busyId === t.id;
            return (
              <li key={t.id} className={`admin-stagger flex flex-wrap items-center gap-2 px-2 py-2.5 ${t.hidden ? 'opacity-50' : ''}`} style={{ animationDelay: `${Math.min(idx, 12) * 35}ms` }}>
                <button
                  type="button"
                  onClick={() => togglePlay(t)}
                  aria-label={playing === t.id ? 'To‘xtatish' : 'Tinglash'}
                  className={`admin-press w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${playing === t.id ? 'bg-[#C64873] text-white admin-pulse' : 'bg-[#FCEEF4] text-[#C64873]'}`}
                >
                  {playing === t.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <div className="flex-1 min-w-[150px]">
                  <div className="text-sm font-bold flex items-center gap-1.5">
                    {isDefault && <Star className="w-4 h-4 fill-amber-400 text-amber-500 shrink-0" aria-label="Standart" />}
                    <span className="truncate">{t.title}</span>
                  </div>
                  <div className="text-[11px] text-[#7A6A63]">
                    {t.builtin ? 'Saytga o‘rnatilgan' : 'Yuklangan'}
                    {t.hidden ? ' · yashirilgan' : ''}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {busy && <Loader2 className="w-4 h-4 animate-spin text-[#7A6A63]" />}
                  <IconBtn label="Yuqoriga" disabled={busy || idx === 0} onClick={() => move(idx, -1)}><ArrowUp className="w-4 h-4" /></IconBtn>
                  <IconBtn label="Pastga" disabled={busy || idx === all.length - 1} onClick={() => move(idx, 1)}><ArrowDown className="w-4 h-4" /></IconBtn>
                  <IconBtn label="Nomini o‘zgartirish" disabled={busy} onClick={() => rename(t)}><Pencil className="w-4 h-4" /></IconBtn>
                  <IconBtn
                    label="Standart qilish"
                    disabled={busy || isDefault || t.hidden}
                    onClick={() => act(t.id, { type: 'music.setDefault', id: t.id }, `«${t.title}» standart qo‘shiq bo‘ldi`)}
                  >
                    <Star className={`w-4 h-4 ${isDefault ? 'fill-amber-400 text-amber-500' : ''}`} />
                  </IconBtn>
                  <IconBtn
                    label={t.hidden ? 'Ko‘rsatish' : 'Yashirish'}
                    disabled={busy}
                    onClick={() => act(t.id, { type: 'music.update', id: t.id, hidden: !t.hidden }, t.hidden ? 'Qaytarildi' : 'Yashirildi')}
                  >
                    {t.hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </IconBtn>
                  <IconBtn label="O‘chirish" danger disabled={busy} onClick={() => remove(t)}><Trash2 className="w-4 h-4" /></IconBtn>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
};

const IconBtn: React.FC<{ label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }> = ({
  label,
  onClick,
  disabled,
  danger,
  children,
}) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onClick={onClick}
    disabled={disabled}
    className={`admin-press w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-30 ${
      danger ? 'text-rose-600 hover:bg-rose-50' : 'text-[#4A3E39] hover:bg-black/5'
    }`}
  >
    {children}
  </button>
);

export default AdminMusic;
