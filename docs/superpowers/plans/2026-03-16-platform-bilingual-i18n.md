# Platform Bilingual i18n Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Indonesian (default) and English language support to sinaloka-platform using react-i18next.

**Architecture:** Install i18next + react-i18next, create two JSON translation files (`id.json`, `en.json`), initialize via `initReactI18next` plugin in `src/lib/i18n.ts`, add language toggle to Layout header. Migrate all 14 pages + layout by extracting hardcoded strings into translation keys and replacing with `t()` calls.

**Tech Stack:** i18next, react-i18next, date-fns locales, Intl.NumberFormat

**Spec:** `docs/superpowers/specs/2026-03-16-platform-bilingual-i18n-design.md`

---

## Chunk 1: Foundation — Dependencies, i18n Init, Utilities, Language Toggle

### Task 1: Install Dependencies

**Files:**
- Modify: `sinaloka-platform/package.json`

- [ ] **Step 1: Install i18next and react-i18next**

```bash
cd sinaloka-platform && npm install i18next react-i18next
```

- [ ] **Step 2: Verify installation**

```bash
cd sinaloka-platform && node -e "require('i18next'); require('react-i18next'); console.log('OK')"
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/package.json sinaloka-platform/package-lock.json
git commit -m "chore(platform): add i18next and react-i18next dependencies"
```

---

### Task 2: Create Translation Files (Common + Nav keys)

**Files:**
- Create: `sinaloka-platform/src/locales/id.json`
- Create: `sinaloka-platform/src/locales/en.json`

- [ ] **Step 1: Create Indonesian translation file**

Create `sinaloka-platform/src/locales/id.json`:

```json
{
  "common": {
    "save": "Simpan",
    "saveChanges": "Simpan Perubahan",
    "saving": "Menyimpan...",
    "cancel": "Batal",
    "delete": "Hapus",
    "edit": "Edit",
    "search": "Cari...",
    "loading": "Memuat...",
    "noData": "Tidak ada data",
    "confirm": "Konfirmasi",
    "close": "Tutup",
    "back": "Kembali",
    "next": "Berikutnya",
    "prev": "Sebelumnya",
    "export": "Ekspor",
    "import": "Impor",
    "viewAll": "Lihat Semua",
    "viewDetails": "Lihat Detail",
    "clearAll": "Hapus Semua",
    "clearAllFilters": "Hapus semua filter",
    "filters": "Filter",
    "activeFilters": "Filter Aktif",
    "processing": "Memproses...",
    "page": "Halaman",
    "of": "dari",
    "total": "total",
    "showing": "Menampilkan {{from}} sampai {{to}} dari {{total}} hasil",
    "status": {
      "active": "Aktif",
      "inactive": "Nonaktif",
      "pending": "Menunggu",
      "paid": "Lunas",
      "overdue": "Terlambat",
      "completed": "Selesai",
      "scheduled": "Terjadwal",
      "cancelled": "Dibatalkan",
      "verified": "Terverifikasi",
      "unverified": "Belum Terverifikasi"
    },
    "confirm_delete": "Ketik <1>delete</1> untuk konfirmasi",
    "typeDelete": "delete",
    "actionCannotBeUndone": "Tindakan ini tidak dapat dibatalkan.",
    "selected": "{{count}} dipilih",
    "noResults": "Tidak ditemukan",
    "noResultsDescription": "Coba sesuaikan pencarian atau filter Anda.",
    "allStatuses": "Semua Status"
  },
  "nav": {
    "general": "Umum",
    "academics": "Akademik",
    "operations": "Operasional",
    "finance": "Keuangan",
    "system": "Sistem",
    "dashboard": "Dasbor",
    "students": "Siswa",
    "tutors": "Tutor",
    "classes": "Kelas",
    "schedules": "Jadwal",
    "attendance": "Kehadiran",
    "enrollments": "Pendaftaran",
    "financeOverview": "Ringkasan",
    "studentPayments": "Pembayaran Siswa",
    "tutorPayouts": "Pembayaran Tutor",
    "operatingExpenses": "Biaya Operasional",
    "settings": "Pengaturan"
  },
  "layout": {
    "searchPlaceholder": "Cari apa saja...",
    "logOut": "Keluar",
    "proPlan": "Paket Pro",
    "storageUsage": "Anda menggunakan 80% penyimpanan.",
    "upgradeNow": "Upgrade Sekarang"
  }
}
```

- [ ] **Step 2: Create English translation file**

Create `sinaloka-platform/src/locales/en.json`:

```json
{
  "common": {
    "save": "Save",
    "saveChanges": "Save Changes",
    "saving": "Saving...",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "search": "Search...",
    "loading": "Loading...",
    "noData": "No data",
    "confirm": "Confirm",
    "close": "Close",
    "back": "Back",
    "next": "Next",
    "prev": "Prev",
    "export": "Export",
    "import": "Import",
    "viewAll": "View All",
    "viewDetails": "View Details",
    "clearAll": "Clear all",
    "clearAllFilters": "Clear all filters",
    "filters": "Filters",
    "activeFilters": "Active Filters",
    "processing": "Processing...",
    "page": "Page",
    "of": "of",
    "total": "total",
    "showing": "Showing {{from}} to {{to}} of {{total}} results",
    "status": {
      "active": "Active",
      "inactive": "Inactive",
      "pending": "Pending",
      "paid": "Paid",
      "overdue": "Overdue",
      "completed": "Completed",
      "scheduled": "Scheduled",
      "cancelled": "Cancelled",
      "verified": "Verified",
      "unverified": "Unverified"
    },
    "confirm_delete": "Type <1>delete</1> to confirm",
    "typeDelete": "delete",
    "actionCannotBeUndone": "This action cannot be undone.",
    "selected": "{{count}} selected",
    "noResults": "No results found",
    "noResultsDescription": "Try adjusting your search or filters to find what you're looking for.",
    "allStatuses": "All Statuses"
  },
  "nav": {
    "general": "General",
    "academics": "Academics",
    "operations": "Operations",
    "finance": "Finance",
    "system": "System",
    "dashboard": "Dashboard",
    "students": "Students",
    "tutors": "Tutors",
    "classes": "Classes",
    "schedules": "Schedules",
    "attendance": "Attendance",
    "enrollments": "Enrollments",
    "financeOverview": "Overview",
    "studentPayments": "Student Payments",
    "tutorPayouts": "Tutor Payouts",
    "operatingExpenses": "Operating Expenses",
    "settings": "Settings"
  },
  "layout": {
    "searchPlaceholder": "Search anything...",
    "logOut": "Log out",
    "proPlan": "Pro Plan",
    "storageUsage": "You're using 80% of your storage.",
    "upgradeNow": "Upgrade Now"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/locales/
git commit -m "feat(platform): add initial id.json and en.json translation files"
```

---

### Task 3: Create i18n Initialization

**Files:**
- Create: `sinaloka-platform/src/lib/i18n.ts`
- Modify: `sinaloka-platform/src/main.tsx`

- [ ] **Step 1: Create i18n.ts initialization file**

Create `sinaloka-platform/src/lib/i18n.ts`:

```ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import id from '../locales/id.json';
import en from '../locales/en.json';

const savedLang = localStorage.getItem('sinaloka-lang') || 'id';

i18n.use(initReactI18next).init({
  resources: {
    id: { translation: id },
    en: { translation: en },
  },
  lng: savedLang,
  fallbackLng: 'id',
  interpolation: { escapeValue: false },
});

// Set document lang attribute on init
document.documentElement.lang = savedLang;

export default i18n;
```

- [ ] **Step 2: Import i18n in main.tsx**

Add this line at the TOP of `sinaloka-platform/src/main.tsx` (before all other imports):

```ts
import './lib/i18n';
```

- [ ] **Step 3: Verify app still loads**

```bash
cd sinaloka-platform && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/lib/i18n.ts sinaloka-platform/src/main.tsx
git commit -m "feat(platform): initialize i18next with initReactI18next plugin"
```

---

### Task 4: Add Shared Formatting Utilities

**Files:**
- Modify: `sinaloka-platform/src/lib/utils.ts`

- [ ] **Step 1: Add formatDate and formatCurrency helpers to utils.ts**

Append to `sinaloka-platform/src/lib/utils.ts`:

```ts
export function formatDate(dateStr: string | null | undefined, lang: string = 'id'): string {
  if (!dateStr) return '—';
  const locale = lang === 'id' ? 'id-ID' : 'en-US';
  return new Date(dateStr).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatCurrency(amount: number, lang: string = 'id'): string {
  const locale = lang === 'id' ? 'id-ID' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrencyShort(amount: number, lang: string = 'id'): string {
  if (amount >= 1_000_000_000) return `Rp ${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `Rp ${(amount / 1_000).toFixed(0)}K`;
  const locale = lang === 'id' ? 'id-ID' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function getDateFnsLocale(lang: string = 'id') {
  // Lazy import to avoid bundling both if only one is used
  return lang === 'id'
    ? import('date-fns/locale/id').then(m => m.id)
    : import('date-fns/locale/en-US').then(m => m.enUS);
}
```

- [ ] **Step 2: Verify build**

```bash
cd sinaloka-platform && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/lib/utils.ts
git commit -m "feat(platform): add locale-aware formatDate, formatCurrency, and getDateFnsLocale helpers"
```

---

### Task 5: Add Language Toggle to Layout

**Files:**
- Modify: `sinaloka-platform/src/components/Layout.tsx`
- Modify: `sinaloka-platform/src/locales/id.json` (if needed)
- Modify: `sinaloka-platform/src/locales/en.json` (if needed)

- [ ] **Step 1: Add language toggle to Layout Header**

In `sinaloka-platform/src/components/Layout.tsx`:

1. Add import at top:
```ts
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
```

2. In the `Header` component, add `i18n` and `toggleLanguage` props, then add the toggle button between the dark mode toggle and the notification bell:
```tsx
<button
  onClick={toggleLanguage}
  className="px-2 py-1 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-full transition-colors border border-zinc-200 dark:border-zinc-800"
  title={i18n.language === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
>
  {i18n.language === 'id' ? 'ID' : 'EN'}
</button>
```

3. In the `Layout` component body, add:
```ts
const { t, i18n } = useTranslation();

const toggleLanguage = () => {
  const newLang = i18n.language === 'id' ? 'en' : 'id';
  i18n.changeLanguage(newLang);
  localStorage.setItem('sinaloka-lang', newLang);
  document.documentElement.lang = newLang;
};
```

4. Replace all hardcoded navigation strings with `t()` calls:
   - Section titles: `"General"` → `{t('nav.general')}`, etc.
   - Menu labels: `label="Dashboard"` → `label={t('nav.dashboard')}`, etc.
   - Page title map: replace with `t()` lookups
   - `"Search anything..."` → `t('layout.searchPlaceholder')`
   - `"Pro Plan"` → `t('layout.proPlan')`
   - `"You're using 80%..."` → `t('layout.storageUsage')`
   - `"Upgrade Now"` → `t('layout.upgradeNow')`
   - `"Log out"` → `t('layout.logOut')`

5. Pass `i18n` and `toggleLanguage` to `Header` and wire the toggle.

- [ ] **Step 2: Verify language toggle works**

```bash
cd sinaloka-platform && npm run build
```

Start dev server, click the `ID`/`EN` toggle — sidebar and header text should switch languages.

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/components/Layout.tsx
git commit -m "feat(platform): add language toggle to header and translate Layout/Nav strings"
```

---

## Chunk 2: Migrate Pages — Login, Dashboard, NotFound

### Task 6: Migrate Login Page

**Files:**
- Modify: `sinaloka-platform/src/pages/Login.tsx`
- Modify: `sinaloka-platform/src/locales/id.json`
- Modify: `sinaloka-platform/src/locales/en.json`

- [ ] **Step 1: Add login keys to both translation files**

Add to `id.json`:
```json
"login": {
  "title": "Sinaloka",
  "subtitle": "Masuk ke akun Anda",
  "email": "Alamat email",
  "emailPlaceholder": "admin@sinaloka.com",
  "password": "Kata sandi",
  "passwordPlaceholder": "••••••••",
  "submit": "Masuk",
  "submitting": "Sedang masuk...",
  "error": "Email atau kata sandi salah. Silakan coba lagi.",
  "copyright": "© {{year}} Sinaloka. Hak cipta dilindungi."
}
```

Add to `en.json`:
```json
"login": {
  "title": "Sinaloka",
  "subtitle": "Sign in to your account",
  "email": "Email address",
  "emailPlaceholder": "admin@sinaloka.com",
  "password": "Password",
  "passwordPlaceholder": "••••••••",
  "submit": "Sign in",
  "submitting": "Signing in...",
  "error": "Invalid email or password. Please try again.",
  "copyright": "© {{year}} Sinaloka. All rights reserved."
}
```

- [ ] **Step 2: Replace hardcoded strings in Login.tsx**

Add `import { useTranslation } from 'react-i18next';` and `const { t } = useTranslation();` inside the component. Replace all hardcoded strings with `t('login.xxx')` calls.

- [ ] **Step 3: Verify build**

```bash
cd sinaloka-platform && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/pages/Login.tsx sinaloka-platform/src/locales/
git commit -m "feat(platform): translate Login page to bilingual"
```

---

### Task 7: Migrate Dashboard Page

**Files:**
- Modify: `sinaloka-platform/src/pages/Dashboard.tsx`
- Modify: `sinaloka-platform/src/locales/id.json`
- Modify: `sinaloka-platform/src/locales/en.json`

- [ ] **Step 1: Add dashboard keys to both translation files**

Add to `id.json`:
```json
"dashboard": {
  "greeting": "Selamat Pagi",
  "subtitle": "Berikut yang terjadi di Sinaloka Platform hari ini.",
  "schedule": "Jadwal",
  "quickActions": "Aksi Cepat",
  "quickEnroll": "Daftar Cepat",
  "recordPayment": "Catat Pembayaran",
  "addMakeupClass": "Tambah Kelas Pengganti",
  "totalStudents": "Total Siswa",
  "activeTutors": "Tutor Aktif",
  "attendanceRate": "Tingkat Kehadiran",
  "monthlyRevenue": "Pendapatan Bulanan",
  "overview": "Ringkasan",
  "overviewDesc": "Metrik utama sekilas",
  "fullSchedule": "Jadwal Lengkap",
  "upcomingSessions": "Sesi Mendatang",
  "upcomingSessionsDesc": "Sesi yang dijadwalkan dalam waktu dekat",
  "studentAttendance": "Kehadiran Siswa",
  "studentAttendanceDesc": "Kehadiran keseluruhan di semua sesi",
  "totalStudentsCard": "Total Siswa",
  "totalStudentsCardDesc": "Siswa terdaftar di platform",
  "viewStudents": "Lihat Siswa",
  "revenueSummary": "Ringkasan Pendapatan",
  "quickLinks": "Tautan Cepat",
  "viewAllStudents": "Lihat Semua Siswa",
  "manageFinance": "Kelola Keuangan",
  "attendanceRecords": "Catatan Kehadiran",
  "recentActivity": "Aktivitas Terbaru",
  "noRecentActivity": "Tidak ada aktivitas terbaru",
  "searchPlaceholder": "Cari siswa, tutor, atau aksi...",
  "navigate": "Navigasi",
  "select": "Pilih",
  "version": "Sinaloka Platform v1.0",
  "enrolled": "terdaftar",
  "rate": "tingkat",
  "timeAgo": {
    "minutes": "menit yang lalu",
    "hours": "jam yang lalu",
    "days": "hari yang lalu"
  },
  "categories": {
    "operations": "Operasional",
    "finance": "Keuangan",
    "academic": "Akademik",
    "system": "Sistem"
  }
}
```

Add equivalent `en.json` keys with English values.

- [ ] **Step 2: Replace hardcoded strings in Dashboard.tsx**

Add `useTranslation` hook. Replace all hardcoded strings with `t()` calls. Replace inline `formatCurrency` with the shared `formatCurrencyShort` from utils.ts (pass `i18n.language`). Replace inline date formatting with `formatDate` from utils.ts.

- [ ] **Step 3: Verify build**

```bash
cd sinaloka-platform && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/pages/Dashboard.tsx sinaloka-platform/src/locales/
git commit -m "feat(platform): translate Dashboard page to bilingual"
```

---

### Task 8: Migrate NotFound Page

**Files:**
- Modify: `sinaloka-platform/src/pages/NotFound.tsx`
- Modify: `sinaloka-platform/src/locales/id.json`
- Modify: `sinaloka-platform/src/locales/en.json`

- [ ] **Step 1: Add notFound keys to both files**

`id.json`:
```json
"notFound": {
  "code": "404",
  "message": "Halaman yang Anda cari tidak ditemukan.",
  "backToDashboard": "Kembali ke Dasbor"
}
```

`en.json`:
```json
"notFound": {
  "code": "404",
  "message": "The page you're looking for doesn't exist.",
  "backToDashboard": "Back to Dashboard"
}
```

- [ ] **Step 2: Replace strings in NotFound.tsx**

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/pages/NotFound.tsx sinaloka-platform/src/locales/
git commit -m "feat(platform): translate NotFound page to bilingual"
```

---

## Chunk 3: Migrate Academic Pages — Students, Tutors, Classes

### Task 9: Migrate Students Page

**Files:**
- Modify: `sinaloka-platform/src/pages/Students.tsx`
- Modify: `sinaloka-platform/src/locales/id.json`
- Modify: `sinaloka-platform/src/locales/en.json`

- [ ] **Step 1: Add students keys to both translation files**

Add to `id.json`:
```json
"students": {
  "title": "Siswa",
  "description": "Kelola dan pantau direktori siswa Anda.",
  "addStudent": "Tambah Siswa",
  "totalStudents": "Total Siswa",
  "activeStudents": "Siswa Aktif",
  "inactive": "Nonaktif",
  "totalAllPages": "Total (Semua Halaman)",
  "allRecords": "Semua Data",
  "searchPlaceholder": "Cari berdasarkan nama atau email...",
  "allGrades": "Semua Tingkat",
  "allStatus": "Semua Status",
  "table": {
    "name": "Nama",
    "email": "Email",
    "grade": "Tingkat",
    "parent": "Orang Tua/Wali",
    "status": "Status"
  },
  "form": {
    "fullName": "Nama Lengkap",
    "fullNamePlaceholder": "mis. John Doe",
    "email": "Alamat Email",
    "emailPlaceholder": "john@example.com",
    "phone": "Nomor Telepon",
    "phonePlaceholder": "+62 812 3456 7890",
    "grade": "Tingkat",
    "status": "Status",
    "parentName": "Nama Orang Tua/Wali",
    "parentNamePlaceholder": "mis. Jane Doe",
    "parentPhone": "Telepon Orang Tua/Wali",
    "parentPhonePlaceholder": "+62 812 3456 7890",
    "parentEmail": "Email Orang Tua/Wali",
    "parentEmailPlaceholder": "orangtua@example.com"
  },
  "modal": {
    "addTitle": "Daftarkan Siswa Baru",
    "editTitle": "Edit Profil Siswa",
    "deleteTitle": "Hapus Siswa",
    "deleteWarning": "Ini akan menghapus <strong>{{name}}</strong> secara permanen beserta semua data terkait termasuk pendaftaran, catatan kehadiran, dan riwayat pembayaran.",
    "deleteConfirmLabel": "Ketik <1>delete</1> untuk konfirmasi",
    "bulkDeleteTitle": "Hapus Beberapa Siswa",
    "bulkDeleteWarning": "Anda akan menghapus <strong>{{count}} siswa</strong> secara permanen beserta semua data terkait.",
    "importTitle": "Impor Siswa",
    "importHowTo": "Cara mengimpor siswa",
    "importStep1": "Unduh template CSV di bawah",
    "importStep2": "Isi data siswa sesuai format",
    "importStep3": "Unggah file CSV yang sudah diisi",
    "importStep4": "Klik \"Impor\" untuk memproses",
    "downloadTemplate": "Unduh Template",
    "downloadTemplateDesc": "File CSV dengan header dan contoh baris",
    "csvFormat": "Format CSV",
    "csvRequired": "Kolom <1>name</1> dan <1>grade</1> wajib diisi. Lainnya opsional.",
    "uploadCsv": "Klik untuk unggah CSV",
    "uploadCsvOnly": "Hanya file .csv yang didukung",
    "clickToChange": "Klik untuk ganti file",
    "importStudents": "Impor Siswa"
  },
  "toast": {
    "created": "Siswa berhasil dibuat",
    "createFailed": "Gagal membuat siswa",
    "updated": "Siswa berhasil diperbarui",
    "updateFailed": "Gagal memperbarui siswa",
    "deleted": "Siswa berhasil dihapus",
    "deleteFailed": "Gagal menghapus siswa",
    "bulkDeleted": "{{count}} siswa berhasil dihapus",
    "imported": "Siswa berhasil diimpor",
    "importFailed": "Gagal mengimpor siswa",
    "exported": "Siswa berhasil diekspor",
    "exportFailed": "Gagal mengekspor siswa",
    "inviteSent": "Undangan terkirim ke {{email}}",
    "inviteFailed": "Gagal mengirim undangan"
  },
  "drawer": {
    "title": "Profil Siswa",
    "contactInfo": "Informasi Kontak",
    "email": "Email",
    "phone": "Telepon",
    "enrolledDate": "Tanggal Pendaftaran",
    "parentGuardian": "Orang Tua/Wali",
    "primaryContact": "Kontak Utama",
    "noParentEmail": "Tidak ada email orang tua",
    "inviteParent": "Undang Orang Tua",
    "sendingInvite": "Mengirim..."
  },
  "actions": {
    "viewEdit": "Lihat / Edit",
    "inviteParent": "Undang Orang Tua",
    "createStudent": "Buat Siswa",
    "updateStudent": "Perbarui Siswa",
    "deleteStudent": "Hapus Siswa",
    "deleting": "Menghapus...",
    "importing": "Mengimpor..."
  },
  "pagination": {
    "page": "Halaman",
    "of": "dari",
    "totalStudents": "total siswa"
  }
}
```

Add equivalent `en.json` keys with English values.

- [ ] **Step 2: Replace all hardcoded strings in Students.tsx**

Add `useTranslation` hook. Replace every hardcoded string with appropriate `t()` call. Remove the local `formatDate` function and use the shared one from `utils.ts` with `i18n.language`.

- [ ] **Step 3: Verify build**

```bash
cd sinaloka-platform && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/pages/Students.tsx sinaloka-platform/src/locales/
git commit -m "feat(platform): translate Students page to bilingual"
```

---

### Task 10: Migrate Tutors Page

**Files:**
- Modify: `sinaloka-platform/src/pages/Tutors.tsx`
- Modify: `sinaloka-platform/src/locales/id.json`
- Modify: `sinaloka-platform/src/locales/en.json`

- [ ] **Step 1: Add tutors keys to both translation files**

Add ~60 keys for Tutors page covering: title, description, form labels, table headers, toast messages, action labels, modal titles, status labels, placeholders. Follow the same naming convention as students.

- [ ] **Step 2: Replace hardcoded strings in Tutors.tsx**

Add `useTranslation` hook. Replace all strings with `t()` calls.

- [ ] **Step 3: Verify build and commit**

```bash
cd sinaloka-platform && npx tsc --noEmit
git add sinaloka-platform/src/pages/Tutors.tsx sinaloka-platform/src/locales/
git commit -m "feat(platform): translate Tutors page to bilingual"
```

---

### Task 11: Migrate Classes Page

**Files:**
- Modify: `sinaloka-platform/src/pages/Classes.tsx`
- Modify: `sinaloka-platform/src/locales/id.json`
- Modify: `sinaloka-platform/src/locales/en.json`

- [ ] **Step 1: Add classes keys to both translation files**

Add ~55 keys covering: title, description, stats cards, table headers, form labels (class name, subject, tutor, capacity, fee, schedule, room), modal titles, toast messages, status labels, subject options, day names, pagination.

- [ ] **Step 2: Replace hardcoded strings in Classes.tsx**

Add `useTranslation` hook. Replace all strings. Replace inline `formatCurrency` with shared `formatCurrency` from utils.ts (pass `i18n.language`).

- [ ] **Step 3: Verify build and commit**

```bash
cd sinaloka-platform && npx tsc --noEmit
git add sinaloka-platform/src/pages/Classes.tsx sinaloka-platform/src/locales/
git commit -m "feat(platform): translate Classes page to bilingual"
```

---

## Chunk 4: Migrate Operations Pages — Schedules, Attendance, Enrollments

### Task 12: Migrate Schedules Page

**Files:**
- Modify: `sinaloka-platform/src/pages/Schedules.tsx`
- Modify: `sinaloka-platform/src/locales/id.json`
- Modify: `sinaloka-platform/src/locales/en.json`

- [ ] **Step 1: Add schedules keys to both files** (~45 keys)

- [ ] **Step 2: Replace strings in Schedules.tsx**

Add `useTranslation` hook. Replace all strings. Update `date-fns` `format()` calls to use locale from `getDateFnsLocale(i18n.language)`.

- [ ] **Step 3: Verify build and commit**

```bash
git add sinaloka-platform/src/pages/Schedules.tsx sinaloka-platform/src/locales/
git commit -m "feat(platform): translate Schedules page to bilingual"
```

---

### Task 13: Migrate Attendance Page

**Files:**
- Modify: `sinaloka-platform/src/pages/Attendance.tsx`
- Modify: `sinaloka-platform/src/locales/id.json`
- Modify: `sinaloka-platform/src/locales/en.json`

- [ ] **Step 1: Add attendance keys to both files** (~30 keys)

Covers: title, description, session statuses, attendance statuses (Present/Absent/Late), form labels, toast messages, keyboard hints.

- [ ] **Step 2: Replace strings in Attendance.tsx**

Add `useTranslation` hook. Replace all strings. Update `date-fns` `format()` calls to use locale.

- [ ] **Step 3: Verify build and commit**

```bash
git add sinaloka-platform/src/pages/Attendance.tsx sinaloka-platform/src/locales/
git commit -m "feat(platform): translate Attendance page to bilingual"
```

---

### Task 14: Migrate Enrollments Page

**Files:**
- Modify: `sinaloka-platform/src/pages/Enrollments.tsx`
- Modify: `sinaloka-platform/src/locales/id.json`
- Modify: `sinaloka-platform/src/locales/en.json`

- [ ] **Step 1: Add enrollments keys to both files** (~60 keys)

- [ ] **Step 2: Replace strings in Enrollments.tsx**

- [ ] **Step 3: Verify build and commit**

```bash
git add sinaloka-platform/src/pages/Enrollments.tsx sinaloka-platform/src/locales/
git commit -m "feat(platform): translate Enrollments page to bilingual"
```

---

## Chunk 5: Migrate Finance Pages + Settings + Components

### Task 15: Migrate Finance Overview Page

**Files:**
- Modify: `sinaloka-platform/src/pages/Finance/FinanceOverview.tsx`
- Modify: `sinaloka-platform/src/locales/id.json`
- Modify: `sinaloka-platform/src/locales/en.json`

- [ ] **Step 1: Add finance keys to both files** (~60 keys under `"finance"` namespace)

- [ ] **Step 2: Replace strings and consolidate formatCurrency usage**

- [ ] **Step 3: Verify build and commit**

```bash
git add sinaloka-platform/src/pages/Finance/FinanceOverview.tsx sinaloka-platform/src/locales/
git commit -m "feat(platform): translate Finance Overview page to bilingual"
```

---

### Task 16: Migrate Student Payments Page

**Files:**
- Modify: `sinaloka-platform/src/pages/Finance/StudentPayments.tsx`
- Modify: `sinaloka-platform/src/locales/id.json`
- Modify: `sinaloka-platform/src/locales/en.json`

- [ ] **Step 1: Add payment keys** (~45 keys under `"payments"` namespace)

- [ ] **Step 2: Replace strings**

- [ ] **Step 3: Verify build and commit**

```bash
git add sinaloka-platform/src/pages/Finance/StudentPayments.tsx sinaloka-platform/src/locales/
git commit -m "feat(platform): translate Student Payments page to bilingual"
```

---

### Task 17: Migrate Tutor Payouts Page

**Files:**
- Modify: `sinaloka-platform/src/pages/Finance/TutorPayouts.tsx`
- Modify: `sinaloka-platform/src/locales/id.json`
- Modify: `sinaloka-platform/src/locales/en.json`

- [ ] **Step 1: Add payout keys** (~50 keys under `"payouts"` namespace)

- [ ] **Step 2: Replace strings**

- [ ] **Step 3: Verify build and commit**

```bash
git add sinaloka-platform/src/pages/Finance/TutorPayouts.tsx sinaloka-platform/src/locales/
git commit -m "feat(platform): translate Tutor Payouts page to bilingual"
```

---

### Task 18: Migrate Operating Expenses Page

**Files:**
- Modify: `sinaloka-platform/src/pages/Finance/OperatingExpenses.tsx`
- Modify: `sinaloka-platform/src/locales/id.json`
- Modify: `sinaloka-platform/src/locales/en.json`

- [ ] **Step 1: Add expenses keys** (~50 keys under `"expenses"` namespace)

- [ ] **Step 2: Replace strings**

- [ ] **Step 3: Verify build and commit**

```bash
git add sinaloka-platform/src/pages/Finance/OperatingExpenses.tsx sinaloka-platform/src/locales/
git commit -m "feat(platform): translate Operating Expenses page to bilingual"
```

---

### Task 19: Migrate Settings Page

**Files:**
- Modify: `sinaloka-platform/src/pages/Settings.tsx`
- Modify: `sinaloka-platform/src/locales/id.json`
- Modify: `sinaloka-platform/src/locales/en.json`

- [ ] **Step 1: Add settings keys** (~110 keys under `"settings"` namespace)

This is the largest page — covers: tab labels, institution info form, billing config, branding, academic settings (working days, subjects, grades, rooms), security, integrations.

- [ ] **Step 2: Replace strings and wire up the existing language selector to i18n**

The Settings page already has a non-functional language dropdown. Wire it to call `i18n.changeLanguage()` and update localStorage.

- [ ] **Step 3: Verify build and commit**

```bash
git add sinaloka-platform/src/pages/Settings.tsx sinaloka-platform/src/locales/
git commit -m "feat(platform): translate Settings page to bilingual and wire language selector"
```

---

### Task 20: Migrate ReportPreviewModal

**Files:**
- Modify: `sinaloka-platform/src/components/ReportPreviewModal.tsx`
- Modify: `sinaloka-platform/src/locales/id.json`
- Modify: `sinaloka-platform/src/locales/en.json`

- [ ] **Step 1: Add report keys** (~15 keys under `"report"` namespace)

- [ ] **Step 2: Replace strings**

- [ ] **Step 3: Verify build and commit**

```bash
git add sinaloka-platform/src/components/ReportPreviewModal.tsx sinaloka-platform/src/locales/
git commit -m "feat(platform): translate ReportPreviewModal to bilingual"
```

---

## Chunk 6: Final Verification

### Task 21: Full Build + Manual Smoke Test

- [ ] **Step 1: Run full TypeScript check**

```bash
cd sinaloka-platform && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 2: Run production build**

```bash
cd sinaloka-platform && npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Manual smoke test**

Start dev server (`npm run dev`). Verify:
1. App loads in Bahasa Indonesia by default
2. Click language toggle → all text switches to English
3. Refresh page → language persists (localStorage)
4. Navigate to each page → all text is translated
5. Date formatting changes with language (e.g., "15 Maret 2026" vs "March 15, 2026")
6. Currency formatting works correctly
7. Toast messages appear in correct language
8. Forms, modals, drawers all show translated text

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(platform): complete bilingual i18n implementation (Indonesian + English)"
```
