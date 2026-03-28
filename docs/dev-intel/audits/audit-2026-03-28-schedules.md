# Audit Report — Sinaloka Schedules (Classes, Sessions, Attendance)

**Date:** 2026-03-28
**Scope:** 2 features audited (classes, sessions-attendance)
**Knowledge base:** 46168c4449003fa1583007cb19f4bd90d7fb713e

## Fix Progress

| Finding | Severity | Status | Fixed | Sprint | PR |
|---------|----------|--------|-------|--------|----|
| SA-001 | CRITICAL | FIXED | 2026-03-28 | Sprint 6 | - |
| SA-002 | CRITICAL | FIXED | 2026-03-28 | Sprint 6 | - |
| CLS-05 | HIGH | FIXED | 2026-03-28 | Sprint 6 | - |
| SA-006 | HIGH | FIXED | 2026-03-28 | Sprint 6 | - |
| SA-007 | HIGH | FIXED | 2026-03-28 | Sprint 6 | - |
| CLS-08 | MEDIUM | FIXED | 2026-03-28 | Sprint 6 | - |
| CLS-10 | MEDIUM | FIXED | 2026-03-28 | Sprint 6 | - |
| CLS-12 | MEDIUM | FIXED | 2026-03-28 | Sprint 6 | - |
| CLS-01 | CRITICAL | FIXED | 2026-03-28 | Sprint 7 | - |
| CLS-02 | HIGH | FIXED | 2026-03-28 | Sprint 7 | - |
| SA-004 | HIGH | FIXED | 2026-03-28 | Sprint 7 | - |
| SA-005 | HIGH | FIXED | 2026-03-28 | Sprint 7 | - |
| SA-012 | MEDIUM | FIXED | 2026-03-28 | Sprint 7 | - |
| CLS-03 | MEDIUM | FIXED | 2026-03-28 | Sprint 8 | - |
| CLS-04 | MEDIUM | FIXED | 2026-03-28 | Sprint 8 | - |
| CLS-11 | MEDIUM | FIXED | 2026-03-28 | Sprint 8 | - |
| SA-009 | LOW | FIXED | 2026-03-28 | Sprint 8 | - |
| SA-013 | MEDIUM | FIXED | 2026-03-28 | Sprint 8 | - |
| SA-014 | MEDIUM | FIXED | 2026-03-28 | Sprint 8 | - |
| SA-008 | MEDIUM | FIXED | 2026-03-28 | Sprint 8 | - |
| SA-003 | CRITICAL | FIXED | 2026-03-28 | Sprint 9 | - |
| CLS-13 | MEDIUM | FIXED | 2026-03-28 | Sprint 9 | - |
| CLS-07 | MEDIUM | FIXED | 2026-03-28 | Sprint 10 | #124 |
| CLS-09 | MEDIUM | FIXED | 2026-03-28 | Sprint 10 | #124 |
| CLS-15 | LOW | FIXED | 2026-03-28 | Sprint 10 | #124 |
| CLS-16 | LOW | FIXED | 2026-03-28 | Sprint 10 | #124 |
| CLS-18 | LOW | FIXED | 2026-03-28 | Sprint 10 | #124 |
| SA-011 | MEDIUM | FIXED | 2026-03-28 | Sprint 10 | #124 |
| SA-020 | MEDIUM | FIXED | 2026-03-28 | Sprint 10 | #124 |

## Executive Summary

| Metric | Count |
|--------|-------|
| Features audited | 2 |
| Findings CRITICAL | 3 |
| Findings HIGH | 7 |
| Findings MEDIUM | 14 |
| Findings LOW | 12 |
| **Total** | **36** |

> **Note:** CLS-10 dan SA-018 adalah finding duplikat (start_time < end_time validation). Di-merge menjadi CLS-10. Total unique findings: **36**.

### Systemic Issues

1. **Tenant isolation gaps** — Beberapa query tidak scope by `institution_id` (SA-001, CLS-13). Pattern `findUnique` dengan compound where perlu di-audit project-wide.
2. **Financial data integrity** — Tidak ada reversal mechanism saat status attendance diubah (SA-004). Payout dan payment creation tidak idempotent (SA-005). Attendance + complete session bukan atomic (SA-003).
3. **Client-side filtering anti-pattern** — Classes page melakukan search/filter client-side padahal backend sudah support server-side filtering (CLS-11). Schedules page fetch limit:100 tanpa sync ke calendar range (CLS-04).
4. **i18n inconsistency** — Platform app sudah i18n tapi ada hardcoded strings (CLS-06, CLS-14). Tutors app sama sekali belum i18n (SA-010).
5. **Test parameter signature mismatch** — Unit tests untuk session dan attendance memanggil service methods dengan jumlah parameter yang salah (SA-006, SA-007). Tests pass karena mock behavior, tapi tidak verify actual parameter forwarding.

### Cross-Feature Dependencies

- **CLS-05 + CLS-02**: Cancel session pakai DELETE (data loss) + hard delete class cascade ke sessions
- **SA-002 + SA-003 + SA-004 + SA-005**: Chain financial integrity — cancel completed session → orphaned payments/payouts, non-atomic finalize → partial state, no payment reversal → ghost charges
- **CLS-10 = SA-018**: Duplicate finding — session time validation missing
- **CLS-01 + CLS-08**: Schedule conflict + subject validation gaps di class create/update
- **CLS-11 + CLS-18**: Client-side filter pakai name bukan ID, search hanya per-page

---

## Per-Feature Findings

### Classes & Schedules

#### ~~[CRITICAL] CLS-01 — Tidak Ada Server-Side Schedule Conflict Detection untuk Tutor~~ FIXED 2026-03-28

**Category:** Security / Gap
**File:** `sinaloka-backend/src/modules/class/class.service.ts` (line 60-106)
**Description:** Deteksi konflik jadwal tutor hanya dilakukan di client-side (`useClassesPage.ts` line 189-208). Backend tidak memvalidasi apakah tutor sudah memiliki kelas lain di hari dan waktu yang sama. Ini berarti request API langsung (curl/Postman) bisa membuat jadwal bentrok tanpa hambatan.

**Problematic code:**
```typescript
// class.service.ts create() — tidak ada pengecekan schedule conflict
return this.prisma.$transaction(async (tx) => {
  const record = await tx.class.create({
    data: {
      institution_id: institutionId,
      tutor_id: dto.tutor_id,
      // ... langsung create tanpa cek conflict
    },
  });
  await tx.classSchedule.createMany({ ... });
});
```

**Expected fix:**
```typescript
// Sebelum create, cek existing schedules tutor
const existingSchedules = await this.prisma.classSchedule.findMany({
  where: { class: { tutor_id: dto.tutor_id, institution_id: institutionId } },
});
for (const newSch of dto.schedules) {
  for (const existing of existingSchedules) {
    if (existing.day === newSch.day &&
        newSch.start_time < existing.end_time &&
        existing.start_time < newSch.end_time) {
      throw new BadRequestException(`Tutor has a schedule conflict on ${newSch.day}`);
    }
  }
}
```

**Acceptance criteria:**
- [ ] Server menolak create/update class jika tutor punya jadwal bentrok
- [ ] Error message mencantumkan hari dan kelas yang bentrok
- [ ] Test unit dan integration untuk scenario conflict

**Dependencies:**
- Affects: `class.service.ts` create() dan update()

**Test plan:**
- Manual: Buat 2 kelas dengan tutor sama, hari sama, waktu overlap via API
- Automated: Tambah test case di `class.service.spec.ts`
- Build: `cd sinaloka-backend && npm run test -- --testPathPattern=class`

**Effort:** Medium (1-4hr)

---

#### ~~[HIGH] CLS-02 — Hard Delete Class Menghapus Session dan Data Terkait~~ FIXED 2026-03-28

**Category:** Gap / Security
**File:** `sinaloka-backend/src/modules/class/class.service.ts` (line 355-367)
**Description:** Class deletion adalah hard delete yang cascade ke `ClassSchedule`. Namun class juga memiliki relasi ke `sessions[]` dan `enrollments[]`. Jika cascade juga berlaku ke sessions (yang mungkin sudah COMPLETED dan punya attendance + payout records), ini bisa menghapus data historis penting termasuk data finansial (tutor payout).

**Problematic code:**
```typescript
async delete(institutionId: string, id: string) {
  const existing = await this.prisma.class.findFirst({
    where: { id, institution_id: institutionId },
  });
  if (!existing) {
    throw new NotFoundException(`Class with ID "${id}" not found`);
  }
  return this.prisma.class.delete({ where: { id } });
}
```

**Expected fix:**
```typescript
const completedSessions = await this.prisma.session.count({
  where: { class_id: id, status: 'COMPLETED' },
});
if (completedSessions > 0) {
  throw new BadRequestException(
    'Cannot delete class with completed sessions. Archive it instead.'
  );
}
```

**Acceptance criteria:**
- [ ] Class dengan completed sessions tidak bisa dihapus
- [ ] User diarahkan untuk archive daripada delete
- [ ] Data historis (sessions, attendance, payouts) tetap aman

**Dependencies:**
- Related to: CLS-05
- Affects modules: Session, Attendance, Payout

**Test plan:**
- Manual: Coba delete class yang punya completed session
- Automated: Tambah test case di `class.service.spec.ts`
- Build: `cd sinaloka-backend && npm run test -- --testPathPattern=class`

**Effort:** Medium (1-4hr)

---

#### ~~[HIGH] CLS-03 — Stats "Active Courses" dan "Total Monthly Fee" Hanya Berdasarkan Page Saat Ini~~ FIXED 2026-03-28

**Category:** Bug
**File:** `sinaloka-platform/src/pages/Classes/index.tsx` (line 72, 54)
**Description:** Stat "Active Courses" menghitung `classes.filter(c => c.status === 'ACTIVE').length` dari data page saat ini (max 20 items), bukan total keseluruhan. "Total Monthly Fee" juga hanya menjumlahkan fee dari page yang ditampilkan. Angka menyesatkan jika ada >20 kelas.

**Problematic code:**
```typescript
// index.tsx line 72
<p className="text-xl font-bold">{state.classes.filter(c => c.status === 'ACTIVE').length}</p>

// useClassesPage.ts line 126-128
const totalRevenue = useMemo(() => {
  return classes.reduce((sum, c) => sum + Number(c.fee), 0);
}, [classes]);
```

**Expected fix:**
```typescript
// Best: dedicated stats endpoint GET /api/admin/classes/stats
// yang mengembalikan { totalFee, totalClasses, activeClasses }
```

**Acceptance criteria:**
- [ ] Stats menampilkan angka global, bukan per-page
- [ ] Total Monthly Fee menjumlahkan semua kelas, bukan hanya halaman saat ini

**Dependencies:**
- Backend perlu endpoint baru

**Test plan:**
- Manual: Buat >20 kelas, lihat stats di page 1 vs total
- Build: `cd sinaloka-platform && npm run build`

**Effort:** Medium (1-4hr)

---

#### ~~[HIGH] CLS-04 — Schedules Page Fetch Semua Session Tanpa Pagination (limit: 100)~~ FIXED 2026-03-28

**Category:** Performance
**File:** `sinaloka-platform/src/pages/Schedules/useSchedulesPage.ts` (line 84-91)
**Description:** Query sessions menggunakan `limit: 100` tanpa auto-sync ke calendar range. Jika institusi punya >100 sessions, kalender bisa terlihat kosong untuk tanggal tertentu.

**Problematic code:**
```typescript
const sessionsQuery = useSessions({
  page,
  limit: 100,
  ...(filterDateFrom && { date_from: filterDateFrom }),
  ...(filterDateTo && { date_to: filterDateTo }),
  ...(filterClassId && { class_id: filterClassId }),
  ...(filterStatus && { status: filterStatus }),
});
```

**Expected fix:**
```typescript
// Auto-sync date filter dengan calendar range
useEffect(() => {
  if (calendarMode === 'month') {
    setFilterDateFrom(format(monthStart, 'yyyy-MM-dd'));
    setFilterDateTo(format(monthEnd, 'yyyy-MM-dd'));
  }
}, [calendarMode, currentDate]);
```

**Acceptance criteria:**
- [ ] Sessions di-fetch berdasarkan range kalender yang sedang dilihat
- [ ] Navigasi bulan/minggu otomatis refresh data
- [ ] Tidak ada hard limit 100 yang menyembunyikan data

**Dependencies:**
- Affects: CalendarMonth, CalendarWeek, CalendarDay

**Test plan:**
- Manual: Generate >100 sessions, lihat apakah semua muncul di kalender
- Build: `cd sinaloka-platform && npm run build`

**Effort:** Medium (1-4hr)

---

#### ~~[HIGH] CLS-05 — Cancel Session Menggunakan DELETE Padahal Seharusnya PATCH Status~~ FIXED 2026-03-28

**Category:** Bug
**File:** `sinaloka-platform/src/pages/Schedules/useSchedulesPage.ts` (line 127-131)
**Description:** `handleCancelSession` memanggil `deleteSession.mutate(id)` yang melakukan `DELETE /api/admin/sessions/:id` — ini **menghapus** session dari database, bukan mengubah statusnya ke CANCELLED. Data historis hilang.

**Problematic code:**
```typescript
const handleCancelSession = (id: string) => {
  deleteSession.mutate(id, {
    onSuccess: () => toast.success(t('schedules.toast.sessionCancelled')),
    onError: () => toast.error(t('schedules.toast.cancelError')),
  });
};
```

**Expected fix:**
```typescript
const handleCancelSession = (id: string) => {
  updateSession.mutate(
    { id, data: { status: 'CANCELLED' } },
    {
      onSuccess: () => toast.success(t('schedules.toast.sessionCancelled')),
      onError: () => toast.error(t('schedules.toast.cancelError')),
    }
  );
};
```

**Acceptance criteria:**
- [ ] Cancel session mengubah status ke CANCELLED, bukan delete
- [ ] Session yang di-cancel masih terlihat di kalender (strikethrough/muted)
- [ ] Data historis tetap ada

**Dependencies:**
- Related to: CLS-02 (data integrity)

**Test plan:**
- Manual: Cancel session, cek apakah masih muncul di list dengan status CANCELLED
- Build: `cd sinaloka-platform && npm run build`

**Effort:** Small (<1hr)

---

#### [MEDIUM] CLS-06 — Hardcoded Bahasa Indonesia di ClassFormModal

**Category:** i18n
**File:** `sinaloka-platform/src/pages/Classes/ClassFormModal.tsx` (line 108-111)
**Description:** Label fee dan helper text di-hardcode dalam Bahasa Indonesia, tidak menggunakan i18n.

**Problematic code:**
```typescript
const feeLabel = billingMode === 'PER_SESSION' ? 'Tarif per sesi' : 'Biaya bulanan';
const feeHelper = billingMode === 'PER_SESSION'
  ? 'Siswa ditagih nominal ini setiap hadir di sesi kelas'
  : 'Siswa ditagih nominal ini setiap awal bulan';
```

**Expected fix:**
```typescript
const feeLabel = billingMode === 'PER_SESSION' ? t('classes.form.feePerSession') : t('classes.form.feeMonthly');
const feeHelper = billingMode === 'PER_SESSION'
  ? t('classes.form.feePerSessionHelper')
  : t('classes.form.feeMonthlyHelper');
```

**Acceptance criteria:**
- [ ] Semua teks di form class menggunakan i18n
- [ ] Teks muncul dalam bahasa yang benar sesuai locale

**Test plan:**
- Manual: Ganti locale, pastikan label berubah
- Build: `cd sinaloka-platform && npm run build`

**Effort:** Small (<1hr)

---

#### ~~[MEDIUM] CLS-07 — ScheduleWeekPreview Tidak Menampilkan Hari Minggu~~ FIXED 2026-03-28

**Category:** Gap
**File:** `sinaloka-platform/src/components/ScheduleWeekPreview.tsx` (line 5)
**Description:** Preview hanya menampilkan Sen-Sab, padahal sistem mendukung jadwal hari Minggu. Conflict detection visual untuk Minggu tidak terlihat.

**Problematic code:**
```typescript
const PREVIEW_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
```

**Expected fix:**
```typescript
const PREVIEW_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
```

**Acceptance criteria:**
- [ ] Preview menampilkan 7 hari termasuk Minggu
- [ ] Conflict di hari Minggu terdeteksi secara visual

**Test plan:**
- Manual: Buat schedule hari Minggu, lihat preview
- Build: `cd sinaloka-platform && npm run build`

**Effort:** Small (<1hr)

---

#### ~~[MEDIUM] CLS-08 — Update Class Tidak Memvalidasi Subject Exists di Institution~~ FIXED 2026-03-28

**Category:** Bug
**File:** `sinaloka-backend/src/modules/class/class.service.ts` (line 251-290)
**Description:** Pada `update()`, ketika `subject_id` diubah, backend hanya cek tutor-subject linkage tapi tidak validasi apakah subject_id baru ada di institution yang benar.

**Problematic code:**
```typescript
if (dto.tutor_id || dto.subject_id) {
  const effectiveTutorId = dto.tutor_id ?? existing.tutor_id;
  const effectiveSubjectId = dto.subject_id ?? existing.subject_id;
  const tutorSubject = await this.prisma.tutorSubject.findUnique({
    where: { tutor_id_subject_id: { tutor_id: effectiveTutorId, subject_id: effectiveSubjectId } },
  });
  // Tidak ada validasi subject ada di institution
}
```

**Expected fix:**
```typescript
if (dto.subject_id) {
  const subject = await this.prisma.subject.findFirst({
    where: { id: dto.subject_id, institution_id: institutionId },
  });
  if (!subject) throw new NotFoundException('Subject not found');
}
```

**Acceptance criteria:**
- [ ] Update class menolak subject_id dari institution lain
- [ ] Error message jelas

**Test plan:**
- Automated: Tambah test case
- Build: `cd sinaloka-backend && npm run test -- --testPathPattern=class`

**Effort:** Small (<1hr)

---

#### ~~[MEDIUM] CLS-09 — Timetable View Mengambil Data dengan Hard Limit 100~~ FIXED 2026-03-28

**Category:** Performance / Bug
**File:** `sinaloka-platform/src/pages/Classes/useClassesPage.ts` (line 76)
**Description:** Timetable view menggunakan `allClassesData` yang di-fetch dengan `limit: 100`. Jika ada >100 kelas, timetable tidak lengkap.

**Problematic code:**
```typescript
const { data: allClassesData } = useClasses({ page: 1, limit: 100, semester_id: filterSemesterId || undefined });
```

**Expected fix:**
Gunakan endpoint khusus yang mengembalikan semua kelas tanpa pagination, atau setidaknya tampilkan warning jika data terpotong.

**Acceptance criteria:**
- [ ] Timetable menampilkan semua kelas
- [ ] Atau ada warning jika data terpotong

**Test plan:**
- Manual: Buat >100 kelas, lihat timetable
- Build: `cd sinaloka-platform && npm run build`

**Effort:** Medium (1-4hr)

---

#### ~~[MEDIUM] CLS-10 — Session Create/Update Tidak Validasi start_time < end_time~~ FIXED 2026-03-28

**Category:** Bug
**File:** `sinaloka-backend/src/modules/session/session.dto.ts` (line 12-21)
**Description:** `CreateSessionSchema` dan `UpdateSessionSchema` tidak memiliki refinement untuk memastikan `start_time < end_time`. Juga berlaku untuk `RequestRescheduleSchema`. User bisa membuat session dengan waktu terbalik.

**Problematic code:**
```typescript
export const CreateSessionSchema = z.object({
  class_id: z.string().uuid(),
  date: z.coerce.date(),
  start_time: TimeString,
  end_time: TimeString,
  // Tidak ada .refine() untuk start_time < end_time
});
```

**Expected fix:**
```typescript
export const CreateSessionSchema = z.object({
  class_id: z.string().uuid(),
  date: z.coerce.date(),
  start_time: TimeString,
  end_time: TimeString,
}).refine((d) => d.start_time < d.end_time, {
  message: 'start_time must be before end_time',
  path: ['end_time'],
});
```

**Acceptance criteria:**
- [ ] Create, update, dan reschedule session menolak start_time >= end_time
- [ ] Error message jelas

**Test plan:**
- Manual: Coba buat session dengan start_time > end_time via API
- Automated: Tambah test case di session spec
- Build: `cd sinaloka-backend && npm run test -- --testPathPattern=session`

**Effort:** Small (<1hr)

---

#### ~~[MEDIUM] CLS-11 — Double Filter: Client-Side + Server-Side Filtering Tidak Sinkron~~ FIXED 2026-03-28

**Category:** Bug
**File:** `sinaloka-platform/src/pages/Classes/useClassesPage.ts` (line 75, 98-109)
**Description:** Filter search dan subject dilakukan client-side, tapi `semester_id` dikirim ke server. Artinya search hanya memfilter 20 item di page saat ini — class yang namanya match di page 2 tidak muncul. Backend sudah support `search`, `subject_id`, `status` di `ClassQuerySchema`.

**Problematic code:**
```typescript
// Server-side: hanya semester_id
const { data, isLoading } = useClasses({ page, limit, semester_id: filterSemesterId || undefined });

// Client-side: search + subject filter
const filteredClasses = useMemo(() => {
  return classes.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || ...;
    const matchesSubject = !filterSubject || c.subject.name === filterSubject;
  });
}, [classes, searchQuery, filterSubject, showOnlyAvailable]);
```

**Expected fix:**
```typescript
const { data, isLoading } = useClasses({
  page, limit,
  search: searchQuery || undefined,
  subject_id: filterSubjectId || undefined,
  status: showOnlyAvailable ? 'ACTIVE' : undefined,
  semester_id: filterSemesterId || undefined,
});
```

**Acceptance criteria:**
- [ ] Semua filter dikirim ke server
- [ ] Pagination bekerja dengan benar bersamaan dengan filter

**Test plan:**
- Manual: Search nama kelas yang ada di page 2, pastikan muncul
- Build: `cd sinaloka-platform && npm run build`

**Effort:** Medium (1-4hr)

---

#### ~~[MEDIUM] CLS-12 — UpdateClassSchema Tidak Validasi PER_STUDENT_ATTENDANCE Consistency~~ FIXED 2026-03-28

**Category:** Bug
**File:** `sinaloka-backend/src/modules/class/class.dto.ts` (line 64-84)
**Description:** `CreateClassSchema` punya refinement untuk `tutor_fee_per_student` saat mode `PER_STUDENT_ATTENDANCE`, tapi `UpdateClassSchema` tidak punya refinement serupa.

**Problematic code:**
```typescript
export const UpdateClassSchema = z.object({
  tutor_fee_mode: TutorFeeMode.optional(),
  tutor_fee_per_student: z.number().min(0).optional().nullable(),
  // Tidak ada .refine() untuk cross-field validation
});
```

**Expected fix:**
```typescript
export const UpdateClassSchema = z.object({ ... }).refine(
  (data) => {
    if (data.tutor_fee_mode === 'PER_STUDENT_ATTENDANCE') {
      return data.tutor_fee_per_student != null && data.tutor_fee_per_student > 0;
    }
    return true;
  },
  { message: 'tutor_fee_per_student is required when mode is PER_STUDENT_ATTENDANCE', path: ['tutor_fee_per_student'] }
);
```

**Acceptance criteria:**
- [ ] Update class ke mode PER_STUDENT_ATTENDANCE wajib sertakan tutor_fee_per_student

**Test plan:**
- Automated: Test update dengan mode PER_STUDENT_ATTENDANCE tanpa fee
- Build: `cd sinaloka-backend && npm run test -- --testPathPattern=class`

**Effort:** Small (<1hr)

---

#### ~~[MEDIUM] CLS-13 — findUnique dengan Compound Where Mungkin Abaikan institution_id~~ FIXED 2026-03-28

**Category:** Security
**File:** `sinaloka-backend/src/modules/session/session.service.ts` (line 109)
**Description:** `validateClassForSession` menggunakan `findUnique` dengan `where: { id: classId, institution_id: institutionId }`. Pada Prisma versi lama, `findUnique` hanya menerima unique fields — `institution_id` bisa diabaikan. Perlu pastikan Prisma version mendukung compound where di `findUnique`.

**Problematic code:**
```typescript
const classRecord = await this.prisma.class.findUnique({
  where: { id: classId, institution_id: institutionId },
  include: { schedules: true },
});
```

**Expected fix:**
```typescript
const classRecord = await this.prisma.class.findFirst({
  where: { id: classId, institution_id: institutionId },
  include: { schedules: true },
});
```

**Acceptance criteria:**
- [ ] Semua query tenant-scoped menggunakan `findFirst` dengan `institution_id`

**Test plan:**
- Manual: Coba akses class dari institution lain via API
- Build: `cd sinaloka-backend && npm run test`

**Effort:** Small (<1hr)

---

#### [LOW] CLS-14 — ScheduleWeekPreview Hardcoded Bahasa Indonesia

**Category:** i18n
**File:** `sinaloka-platform/src/components/ScheduleWeekPreview.tsx` (line 7-9, 129)
**Description:** Label hari dan tooltip conflict hardcoded dalam Bahasa Indonesia.

**Problematic code:**
```typescript
const DAY_SHORT: Record<string, string> = {
  Monday: 'Sen', Tuesday: 'Sel', Wednesday: 'Rab',
  Thursday: 'Kam', Friday: 'Jum', Saturday: 'Sab',
};
title={conflictWith ? `Bentrok dengan ${conflictWith}` : `${s.start_time}-${s.end_time}`}
```

**Expected fix:** Gunakan i18n.

**Acceptance criteria:**
- [ ] Label hari dan tooltip menggunakan i18n

**Effort:** Small (<1hr)

---

#### ~~[LOW] CLS-15 — CalendarDay Hanya Menampilkan 08:00-21:00~~ FIXED 2026-03-28

**Category:** Gap
**File:** `sinaloka-platform/src/pages/Schedules/CalendarDay.tsx` (line 27)
**Description:** Day view hanya render hour 8-21, tapi tidak ada validasi backend yang membatasi waktu session. Session jam 07:00 atau 22:00 tidak terlihat.

**Problematic code:**
```typescript
{Array.from({ length: 14 }, (_, i) => i + 8).map(hour => { ... })}
```

**Expected fix:** Buat range dinamis berdasarkan data sessions, atau tambahkan validasi backend.

**Acceptance criteria:**
- [ ] Sessions di luar jam 08:00-21:00 tetap terlihat, ATAU backend menolak jam di luar range

**Effort:** Small (<1hr)

---

#### ~~[LOW] CLS-16 — Duplicate `getSubjectColor` Function dengan Implementasi Berbeda~~ FIXED 2026-03-28

**Category:** Improvement
**File:** `sinaloka-platform/src/pages/Classes/useClassesPage.ts` (line 25-37) dan `sinaloka-platform/src/pages/Schedules/useSchedulesPage.ts` (line 35-38)
**Description:** Dua versi `getSubjectColor` — Classes pakai hash-based (semua subject dapat warna), Schedules pakai hardcoded map (hanya 3 subject: Mathematics, Science, English).

**Expected fix:** Satu shared function di `src/lib/utils.ts`.

**Acceptance criteria:**
- [ ] Satu fungsi shared untuk subject color
- [ ] Semua subject mendapat warna

**Effort:** Small (<1hr)

---

#### [LOW] CLS-17 — Session Generate Bisa Membuat Ratusan Record Sekaligus Tanpa Limit

**Category:** Performance
**File:** `sinaloka-backend/src/modules/session/session.service.ts` (line 372-455)
**Description:** Generate sessions tidak membatasi jumlah — 365 hari × 7 jadwal/minggu = ~365 records per transaction.

**Expected fix:** Limit reasonable (misal 200).

**Effort:** Small (<1hr)

---

#### ~~[LOW] CLS-18 — Subject Filter di Frontend Menggunakan Name, Bukan ID~~ FIXED 2026-03-28

**Category:** Bug
**File:** `sinaloka-platform/src/pages/Classes/ClassFilters.tsx` (line 68-71)
**Description:** Filter subject menggunakan `subject.name` sebagai value, inconsistent karena backend mengharapkan `subject_id` (UUID).

**Expected fix:** Gunakan `s.id` sebagai value dan kirim sebagai `subject_id` ke backend.

**Effort:** Small (<1hr)

---

### Sessions & Attendance

#### ~~[CRITICAL] SA-001 — Missing Tenant Isolation pada getTutorSchedule~~ FIXED 2026-03-28

**Category:** Security
**File:** `sinaloka-backend/src/modules/session/session.service.ts` (line 457-500)
**Description:** Method `getTutorSchedule` tidak memfilter query sessions berdasarkan `institution_id`. Tutor hanya difilter berdasarkan `user_id` tanpa scoping ke institution.

**Problematic code:**
```typescript
const where: any = {
  class: { tutor_id: tutor.id },
};
```

**Expected fix:**
```typescript
const where: any = {
  institution_id: tutor.institution_id,
  class: { tutor_id: tutor.id },
};
```

**Acceptance criteria:**
- [ ] Query sessions di `getTutorSchedule` selalu di-scope ke institution_id
- [ ] Unit test memverifikasi institution_id di where clause

**Test plan:**
- Automated: Tambah test case di `session.service.spec.ts`
- Build: `cd sinaloka-backend && npm run test -- --testPathPattern=session`

**Effort:** Small (<1hr)

---

#### ~~[CRITICAL] SA-002 — Tutor Bisa Cancel Session yang Sudah COMPLETED~~ FIXED 2026-03-28

**Category:** Bug
**File:** `sinaloka-backend/src/modules/session/session.service.ts` (line 595-627)
**Description:** Method `cancelSession` tidak memvalidasi status session sebelum cancel. Tutor bisa membatalkan session COMPLETED — berbahaya karena sudah ada payout dan payments.

**Problematic code:**
```typescript
async cancelSession(institutionId: string, userId: string, sessionId: string) {
  // ...ownership check...
  // MISSING: status validation
  const updated = await this.prisma.session.update({
    where: { id: sessionId, institution_id: institutionId },
    data: { status: 'CANCELLED' },
  });
}
```

**Expected fix:**
```typescript
if (session.status !== 'SCHEDULED') {
  throw new BadRequestException(
    'Only sessions with status SCHEDULED can be cancelled',
  );
}
```

**Acceptance criteria:**
- [ ] Cancel session hanya bisa dilakukan pada session SCHEDULED
- [ ] Response 400 untuk session COMPLETED, CANCELLED, RESCHEDULE_REQUESTED

**Test plan:**
- Automated: Tambah test case di `session.service.spec.ts`
- Build: `cd sinaloka-backend && npm run test -- --testPathPattern=session`

**Effort:** Small (<1hr)

---

#### ~~[CRITICAL] SA-003 — Race Condition: Attendance + Complete Session Bukan Atomic~~ FIXED 2026-03-28

**Category:** Bug
**File:** `sinaloka-tutors/src/hooks/useAttendance.ts` (line 24-38)
**Description:** Tutor "Finalize & Close" melakukan 2 API call berurutan: POST attendance, lalu PATCH complete. Jika call pertama sukses tapi kedua gagal, attendance records sudah tercipta tapi session tetap SCHEDULED. Payments ter-generate tapi payout tidak tercipta.

**Problematic code:**
```typescript
const submitAttendance = useCallback(async (...) => {
  await api.post('/api/tutor/attendance', payload);
  await api.patch(`/api/tutor/schedule/${sessionId}/complete`, { ... });
}, []);
```

**Expected fix:**
```typescript
// New endpoint POST /api/tutor/attendance/finalize
// yang di-wrap dalam prisma.$transaction
async finalizeSession(institutionId, userId, dto) {
  return this.prisma.$transaction(async (tx) => {
    // create attendance records
    // complete session
    // generate payments + payout
  });
}
```

**Acceptance criteria:**
- [ ] Attendance creation dan session completion bersifat atomic
- [ ] Jika salah satu gagal, semuanya di-rollback

**Test plan:**
- Automated: Integration test yang mock failure pada complete
- Build: `cd sinaloka-backend && npm run test`

**Effort:** Large (4+hr)

---

#### ~~[HIGH] SA-004 — Duplicate/Orphan Payment saat Admin Update Attendance Status~~ FIXED 2026-03-28

**Category:** Bug
**File:** `sinaloka-backend/src/modules/attendance/attendance.service.ts` (line 127-167)
**Description:** Admin update attendance status ke PRESENT/LATE men-generate payment, tapi tidak ada reversal saat status diubah ke ABSENT. Payment tetap ada — ghost charges untuk siswa.

**Problematic code:**
```typescript
if (dto.status === 'PRESENT' || dto.status === 'LATE') {
  await this.invoiceGenerator.generatePerSessionPayment({ ... });
}
// MISSING: No reversal if status changed to ABSENT
```

**Expected fix:**
```typescript
if (dto.status === 'ABSENT' && attendance.status !== 'ABSENT') {
  await this.invoiceGenerator.cancelPerSessionPayment({
    sessionId: attendance.session_id,
    studentId: attendance.student_id,
  });
}
```

**Acceptance criteria:**
- [ ] Ubah status ke ABSENT membatalkan per-session payment terkait
- [ ] Ubah status ke PRESENT/LATE kembali men-recreate payment

**Test plan:**
- Manual: Admin ubah status PRESENT -> ABSENT -> PRESENT, verifikasi payment records
- Automated: Unit test untuk scenario flip status
- Build: `cd sinaloka-backend && npm run test -- --testPathPattern=attendance`

**Effort:** Medium (1-4hr)

---

#### ~~[HIGH] SA-005 — Potensi Duplicate Payout saat Complete Session~~ FIXED 2026-03-28

**Category:** Bug
**File:** `sinaloka-backend/src/modules/session/session.service.ts` (line 741-837 dan 265-358)
**Description:** Payout creation pada `completeSession` dan admin `update` (status -> COMPLETED) tidak punya dedup mechanism. Retry atau edge case bisa create double payout.

**Problematic code:**
```typescript
if (feeMode === 'FIXED_PER_SESSION') {
  if (tutorFee > 0) {
    await this.payoutService.create(session.institution_id, {
      // No dedup check
    });
  }
}
```

**Expected fix:**
```typescript
const existingPayout = await this.prisma.payout.findFirst({
  where: { session_id: sessionId, tutor_id: tutor.id },
});
if (!existingPayout) {
  await this.payoutService.create(...);
}
```

**Acceptance criteria:**
- [ ] Payout tidak double pada retry/edge case

**Test plan:**
- Automated: Test di `session.service.spec.ts` untuk scenario duplicate
- Build: `cd sinaloka-backend && npm run test -- --testPathPattern=session`

**Effort:** Medium (1-4hr)

---

#### ~~[HIGH] SA-006 — Unit Tests Session Service Salah Parameter Signature~~ FIXED 2026-03-28

**Category:** Bug
**File:** `sinaloka-backend/src/modules/session/session.service.spec.ts` (line 602-610, 858, 888)
**Description:** Test `requestReschedule` dipanggil dengan 3 parameter tapi actual signature butuh 4. `cancelSession` dipanggil dengan 2 tapi butuh 3. Tests pass karena mock, tapi tidak verify actual forwarding.

**Problematic code:**
```typescript
const result = await service.requestReschedule(userId, 'session-1', { ... });
// Actual: requestReschedule(institutionId, userId, sessionId, dto) -- 4 params

await service.cancelSession(userId, 'session-1');
// Actual: cancelSession(institutionId, userId, sessionId) -- 3 params
```

**Expected fix:**
```typescript
const result = await service.requestReschedule(institutionId, userId, 'session-1', dto);
await service.cancelSession(institutionId, userId, 'session-1');
```

**Acceptance criteria:**
- [ ] Semua test memanggil service methods dengan parameter signature yang benar

**Test plan:**
- Automated: Fix dan jalankan `npm run test -- --testPathPattern=session`

**Effort:** Small (<1hr)

---

#### ~~[HIGH] SA-007 — Unit Tests Attendance Service Salah Parameter Signature~~ FIXED 2026-03-28

**Category:** Bug
**File:** `sinaloka-backend/src/modules/attendance/attendance.service.spec.ts` (line 105, 130-139, 281)
**Description:** Mirip SA-006. `batchCreate` dipanggil dengan 2 params (butuh 3). `updateByTutor` dipanggil dengan 3 (butuh 4).

**Problematic code:**
```typescript
const result = await service.batchCreate(userId, { session_id: '...', records });
// Actual: batchCreate(institutionId, userId, dto)

const result = await service.updateByTutor(userId, 'att-1', { notes: '...' });
// Actual: updateByTutor(institutionId, userId, id, dto)
```

**Expected fix:**
```typescript
const result = await service.batchCreate(institutionId, userId, { session_id: '...', records });
const result = await service.updateByTutor(institutionId, userId, 'att-1', { notes: '...' });
```

**Acceptance criteria:**
- [ ] Semua test memanggil service methods dengan signature yang benar

**Test plan:**
- Automated: `cd sinaloka-backend && npm run test -- --testPathPattern=attendance`

**Effort:** Small (<1hr)

---

#### ~~[MEDIUM] SA-008 — Admin Tidak Bisa Create Attendance untuk Siswa Tanpa Record~~ FIXED 2026-03-28

**Category:** Gap
**File:** `sinaloka-platform/src/pages/Attendance.tsx` (line 408-492)
**Description:** UI menampilkan siswa tanpa attendance sebagai "Pending" tanpa aksi. Admin tidak bisa create attendance record — masalah ketika tutor lupa submit.

**Problematic code:**
```tsx
{hasAttendance ? (
  <div>/* P/A/L buttons */</div>
) : (
  <span>{t('attendance.pending', 'Pending')}</span>
)}
```

**Expected fix:** Biarkan admin menggunakan P/A/L button untuk siswa tanpa record (create on first click).

**Acceptance criteria:**
- [ ] Admin bisa membuat attendance record untuk siswa yang belum punya

**Effort:** Medium (1-4hr)

---

#### ~~[MEDIUM] SA-009 — Keyboard Shortcut Dependencies Array Incomplete~~ FIXED 2026-03-28

**Category:** Bug
**File:** `sinaloka-platform/src/pages/Attendance.tsx` (line 102-120)
**Description:** useEffect keyboard shortcuts depends on `[focusedAttendanceId]` tapi juga uses `isSessionLocked`. Stale closure risk.

**Problematic code:**
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!focusedAttendanceId || isSessionLocked) return;
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [focusedAttendanceId]); // Missing: isSessionLocked
```

**Expected fix:**
```typescript
}, [focusedAttendanceId, isSessionLocked]);
```

**Effort:** Small (<1hr)

---

#### [MEDIUM] SA-010 — Missing i18n di Seluruh Tutors App

**Category:** Improvement
**File:** Seluruh frontend tutors app
**Description:** Semua teks hardcoded campuran ID/EN. Tidak ada i18n framework. Inkonsisten dengan platform app yang sudah react-i18next.

**Effort:** Large (4+hr)

---

#### ~~[MEDIUM] SA-011 — ScheduleCard RESCHEDULE_REQUESTED Tampil Misleading~~ FIXED 2026-03-28

**Category:** Bug
**File:** `sinaloka-tutors/src/components/ScheduleCard.tsx` (line 19, 42)
**Description:** `RESCHEDULE_REQUESTED` dimapping ke `'rescheduled'` — misleading. Session tampil tanpa action buttons. Tutor tidak tahu reschedule masih pending.

**Expected fix:** Tambahkan badge "Menunggu Approval" untuk reschedule_requested sessions.

**Effort:** Small (<1hr)

---

#### ~~[MEDIUM] SA-012 — Session Generate Tidak Mengisi Snapshot Data~~ FIXED 2026-03-28

**Category:** Gap
**File:** `sinaloka-backend/src/modules/session/session.service.ts` (line 372-455)
**Description:** `generateSessions` via `createMany` tanpa isi `snapshot_*` fields. Jika class data berubah sebelum complete, data historis jadi inkonsisten.

**Expected fix:**
```typescript
const snapshotData = this.buildSnapshotData(classRecordWithRelations);
sessionsToCreate.push({
  ...snapshotData,
  class_id: dto.class_id,
  // ...
});
```

**Acceptance criteria:**
- [ ] Generated sessions menyimpan snapshot tutor/class/fee saat pembuatan

**Test plan:**
- Automated: Test di `session.service.spec.ts`
- Build: `cd sinaloka-backend && npm run test -- --testPathPattern=session`

**Effort:** Medium (1-4hr)

---

#### ~~[MEDIUM] SA-013 — `getSummary` Memuat Semua Records ke Memory~~ FIXED 2026-03-28

**Category:** Performance
**File:** `sinaloka-backend/src/modules/attendance/attendance.service.ts` (line 213-243)
**Description:** Memuat semua attendance records lalu hitung summary di JavaScript. Seharusnya pakai database aggregation/count.

**Expected fix:**
```typescript
const [present, absent, late, hwDone, total] = await Promise.all([
  this.prisma.attendance.count({ where: { ...baseWhere, status: 'PRESENT' } }),
  this.prisma.attendance.count({ where: { ...baseWhere, status: 'ABSENT' } }),
  this.prisma.attendance.count({ where: { ...baseWhere, status: 'LATE' } }),
  this.prisma.attendance.count({ where: { ...baseWhere, homework_done: true } }),
  this.prisma.attendance.count({ where: baseWhere }),
]);
```

**Effort:** Small (<1hr)

---

#### ~~[MEDIUM] SA-014 — `findByStudent` Juga Memuat Semua Records ke Memory~~ FIXED 2026-03-28

**Category:** Performance
**File:** `sinaloka-backend/src/modules/attendance/attendance.service.ts` (line 245-300)
**Description:** Sama seperti SA-013. Summary seharusnya dihitung via database count queries.

**Effort:** Small (<1hr)

---

#### [LOW] SA-015 — Payment Generation Loop Sequential

**Category:** Performance
**File:** `sinaloka-backend/src/modules/attendance/attendance.service.ts` (line 80-90)
**Description:** `batchCreate` men-generate payments sequential via `for...of` loop. Pakai `Promise.all` untuk parallel.

**Effort:** Small (<1hr)

---

#### [LOW] SA-016 — Error Handling Silence di SessionDetailPage

**Category:** Bug
**File:** `sinaloka-tutors/src/pages/SessionDetailPage.tsx` (line 32-37)
**Description:** `.catch(() => {})` menelan semua errors. User hanya lihat "Tidak ada data" tanpa tahu ada error.

**Effort:** Small (<1hr)

---

#### [LOW] SA-017 — No Past Date Validation pada CreateSessionSchema

**Category:** Gap
**File:** `sinaloka-backend/src/modules/session/session.dto.ts` (line 12-21)
**Description:** Admin bisa create session untuk tanggal di masa lalu — langsung jadi "incomplete" di frontend.

**Effort:** Small (<1hr)

---

#### [LOW] SA-019 — Notification Toast di Tutors App Selalu Hijau (Termasuk Error)

**Category:** Bug
**File:** `sinaloka-tutors/src/App.tsx` (line 278-290)
**Description:** Toast selalu pakai style hijau/success bahkan untuk error messages. Tidak ada pembedaan visual.

**Effort:** Small (<1hr)

---

#### ~~[LOW] SA-020 — Stale Data pada Schedule Setelah Cancel/Reschedule~~ FIXED 2026-03-28

**Category:** Improvement
**File:** `sinaloka-tutors/src/hooks/useSchedule.ts` (line 34-45)
**Description:** `cancelSession` pakai optimistic update, `requestReschedule` tidak. Inkonsisten — UI bisa lag setelah reschedule.

**Effort:** Medium (1-4hr)

---

## Dependency Graph

- **Group 1 (Financial Integrity):** SA-002, SA-003, SA-004, SA-005 — cancel completed → orphaned payouts, non-atomic finalize → partial state, no payment reversal
- **Group 2 (Data Loss):** CLS-05, CLS-02 — cancel = delete session, hard delete class cascade
- **Group 3 (Tenant Isolation):** SA-001, CLS-13 — missing institution_id in queries
- **Group 4 (Validation Gaps):** CLS-01, CLS-08, CLS-10, CLS-12 — schedule conflict, subject validation, time validation, fee mode validation
- **Group 5 (Client-Side Filter):** CLS-11, CLS-18, CLS-03 — search per-page, name vs ID, stats per-page
- **Group 6 (Test Reliability):** SA-006, SA-007 — wrong parameter signatures
- **Group 7 (Performance):** CLS-04, CLS-09, SA-013, SA-014, SA-015 — hard limits, memory loads, sequential loops
- **Group 8 (i18n):** CLS-06, CLS-14, SA-010 — hardcoded strings across apps

## Fix Progress

| Finding | Severity | Status | Sprint | PR |
|---------|----------|--------|--------|----|
| CLS-01 | CRITICAL | PLANNED | Sprint 1 | - |
| SA-001 | CRITICAL | PLANNED | Sprint 1 | - |
| SA-002 | CRITICAL | PLANNED | Sprint 1 | - |
| CLS-05 | HIGH | PLANNED | Sprint 1 | - |
| SA-006 | HIGH | PLANNED | Sprint 1 | - |
| SA-007 | HIGH | PLANNED | Sprint 1 | - |
| CLS-08 | MEDIUM | PLANNED | Sprint 1 | - |
| CLS-10 | MEDIUM | PLANNED | Sprint 1 | - |
| CLS-12 | MEDIUM | PLANNED | Sprint 1 | - |
| CLS-02 | HIGH | PLANNED | Sprint 2 | - |
| SA-003 | CRITICAL | PLANNED | Sprint 2 | - |
| SA-004 | HIGH | PLANNED | Sprint 2 | - |
| SA-005 | HIGH | PLANNED | Sprint 2 | - |
| SA-012 | MEDIUM | PLANNED | Sprint 2 | - |
| CLS-03 | HIGH | PLANNED | Sprint 3 | - |
| CLS-04 | HIGH | PLANNED | Sprint 3 | - |
| CLS-11 | MEDIUM | PLANNED | Sprint 3 | - |
| CLS-09 | MEDIUM | PLANNED | Sprint 3 | - |
| SA-008 | MEDIUM | PLANNED | Sprint 3 | - |
| SA-009 | MEDIUM | PLANNED | Sprint 3 | - |
| SA-013 | MEDIUM | PLANNED | Sprint 3 | - |
| SA-014 | MEDIUM | PLANNED | Sprint 3 | - |
| CLS-06 | MEDIUM | UNPLANNED | - | - |
| CLS-07 | MEDIUM | UNPLANNED | - | - |
| CLS-13 | MEDIUM | UNPLANNED | - | - |
| CLS-14 | LOW | UNPLANNED | - | - |
| CLS-15 | LOW | UNPLANNED | - | - |
| CLS-16 | LOW | UNPLANNED | - | - |
| CLS-17 | LOW | UNPLANNED | - | - |
| CLS-18 | LOW | UNPLANNED | - | - |
| SA-010 | MEDIUM | UNPLANNED | - | - |
| SA-011 | MEDIUM | UNPLANNED | - | - |
| SA-015 | LOW | UNPLANNED | - | - |
| SA-016 | LOW | UNPLANNED | - | - |
| SA-017 | LOW | UNPLANNED | - | - |
| SA-019 | LOW | UNPLANNED | - | - |
| SA-020 | LOW | UNPLANNED | - | - |
