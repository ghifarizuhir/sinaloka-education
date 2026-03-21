# Sprint 1: Bug Fixes & Quick Wins — Design Spec

> **Date:** 2026-03-22
> **Scope:** 5 bug fixes across sinaloka-platform + sinaloka-backend
> **Branch:** `fix/sprint1-bugfixes`

---

## Item 1: Student Filter Tidak Reset Page + Server-Side Filtering

### Problem
- `useStudentPage.ts:48` hanya kirim `{ page, limit }` ke API — search, grade, status tidak dikirim
- Filtering dilakukan client-side pada 20 items per page (`filteredStudents` useMemo) — siswa di page lain tidak ditemukan
- `setPage(1)` tidak dipanggil saat filter/search berubah — bisa tampilkan halaman kosong
- Stats "Active/Inactive Students" dihitung dari page saat ini saja (misleading)

### Solution
**Frontend (`useStudentPage.ts`):**
- Pass `search`, `grade`, `status` ke `useStudents()` sebagai query params
- Hapus `filteredStudents` useMemo — gunakan `data.data` langsung (backend sudah filter)
- Tambah `setPage(1)` di setiap setter: `setSearchQuery`, `setActiveFilters`
- Reset `selectedIds` ke `[]` saat search/filter berubah (karena row set berubah)
- Tambah debounce 300ms pada search input (seperti pattern di `OperatingExpenses.tsx`) agar tidak fire API request per keystroke
- Stats Active/Inactive: gunakan `active_count` dan `inactive_count` dari backend meta response — ini adalah **institution-wide counts** (tidak terpengaruh filter), karena stats card menampilkan overview keseluruhan institusi

**Backend (`student.service.ts`):**
- Tambah `active_count` dan `inactive_count` di response meta dari `GET /api/admin/students`
- Hitung semua counts dalam satu `Promise.all` untuk menghindari latency tambahan:
```ts
const [data, total, activeCount, inactiveCount] = await Promise.all([
  this.prisma.student.findMany({ where, skip, take: limit, orderBy }),
  this.prisma.student.count({ where }),
  this.prisma.student.count({ where: { institution_id: tenantId, status: 'ACTIVE' } }),
  this.prisma.student.count({ where: { institution_id: tenantId, status: 'INACTIVE' } }),
]);
```
- Note: `active_count`/`inactive_count` menggunakan `tenantId` tanpa filter search/grade — intentional karena ini overview stats

### Files to Change
- `sinaloka-platform/src/pages/Students/useStudentPage.ts`
- `sinaloka-backend/src/modules/student/student.service.ts`

### Verification
- Search "nama" di page 1, siswa di page 3 harus muncul
- Ganti filter grade saat di page 2 → harus kembali ke page 1
- Stats Active/Inactive harus konsisten di semua page dan tidak berubah saat filter aktif
- Selected rows harus ter-clear saat filter berubah
- Search harus ter-debounce (tidak fire API per keystroke)
- Clear filter/search → kembali ke state awal, semua data tampil

---

## Item 2: Tutor Filtering Server-Side

### Problem
- `Tutors.tsx:192` hanya kirim `{ page, limit }` — search, subject_id, sort tidak dikirim
- Client-side filtering pada 20 items per page — tutor di page lain tidak ditemukan
- Subject filter dropdown diisi dari data page saat ini saja
- `setPage(1)` tidak dipanggil saat filter berubah

### Solution
**Frontend (`Tutors.tsx`):**
- Pass `search`, `subject_id`, `sort_by`, `sort_order` ke `useTutors()`
- Hapus `filteredTutors` useMemo — gunakan `data.data` langsung
- Gunakan `useSubjects()` untuk dropdown filter (bukan extract dari data page) — value harus subject UUID, bukan nama
- Tambah `setPage(1)` di setiap filter/search change
- Tambah debounce 300ms pada search input
- Tambah pagination UI — copy pattern dari Students page (prev/next + numbered buttons)
- Default `sort_by` harus `'rating'` dan `sort_order` harus `'desc'` agar konsisten dengan behavior saat ini (backend default `created_at` berbeda dari UI default `rating`)

**Type update (`types/tutor.ts`):**
- Update `TutorQueryParams` interface — tambah fields yang sesuai dengan backend:
```ts
export interface TutorQueryParams extends PaginationParams {
  search?: string;
  subject_id?: string;  // UUID, bukan nama
  is_verified?: boolean;
  sort_by?: 'rating' | 'experience_years' | 'name' | 'created_at';
  sort_order?: 'asc' | 'desc';
}
```

**Hook (`useTutors.ts`):**
- Sudah menerima params dan meneruskan ke service — tidak perlu diubah

**Backend:**
- `TutorQuerySchema` sudah support `search`, `subject_id`, `is_verified`, `sort_by`, `sort_order` — tidak perlu diubah

### Files to Change
- `sinaloka-platform/src/pages/Tutors.tsx`
- `sinaloka-platform/src/types/tutor.ts`

### Verification
- Search tutor nama "X" → harus menemukan tutor di page manapun
- Filter subject "Matematika" → hanya tutor dengan subject tersebut
- Ganti filter saat di page 2 → kembali ke page 1
- Pagination buttons muncul dan berfungsi
- Default sort by rating (descending) pada first load
- Clear filter/search → kembali ke state awal

---

## Item 3: Expense Total Misleading

### Problem
- `OperatingExpenses.tsx:74` menghitung `totalExpenses` dengan `reduce()` pada data page saat ini (max 20 items)
- Stats card "Total Expenses" menampilkan total parsial, bukan total keseluruhan

### Solution
**Backend (`expense.service.ts`):**
- Tambah `total_amount` di response meta menggunakan Prisma `aggregate`:
```ts
const [data, total, aggregate] = await Promise.all([
  this.prisma.expense.findMany({ where, skip, take: limit, orderBy }),
  this.prisma.expense.count({ where }),
  this.prisma.expense.aggregate({ where, _sum: { amount: true } }),
]);

return {
  data,
  meta: {
    ...buildPaginationMeta(total, page, limit),
    total_amount: aggregate._sum.amount ?? 0,
  },
};
```
- `total_amount` harus respect active filters (category, search, date) — jadi menggunakan `where` clause yang sama

**Frontend type (`types/common.ts` atau expense-specific):**
- Extend meta type untuk expense response agar TypeScript mengenali `total_amount`:
```ts
interface ExpenseMeta extends PaginationMeta {
  total_amount: number;
}
```
- Atau cast di hook/page level jika tidak mau extend global type

**Frontend (`OperatingExpenses.tsx`):**
- Ganti `totalExpenses = expenses.reduce(...)` → `(expensesData?.meta as ExpenseMeta)?.total_amount ?? 0`

### Files to Change
- `sinaloka-backend/src/modules/expense/expense.service.ts`
- `sinaloka-platform/src/pages/Finance/OperatingExpenses.tsx`
- `sinaloka-platform/src/types/common.ts` (atau buat expense-specific type)

### Verification
- Total Expenses harus sama nilainya di page 1, 2, dan 3
- Total harus sesuai dengan jumlah semua expense, bukan hanya 20 item
- Total harus berubah saat filter category/search diterapkan (reflect filtered total)
- Clear filter → total kembali ke grand total

---

## Item 4: Command Palette Search Berfungsi

### Problem
- `Dashboard.tsx:362-366` search input di Command Palette tidak ada `value`, `onChange`, atau state
- Keyboard hints ada tapi navigasi keyboard tidak implemented
- Quick actions adalah array hardcoded yang tidak difilter

### Solution
**Frontend (`Dashboard.tsx`):**
- Tambah `useState` untuk search query: `const [paletteSearch, setPaletteSearch] = useState('')`
- Wire `value` dan `onChange` ke input
- Filter `quickActions` array berdasarkan label match (case-insensitive includes)
- Reset search saat palette dibuka: `setPaletteSearch('')` di `setIsCommandPaletteOpen(true)` call site
- Reset search saat palette ditutup: di close handler

**Catatan i18n:** Filtering dilakukan pada translated label (`t(...)` result). Ini berarti filter hanya match pada bahasa yang sedang aktif. Misal: admin yang pakai bahasa Indonesia ketik "pay" tidak akan match "Catat Pembayaran Baru". Ini diterima sebagai limitasi — search bekerja pada bahasa yang sedang aktif.

**Nice-to-have (bukan blocker):** keyboard navigation ArrowUp/Down + Enter.

### Files to Change
- `sinaloka-platform/src/pages/Dashboard.tsx`

### Verification
- Ketik "pay" (EN) atau "catat" (ID) → hanya action yang relevan muncul
- Clear search → semua 4 actions muncul kembali
- Tutup/buka palette → search reset
- Tidak ada action yang cocok → tampilkan empty state "No results"

---

## Item 5: Registration Detail Ditampilkan

### Problem
- ApproveModal dan RejectModal hanya tampilkan nama + email/phone
- Data penting tersedia dari API tapi hidden: grade, parent_name, parent_phone, parent_email (student), subject_names, experience_years (tutor)
- Admin sulit membuat keputusan approve/reject tanpa informasi lengkap

### Solution
**Frontend (`Registrations.tsx`):**
- Extract shared component `RegistrationDetailBlock` untuk menghindari duplikasi antara ApproveModal dan RejectModal
- Komponen menerima `registration` object dan render conditional per type:

**Student registration detail:**
- Grade (badge)
- Parent Name
- Parent Phone
- Parent Email (jika ada)

**Tutor registration detail:**
- Subjects (comma-separated atau badges)
- Experience Years

Tampilkan sebagai grid 2 kolom di bawah nama/email yang sudah ada, dengan label + value per field.

**Null handling:** Gunakan `value || '—'` (bukan `value ?? '—'`) untuk handle baik `null` maupun empty string `''`, karena backend bisa menyimpan keduanya untuk optional fields.

### Files to Change
- `sinaloka-platform/src/pages/Registrations.tsx`

### Verification
- Buka approve modal student → grade, parent info harus terlihat
- Buka approve modal tutor → subjects, experience harus terlihat
- Reject modal juga harus tampilkan info yang sama (shared component)
- Field kosong/null/empty-string tampilkan "—" bukan error
- Layout tidak pecah jika semua optional fields kosong

---

## Implementation Notes

### Urutan Implementasi
1. **Item 3 (Expense) + Item 1 backend** — kedua backend changes di-batch dalam 1 deploy
2. **Item 1 frontend (Students)** — setelah backend deploy
3. **Item 2 (Tutors)** — frontend only
4. **Item 4 (Command Palette)** — frontend only
5. **Item 5 (Registration detail)** — frontend only

### Testing Strategy
- Backend: `npm run build` + `npm run lint` + manual API test via curl/Postman
- Frontend: `npm run build` + `npm run lint` per app yang berubah
- **Manual smoke test wajib** untuk Item 1, 2, 3: test across minimal 2 pages of data untuk memastikan filtering dan pagination bekerja
- Semua perubahan dalam 1 PR: `fix/sprint1-bugfixes`

### Risk Assessment
- **Item 1 & 2** mengubah data flow (client-side → server-side filtering) — perlu tes menyeluruh, debounce wajib
- **Item 3** menambah field di backend response — backward compatible (additive), perlu type extension di frontend
- **Item 4 & 5** murni frontend, isolated, low risk
