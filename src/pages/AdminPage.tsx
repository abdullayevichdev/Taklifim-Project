import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Download,
  Music2,
  History,
  Settings as SettingsIcon,
  Check,
  Clock,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Inbox,
  Loader2,
  LogOut,
  Mail,
  Phone,
  Receipt,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { TashrifimMark } from '../components/TashrifimLogo';
import { AdminSettings } from '../components/admin/AdminSettings';
import { AdminMusic } from '../components/admin/AdminMusic';
import { AnimatedValue, BRAND, ChartCard, ColumnChart, HBarList, LineChart, SERIES, SegmentBar } from '../components/admin/AdminCharts';
import {
  adminAction,
  adminLogin,
  adminLogout,
  getReceiptImage,
  subscribeAdmin,
  watchAdminSession,
} from '../services/adminClient';

/* ------------------------------------------------------------------ types */
interface AdminOrder {
  id?: string;
  orderId?: string;
  orderNumber?: string;
  status?: string;
  customerName?: string;
  customerPhone?: string;
  templateName?: string;
  price?: number;
  weddingDate?: string;
  venueName?: string;
  invitationId?: string;
  invitationSlug?: string;
  receiptUrl?: string;
  receiptType?: string;
  receiptSentAt?: string;
  submittedAt?: string;
  decidedAt?: string;
  decidedBy?: string;
  rejectReason?: string;
  ownerUid?: string;
  createdAt?: string;
  updatedAt?: string;
}
interface AdminInvitation {
  id?: string;
  slug?: string;
  status?: string;
  hostNames?: string;
  eventTitle?: string;
  eventDate?: string;
  venueName?: string;
  templateSlug?: string;
  ownerUid?: string;
  ownerId?: string;
  orderId?: string;
  createdAt?: string;
  updatedAt?: string;
  viewsCount?: number;
}
interface AdminUser {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  authProvider?: string;
  createdAt?: string;
  lastLoginAt?: string;
}
interface AdminMessage {
  id?: string;
  name?: string;
  contact?: string;
  subject?: string;
  message?: string;
  status?: string;
  createdAt?: string;
}

type Tab = 'orders' | 'stats' | 'invitations' | 'users' | 'messages' | 'music' | 'settings' | 'history';

/* ---------------------------------------------------------------- helpers */
const groupDigits = (n: number) => String(Math.round(Math.abs(n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const fmtMoney = (n: number) => `${n < 0 ? '-' : ''}${groupDigits(n)} so‘m`;
const ts = (iso?: string) => {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? t : 0;
};
const fmtDate = (iso?: string) => {
  const t = ts(iso);
  return t
    ? new Date(t).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';
};
const ago = (iso?: string) => {
  const t = ts(iso);
  if (!t) return '';
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'hozirgina';
  if (m < 60) return `${m} daqiqa oldin`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} soat oldin`;
  return `${Math.round(h / 24)} kun oldin`;
};
const toList = <T,>(rec: Record<string, T>): Array<T & { _key: string }> =>
  Object.entries(rec || {})
    .filter(([, v]) => v && typeof v === 'object')
    .map(([k, v]) => ({ ...(v as any), _key: k }));
const digits = (s?: string) => (s || '').replace(/\D/g, '');

const AUDIT_LABEL: Record<string, string> = {
  login: 'Panelga kirildi',
  login_failed: 'Noto‘g‘ri kod',
  'order.decide': 'Buyurtma qarori',
  'invitation.setStatus': 'Taklifnoma holati',
  'invitation.delete': 'Taklifnoma o‘chirildi',
  'message.setStatus': 'Xabar holati',
  'message.delete': 'Xabar o‘chirildi',
  'settings.update': 'Sozlamalar o‘zgardi',
  'template.update': 'Shablon o‘zgardi',
};

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  pending_review: { text: 'Tekshiruvda', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  pending_payment: { text: 'To‘lov kutilmoqda', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  paid: { text: 'Faol (to‘langan)', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  published: { text: 'Faol', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  rejected: { text: 'Rad etilgan', cls: 'bg-rose-100 text-rose-800 border-rose-200' },
  draft: { text: 'Qoralama', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};
const StatusBadge: React.FC<{ status?: string }> = ({ status }) => {
  const s = STATUS_LABEL[status || ''] || { text: status || '—', cls: 'bg-slate-100 text-slate-600 border-slate-200' };
  return <span className={`inline-flex px-2.5 py-0.5 rounded-full border text-[11px] font-bold whitespace-nowrap ${s.cls}`}>{s.text}</span>;
};

function beep() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.18].forEach((delay) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + delay + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.15);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + delay);
      o.stop(ctx.currentTime + delay + 0.16);
    });
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------ login view */
const AdminLogin: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [shakeKey, setShakeKey] = useState(0);
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-[#FCEEF4] via-[#FAF6F0] to-[#E8F3FC]">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!code.trim() || busy) return;
          setBusy(true);
          setError('');
          const r = await adminLogin(code.trim());
          setBusy(false);
          if (r.ok) onDone();
          else {
            setError(r.error || 'Kirib bo‘lmadi.');
            setCode('');
            setShakeKey((k) => k + 1);
          }
        }}
        key={shakeKey}
        className={`w-full max-w-sm bg-white rounded-3xl shadow-xl border border-black/5 p-6 space-y-4 ${shakeKey ? 'admin-shake' : 'admin-pop'}`}
      >
        <div className="flex items-center gap-3">
          <TashrifimMark className="w-10 h-10" />
          <div>
            <h1 className="font-playfair text-xl font-bold text-[#1E1418]">Boshqaruv paneli</h1>
            <p className="text-xs text-[#7A6A63]">Kirish kodini kiriting</p>
          </div>
        </div>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          aria-label="Kirish kodi"
          placeholder="•••"
          className="w-full min-h-[52px] px-4 rounded-2xl border border-black/10 bg-[#F7F3F1] text-center text-2xl tracking-[0.5em] font-bold outline-none focus:bg-white focus:border-[#D9658B]"
        />
        {error && (
          <p role="alert" className="text-sm font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !code.trim()}
          className="w-full min-h-[50px] rounded-2xl bg-gradient-to-br from-[#D6517F] to-[#A7325B] text-white font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          Kirish
        </button>
      </form>
    </div>
  );
};

/* ------------------------------------------------------------ order card */
const OrderCard: React.FC<{
  order: AdminOrder & { _key: string };
  onToast: (m: string, ok?: boolean) => void;
  index?: number;
  fresh?: boolean;
}> = ({ order, onToast, index = 0, fresh = false }) => {
  const id = order.orderId || order.id || order._key;
  const [img, setImg] = useState<string | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<'paid' | 'rejected' | null>(null);
  const sentAt = order.receiptSentAt || order.submittedAt;
  const isLate = order.status === 'pending_review' && Date.now() - ts(sentAt) > 2 * 3600 * 1000;
  const phone = digits(order.customerPhone);

  const showReceipt = async () => {
    setOpen(true);
    if (img === undefined) setImg(await getReceiptImage(id));
  };

  const decide = async (decision: 'paid' | 'rejected') => {
    let reason: string | undefined;
    if (decision === 'rejected') {
      const r = window.prompt('Rad etish sababi (mijozga ko‘rsatiladi):', "To'lov cheki tasdiqlanmadi. Iltimos, to'g'ri chekni qayta yuklang.");
      if (r === null) return;
      reason = r;
    } else if (!window.confirm(`#${id} buyurtmasini tasdiqlaysizmi? Taklifnoma faollashadi.`)) {
      return;
    }
    setBusy(decision);
    const res = await adminAction({ type: 'order.decide', orderId: id, decision, reason });
    setBusy(null);
    onToast(res.ok ? (decision === 'paid' ? 'Tasdiqlandi ✅' : 'Rad etildi') : res.error || 'Xatolik', res.ok);
  };

  return (
    <article
      className={`admin-stagger admin-lift bg-white rounded-2xl border p-4 space-y-3 shadow-sm ${isLate ? 'border-rose-300 ring-2 ring-rose-200' : 'border-black/5'} ${fresh ? 'admin-flash' : ''}`}
      style={{ animationDelay: fresh ? undefined : `${Math.min(index, 10) * 40}ms` }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#9E3E60]">#{id}</span>
            <StatusBadge status={order.status} />
            {isLate && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700">
                <Clock className="w-3.5 h-3.5" /> 2 soatdan oshdi
              </span>
            )}
          </div>
          <h3 className="mt-1 font-bold text-[#1E1418] truncate">{order.customerName || 'Mijoz'}</h3>
          <p className="text-xs text-[#7A6A63]">
            {order.templateName || order.invitationSlug || '—'} · {fmtMoney(Number(order.price) || 0)}
          </p>
        </div>
        <div className="text-right text-[11px] text-[#7A6A63]">
          <div>{fmtDate(sentAt || order.createdAt)}</div>
          <div>{ago(sentAt || order.createdAt)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[#4A3E39]">
        <span>📅 {order.weddingDate || '—'}</span>
        <span className="truncate">📍 {order.venueName || '—'}</span>
        {order.rejectReason && <span className="col-span-2 text-rose-700">Sabab: {order.rejectReason}</span>}
        {order.decidedAt && (
          <span className="col-span-2 text-[#7A6A63]">
            Qaror: {fmtDate(order.decidedAt)} {order.decidedBy ? `· ${order.decidedBy}` : ''}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {phone && (
          <>
            <a href={`tel:+${phone}`} className="inline-flex items-center gap-1.5 min-h-[38px] px-3 rounded-xl bg-[#F3EEEA] text-xs font-semibold">
              <Phone className="w-3.5 h-3.5" /> {order.customerPhone}
            </a>
            <a href={`https://t.me/+${phone}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 min-h-[38px] px-3 rounded-xl bg-[#E8F3FA] text-xs font-semibold text-[#1E3A5F]">
              Telegram
            </a>
          </>
        )}
        {order.invitationSlug && (
          <a href={`/i/${order.invitationSlug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 min-h-[38px] px-3 rounded-xl bg-[#F3EEEA] text-xs font-semibold">
            <ExternalLink className="w-3.5 h-3.5" /> Taklifnoma
          </a>
        )}
        {order.receiptUrl ? (
          <a href={order.receiptUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 min-h-[38px] px-3 rounded-xl bg-[#FCEEF4] text-xs font-semibold text-[#9E3E60]">
            <FileText className="w-3.5 h-3.5" /> Chek (PDF)
          </a>
        ) : (
          <button type="button" onClick={showReceipt} className="inline-flex items-center gap-1.5 min-h-[38px] px-3 rounded-xl bg-[#FCEEF4] text-xs font-semibold text-[#9E3E60]">
            <ImageIcon className="w-3.5 h-3.5" /> Chekni ko‘rish
          </button>
        )}
      </div>

      {open && (
        <div className="rounded-xl border border-black/5 bg-[#F7F3F1] p-2">
          {img === undefined ? (
            <div className="py-6 text-center text-xs text-[#7A6A63]"><Loader2 className="w-4 h-4 animate-spin inline" /> Yuklanmoqda…</div>
          ) : img ? (
            <a href={img} target="_blank" rel="noreferrer">
              <img src={img} alt={`Chek #${id}`} className="w-full max-h-[70vh] object-contain rounded-lg" />
            </a>
          ) : (
            <p className="py-4 text-center text-xs text-[#7A6A63]">Bu chekning nusxasi saytda saqlanmagan (eski buyurtma) — Telegramdan ko‘ring.</p>
          )}
        </div>
      )}

      {(order.status === 'pending_review' || order.status === 'pending_payment') && (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => decide('paid')}
            className="min-h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {busy === 'paid' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Tasdiqlash
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => decide('rejected')}
            className="min-h-[46px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {busy === 'rejected' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />} Rad etish
          </button>
        </div>
      )}
    </article>
  );
};

/* ----------------------------------------------------------- main panel */
export const AdminPanel: React.FC = () => {
  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<Record<string, AdminOrder>>({});
  const [invitations, setInvitations] = useState<Record<string, AdminInvitation>>({});
  const [users, setUsers] = useState<Record<string, AdminUser>>({});
  const [messages, setMessages] = useState<Record<string, AdminMessage>>({});
  const [siteSettings, setSiteSettings] = useState<Record<string, any>>({});
  const [templateOverrides, setTemplateOverrides] = useState<Record<string, any>>({});
  const [audit, setAudit] = useState<Record<string, { type?: string; target?: string; detail?: string; ip?: string; at?: string }>>({});
  const [mode, setMode] = useState<'realtime' | 'polling' | 'connecting'>('connecting');
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const [orderFilter, setOrderFilter] = useState<'pending' | 'all' | 'paid' | 'rejected'>('pending');
  const [query, setQuery] = useState('');
  const knownPending = useRef<Set<string> | null>(null);
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());

  const showToast = (text: string, ok = true) => {
    setToast({ text, ok });
    window.setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const unsubs = [
      subscribeAdmin<AdminOrder>('orders', (v) => {
        setOrders(v);
        setLoaded(true);
      }, setMode),
      subscribeAdmin<AdminInvitation>('invitations', setInvitations),
      subscribeAdmin<AdminUser>('users', setUsers),
      subscribeAdmin<AdminMessage>('messages', setMessages),
      subscribeAdmin<any>('settings', setSiteSettings),
      subscribeAdmin<any>('templateOverrides', setTemplateOverrides),
      subscribeAdmin<any>('adminAudit', setAudit),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const orderList = useMemo(
    () =>
      toList(orders).sort(
        (a, b) => ts(b.receiptSentAt || b.submittedAt || b.updatedAt || b.createdAt) - ts(a.receiptSentAt || a.submittedAt || a.updatedAt || a.createdAt)
      ),
    [orders]
  );
  const pending = orderList.filter((o) => o.status === 'pending_review');

  // Sound + title badge when a new receipt arrives
  useEffect(() => {
    const ids = new Set(pending.map((o) => o._key));
    const added = knownPending.current ? [...ids].filter((id) => !knownPending.current!.has(id)) : [];
    if (added.length) {
      setFreshIds(new Set(added));
      window.setTimeout(() => setFreshIds(new Set()), 2500);
    }
    if (knownPending.current && added.length > 0) {
      beep();
      showToast('Yangi chek keldi! 🧾');
    }
    if (loaded) knownPending.current = ids;
    document.title = pending.length ? `(${pending.length}) Boshqaruv paneli` : 'Boshqaruv paneli';
  }, [pending.length, loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = query.trim().toLowerCase();
  const match = (...fields: Array<string | undefined>) => !q || fields.some((f) => (f || '').toLowerCase().includes(q));

  const shownOrders = orderList.filter((o) => {
    if (orderFilter === 'pending' && o.status !== 'pending_review') return false;
    if (orderFilter === 'paid' && o.status !== 'paid') return false;
    if (orderFilter === 'rejected' && o.status !== 'rejected') return false;
    return match(o.orderId, o.id, o._key, o.customerName, o.customerPhone, o.templateName, o.invitationSlug);
  });

  const invList = toList(invitations).sort((a, b) => ts(b.updatedAt || b.createdAt) - ts(a.updatedAt || a.createdAt));
  const userList = toList(users).sort((a, b) => ts(b.createdAt) - ts(a.createdAt));
  const msgList = toList(messages).sort((a, b) => ts(b.createdAt) - ts(a.createdAt));
  const newMessages = msgList.filter((m) => m.status === 'new').length;

  /* stats (recomputed live whenever orders / users / invitations change) */
  const stats = useMemo(() => {
    const day = 86400000;
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const todayMs = startToday.getTime();
    const fromMs = todayMs - (range - 1) * day;
    const paid = orderList.filter((o) => o.status === 'paid');
    const paidAt = (o: AdminOrder) => ts(o.decidedAt || o.updatedAt);
    const orderAt = (o: AdminOrder) => ts(o.receiptSentAt || o.submittedAt || o.createdAt);
    const sumPaid = (from: number, to = Infinity) =>
      paid.filter((o) => paidAt(o) >= from && paidAt(o) < to).reduce((s2, o) => s2 + (Number(o.price) || 0), 0);

    const days = Array.from({ length: range }, (_, i) => {
      const from = fromMs + i * day;
      const d = new Date(from);
      return { from, to: from + day, label: `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}` };
    });
    const revenueDaily = days.map((d) => ({ label: d.label, value: sumPaid(d.from, d.to) }));
    const ordersDaily = days.map(
      (d) => orderList.filter((o) => o.status !== 'pending_payment' && o.status !== 'draft' && orderAt(o) >= d.from && orderAt(o) < d.to).length
    );
    const usersDaily = days.map((d) => userList.filter((u) => ts(u.createdAt) >= d.from && ts(u.createdAt) < d.to).length);

    const inRange = orderList.filter((o) => orderAt(o) >= fromMs);
    const byTemplate = new Map<string, { count: number; sum: number }>();
    paid
      .filter((o) => paidAt(o) >= fromMs)
      .forEach((o) => {
        const k = o.templateName || o.invitationSlug || '—';
        const e = byTemplate.get(k) || { count: 0, sum: 0 };
        e.count += 1;
        e.sum += Number(o.price) || 0;
        byTemplate.set(k, e);
      });
    const top = [...byTemplate.entries()].sort((x, y) => y[1].count - x[1].count).slice(0, 6);
    const submitted = inRange.filter((o) => o.status !== 'pending_payment' && o.status !== 'draft').length;
    const paidInRange = inRange.filter((o) => o.status === 'paid').length;

    return {
      today: sumPaid(todayMs),
      rangeRevenue: sumPaid(fromMs),
      total: sumPaid(0),
      pendingCount: pending.length,
      statusSegments: [
        { label: 'Tasdiqlangan', value: inRange.filter((o) => o.status === 'paid').length, color: SERIES[0] },
        { label: 'Tekshiruvda', value: inRange.filter((o) => o.status === 'pending_review').length, color: SERIES[1] },
        { label: 'Rad etilgan', value: inRange.filter((o) => o.status === 'rejected').length, color: SERIES[2] },
      ],
      conversion: submitted ? Math.round((paidInRange / submitted) * 100) : 0,
      topTemplates: top.map(([label, v]) => ({ label, count: v.count, sum: v.sum })),
      recentPaid: paid
        .slice()
        .sort((x, y) => paidAt(y) - paidAt(x))
        .slice(0, 15)
        .map((o) => ({
          id: o.orderId || o.id || '',
          customer: o.customerName || 'Mijoz',
          template: o.templateName || o.invitationSlug || '—',
          price: Number(o.price) || 0,
          date: fmtDate(o.decidedAt || o.updatedAt),
        })),
      topCount: top.map(([label, v]) => ({ label, value: v.count })),
      topSum: top.map(([label, v]) => ({ label, value: v.sum })),
      users: userList.length,
      newUsers: userList.filter((u) => ts(u.createdAt) >= fromMs).length,
      invitations: invList.length,
      activeInvitations: invList.filter((i) => i.status === 'paid' || i.status === 'published').length,
      revenueDaily,
      ordersDaily,
      usersDaily,
      dayLabels: days.map((d) => d.label),
    };
  }, [orderList, pending.length, userList, invList, range]);

  const ordersByOwner = useMemo(() => {
    const m = new Map<string, { count: number; paid: number }>();
    orderList.forEach((o) => {
      if (!o.ownerUid) return;
      const e = m.get(o.ownerUid) || { count: 0, paid: 0 };
      e.count += 1;
      if (o.status === 'paid') e.paid += Number(o.price) || 0;
      m.set(o.ownerUid, e);
    });
    return m;
  }, [orderList]);
  const invByOwner = useMemo(() => {
    const m = new Map<string, number>();
    invList.forEach((i) => {
      const o = i.ownerUid || i.ownerId;
      if (o) m.set(o, (m.get(o) || 0) + 1);
    });
    return m;
  }, [invList]);

  const runAction = async (body: Record<string, unknown>, okText: string, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    const r = await adminAction(body);
    showToast(r.ok ? okText : r.error || 'Xatolik', r.ok);
  };

  const [pdfBusy, setPdfBusy] = useState(false);
  const exportPdf = async () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      const { downloadStatsPdf } = await import('../components/admin/statsPdf');
      await downloadStatsPdf({
        rangeDays: range,
        generatedAt: new Date(),
        kpis: [
          { label: 'Bugungi tushum', value: fmtMoney(stats.today) },
          { label: `${range} kunlik tushum`, value: fmtMoney(stats.rangeRevenue) },
          { label: 'Jami tushum', value: fmtMoney(stats.total) },
          { label: 'Tekshiruvda', value: `${stats.pendingCount} ta` },
          { label: 'Konversiya', value: `${stats.conversion}%` },
          { label: 'Foydalanuvchilar', value: `${stats.users} (+${stats.newUsers})` },
          { label: 'Taklifnomalar', value: `${stats.invitations} ta` },
          { label: 'Faol taklifnomalar', value: `${stats.activeInvitations} ta` },
        ],
        revenueDaily: stats.revenueDaily,
        dayLabels: stats.dayLabels,
        ordersDaily: stats.ordersDaily,
        usersDaily: stats.usersDaily,
        statusSegments: stats.statusSegments,
        topTemplates: stats.topTemplates,
        recentPaid: stats.recentPaid,
      });
      showToast('PDF hisobot yuklab olindi 📄');
    } catch (err) {
      console.error('PDF export failed', err);
      showToast('PDF yaratib bo‘lmadi. Qayta urinib ko‘ring.', false);
    } finally {
      setPdfBusy(false);
    }
  };

  const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'orders', label: 'Buyurtmalar', icon: <Receipt className="w-4 h-4" />, badge: pending.length },
    { id: 'stats', label: 'Statistika', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'invitations', label: 'Taklifnomalar', icon: <Mail className="w-4 h-4" /> },
    { id: 'users', label: 'Foydalanuvchilar', icon: <Users className="w-4 h-4" /> },
    { id: 'messages', label: 'Xabarlar', icon: <Inbox className="w-4 h-4" />, badge: newMessages },
    { id: 'music', label: 'Musiqa', icon: <Music2 className="w-4 h-4" /> },
    { id: 'settings', label: 'Sozlamalar', icon: <SettingsIcon className="w-4 h-4" /> },
    { id: 'history', label: 'Tarix', icon: <History className="w-4 h-4" /> },
  ];


  return (
    <div className="min-h-screen bg-[#F7F3F1] text-[#1E1418]">
      <header className="sticky top-0 z-30 bg-white/95 border-b border-black/5">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <TashrifimMark className="w-8 h-8" />
            <span className="font-playfair font-bold truncate">Boshqaruv paneli</span>
            <span
              className={`hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                mode === 'realtime' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}
              title={mode === 'polling' ? 'Ma’lumotlar har 5 soniyada yangilanmoqda' : 'Jonli ulanish'}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${mode === 'realtime' ? 'bg-emerald-500 admin-pulse' : 'bg-amber-500'}`} />
              {mode === 'realtime' ? 'Jonli' : mode === 'polling' ? 'Har 5 s' : 'Ulanmoqda…'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => adminLogout()}
            className="inline-flex items-center gap-1.5 min-h-[38px] px-3 rounded-xl border border-black/10 text-sm font-semibold hover:bg-black/5"
          >
            <LogOut className="w-4 h-4" /> Chiqish
          </button>
        </div>
        <nav className="max-w-6xl mx-auto px-2 flex gap-1 overflow-x-auto no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setQuery('');
              }}
              className={`admin-press relative inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id ? 'border-[#C64873] text-[#9E3E60]' : 'border-transparent text-[#7A6A63]'
              }`}
            >
              {t.icon}
              {t.label}
              {!!t.badge && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#C64873] text-white text-[11px] font-bold inline-flex items-center justify-center">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </header>

      <main key={tab} className="admin-tab-enter max-w-6xl mx-auto px-4 py-5 space-y-4">
        {!loaded && (
          <div className="py-16 text-center text-sm text-[#7A6A63]">
            <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Ma’lumotlar yuklanmoqda…
          </div>
        )}

        {loaded && tab !== 'stats' && tab !== 'settings' && tab !== 'music' && (
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7A6A63]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Qidirish: ism, telefon, buyurtma raqami, havola…"
              className="w-full min-h-[46px] pl-9 pr-3 rounded-2xl bg-white border border-black/10 text-sm outline-none focus:border-[#D9658B]"
            />
          </div>
        )}

        {/* ORDERS */}
        {loaded && tab === 'orders' && (
          <>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {(
                [
                  ['pending', `Tekshiruvda (${pending.length})`],
                  ['all', 'Barchasi'],
                  ['paid', 'Tasdiqlangan'],
                  ['rejected', 'Rad etilgan'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setOrderFilter(id)}
                  className={`min-h-[38px] px-3.5 rounded-full text-sm font-semibold whitespace-nowrap border ${
                    orderFilter === id ? 'bg-[#1E1418] text-white border-[#1E1418]' : 'bg-white border-black/10'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {shownOrders.length === 0 ? (
              <p className="py-12 text-center text-sm text-[#7A6A63]">
                {orderFilter === 'pending' ? 'Tekshirilishi kerak bo‘lgan chek yo‘q 🎉' : 'Hech narsa topilmadi.'}
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {shownOrders.map((o, idx) => (
                  <OrderCard key={o._key} order={o} onToast={showToast} index={idx} fresh={freshIds.has(o._key)} />
                ))}
              </div>
            )}
          </>
        )}

        {/* STATS */}
        {loaded && tab === 'stats' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {([7, 30, 90] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  aria-pressed={range === r}
                  className={`min-h-[38px] px-3.5 rounded-full text-sm font-semibold border ${
                    range === r ? 'bg-[#1E1418] text-white border-[#1E1418]' : 'bg-white border-black/10'
                  }`}
                >
                  {r} kun
                </button>
              ))}
              <span className="text-xs text-[#7A6A63] ml-1">Barcha raqamlar jonli yangilanadi</span>
              <button
                type="button"
                onClick={exportPdf}
                disabled={pdfBusy}
                className="admin-press ml-auto min-h-[40px] px-4 rounded-full bg-gradient-to-br from-[#D6517F] to-[#A7325B] text-white text-sm font-bold inline-flex items-center gap-2 shadow-md disabled:opacity-60"
              >
                {pdfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                PDF yuklab olish
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {(
                [
                  ['Bugungi tushum', stats.today, fmtMoney],
                  [`${range} kunlik tushum`, stats.rangeRevenue, fmtMoney],
                  ['Jami tushum', stats.total, fmtMoney],
                  ['Tekshiruvda', stats.pendingCount, (n: number) => `${Math.round(n)} ta`],
                  ['Konversiya', stats.conversion, (n: number) => `${Math.round(n)}%`],
                  ['Foydalanuvchilar', stats.users, (n: number) => `${Math.round(n)} (+${stats.newUsers})`],
                  ['Taklifnomalar', stats.invitations, (n: number) => `${Math.round(n)} ta`],
                  ['Faol taklifnomalar', stats.activeInvitations, (n: number) => `${Math.round(n)} ta`],
                ] as Array<[string, number, (n: number) => string]>
              ).map(([label, value, format], idx) => (
                <div
                  key={label}
                  className="admin-stagger admin-lift bg-white rounded-2xl border border-black/5 p-4"
                  style={{ animationDelay: `${idx * 45}ms` }}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-[#7A6A63]">{label}</div>
                  <div className="mt-1 text-lg sm:text-xl font-bold tabular-nums">
                    <AnimatedValue value={value} format={format} />
                  </div>
                </div>
              ))}
            </div>

            <ChartCard
              title="Kunlik tushum"
              subtitle={`Oxirgi ${range} kun · tasdiqlangan to‘lovlar, so‘m`}
              table={{ head: ['Kun', 'Tushum'], rows: stats.revenueDaily.map((d) => [d.label, fmtMoney(d.value)]) }}
            >
              <ColumnChart data={stats.revenueDaily} valueLabel="Tushum" format={fmtMoney} />
            </ChartCard>

            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard
                title="Buyurtmalar va yangi foydalanuvchilar"
                subtitle={`Oxirgi ${range} kun · kunlik soni`}
                legend={[
                  { label: 'Yuborilgan cheklar', color: SERIES[0], shape: 'line' },
                  { label: 'Yangi foydalanuvchilar', color: SERIES[1], shape: 'line' },
                ]}
                table={{
                  head: ['Kun', 'Cheklar', 'Yangi foydalanuvchilar'],
                  rows: stats.dayLabels.map((l, i) => [l, stats.ordersDaily[i], stats.usersDaily[i]]),
                }}
              >
                <LineChart
                  labels={stats.dayLabels}
                  series={[
                    { name: 'Yuborilgan cheklar', color: SERIES[0], values: stats.ordersDaily },
                    { name: 'Yangi foydalanuvchilar', color: SERIES[1], values: stats.usersDaily },
                  ]}
                />
              </ChartCard>

              <ChartCard
                title="Buyurtmalar holati"
                subtitle={`Oxirgi ${range} kun`}
                table={{ head: ['Holat', 'Soni'], rows: stats.statusSegments.map((s) => [s.label, s.value]) }}
              >
                <SegmentBar segments={stats.statusSegments} />
              </ChartCard>

              <ChartCard
                title="Eng ko‘p sotilgan shablonlar"
                subtitle={`Oxirgi ${range} kun · sotuvlar soni`}
                table={{ head: ['Shablon', 'Soni'], rows: stats.topCount.map((d) => [d.label, d.value]) }}
              >
                <HBarList items={stats.topCount} format={(n) => `${n} ta`} />
              </ChartCard>

              <ChartCard
                title="Shablonlar bo‘yicha tushum"
                subtitle={`Oxirgi ${range} kun · so‘m`}
                table={{ head: ['Shablon', 'Tushum'], rows: stats.topSum.map((d) => [d.label, fmtMoney(d.value)]) }}
              >
                <HBarList items={stats.topSum} color={BRAND} format={fmtMoney} />
              </ChartCard>
            </div>
          </div>
        )}

        {/* INVITATIONS */}
        {loaded && tab === 'invitations' && (
          <div className="space-y-2">
            {invList
              .filter((i) => match(i.hostNames, i.eventTitle, i.slug, i.venueName, i._key))
              .map((i, idx) => {
                const id = i.id || i._key;
                const active = i.status === 'paid' || i.status === 'published';
                return (
                  <div key={i._key} className="admin-stagger admin-lift bg-white rounded-2xl border border-black/5 p-3.5 flex flex-wrap items-center gap-3" style={{ animationDelay: `${Math.min(idx, 12) * 30}ms` }}>
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold">{i.hostNames || i.eventTitle || 'Nomsiz'}</span>
                        <StatusBadge status={i.status} />
                      </div>
                      <div className="text-xs text-[#7A6A63] mt-0.5">
                        /i/{i.slug || '—'} · {i.eventDate || '—'} · {i.templateSlug || '—'}
                        {typeof i.viewsCount === 'number' ? ` · 👁 ${i.viewsCount}` : ''}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {i.slug && (
                        <a href={`/i/${i.slug}`} target="_blank" rel="noreferrer" className="min-h-[36px] px-3 rounded-xl bg-[#F3EEEA] text-xs font-semibold inline-flex items-center gap-1">
                          <ExternalLink className="w-3.5 h-3.5" /> Ochish
                        </a>
                      )}
                      {active ? (
                        <button
                          type="button"
                          onClick={() =>
                            runAction({ type: 'invitation.setStatus', invitationId: id, status: 'pending_payment' }, 'O‘chirildi (nofaol)', 'Taklifnomani nofaol qilasizmi? Mehmonlar uni ocha olmaydi.')
                          }
                          className="min-h-[36px] px-3 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold"
                        >
                          Nofaol qilish
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            runAction({ type: 'invitation.setStatus', invitationId: id, status: 'paid' }, 'Faollashtirildi ✅', 'Taklifnomani to‘lovsiz faollashtirasizmi?')
                          }
                          className="min-h-[36px] px-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold"
                        >
                          Faollashtirish
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          runAction({ type: 'invitation.delete', invitationId: id }, 'O‘chirildi', `«${i.hostNames || id}» taklifnomasini butunlay o‘chirasizmi? Bu amalni qaytarib bo‘lmaydi.`)
                        }
                        className="min-h-[36px] px-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> O‘chirish
                      </button>
                    </div>
                  </div>
                );
              })}
            {invList.length === 0 && <p className="py-12 text-center text-sm text-[#7A6A63]">Taklifnomalar yo‘q.</p>}
          </div>
        )}

        {/* USERS */}
        {loaded && tab === 'users' && (
          <div className="space-y-2">
            {userList
              .filter((u) => match(u.name, u.email, u.phone, u._key))
              .map((u, idx) => {
                const uid = u.id || u._key;
                const o = ordersByOwner.get(uid);
                const phone = digits(u.phone);
                return (
                  <div key={u._key} className="admin-stagger admin-lift bg-white rounded-2xl border border-black/5 p-3.5 flex flex-wrap items-center gap-3" style={{ animationDelay: `${Math.min(idx, 12) * 30}ms` }}>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#F5C9D8] to-[#B9DFFA] flex items-center justify-center font-bold">
                      {(u.name || u.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-[180px]">
                      <div className="font-bold">{u.name || '—'}</div>
                      <div className="text-xs text-[#7A6A63] break-all">
                        {u.email || '—'}
                        {u.phone ? ` · ${u.phone}` : ''}
                      </div>
                      <div className="text-[11px] text-[#7A6A63]">
                        Ro‘yxatdan: {fmtDate(u.createdAt)} · Oxirgi kirish: {ago(u.lastLoginAt) || '—'}
                      </div>
                    </div>
                    <div className="text-xs text-right tabular-nums">
                      <div>Taklifnomalar: <b>{invByOwner.get(uid) || 0}</b></div>
                      <div>Buyurtmalar: <b>{o?.count || 0}</b></div>
                      <div>To‘lagan: <b>{fmtMoney(o?.paid || 0)}</b></div>
                    </div>
                    {phone && (
                      <a href={`tel:+${phone}`} className="min-h-[36px] px-3 rounded-xl bg-[#F3EEEA] text-xs font-semibold inline-flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" /> Qo‘ng‘iroq
                      </a>
                    )}
                  </div>
                );
              })}
            {userList.length === 0 && <p className="py-12 text-center text-sm text-[#7A6A63]">Foydalanuvchilar yo‘q.</p>}
          </div>
        )}

        {/* MESSAGES */}
        {loaded && tab === 'messages' && (
          <div className="space-y-2">
            {msgList
              .filter((m) => match(m.name, m.contact, m.subject, m.message))
              .map((m, idx) => {
                const id = m.id || m._key;
                return (
                  <div key={m._key} className={`admin-stagger admin-lift bg-white rounded-2xl border p-4 space-y-2 ${m.status === 'new' ? 'border-[#D9658B]/40' : 'border-black/5'}`} style={{ animationDelay: `${Math.min(idx, 12) * 30}ms` }}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-bold">
                        {m.name || '—'} <span className="font-normal text-xs text-[#7A6A63]">· {m.contact}</span>
                      </div>
                      <span className="text-[11px] text-[#7A6A63]">{fmtDate(m.createdAt)}</span>
                    </div>
                    {m.subject && <div className="text-sm font-semibold">{m.subject}</div>}
                    <p className="text-sm text-[#4A3E39] whitespace-pre-wrap">{m.message}</p>
                    <div className="flex flex-wrap gap-2">
                      {m.status === 'new' ? (
                        <button type="button" onClick={() => runAction({ type: 'message.setStatus', messageId: id, status: 'read' }, 'O‘qildi deb belgilandi')} className="min-h-[36px] px-3 rounded-xl bg-[#F3EEEA] text-xs font-semibold">
                          O‘qildi
                        </button>
                      ) : (
                        <button type="button" onClick={() => runAction({ type: 'message.setStatus', messageId: id, status: 'new' }, 'Yangi deb belgilandi')} className="min-h-[36px] px-3 rounded-xl bg-[#F3EEEA] text-xs font-semibold">
                          Yangi deb belgilash
                        </button>
                      )}
                      <button type="button" onClick={() => runAction({ type: 'message.delete', messageId: id }, 'O‘chirildi', 'Xabarni o‘chirasizmi?')} className="min-h-[36px] px-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold inline-flex items-center gap-1">
                        <Trash2 className="w-3.5 h-3.5" /> O‘chirish
                      </button>
                    </div>
                  </div>
                );
              })}
            {msgList.length === 0 && <p className="py-12 text-center text-sm text-[#7A6A63]">Xabarlar yo‘q.</p>}
          </div>
        )}
        {/* SETTINGS */}
        {loaded && tab === 'music' && <AdminMusic onToast={showToast} />}

        {loaded && tab === 'settings' && (
          <AdminSettings settings={siteSettings} overrides={templateOverrides} onToast={showToast} />
        )}

        {/* HISTORY (audit log) */}
        {loaded && tab === 'history' && (
          <div className="bg-white rounded-2xl border border-black/5 divide-y divide-black/5">
            {toList(audit)
              .sort((a, b) => ts(b.at) - ts(a.at))
              .filter((e) => match(e.type, e.target, e.detail, e.ip))
              .map((e) => (
                <div key={e._key} className="px-4 py-2.5 text-sm flex flex-wrap gap-x-3 gap-y-0.5">
                  <span className="text-[11px] text-[#7A6A63] tabular-nums w-[120px] shrink-0">{fmtDate(e.at)}</span>
                  <span className={`font-semibold ${e.type === 'login_failed' ? 'text-rose-700' : ''}`}>{AUDIT_LABEL[e.type || ''] || e.type}</span>
                  {e.target && <span className="font-mono text-xs text-[#9E3E60]">{e.target}</span>}
                  {e.detail && <span className="text-[#4A3E39]">{e.detail}</span>}
                  {e.ip && <span className="text-[11px] text-[#7A6A63] ml-auto">IP {e.ip}</span>}
                </div>
              ))}
            {Object.keys(audit).length === 0 && <p className="py-12 text-center text-sm text-[#7A6A63]">Hali amallar yo‘q.</p>}
          </div>
        )}
      </main>

      {toast && (
        <div
          role="status"
          key={toast.text}
          className={`admin-toast fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl shadow-lg text-sm font-semibold text-white ${
            toast.ok ? 'bg-[#1E1418]' : 'bg-rose-600'
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
};

/** Hidden admin route (/admin). Not linked anywhere on the site and excluded from search engines. */
export const AdminPage: React.FC = () => {
  const [state, setState] = useState<'checking' | 'out' | 'in'>('checking');

  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    const created = !meta;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'robots';
      document.head.appendChild(meta);
    }
    const prev = meta.content;
    meta.content = 'noindex, nofollow';
    document.title = 'Boshqaruv paneli';
    const unsub = watchAdminSession((signedIn) => setState(signedIn ? 'in' : 'out'));
    return () => {
      unsub();
      if (created) meta?.remove();
      else if (meta) meta.content = prev;
    };
  }, []);

  if (state === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#C64873]" />
      </div>
    );
  }
  return state === 'in' ? <AdminPanel /> : <AdminLogin onDone={() => setState('in')} />;
};

export default AdminPage;
