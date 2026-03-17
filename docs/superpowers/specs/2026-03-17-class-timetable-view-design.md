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

### Time Axis (Vertical)

- Rows represent 30-minute increments
- Range is dynamic: earliest class `start_time` minus 1 hour, to latest class `end_time` plus 1 hour
- If no classes exist, show a default range (08:00-17:00)
- Time labels shown on the left gutter for each full hour (08:00, 09:00, 10:00...)
- Scroll vertically if range exceeds viewport

### Day Axis (Horizontal)

- 7 columns: Monday through Sunday
- Equal width columns
- All 7 days always visible (empty columns for days with no classes)
- Day headers fixed at top during vertical scroll

### Class Blocks

- Positioned absolutely within the day column based on `schedule_start_time` and `schedule_end_time`
- Height proportional to duration (a 90-minute class is 3× taller than a 30-minute class)
- Each block displays:
  - Class name (bold, truncated if needed)
  - Tutor name (small text)
  - Room (small text, if set)
- Color-coded by subject using the same color mapping as the table view's subject badges
- A single class with multiple `schedule_days` renders as identical blocks in each day column
- Rounded corners, subtle shadow, hover effect (slight scale or border highlight)

### Interactions

- **Click block** → Opens the class detail drawer (same as clicking a row in table view, using `setSelectedClassId(cls.id)`)
- **Hover** → Subtle highlight effect on the block
- No drag-and-drop, no inline editing

### Overlap Handling

When 2+ classes occupy the same time slot on the same day, split the day column horizontally. Each overlapping class gets an equal fraction of the column width (side by side). This is the standard calendar overlap pattern.

### View Mode Toggle

Follow the Tutors.tsx pattern — button group in the filter bar:
- `Table2` icon = table view (default)
- `Calendar` icon = timetable view
- Styled as: `flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg` with active state `bg-white dark:bg-zinc-700 shadow-sm`
- Placed after the "Active Only" toggle, separated by a vertical divider

State: `const [viewMode, setViewMode] = useState<'table' | 'timetable'>('table');`

### Filters

All existing filters (search, subject, active only) apply to both views. The timetable only renders classes that pass the current filter criteria. This uses the same `filteredClasses` array that the table uses.

### Data Source

Uses the existing `useClasses` hook data. Each class has `schedule_days: string[]`, `schedule_start_time: string`, `schedule_end_time: string`. No new API endpoints needed.

## File Structure

### New file: `sinaloka-platform/src/components/ClassTimetable.tsx`

Dedicated component for the timetable grid. Receives `classes` array and `onClassClick` callback as props. Responsible for:
- Computing time range from class data
- Rendering the grid (time labels, day columns, class blocks)
- Positioning blocks based on time
- Handling overlap detection and layout

Props interface:
```typescript
interface ClassTimetableProps {
  classes: Class[];
  onClassClick: (classId: string) => void;
}
```

### Modified: `sinaloka-platform/src/pages/Classes.tsx`

- Add `viewMode` state and toggle UI in filter bar
- Import and render `ClassTimetable` when `viewMode === 'timetable'`
- Pass `filteredClasses` and `setSelectedClassId` to the component

### Modified: `sinaloka-platform/src/locales/en.json` and `id.json`

Add i18n keys for toggle labels.

### No backend changes

## Edge Cases

- **No classes after filtering**: Show empty state message in the timetable area (same pattern as table empty state)
- **Class with missing schedule data**: Skip rendering (defensive, schedule_days is required)
- **Very early/late classes**: Dynamic range handles this automatically
- **Many overlapping classes**: Side-by-side split works for 2-3 overlaps. For 4+ overlaps (unlikely in a bimbel), blocks become narrow but still clickable — truncated text with full info in the drawer
- **ARCHIVED classes**: Filtered out when "Active Only" toggle is on (default behavior). If shown, render with reduced opacity
- **Mobile/responsive**: On small screens, timetable scrolls horizontally. Day headers remain sticky
