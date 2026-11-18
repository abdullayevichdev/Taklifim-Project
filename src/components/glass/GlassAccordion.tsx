import React, { useId, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

export interface GlassAccordionItemData {
  id: string;
  question: string;
  answer: string;
}

export interface GlassAccordionProps {
  items: GlassAccordionItemData[];
  openId: string;
  onToggle: (id: string) => void;
  className?: string;
}

/**
 * Accessible Liquid Glass accordion list.
 * Supports keyboard Enter/Space (native button) and ArrowUp / ArrowDown /
 * Home / End focus traversal across accordion headers, with proper
 * `aria-expanded`, `aria-controls`, and `role="region"`.
 */
export const GlassAccordion: React.FC<GlassAccordionProps> = ({
  items,
  openId,
  onToggle,
  className = '',
}) => {
  const baseId = useId();
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const count = items.length;
    if (!count) return;

    let nextIndex = -1;
    if (e.key === 'ArrowDown') nextIndex = (index + 1) % count;
    else if (e.key === 'ArrowUp') nextIndex = (index - 1 + count) % count;
    else if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = count - 1;

    if (nextIndex >= 0) {
      e.preventDefault();
      btnRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {items.map((item, index) => {
        const isOpen = openId === item.id;
        const headerId = `${baseId}-header-${item.id}`;
        const panelId = `${baseId}-panel-${item.id}`;

        return (
          <div
            key={item.id}
            className={`glass-surface-elevated lg-optical-card rounded-[var(--lg-radius-lg)] transition-[box-shadow,transform] duration-250 ${
              isOpen ? 'ring-1 ring-[#D66389]/25 shadow-[0_20px_48px_-14px_rgba(198,72,115,0.2)]' : ''
            }`}
          >
            <button
              ref={(el) => {
                btnRefs.current[index] = el;
              }}
              id={headerId}
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => onToggle(isOpen ? '' : item.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className="w-full min-h-[56px] px-5 py-4 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-[#1E1418] hover:bg-white/40 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#D66389]"
            >
              <span className="leading-snug">{item.question}</span>
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border transition-colors duration-200 ${
                  isOpen
                    ? 'bg-[#D66389]/12 border-[#D66389]/30 text-[#C94F79]'
                    : 'bg-white/75 border-white text-[#C94F79] shadow-xs'
                }`}
                aria-hidden="true"
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </span>
            </button>
            {isOpen && (
              <div
                id={panelId}
                role="region"
                aria-labelledby={headerId}
                className="px-5 pb-4 pt-3 text-xs sm:text-[13px] text-[#4A383F] leading-relaxed border-t border-white/60 animate-fadeIn"
              >
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
