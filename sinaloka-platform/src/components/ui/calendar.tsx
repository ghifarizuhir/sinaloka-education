import { DayPicker, type DayPickerProps } from 'react-day-picker';
import { id } from 'react-day-picker/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

type CalendarProps = DayPickerProps & {
  className?: string;
};

function Calendar({ className, ...props }: CalendarProps) {
  return (
    <DayPicker
      locale={id}
      showOutsideDays
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-2',
        month: 'flex flex-col gap-4',
        month_caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'text-sm font-semibold',
        nav: 'flex items-center gap-1',
        button_previous: 'absolute left-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md border border-input hover:bg-accent hover:text-accent-foreground transition-colors',
        button_next: 'absolute right-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md border border-input hover:bg-accent hover:text-accent-foreground transition-colors',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'text-muted-foreground rounded-md w-9 font-medium text-[0.8rem]',
        week: 'flex w-full mt-2',
        day: 'h-9 w-9 text-center text-sm relative p-0',
        day_button: 'h-9 w-9 p-0 font-normal inline-flex items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected: 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md',
        today: 'bg-accent text-accent-foreground font-semibold',
        outside: 'text-muted-foreground opacity-50',
        disabled: 'text-muted-foreground opacity-30',
        range_middle: 'bg-accent/50 text-accent-foreground rounded-none',
        range_start: 'rounded-l-md',
        range_end: 'rounded-r-md',
        hidden: 'invisible',
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
      }}
      {...props}
    />
  );
}

Calendar.displayName = 'Calendar';

export { Calendar };
export type { CalendarProps };
