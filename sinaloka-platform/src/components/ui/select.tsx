import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../lib/utils';

type OptionItem = { value: string; label: string; disabled?: boolean };
type OptionGroup = { label: string; options: OptionItem[] };
type OptionEntry = OptionItem | OptionGroup;

function isOptionGroup(opt: OptionEntry): opt is OptionGroup {
  return 'options' in opt;
}

function flattenOptions(options: OptionEntry[]): OptionItem[] {
  return options.flatMap(opt => isOptionGroup(opt) ? opt.options : [opt]);
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: OptionEntry[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  placeholder,
  className,
  disabled,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const flat = useMemo(() => flattenOptions(options), [options]);
  const selectedOption = flat.find(o => o.value === value);
  const displayLabel = selectedOption?.label || placeholder || '';

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const menuHeight = Math.min(288, flat.length * 36 + 16);
      const openAbove = spaceBelow < menuHeight && rect.top > menuHeight;

      setMenuPos({
        top: openAbove ? rect.top - menuHeight - 4 : rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 180),
      });
    }
  }, [flat.length]);

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
      const idx = flat.findIndex(o => o.value === value);
      setHighlightIndex(idx >= 0 ? idx : 0);
    }
  }, [isOpen, updatePosition, value, flat]);

  // Close on outside click or resize; reposition on scroll
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!triggerRef.current?.contains(e.target as Node) &&
          !menuRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleScroll = (e: Event) => {
      // If scrolling inside the dropdown menu itself, don't reposition
      if (menuRef.current?.contains(e.target as Node)) return;
      // Close if trigger scrolled out of viewport
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) {
        setIsOpen(false);
        return;
      }
      updatePosition();
    };
    const handleResize = () => setIsOpen(false);
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, updatePosition]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!isOpen || highlightIndex < 0 || !menuRef.current) return;
    const items = menuRef.current.querySelectorAll('[data-option-index]');
    items[highlightIndex]?.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex, isOpen]);

  const selectOption = useCallback((opt: OptionItem) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setIsOpen(false);
    triggerRef.current?.focus();
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen && highlightIndex >= 0 && flat[highlightIndex]) {
          selectOption(flat[highlightIndex]);
        } else {
          setIsOpen(true);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightIndex(prev => {
            let next = prev + 1;
            while (next < flat.length && flat[next]?.disabled) next++;
            return next < flat.length ? next : prev;
          });
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setHighlightIndex(prev => {
            let next = prev - 1;
            while (next >= 0 && flat[next]?.disabled) next--;
            return next >= 0 ? next : prev;
          });
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  }, [disabled, isOpen, highlightIndex, flat, selectOption]);

  // Track group labels for rendering
  const renderOptions = () => {
    let optionIdx = 0;
    return options.map((entry, groupIdx) => {
      if (isOptionGroup(entry)) {
        const groupItems = entry.options.map((opt) => {
          const idx = optionIdx++;
          return (
            <OptionRow
              key={opt.value}
              option={opt}
              index={idx}
              isSelected={opt.value === value}
              isHighlighted={idx === highlightIndex}
              onSelect={selectOption}
              onHover={setHighlightIndex}
              indented
            />
          );
        });
        return (
          <div key={groupIdx}>
            <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest select-none">
              {entry.label}
            </div>
            {groupItems}
          </div>
        );
      } else {
        const idx = optionIdx++;
        return (
          <OptionRow
            key={entry.value}
            option={entry}
            index={idx}
            isSelected={entry.value === value}
            isHighlighted={idx === highlightIndex}
            onSelect={selectOption}
            onHover={setHighlightIndex}
          />
        );
      }
    });
  };

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-activedescendant={isOpen && highlightIndex >= 0 ? `select-option-${highlightIndex}` : undefined}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        onKeyDown={handleKeyDown}
        className={cn(
          "h-10 px-3 rounded-lg border bg-white dark:bg-zinc-950 text-sm text-left",
          "flex items-center justify-between gap-2",
          "transition-all duration-150",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-300 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          isOpen
            ? "border-zinc-400 dark:border-zinc-600 ring-1 ring-zinc-200 dark:ring-zinc-700"
            : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700",
          !selectedOption && "text-muted-foreground",
          className,
        )}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          size={14}
          className={cn(
            "shrink-0 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {createPortal(
        <AnimatePresence>
          {isOpen && menuPos && (
            <motion.div
              ref={menuRef}
              role="listbox"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="fixed z-[9999] overflow-y-auto overflow-x-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl py-1"
              style={{
                top: menuPos.top,
                left: menuPos.left,
                width: menuPos.width,
                maxHeight: 288,
              }}
              onKeyDown={handleKeyDown}
            >
              {renderOptions()}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
};

const OptionRow: React.FC<{
  option: OptionItem;
  index: number;
  isSelected: boolean;
  isHighlighted: boolean;
  onSelect: (opt: OptionItem) => void;
  onHover: (idx: number) => void;
  indented?: boolean;
}> = ({ option, index, isSelected, isHighlighted, onSelect, onHover, indented }) => (
  <div
    id={`select-option-${index}`}
    role="option"
    aria-selected={isSelected}
    data-option-index={index}
    onClick={() => onSelect(option)}
    onMouseEnter={() => onHover(index)}
    className={cn(
      "flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors",
      indented && "pl-5",
      option.disabled && "opacity-40 cursor-not-allowed",
      isHighlighted && !option.disabled && "bg-zinc-100 dark:bg-zinc-800/70",
      isSelected && "font-medium text-foreground",
      !isSelected && "text-zinc-600 dark:text-zinc-400",
    )}
  >
    <span className="flex-1 truncate">{option.label}</span>
    {isSelected && (
      <Check size={14} className="shrink-0 text-indigo-600 dark:text-indigo-400" />
    )}
  </div>
);
