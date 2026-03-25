# Sprint 3: UX Improvements — Design Spec

> **Date:** 2026-03-22
> **Scope:** 5 items across sinaloka-platform + sinaloka-backend
> **Branch:** `feat/sprint3-ux-improvements`

---

## Item 1: Email Notifikasi Registrant Saat Reject + Email Required

### Problem
- Saat admin reject registrasi, registrant tidak mendapat notifikasi apapun — silent rejection
- Email di student registration form saat ini optional — padahal perlu untuk kirim notifikasi

### Current State
- `registration.service.ts` `reject` method: update status saja, tidak kirim email
- `StudentRegistrationSchema`: email optional, phone optional
- `TutorRegistrationSchema`: email sudah required
- `email.service.ts`: tidak ada method `sendRegistrationRejected`

### Solution

**Backend (`registration.dto.ts`):**
- Ubah `email` di `StudentRegistrationSchema` dari optional ke required: `z.string().email()`
- Ini akan memaksa student registrant harus isi email di form publik

**Backend (`email.service.ts`):**
- Tambah method `sendRegistrationRejected(to: string, params: { name: string, institutionName: string, reason?: string })`
- Template email: informasikan bahwa registrasi ditolak, sertakan alasan jika ada
- Styling konsisten dengan email template lain (HTML template)

**Backend (`registration.service.ts`):**
- Di akhir method `reject`, setelah update status: panggil `emailService.sendRegistrationRejected` jika `registration.email` ada
- Perlu inject `EmailService` ke `RegistrationService` jika belum ada

**Frontend (landing page registration form):**
- `sinaloka-landing` registration form mungkin perlu diupdate untuk mark email sebagai required — tapi ini hanya perlu jika form sudah render email sebagai optional. Backend validation akan enforce ini regardless.

**Catatan migrasi:** Field `email` di model `Registration` Prisma saat ini `String?` (nullable). Perubahan DTO ke required hanya enforce di level validasi request — data lama yang sudah null tetap ada. Tidak perlu migrasi database karena kita tidak mengubah schema Prisma, hanya DTO validation. Registrasi baru akan wajib isi email.

### Files to Change
- `sinaloka-backend/src/modules/registration/registration.dto.ts` — email required di StudentRegistrationSchema
- `sinaloka-backend/src/modules/email/email.service.ts` — tambah `sendRegistrationRejected` method
- `sinaloka-backend/src/modules/registration/registration.service.ts` — panggil email di reject method (gunakan `registration.email` yang mungkin null untuk data lama — skip email jika null)
- `sinaloka-backend/src/modules/registration/registration.module.ts` — import EmailModule jika belum

### Verification
- Submit student registration tanpa email → validasi error dari backend
- Admin reject registration dengan email → email terkirim ke registrant
- Admin reject registration data lama tanpa email → skip email, no error
- Email berisi nama, institusi, alasan penolakan (jika ada)
- Reject registration tanpa alasan → email tetap terkirim, tanpa section alasan

---

## Item 2: Session Edit UI (Date, Time, Status Only)

### Problem
- Tidak ada cara edit session yang sudah ter-generate selain cancel dan buat ulang
- Backend `useUpdateSession` hook sudah ada tapi tidak ada UI

### Current State
- `SessionDetailDrawer.tsx`: hanya punya Mark Attendance + Cancel Session buttons
- `session.service.ts` `update`: validasi — reject jika COMPLETED atau past date (kecuali marking complete)
- `UpdateSessionSchema`: `date`, `start_time`, `end_time`, `status`, `topic_covered`, `session_summary`
- Session locked jika COMPLETED atau tanggal sudah lewat
- **Session model TIDAK punya `tutor_id` atau `room_id` kolom** — tutor dan room berasal dari relasi Class. Menambah session-level override memerlukan migrasi database dan scope yang lebih besar, jadi kita scope down ke field yang sudah ada.

### Solution (scoped down — no migration needed)

**Backend:** Tidak perlu diubah — `UpdateSessionSchema` sudah support `date`, `start_time`, `end_time`, `status`. Backend `update` method sudah bisa handle semua field ini.

**Frontend (`SessionDetailDrawer.tsx` + new `EditSessionModal.tsx`):**
- Tambah "Edit Session" button di action buttons (hanya muncul jika session belum locked)
- Buka modal edit dengan fields yang sudah didukung backend:
  - Date (date input)
  - Start Time (select, 30-min intervals)
  - End Time (select, 30-min intervals)
  - Status (select: SCHEDULED / CANCELLED)
- **Tutor dan Room tidak di-include** — ini level Class, bukan per-session. Untuk ganti tutor/room, admin edit di Class page.
- Pre-fill dari data session saat ini
- Submit: `PATCH /api/admin/sessions/:id`
- On success: toast, close modal, refetch sessions

**Catatan scope masa depan:** Menambah session-level tutor/room override (e.g., tutor pengganti) membutuhkan migrasi database (`tutor_id` + `room_id` columns di Session model) dan akan menjadi item terpisah di sprint berikutnya.

### Files to Change
- `sinaloka-platform/src/pages/Schedules/EditSessionModal.tsx` — new file, edit form modal
- `sinaloka-platform/src/pages/Schedules/SessionDetailDrawer.tsx` — add Edit button
- `sinaloka-platform/src/hooks/useSessions.ts` — verify useUpdateSession hook exists

### Verification
- Edit session date/time → session moves in calendar
- Change tutor → drawer shows new tutor
- Change room → drawer shows new room
- Change status to CANCELLED → session cancelled
- Cannot edit COMPLETED or past sessions (locked)
- Editing RESCHEDULE_REQUESTED session works normally

---

## Item 3: Hapus "Send Reminder" Button Stub di Enrollments

### Problem
- CreditCard icon button pada OVERDUE enrollments tidak punya onClick handler — dead button
- Membingungkan user karena terlihat interaktif tapi tidak melakukan apa-apa

### Current State
- `EnrollmentTable.tsx` lines 212-216: button dengan `<CreditCard size={14} />` tanpa onClick
- Reminder sudah bisa dilakukan di halaman `/finance/payments`

### Solution
- Hapus button stub sepenuhnya dari `EnrollmentTable.tsx`
- Import `CreditCard` juga bisa dihapus jika tidak dipakai di tempat lain

### Files to Change
- `sinaloka-platform/src/pages/Enrollments/EnrollmentTable.tsx`

### Verification
- OVERDUE enrollment row tidak lagi menampilkan CreditCard icon button
- Tidak ada dead/unresponsive buttons di enrollment table
- Build clean

---

## Item 4: Expense Export Wiring

### Problem
- Export button di Operating Expenses page tidak punya onClick handler — dead button
- Tidak ada backend endpoint untuk export expenses

### Current State
- `OperatingExpenses.tsx` lines 219-222: Button tanpa onClick
- `expense.controller.ts`: tidak ada export endpoint
- Pattern yang sudah ada: `GET /api/admin/students/export` dan `GET /api/admin/enrollments/export` return CSV blob

### Solution

**Backend (`expense.controller.ts` + `expense.service.ts`):**
- Tambah endpoint `GET /api/admin/expenses/export` yang return CSV blob
- Query params: `category`, `date_from`, `date_to`, `search` (sama dengan list endpoint)
- CSV columns: Date, Category, Description, Amount, Recurring, Receipt URL
- Response type: `text/csv` dengan `Content-Disposition: attachment`

**Frontend (`OperatingExpenses.tsx`):**
- Wire onClick ke export mutation
- Pass ALL active filters ke export endpoint: `category`, `search`, `date_from`, `date_to` (konsisten dengan list endpoint)
- Download file sebagai `expenses_export_YYYY-MM-DD.csv` (dynamic date di Content-Disposition header)

**Frontend hooks/services:**
- Tambah `exportExpenses` method di expense service
- Tambah `useExportExpenses` mutation hook

### Files to Change
- `sinaloka-backend/src/modules/expense/expense.service.ts` — add export method
- `sinaloka-backend/src/modules/expense/expense.controller.ts` — add GET /export endpoint
- `sinaloka-platform/src/services/expenses.service.ts` — add exportCsv method
- `sinaloka-platform/src/hooks/useExpenses.ts` — add useExportExpenses hook
- `sinaloka-platform/src/pages/Finance/OperatingExpenses.tsx` — wire Export button

### Verification
- Klik Export → CSV file downloaded
- CSV berisi semua expenses (bukan hanya page saat ini)
- Filter category/search di-respect oleh export
- File name: `expenses_export_YYYY-MM-DD.csv`

---

## Item 5: Tambah Link Pembayaran di WhatsApp Reminder Template

### Problem
- WhatsApp payment reminder tidak menyertakan link pembayaran
- Parent harus login ke portal untuk bayar — friction tinggi
- Midtrans checkout sudah ada (`POST /api/payments/:id/checkout`) tapi tidak dipakai di flow reminder

### Current State
- `whatsapp.service.ts` `sendPaymentReminder`: compose message tanpa link
- Checkout logic di `payment-gateway.controller.ts` lines 42-132 — generate Snap URL via `midtransService.createSnapTransaction`
- Checkout membutuhkan: payment record, Midtrans config, customer details

### Solution

**Backend — approach: extract checkout logic ke `PaymentGatewayService`:**

Untuk menghindari coupling langsung `WhatsappModule` → `PaymentModule` (risiko circular dependency), dan menjaga separation of concerns agar `WhatsappService` tidak langsung menulis ke tabel `payment`:

1. **Extract checkout URL generation** ke method di `PaymentGatewayService` (atau service baru) yang bisa di-share:
   - Method: `getOrCreateCheckoutUrl(paymentId, institutionId): Promise<string | null>`
   - Logic: cek `payment.snap_redirect_url` — jika sudah ada dan payment belum expired (PENDING/OVERDUE), **reuse URL** tanpa call Midtrans lagi. Jika belum ada, generate via `midtransService.createSnapTransaction(...)` dan persist ke payment record.
   - Return `redirect_url` atau `null` jika Midtrans tidak configured

2. **Di `WhatsappService.sendPaymentReminder`:**
   - Panggil `paymentGatewayService.getOrCreateCheckoutUrl(paymentId, institutionId)`
   - Jika URL ada, append ke message template:
   ```
   📱 Bayar langsung: {redirect_url}
   ```
   - Jika null (Midtrans tidak configured): kirim reminder tanpa link (sama seperti saat ini)

**Catatan keamanan:** Midtrans Snap URL sudah inherently secure — setiap URL unik per transaksi dan expire setelah 24 jam. Tidak perlu tambahan auth.

**Catatan circular dependency:** `WhatsappModule` akan import service dari payment module. Saat ini `PaymentModule` TIDAK import `WhatsappModule`, jadi aman. Jika di masa depan perlu kirim WhatsApp dari payment flow, gunakan `forwardRef` atau extract ke shared module.

### Files to Change
- `sinaloka-backend/src/modules/payment/payment-gateway.service.ts` — new file, extract `getOrCreateCheckoutUrl` method
- `sinaloka-backend/src/modules/payment/payment.module.ts` — export PaymentGatewayService
- `sinaloka-backend/src/modules/whatsapp/whatsapp.service.ts` — inject PaymentGatewayService, panggil di sendPaymentReminder
- `sinaloka-backend/src/modules/whatsapp/whatsapp.module.ts` — import PaymentModule

### Verification
- Send payment reminder → WhatsApp message berisi link pembayaran
- Parent klik link → langsung ke Midtrans checkout page
- Jika Midtrans belum dikonfigurasi → reminder terkirim tanpa link (no error)
- Payment record ter-update dengan snap_token dan redirect_url
- Dedup guard tetap berfungsi (reminder dalam 24 jam → skip)

---

## Implementation Notes

### Urutan Implementasi
1. Item 3 (Hapus button stub) — trivial, hapus saja
2. Item 1 backend (email required + reject notification)
3. Item 4 (Expense export) — backend + frontend
4. Item 5 (WhatsApp link) — backend only
5. Item 2 (Session edit) — paling kompleks, backend + frontend

### Testing Strategy
- Backend: `npm run build` per change
- Frontend: `npm run build` + `npm run lint`
- Manual smoke test untuk Item 1 (email), Item 4 (CSV download), Item 5 (WhatsApp message content)
- Semua perubahan dalam 1 PR: `feat/sprint3-ux-improvements`

### Risk Assessment
- **Item 1** — Registration DTO change (email required) bisa break existing frontend form jika belum updated. Tapi backend validation akan catch ini. Medium risk.
- **Item 2** — Session edit menambah complexity pada scheduling. Perlu validasi tutor availability. Medium risk.
- **Item 3** — Hapus dead button. Zero risk.
- **Item 4** — New endpoint + frontend wiring. Low risk (follow existing export pattern).
- **Item 5** — Inject Midtrans ke WhatsApp flow. Medium risk (cross-module dependency, Midtrans API call bisa fail).
