import React, { useState, useEffect } from 'react';
import { Link } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage, formatPersonCount, formatItemCount, translateCategory } from '../locales';
import { api } from '../services/api';
import { InvitationData, GuestRSVP } from '../types';
import { ShareModal } from '../components/ShareModal';
import {
  Sparkles,
  Plus,
  Eye,
  Copy,
  Check,
  Share2,
  Calendar,
  MapPin,
  CheckCircle2,
  XCircle,
  Search,
  FileSpreadsheet,
  Radio,
} from 'lucide-react';

export const MyInvitationsPage: React.FC = () => {
  const { user, showToast } = useAuth();
  const { language, t } = useLanguage();

  const [invitations, setInvitations] = useState<InvitationData[]>([]);
  const [guests, setGuests] = useState<GuestRSVP[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedInvitationId, setSelectedInvitationId] = useState<string>('all');
  const [searchGuest, setSearchGuest] = useState('');
  const [guestStatusFilter, setGuestStatusFilter] = useState<'all' | 'attending' | 'declined'>('all');

  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [activeShare, setActiveShare] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    async function init() {
      setLoading(true);
      if (!user) { setLoading(false); return; }
      const [invList, guestList] = await Promise.all([
        api.getInvitations(user.id),
        api.getGuests(undefined, user.id),
      ]);
      setInvitations(invList);
      setGuests(guestList);
      setLoading(false);
    }
    init();

    const unsubGuests = api.subscribe<GuestRSVP[]>('guests', (updatedGuests) => {
      if (user) {
        setGuests(updatedGuests.filter((g) => g.invitationOwnerId === user.id));
      }
      showToast(t.myInvitations.newGuestToast, 'info');
    });

    const unsubInvitations = api.subscribe<InvitationData[]>('invitations', (updatedInv) => {
      if (user) {
        setInvitations(updatedInv.filter((inv) => inv.ownerId === user.id));
      }
    });

    return () => {
      unsubGuests();
      unsubInvitations();
    };
  }, [user?.id]);

  const currentSelectedInv = selectedInvitationId !== 'all'
    ? invitations.find((i) => i.id === selectedInvitationId)
    : null;

  const scopeGuests = currentSelectedInv
    ? guests.filter((g) => g.invitationId === currentSelectedInv.id || g.invitationSlug === currentSelectedInv.slug)
    : guests;

  const scopeAttendingGuests = scopeGuests.filter((g) => g.attending);
  const scopeDeclinedGuests = scopeGuests.filter((g) => !g.attending);

  const filteredGuests = scopeGuests.filter((g) => {
    if (guestStatusFilter === 'attending' && !g.attending) return false;
    if (guestStatusFilter === 'declined' && g.attending) return false;

    if (searchGuest.trim()) {
      const q = searchGuest.toLowerCase();
      const matchName = g.fullName.toLowerCase().includes(q);
      const matchPhone = (g.phone || '').includes(q);
      const matchMsg = (g.message || '').toLowerCase().includes(q);
      return matchName || matchPhone || matchMsg;
    }

    return true;
  });

  const attendingGuests = guests.filter((g) => g.attending);
  const declinedGuests = guests.filter((g) => !g.attending);
  const totalAttendingPersons = attendingGuests.reduce((sum, g) => sum + (g.guestCount || 1), 0);

  const handleCopyLink = (slug: string) => {
    const fullUrl = `${window.location.origin}/i/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedSlug(slug);
    showToast(t.myInvitations.toastLinkShareCopied, 'success');
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  const handleExportCSV = () => {
    if (filteredGuests.length === 0) {
      showToast(t.myInvitations.toastNoGuestsCsv, 'error');
      return;
    }

    const headers = t.myInvitations.csvHeaders;
    const rows = filteredGuests.map((g) => [
      `"${g.fullName}"`,
      `"${g.phone || ''}"`,
      `"${g.attending ? t.myInvitations.csvAttendingYes : t.myInvitations.csvAttendingNo}"`,
      g.attending ? g.guestCount || 1 : 0,
      `"${g.mealPreference || ''}"`,
      `"${(g.message || '').replace(/"/g, '""')}"`,
      `"${g.submittedAt || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Mehmonlar_RSVP_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(t.myInvitations.toastExcelSuccess, 'success');
  };

  return (
    <div className="pt-28 pb-20 min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-2">
            <Radio className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t.myInvitations.liveSyncFull}</span>
          </div>
          <h1 className="font-playfair text-3xl sm:text-4xl font-extrabold text-[#1E1418]">
            {t.myInvitations.title}
          </h1>
          <p className="text-xs sm:text-sm text-[#5C4F48] mt-1">
            {t.myInvitations.subtitle}
          </p>
        </div>

        <Link
          to="/templates"
          className="flex items-center gap-2 px-6 py-3.5 rounded-2xl text-xs font-extrabold text-white bg-gradient-to-r from-[#E27B9B] via-[#D9658B] to-[#B9DFFA] shadow-[0_8px_25px_rgba(226,123,155,0.35)] hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{t.myInvitations.createNewCta}</span>
        </Link>
      </div>

      {/* 2. Live Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-panel-elevated rounded-3xl p-5 border border-white/95 shadow-xs">
          <div className="text-[11px] font-bold text-[#7A6A63] uppercase tracking-wider">{t.myInvitations.statInvitations}</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#1E1418] mt-1">
            {formatItemCount(invitations.length, language)}
          </div>
        </div>

        <div className="glass-panel-elevated rounded-3xl p-5 border border-white/95 shadow-xs">
          <div className="text-[11px] font-bold text-[#7A6A63] uppercase tracking-wider">{t.myInvitations.statResponses}</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#1E1418] mt-1">
            {formatPersonCount(guests.length, language)}
          </div>
        </div>

        <div className="rounded-3xl p-5 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t.myInvitations.statGuestsCount}</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-800 mt-1">
            {formatPersonCount(totalAttendingPersons, language)}
          </div>
          <div className="text-[10px] text-emerald-600 mt-0.5">({attendingGuests.length} {t.myInvitations.attendingResponsesSuffix})</div>
        </div>

        <div className="rounded-3xl p-5 bg-gradient-to-br from-rose-500/10 to-rose-500/5 border border-rose-500/20 shadow-xs">
          <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>{t.myInvitations.declinedBadge}</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-800 mt-1">
            {formatPersonCount(declinedGuests.length, language)}
          </div>
          <div className="text-[10px] text-rose-600 mt-0.5">{t.myInvitations.declinedSub}</div>
        </div>
      </div>

      {/* 3. Created Invitations List */}
      <section className="space-y-4">
        <h2 className="font-playfair text-xl font-bold text-[#1E1418] flex items-center gap-2">
          <span>{t.myInvitations.activeListTitle}</span>
          <span className="text-xs font-normal text-[#7A6A63]">({invitations.length})</span>
        </h2>

        {!loading && invitations.length === 0 ? (
          <div className="glass-panel-elevated rounded-3xl p-10 text-center space-y-4 border border-white/95">
            <div className="w-16 h-16 rounded-full bg-[#FFF5F8] text-[#E27B9B] mx-auto flex items-center justify-center">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="font-playfair text-lg font-bold text-[#1E1418]">{t.myInvitations.emptyTitle}</h3>
            <p className="text-xs text-[#5C4F48] max-w-sm mx-auto">
              {t.myInvitations.emptyDesc}
            </p>
            <Link
              to="/templates"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold text-white bg-[#1E1418] hover:bg-black"
            >
              {t.myInvitations.emptyBtn}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {invitations.map((inv) => {
              const invGuests = guests.filter((g) => g.invitationSlug === inv.slug);
              const invAttending = invGuests.filter((g) => g.attending).length;
              const coverSrc = inv.coverImage || inv.galleryImages?.[0];

              return (
                <div
                  key={inv.id}
                  className="glass-panel-elevated rounded-3xl overflow-hidden border border-white/95 shadow-md flex flex-col justify-between group hover:shadow-xl transition-all duration-300"
                >
                  <div>
                    {/* Cover Preview Image or Elegant Placeholder */}
                    <div className="relative h-44 overflow-hidden bg-gradient-to-br from-[#F5C9D8]/50 via-[#F5EBDD] to-[#B9DFFA]/50">
                      {coverSrc ? (
                        <img
                          src={coverSrc}
                          alt={inv.hostNames}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Sparkles className="w-10 h-10 text-[#D9658B]/60" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-extrabold text-[#1E1418] shadow-xs">
                        {translateCategory(inv.eventType, language)}
                      </div>

                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <h3 className="font-playfair text-xl font-bold tracking-tight truncate">
                          {inv.hostNames}
                        </h3>
                        <div className="flex items-center gap-3 text-[11px] text-white/80 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#B9DFFA]" />
                            {inv.eventDate}
                          </span>
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-[#F5C9D8]" />
                            {inv.venueName}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats inside Card */}
                    <div className="p-4 grid grid-cols-2 gap-2 border-b border-black/5 text-xs">
                      <div className="p-2.5 rounded-xl bg-black/5 text-center">
                        <div className="text-[10px] font-bold text-[#7A6A63] uppercase">{t.myInvitations.tableTotalRsvp}</div>
                        <div className="text-base font-extrabold text-[#1E1418]">{formatPersonCount(invGuests.length, language)}</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-50 text-center text-emerald-800">
                        <div className="text-[10px] font-bold text-emerald-700 uppercase">{t.myInvitations.tableIncoming}</div>
                        <div className="text-base font-extrabold">{formatPersonCount(invAttending, language)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="p-4 space-y-2.5 bg-white/40">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(inv.slug)}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-white border border-black/10 hover:border-[#E27B9B] text-xs font-bold text-[#1E1418] flex items-center justify-center gap-1.5 shadow-xs transition-all"
                      >
                        {copiedSlug === inv.slug ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600">{t.myInvitations.copiedShortBtn}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-[#E27B9B]" />
                            <span>{t.myInvitations.copyLinkBtn}</span>
                          </>
                        )}
                      </button>

                      <Link
                        to={`/i/${inv.slug}`}
                        className="p-2.5 rounded-xl bg-white border border-black/10 hover:border-[#4A9BD4] text-[#1E1418] shadow-xs"
                        title={t.myInvitations.viewCardTitle}
                      >
                        <Eye className="w-4 h-4 text-[#4A9BD4]" />
                      </Link>

                      <button
                        type="button"
                        onClick={() => setActiveShare({ url: `/i/${inv.slug}`, title: `${inv.hostNames} ${t.myInvitations.inviteShareSuffix}` })}
                        className="p-2.5 rounded-xl bg-white border border-black/10 hover:border-emerald-500 text-[#1E1418] shadow-xs"
                        title={t.myInvitations.shareCardTitle}
                      >
                        <Share2 className="w-4 h-4 text-emerald-600" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedInvitationId(selectedInvitationId === inv.id ? 'all' : inv.id)}
                      className={`w-full py-2 rounded-xl text-[11px] font-bold transition-all ${
                        selectedInvitationId === inv.id
                          ? 'bg-[#1E1418] text-white shadow-xs'
                          : 'bg-black/5 text-[#5C4F48] hover:bg-black/10'
                      }`}
                    >
                      {selectedInvitationId === inv.id ? t.myInvitations.selectGuestsSelectedBtn : t.myInvitations.selectGuestsBtn}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. GUEST RSVP RESPONSES TABLE */}
      <section className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-playfair text-2xl font-bold text-[#1E1418] flex items-center gap-2">
                <span>{t.myInvitations.rsvpTableTitle}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </h2>
              {currentSelectedInv && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/10 text-xs font-bold text-[#1E1418]">
                  <span>{t.myInvitations.onlyForPrefix} «{currentSelectedInv.hostNames}»</span>
                  <button
                    onClick={() => setSelectedInvitationId('all')}
                    className="ml-1 w-4 h-4 rounded-full bg-black/20 hover:bg-black/40 text-black flex items-center justify-center text-[10px]"
                    title={t.myInvitations.clearFilterTitle}
                  >
                    ✕
                  </button>
                </span>
              )}
            </div>
            <p className="text-xs text-[#5C4F48]">
              {currentSelectedInv
                ? `«${currentSelectedInv.hostNames}» ${t.myInvitations.rsvpTableSubSingleSuffix}`
                : t.myInvitations.rsvpTableSubAll}
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-xs transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>{t.myInvitations.exportExcelBtn}</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setGuestStatusFilter('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                guestStatusFilter === 'all'
                  ? 'bg-[#1E1418] text-white shadow-xs'
                  : 'glass-panel text-[#5C4F48] hover:bg-white'
              }`}
            >
              {t.myInvitations.filterAll} ({scopeGuests.length})
            </button>
            <button
              onClick={() => setGuestStatusFilter('attending')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                guestStatusFilter === 'attending'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'glass-panel text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              {t.myInvitations.filterAttendingTick} ({scopeAttendingGuests.length})
            </button>
            <button
              onClick={() => setGuestStatusFilter('declined')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                guestStatusFilter === 'declined'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'glass-panel text-rose-800 hover:bg-rose-50'
              }`}
            >
              {t.myInvitations.filterDeclinedTick} ({scopeDeclinedGuests.length})
            </button>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-[#7A6A63] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchGuest}
              onChange={(e) => setSearchGuest(e.target.value)}
              placeholder={t.myInvitations.searchGuestPlaceholder}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-black/10 text-xs outline-none focus:border-[#E27B9B]"
            />
          </div>
        </div>

        {/* Real-Time Table */}
        <div className="glass-panel-elevated rounded-3xl overflow-hidden border border-white/95 shadow-md bg-white/70">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-black/10 text-[#7A6A63] bg-black/5 uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4 font-bold text-[#1E1418]">{t.myInvitations.colOrderIdx}</th>
                  <th className="py-3.5 px-4 font-bold text-[#1E1418]">{t.myInvitations.colGuestName}</th>
                  <th className="py-3.5 px-4 font-bold">{t.myInvitations.colPhoneHeader}</th>
                  <th className="py-3.5 px-4 font-bold">{t.myInvitations.colPartySize}</th>
                  <th className="py-3.5 px-4 font-bold">{t.myInvitations.colMeal}</th>
                  <th className="py-3.5 px-4 font-bold">{t.dashboard.colWishNote}</th>
                  <th className="py-3.5 px-4 font-bold text-center">{t.myInvitations.colFinalReply}</th>
                  <th className="py-3.5 px-4 font-bold text-right">{t.myInvitations.colSubmittedAt}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filteredGuests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-xs text-[#7A6A63]">
                      {t.myInvitations.tableNoGuests}
                    </td>
                  </tr>
                ) : (
                  filteredGuests.map((g, idx) => (
                    <tr key={g.id} className="hover:bg-white/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#7A6A63]">
                        {idx + 1}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-[#1E1418]">{g.fullName}</div>
                        {g.invitationSlug && (
                          <div className="text-[10px] text-[#7A6A63] font-mono">/i/{g.invitationSlug}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-[#5C4F48]">
                        {g.phone || '—'}
                      </td>

                      <td className="py-3.5 px-4">
                        {g.attending ? (
                          <span className="font-bold text-[#1E1418] bg-black/5 px-2 py-0.5 rounded-full font-mono">
                            {formatPersonCount(g.guestCount || 1, language)}
                          </span>
                        ) : (
                          <span className="text-[#7A6A63] font-mono">0</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-[#5C4F48]">
                        {g.mealPreference ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-medium">
                            {g.mealPreference}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-[#5C4F48] max-w-xs truncate italic">
                        {g.message ? `«${g.message}»` : '—'}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {g.attending ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs shadow-xs border border-emerald-200">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>{t.myInvitations.csvAttendingYes}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-100 text-rose-800 font-extrabold text-xs shadow-xs border border-rose-200">
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>{t.myInvitations.csvAttendingNo}</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right text-[11px] font-mono text-[#7A6A63]">
                        {g.submittedAt || t.myInvitations.justSubmitted}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Share & QR Modal */}
      {activeShare && (
        <ShareModal
          url={activeShare.url}
          title={activeShare.title}
          language={language}
          onClose={() => setActiveShare(null)}
        />
      )}
    </div>
  );
};
