# Class Timetable View Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a weekly timetable view to the Classes page that visually displays class schedules as colored blocks on a time/day grid.

**Architecture:** Create a new `ClassTimetable.tsx` component for the grid rendering (time computation, overlap detection, block positioning). Modify `Classes.tsx` to add view mode toggle and conditionally render either table or timetable. No backend changes.

**Tech Stack:** React, TailwindCSS, lucide-react (Table2, Calendar icons), date-fns (not needed — pure string parsing), react-i18next

**Spec:** `docs/superpowers/specs/2026-03-17-class-timetable-view-design.md`

---

## Task 1: Add i18n keys

**Files:**
- Modify: `sinaloka-platform/src/locales/en.json`
- Modify: `sinaloka-platform/src/locales/id.json`

- [ ] **Step 1: Add English keys**

In `en.json`, add inside the `classes` key group (near existing `classes.drawer.*` keys):

```json
"classes.view.table": "Table",
"classes.view.timetable": "Timetable",
"classes.timetable.empty": "No classes to display in timetable"
```

- [ ] **Step 2: Add Indonesian keys**

In `id.json`, add matching keys:

```json
"classes.view.table": "Tabel",
"classes.view.timetable": "Jadwal",
"classes.timetable.empty": "Tidak ada kelas untuk ditampilkan"
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/locales/en.json sinaloka-platform/src/locales/id.json
git commit -m "feat(i18n): add class timetable view translations"
```

---

## Task 2: Create ClassTimetable component

**Files:**
- Create: `sinaloka-platform/src/components/ClassTimetable.tsx`

This is the core of the feature — a self-contained timetable grid component.

- [ ] **Step 1: Create the component file**

Create `sinaloka-platform/src/components/ClassTimetable.tsx` with the full implementation:

```typescript
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Class, ScheduleDay } from '@/src/types/class';

const ROW_HEIGHT = 48; // px per 30 minutes
const GUTTER_WIDTH = 60; // px for time labels

const DAYS: ScheduleDay[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT: Record<ScheduleDay, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu',
  Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
};

const TIMETABLE_COLORS: Record<string, string> = {
  Mathematics: 'bg-blue-500 border-blue-600',
  Science: 'bg-emerald-500 border-emerald-600',
  English: 'bg-amber-500 border-amber-600',
  History: 'bg-purple-500 border-purple-600',
};
const DEFAULT_COLOR = 'bg-zinc-500 border-zinc-600';

function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

interface TimetableBlock {
  cls: Class;
  day: ScheduleDay;
  startMin: number;
  endMin: number;
  colIndex: number;
  colTotal: number;
}

function computeOverlaps(blocks: Omit<TimetableBlock, 'colIndex' | 'colTotal'>[]): TimetableBlock[] {
  if (blocks.length === 0) return [];
  const sorted = [...blocks].sort((a, b) => a.startMin - b.startMin);
  const result: TimetableBlock[] = [];
  let cluster: typeof sorted = [sorted[0]];
  let clusterEnd = sorted[0].endMin;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startMin < clusterEnd) {
      cluster.push(sorted[i]);
      clusterEnd = Math.max(clusterEnd, sorted[i].endMin);
    } else {
      // flush cluster
      cluster.forEach((b, idx) => result.push({ ...b, colIndex: idx, colTotal: cluster.length }));
      cluster = [sorted[i]];
      clusterEnd = sorted[i].endMin;
    }
  }
  cluster.forEach((b, idx) => result.push({ ...b, colIndex: idx, colTotal: cluster.length }));
  return result;
}

interface ClassTimetableProps {
  classes: Class[];
  onClassClick: (classId: string) => void;
}

export function ClassTimetable({ classes, onClassClick }: ClassTimetableProps) {
  const { t } = useTranslation();

  const { gridStartHour, gridEndHour, blocks } = useMemo(() => {
    if (classes.length === 0) {
      return { gridStartHour: 8, gridEndHour: 17, blocks: [] };
    }

    let earliest = 24 * 60;
    let latest = 0;
    const rawBlocks: Omit<TimetableBlock, 'colIndex' | 'colTotal'>[] = [];

    for (const cls of classes) {
      if (!cls.schedule_days?.length || !cls.schedule_start_time || !cls.schedule_end_time) continue;
      const startMin = parseTime(cls.schedule_start_time);
      const endMin = parseTime(cls.schedule_end_time);
      if (startMin >= endMin) continue;

      earliest = Math.min(earliest, startMin);
      latest = Math.max(latest, endMin);

      for (const day of cls.schedule_days) {
        rawBlocks.push({ cls, day, startMin, endMin });
      }
    }

    // ±1 hour padding, snap to full hours
    const gridStartHour = Math.max(0, Math.floor(earliest / 60) - 1);
    const gridEndHour = Math.min(24, Math.ceil(latest / 60) + 1);

    // Compute overlaps per day
    const allBlocks: TimetableBlock[] = [];
    for (const day of DAYS) {
      const dayBlocks = rawBlocks.filter(b => b.day === day);
      allBlocks.push(...computeOverlaps(dayBlocks));
    }

    return { gridStartHour, gridEndHour, blocks: allBlocks };
  }, [classes]);

  if (classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-4">
          <Calendar size={32} className="text-zinc-300" />
        </div>
        <h3 className="text-lg font-bold mb-1">{t('classes.timetable.empty')}</h3>
      </div>
    );
  }

  const totalSlots = (gridEndHour - gridStartHour) * 2; // 30-min slots
  const gridHeight = totalSlots * ROW_HEIGHT;
  const gridStartMin = gridStartHour * 60;
  const hours = Array.from({ length: gridEndHour - gridStartHour }, (_, i) => gridStartHour + i);

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      {/* Day headers (sticky) */}
      <div className="sticky top-0 z-10 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
        <div className="grid" style={{ gridTemplateColumns: `${GUTTER_WIDTH}px repeat(7, 1fr)` }}>
          <div className="p-2" />
          {DAYS.map(day => (
            <div key={day} className="p-2 text-center text-xs font-bold text-zinc-500 uppercase tracking-wider border-l border-zinc-100 dark:border-zinc-800">
              {DAY_SHORT[day]}
            </div>
          ))}
        </div>
      </div>

      {/* Time grid */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 420px)' }}>
        <div className="grid relative" style={{ gridTemplateColumns: `${GUTTER_WIDTH}px repeat(7, 1fr)`, height: gridHeight }}>
          {/* Time labels */}
          <div className="relative">
            {hours.map(h => (
              <div
                key={h}
                className="absolute right-2 text-[10px] font-mono text-zinc-400 -translate-y-1/2"
                style={{ top: (h - gridStartHour) * 2 * ROW_HEIGHT }}
              >
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {DAYS.map((day, dayIdx) => (
            <div key={day} className="relative border-l border-zinc-100 dark:border-zinc-800">
              {/* Hour grid lines */}
              {hours.map(h => (
                <div
                  key={h}
                  className="absolute w-full border-t border-zinc-50 dark:border-zinc-900"
                  style={{ top: (h - gridStartHour) * 2 * ROW_HEIGHT }}
                />
              ))}

              {/* Class blocks */}
              {blocks
                .filter(b => b.day === day)
                .map((block, i) => {
                  const top = ((block.startMin - gridStartMin) / 30) * ROW_HEIGHT;
                  const height = ((block.endMin - block.startMin) / 30) * ROW_HEIGHT;
                  const color = TIMETABLE_COLORS[block.cls.subject] ?? DEFAULT_COLOR;
                  const widthPct = 100 / block.colTotal;
                  const leftPct = block.colIndex * widthPct;

                  return (
                    <div
                      key={`${block.cls.id}-${day}-${i}`}
                      className={cn(
                        'absolute rounded-lg border-l-4 px-2 py-1 cursor-pointer text-white shadow-sm',
                        'hover:ring-2 hover:ring-offset-1 hover:ring-white/50 transition-all',
                        'overflow-hidden',
                        color,
                      )}
                      style={{
                        top,
                        height: Math.max(height, ROW_HEIGHT),
                        left: `${leftPct}%`,
                        width: `calc(${widthPct}% - 4px)`,
                        marginLeft: 2,
                      }}
                      onClick={() => onClassClick(block.cls.id)}
                    >
                      <p className="text-xs font-bold truncate">{block.cls.name}</p>
                      {height >= ROW_HEIGHT * 1.5 && (
                        <p className="text-[10px] opacity-80 truncate">{block.cls.tutor?.name ?? ''}</p>
                      )}
                      {height >= ROW_HEIGHT * 2 && block.cls.room && (
                        <p className="text-[10px] opacity-70 truncate">{block.cls.room}</p>
                      )}
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

Key implementation details:
- `parseTime("14:30")` → 870 minutes
- `computeOverlaps()` groups overlapping blocks per day and assigns column index/total for side-by-side layout
- Dynamic time range: scans all classes for earliest/latest time, adds ±1 hour padding
- Block height/top computed from minutes relative to grid start
- Tutor name and room are only shown if the block is tall enough (conditional on `height`)
- Colors defined as `TIMETABLE_COLORS` (vibrant bg + white text, separate from table's pale badges)

- [ ] **Step 2: Run lint**

```bash
cd sinaloka-platform && npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/components/ClassTimetable.tsx
git commit -m "feat(class): create ClassTimetable grid component"
```

---

## Task 3: Add view mode toggle and timetable rendering to Classes page

**Files:**
- Modify: `sinaloka-platform/src/pages/Classes.tsx`

- [ ] **Step 1: Add imports**

Add to the lucide-react import at line 4-17 (check what's already there, only add missing):
```typescript
import { Table2 } from 'lucide-react';
```

`Calendar` is already imported.

Add the timetable component import:
```typescript
import { ClassTimetable } from '../components/ClassTimetable';
```

- [ ] **Step 2: Add viewMode state**

Near the existing state declarations (around line 57-69), add:
```typescript
const [viewMode, setViewMode] = useState<'table' | 'timetable'>('table');
```

- [ ] **Step 3: Add second useClasses call for timetable**

After the existing `useClasses` call (line 88), add a full-list query for timetable mode:
```typescript
const { data: allClassesData } = useClasses(
  { page: 1, limit: 100 },
  viewMode === 'timetable'  // only fetch when timetable active
);
```

Check how `useClasses` handles the enabled parameter — if it doesn't support it as a second arg, the hook may need a small tweak. The simplest approach: always call `useClasses({ page: 1, limit: 100 })` and let React Query cache it. Use the data only when `viewMode === 'timetable'`.

Compute filtered classes for timetable:
```typescript
const allClasses = allClassesData?.data ?? [];
const filteredTimetableClasses = useMemo(() => {
  return allClasses.filter(c => {
    const tutorName = c.tutor?.name ?? '';
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tutorName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = !filterSubject || c.subject === filterSubject;
    const matchesAvailability = !showOnlyAvailable || c.status === 'ACTIVE';
    return matchesSearch && matchesSubject && matchesAvailability;
  });
}, [allClasses, searchQuery, filterSubject, showOnlyAvailable]);
```

- [ ] **Step 4: Add view mode toggle to filter bar**

In the filter bar section (around line 351, after the Active Only toggle's closing `</div>`), add:

```tsx
{/* View Mode Toggle */}
<div className="h-8 w-[1px] bg-zinc-200 dark:bg-zinc-800 mx-1" />
<div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
  <button
    onClick={() => setViewMode('table')}
    className={cn('p-1.5 rounded-md transition-all', viewMode === 'table' ? 'bg-white dark:bg-zinc-700 shadow-sm' : 'text-zinc-500')}
    title={t('classes.view.table')}
  >
    <Table2 size={16} />
  </button>
  <button
    onClick={() => setViewMode('timetable')}
    className={cn('p-1.5 rounded-md transition-all', viewMode === 'timetable' ? 'bg-white dark:bg-zinc-700 shadow-sm' : 'text-zinc-500')}
    title={t('classes.view.timetable')}
  >
    <Calendar size={16} />
  </button>
</div>
```

- [ ] **Step 5: Conditionally render table or timetable**

Find the `{/* Table */}` section (around line 355) where `<Card className="p-0 overflow-hidden relative">` begins. Wrap the entire table Card + pagination footer in a condition:

```tsx
{viewMode === 'table' ? (
  <>
    {/* Existing table Card with all its contents */}
    <Card className="p-0 overflow-hidden relative">
      {/* ... existing table code ... */}
    </Card>
    {/* Existing pagination footer */}
    <div className="p-4 border-t ...">
      {/* ... existing pagination ... */}
    </div>
  </>
) : (
  <ClassTimetable
    classes={filteredTimetableClasses}
    onClassClick={(id) => setSelectedClassId(id)}
  />
)}
```

The table Card starts around line 356 and the pagination footer ends around line 500. Wrap both in the ternary. The timetable branch renders `ClassTimetable` with filtered classes and the click handler.

- [ ] **Step 6: Run lint**

```bash
cd sinaloka-platform && npm run lint
```

Fix any TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add sinaloka-platform/src/pages/Classes.tsx
git commit -m "feat(class): add timetable view mode toggle to classes page"
```

---

## Verification

After all tasks are complete:

- [ ] Run frontend lint: `cd sinaloka-platform && npm run lint`
- [ ] Manual test: Open Classes page → see Table/Timetable toggle in filter bar → switch to Timetable → see colored blocks on weekly grid → click a block → drawer opens → switch back to Table → normal table view
- [ ] Test filters: Apply subject filter in timetable mode → only matching classes shown → apply search → filters work
- [ ] Test empty state: Filter to show no results → empty state message appears
- [ ] Test overlap: If two classes share the same day/time → blocks appear side by side
