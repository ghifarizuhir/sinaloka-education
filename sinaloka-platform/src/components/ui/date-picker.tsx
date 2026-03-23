import React, { useState } from 'react';
import { format, parse, isValid } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Calendar } from './calendar';
import { cn } from '../../lib/utils';

interface DatePickerProps {
  value?: string;
  onChange: (date: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
  id?: string;
}

function DatePicker({
  value,
  onChange,
  placeholder = 'Pilih tanggal',
  disabled = false,
  className,
  minDate,
  maxDate,
  id,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  const selectedDate = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined;
  const isValidDate = selectedDate && isValid(selectedDate);

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, 'yyyy-MM-dd'));
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-10 w-full items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm ring-offset-background',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-colors hover:border-muted-foreground/30',
            !isValidDate && 'text-muted-foreground',
            className
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 text-left truncate">
            {isValidDate ? format(selectedDate, 'd MMMM yyyy', { locale: localeId }) : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={isValidDate ? selectedDate : undefined}
          onSelect={handleSelect}
          defaultMonth={isValidDate ? selectedDate : undefined}
          disabled={[
            ...(minDate ? [{ before: minDate }] : []),
            ...(maxDate ? [{ after: maxDate }] : []),
          ]}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

DatePicker.displayName = 'DatePicker';

export { DatePicker };
export type { DatePickerProps };
