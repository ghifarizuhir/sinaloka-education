# Student Attendance History — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-student attendance history via a new Student Detail page, with a dedicated backend endpoint.

**Architecture:** New `GET /api/admin/students/:id/attendance` endpoint in `student.controller.ts` delegates to `attendance.service.ts`. New `/students/:id` frontend route renders a tabbed detail page (Profile + Attendance). Existing StudentDrawer gets a "Lihat Detail" navigation button.

**Tech Stack:** NestJS, Prisma, Zod (backend); React, TanStack Query, Tailwind CSS (frontend)

**Spec:** `docs/superpowers/specs/2026-03-23-student-attendance-history-design.md`

---

## File Structure

### Backend (sinaloka-backend)

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/modules/attendance/attendance.dto.ts` | Add `StudentAttendanceQuerySchema` |
| Modify | `src/modules/attendance/attendance.service.ts` | Add `findByStudent()` method |
| Modify | `src/modules/student/student.controller.ts` | Add `GET :id/attendance` route |
| Modify | `src/modules/student/student.module.ts` | Import `AttendanceModule` |
| Modify | `src/modules/attendance/attendance.service.spec.ts` | Tests for `findByStudent()` |

### Frontend (sinaloka-platform)

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/types/attendance.ts` | Add `StudentAttendanceResponse` type |
| Modify | `src/services/attendance.service.ts` | Add `getByStudent()` method |
| Modify | `src/hooks/useAttendance.ts` | Add `useStudentAttendance()` hook |
| Create | `src/pages/Students/StudentDetail.tsx` | Detail page with tabs |
| Create | `src/pages/Students/StudentProfileTab.tsx` | Profile tab content |
| Create | `src/pages/Students/StudentAttendanceTab.tsx` | Attendance tab content |
| Modify | `src/pages/Students/StudentDrawer.tsx` | Add "Lihat Detail" button |
| Modify | `src/App.tsx` | Add `/students/:id` route |
| Modify | `src/pages/Attendance.tsx` | Remove "View History" stub button |

---

## Task 1: Backend — DTO & Service Method

**Files:**
- Modify: `sinaloka-backend/src/modules/attendance/attendance.dto.ts`
- Modify: `sinaloka-backend/src/modules/attendance/attendance.service.ts`

- [ ] **Step 1: Add Zod schema to attendance DTO**

Add to the end of `sinaloka-backend/src/modules/attendance/attendance.dto.ts`:

```typescript
export const StudentAttendanceQuerySchema = z.object({
  date_from: z.coerce.date(),
  date_to: z.coerce.date(),
});
export type StudentAttendanceQueryDto = z.infer<typeof StudentAttendanceQuerySchema>;
```

- [ ] **Step 2: Add `findByStudent` method to attendance service**

Add to the end of `AttendanceService` class in `sinaloka-backend/src/modules/attendance/attendance.service.ts`, before the closing `}`:

```typescript
async findByStudent(
  institutionId: string,
  studentId: string,
  query: StudentAttendanceQueryDto,
) {
  const { date_from, date_to } = query;

  const records = await this.prisma.attendance.findMany({
    where: {
      institution_id: institutionId,
      student_id: studentId,
      session: {
        date: { gte: date_from, lte: date_to },
      },
    },
    include: {
      session: {
        select: {
          id: true,
          date: true,
          start_time: true,
          end_time: true,
          status: true,
          class: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { session: { date: 'desc' } },
  });

  const total_sessions = records.length;
  const present = records.filter((r) => r.status === 'PRESENT').length;
  const absent = records.filter((r) => r.status === 'ABSENT').length;
  const late = records.filter((r) => r.status === 'LATE').length;
  const attendance_rate =
    total_sessions > 0
      ? Math.round(((present + late) / total_sessions) * 100 * 100) / 100
      : 0;

  return {
    summary: { total_sessions, present, absent, late, attendance_rate },
    records,
  };
}
```

Add the import at the top of the file:

```typescript
import type { StudentAttendanceQueryDto } from './attendance.dto.js';
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-backend/src/modules/attendance/attendance.dto.ts sinaloka-backend/src/modules/attendance/attendance.service.ts
git commit -m "feat(backend): add findByStudent attendance service method and DTO"
```

---

## Task 2: Backend — Controller Route & Module Wiring

**Files:**
- Modify: `sinaloka-backend/src/modules/student/student.controller.ts`
- Modify: `sinaloka-backend/src/modules/student/student.module.ts`

- [ ] **Step 1: Import AttendanceModule in StudentModule**

In `sinaloka-backend/src/modules/student/student.module.ts`, add:

```typescript
import { AttendanceModule } from '../attendance/attendance.module.js';

@Module({
  imports: [AttendanceModule],
  controllers: [StudentController],
  providers: [StudentService],
  exports: [StudentService],
})
export class StudentModule {}
```

- [ ] **Step 2: Add route to StudentController**

In `sinaloka-backend/src/modules/student/student.controller.ts`, add imports:

```typescript
import { AttendanceService } from '../attendance/attendance.service.js';
import { StudentAttendanceQuerySchema } from '../attendance/attendance.dto.js';
import type { StudentAttendanceQueryDto } from '../attendance/attendance.dto.js';
```

Add `AttendanceService` to the constructor:

```typescript
constructor(
  private readonly studentService: StudentService,
  private readonly attendanceService: AttendanceService,
) {}
```

Add the route method **before** the `@Get(':id')` method (so `:id/attendance` is matched before `:id`):

```typescript
@Get(':id/attendance')
async getStudentAttendance(
  @InstitutionId() institutionId: string,
  @Param('id') id: string,
  @Query(new ZodValidationPipe(StudentAttendanceQuerySchema)) query: StudentAttendanceQueryDto,
) {
  // Verify student exists and belongs to tenant
  await this.studentService.findOne(institutionId, id);
  return this.attendanceService.findByStudent(institutionId, id, query);
}
```

- [ ] **Step 3: Verify build**

```bash
cd sinaloka-backend && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/student/student.controller.ts sinaloka-backend/src/modules/student/student.module.ts
git commit -m "feat(backend): add GET /admin/students/:id/attendance endpoint"
```

---

## Task 3: Backend — Unit Tests

**Files:**
- Modify: `sinaloka-backend/src/modules/attendance/attendance.service.spec.ts`

- [ ] **Step 1: Add test for findByStudent**

Add a new `describe('findByStudent')` block in `attendance.service.spec.ts`:

```typescript
describe('findByStudent', () => {
  const studentId = 'student-uuid-1';
  const query = {
    date_from: new Date('2026-03-01'),
    date_to: new Date('2026-03-31'),
  };

  it('should return summary and records for a student', async () => {
    const mockRecords = [
      { id: 'att-1', status: 'PRESENT', student_id: studentId, session: { id: 's1', date: '2026-03-20', start_time: '10:00', end_time: '11:00', status: 'COMPLETED', class: { id: 'c1', name: 'Math' } } },
      { id: 'att-2', status: 'ABSENT', student_id: studentId, session: { id: 's2', date: '2026-03-18', start_time: '10:00', end_time: '11:00', status: 'COMPLETED', class: { id: 'c1', name: 'Math' } } },
      { id: 'att-3', status: 'LATE', student_id: studentId, session: { id: 's3', date: '2026-03-15', start_time: '10:00', end_time: '11:00', status: 'COMPLETED', class: { id: 'c1', name: 'Math' } } },
    ];

    mockPrisma.attendance.findMany.mockResolvedValue(mockRecords);

    const result = await service.findByStudent(institutionId, studentId, query);

    expect(result.summary).toEqual({
      total_sessions: 3,
      present: 1,
      absent: 1,
      late: 1,
      attendance_rate: 66.67,
    });
    expect(result.records).toHaveLength(3);
    expect(mockPrisma.attendance.findMany).toHaveBeenCalledWith({
      where: {
        institution_id: institutionId,
        student_id: studentId,
        session: { date: { gte: query.date_from, lte: query.date_to } },
      },
      include: {
        session: {
          select: {
            id: true,
            date: true,
            start_time: true,
            end_time: true,
            status: true,
            class: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { session: { date: 'desc' } },
    });
  });

  it('should return zero rate when no records exist', async () => {
    mockPrisma.attendance.findMany.mockResolvedValue([]);

    const result = await service.findByStudent(institutionId, studentId, query);

    expect(result.summary).toEqual({
      total_sessions: 0,
      present: 0,
      absent: 0,
      late: 0,
      attendance_rate: 0,
    });
    expect(result.records).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd sinaloka-backend && npm run test -- --testPathPattern=attendance.service
```

Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add sinaloka-backend/src/modules/attendance/attendance.service.spec.ts
git commit -m "test(backend): add findByStudent unit tests"
```

---

## Task 4: Frontend — Types, Service & Hook

**Files:**
- Modify: `sinaloka-platform/src/types/attendance.ts`
- Modify: `sinaloka-platform/src/services/attendance.service.ts`
- Modify: `sinaloka-platform/src/hooks/useAttendance.ts`

- [ ] **Step 1: Add types**

Add to the end of `sinaloka-platform/src/types/attendance.ts`:

```typescript
export interface StudentAttendanceSummary {
  total_sessions: number;
  present: number;
  absent: number;
  late: number;
  attendance_rate: number;
}

export interface StudentAttendanceRecord {
  id: string;
  session_id: string;
  status: AttendanceStatus;
  homework_done: boolean;
  notes: string | null;
  session: {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    status: string;
    class: { id: string; name: string };
  };
}

export interface StudentAttendanceResponse {
  summary: StudentAttendanceSummary;
  records: StudentAttendanceRecord[];
}

export interface StudentAttendanceParams {
  date_from: string;
  date_to: string;
}
```

- [ ] **Step 2: Add service method**

Add to `attendanceService` object in `sinaloka-platform/src/services/attendance.service.ts`:

```typescript
getByStudent: (studentId: string, params: StudentAttendanceParams) =>
  api.get<StudentAttendanceResponse>(`/api/admin/students/${studentId}/attendance`, { params }).then((r) => r.data),
```

Update the existing import line at the top of the file from:

```typescript
import type { Attendance, UpdateAttendanceDto, AttendanceQueryParams, AttendanceSummaryParams } from '@/src/types/attendance';
```

To:

```typescript
import type { Attendance, UpdateAttendanceDto, AttendanceQueryParams, AttendanceSummaryParams, StudentAttendanceParams, StudentAttendanceResponse } from '@/src/types/attendance';
```

- [ ] **Step 3: Add hook**

Add to `sinaloka-platform/src/hooks/useAttendance.ts`:

```typescript
export function useStudentAttendance(studentId: string, params: { date_from: string; date_to: string }) {
  return useQuery({
    queryKey: ['attendance', 'student', studentId, params],
    queryFn: () => attendanceService.getByStudent(studentId, params),
    enabled: !!studentId && !!params.date_from && !!params.date_to,
  });
}
```

Add the import:

```typescript
import type { AttendanceSummaryParams, StudentAttendanceParams } from '@/src/types/attendance';
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/types/attendance.ts sinaloka-platform/src/services/attendance.service.ts sinaloka-platform/src/hooks/useAttendance.ts
git commit -m "feat(platform): add student attendance types, service, and hook"
```

---

## Task 5: Frontend — Student Detail Page (Profile Tab)

**Files:**
- Create: `sinaloka-platform/src/pages/Students/StudentProfileTab.tsx`
- Create: `sinaloka-platform/src/pages/Students/StudentDetail.tsx`
- Modify: `sinaloka-platform/src/App.tsx`

- [ ] **Step 1: Create ProfileTab component**

Create `sinaloka-platform/src/pages/Students/StudentProfileTab.tsx`:

```tsx
import React from 'react';
import { Mail, Phone, Calendar, UserPlus } from 'lucide-react';
import { Card, Button, Badge, Avatar } from '../../components/UI';
import { formatDate } from '../../lib/utils';
import type { Student } from '@/src/types/student';
import { useTranslation } from 'react-i18next';

interface StudentProfileTabProps {
  student: Student;
  onInviteParent: (student: Student) => void;
  inviteIsPending: boolean;
}

export const StudentProfileTab: React.FC<StudentProfileTabProps> = ({
  student,
  onInviteParent,
  inviteIsPending,
}) => {
  const { t, i18n } = useTranslation();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Contact Info */}
      <Card className="p-6">
        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">
          {t('students.drawer.contactInfo')}
        </h4>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
            <Mail size={18} className="text-zinc-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-400 uppercase font-bold">{t('students.drawer.email')}</span>
              <span className="text-sm dark:text-zinc-200">{student.email ?? '—'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
            <Phone size={18} className="text-zinc-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-400 uppercase font-bold">{t('students.drawer.phone')}</span>
              <span className="text-sm dark:text-zinc-200">{student.phone ?? '—'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
            <Calendar size={18} className="text-zinc-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-400 uppercase font-bold">{t('students.drawer.enrolledDate')}</span>
              <span className="text-sm dark:text-zinc-200">
                {formatDate(student.enrolled_at ?? student.created_at, i18n.language)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Parent / Guardian */}
      <Card className="p-6">
        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">
          {t('students.drawer.parentGuardian')}
        </h4>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar name={student.parent_name ?? 'P'} size="md" />
            <div>
              <p className="text-sm font-bold dark:text-zinc-200">{student.parent_name ?? '—'}</p>
              <p className="text-xs text-zinc-500">{t('students.drawer.primaryContact')}</p>
              <span className="text-xs text-zinc-400">{student.parent_email ?? ''}</span>
            </div>
          </div>
          {student.parent_phone && (
            <Button size="sm" variant="outline" className="h-8 w-8 p-0 justify-center">
              <Phone size={14} />
            </Button>
          )}
        </div>
        {student.parent_email ? (
          <Button
            className="w-full justify-center gap-2"
            variant="secondary"
            onClick={() => onInviteParent(student)}
            disabled={inviteIsPending}
          >
            <UserPlus size={16} />
            {inviteIsPending ? t('students.drawer.sending') : t('students.drawer.inviteParent')}
          </Button>
        ) : (
          <p className="text-xs text-zinc-500 text-center">{t('students.drawer.noParentEmail')}</p>
        )}
      </Card>
    </div>
  );
};
```

- [ ] **Step 2: Create StudentDetail page shell**

Create `sinaloka-platform/src/pages/Students/StudentDetail.tsx`:

```tsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button, Badge, Avatar, PageHeader } from '../../components/UI';
import { cn } from '../../lib/utils';
import { useStudent } from '@/src/hooks/useStudents';
import { useInviteParent } from '@/src/hooks/useParents';
import { StudentProfileTab } from './StudentProfileTab';
import { StudentAttendanceTab } from './StudentAttendanceTab';

const TABS = ['profile', 'attendance'] as const;
type Tab = (typeof TABS)[number];

export const StudentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  const { data: student, isLoading } = useStudent(id ?? '');
  const inviteParent = useInviteParent();

  const handleInviteParent = async (s: any) => {
    try {
      await inviteParent.mutateAsync(s.id);
      toast.success(t('students.drawer.inviteSent'));
    } catch {
      toast.error(t('students.drawer.inviteError'));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
        <div className="h-64 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-20 text-zinc-500">
        {t('students.notFound', 'Student not found')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 justify-center"
              onClick={() => navigate('/students')}
            >
              <ArrowLeft size={16} />
            </Button>
            <Avatar name={student.name} size="md" />
            <div>
              <div className="flex items-center gap-2">
                <span>{student.name}</span>
                <Badge variant={student.status === 'ACTIVE' ? 'success' : 'default'}>
                  {student.status === 'ACTIVE' ? t('common.active') : t('common.inactive')}
                </Badge>
              </div>
              <p className="text-sm font-normal text-zinc-500">{student.grade}</p>
            </div>
          </div>
        }
      />

      {/* Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <nav className="flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'pb-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab
                  ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              )}
            >
              {t(`students.detail.tabs.${tab}`, tab.charAt(0).toUpperCase() + tab.slice(1))}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <StudentProfileTab
          student={student}
          onInviteParent={handleInviteParent}
          inviteIsPending={inviteParent.isPending}
        />
      )}
      {activeTab === 'attendance' && (
        <StudentAttendanceTab studentId={student.id} />
      )}
    </div>
  );
};
```

- [ ] **Step 3: Add route to App.tsx**

In `sinaloka-platform/src/App.tsx`, add import:

```typescript
import { StudentDetail } from './pages/Students/StudentDetail';
```

Add route inside the `<Route element={<Layout />}>` block, directly after the existing `/students` route (after line 100 in current App.tsx):

```tsx
<Route path="/students/:id" element={<StudentDetail />} />
```

- [ ] **Step 4: Verify build**

```bash
cd sinaloka-platform && npm run lint
```

Note: Build will fail until `StudentAttendanceTab` exists (Task 6). That's expected.

- [ ] **Step 5: Commit**

```bash
git add sinaloka-platform/src/pages/Students/StudentProfileTab.tsx sinaloka-platform/src/pages/Students/StudentDetail.tsx sinaloka-platform/src/App.tsx
git commit -m "feat(platform): add Student Detail page with Profile tab"
```

---

## Task 6: Frontend — Attendance Tab

**Files:**
- Create: `sinaloka-platform/src/pages/Students/StudentAttendanceTab.tsx`

- [ ] **Step 1: Create AttendanceTab component**

Create `sinaloka-platform/src/pages/Students/StudentAttendanceTab.tsx`:

```tsx
import React, { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle, XCircle, Clock, Percent } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, Badge, EmptyState } from '../../components/UI';
import { cn, formatDate } from '../../lib/utils';
import { useStudentAttendance } from '@/src/hooks/useAttendance';
import type { AttendanceStatus } from '@/src/types/attendance';

interface StudentAttendanceTabProps {
  studentId: string;
}

const STATUS_STYLE: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
  ABSENT: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
  LATE: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
};

export const StudentAttendanceTab: React.FC<StudentAttendanceTabProps> = ({ studentId }) => {
  const { t, i18n } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const dateFrom = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const dateTo = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

  const { data, isLoading } = useStudentAttendance(studentId, {
    date_from: dateFrom,
    date_to: dateTo,
  });

  const summary = data?.summary;
  const records = data?.records ?? [];

  return (
    <div className="space-y-6">
      {/* Month Picker */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-bold min-w-[140px] text-center">
          {format(currentMonth, 'MMMM yyyy')}
        </span>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <Percent size={18} className="mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{summary.attendance_rate}%</p>
            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
              {t('attendance.rate', 'Rate')}
            </p>
          </Card>
          <Card className="p-4 text-center">
            <CheckCircle size={18} className="mx-auto mb-1 text-emerald-500" />
            <p className="text-2xl font-bold text-emerald-600">{summary.present}</p>
            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
              {t('attendance.presentLabel', 'Present')}
            </p>
          </Card>
          <Card className="p-4 text-center">
            <XCircle size={18} className="mx-auto mb-1 text-rose-500" />
            <p className="text-2xl font-bold text-rose-600">{summary.absent}</p>
            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
              {t('attendance.absentLabel', 'Absent')}
            </p>
          </Card>
          <Card className="p-4 text-center">
            <Clock size={18} className="mx-auto mb-1 text-amber-500" />
            <p className="text-2xl font-bold text-amber-600">{summary.late}</p>
            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
              {t('attendance.lateLabel', 'Late')}
            </p>
          </Card>
        </div>
      ) : null}

      {/* Session Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <Card className="border-dashed border-2">
          <EmptyState
            icon={CalendarIcon}
            title={t('students.detail.noAttendance', 'Belum ada data kehadiran untuk bulan ini')}
          />
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  {t('attendance.table.date', 'Date')}
                </th>
                <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  {t('students.detail.class', 'Class')}
                </th>
                <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  {t('attendance.table.time', 'Time')}
                </th>
                <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  {t('attendance.table.status', 'Status')}
                </th>
                <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">
                  {t('attendance.table.hw', 'HW')}
                </th>
                <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  {t('attendance.table.notes', 'Notes')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-900/30 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium">
                    {formatDate(record.session.date, i18n.language)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {record.session.class.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-500">
                    {record.session.start_time} - {record.session.end_time}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                      STATUS_STYLE[record.status]
                    )}>
                      {t(`attendance.${record.status.toLowerCase()}`, record.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {record.homework_done ? (
                      <CheckCircle size={16} className="mx-auto text-emerald-500" />
                    ) : (
                      <span className="text-zinc-300 dark:text-zinc-700">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-500 max-w-[200px] truncate">
                    {record.notes ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Verify build**

```bash
cd sinaloka-platform && npm run lint
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/pages/Students/StudentAttendanceTab.tsx
git commit -m "feat(platform): add Student Attendance tab with summary cards and session table"
```

---

## Task 7: Frontend — Drawer Update & Stub Removal

**Files:**
- Modify: `sinaloka-platform/src/pages/Students/StudentDrawer.tsx`
- Modify: `sinaloka-platform/src/pages/Attendance.tsx`

- [ ] **Step 1: Add "Lihat Detail" button to StudentDrawer**

In `sinaloka-platform/src/pages/Students/StudentDrawer.tsx`:

Add import:
```typescript
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, Calendar, UserPlus, ExternalLink } from 'lucide-react';
```

Add inside the component function, before the return:
```typescript
const navigate = useNavigate();
```

Add the "Lihat Detail" button after the parent/guardian Card closing `</div>` (end of the `space-y-8` div), before the closing `</div>` and `)}`:

```tsx
<div className="pt-2">
  <Button
    className="w-full justify-center gap-2"
    variant="outline"
    onClick={() => {
      onClose();
      navigate(`/students/${student.id}`);
    }}
  >
    <ExternalLink size={16} />
    {t('students.drawer.viewDetail', 'Lihat Detail')}
  </Button>
</div>
```

- [ ] **Step 2: Remove "View History" stub from Attendance page**

In `sinaloka-platform/src/pages/Attendance.tsx`, remove the `actions` prop from `PageHeader` (lines 175-180). Change from:

```tsx
<PageHeader
  title={t('attendance.title')}
  subtitle={t('attendance.subtitle')}
  actions={
    <Button variant="outline" className="gap-2">
      <History size={18} />
      {t('attendance.viewHistory')}
    </Button>
  }
/>
```

To:

```tsx
<PageHeader
  title={t('attendance.title')}
  subtitle={t('attendance.subtitle')}
/>
```

Also remove `History` from the lucide-react import (it is only used in this button, no other usage in the file).

- [ ] **Step 3: Apply sticky fix to Attendance left panel**

In `sinaloka-platform/src/pages/Attendance.tsx`, verify line 185 already has the sticky class (from our earlier edit):

```tsx
<div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
```

If not already applied, add `lg:sticky lg:top-24` to the class.

- [ ] **Step 4: Verify build**

```bash
cd sinaloka-platform && npm run lint && npm run build
```

Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add sinaloka-platform/src/pages/Students/StudentDrawer.tsx sinaloka-platform/src/pages/Attendance.tsx
git commit -m "feat(platform): add Lihat Detail button to drawer, remove View History stub, sticky attendance sidebar"
```

---

## Task 8: Final Verification

- [ ] **Step 1: Run backend tests**

```bash
cd sinaloka-backend && npm run test -- --ci
```

Expected: All tests PASS

- [ ] **Step 2: Run backend build**

```bash
cd sinaloka-backend && npm run build
```

Expected: Build succeeds

- [ ] **Step 3: Run frontend build**

```bash
cd sinaloka-platform && npm run build
```

Expected: Build succeeds

- [ ] **Step 4: Verify all changes work end-to-end**

Start both dev servers and manually verify:
1. `/students` list → click row → drawer opens → "Lihat Detail" button visible
2. Click "Lihat Detail" → navigates to `/students/:id`
3. Profile tab shows contact info + parent info
4. Attendance tab shows month picker, summary cards, session table
5. Attendance page no longer has "View History" button
6. Attendance page left panel is sticky on scroll
