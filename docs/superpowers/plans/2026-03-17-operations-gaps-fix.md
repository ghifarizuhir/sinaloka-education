# Operations Gaps Fix Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the week calendar view in the platform and add per-student notes to the tutor attendance page — two code gaps from the operations audit.

**Architecture:** Two independent frontend-only changes. The week calendar is a new component (`WeekCalendar.tsx`) integrated into `Schedules.tsx`. The tutor notes change adds an expandable input to `AttendancePage.tsx` with a handler wired in `App.tsx`. No backend changes needed.

**Tech Stack:** React, TypeScript, TailwindCSS v4, date-fns, Lucide icons

**Spec:** `docs/superpowers/specs/2026-03-17-operations-gaps-fix-design.md`

---

## Chunk 1: Week Calendar View

### Task 1: Create WeekCalendar component

**Files:**
- Create: `sinaloka-platform/src/components/WeekCalendar.tsx`

- [ ] **Step 1: Create the WeekCalendar component file**

```tsx
import React from 'react';
import { format, isSameDay, parseISO } from 'date-fns';
import { User } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Session, SessionStatus } from '@/src/types/session';

interface WeekCalendarProps {
  sessions: Session[];
  weekDays: Date[];
  onSelectSession: (sessionId: string) => void;
  getSubjectColor: (subject?: string) => string;
  getStatusBorder: (status: SessionStatus) => string;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8:00 - 21:00

export function WeekCalendar({
  sessions,
  weekDays,
  onSelectSession,
  getSubjectColor,
  getStatusBorder,
}: WeekCalendarProps) {
  return (
    <div className="flex-1 overflow-x-auto">
      <div className="min-w-[800px] h-full flex flex-col">
        {/* Day Headers */}
        <div className="flex border-b border-zinc-100 dark:border-zinc-800">
          <div className="w-20 shrink-0" />
          {weekDays.map((day) => (
            <div
              key={day.toString()}
              className="flex-1 text-center py-2 border-r border-zinc-100 dark:border-zinc-800 last:border-r-0"
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                {format(day, 'EEE')}
              </div>
              <div
                className={cn(
                  'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mx-auto mt-0.5',
                  isSameDay(day, new Date())
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'text-zinc-600 dark:text-zinc-400'
                )}
              >
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Timeline Grid */}
        <div className="flex-1 relative">
          <div className="absolute inset-0 flex flex-col">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="flex-1 border-b border-zinc-100 dark:border-zinc-800 flex"
              >
                {/* Time label */}
                <div className="w-20 shrink-0 border-r border-zinc-100 dark:border-zinc-800 flex items-start justify-center pt-2">
                  <span className="text-[10px] font-bold text-zinc-400">
                    {hour}:00
                  </span>
                </div>

                {/* Day columns */}
                {weekDays.map((day) => {
                  const cellSessions = sessions.filter((s) => {
                    try {
                      return (
                        isSameDay(parseISO(s.date), day) &&
                        parseInt(s.start_time.split(':')[0]) === hour
                      );
                    } catch {
                      return false;
                    }
                  });

                  return (
                    <div
                      key={day.toString()}
                      className="flex-1 relative p-0.5 space-y-0.5 border-r border-zinc-100 dark:border-zinc-800 last:border-r-0"
                    >
                      {cellSessions.map((s) => {
                        const isCancelled = s.status === 'CANCELLED';
                        return (
                          <div
                            key={s.id}
                            onClick={() => onSelectSession(s.id)}
                            className={cn(
                              'rounded-md p-1.5 border shadow-sm text-[9px] cursor-pointer hover:scale-[1.02] transition-all',
                              isCancelled
                                ? 'bg-zinc-50 dark:bg-zinc-900 text-zinc-400 border-zinc-100 dark:border-zinc-800 line-through'
                                : getSubjectColor(s.class?.subject),
                              !isCancelled && getStatusBorder(s.status)
                            )}
                          >
                            <div className="font-bold truncate">
                              {s.class?.name ?? '—'}
                            </div>
                            <div className="opacity-70">
                              {s.start_time} - {s.end_time}
                            </div>
                            {s.class?.tutor && (
                              <div className="mt-0.5 flex items-center gap-0.5 truncate">
                                <User size={7} /> {s.class.tutor.name}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd sinaloka-platform && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors related to `WeekCalendar.tsx`

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/components/WeekCalendar.tsx
git commit -m "feat(platform): add WeekCalendar component"
```

---

### Task 2: Integrate WeekCalendar into Schedules.tsx

**Files:**
- Modify: `sinaloka-platform/src/pages/Schedules.tsx:1` (add import)
- Modify: `sinaloka-platform/src/pages/Schedules.tsx:575-587` (replace placeholder)

- [ ] **Step 1: Add the import**

At the top of `Schedules.tsx`, after the existing component imports (around line 37-41), add:

```typescript
import { WeekCalendar } from '../components/WeekCalendar';
```

- [ ] **Step 2: Replace the week view placeholder**

Replace lines 575-587 (the `{/* Week View Placeholder */}` block):

```tsx
          {/* Week View Placeholder */}
          {calendarMode === 'week' && (
            <div className="flex-1 flex items-center justify-center p-12 text-center">
              <div className="max-w-xs">
                <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-zinc-400">
                  <LayoutGrid size={32} />
                </div>
                <h4 className="font-bold mb-2">{t('schedules.calendar.weeklyOverview')}</h4>
                <p className="text-sm text-zinc-500">{t('schedules.calendar.weeklyOverviewDesc')}</p>
                <Button variant="outline" className="mt-4" onClick={() => setCalendarMode('month')}>{t('schedules.calendar.backToMonthView')}</Button>
              </div>
            </div>
          )}
```

With:

```tsx
          {/* Week View */}
          {calendarMode === 'week' && (
            <WeekCalendar
              sessions={sessions}
              weekDays={weekDays}
              onSelectSession={setSelectedSessionId}
              getSubjectColor={getSubjectColor}
              getStatusBorder={getStatusBorder}
            />
          )}
```

- [ ] **Step 3: Verify compilation**

Run: `cd sinaloka-platform && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/pages/Schedules.tsx
git commit -m "feat(platform): replace week view placeholder with WeekCalendar"
```

---

## Chunk 2: Per-Student Notes in Tutor Attendance

### Task 3: Add onSetNote handler to App.tsx

**Files:**
- Modify: `sinaloka-tutors/src/App.tsx:69-75` (add handler next to existing ones)
- Modify: `sinaloka-tutors/src/App.tsx:123-135` (pass new prop to AttendancePage)

- [ ] **Step 1: Add the handleSetNote function**

In `sinaloka-tutors/src/App.tsx`, after `handleToggleHomework` (line 75), add:

```typescript
  const handleSetNote = (_classId: string, studentId: string, note: string) => {
    setStudents((prev) => prev.map((st) => st.id === studentId ? { ...st, note } : st));
  };
```

- [ ] **Step 2: Pass onSetNote prop to AttendancePage**

In the `<AttendancePage>` render block (around lines 123-135), add the new prop after `onToggleHomework`:

```tsx
          onSetNote={handleSetNote}
```

So the block becomes:

```tsx
        <AttendancePage
          selectedClass={selectedClass}
          students={students}
          tutorName={tutorName}
          topicCovered={topicCovered}
          sessionSummary={sessionSummary}
          onSetTopicCovered={setTopicCovered}
          onSetSessionSummary={setSessionSummary}
          onToggleAttendance={handleToggleAttendance}
          onToggleHomework={handleToggleHomework}
          onSetNote={handleSetNote}
          onFinish={handleFinishAttendance}
          onClose={() => setSelectedClassId(null)}
        />
```

- [ ] **Step 3: Commit** (will compile after Task 4)

Hold commit — this will fail type-check until AttendancePage accepts the prop.

---

### Task 4: Add expandable notes UI to AttendancePage

**Files:**
- Modify: `sinaloka-tutors/src/pages/AttendancePage.tsx`

- [ ] **Step 1: Update imports and props interface**

In `AttendancePage.tsx`, add `MessageSquare` to the Lucide import (line 2):

```typescript
import { Calendar as CalendarIcon, CheckCircle2, X, Clock, MessageSquare } from 'lucide-react';
```

Add `useState` to the React import (line 1):

```typescript
import React, { useState } from 'react';
```

Add `onSetNote` to `AttendancePageProps` (after line 17):

```typescript
  onSetNote: (classId: string, studentId: string, note: string) => void;
```

Add `onSetNote` to the destructured props (after line 32, `onToggleHomework`):

```typescript
  onSetNote,
```

- [ ] **Step 2: Add expandedNotes state**

Inside the component, after the `presentCount` line (line 35), add:

```typescript
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const toggleNoteExpanded = (studentId: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };
```

- [ ] **Step 3: Add notes toggle button and expandable input**

In each student card, replace the homework section (lines 127-137):

```tsx
              <div className="flex items-center pt-4 border-t border-zinc-800">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={student.homeworkDone || false}
                    onChange={() => onToggleHomework(selectedClass.id, student.id)}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-lime-400 focus:ring-lime-400/20"
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">HW Done</span>
                </div>
              </div>
```

With:

```tsx
              <div className="pt-4 border-t border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={student.homeworkDone || false}
                      onChange={() => onToggleHomework(selectedClass.id, student.id)}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-lime-400 focus:ring-lime-400/20"
                    />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">HW Done</span>
                  </div>
                  <button
                    onClick={() => toggleNoteExpanded(student.id)}
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center transition-all border',
                      student.note
                        ? 'text-lime-400 border-lime-400/30 bg-lime-400/10'
                        : 'text-zinc-500 border-zinc-700 bg-zinc-800'
                    )}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                </div>
                {expandedNotes.has(student.id) && (
                  <input
                    type="text"
                    value={student.note || ''}
                    onChange={(e) => onSetNote(selectedClass.id, student.id, e.target.value)}
                    placeholder="Add note..."
                    maxLength={500}
                    className="w-full px-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-lime-400 transition-all text-white text-sm"
                  />
                )}
              </div>
```

- [ ] **Step 4: Verify compilation**

Run: `cd sinaloka-tutors && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 5: Commit both Task 3 and Task 4**

```bash
git add sinaloka-tutors/src/App.tsx sinaloka-tutors/src/pages/AttendancePage.tsx
git commit -m "feat(tutors): add per-student notes to attendance page"
```

---

## Chunk 3: Verification

### Task 5: Build verification

**Files:** None (verification only)

- [ ] **Step 1: Build platform**

Run: `cd sinaloka-platform && npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 2: Build tutors**

Run: `cd sinaloka-tutors && npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Manual smoke test checklist**

If dev servers are running, verify:

1. **Platform week view:** Navigate to Schedules → Calendar → click Week tab → should show 7-column timeline grid instead of placeholder
2. **Platform week view interaction:** Click a session block → drawer should open with session details
3. **Platform week view navigation:** Click prev/next week → grid updates to show different week
4. **Tutor notes:** Open attendance for a session → each student card should show a notes icon button next to "HW Done"
5. **Tutor notes expand:** Tap the notes icon → text input should appear below
6. **Tutor notes persist:** Type a note → finalize → note should be sent in the API payload (check network tab)
