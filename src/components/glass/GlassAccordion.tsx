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
            className="glass-surface-elevated rounded-[var(--lg-radius-lg)] overflow-hidden transition-shadow duration-200"
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
              className="w-full min-h-[52px] px-5 py-4 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-[#1E1418] hover:bg-white/45 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#D66389]"
            >
              <span className="leading-snug">{item.question}</span>
              <ChevronDown
                className={`w-4 h-4 text-[#C94F79] shrink-0 transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </button>
            {isOpen && (
              <div
                id={panelId}
                role="region"
                aria-labelledby={headerId}
                className="px-5 pb-4 pt-3 text-xs sm:text-[13px] text-[#4A383F] leading-relaxed border-t border-black/8 animate-fadeIn"
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
