import React, { useState } from 'react';
import { format, parse, isValid } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { CalendarDays } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Calendar } from './calendar';
import { cn } from '../../lib/utils';

interface DateRangePickerProps {
  startDate?: string;
  endDate?: string;
  onChangeStart: (date: string) => void;
  onChangeEnd: (date: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function parseDate(val?: string): Date | undefined {
  if (!val) return undefined;
  const d = parse(val, 'yyyy-MM-dd', new Date());
  return isValid(d) ? d : undefined;
}

function DateRangePicker({
  startDate,
  endDate,
  onChangeStart,
  onChangeEnd,
  placeholder = 'Pilih rentang tanggal',
  disabled = false,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  const from = parseDate(startDate);
  const to = parseDate(endDate);

  const displayText = from
    ? to
      ? `${format(from, 'd MMM yyyy', { locale: localeId })} – ${format(to, 'd MMM yyyy', { locale: localeId })}`
      : format(from, 'd MMM yyyy', { locale: localeId })
    : null;

  const handleSelect = (range: DateRange | undefined) => {
    if (range?.from) {
      onChangeStart(format(range.from, 'yyyy-MM-dd'));
    }
    if (range?.to) {
      onChangeEnd(format(range.to, 'yyyy-MM-dd'));
    }
    if (range?.from && range?.to) {
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-10 w-full items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm ring-offset-background',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-colors hover:border-muted-foreground/30',
            !displayText && 'text-muted-foreground',
            className
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 text-left truncate">
            {displayText ?? placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="range"
          selected={from ? { from, to } : undefined}
          onSelect={handleSelect}
          defaultMonth={from}
          numberOfMonths={2}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

DateRangePicker.displayName = 'DateRangePicker';

export { DateRangePicker };
export type { DateRangePickerProps };
