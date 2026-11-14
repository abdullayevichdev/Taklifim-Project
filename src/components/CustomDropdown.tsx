import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { getPortalRoot } from '../utils/portalRoot';

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

interface FloatingPos {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  minWidth: number;
  maxHeight: number;
}

function computeAnchoredPos(
  anchor: HTMLElement,
  matchWidth: boolean,
  minWidthFallback = 180
): FloatingPos {
  const rect = anchor.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = 8;
  const spaceBelow = vh - rect.bottom - margin;
  const spaceAbove = rect.top - margin;
  const openUpward = spaceBelow < 180 && spaceAbove > spaceBelow;
  const maxHeight = Math.max(140, Math.min(320, (openUpward ? spaceAbove : spaceBelow) - 4));

  const pos: FloatingPos = {
    minWidth: matchWidth ? rect.width : minWidthFallback,
    maxHeight,
  };

  if (openUpward) {
    pos.bottom = Math.max(margin, vh - rect.top + 6);
  } else {
    pos.top = Math.max(margin, rect.bottom + 6);
  }

  if (matchWidth) {
    pos.left = Math.max(margin, Math.min(rect.left, vw - rect.width - margin));
  } else {
    const rightOffset = Math.max(margin, vw - rect.right);
    if (vw - rightOffset - minWidthFallback < margin) {
      pos.left = margin;
    } else {
      pos.right = rightOffset;
    }
  }

  return pos;
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
  const [floatingPos, setFloatingPos] = useState<FloatingPos | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];
  const matchTriggerWidth = dropdownClassName.includes('w-full');

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    setFloatingPos(computeAnchoredPos(containerRef.current, matchTriggerWidth, 180));
  }, [matchTriggerWidth]);

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
    } else {
      setFloatingPos(null);
    }
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        (!menuRef.current || !menuRef.current.contains(target))
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  const portalRoot = isOpen ? getPortalRoot() : null;

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

      {isOpen &&
        portalRoot &&
        floatingPos &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={{
              position: 'fixed',
              top: floatingPos.top,
              bottom: floatingPos.bottom,
              left: floatingPos.left,
              right: floatingPos.right,
              minWidth: floatingPos.minWidth,
              maxWidth: 'calc(100vw - 16px)',
              maxHeight: floatingPos.maxHeight,
            }}
            className={`w-max rounded-[var(--lg-radius-lg)] glass-surface-elevated p-1.5 z-[9500] overflow-y-auto animate-fadeIn ${dropdownClassName.replace(/\bw-full\b|\bleft-0\b|\bright-0\b/g, '')}`}
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
          </div>,
          portalRoot
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
  const [floatingPos, setFloatingPos] = useState<FloatingPos | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    setFloatingPos(computeAnchoredPos(containerRef.current, false, 208));
  }, []);

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
    } else {
      setFloatingPos(null);
    }
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        (!menuRef.current || !menuRef.current.contains(target))
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  const portalRoot = isOpen ? getPortalRoot() : null;

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

      {isOpen &&
        portalRoot &&
        floatingPos &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: 'fixed',
              top: floatingPos.top,
              bottom: floatingPos.bottom,
              left: floatingPos.left,
              right: floatingPos.right,
              width: 208,
              maxWidth: 'calc(100vw - 16px)',
              maxHeight: floatingPos.maxHeight,
            }}
            className={`rounded-[var(--lg-radius-lg)] glass-surface-elevated p-1.5 z-[9500] overflow-y-auto animate-fadeIn ${menuClassName}`}
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
          </div>,
          portalRoot
        )}
    </div>
  );
};

export default CustomDropdown;
