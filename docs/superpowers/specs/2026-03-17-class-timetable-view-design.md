# Class Timetable View

> Date: 2026-03-17

## Problem

The Classes page only has a table view. Admins cannot visually see how classes are distributed across the week. To understand schedule overlaps or gaps, they must mentally parse text like "Mon, Wed, Fri 14:00-15:30" for each class. A visual timetable would make this immediately obvious.

## Solution

Add a timetable view mode to the Classes page. Toggle between table (current) and timetable via a button group in the filter bar. The timetable renders a weekly schedule grid from class data — not session records.

## Detailed Design

### Layout

Vertical axis = time slots (rows), horizontal axis = days of the week (columns). Similar to a school timetable or Google Calendar week view.

```
         | Mon       | Tue       | Wed       | Thu       | Fri       | Sat | Sun
---------|-----------|-----------|-----------|-----------|-----------|-----|----
09:00    |           |           |           |           |           |     |
10:00    | Math 101  |           | Math 101  |           | Math 101  |     |
         | Mr. Budi  |           | Mr. Budi  |           | Mr. Budi  |     |
11:00    | Room A    |           | Room A    |           | Room A    |     |
11:30    |           |           |           |           |           |     |
12:00    |           |           |           | English   |           |     |
         |           |           |           | Ms. Sari  |           |     |
13:00    |           |           |           | Room B    |           |     |
14:00    | Physics   |           |           |           | Physics   |     |
         | Mr. Andi  |           |           |           | Mr. Andi  |     |
15:00    | Room C    |           |           |           | Room C    |     |
```

### Time Format

All schedule times (`schedule_start_time`, `schedule_end_time`) are stored as `"HH:mm"` 24-hour format strings (e.g., `"14:00"`, `"09:30"`). This is enforced by the backend DTO regex validation. The timetable component parses these by splitting on `:` to get hours and minutes for pixel positioning.

### Time Axis (Vertical)

- Each row = 30 minutes. Pixel height per 30 minutes: 48px (configurable constant). So 1 hour = 96px.
- Range is dynamic: earliest class `start_time` minus 1 hour, to latest class `end_time` plus 1 hour
- If no classes exist, show a default range (08:00-17:00)
- Time labels shown on the left gutter (width: 60px) for each full hour (08:00, 09:00, 10:00...)
- Content area scrolls vertically if range exceeds viewport height

### Day Axis (Horizontal)

- 7 columns: Monday through Sunday
- Equal width columns (`flex-1` or `grid-cols-7`)
- All 7 days always visible (empty columns for days with no classes)
- Day header row is sticky (`position: sticky; top: 0; z-index: 10`) within a single scroll container that has `overflow-y: auto`

### Container Structure (for sticky headers + scroll)

```
<div className="relative">
  {/* Sticky day headers */}
  <div className="sticky top-0 z-10 grid grid-cols-[60px_repeat(7,1fr)] bg-white dark:bg-zinc-950 border-b">
    <div /> {/* time gutter spacer */}
    <div>Mon</div> <div>Tue</div> ... <div>Sun</div>
  </div>
  {/* Scrollable time grid */}
  <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
    <div className="grid grid-cols-[60px_repeat(7,1fr)] relative">
      {/* Time labels + day columns with absolute-positioned blocks */}
    </div>
  </div>
</div>
```

On small screens, wrap the entire thing in an `overflow-x-auto` container so it scrolls horizontally.

### Class Blocks

- Positioned absolutely within each day column based on `schedule_start_time` and `schedule_end_time`
- Top position: `(startMinutes - gridStartMinutes) / 30 * ROW_HEIGHT` px
- Height: `(endMinutes - startMinutes) / 30 * ROW_HEIGHT` px
- Each block displays:
  - Class name (bold, truncated with `text-ellipsis overflow-hidden`)
  - Tutor name (small text)
  - Room (small text, if set)
- A single class with multiple `schedule_days` renders as identical blocks in each day column
- Rounded corners (`rounded-lg`), subtle border, hover effect (`hover:ring-2 ring-offset-1`)
- Cursor pointer on hover

### Block Colors

Define a separate `TIMETABLE_COLORS` map for blocks (distinct from the table's pale badge colors which would be too subtle for filled blocks):

```typescript
const TIMETABLE_COLORS: Record<string, string> = {
  Mathematics: 'bg-blue-500 text-white',
  Science: 'bg-emerald-500 text-white',
  English: 'bg-amber-500 text-white',
  History: 'bg-purple-500 text-white',
};
const DEFAULT_TIMETABLE_COLOR = 'bg-zinc-500 text-white';
```

This is defined inside `ClassTimetable.tsx` (no need to share with Classes.tsx).

### Interactions

- **Click block** → Calls `onClassClick(cls.id)` prop, which sets `selectedClassId` in Classes.tsx and opens the class detail drawer
- **Hover** → `hover:ring-2 ring-offset-1` highlight
- No drag-and-drop, no inline editing

### Overlap Handling

When 2+ classes occupy overlapping time slots on the same day, split the day column. Each overlapping class gets an equal fraction of the column width (side by side). Implementation:
1. Group classes per day
2. For each day, detect overlap clusters (classes where `startA < endB && startB < endA`)
3. Within each cluster, assign each class a column index and total column count
4. Block width = `100% / totalColumns`, left offset = `columnIndex * (100% / totalColumns)`

### View Mode Toggle

Follow the Tutors.tsx pattern — button group in the filter bar:
- `Table2` icon = table view (default)
- `Calendar` icon = timetable view
- Styled as: `flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg` with active state `bg-white dark:bg-zinc-700 shadow-sm`
- Placed after the "Active Only" toggle, separated by a vertical divider `<div className="h-8 w-[1px] bg-zinc-200 dark:bg-zinc-800 mx-1" />`

State: `const [viewMode, setViewMode] = useState<'table' | 'timetable'>('table');`

When `viewMode === 'timetable'`:
- Table + pagination footer are hidden
- Timetable component is shown instead
- Stats cards and filter bar remain visible

### Filters

All existing filters (search, subject, active only) apply to both views. The timetable only renders classes that pass the current filter criteria.

### Data Source

**Important:** The table view uses paginated data (`useClasses` with `{ page, limit: 20 }`). The timetable needs ALL classes to show a complete schedule.

When `viewMode === 'timetable'`, use a separate query: `useClasses({ limit: 100 })` (same pattern as Schedules.tsx and Enrollments.tsx which also need full class lists). This fetches all classes without pagination.

The timetable applies the same client-side filters (search, subject, active only) that the table uses via `filteredClasses`.

Implementation: two `useClasses` calls — the paginated one for table view, the full one for timetable view. Only the active view's query runs (use `enabled: viewMode === 'table'` and `enabled: viewMode === 'timetable'` respectively).

## File Structure

### New file: `sinaloka-platform/src/components/ClassTimetable.tsx`

Dedicated component for the timetable grid. Receives `classes` array and `onClassClick` callback as props. Responsible for:
- Computing time range from class data
- Rendering the grid (time labels, day columns, class blocks)
- Positioning blocks based on time
- Handling overlap detection and layout
- Defining `TIMETABLE_COLORS` color map

Props interface:
```typescript
interface ClassTimetableProps {
  classes: Class[];
  onClassClick: (classId: string) => void;
}
```

### Modified: `sinaloka-platform/src/pages/Classes.tsx`

- Add `viewMode` state and toggle UI in filter bar
- Add second `useClasses({ limit: 100 })` call for timetable (enabled only when timetable active)
- Import and render `ClassTimetable` when `viewMode === 'timetable'`
- Hide table + pagination when timetable is active
- Pass filtered classes and `setSelectedClassId` to the component

### Modified: `sinaloka-platform/src/locales/en.json` and `id.json`

Add i18n keys:
```
English:
"classes.view.table": "Table"
"classes.view.timetable": "Timetable"
"classes.timetable.empty": "No classes to display in timetable"

Indonesian:
"classes.view.table": "Tabel"
"classes.view.timetable": "Jadwal"
"classes.timetable.empty": "Tidak ada kelas untuk ditampilkan"
```

### No backend changes

## Edge Cases

- **No classes after filtering**: Show empty state message in the timetable area (centered text with icon, same pattern as table empty state)
- **Class with missing schedule data**: Skip rendering (defensive, schedule_days is required)
- **Very early/late classes**: Dynamic range handles this (±1 hour padding)
- **Many overlapping classes**: Side-by-side split works for 2-3 overlaps. For 4+ (unlikely in a bimbel), blocks become narrow but still clickable — truncated text with full info in the drawer
- **ARCHIVED classes**: Filtered out when "Active Only" toggle is on (default). If shown, render with reduced opacity (`opacity-50`)
- **Mobile/responsive**: Outer container has `overflow-x-auto` for horizontal scroll on small screens
- **All classes on same day**: Works fine — all blocks stack in that day's column with overlap handling
