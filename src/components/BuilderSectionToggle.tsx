import React from 'react';
import { ChevronDown } from 'lucide-react';

interface BuilderSectionToggleProps {
  icon: string;
  title: string;
  optionalLabel?: string;
  isOpen: boolean;
  onToggle: () => void;
}

/** Collapsible header for an optional builder section (body is rendered right after it). */
export const BuilderSectionToggle: React.FC<BuilderSectionToggleProps> = ({
  icon,
  title,
  optionalLabel,
  isOpen,
  onToggle,
}) => (
  <button
    type="button"
    onClick={onToggle}
    aria-expanded={isOpen}
    className={`builder-section-toggle w-full min-h-[56px] flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all cursor-pointer ${
      isOpen
        ? 'bg-white border-[#D9658B]/40 shadow-sm'
        : 'glass-surface-subtle border-black/5 hover:bg-white/90'
    }`}
  >
    <span className="text-xl leading-none shrink-0" aria-hidden="true">
      {icon}
    </span>
    <span className="flex-1 min-w-0">
      <span className="block text-sm font-bold text-[#1E1418] truncate">{title}</span>
      {optionalLabel && (
        <span className="block text-[11px] text-[#7A6A63]">{optionalLabel}</span>
      )}
    </span>
    <ChevronDown
      className={`w-4 h-4 text-[#7A6A63] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
      aria-hidden="true"
    />
  </button>
);

export default BuilderSectionToggle;
