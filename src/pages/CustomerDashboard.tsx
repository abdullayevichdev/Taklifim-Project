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
import {
  Users,
  Calendar,
  Sparkles,
  PlusCircle,
  Eye,
  Edit,
  Copy,
  Trash2,
  Share2,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  SlidersHorizontal,
  Settings as SettingsIcon,
  CreditCard,
  FileText,
  LayoutGrid,
  List as ListIcon,
  QrCode,
  ShieldAlert,
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

  // Settings form - Real user data, zero mock/fake data
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

    // Real-time synchronization
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

  // Aggregated RSVP stats
  const rsvpStats = useMemo(() => calculateRSVPStats(guests), [guests]);

  // Duplicate invitation action
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

  // Confirm delete invitation
  const handleDeleteConfirm = async () => {
    if (!invitationToDelete) return;
    await api.deleteInvitation(invitationToDelete.id);
    setInvitations((prev) => prev.filter((i) => i.id !== invitationToDelete.id));
    setInvitationToDelete(null);
    showToast(t.dashboard.toastDeleted, 'info');
  };

  // Filtered guests
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
    <div className="pt-28 pb-20 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Dashboard Top Header */}
        <div className="glass-panel-elevated rounded-3xl p-6 sm:p-8 border border-white/95 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs uppercase font-bold tracking-wider text-[#D9658B]">
              {t.dashboard.title}
            </span>
            <h1 className="font-playfair text-3xl font-extrabold text-[#231E1B]">
              {t.dashboard.welcome}, {user?.name || t.dashboard.defaultCustomerName}!
            </h1>
            <p className="text-xs text-[#7A6A63]">
              {t.dashboard.subtitle}
            </p>
          </div>

          <Link
            to="/templates"
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold text-[#231E1B] bg-gradient-to-r from-[#F5C9D8] to-[#F5EBDD] hover:shadow-md transition-all shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t.dashboard.createBtn}</span>
          </Link>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-black/5">
          {[
            { id: 'overview', path: '/dashboard', label: t.dashboard.tabs.overview },
            { id: 'invitations', path: '/dashboard/invitations', label: t.dashboard.tabs.invitations },
            { id: 'guests', path: '/dashboard/guests', label: `${t.dashboard.tabs.guests} (${guests.length})` },
            { id: 'orders', path: '/dashboard/orders', label: t.dashboard.tabs.orders },
            { id: 'settings', path: '/dashboard/settings', label: t.dashboard.tabs.settings },
          ].map((tab) => (
            <Link
              key={tab.id}
              to={tab.path}
              className={`px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-[#231E1B] text-white shadow-xs'
                  : 'glass-panel text-[#5C4F48] hover:bg-white hover:text-[#231E1B] border border-black/5'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="glass-panel rounded-3xl p-5 border border-white/80 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-[#8A7C74]">
                  {t.dashboard.totalInvitations}
                </span>
                <div className="font-playfair text-3xl font-extrabold text-[#231E1B] mt-1">
                  {invitations.length}
                </div>
                <span className="text-[11px] text-emerald-600 font-medium">{t.dashboard.heroSubActive}</span>
              </div>

              <div className="glass-panel rounded-3xl p-5 border border-white/80 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-[#8A7C74]">
                  {t.dashboard.totalGuests}
                </span>
                <div className="font-playfair text-3xl font-extrabold text-[#D9658B] mt-1">
                  {rsvpStats.totalGuests}
                </div>
                <span className="text-[11px] text-[#7A6A63]">{t.dashboard.heroSubConfirmed}</span>
              </div>

              <div className="glass-panel rounded-3xl p-5 border border-white/80 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-[#8A7C74]">
                  {t.dashboard.rsvpResponses}
                </span>
                <div className="font-playfair text-3xl font-extrabold text-[#3B6B88] mt-1">
                  {rsvpStats.total}
                </div>
                <span className="text-[11px] text-emerald-600 font-medium">
                  {rsvpStats.acceptanceRate}% {t.dashboard.heroSubAcceptanceSuffix}
                </span>
              </div>

              <div className="glass-panel rounded-3xl p-5 border border-white/80 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-[#8A7C74]">
                  {t.dashboard.drafts}
                </span>
                <div className="font-playfair text-3xl font-extrabold text-[#B48B47] mt-1">
                  {invitations.filter((i) => i.status === 'draft').length}
                </div>
                <span className="text-[11px] text-[#7A6A63]">{t.dashboard.heroSubPendingEdit}</span>
              </div>
            </div>

            {/* Quick Invitation Preview Row */}
            <div className="glass-panel-elevated rounded-3xl p-6 border border-white/95 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-playfair text-xl font-bold text-[#231E1B]">
                  {t.dashboard.recentInvitationsTitle}
                </h3>
                <Link
                  to="/dashboard/invitations"
                  className="text-xs font-semibold text-[#D9658B] hover:underline"
                >
                  {t.dashboard.viewAllLink}
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {invitations.slice(0, 3).map((inv) => (
                  <div
                    key={inv.id}
                    className="p-4 rounded-2xl bg-white/70 border border-black/5 shadow-xs space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="uppercase text-[#8A7C74]">{translateCategory(inv.eventType, language)}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full ${
                            inv.status === 'published'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {inv.status === 'published' ? t.dashboard.statusActive : t.dashboard.statusDraft}
                        </span>
                      </div>
                      <h4 className="font-playfair text-base font-bold text-[#231E1B] mt-1">
                        {inv.hostNames}
                      </h4>
                      <p className="text-[11px] text-[#5C4F48] mt-0.5">
                        {inv.eventDate} • {inv.venueName}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-black/5 text-xs">
                      <Link
                        to={`/i/${inv.slug}`}
                        className="flex-1 py-1.5 px-2 rounded-xl bg-[#231E1B] text-white text-center font-semibold hover:bg-black transition-colors"
                      >
                        {t.dashboard.openBtn}
                      </Link>
                      <button
                        onClick={() =>
                          setShareData({
                            url: `/i/${inv.slug}`,
                            title: `${inv.hostNames} — ${inv.eventTitle || translateCategory(inv.eventType, language)}`,
                          })
                        }
                        className="p-1.5 rounded-xl glass-panel hover:bg-white text-[#5C4F48]"
                        title={t.common.share}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MY INVITATIONS */}
        {activeTab === 'invitations' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-playfair text-2xl font-bold text-[#231E1B]">
                  {t.myInvitations.title}
                </h2>
                <p className="text-xs text-[#7A6A63]">
                  {formatItemCount(invitations.length, language)}
                </p>
              </div>

              {/* View Switcher: Grid / List */}
              <div className="flex items-center gap-1 glass-panel p-1 rounded-xl border border-black/5">
                <button
                  onClick={() => setInvitationViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    invitationViewMode === 'grid' ? 'bg-white shadow-xs text-[#231E1B]' : 'text-[#7A6A63]'
                  }`}
                  aria-label={t.dashboard.gridViewAria}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setInvitationViewMode('list')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    invitationViewMode === 'list' ? 'bg-white shadow-xs text-[#231E1B]' : 'text-[#7A6A63]'
                  }`}
                  aria-label={t.dashboard.listViewAria}
                >
                  <ListIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {invitations.length === 0 ? (
              <div className="glass-panel rounded-3xl p-12 text-center max-w-md mx-auto space-y-4">
                <Calendar className="w-10 h-10 text-[#8A7C74] mx-auto" />
                <h3 className="font-playfair text-xl font-bold text-[#231E1B]">
                  {t.dashboard.emptyInvitations}
                </h3>
                <Link
                  to="/templates"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#231E1B] text-white text-xs font-semibold"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{t.dashboard.createBtn}</span>
                </Link>
              </div>
            ) : invitationViewMode === 'grid' ? (
              /* Grid View */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="glass-panel-elevated rounded-3xl overflow-hidden border border-white/95 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      {inv.coverImage && (
                        <div className="h-44 overflow-hidden relative">
                          <img
                            src={inv.coverImage}
                            alt={inv.hostNames}
                            className="w-full h-full object-cover"
                          />
                          <span
                            className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md ${
                              inv.status === 'published'
                                ? 'bg-emerald-600/90 text-white'
                                : 'bg-amber-500/90 text-white'
                            }`}
                          >
                            {inv.status === 'published' ? t.dashboard.statusActive : t.dashboard.statusDraft}
                          </span>
                        </div>
                      )}

                      <div className="p-5 space-y-2">
                        <span className="text-[10px] uppercase font-bold text-[#8A7C74]">
                          {translateCategory(inv.eventType, language)}
                        </span>
                        <h3 className="font-playfair text-lg font-bold text-[#231E1B]">
                          {inv.hostNames}
                        </h3>
                        <p className="text-xs text-[#5C4F48]">
                          {inv.eventDate} ({inv.startTime}) • {inv.venueName}
                        </p>
                      </div>
                    </div>

                    <div className="p-5 pt-0 border-t border-black/5 mt-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <Link
                          to={`/i/${inv.slug}`}
                          className="px-3 py-1.5 rounded-xl bg-[#231E1B] text-white font-semibold hover:bg-black transition-colors"
                        >
                          {t.dashboard.viewActionTitle}
                        </Link>
                        <Link
                          to={`/create/${inv.templateSlug}`}
                          className="p-2 rounded-xl glass-panel hover:bg-white text-[#5C4F48]"
                          title={t.dashboard.editActionTitle}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDuplicate(inv)}
                          className="p-2 rounded-xl glass-panel hover:bg-white text-[#5C4F48]"
                          title={t.dashboard.duplicateActionTitle}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setShareData({
                              url: `/i/${inv.slug}`,
                              title: `${inv.hostNames} — ${inv.eventTitle || translateCategory(inv.eventType, language)}`,
                            })
                          }
                          className="p-2 rounded-xl glass-panel hover:bg-white text-[#5C4F48]"
                          title={t.myInvitations.shareCardTitle}
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => setInvitationToDelete(inv)}
                        className="p-2 rounded-xl text-rose-600 hover:bg-rose-50"
                        title={t.dashboard.deleteActionTitle}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* List View */
              <div className="glass-panel-elevated rounded-3xl overflow-hidden border border-white/95 shadow-md">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-black/10 text-[#7A6A63] bg-black/5">
                      <th className="py-3 px-4 font-bold text-[#231E1B]">{t.dashboard.colInvitation}</th>
                      <th className="py-3 px-4 font-bold">{t.dashboard.colDate}</th>
                      <th className="py-3 px-4 font-bold">{t.dashboard.colStatus}</th>
                      <th className="py-3 px-4 text-right font-bold">{t.dashboard.colActions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {invitations.map((inv) => (
                      <tr key={inv.id} className="hover:bg-white/40">
                        <td className="py-3 px-4">
                          <strong className="text-[#231E1B] block">{inv.hostNames}</strong>
                          <span className="text-[11px] text-[#8A7C74]">{translateCategory(inv.eventType, language)}</span>
                        </td>
                        <td className="py-3 px-4 text-[#5C4F48]">{inv.eventDate}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              inv.status === 'published'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {inv.status === 'published' ? t.dashboard.statusActive : t.dashboard.statusDraft}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              to={`/i/${inv.slug}`}
                              className="px-2.5 py-1 rounded-lg bg-[#231E1B] text-white font-semibold"
                            >
                              {t.dashboard.viewActionTitle}
                            </Link>
                            <Link
                              to={`/create/${inv.templateSlug}`}
                              className="p-1.5 rounded-lg glass-panel hover:bg-white"
                              title={t.dashboard.editActionTitle}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              onClick={() => handleDuplicate(inv)}
                              className="p-1.5 rounded-lg glass-panel hover:bg-white"
                              title={t.dashboard.duplicateActionTitle}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setInvitationToDelete(inv)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                              title={t.dashboard.deleteActionTitle}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: GUESTS (RSVP RESPONSES) */}
        {activeTab === 'guests' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-playfair text-2xl font-bold text-[#231E1B]">
                  {t.dashboard.rsvpSectionTitle}
                </h2>
                <p className="text-xs text-[#7A6A63]">
                  {t.dashboard.rsvpSectionSubtitle}
                </p>
              </div>

              {/* Status Filter & CSV Export */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setGuestFilterStatus('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                      guestFilterStatus === 'all'
                        ? 'bg-[#231E1B] text-white'
                        : 'glass-panel text-[#5C4F48]'
                    }`}
                  >
                    {t.common.all} ({guests.length})
                  </button>
                  <button
                    onClick={() => setGuestFilterStatus('attending')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                      guestFilterStatus === 'attending'
                        ? 'bg-emerald-700 text-white'
                        : 'glass-panel text-emerald-800'
                    }`}
                  >
                    {t.dashboard.attendingShort} ({rsvpStats.attendingCount})
                  </button>
                  <button
                    onClick={() => setGuestFilterStatus('declined')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                      guestFilterStatus === 'declined'
                        ? 'bg-rose-700 text-white'
                        : 'glass-panel text-rose-800'
                    }`}
                  >
                    {t.dashboard.declinedShort} ({rsvpStats.declinedCount})
                  </button>
                </div>

                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/90 hover:bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs transition-colors"
                  title={t.dashboard.exportCsvBtn}
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t.dashboard.exportCsvBtn}</span>
                </button>
              </div>
            </div>

            {/* Guest Search bar */}
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-[#8A7C74] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={guestSearch}
                onChange={(e) => setGuestSearch(e.target.value)}
                placeholder={t.dashboard.guestSearchPlaceholder}
                className="w-full pl-10 pr-4 py-2 rounded-2xl glass-panel text-xs text-[#231E1B] outline-none border border-black/5"
              />
            </div>

            {/* Guests Table */}
            <div className="glass-panel-elevated rounded-3xl overflow-hidden border border-white/95 shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-black/10 text-[#7A6A63] bg-black/5">
                      <th className="py-3 px-4 font-bold text-[#231E1B]">{t.dashboard.colGuestName}</th>
                      <th className="py-3 px-4 font-bold">{t.dashboard.colPhone}</th>
                      <th className="py-3 px-4 font-bold">{t.dashboard.colAttending}</th>
                      <th className="py-3 px-4 font-bold">{t.dashboard.colPeopleCount}</th>
                      <th className="py-3 px-4 font-bold">{t.dashboard.colMeal}</th>
                      <th className="py-3 px-4 font-bold">{t.dashboard.colWishNote}</th>
                      <th className="py-3 px-4 font-bold text-right">{t.dashboard.colActionSingle}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {filteredGuests.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-[#7A6A63]">
                          <Users className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#D9658B]" />
                          <p className="font-semibold text-sm text-[#231E1B]">{t.dashboard.guestsEmptyTitle}</p>
                          <p className="text-xs mt-1 text-[#8A7C74]">
                            {t.dashboard.guestsEmptyDesc}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredGuests.map((g) => (
                        <tr key={g.id} className="hover:bg-white/40">
                          <td className="py-3 px-4 font-bold text-[#231E1B]">
                            {g.fullName}
                          </td>
                          <td className="py-3 px-4 text-[#5C4F48]">{g.phone || '—'}</td>
                          <td className="py-3 px-4">
                            {g.attending ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{t.dashboard.attendingShort}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-full">
                                <XCircle className="w-3 h-3" />
                                <span>{t.dashboard.declinedShort}</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-[#231E1B]">
                            {g.attending ? formatPersonCount(g.guestCount, language) : '0'}
                          </td>
                          <td className="py-3 px-4 text-[#5C4F48]">
                            {g.mealPreference || '—'}
                          </td>
                          <td className="py-3 px-4 text-[#5C4F48] max-w-xs truncate italic">
                            {g.message ? `"${g.message}"` : '—'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setGuestToDelete(g)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                              title={t.dashboard.deleteActionTitle}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="font-playfair text-2xl font-bold text-[#231E1B]">
                {t.dashboard.ordersHistoryTitle}
              </h2>
              <p className="text-xs text-[#7A6A63]">
                {t.dashboard.ordersHistorySubtitle}
              </p>
            </div>

            <div className="glass-panel-elevated rounded-3xl overflow-hidden border border-white/95 shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-black/10 text-[#7A6A63] bg-black/5">
                      <th className="py-3 px-4 font-bold text-[#231E1B]">{t.dashboard.colOrderNum}</th>
                      <th className="py-3 px-4 font-bold">{t.dashboard.colService}</th>
                      <th className="py-3 px-4 font-bold">{t.dashboard.colPlan}</th>
                      <th className="py-3 px-4 font-bold">{t.dashboard.colOrderDate}</th>
                      <th className="py-3 px-4 font-bold">{t.dashboard.colAmount}</th>
                      <th className="py-3 px-4 font-bold">{t.dashboard.colStatus}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-[#7A6A63]">
                          <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#D9658B]" />
                          <p className="font-semibold text-sm text-[#231E1B]">{t.dashboard.emptyOrders}</p>
                          <p className="text-xs mt-1 text-[#8A7C74]">
                            {t.dashboard.emptyOrdersDesc}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      orders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-white/40">
                          <td className="py-3 px-4 font-mono font-bold text-[#231E1B]">
                            {ord.orderNumber}
                          </td>
                          <td className="py-3 px-4 font-semibold text-[#231E1B]">
                            {ord.serviceName}
                          </td>
                          <td className="py-3 px-4 text-[#5C4F48]">{ord.planName}</td>
                          <td className="py-3 px-4 text-[#7A6A63]">{ord.date}</td>
                          <td className="py-3 px-4 font-bold text-[#231E1B]">
                            {formatPriceUZS(ord.price, language)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                ord.status === 'confirmed' || ord.status === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : ord.status === 'rejected'
                                  ? 'bg-rose-100 text-rose-800'
                                  : ord.status === 'demo'
                                  ? 'bg-sky-100 text-sky-800'
                                  : 'bg-amber-100 text-amber-800'
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
            </div>
          </div>
        )}

        {/* TAB 5: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="max-w-xl mx-auto glass-panel-elevated rounded-3xl p-6 sm:p-8 border border-white/95 shadow-md space-y-6 animate-fadeIn">
            <div>
              <h2 className="font-playfair text-2xl font-bold text-[#231E1B]">
                {t.dashboard.settingsTitle}
              </h2>
              <p className="text-xs text-[#7A6A63]">
                {t.dashboard.settingsSubtitle}
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#3A2D28] block mb-1">{t.dashboard.nameLabel}</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full p-2.5 rounded-xl glass-panel border border-black/10 outline-none text-[#231E1B]"
                />
              </div>

              <div>
                <label className="font-bold text-[#3A2D28] block mb-1">{t.dashboard.phoneLabel}</label>
                <PhoneInput
                  value={profilePhone}
                  onChange={(fullVal) => setProfilePhone(fullVal)}
                  language={language}
                />
              </div>

              <div>
                <label className="font-bold text-[#3A2D28] block mb-1">{t.dashboard.emailLabel}</label>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl glass-panel border border-black/10 outline-none text-[#231E1B]"
                />
              </div>

              <div>
                <label className="font-bold text-[#3A2D28] block mb-1">{t.dashboard.settingsUiLangLabel}</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="w-full p-2.5 rounded-xl glass-panel border border-black/10 outline-none text-[#231E1B]"
                >
                  <option value="uz">O‘zbekcha (Lotin)</option>
                  <option value="ru">Русский</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-[#231E1B] text-white font-bold text-xs hover:bg-black transition-colors"
                >
                  {t.dashboard.saveChangesBtn}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Delete Invitation Confirmation Modal */}
        {invitationToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-sm glass-panel-elevated rounded-3xl p-6 shadow-2xl border border-white/95 space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 mx-auto flex items-center justify-center text-rose-600">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-playfair text-lg font-bold text-[#231E1B]">
                {t.dashboard.deleteModalTitle}
              </h3>
              <p className="text-xs text-[#7A6A63]">
                {t.dashboard.deleteModalDescPrefix}{invitationToDelete.hostNames}{t.dashboard.deleteModalDescSuffix}
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => setInvitationToDelete(null)}
                  className="py-2.5 px-3 rounded-xl glass-panel text-xs font-semibold text-[#5C4F48] hover:bg-white"
                >
                  {t.common.cancel}
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="py-2.5 px-3 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
                >
                  {t.dashboard.confirmDeleteBtn}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Guest Confirmation Modal */}
        {guestToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-sm glass-panel-elevated rounded-3xl p-6 shadow-2xl border border-white/95 space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 mx-auto flex items-center justify-center text-rose-600">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-playfair text-lg font-bold text-[#231E1B]">
                {guestToDelete.fullName}
              </h3>
              <p className="text-xs text-[#7A6A63]">
                {t.dashboard.confirmDeleteGuest}
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => setGuestToDelete(null)}
                  className="py-2.5 px-3 rounded-xl glass-panel text-xs font-semibold text-[#5C4F48] hover:bg-white"
                >
                  {t.common.cancel}
                </button>
                <button
                  onClick={handleDeleteGuestConfirm}
                  className="py-2.5 px-3 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
                >
                  {t.dashboard.confirmDeleteBtn}
                </button>
              </div>
            </div>
          </div>
        )}

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
