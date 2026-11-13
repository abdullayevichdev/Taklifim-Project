import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, Link } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import {
  useLanguage,
  formatPersonCount,
  formatItemCount,
  translateCategory,
  translateOrderStatus,
} from '../locales';
import { api } from '../services/api';
import { InvitationData, GuestRSVP, OrderItem, Language } from '../types';
import { calculateRSVPStats, formatPriceUZS } from '../utils/logic';
import { generateInvitationSlug } from '../utils/slug';
import { ShareModal } from '../components/ShareModal';
import { PhoneInput } from '../components/PhoneInput';
import { CustomDropdown } from '../components/CustomDropdown';
import {
  GlassSurface,
  GlassButton,
  GlassSegmented,
  GlassInput,
  GlassModal,
  GlassStatSkeletonGrid,
  GlassCardSkeletonGrid,
  GlassTableSkeleton,
} from '../components/glass';
import {
  Users,
  Calendar,
  PlusCircle,
  Edit,
  Copy,
  Trash2,
  Share2,
  CheckCircle2,
  XCircle,
  Search,
  CreditCard,
  FileText,
  LayoutGrid,
  List as ListIcon,
  Globe,
} from 'lucide-react';

export const CustomerDashboard: React.FC = () => {
  const { path, navigate } = useRouter();
  const { user, updateUserProfile, showToast } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  // Active sub-tab based on URL path
  const activeTab = useMemo(() => {
    if (path.includes('/dashboard/invitations')) return 'invitations';
    if (path.includes('/dashboard/guests')) return 'guests';
    if (path.includes('/dashboard/orders')) return 'orders';
    if (path.includes('/dashboard/settings')) return 'settings';
    return 'overview';
  }, [path]);

  // Data states
  const [invitations, setInvitations] = useState<InvitationData[]>([]);
  const [guests, setGuests] = useState<GuestRSVP[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Invitations view mode: grid or list
  const [invitationViewMode, setInvitationViewMode] = useState<'grid' | 'list'>('grid');

  // Deletion modals
  const [invitationToDelete, setInvitationToDelete] = useState<InvitationData | null>(null);
  const [guestToDelete, setGuestToDelete] = useState<GuestRSVP | null>(null);

  // Share modal
  const [shareData, setShareData] = useState<{ url: string; title: string } | null>(null);

  // Guest search and filters
  const [guestSearch, setGuestSearch] = useState('');
  const [guestFilterStatus, setGuestFilterStatus] = useState<'all' | 'attending' | 'declined'>('all');

  // Settings form - Real user data
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');

  // Synchronize fields when user logs in or profile changes
  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfilePhone(user.phone || '');
      setProfileEmail(user.email || '');
    }
  }, [user]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [invList, guestList, orderList] = await Promise.all([
        api.getInvitations(),
        api.getGuests(),
        api.getOrders(),
      ]);
      setInvitations(invList);
      setGuests(guestList);
      setOrders(orderList);
      setLoading(false);
    }
    loadData();

    const unsubInv = api.subscribe<InvitationData[]>('invitations', (data) => {
      setInvitations(data);
    });
    const unsubGuests = api.subscribe<GuestRSVP[]>('guests', (data) => {
      setGuests(data);
    });
    const unsubOrders = api.subscribe<OrderItem[]>('orders', (data) => {
      setOrders(data);
    });

    return () => {
      unsubInv();
      unsubGuests();
      unsubOrders();
    };
  }, []);

  const handleExportCSV = () => {
    if (filteredGuests.length === 0) {
      showToast(t.dashboard.toastExportEmpty, 'info');
      return;
    }
    const headers = t.dashboard.csvHeaders;
    const rows = filteredGuests.map((g) => [
      `"${g.fullName.replace(/"/g, '""')}"`,
      `"${(g.phone || '').replace(/"/g, '""')}"`,
      g.attending ? t.dashboard.csvAttendingYes : t.dashboard.csvAttendingNo,
      g.guestCount,
      `"${(g.mealPreference || '').replace(/"/g, '""')}"`,
      `"${(g.message || '').replace(/"/g, '""')}"`,
      `"${g.submittedAt || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `guests_list_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(t.dashboard.toastCsvDownloaded, 'success');
  };

  const handleDeleteGuestConfirm = async () => {
    if (!guestToDelete) return;
    await api.deleteGuest(guestToDelete.id);
    setGuestToDelete(null);
    showToast(t.dashboard.toastGuestDeleted, 'info');
  };

  const rsvpStats = useMemo(() => calculateRSVPStats(guests), [guests]);

  const handleDuplicate = async (inv: InvitationData) => {
    const duplicated: InvitationData = {
      ...inv,
      id: `inv-${Date.now()}`,
      slug: generateInvitationSlug(inv.partner1Name || inv.hostNames, inv.partner2Name),
      eventTitle: `${inv.eventTitle} ${t.dashboard.duplicateTitleSuffix}`,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await api.saveInvitation(duplicated);
    setInvitations((prev) => [duplicated, ...prev]);
    showToast(t.dashboard.toastDuplicated, 'success');
  };

  const handleDeleteConfirm = async () => {
    if (!invitationToDelete) return;
    await api.deleteInvitation(invitationToDelete.id);
    setInvitations((prev) => prev.filter((i) => i.id !== invitationToDelete.id));
    setInvitationToDelete(null);
    showToast(t.dashboard.toastDeleted, 'info');
  };

  const filteredGuests = useMemo(() => {
    let result = [...guests];
    if (guestFilterStatus === 'attending') {
      result = result.filter((g) => g.attending);
    } else if (guestFilterStatus === 'declined') {
      result = result.filter((g) => !g.attending);
    }
    if (guestSearch.trim()) {
      const q = guestSearch.toLowerCase().trim();
      result = result.filter(
        (g) =>
          g.fullName.toLowerCase().includes(q) ||
          (g.phone && g.phone.includes(q)) ||
          (g.message && g.message.toLowerCase().includes(q))
      );
    }
    return result;
  }, [guests, guestFilterStatus, guestSearch]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user && updateUserProfile) {
      await updateUserProfile({
        name: profileName.trim() || user.name,
        email: profileEmail.trim() || user.email,
        phone: profilePhone.trim(),
      });
      showToast(t.dashboard.toastProfileSaved, 'success');
    }
  };

  return (
    <div className="pt-28 pb-28 lg:pb-20 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Dashboard Top Header */}
        <GlassSurface
          variant="elevated"
          rounded="3xl"
          className="p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        >
          <div className="space-y-1">
            <span className="text-xs uppercase font-bold tracking-wider text-[#9E3E60]">
              {t.dashboard.title}
            </span>
            <h1 className="font-playfair text-3xl font-extrabold text-[#1E1418]">
              {t.dashboard.welcome}, {user?.name || t.dashboard.defaultCustomerName}!
            </h1>
            <p className="text-xs sm:text-sm text-[#4A383F]">
              {t.dashboard.subtitle}
            </p>
          </div>

          <GlassButton
            tone="tinted"
            size="md"
            href="/templates"
            onAnchorClick={(e) => {
              e.preventDefault();
              navigate('/templates');
            }}
            leftIcon={<PlusCircle className="w-4 h-4" aria-hidden="true" />}
            className="shrink-0"
          >
            {t.dashboard.createBtn}
          </GlassButton>
        </GlassSurface>

        {/* Dashboard Navigation Tabs */}
        <nav aria-label={t.dashboard.title} className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar">
          {[
            { id: 'overview', path: '/dashboard', label: t.dashboard.tabs.overview },
            { id: 'invitations', path: '/dashboard/invitations', label: t.dashboard.tabs.invitations },
            { id: 'guests', path: '/dashboard/guests', label: `${t.dashboard.tabs.guests} (${guests.length})` },
            { id: 'orders', path: '/dashboard/orders', label: t.dashboard.tabs.orders },
            { id: 'settings', path: '/dashboard/settings', label: t.dashboard.tabs.settings },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                to={tab.path}
                aria-current={isActive ? 'page' : undefined}
                className={`min-h-[40px] inline-flex items-center px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                  isActive
                    ? 'bg-[#1E1418] text-white shadow-sm'
                    : 'glass-surface-subtle text-[#4A383F] hover:text-[#1E1418] hover:bg-white/90'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fadeIn">
            {loading ? (
              <>
                <GlassStatSkeletonGrid count={4} />
                <GlassCardSkeletonGrid count={3} />
              </>
            ) : (
              <>
                {/* Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  <GlassSurface variant="default" rounded="3xl" className="p-5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#4A383F]">
                      {t.dashboard.totalInvitations}
                    </span>
                    <div className="font-playfair text-3xl font-extrabold text-[#1E1418] mt-1 tabular-nums">
                      {invitations.length}
                    </div>
                    <span className="text-[11px] text-emerald-700 font-semibold">{t.dashboard.heroSubActive}</span>
                  </GlassSurface>

                  <GlassSurface variant="tinted-pink" rounded="3xl" className="p-5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#4A383F]">
                      {t.dashboard.totalGuests}
                    </span>
                    <div className="font-playfair text-3xl font-extrabold text-[#9E3E60] mt-1 tabular-nums">
                      {rsvpStats.totalGuests}
                    </div>
                    <span className="text-[11px] text-[#4A383F]">{t.dashboard.heroSubConfirmed}</span>
                  </GlassSurface>

                  <GlassSurface variant="tinted-sky" rounded="3xl" className="p-5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#4A383F]">
                      {t.dashboard.rsvpResponses}
                    </span>
                    <div className="font-playfair text-3xl font-extrabold text-[#2B6CB0] mt-1 tabular-nums">
                      {rsvpStats.total}
                    </div>
                    <span className="text-[11px] text-emerald-700 font-semibold tabular-nums">
                      {rsvpStats.acceptanceRate}% {t.dashboard.heroSubAcceptanceSuffix}
                    </span>
                  </GlassSurface>

                  <GlassSurface variant="default" rounded="3xl" className="p-5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#4A383F]">
                      {t.dashboard.drafts}
                    </span>
                    <div className="font-playfair text-3xl font-extrabold text-[#8A611C] mt-1 tabular-nums">
                      {invitations.filter((i) => i.status === 'draft').length}
                    </div>
                    <span className="text-[11px] text-[#4A383F]">{t.dashboard.heroSubPendingEdit}</span>
                  </GlassSurface>
                </div>

                {/* Quick Invitation Preview Row */}
                <GlassSurface variant="elevated" rounded="3xl" className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-playfair text-xl font-bold text-[#1E1418]">
                      {t.dashboard.recentInvitationsTitle}
                    </h3>
                    <Link
                      to="/dashboard/invitations"
                      className="text-xs font-bold text-[#9E3E60] hover:underline"
                    >
                      {t.dashboard.viewAllLink}
                    </Link>
                  </div>

                  {invitations.length === 0 ? (
                    <div className="py-8 text-center space-y-3">
                      <Calendar className="w-9 h-9 text-[#9E3E60]/60 mx-auto" aria-hidden="true" />
                      <p className="text-xs text-[#4A383F]">{t.dashboard.emptyInvitations}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {invitations.slice(0, 3).map((inv) => (
                        <div
                          key={inv.id}
                          className="p-4 rounded-2xl glass-card-lite glass-card-hover space-y-3 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 text-[10px] font-bold">
                              <span className="uppercase text-[#4A383F] truncate">{translateCategory(inv.eventType, language)}</span>
                              <span
                                className={`px-2 py-0.5 rounded-full shrink-0 ${
                                  inv.status === 'published' || inv.status === 'paid'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/70'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200/70'
                                }`}
                              >
                                {inv.status === 'published' || inv.status === 'paid' ? t.dashboard.statusActive : t.dashboard.statusDraft}
                              </span>
                            </div>
                            <h4 className="font-playfair text-base font-bold text-[#1E1418] mt-1.5 truncate">
                              {inv.hostNames}
                            </h4>
                            <p className="text-[11px] text-[#4A383F] mt-0.5 tabular-nums truncate">
                              {inv.eventDate} · {inv.venueName}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-black/5 text-xs">
                            <Link
                              to={`/i/${inv.slug}`}
                              className="flex-1 min-h-[36px] inline-flex items-center justify-center px-3 rounded-xl bg-[#1E1418] text-white font-semibold hover:bg-black transition-colors"
                            >
                              {t.dashboard.openBtn}
                            </Link>
                            <button
                              type="button"
                              onClick={() =>
                                setShareData({
                                  url: `/i/${inv.slug}`,
                                  title: `${inv.hostNames} — ${inv.eventTitle || translateCategory(inv.eventType, language)}`,
                                })
                              }
                              className="min-h-[36px] min-w-[36px] rounded-xl glass-surface-subtle hover:bg-white text-[#1E1418] flex items-center justify-center cursor-pointer transition-colors"
                              title={t.common.share}
                              aria-label={t.common.share}
                            >
                              <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassSurface>
              </>
            )}
          </div>
        )}

        {/* TAB 2: MY INVITATIONS */}
        {activeTab === 'invitations' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-playfair text-2xl font-bold text-[#1E1418]">
                  {t.myInvitations.title}
                </h2>
                <p className="text-xs text-[#4A383F] tabular-nums">
                  {formatItemCount(invitations.length, language)}
                </p>
              </div>

              {/* View Switcher: Grid / List */}
              <GlassSegmented
                ariaLabel={t.myInvitations.title}
                value={invitationViewMode}
                onChange={(val) => setInvitationViewMode(val)}
                options={[
                  {
                    value: 'grid',
                    label: t.dashboard.gridViewAria,
                    icon: <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />,
                  },
                  {
                    value: 'list',
                    label: t.dashboard.listViewAria,
                    icon: <ListIcon className="w-3.5 h-3.5" aria-hidden="true" />,
                  },
                ]}
              />
            </div>

            {loading ? (
              <GlassCardSkeletonGrid count={3} />
            ) : invitations.length === 0 ? (
              <GlassSurface variant="elevated" rounded="3xl" className="p-12 text-center max-w-md mx-auto space-y-4">
                <Calendar className="w-10 h-10 text-[#9E3E60]/70 mx-auto" aria-hidden="true" />
                <h3 className="font-playfair text-xl font-bold text-[#1E1418]">
                  {t.dashboard.emptyInvitations}
                </h3>
                <div className="pt-1">
                  <GlassButton
                    tone="tinted"
                    size="md"
                    href="/templates"
                    onAnchorClick={(e) => {
                      e.preventDefault();
                      navigate('/templates');
                    }}
                    leftIcon={<PlusCircle className="w-4 h-4" aria-hidden="true" />}
                  >
                    {t.dashboard.createBtn}
                  </GlassButton>
                </div>
              </GlassSurface>
            ) : invitationViewMode === 'grid' ? (
              /* Grid View */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="glass-card-lite glass-card-hover rounded-3xl overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      {inv.coverImage && (
                        <div className="h-44 overflow-hidden relative bg-gradient-to-br from-[#F5C9D8]/50 to-[#B9DFFA]/50">
                          <img
                            src={inv.coverImage}
                            alt={inv.hostNames}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                          <span
                            className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md border border-white/50 ${
                              inv.status === 'published' || inv.status === 'paid'
                                ? 'bg-emerald-600/90 text-white'
                                : 'bg-amber-500/90 text-white'
                            }`}
                          >
                            {inv.status === 'published' || inv.status === 'paid' ? t.dashboard.statusActive : t.dashboard.statusDraft}
                          </span>
                        </div>
                      )}

                      <div className="p-5 space-y-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#9E3E60]">
                          {translateCategory(inv.eventType, language)}
                        </span>
                        <h3 className="font-playfair text-lg font-bold text-[#1E1418] truncate">
                          {inv.hostNames}
                        </h3>
                        <p className="text-xs text-[#4A383F] tabular-nums truncate">
                          {inv.eventDate} ({inv.startTime}) · {inv.venueName}
                        </p>
                      </div>
                    </div>

                    <div className="p-5 pt-3 border-t border-black/5 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Link
                          to={`/i/${inv.slug}`}
                          className="min-h-[38px] inline-flex items-center px-3.5 rounded-xl bg-[#1E1418] text-white font-semibold hover:bg-black transition-colors"
                        >
                          {t.dashboard.viewActionTitle}
                        </Link>
                        <Link
                          to={`/create/${inv.templateSlug}`}
                          className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-xl glass-surface-subtle hover:bg-white text-[#1E1418] transition-colors"
                          title={t.dashboard.editActionTitle}
                          aria-label={t.dashboard.editActionTitle}
                        >
                          <Edit className="w-3.5 h-3.5" aria-hidden="true" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDuplicate(inv)}
                          className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-xl glass-surface-subtle hover:bg-white text-[#1E1418] transition-colors cursor-pointer"
                          title={t.dashboard.duplicateActionTitle}
                          aria-label={t.dashboard.duplicateActionTitle}
                        >
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setShareData({
                              url: `/i/${inv.slug}`,
                              title: `${inv.hostNames} — ${inv.eventTitle || translateCategory(inv.eventType, language)}`,
                            })
                          }
                          className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-xl glass-surface-subtle hover:bg-white text-[#1E1418] transition-colors cursor-pointer"
                          title={t.myInvitations.shareCardTitle}
                          aria-label={t.myInvitations.shareCardTitle}
                        >
                          <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setInvitationToDelete(inv)}
                        className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-xl text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title={t.dashboard.deleteActionTitle}
                        aria-label={t.dashboard.deleteActionTitle}
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* List View */
              <GlassSurface variant="elevated" rounded="3xl" className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-black/8 text-[#4A383F] bg-white/45 uppercase tracking-wider text-[10px]">
                        <th className="py-3.5 px-4 font-bold text-[#1E1418]">{t.dashboard.colInvitation}</th>
                        <th className="py-3.5 px-4 font-bold">{t.dashboard.colDate}</th>
                        <th className="py-3.5 px-4 font-bold">{t.dashboard.colStatus}</th>
                        <th className="py-3.5 px-4 text-right font-bold">{t.dashboard.colActions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {invitations.map((inv) => (
                        <tr key={inv.id} className="hover:bg-white/55 transition-colors">
                          <td className="py-3.5 px-4">
                            <strong className="text-[#1E1418] block">{inv.hostNames}</strong>
                            <span className="text-[11px] text-[#4A383F]">{translateCategory(inv.eventType, language)}</span>
                          </td>
                          <td className="py-3.5 px-4 text-[#4A383F] tabular-nums">{inv.eventDate}</td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                inv.status === 'published' || inv.status === 'paid'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {inv.status === 'published' || inv.status === 'paid' ? t.dashboard.statusActive : t.dashboard.statusDraft}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link
                                to={`/i/${inv.slug}`}
                                className="min-h-[34px] inline-flex items-center px-3 rounded-lg bg-[#1E1418] text-white font-semibold"
                              >
                                {t.dashboard.viewActionTitle}
                              </Link>
                              <Link
                                to={`/create/${inv.templateSlug}`}
                                className="min-h-[34px] min-w-[34px] inline-flex items-center justify-center rounded-lg glass-surface-subtle hover:bg-white text-[#1E1418]"
                                title={t.dashboard.editActionTitle}
                                aria-label={t.dashboard.editActionTitle}
                              >
                                <Edit className="w-3.5 h-3.5" aria-hidden="true" />
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDuplicate(inv)}
                                className="min-h-[34px] min-w-[34px] inline-flex items-center justify-center rounded-lg glass-surface-subtle hover:bg-white text-[#1E1418] cursor-pointer"
                                title={t.dashboard.duplicateActionTitle}
                                aria-label={t.dashboard.duplicateActionTitle}
                              >
                                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setInvitationToDelete(inv)}
                                className="min-h-[34px] min-w-[34px] inline-flex items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                                title={t.dashboard.deleteActionTitle}
                                aria-label={t.dashboard.deleteActionTitle}
                              >
                                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassSurface>
            )}
          </div>
        )}

        {/* TAB 3: GUESTS (RSVP RESPONSES) */}
        {activeTab === 'guests' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-playfair text-2xl font-bold text-[#1E1418]">
                  {t.dashboard.rsvpSectionTitle}
                </h2>
                <p className="text-xs text-[#4A383F]">
                  {t.dashboard.rsvpSectionSubtitle}
                </p>
              </div>

              <GlassButton
                type="button"
                tone="light"
                size="sm"
                onClick={handleExportCSV}
                leftIcon={<FileText className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />}
                title={t.dashboard.exportCsvBtn}
              >
                {t.dashboard.exportCsvBtn}
              </GlassButton>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
              <div className="overflow-x-auto no-scrollbar pb-0.5">
                <GlassSegmented
                  ariaLabel={t.dashboard.rsvpSectionTitle}
                  value={guestFilterStatus}
                  onChange={(val) => setGuestFilterStatus(val)}
                  options={[
                    { value: 'all', label: `${t.common.all} (${guests.length})` },
                    { value: 'attending', label: `${t.dashboard.attendingShort} (${rsvpStats.attendingCount})` },
                    { value: 'declined', label: `${t.dashboard.declinedShort} (${rsvpStats.declinedCount})` },
                  ]}
                />
              </div>

              <GlassInput
                type="text"
                value={guestSearch}
                onChange={(e) => setGuestSearch(e.target.value)}
                placeholder={t.dashboard.guestSearchPlaceholder}
                aria-label={t.dashboard.guestSearchPlaceholder}
                leftIcon={<Search className="w-4 h-4" aria-hidden="true" />}
                containerClassName="lg:max-w-sm w-full"
              />
            </div>

            {/* Guests Table */}
            {loading ? (
              <GlassTableSkeleton rows={5} />
            ) : (
              <GlassSurface variant="elevated" rounded="3xl" className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-black/8 text-[#4A383F] bg-white/45 uppercase tracking-wider text-[10px]">
                        <th className="py-3.5 px-4 font-bold text-[#1E1418]">{t.dashboard.colGuestName}</th>
                        <th className="py-3.5 px-4 font-bold">{t.dashboard.colPhone}</th>
                        <th className="py-3.5 px-4 font-bold">{t.dashboard.colAttending}</th>
                        <th className="py-3.5 px-4 font-bold">{t.dashboard.colPeopleCount}</th>
                        <th className="py-3.5 px-4 font-bold">{t.dashboard.colMeal}</th>
                        <th className="py-3.5 px-4 font-bold">{t.dashboard.colWishNote}</th>
                        <th className="py-3.5 px-4 font-bold text-right">{t.dashboard.colActionSingle}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {filteredGuests.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-[#4A383F]">
                            <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#9E3E60]" aria-hidden="true" />
                            <p className="font-semibold text-sm text-[#1E1418]">{t.dashboard.guestsEmptyTitle}</p>
                            <p className="text-xs mt-1 text-[#4A383F]">
                              {t.dashboard.guestsEmptyDesc}
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredGuests.map((g) => (
                          <tr key={g.id} className="hover:bg-white/55 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-[#1E1418]">
                              {g.fullName}
                            </td>
                            <td className="py-3.5 px-4 text-[#4A383F] font-mono tabular-nums">{g.phone || '—'}</td>
                            <td className="py-3.5 px-4">
                              {g.attending ? (
                                <span className="inline-flex items-center gap-1 text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                                  <span>{t.dashboard.attendingShort}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-rose-800 font-bold bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                                  <XCircle className="w-3 h-3" aria-hidden="true" />
                                  <span>{t.dashboard.declinedShort}</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-mono tabular-nums font-bold text-[#1E1418]">
                              {g.attending ? formatPersonCount(g.guestCount, language) : '0'}
                            </td>
                            <td className="py-3.5 px-4 text-[#4A383F]">
                              {g.mealPreference || '—'}
                            </td>
                            <td className="py-3.5 px-4 text-[#4A383F] max-w-xs truncate italic">
                              {g.message ? `"${g.message}"` : '—'}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => setGuestToDelete(g)}
                                className="min-h-[34px] min-w-[34px] inline-flex items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title={t.dashboard.deleteActionTitle}
                                aria-label={t.dashboard.deleteActionTitle}
                              >
                                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </GlassSurface>
            )}
          </div>
        )}

        {/* TAB 4: ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="font-playfair text-2xl font-bold text-[#1E1418]">
                {t.dashboard.ordersHistoryTitle}
              </h2>
              <p className="text-xs text-[#4A383F]">
                {t.dashboard.ordersHistorySubtitle}
              </p>
            </div>

            {loading ? (
              <GlassTableSkeleton rows={4} />
            ) : (
              <GlassSurface variant="elevated" rounded="3xl" className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-black/8 text-[#4A383F] bg-white/45 uppercase tracking-wider text-[10px]">
                        <th className="py-3.5 px-4 font-bold text-[#1E1418]">{t.dashboard.colOrderNum}</th>
                        <th className="py-3.5 px-4 font-bold">{t.dashboard.colService}</th>
                        <th className="py-3.5 px-4 font-bold">{t.dashboard.colPlan}</th>
                        <th className="py-3.5 px-4 font-bold">{t.dashboard.colOrderDate}</th>
                        <th className="py-3.5 px-4 font-bold">{t.dashboard.colAmount}</th>
                        <th className="py-3.5 px-4 font-bold">{t.dashboard.colStatus}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {orders.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-[#4A383F]">
                            <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#9E3E60]" aria-hidden="true" />
                            <p className="font-semibold text-sm text-[#1E1418]">{t.dashboard.emptyOrders}</p>
                            <p className="text-xs mt-1 text-[#4A383F]">
                              {t.dashboard.emptyOrdersDesc}
                            </p>
                          </td>
                        </tr>
                      ) : (
                        orders.map((ord) => (
                          <tr key={ord.id} className="hover:bg-white/55 transition-colors">
                            <td className="py-3.5 px-4 font-mono tabular-nums font-bold text-[#1E1418]">
                              {ord.orderNumber}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-[#1E1418]">
                              {ord.serviceName}
                            </td>
                            <td className="py-3.5 px-4 text-[#4A383F]">{ord.planName}</td>
                            <td className="py-3.5 px-4 text-[#4A383F] tabular-nums">{ord.date}</td>
                            <td className="py-3.5 px-4 font-bold text-[#1E1418] tabular-nums">
                              {formatPriceUZS(ord.price, language)}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  ord.status === 'confirmed' || ord.status === 'paid'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : ord.status === 'rejected'
                                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                                    : ord.status === 'demo'
                                    ? 'bg-sky-50 text-sky-800 border-sky-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                {translateOrderStatus(ord.status, language)}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </GlassSurface>
            )}
          </div>
        )}

        {/* TAB 5: SETTINGS */}
        {activeTab === 'settings' && (
          <GlassSurface variant="elevated" rounded="3xl" className="max-w-xl mx-auto p-6 sm:p-8 space-y-6 animate-fadeIn">
            <div>
              <h2 className="font-playfair text-2xl font-bold text-[#1E1418]">
                {t.dashboard.settingsTitle}
              </h2>
              <p className="text-xs text-[#4A383F] mt-1">
                {t.dashboard.settingsSubtitle}
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <GlassInput
                type="text"
                label={t.dashboard.nameLabel}
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-[#3A2D28]">{t.dashboard.phoneLabel}</label>
                <PhoneInput
                  value={profilePhone}
                  onChange={(fullVal) => setProfilePhone(fullVal)}
                  language={language}
                />
              </div>

              <GlassInput
                type="email"
                label={t.dashboard.emailLabel}
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
              />

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-[#3A2D28]">{t.dashboard.settingsUiLangLabel}</label>
                <CustomDropdown<Language>
                  value={language}
                  onChange={(val) => setLanguage(val)}
                  icon={<Globe className="w-4 h-4 text-[#9E3E60]" aria-hidden="true" />}
                  ariaLabel={t.dashboard.settingsUiLangLabel}
                  className="w-full"
                  buttonClassName="w-full min-h-[44px] rounded-[var(--lg-radius)] glass-surface-subtle bg-white/80 px-4"
                  dropdownClassName="w-full left-0 right-0"
                  options={[
                    { value: 'uz', label: 'O‘zbekcha (Lotin)' },
                    { value: 'ru', label: 'Русский' },
                    { value: 'en', label: 'English' },
                  ]}
                />
              </div>

              <div className="pt-2">
                <GlassButton tone="tinted" type="submit" size="lg" className="w-full">
                  {t.dashboard.saveChangesBtn}
                </GlassButton>
              </div>
            </form>
          </GlassSurface>
        )}

        {/* Delete Invitation Confirmation Modal */}
        <GlassModal
          isOpen={Boolean(invitationToDelete)}
          onClose={() => setInvitationToDelete(null)}
          size="sm"
          ariaLabel={t.dashboard.deleteModalTitle}
          closeLabel={t.common.close}
        >
          <div className="space-y-4 text-center pt-1">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200/80 mx-auto flex items-center justify-center text-rose-600">
              <Trash2 className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="font-playfair text-lg font-bold text-[#1E1418]">
              {t.dashboard.deleteModalTitle}
            </h3>
            <p className="text-xs text-[#4A383F] leading-relaxed">
              {t.dashboard.deleteModalDescPrefix}{invitationToDelete?.hostNames}{t.dashboard.deleteModalDescSuffix}
            </p>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <GlassButton
                type="button"
                tone="clear"
                size="sm"
                onClick={() => setInvitationToDelete(null)}
                className="w-full"
              >
                {t.common.cancel}
              </GlassButton>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="min-h-[40px] py-2.5 px-4 rounded-full bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors cursor-pointer"
              >
                {t.dashboard.confirmDeleteBtn}
              </button>
            </div>
          </div>
        </GlassModal>

        {/* Delete Guest Confirmation Modal */}
        <GlassModal
          isOpen={Boolean(guestToDelete)}
          onClose={() => setGuestToDelete(null)}
          size="sm"
          ariaLabel={guestToDelete?.fullName || t.dashboard.confirmDeleteGuest}
          closeLabel={t.common.close}
        >
          <div className="space-y-4 text-center pt-1">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200/80 mx-auto flex items-center justify-center text-rose-600">
              <Trash2 className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="font-playfair text-lg font-bold text-[#1E1418]">
              {guestToDelete?.fullName}
            </h3>
            <p className="text-xs text-[#4A383F] leading-relaxed">
              {t.dashboard.confirmDeleteGuest}
            </p>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <GlassButton
                type="button"
                tone="clear"
                size="sm"
                onClick={() => setGuestToDelete(null)}
                className="w-full"
              >
                {t.common.cancel}
              </GlassButton>
              <button
                type="button"
                onClick={handleDeleteGuestConfirm}
                className="min-h-[40px] py-2.5 px-4 rounded-full bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors cursor-pointer"
              >
                {t.dashboard.confirmDeleteBtn}
              </button>
            </div>
          </div>
        </GlassModal>

        {/* Share Modal */}
        {shareData && (
          <ShareModal
            url={shareData.url}
            title={shareData.title}
            language={language}
            onClose={() => setShareData(null)}
          />
        )}
      </div>
    </div>
  );
};
