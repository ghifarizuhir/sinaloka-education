# Date & Time Picker Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all native HTML `<input type="date">` and `<input type="time">` across sinaloka-platform with custom Radix UI Popover + react-day-picker date picker and a custom scrollable time picker component.

**Architecture:** New UI primitives (`Popover`, `Calendar`, `DatePicker`, `DateRangePicker`, `TimePicker`) are created in `src/components/ui/`, then all ~20 consumer files are migrated to use them. Components use the existing OKLCH design token system and Motion for animations. The `radix-ui` package (already installed, v1.4.3) provides the Popover primitive; `react-day-picker` (new dep) provides the calendar engine.

**Tech Stack:** React 19, Radix UI v1.4.3 (unified `radix-ui` package), react-day-picker v9, date-fns v4, Motion (Framer Motion), Lucide React, TailwindCSS v4 with OKLCH tokens.

**Spec:** `docs/specs/date-time-picker-redesign.md`

---

## File Structure

### New Files (create)

| File | Responsibility |
|------|---------------|
| `src/components/ui/popover.tsx` | Radix UI Popover wrapper with Motion animation |
| `src/components/ui/calendar.tsx` | Styled react-day-picker `<DayPicker>` wrapper |
| `src/components/ui/date-picker.tsx` | Single date picker (Popover + Calendar) |
| `src/components/ui/date-range-picker.tsx` | Date range picker (Popover + Calendar mode="range") |
| `src/components/ui/time-picker.tsx` | Custom time picker with scrollable dropdown |

### Modified Files (migrate)

| File | Change |
|------|--------|
| `src/components/ui/index.ts` | Add exports for new components |
| `src/pages/Schedules/ScheduleSessionModal.tsx` | `Input type="date"` → `DatePicker`, `Select` TIME_SLOTS → `TimePicker` |
| `src/pages/Schedules/EditSessionModal.tsx` | `Input type="date"` → `DatePicker`, `Select` TIME_SLOTS → `TimePicker` |
| `src/pages/Schedules/ScheduleFilters.tsx` | 2x `Input type="date"` → `DateRangePicker` |
| `src/pages/Schedules/GenerateSessionsModal.tsx` | 2x `Input type="date"` → 2x `DatePicker` |
| `src/pages/Classes/ClassFormModal.tsx` | `input type="time"` → `TimePicker` |
| `src/pages/AcademicYears/SemesterFormModal.tsx` | 2x `Input type="date"` → 2x `DatePicker` |
| `src/pages/AcademicYears/YearFormModal.tsx` | 2x `Input type="date"` → 2x `DatePicker` |
| `src/components/ReportPreviewModal.tsx` | 2x `Input type="date"` → 2x `DatePicker` |
| `src/pages/Finance/FinanceOverview.tsx` | 2x `input type="date"` → 2x `DatePicker` |
| `src/pages/Finance/OperatingExpenses.tsx` | 2x `Input type="date"` → 2x `DatePicker` |
| `src/pages/Finance/StudentPayments.tsx` | 2x `Input type="date"` → 2x `DatePicker` |
| `src/pages/Finance/TutorPayouts.tsx` | 3x `Input type="date"` → 3x `DatePicker` |
| `src/pages/SuperAdmin/Settlements.tsx` | 2x `input type="date"` → 2x `DatePicker` |
| `src/pages/SuperAdmin/SubscriptionManagement.tsx` | 1x `input type="date"` → `DatePicker` |
| `src/pages/WhatsApp.tsx` | 2x `Input type="date"` → `DateRangePicker` |
| `src/pages/AuditLog/AuditLogFilters.tsx` | 2x `input type="date"` → `DateRangePicker` |

---

## Task 1: Install react-day-picker dependency

**Files:**
- Modify: `sinaloka-platform/package.json`

- [ ] **Step 1: Install react-day-picker**

```bash
cd sinaloka-platform && npm install react-day-picker@latest
```

- [ ] **Step 2: Verify installation**

```bash
cd sinaloka-platform && node -e "import('react-day-picker').then(m => console.log('OK, exports:', Object.keys(m).slice(0,5).join(', ')))"
```

Expected: prints OK with exports like `DayPicker, getDefaultClassNames, ...`

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/package.json sinaloka-platform/package-lock.json
git commit -m "chore(platform): add react-day-picker dependency"
```

---

## Task 2: Create Popover component (Radix UI wrapper)

**Files:**
- Create: `sinaloka-platform/src/components/ui/popover.tsx`
- Modify: `sinaloka-platform/src/components/ui/index.ts`

- [ ] **Step 1: Create popover.tsx**

The Radix UI unified package (`radix-ui` v1.4.3) exports `Popover` directly. Import `{ Popover }` from `radix-ui` — it contains `Root`, `Trigger`, `Content`, `Portal`, `Anchor`, `Arrow`, `Close`.

```tsx
// sinaloka-platform/src/components/ui/popover.tsx
import React from 'react';
import { Popover as RadixPopover } from 'radix-ui';
import { cn } from '../../lib/utils';

const Popover = RadixPopover.Root;
const PopoverTrigger = RadixPopover.Trigger;
const PopoverAnchor = RadixPopover.Anchor;

const PopoverContent = React.forwardRef<
  React.ComponentRef<typeof RadixPopover.Content>,
  React.ComponentPropsWithoutRef<typeof RadixPopover.Content> & {
    container?: HTMLElement;
  }
>(({ className, align = 'start', sideOffset = 4, container, children, ...props }, ref) => (
  <RadixPopover.Portal container={container}>
    <RadixPopover.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-50 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl',
        'outline-none',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
        'data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2',
        className
      )}
      {...props}
    >
      {children}
    </RadixPopover.Content>
  </RadixPopover.Portal>
));
PopoverContent.displayName = 'PopoverContent';

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
```

**Notes:**
- Uses `tw-animate-css` classes (`animate-in`, `fade-in-0`, `zoom-in-95`, `slide-in-from-top-2`) which are already in the project's dependencies for entry/exit animations.
- `sideOffset={4}` gives 4px gap between trigger and popover, matching existing dropdown patterns.
- `align="start"` as default aligns with the left edge of the trigger.

- [ ] **Step 2: Export from index.ts**

Add to `sinaloka-platform/src/components/ui/index.ts`:
```ts
export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from './popover';
```

- [ ] **Step 3: Verify build**

```bash
cd sinaloka-platform && npm run lint
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/components/ui/popover.tsx sinaloka-platform/src/components/ui/index.ts
git commit -m "feat(platform): add Popover component (Radix UI wrapper)"
```

---

## Task 3: Create Calendar component (styled react-day-picker)

**Files:**
- Create: `sinaloka-platform/src/components/ui/calendar.tsx`
- Modify: `sinaloka-platform/src/components/ui/index.ts`

- [ ] **Step 1: Create calendar.tsx**

```tsx
// sinaloka-platform/src/components/ui/calendar.tsx
import React from 'react';
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
        day: 'h-9 w-9 text-center text-sm relative p-0 [&:has(>.rdp-button_reset)]:bg-accent/50 first:[&:has(>.rdp-button_reset)]:rounded-l-md last:[&:has(>.rdp-button_reset)]:rounded-r-md',
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
```

**Notes:**
- Locale set to `id` (Indonesian) — matching the app's primary user base.
- All styling uses existing design tokens: `primary`, `accent`, `muted-foreground`, `ring`, etc.
- Navigation uses Lucide's `ChevronLeft`/`ChevronRight` for consistency with other components.
- `showOutsideDays` keeps the calendar grid uniform (no holes for previous/next month days).

- [ ] **Step 2: Export from index.ts**

Add to `sinaloka-platform/src/components/ui/index.ts`:
```ts
export { Calendar } from './calendar';
```

- [ ] **Step 3: Verify build**

```bash
cd sinaloka-platform && npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/components/ui/calendar.tsx sinaloka-platform/src/components/ui/index.ts
git commit -m "feat(platform): add Calendar component (styled react-day-picker)"
```

---

## Task 4: Create DatePicker component

**Files:**
- Create: `sinaloka-platform/src/components/ui/date-picker.tsx`
- Modify: `sinaloka-platform/src/components/ui/index.ts`

- [ ] **Step 1: Create date-picker.tsx**

```tsx
// sinaloka-platform/src/components/ui/date-picker.tsx
import React, { useState } from 'react';
import { format, parse, isValid } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Calendar } from './calendar';
import { cn } from '../../lib/utils';

interface DatePickerProps {
  value?: string;              // 'yyyy-MM-dd' format
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

  // Parse the string value to a Date for react-day-picker
  const selectedDate = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined;
  const isValidDate = selectedDate && isValid(selectedDate);

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, 'yyyy-MM-dd'));
    }
    setOpen(false);
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
```

**Notes:**
- API is `value: string` (`yyyy-MM-dd`) and `onChange(string)` — matching the current `<Input type="date">` API. This makes migration trivial.
- Trigger is styled identically to the existing `Input` component: same height (`h-10`), border, radius, focus ring.
- `CalendarDays` icon replaces the native browser date icon.
- Date displayed in Indonesian locale: `"24 Maret 2026"`.
- Popover auto-closes on date selection.

- [ ] **Step 2: Export from index.ts**

Add to `sinaloka-platform/src/components/ui/index.ts`:
```ts
export { DatePicker } from './date-picker';
```

- [ ] **Step 3: Verify build**

```bash
cd sinaloka-platform && npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/components/ui/date-picker.tsx sinaloka-platform/src/components/ui/index.ts
git commit -m "feat(platform): add DatePicker component"
```

---

## Task 5: Create DateRangePicker component

**Files:**
- Create: `sinaloka-platform/src/components/ui/date-range-picker.tsx`
- Modify: `sinaloka-platform/src/components/ui/index.ts`

- [ ] **Step 1: Create date-range-picker.tsx**

```tsx
// sinaloka-platform/src/components/ui/date-range-picker.tsx
import React, { useState } from 'react';
import { format, parse, isValid } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { CalendarDays } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Calendar } from './calendar';
import { cn } from '../../lib/utils';

interface DateRangePickerProps {
  startDate?: string;         // 'yyyy-MM-dd'
  endDate?: string;           // 'yyyy-MM-dd'
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
    // Close only when both dates are selected
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
```

**Notes:**
- Uses `numberOfMonths={2}` to show 2 months side-by-side for easier range picking.
- Popover stays open until both dates are picked.
- Display uses short month format (`"24 Mar 2026 – 30 Mar 2026"`) to fit tighter spaces.
- Follows the same `onChangeStart`/`onChangeEnd` string API to match existing state patterns.

- [ ] **Step 2: Export from index.ts**

Add to `sinaloka-platform/src/components/ui/index.ts`:
```ts
export { DateRangePicker } from './date-range-picker';
```

- [ ] **Step 3: Verify build**

```bash
cd sinaloka-platform && npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/components/ui/date-range-picker.tsx sinaloka-platform/src/components/ui/index.ts
git commit -m "feat(platform): add DateRangePicker component"
```

---

## Task 6: Create TimePicker component

**Files:**
- Create: `sinaloka-platform/src/components/ui/time-picker.tsx`
- Modify: `sinaloka-platform/src/components/ui/index.ts`

- [ ] **Step 1: Create time-picker.tsx**

```tsx
// sinaloka-platform/src/components/ui/time-picker.tsx
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Clock, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { cn } from '../../lib/utils';

interface TimePickerProps {
  value?: string;              // 'HH:mm' format
  onChange: (time: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minuteStep?: number;         // default 30
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

  // Sync external value
  useEffect(() => {
    if (!open) {
      setInputValue(value ?? '');
    }
  }, [value, open]);

  // Auto-scroll to selected or nearest slot when popover opens
  useEffect(() => {
    if (!open || !listRef.current) return;

    const target = value || inputValue;
    let idx = -1;
    if (target) {
      idx = slots.findIndex(s => s === target);
      if (idx === -1) {
        // Find nearest slot
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

  // Scroll highlighted item into view
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

    // Auto-format: if user types "14" it becomes "14:", if "1430" → "14:30"
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

    // Jump to nearest matching slot
    if (raw) {
      const idx = slots.findIndex(s => s.startsWith(raw));
      if (idx >= 0) setHighlightIndex(idx);
    }
  };

  const handleInputBlur = () => {
    // Validate and revert if invalid
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
    // Revert to previous valid value
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
```

**Notes:**
- **Dual interaction model**: Users can type directly (`inputMode="numeric"` for mobile keyboards) OR pick from the scrollable list.
- **Auto-format**: Typing "1430" auto-formats to "14:30" and commits. Typing "14:" shows the input is in progress.
- **Auto-scroll**: On open, scrolls to the currently selected time or nearest slot.
- **Validation on blur**: Invalid input reverts to last valid value.
- Uses the same Popover component built in Task 2 for consistent dropdown behavior.
- API: `value: string` (`HH:mm`) and `onChange(string)` — matching the existing TIME_SLOTS string format for easy migration.

- [ ] **Step 2: Export from index.ts**

Add to `sinaloka-platform/src/components/ui/index.ts`:
```ts
export { TimePicker } from './time-picker';
```

- [ ] **Step 3: Verify build**

```bash
cd sinaloka-platform && npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/components/ui/time-picker.tsx sinaloka-platform/src/components/ui/index.ts
git commit -m "feat(platform): add TimePicker component"
```

---

## Task 7: Migrate Schedules module (ScheduleSessionModal, EditSessionModal, ScheduleFilters, GenerateSessionsModal)

**Files:**
- Modify: `sinaloka-platform/src/pages/Schedules/ScheduleSessionModal.tsx`
- Modify: `sinaloka-platform/src/pages/Schedules/EditSessionModal.tsx`
- Modify: `sinaloka-platform/src/pages/Schedules/ScheduleFilters.tsx`
- Modify: `sinaloka-platform/src/pages/Schedules/GenerateSessionsModal.tsx`

- [ ] **Step 1: Migrate ScheduleSessionModal.tsx**

Replace the import and usages:
- Remove `Input` from imports (no longer needed here), add `DatePicker, TimePicker` to imports from `../../components/UI`
- Replace `<Input type="date" value={selectedDate} onChange={(e) => onSelectedDateChange(e.target.value)} />` with `<DatePicker value={selectedDate} onChange={onSelectedDateChange} />`
- Replace both `<Select>` for start/end time (that use `TIME_SLOTS.map(...)`) with `<TimePicker value={startTime} onChange={onStartTimeChange} />` and `<TimePicker value={endTime} onChange={onEndTimeChange} />`
- Remove `TIME_SLOTS` import from `./useSchedulesPage` (no longer needed in this file)

- [ ] **Step 2: Migrate EditSessionModal.tsx**

Same pattern:
- Remove `Input` import, add `DatePicker, TimePicker`
- Replace `<Input type="date" ...>` → `<DatePicker value={date} onChange={setDate} />`
- Replace both time `<Select>` → `<TimePicker value={startTime} onChange={setStartTime} />` and `<TimePicker value={endTime} onChange={setEndTime} />`
- Remove `TIME_SLOTS` import

- [ ] **Step 3: Migrate ScheduleFilters.tsx**

- Remove `Input` from imports, add `DateRangePicker`
- Replace the two separate `<Input type="date">` elements (filterDateFrom and filterDateTo) with a single `<DateRangePicker startDate={filterDateFrom} endDate={filterDateTo} onChangeStart={onFilterDateFromChange} onChangeEnd={onFilterDateToChange} />`
- Adjust the layout: the DateRangePicker replaces two separate inputs, so the grid may need adjusting

- [ ] **Step 4: Migrate GenerateSessionsModal.tsx**

- Remove `Input` from imports, add `DatePicker`
- Replace both `<Input type="date">` with `<DatePicker value={genDateFrom} onChange={onGenDateFromChange} />` and `<DatePicker value={genDateTo} onChange={onGenDateToChange} />`

- [ ] **Step 5: Verify build**

```bash
cd sinaloka-platform && npm run lint
```

- [ ] **Step 6: Commit**

```bash
git add sinaloka-platform/src/pages/Schedules/
git commit -m "feat(platform): migrate Schedules module to DatePicker/TimePicker"
```

---

## Task 8: Migrate Classes module (ClassFormModal)

**Files:**
- Modify: `sinaloka-platform/src/pages/Classes/ClassFormModal.tsx`

- [ ] **Step 1: Migrate ClassFormModal.tsx**

- Add `TimePicker` to UI imports
- Replace the two `<input type="time">` elements (lines 210-222) in the schedule day rows with `<TimePicker>`:

Before:
```tsx
<input type="time" value={schedule.start_time}
  onChange={(e) => setFormSchedules(prev => prev.map(s => s.day === schedule.day ? { ...s, start_time: e.target.value } : s))}
  className="h-8 px-2 text-sm border ..." />
```

After:
```tsx
<TimePicker
  value={schedule.start_time}
  onChange={(time) => setFormSchedules(prev => prev.map(s => s.day === schedule.day ? { ...s, start_time: time } : s))}
  className="w-28 h-8"
  minuteStep={15}
/>
```

**Note:** Use `minuteStep={15}` here since class schedules often need finer granularity (15-min intervals), and add `className="w-28 h-8"` to fit the compact inline layout. The TimePicker's `h-10` default will be overridden by the className.

- [ ] **Step 2: Verify build**

```bash
cd sinaloka-platform && npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/pages/Classes/ClassFormModal.tsx
git commit -m "feat(platform): migrate ClassFormModal to TimePicker"
```

---

## Task 9: Migrate AcademicYears module (SemesterFormModal, YearFormModal)

**Files:**
- Modify: `sinaloka-platform/src/pages/AcademicYears/SemesterFormModal.tsx`
- Modify: `sinaloka-platform/src/pages/AcademicYears/YearFormModal.tsx`

- [ ] **Step 1: Migrate SemesterFormModal.tsx**

- Replace `Input` import with `DatePicker` (keep `Input` only if other non-date inputs use it — check: there's a text Input for "name", so keep `Input` and add `DatePicker`)
- Replace both `<Input id="sem-start" type="date" ...>` and `<Input id="sem-end" type="date" ...>` with `<DatePicker value={startDate} onChange={setStartDate} />` and `<DatePicker value={endDate} onChange={setEndDate} />`

- [ ] **Step 2: Migrate YearFormModal.tsx**

Same pattern — replace `<Input type="date">` for year start/end with `<DatePicker>`.

- [ ] **Step 3: Verify build**

```bash
cd sinaloka-platform && npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/pages/AcademicYears/
git commit -m "feat(platform): migrate AcademicYears to DatePicker"
```

---

## Task 10: Migrate ReportPreviewModal

**Files:**
- Modify: `sinaloka-platform/src/components/ReportPreviewModal.tsx`

- [ ] **Step 1: Migrate ReportPreviewModal.tsx**

- Add `DatePicker` to imports from `./UI`
- Replace both `<Input type="date">` (lines 137-149) with `<DatePicker>`:

```tsx
<DatePicker
  value={dateFrom}
  onChange={(val) => { setDateFrom(val); setGenerateEnabled(false); }}
/>
```

And similarly for `dateTo`.

- [ ] **Step 2: Verify build**

```bash
cd sinaloka-platform && npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/components/ReportPreviewModal.tsx
git commit -m "feat(platform): migrate ReportPreviewModal to DatePicker"
```

---

## Task 11: Migrate Finance module (FinanceOverview, OperatingExpenses, StudentPayments, TutorPayouts)

**Files:**
- Modify: `sinaloka-platform/src/pages/Finance/FinanceOverview.tsx`
- Modify: `sinaloka-platform/src/pages/Finance/OperatingExpenses.tsx`
- Modify: `sinaloka-platform/src/pages/Finance/StudentPayments.tsx`
- Modify: `sinaloka-platform/src/pages/Finance/TutorPayouts.tsx`

- [ ] **Step 1: Migrate FinanceOverview.tsx**

The two `<input type="date">` elements (lines 136-145) for `customStart`/`customEnd` are raw `<input>` (not the `Input` component). The `onChange` handlers call `handleCustomDateChange()` which updates `periodStart`/`periodEnd` when both dates are set. Preserve this side effect:

```tsx
<DatePicker
  value={customStart}
  onChange={(val) => { setCustomStart(val); handleCustomDateChange(val, customEnd); }}
  className="w-36"
/>
<DatePicker
  value={customEnd}
  onChange={(val) => { setCustomEnd(val); handleCustomDateChange(customStart, val); }}
  className="w-36"
/>
```

Add `DatePicker` to imports from the UI components.

- [ ] **Step 2: Migrate OperatingExpenses.tsx**

Two `<Input type="date">`:
- Line 453: expense form date → `<DatePicker value={formDate} onChange={setFormDate} />`
- Line 516: recurring end date → `<DatePicker value={recurringEndDate} onChange={setRecurringEndDate} />`

- [ ] **Step 3: Migrate StudentPayments.tsx**

Two `<Input type="date">`:
- Line 434: batch payment date → `<DatePicker value={batchDate} onChange={setBatchDate} />`
- Line 537: individual payment date → `<DatePicker value={paymentDate} onChange={setPaymentDate} />`

- [ ] **Step 4: Migrate TutorPayouts.tsx**

Three `<Input type="date">`:
- Line 637: period start → `<DatePicker value={formPeriodStart} onChange={(v) => setFormPeriodStart(v)} />`
- Line 641: period end → `<DatePicker value={formPeriodEnd} onChange={(v) => setFormPeriodEnd(v)} />`
- Line 692: payout date → `<DatePicker value={newDate} onChange={setNewDate} />`

Note: The onChange handlers in TutorPayouts use `(e: React.ChangeEvent<HTMLInputElement>) => setFormPeriodStart(e.target.value)`. With `DatePicker`, the handler is simpler: `(v) => setFormPeriodStart(v)` since DatePicker passes the string directly.

- [ ] **Step 5: Verify build**

```bash
cd sinaloka-platform && npm run lint
```

- [ ] **Step 6: Commit**

```bash
git add sinaloka-platform/src/pages/Finance/
git commit -m "feat(platform): migrate Finance module to DatePicker"
```

---

## Task 12: Migrate SuperAdmin module (Settlements, SubscriptionManagement)

**Files:**
- Modify: `sinaloka-platform/src/pages/SuperAdmin/Settlements.tsx`
- Modify: `sinaloka-platform/src/pages/SuperAdmin/SubscriptionManagement.tsx`

- [ ] **Step 1: Migrate Settlements.tsx**

Two raw `<input type="date">`:
- Line 107: transfer date in modal → `<DatePicker value={transferredAt} onChange={setTransferredAt} />`
- Line 201: date filter → `<DatePicker value={transferredAt} onChange={setTransferredAt} />`

Add `DatePicker` import. These are raw `<input>` elements (not the `Input` component), so also remove the inline className styling.

- [ ] **Step 2: Migrate SubscriptionManagement.tsx**

One raw `<input type="date">`:
- Line 150: subscription override date → `<DatePicker value={expiresAt} onChange={setExpiresAt} />`

- [ ] **Step 3: Verify build**

```bash
cd sinaloka-platform && npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/pages/SuperAdmin/
git commit -m "feat(platform): migrate SuperAdmin to DatePicker"
```

---

## Task 13: Migrate WhatsApp and AuditLog filters

**Files:**
- Modify: `sinaloka-platform/src/pages/WhatsApp.tsx`
- Modify: `sinaloka-platform/src/pages/AuditLog/AuditLogFilters.tsx`

- [ ] **Step 1: Migrate WhatsApp.tsx**

Two `<Input type="date">` (lines 171-180) for `filterDateFrom`/`filterDateTo`. Replace with:
```tsx
<DateRangePicker
  startDate={filterDateFrom}
  endDate={filterDateTo}
  onChangeStart={setFilterDateFrom}
  onChangeEnd={setFilterDateTo}
/>
```

Or if the layout requires them separate (e.g., in a flex row with other filters), use two `<DatePicker>` instead.

- [ ] **Step 2: Migrate AuditLogFilters.tsx**

Two raw `<input type="date">` (lines 63-72) for `date_from`/`date_to`. These are inline `<input>` elements with manual styling. Replace with `<DatePicker>`:

```tsx
<DatePicker
  value={filters.date_from ?? ''}
  onChange={(val) => onFilterChange({ ...filters, date_from: val || undefined })}
  placeholder="Dari tanggal"
  className="h-9 text-xs w-40"
/>
```

- [ ] **Step 3: Verify build**

```bash
cd sinaloka-platform && npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/pages/WhatsApp.tsx sinaloka-platform/src/pages/AuditLog/
git commit -m "feat(platform): migrate WhatsApp & AuditLog to DatePicker"
```

---

## Task 14: Full build verification and cleanup

**Files:**
- All modified files

- [ ] **Step 1: Full TypeScript check**

```bash
cd sinaloka-platform && npm run lint
```

Expected: 0 errors.

- [ ] **Step 2: Production build**

```bash
cd sinaloka-platform && npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 3: Check for orphaned TIME_SLOTS imports**

Search for any remaining references to `TIME_SLOTS` that should have been removed:

```bash
cd sinaloka-platform && grep -rn "TIME_SLOTS" src/pages/ --include="*.tsx" --include="*.ts"
```

Expected: only `useSchedulesPage.ts` defines it (the export can remain since it might be used elsewhere in the calendar views, but no file should be importing it for form usage).

- [ ] **Step 4: Check for remaining native date inputs**

```bash
cd sinaloka-platform && grep -rn 'type="date"' src/ --include="*.tsx" --include="*.ts"
cd sinaloka-platform && grep -rn 'type="time"' src/ --include="*.tsx" --include="*.ts"
```

Expected: 0 results — all native date/time inputs should be replaced.

- [ ] **Step 5: Final commit if any cleanup needed**

```bash
git add -A sinaloka-platform/src/
git commit -m "chore(platform): cleanup orphaned date/time input references"
```

---

## Files Affected

### New Files
- `sinaloka-platform/src/components/ui/popover.tsx`
- `sinaloka-platform/src/components/ui/calendar.tsx`
- `sinaloka-platform/src/components/ui/date-picker.tsx`
- `sinaloka-platform/src/components/ui/date-range-picker.tsx`
- `sinaloka-platform/src/components/ui/time-picker.tsx`

### Modified Files
- `sinaloka-platform/package.json` (new dependency)
- `sinaloka-platform/src/components/ui/index.ts` (new exports)
- `sinaloka-platform/src/pages/Schedules/ScheduleSessionModal.tsx`
- `sinaloka-platform/src/pages/Schedules/EditSessionModal.tsx`
- `sinaloka-platform/src/pages/Schedules/ScheduleFilters.tsx`
- `sinaloka-platform/src/pages/Schedules/GenerateSessionsModal.tsx`
- `sinaloka-platform/src/pages/Classes/ClassFormModal.tsx`
- `sinaloka-platform/src/pages/AcademicYears/SemesterFormModal.tsx`
- `sinaloka-platform/src/pages/AcademicYears/YearFormModal.tsx`
- `sinaloka-platform/src/components/ReportPreviewModal.tsx`
- `sinaloka-platform/src/pages/Finance/FinanceOverview.tsx`
- `sinaloka-platform/src/pages/Finance/OperatingExpenses.tsx`
- `sinaloka-platform/src/pages/Finance/StudentPayments.tsx`
- `sinaloka-platform/src/pages/Finance/TutorPayouts.tsx`
- `sinaloka-platform/src/pages/SuperAdmin/Settlements.tsx`
- `sinaloka-platform/src/pages/SuperAdmin/SubscriptionManagement.tsx`
- `sinaloka-platform/src/pages/WhatsApp.tsx`
- `sinaloka-platform/src/pages/AuditLog/AuditLogFilters.tsx`
