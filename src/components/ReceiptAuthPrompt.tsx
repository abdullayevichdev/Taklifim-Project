import React, { useEffect, useRef } from 'react';
import { Lock } from 'lucide-react';
import { useLanguage } from '../locales';
import { GlassSurface } from './glass';
import { TelegramLoginWidget } from './TelegramLoginWidget';

interface ReceiptAuthPromptProps {
  onBeforeEmailNavigate?: () => void;
  onSuccess?: () => void;
}

export const ReceiptAuthPrompt: React.FC<ReceiptAuthPromptProps> = ({
  onBeforeEmailNavigate,
  onSuccess,
}) => {
  const { t } = useLanguage();
  const savedBeforeAuthRef = useRef(false);

  useEffect(() => {
    if (!savedBeforeAuthRef.current) {
      savedBeforeAuthRef.current = true;
      onBeforeEmailNavigate?.();
    }
  }, [onBeforeEmailNavigate]);

  return (
    <GlassSurface
      variant="tinted-pink"
      rounded="2xl"
      className="p-4 sm:p-5 border border-[#C64873]/30 space-y-3.5"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-white/90 border border-[#C64873]/25 text-[#9E3E60] flex items-center justify-center shrink-0 shadow-xs">
          <Lock className="w-4 h-4" aria-hidden="true" />
        </div>
        <div className="space-y-1 min-w-0">
          <h4 className="text-xs sm:text-sm font-bold text-[#1E1418]">
            {t.auth.errors.receiptAuthRequiredTitle}
          </h4>
          <p className="text-[11px] sm:text-xs text-[#4A383F] leading-relaxed">
            {t.auth.errors.receiptAuthRequiredDesc}
          </p>
        </div>
      </div>

      <TelegramLoginWidget compact onSuccess={onSuccess} />
    </GlassSurface>
  );
};
