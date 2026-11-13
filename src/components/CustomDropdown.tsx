import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface CustomDropdownProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: DropdownOption<T>[];
  icon?: React.ReactNode;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
  title?: string;
  ariaLabel?: string;
  renderTriggerLabel?: (selected: DropdownOption<T>) => React.ReactNode;
}

export function CustomDropdown<T extends string = string>({
  value,
  onChange,
  options,
  icon,
  className = '',
  buttonClassName = '',
  dropdownClassName = '',
  title,
  ariaLabel,
  renderTriggerLabel,
}: CustomDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        title={title}
        aria-label={ariaLabel || title}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center justify-between gap-1.5 min-h-[38px] px-3 py-1.5 rounded-full glass-surface text-xs font-semibold text-[#1E1418] hover:bg-white/90 transition-all outline-none cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D66389] ${
          isOpen ? 'bg-white/95 ring-2 ring-[#D66389]/25 border-white' : ''
        } ${buttonClassName}`}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          {icon && <span className="text-[#5C4F48] shrink-0">{icon}</span>}
          {renderTriggerLabel && selectedOption ? (
            renderTriggerLabel(selectedOption)
          ) : (
            <>
              {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
              <span className="truncate">{selectedOption?.label}</span>
            </>
          )}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#5C4F48] shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#C94F79]' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className={`absolute right-0 mt-2 min-w-[180px] w-max max-w-[260px] rounded-[var(--lg-radius-lg)] glass-surface-elevated p-1.5 z-50 animate-fadeIn ${dropdownClassName}`}
        >
          <div className="space-y-0.5">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2 min-h-[38px] rounded-[var(--lg-radius)] text-xs font-medium transition-colors text-left cursor-pointer ${
                    isSelected
                      ? 'bg-white/95 text-[#1E1418] font-bold shadow-xs'
                      : 'text-[#5C4F48] hover:bg-white/70 hover:text-[#1E1418]'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    {option.icon && <span className="shrink-0">{option.icon}</span>}
                    <span className="truncate">{option.label}</span>
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#C94F79] shrink-0" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export interface GlassMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  onSelect: () => void;
}

interface GlassActionMenuProps {
  trigger: (isOpen: boolean) => React.ReactNode;
  header?: React.ReactNode;
  items: GlassMenuItem[];
  ariaLabel: string;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
}

/**
 * Reusable Liquid Glass popover action menu (used for user profile dropdown, etc.).
 */
export const GlassActionMenu: React.FC<GlassActionMenuProps> = ({
  trigger,
  header,
  items,
  ariaLabel,
  className = '',
  triggerClassName = '',
  menuClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex items-center gap-1.5 min-h-[38px] px-2.5 py-1.5 rounded-full glass-surface text-xs font-semibold text-[#1E1418] hover:bg-white/95 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D66389] ${
          isOpen ? 'bg-white/95 ring-2 ring-[#D66389]/25' : ''
        } ${triggerClassName}`}
      >
        {trigger(isOpen)}
      </button>

      {isOpen && (
        <div
          role="menu"
          className={`absolute right-0 mt-2 w-52 rounded-[var(--lg-radius-lg)] glass-surface-elevated p-1.5 z-50 animate-fadeIn ${menuClassName}`}
        >
          {header && (
            <div className="px-3 py-2 mb-1 border-b border-black/5">
              {header}
            </div>
          )}
          <div className="space-y-0.5">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsOpen(false);
                  item.onSelect();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 min-h-[38px] rounded-[var(--lg-radius)] text-xs font-medium text-left transition-colors cursor-pointer whitespace-nowrap ${
                  item.danger
                    ? 'text-rose-700 hover:bg-rose-50/80'
                    : 'text-[#1E1418] hover:bg-white/80'
                }`}
              >
                {item.icon && <span className="shrink-0 opacity-75">{item.icon}</span>}
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
