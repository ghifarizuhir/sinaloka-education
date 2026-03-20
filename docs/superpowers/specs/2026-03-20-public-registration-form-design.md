# Public Registration Form — Design Spec

**Date:** 2026-03-20
**Status:** Approved

## Overview

Form registrasi publik untuk calon murid dan tutor. Institusi membagikan link `sinaloka.com/register/<slug>`, pendaftar isi form, data masuk sebagai PENDING, admin review dan approve/reject dari dashboard platform. Form ditempatkan di landing site (`sinaloka-landing`).

## Data Model

### Prisma Schema

```prisma
enum RegistrationType {
  STUDENT
  TUTOR
}

enum RegistrationStatus {
  PENDING
  APPROVED
  REJECTED
}

model Registration {
  id               String             @id @default(uuid())
  institution_id   String
  institution      Institution        @relation(fields: [institution_id], references: [id])
  type             RegistrationType
  status           RegistrationStatus @default(PENDING)

  // Common fields
  name             String
  email            String?
  phone            String?

  // Student-specific (grade required untuk student)
  grade            String?
  parent_name      String?
  parent_phone     String?
  parent_email     String?

  // Tutor-specific
  subject_names    String[]           // text bebas, bukan subject IDs
  experience_years Int?

  rejected_reason  String?
  reviewed_at      DateTime?
  reviewed_by      String?            // user ID, tanpa foreign key (sama seperti UpgradeRequest)
  created_at       DateTime           @default(now())
  updated_at       DateTime           @updatedAt

  @@index([institution_id])
  @@index([status])
  @@index([type])
  @@map("registrations")
}
```

Tambah relasi di model `Institution`:

```prisma
registrations  Registration[]
```

### Institution Settings

Tambah key `registration` di field `settings` JSON pada Institution:

```ts
registration: {
  student_enabled: boolean;  // default false
  tutor_enabled: boolean;    // default false
}
```

### Catatan Design

- `subject_names` berisi text bebas (bukan subject IDs) karena form publik tidak punya akses ke daftar subject institusi. Admin yang mapping ke subject saat approve tutor.
- `reviewed_by` adalah `String?` tanpa foreign key constraint — sama seperti pattern di `UpgradeRequest` model.
- `grade` nullable di Registration tapi required di Student. Validasi di Zod schema: required untuk student registration form.

## Rate Limiting

`@nestjs/throttler` belum terinstall di project. Untuk Level 1, gunakan **simple in-memory IP rate limiter** sebagai NestJS guard khusus untuk registration endpoints:

```ts
// Map<ip, { count, resetAt }>
// Max 5 submissions per IP per jam
// Reset counter setiap jam
```

Ini cukup untuk Level 1. Jika perlu scaling, bisa upgrade ke `@nestjs/throttler` atau rely on Cloudflare rate limiting rules nanti.

## Duplicate Submission Handling

Saat submit, cek apakah sudah ada registration PENDING dengan email yang sama di institusi yang sama:
- Jika ada → return 409 Conflict: "Anda sudah mendaftar. Silakan tunggu review dari admin."
- Jika sudah APPROVED/REJECTED → boleh submit lagi (mungkin mau daftar ulang)

Saat approve tutor, cek apakah email sudah terdaftar sebagai User:
- Jika sudah ada User dengan email tersebut → return error ke admin: "Email sudah terdaftar sebagai user. Silakan hubungi tutor langsung."

## Backend API

### Public Endpoints (@Public, no auth)

**`GET /api/register/:slug`**
- Cek institusi exists, `is_active`, dan registration settings
- Return: `{ institution: { name, logo_url, slug }, registration: { student_enabled, tutor_enabled } }`
- 404 jika institusi tidak ada atau tidak aktif

**`POST /api/register/:slug/student`**
- Rate limit: 5 request per IP per jam (custom guard)
- Body: `{ name*, grade*, parent_name*, parent_phone*, email?, phone?, parent_email? }`
- Validasi: institusi aktif + `student_enabled: true`
- Duplicate check: reject jika ada PENDING registration dengan email+institution+type yang sama
- Return: `{ id, message: "Registration submitted" }`

**`POST /api/register/:slug/tutor`**
- Rate limit: 5 request per IP per jam (custom guard)
- Body: `{ name*, email*, phone?, subject_names*: string[] (min 1), experience_years? }`
- Validasi: institusi aktif + `tutor_enabled: true`
- Duplicate check: reject jika ada PENDING registration dengan email+institution+type yang sama
- Return: `{ id, message: "Registration submitted" }`

### Admin Endpoints (auth required)

**`GET /api/admin/registrations/count`**
- **Harus dideclare SEBELUM `/:id` route** di controller untuk menghindari route conflict
- Return: `{ pending: number }` — untuk badge count di sidebar

**`GET /api/admin/registrations`**
- Query params: `type?` (STUDENT/TUTOR), `status?` (PENDING/APPROVED/REJECTED), `search?`, `page`, `limit`
- Scoped by `tenantId` (institution isolation)
- Return: paginated list

**`GET /api/admin/registrations/:id`**
- Return: detail registration

**`PATCH /api/admin/registrations/:id/approve`**
- Gunakan `@PlanLimit('students')` atau `@PlanLimit('tutors')` — tapi karena satu endpoint handle keduanya, **lakukan PlanLimit check inline di service** (bukan via decorator):
  ```ts
  // Di RegistrationService.approve():
  const planConfig = PLAN_LIMITS[institution.plan_type];
  if (registration.type === 'STUDENT') {
    const count = await prisma.student.count({ where: { institution_id, status: 'ACTIVE' } });
    if (planConfig.maxStudents !== null && count >= planConfig.maxStudents) {
      throw new ForbiddenException('Student limit reached');
    }
  }
  // Sama untuk TUTOR
  ```
- Student approve flow:
  1. PlanLimit check
  2. Buat `Student` record: `{ name, email, phone, grade, parent_name, parent_phone, parent_email, institution_id, status: 'ACTIVE' }`
  3. Set registration status → APPROVED, `reviewed_at`, `reviewed_by`
- Tutor approve flow:
  1. PlanLimit check
  2. Cek email belum terdaftar sebagai User → jika sudah, return error
  3. Panggil `invitationService.invite(institutionId, { email, name, subject_ids: [], experience_years })` — note: `institutionId` sebagai argumen pertama, bukan di DTO
  4. `subject_ids` kosong — admin mapping subject manual setelah tutor aktif
  5. Set registration status → APPROVED, `reviewed_at`, `reviewed_by`
- Return: updated registration

**`PATCH /api/admin/registrations/:id/reject`**
- Body: `{ reason?: string }`
- Set registration status → REJECTED, `rejected_reason`, `reviewed_at`, `reviewed_by`

### Settings Endpoints (existing pattern)

**`GET /api/settings/registration`**
- Return registration settings dengan defaults `{ student_enabled: false, tutor_enabled: false }`

**`PATCH /api/settings/registration`**
- Body: `{ student_enabled?: boolean, tutor_enabled?: boolean }`

## Landing Site (sinaloka-landing)

### Dependencies Baru
- `react-router-dom` — routing
- `axios` — API calls

### SPA Routing Setup
- Tambah `_redirects` file di `sinaloka-landing/public/`:
  ```
  /* /index.html 200
  ```
  Ini diperlukan agar Cloudflare Pages mengarahkan semua path ke SPA (tanpa ini, direct visit ke `/register/abc` return 404).

### Routing
- `/` → landing page existing (tidak berubah)
- `/register/:slug` → halaman registrasi publik

### Halaman `/register/:slug`

**Load state:**
1. Hit `GET /api/register/:slug`
2. Institusi tidak ada / tidak aktif → tampil 404 page
3. Kedua registrasi off → tampil "Pendaftaran sedang ditutup"

**Layout:**
1. Header: logo institusi + nama institusi
2. Pilih role: 2 kartu — "Daftar sebagai Murid" dan "Daftar sebagai Tutor"
   - Hanya tampil kartu yang enabled
   - Jika hanya satu yang enabled, langsung tampil form tanpa pilihan
3. Form sesuai role (lihat fields di API section)
4. Submit → loading state → success message: "Pendaftaran berhasil! Admin akan meninjau data Anda."
5. Error handling: duplicate → "Anda sudah mendaftar", rate limit → "Terlalu banyak percobaan"

**Validasi client-side:**
- Required fields sesuai schema
- Email format validation
- Phone number format

**Environment variable:**
- `VITE_API_URL` — pointing ke backend API (sama seperti app lain)

## Platform (sinaloka-platform)

### Halaman Baru: `/registrations`

**Sidebar nav item:** "Pendaftaran" dengan icon ClipboardList
- Badge count pending registrations

**Tab filter:** Semua / Murid / Tutor
**Status filter:** Pending / Approved / Rejected

**Tabel kolom:**
- Nama
- Tipe (badge: Murid biru, Tutor hijau)
- Email / Telepon
- Tanggal daftar
- Status (badge: Pending kuning, Approved hijau, Rejected merah)
- Actions (Approve / Reject buttons untuk PENDING)

**Actions:**
- Approve → konfirmasi modal
  - Murid: "Approve dan tambahkan sebagai murid aktif?"
  - Tutor: "Approve dan kirim invitation email ke [email]?"
  - Error handling: plan limit reached, email sudah terdaftar
- Reject → modal dengan textarea optional reason

### Settings — Tab Pendaftaran

Di halaman Settings, tambah section "Pendaftaran":
- Toggle: "Buka pendaftaran murid" (on/off)
- Toggle: "Buka pendaftaran tutor" (on/off)
- Preview link: `sinaloka.com/register/<slug>` dengan tombol copy

### i18n

Tambah keys di `en.json` dan `id.json` under `registration.*` namespace:

```
registration.title — "Registrations" / "Pendaftaran"
registration.student — "Student" / "Murid"
registration.tutor — "Tutor" / "Tutor"
registration.pending — "Pending" / "Menunggu"
registration.approved — "Approved" / "Disetujui"
registration.rejected — "Rejected" / "Ditolak"
registration.approve — "Approve" / "Setujui"
registration.reject — "Reject" / "Tolak"
registration.approveStudentConfirm — "Approve and add as active student?" / "Setujui dan tambahkan sebagai murid aktif?"
registration.approveTutorConfirm — "Approve and send invitation email to {email}?" / "Setujui dan kirim email undangan ke {email}?"
registration.rejectReason — "Reason (optional)" / "Alasan (opsional)"
registration.noRegistrations — "No registrations" / "Tidak ada pendaftaran"
registration.submitted — "Registration submitted successfully!" / "Pendaftaran berhasil dikirim!"
registration.closed — "Registration is currently closed" / "Pendaftaran sedang ditutup"
registration.alreadyRegistered — "You have already registered" / "Anda sudah mendaftar"
registration.settings — "Registration" / "Pendaftaran"
registration.studentEnabled — "Open student registration" / "Buka pendaftaran murid"
registration.tutorEnabled — "Open tutor registration" / "Buka pendaftaran tutor"
registration.copyLink — "Copy registration link" / "Salin link pendaftaran"
registration.linkCopied — "Link copied!" / "Link disalin!"
```

## Deployment Notes

- **CORS:** Tambahkan `https://sinaloka.com` dan `https://www.sinaloka.com` ke `CORS_ORIGINS` env var di Railway (jika belum ada) — landing site akan memanggil API backend.
- **Landing deploy:** Tambahkan `VITE_API_URL` sebagai build variable di GitHub Actions atau Cloudflare Pages untuk sinaloka-landing.
- **Cloudflare `_redirects`:** File `public/_redirects` dengan `/* /index.html 200` wajib ada agar SPA routing bekerja.

## Keputusan Design

1. **Model terpisah `Registration`** — tidak mengganggu data Student/Tutor existing
2. **Form di landing site** — SEO friendly, satu alur marketing → registrasi
3. **Beda form per role** — field berbeda, UX lebih jelas
4. **Admin toggle on/off** — kontrol kapan pendaftaran dibuka
5. **Simple in-memory rate limiter** — 5 req/IP/jam, tanpa captcha/email verification (Level 1)
6. **Subject sebagai text bebas** — form publik tidak punya akses subject IDs
7. **Tutor approve = kirim invite** — reuse `InvitationService.invite(institutionId, dto)` flow existing
8. **PlanLimit check inline di service** — bukan via decorator, karena satu endpoint handle student & tutor
9. **Duplicate check** — reject submit jika ada PENDING registration dengan email sama; cek email existing saat approve tutor
10. **`reviewed_by` tanpa FK** — sama seperti pattern UpgradeRequest
11. **Route order** — `GET /registrations/count` dideclare sebelum `GET /registrations/:id` di controller
