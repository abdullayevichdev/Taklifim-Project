import React, { useState } from 'react';
import { X, Copy, Check, Share2, Send, QrCode } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage, translations } from '../locales';
import { Language } from '../types';

interface ShareModalProps {
  url: string;
  title: string;
  onClose: () => void;
  language?: Language;
}

export const ShareModal: React.FC<ShareModalProps> = ({ url, title, onClose, language }) => {
  const { showToast } = useAuth();
  const { language: ctxLanguage } = useLanguage();
  const activeLang = language || ctxLanguage;
  const t = translations[activeLang] || translations.uz;
  const [copied, setCopied] = useState(false);

  const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      showToast(t.shared.shareLinkCopiedToast, 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast(t.shared.copyErrorToast, 'error');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: `${t.shared.shareInviteTextPrefix} ${title}`,
          url: fullUrl,
        });
      } catch {
        // user dismissed
      }
    } else {
      handleCopy();
    }
  };

  // Generate SVG QR Code representation
  const qrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    fullUrl
  )}&color=23-30-27&bgcolor=255-255-255`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md glass-panel-elevated rounded-3xl p-6 shadow-2xl border border-white/95 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl hover:bg-black/5 text-[#7A6A63] transition-colors"
          aria-label={t.common.close}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center pb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#F5C9D8] to-[#B9DFFA] mx-auto flex items-center justify-center mb-3">
            <Share2 className="w-5 h-5 text-[#231E1B]" />
          </div>
          <h3 className="font-playfair text-xl font-bold text-[#231E1B]">
            {t.shared.shareTitle}
          </h3>
          <p className="text-xs text-[#7A6A63] mt-1">{title}</p>
        </div>

        {/* QR Code preview */}
        <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-black/5 shadow-xs mb-4">
          <img
            src={qrSvgUrl}
            alt={t.shared.qrAlt}
            className="w-44 h-44 object-contain rounded-xl"
            loading="lazy"
          />
          <span className="text-[11px] font-medium text-[#7A6A63] mt-2 flex items-center gap-1.5">
            <QrCode className="w-3.5 h-3.5" />
            {t.shared.qrHint}
          </span>
        </div>

        {/* Copy Link input */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/80 border border-black/10 mb-4">
          <input
            type="text"
            readOnly
            value={fullUrl}
            className="w-full px-3 py-1.5 text-xs text-[#231E1B] bg-transparent outline-none truncate"
          />
          <button
            onClick={handleCopy}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-[#231E1B] text-white hover:bg-black'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>{t.shared.copiedBtn}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>{t.shared.copyBtn}</span>
              </>
            )}
          </button>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(
              fullUrl
            )}&text=${encodeURIComponent(`${t.shared.shareInviteTextPrefix} ${title}`)}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#2AABEE]/10 text-[#0088cc] hover:bg-[#2AABEE]/20 text-xs font-bold transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{t.shared.shareTelegramBtn}</span>
          </a>

          <button
            onClick={handleNativeShare}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#B9DFFA]/40 hover:bg-[#B9DFFA]/60 text-[#1E3A5F] text-xs font-bold transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{t.shared.shareOtherBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
