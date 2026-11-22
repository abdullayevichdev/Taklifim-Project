import React, { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { mockTemplates } from '../../data/mockTemplates';
import { adminAction } from '../../services/adminClient';
import { DEFAULT_SITE_SETTINGS, formatCardNumber, formatPhoneDisplay } from '../../services/siteSettings';

interface Props {
  settings: Record<string, any>;
  overrides: Record<string, any>;
  onToast: (text: string, ok?: boolean) => void;
}

const FIELD = 'w-full min-h-[44px] px-3 rounded-xl border border-black/10 bg-white text-sm outline-none focus:border-[#D9658B]';

/** Site settings (contact phone, payment card) + per-template price / visibility / badges. */
export const AdminSettings: React.FC<Props> = ({ settings, overrides, onToast }) => {
  const pub = settings?.public || {};
  const [form, setForm] = useState({
    phone: '',
    ownerName: '',
    cardNumber: '',
    cardHolder: '',
    cardBank: '',
  });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Keep the form in sync with live values until the admin starts editing.
  useEffect(() => {
    if (dirty) return;
    setForm({
      phone: formatPhoneDisplay(pub.phone || DEFAULT_SITE_SETTINGS.phone),
      ownerName: pub.ownerName || DEFAULT_SITE_SETTINGS.ownerName,
      cardNumber: formatCardNumber(pub.cardNumber || DEFAULT_SITE_SETTINGS.cardNumber),
      cardHolder: pub.cardHolder || DEFAULT_SITE_SETTINGS.cardHolder,
      cardBank: pub.cardBank || DEFAULT_SITE_SETTINGS.cardBank,
    });
  }, [pub.phone, pub.ownerName, pub.cardNumber, pub.cardHolder, pub.cardBank, dirty]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setDirty(true);
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const r = await adminAction({ type: 'settings.update', settings: form });
    setSaving(false);
    if (r.ok) setDirty(false);
    onToast(r.ok ? 'Sozlamalar saqlandi — saytda darhol yangilandi ✅' : r.error || 'Xatolik', r.ok);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={save} className="bg-white rounded-2xl border border-black/5 p-4 space-y-3">
        <h3 className="font-bold">Aloqa va to‘lov ma’lumotlari</h3>
        <p className="text-xs text-[#7A6A63]">Saqlangach saytdagi telefon raqami va to‘lov kartasi barcha foydalanuvchilarda darhol yangilanadi.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold space-y-1">
            <span>Telefon raqami</span>
            <input className={FIELD} value={form.phone} onChange={set('phone')} inputMode="tel" placeholder="+998 93 322 35 80" />
          </label>
          <label className="text-xs font-semibold space-y-1">
            <span>Ism (telefon yonida)</span>
            <input className={FIELD} value={form.ownerName} onChange={set('ownerName')} />
          </label>
          <label className="text-xs font-semibold space-y-1">
            <span>Karta raqami (16 raqam)</span>
            <input className={FIELD} value={form.cardNumber} onChange={set('cardNumber')} inputMode="numeric" />
          </label>
          <label className="text-xs font-semibold space-y-1">
            <span>Karta egasi</span>
            <input className={FIELD} value={form.cardHolder} onChange={set('cardHolder')} />
          </label>
          <label className="text-xs font-semibold space-y-1 sm:col-span-2">
            <span>Bank / tizim</span>
            <input className={FIELD} value={form.cardBank} onChange={set('cardBank')} />
          </label>
        </div>
        <button
          type="submit"
          disabled={saving || !dirty}
          className="min-h-[44px] px-5 rounded-xl bg-[#1E1418] text-white font-bold inline-flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Saqlash
        </button>
      </form>

      <section className="bg-white rounded-2xl border border-black/5 p-4 space-y-3">
        <div>
          <h3 className="font-bold">Shablonlar: narx va ko‘rinish</h3>
          <p className="text-xs text-[#7A6A63]">
            Narx o‘zgarsa, yangi buyurtmalar shu narxda hisoblanadi (server ham tekshiradi). Yashirilgan shablon katalogda
            ko‘rinmaydi, lekin u bilan yaratilgan taklifnomalar ishlashda davom etadi.
          </p>
        </div>
        <ul className="divide-y divide-black/5">
          {mockTemplates.map((tpl) => (
            <TemplateRow key={tpl.slug} slug={tpl.slug} name={tpl.name} image={tpl.previewImage} basePrice={tpl.price} basePopular={!!tpl.isPopular} baseNew={!!tpl.isNew} override={overrides?.[tpl.slug] || {}} onToast={onToast} />
          ))}
        </ul>
      </section>
    </div>
  );
};

const TemplateRow: React.FC<{
  slug: string;
  name: string;
  image: string;
  basePrice: number;
  basePopular: boolean;
  baseNew: boolean;
  override: { price?: number; hidden?: boolean; isPopular?: boolean; isNew?: boolean };
  onToast: (text: string, ok?: boolean) => void;
}> = ({ slug, name, image, basePrice, basePopular, baseNew, override, onToast }) => {
  const effectivePrice = override.price || basePrice;
  const [price, setPrice] = useState(String(effectivePrice));
  const [busy, setBusy] = useState(false);
  useEffect(() => setPrice(String(effectivePrice)), [effectivePrice]);

  const update = async (patch: Record<string, unknown>, okText: string) => {
    setBusy(true);
    const r = await adminAction({ type: 'template.update', slug, ...patch });
    setBusy(false);
    onToast(r.ok ? okText : r.error || 'Xatolik', r.ok);
  };

  const hidden = !!override.hidden;
  const popular = override.isPopular ?? basePopular;
  const isNew = override.isNew ?? baseNew;
  const Toggle: React.FC<{ on: boolean; label: string; onClick: () => void }> = ({ on, label, onClick }) => (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      aria-pressed={on}
      className={`min-h-[34px] px-2.5 rounded-lg text-[11px] font-bold border ${on ? 'bg-[#1E1418] text-white border-[#1E1418]' : 'bg-white border-black/10 text-[#4A3E39]'}`}
    >
      {label}
    </button>
  );

  return (
    <li className={`py-3 flex flex-wrap items-center gap-3 ${hidden ? 'opacity-60' : ''}`}>
      <img src={image} alt="" className="w-10 h-12 object-cover rounded-lg bg-[#F3EEEA]" loading="lazy" />
      <div className="flex-1 min-w-[140px]">
        <div className="text-sm font-bold">{name}</div>
        <div className="text-[11px] text-[#7A6A63]">{slug}{override.price ? ` · asl narx ${String(basePrice).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}` : ''}</div>
      </div>
      <form
        className="flex items-center gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          update({ price: Number(price.replace(/\D/g, '')) }, `${name}: narx saqlandi`);
        }}
      >
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          inputMode="numeric"
          aria-label={`${name} narxi`}
          className="w-28 min-h-[36px] px-2 rounded-lg border border-black/10 text-sm text-right tabular-nums"
        />
        <span className="text-xs text-[#7A6A63]">so‘m</span>
        <button type="submit" disabled={busy || Number(price.replace(/\D/g, '')) === effectivePrice} className="min-h-[36px] px-2.5 rounded-lg bg-[#F3EEEA] text-xs font-bold disabled:opacity-40">
          OK
        </button>
      </form>
      <div className="flex gap-1.5">
        <Toggle on={popular} label="Ommabop" onClick={() => update({ isPopular: !popular }, 'Saqlandi')} />
        <Toggle on={isNew} label="Yangi" onClick={() => update({ isNew: !isNew }, 'Saqlandi')} />
        <Toggle on={hidden} label={hidden ? 'Yashirin' : 'Ko‘rinadi'} onClick={() => update({ hidden: !hidden }, hidden ? 'Katalogda ko‘rinadi' : 'Katalogdan yashirildi')} />
      </div>
    </li>
  );
};

export default AdminSettings;
