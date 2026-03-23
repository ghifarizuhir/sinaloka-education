import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Clock, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { cn } from '../../lib/utils';

interface TimePickerProps {
  value?: string;
  onChange: (time: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minuteStep?: number;
  id?: string;
}

function generateTimeSlots(step: number): string[] {
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += step) {
      slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }
  return slots;
}

function TimePicker({
  value,
  onChange,
  placeholder = 'Pilih waktu',
  disabled = false,
  className,
  minuteStep = 30,
  id,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value ?? '');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const slots = useMemo(() => generateTimeSlots(minuteStep), [minuteStep]);

  useEffect(() => {
    if (!open) {
      setInputValue(value ?? '');
    }
  }, [value, open]);

  useEffect(() => {
    if (!open || !listRef.current) return;

    const target = value || inputValue;
    let idx = -1;
    if (target) {
      idx = slots.findIndex(s => s === target);
      if (idx === -1) {
        idx = slots.findIndex(s => s >= target);
        if (idx === -1) idx = slots.length - 1;
      }
    }

    if (idx >= 0) {
      setHighlightIndex(idx);
      const items = listRef.current.querySelectorAll('[data-time-index]');
      items[idx]?.scrollIntoView({ block: 'center' });
    }
  }, [open, value, inputValue, slots]);

  useEffect(() => {
    if (!open || highlightIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-time-index]');
    items[highlightIndex]?.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex, open]);

  const selectSlot = useCallback((slot: string) => {
    onChange(slot);
    setInputValue(slot);
    setOpen(false);
  }, [onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputValue(raw);

    const digits = raw.replace(/\D/g, '');
    if (digits.length >= 4) {
      const formatted = `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
      const h = parseInt(digits.slice(0, 2));
      const m = parseInt(digits.slice(2, 4));
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        onChange(formatted);
        setInputValue(formatted);
        setOpen(false);
        return;
      }
    }

    if (raw) {
      const idx = slots.findIndex(s => s.startsWith(raw));
      if (idx >= 0) setHighlightIndex(idx);
    }
  };

  const handleInputBlur = () => {
    const match = inputValue.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      const h = parseInt(match[1]);
      const m = parseInt(match[2]);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        const formatted = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        onChange(formatted);
        setInputValue(formatted);
        return;
      }
    }
    setInputValue(value ?? '');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) {
          setOpen(true);
        } else {
          setHighlightIndex(prev => Math.min(prev + 1, slots.length - 1));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (open) {
          setHighlightIndex(prev => Math.max(prev - 1, 0));
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (open && highlightIndex >= 0 && slots[highlightIndex]) {
          selectSlot(slots[highlightIndex]);
        } else if (!open) {
          setOpen(true);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            'flex h-10 w-full items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm ring-offset-background',
            'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
            'transition-colors hover:border-muted-foreground/30',
            disabled && 'cursor-not-allowed opacity-50',
            className
          )}
        >
          <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            id={id}
            type="text"
            inputMode="numeric"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
            autoComplete="off"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" onOpenAutoFocus={(e) => e.preventDefault()}>
        <div
          ref={listRef}
          role="listbox"
          className="max-h-60 overflow-y-auto scrollbar-thin"
        >
          {slots.map((slot, idx) => (
            <div
              key={slot}
              role="option"
              aria-selected={slot === value}
              data-time-index={idx}
              onClick={() => selectSlot(slot)}
              onMouseEnter={() => setHighlightIndex(idx)}
              className={cn(
                'flex items-center justify-between px-3 py-2 text-sm cursor-pointer rounded-md transition-colors',
                highlightIndex === idx && 'bg-accent text-accent-foreground',
                slot === value && 'font-medium',
              )}
            >
              <span>{slot}</span>
              {slot === value && <Check className="h-3.5 w-3.5 text-primary" />}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

TimePicker.displayName = 'TimePicker';

export { TimePicker };
export type { TimePickerProps };
