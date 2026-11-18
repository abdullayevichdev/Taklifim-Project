import React, { useState } from 'react';
import { Copy, Check, Share2, Send, QrCode } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage, translations } from '../locales';
import { Language } from '../types';
import { GlassModal, GlassSurface, GlassButton } from './glass';

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

  const qrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    fullUrl
  )}&color=30-20-24&bgcolor=255-255-255`;

  return (
    <GlassModal
      isOpen
      onClose={onClose}
      size="md"
      ariaLabel={t.shared.shareTitle}
      closeLabel={t.common.close}
    >
      <div className="text-center pb-4">
        <div className="w-12 h-12 rounded-2xl glass-surface-tinted-pink mx-auto flex items-center justify-center mb-3">
          <Share2 className="w-5 h-5 text-[#9E3E60]" aria-hidden="true" />
        </div>
        <h3 className="font-playfair text-xl font-bold text-[#1E1418]">
          {t.shared.shareTitle}
        </h3>
        <p className="text-xs text-[#4A383F] mt-1">{title}</p>
      </div>

      {/* QR Code preview */}
      <GlassSurface variant="subtle" rounded="2xl" className="flex flex-col items-center justify-center p-4 mb-4">
        <div className="p-2.5 rounded-xl bg-white shadow-xs border border-white">
          <img
            src={qrSvgUrl}
            alt={t.shared.qrAlt}
            referrerPolicy="no-referrer"
            className="w-40 h-40 object-contain rounded-lg"
            loading="lazy"
          />
        </div>
        <span className="text-[11px] font-medium text-[#4A383F] mt-2.5 flex items-center gap-1.5">
          <QrCode className="w-3.5 h-3.5 text-[#9E3E60]" aria-hidden="true" />
          {t.shared.qrHint}
        </span>
      </GlassSurface>

      {/* Copy Link input */}
      <GlassSurface variant="subtle" rounded="2xl" className="flex items-center gap-2 p-1.5 mb-4">
        <input
          type="text"
          readOnly
          value={fullUrl}
          aria-label={t.shared.shareTitle}
          className="w-full px-3 py-1.5 text-xs text-[#1E1418] bg-transparent outline-none truncate font-mono"
        />
        <GlassButton
          type="button"
          size="sm"
          tone={copied ? 'light' : 'tinted'}
          onClick={handleCopy}
          leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
          className="shrink-0"
        >
          {copied ? t.shared.copiedBtn : t.shared.copyBtn}
        </GlassButton>
      </GlassSurface>

      {/* Action buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <GlassButton
          tone="light"
          size="sm"
          href={`https://t.me/share/url?url=${encodeURIComponent(
            fullUrl
          )}&text=${encodeURIComponent(`${t.shared.shareInviteTextPrefix} ${title}`)}`}
          target="_blank"
          leftIcon={<Send className="w-3.5 h-3.5 text-[#0088cc]" />}
          className="w-full"
        >
          {t.shared.shareTelegramBtn}
        </GlassButton>

        <GlassButton
          type="button"
          tone="clear"
          size="sm"
          onClick={handleNativeShare}
          leftIcon={<Share2 className="w-3.5 h-3.5 text-[#9E3E60]" />}
          className="w-full"
        >
          {t.shared.shareOtherBtn}
        </GlassButton>
      </div>
    </GlassModal>
  );
};
