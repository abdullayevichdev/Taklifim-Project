import React, { useState, useEffect } from 'react';
import { Link, useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage, formatPersonCount, formatItemCount, translateCategory } from '../locales';
import { api } from '../services/api';
import { InvitationData, GuestRSVP } from '../types';
import { ShareModal } from '../components/ShareModal';
import {
  GlassSurface,
  GlassButton,
  GlassSegmented,
  GlassInput,
  GlassStatSkeletonGrid,
  GlassCardSkeletonGrid,
  GlassTableSkeleton,
} from '../components/glass';
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
  const { navigate } = useRouter();
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
    <div className="pt-28 pb-28 lg:pb-20 min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-surface-subtle text-emerald-800 text-xs font-bold mb-2.5">
            <Radio className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            <span>{t.myInvitations.liveSyncFull}</span>
          </div>
          <h1 className="font-playfair text-3xl sm:text-4xl font-extrabold text-[#1E1418]">
            {t.myInvitations.title}
          </h1>
          <p className="text-xs sm:text-sm text-[#4A383F] mt-1">
            {t.myInvitations.subtitle}
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
          leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}
        >
          {t.myInvitations.createNewCta}
        </GlassButton>
      </div>

      {/* 2. Live Stat Cards */}
      {loading ? (
        <GlassStatSkeletonGrid count={4} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <GlassSurface variant="elevated" rounded="3xl" className="p-5">
            <div className="text-[11px] font-bold text-[#4A383F] uppercase tracking-wider">{t.myInvitations.statInvitations}</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#1E1418] mt-1 tabular-nums">
              {formatItemCount(invitations.length, language)}
            </div>
          </GlassSurface>

          <GlassSurface variant="elevated" rounded="3xl" className="p-5">
            <div className="text-[11px] font-bold text-[#4A383F] uppercase tracking-wider">{t.myInvitations.statResponses}</div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#1E1418] mt-1 tabular-nums">
              {formatPersonCount(guests.length, language)}
            </div>
          </GlassSurface>

          <GlassSurface variant="tinted-sky" rounded="3xl" className="p-5">
            <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
              <span>{t.myInvitations.statGuestsCount}</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-900 mt-1 tabular-nums">
              {formatPersonCount(totalAttendingPersons, language)}
            </div>
            <div className="text-[11px] text-emerald-800 font-medium mt-0.5 tabular-nums">
              ({attendingGuests.length} {t.myInvitations.attendingResponsesSuffix})
            </div>
          </GlassSurface>

          <GlassSurface variant="tinted-pink" rounded="3xl" className="p-5">
            <div className="text-[11px] font-bold text-[#9E3E60] uppercase tracking-wider flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5 text-[#9E3E60]" aria-hidden="true" />
              <span>{t.myInvitations.declinedBadge}</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#7B2846] mt-1 tabular-nums">
              {formatPersonCount(declinedGuests.length, language)}
            </div>
            <div className="text-[11px] text-[#7B2846] font-medium mt-0.5">{t.myInvitations.declinedSub}</div>
          </GlassSurface>
        </div>
      )}

      {/* 3. Created Invitations List */}
      <section className="space-y-4">
        <h2 className="font-playfair text-xl font-bold text-[#1E1418] flex items-center gap-2">
          <span>{t.myInvitations.activeListTitle}</span>
          <span className="text-xs font-normal text-[#4A383F] tabular-nums">({invitations.length})</span>
        </h2>

        {loading ? (
          <GlassCardSkeletonGrid count={3} />
        ) : invitations.length === 0 ? (
          <GlassSurface variant="elevated" rounded="3xl" className="p-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-full glass-surface-tinted-pink text-[#9E3E60] mx-auto flex items-center justify-center">
              <Sparkles className="w-8 h-8" aria-hidden="true" />
            </div>
            <h3 className="font-playfair text-lg font-bold text-[#1E1418]">{t.myInvitations.emptyTitle}</h3>
            <p className="text-xs text-[#4A383F] max-w-sm mx-auto leading-relaxed">
              {t.myInvitations.emptyDesc}
            </p>
            <div className="pt-1">
              <GlassButton
                tone="tinted"
                size="md"
                href="/templates"
                onAnchorClick={(e) => {
                  e.preventDefault();
                  navigate('/templates');
                }}
              >
                {t.myInvitations.emptyBtn}
              </GlassButton>
            </div>
          </GlassSurface>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {invitations.map((inv) => {
              const invGuests = guests.filter((g) => g.invitationSlug === inv.slug);
              const invAttending = invGuests.filter((g) => g.attending).length;
              const coverSrc = inv.coverImage || inv.galleryImages?.[0];
              const isSelected = selectedInvitationId === inv.id;

              return (
                <div
                  key={inv.id}
                  className={`glass-card-lite glass-card-hover rounded-3xl overflow-hidden flex flex-col justify-between ${
                    isSelected ? 'ring-2 ring-[#C64873]/50' : ''
                  }`}
                >
                  <div>
                    {/* Cover Preview Image or Elegant Placeholder */}
                    <div className="relative h-44 overflow-hidden bg-gradient-to-br from-[#F5C9D8]/55 via-[#FCE1D2]/60 to-[#B9DFFA]/55">
                      {coverSrc ? (
                        <img
                          src={coverSrc}
                          alt={inv.hostNames}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Sparkles className="w-10 h-10 text-[#9E3E60]/60" aria-hidden="true" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                      <div className="absolute top-3 left-3 bg-white/92 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-extrabold text-[#1E1418] shadow-xs border border-white">
                        {translateCategory(inv.eventType, language)}
                      </div>

                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <h3 className="font-playfair text-xl font-bold tracking-tight truncate">
                          {inv.hostNames}
                        </h3>
                        <div className="flex items-center gap-3 text-[11px] text-white/90 mt-0.5">
                          <span className="flex items-center gap-1 tabular-nums">
                            <Calendar className="w-3 h-3 text-[#B9DFFA]" aria-hidden="true" />
                            {inv.eventDate}
                          </span>
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-[#F5C9D8]" aria-hidden="true" />
                            {inv.venueName}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats inside Card */}
                    <div className="p-4 grid grid-cols-2 gap-2.5 border-b border-black/5 text-xs">
                      <div className="p-2.5 rounded-2xl glass-surface-subtle text-center">
                        <div className="text-[10px] font-bold text-[#4A383F] uppercase">{t.myInvitations.tableTotalRsvp}</div>
                        <div className="text-base font-extrabold text-[#1E1418] tabular-nums">{formatPersonCount(invGuests.length, language)}</div>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-emerald-50/85 border border-emerald-200/70 text-center text-emerald-900">
                        <div className="text-[10px] font-bold text-emerald-800 uppercase">{t.myInvitations.tableIncoming}</div>
                        <div className="text-base font-extrabold tabular-nums">{formatPersonCount(invAttending, language)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="p-4 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(inv.slug)}
                        className="flex-1 min-h-[40px] py-2 px-3 rounded-xl glass-surface-subtle hover:bg-white text-xs font-bold text-[#1E1418] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {copiedSlug === inv.slug ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                            <span className="text-emerald-700">{t.myInvitations.copiedShortBtn}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-[#9E3E60]" aria-hidden="true" />
                            <span>{t.myInvitations.copyLinkBtn}</span>
                          </>
                        )}
                      </button>

                      <Link
                        to={`/i/${inv.slug}`}
                        className="min-h-[40px] min-w-[40px] rounded-xl glass-surface-subtle hover:bg-white text-[#1E1418] flex items-center justify-center transition-colors"
                        title={t.myInvitations.viewCardTitle}
                        aria-label={t.myInvitations.viewCardTitle}
                      >
                        <Eye className="w-4 h-4 text-[#2B6CB0]" aria-hidden="true" />
                      </Link>

                      <button
                        type="button"
                        onClick={() => setActiveShare({ url: `/i/${inv.slug}`, title: `${inv.hostNames} ${t.myInvitations.inviteShareSuffix}` })}
                        className="min-h-[40px] min-w-[40px] rounded-xl glass-surface-subtle hover:bg-white text-[#1E1418] flex items-center justify-center transition-colors cursor-pointer"
                        title={t.myInvitations.shareCardTitle}
                        aria-label={t.myInvitations.shareCardTitle}
                      >
                        <Share2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedInvitationId(isSelected ? 'all' : inv.id)}
                      className={`w-full min-h-[38px] py-2 px-3 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#1E1418] text-white shadow-xs'
                          : 'glass-surface-subtle text-[#4A383F] hover:text-[#1E1418] hover:bg-white'
                      }`}
                    >
                      {isSelected ? t.myInvitations.selectGuestsSelectedBtn : t.myInvitations.selectGuestsBtn}
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
              <h2 className="font-playfair text-2xl font-bold text-[#1E1418]">
                {t.myInvitations.rsvpTableTitle}
              </h2>
              {currentSelectedInv && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-surface-tinted-pink text-xs font-bold text-[#1E1418]">
                  <span>{t.myInvitations.onlyForPrefix} «{currentSelectedInv.hostNames}»</span>
                  <button
                    type="button"
                    onClick={() => setSelectedInvitationId('all')}
                    className="ml-1 w-5 h-5 rounded-full bg-white/80 hover:bg-white text-[#1E1418] flex items-center justify-center text-[10px] cursor-pointer"
                    title={t.myInvitations.clearFilterTitle}
                    aria-label={t.myInvitations.clearFilterTitle}
                  >
                    ✕
                  </button>
                </span>
              )}
            </div>
            <p className="text-xs text-[#4A383F] mt-0.5">
              {currentSelectedInv
                ? `«${currentSelectedInv.hostNames}» ${t.myInvitations.rsvpTableSubSingleSuffix}`
                : t.myInvitations.rsvpTableSubAll}
            </p>
          </div>

          <GlassButton
            type="button"
            tone="light"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-700" aria-hidden="true" />}
          >
            {t.myInvitations.exportExcelBtn}
          </GlassButton>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div className="overflow-x-auto no-scrollbar pb-0.5">
            <GlassSegmented
              ariaLabel={t.myInvitations.rsvpTableTitle}
              value={guestStatusFilter}
              onChange={(val) => setGuestStatusFilter(val)}
              options={[
                { value: 'all', label: `${t.myInvitations.filterAll} (${scopeGuests.length})` },
                { value: 'attending', label: `${t.myInvitations.filterAttendingTick} (${scopeAttendingGuests.length})` },
                { value: 'declined', label: `${t.myInvitations.filterDeclinedTick} (${scopeDeclinedGuests.length})` },
              ]}
            />
          </div>

          <GlassInput
            type="text"
            value={searchGuest}
            onChange={(e) => setSearchGuest(e.target.value)}
            placeholder={t.myInvitations.searchGuestPlaceholder}
            aria-label={t.myInvitations.searchGuestPlaceholder}
            leftIcon={<Search className="w-4 h-4" aria-hidden="true" />}
            containerClassName="lg:max-w-xs w-full"
          />
        </div>

        {/* Real-Time Table */}
        {loading ? (
          <GlassTableSkeleton rows={5} />
        ) : (
          <GlassSurface variant="elevated" rounded="3xl" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-black/8 text-[#4A383F] bg-white/45 uppercase tracking-wider text-[10px]">
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
                      <td colSpan={8} className="py-12 text-center text-xs text-[#4A383F]">
                        {t.myInvitations.tableNoGuests}
                      </td>
                    </tr>
                  ) : (
                    filteredGuests.map((g, idx) => (
                      <tr key={g.id} className="hover:bg-white/55 transition-colors">
                        <td className="py-3.5 px-4 font-mono tabular-nums font-bold text-[#4A383F]">
                          {idx + 1}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-[#1E1418]">{g.fullName}</div>
                          {g.invitationSlug && (
                            <div className="text-[10px] text-[#4A383F] font-mono">/i/{g.invitationSlug}</div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono tabular-nums font-semibold text-[#4A383F]">
                          {g.phone || '—'}
                        </td>

                        <td className="py-3.5 px-4">
                          {g.attending ? (
                            <span className="font-bold text-[#1E1418] glass-surface-subtle px-2.5 py-0.5 rounded-full font-mono tabular-nums">
                              {formatPersonCount(g.guestCount || 1, language)}
                            </span>
                          ) : (
                            <span className="text-[#4A383F] font-mono tabular-nums">0</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-[#4A383F]">
                          {g.mealPreference ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/70 font-medium">
                              {g.mealPreference}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-[#4A383F] max-w-xs truncate italic">
                          {g.message ? `«${g.message}»` : '—'}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {g.attending ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
                              <span>{t.myInvitations.csvAttendingYes}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-800 font-bold text-xs border border-rose-200">
                              <XCircle className="w-3.5 h-3.5 text-rose-700 shrink-0" aria-hidden="true" />
                              <span>{t.myInvitations.csvAttendingNo}</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right text-[11px] font-mono tabular-nums text-[#4A383F]">
                          {g.submittedAt || t.myInvitations.justSubmitted}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassSurface>
        )}
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
