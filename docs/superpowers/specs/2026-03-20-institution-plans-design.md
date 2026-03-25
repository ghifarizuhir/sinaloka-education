# Institution Plans & Tier System — Design Spec

**Date:** 2026-03-20
**Status:** Approved

## Overview

Implementasi sistem plan/tier untuk institusi di platform Sinaloka. Setiap institusi memiliki plan yang menentukan limit (murid, tutor) dan akses fitur. Plan dikelola oleh SUPER_ADMIN, admin institusi hanya bisa melihat dan request upgrade.

## Plan Tiers

| | Starter (Free) | Growth | Business |
|---|---|---|---|
| **Harga** | Gratis | Rp 150.000/bulan | Rp 500.000/bulan |
| **Max Murid** | 30 | 200 | Unlimited |
| **Max Tutor** | 5 | 20 | Unlimited |
| **WhatsApp Notifikasi** | x | v | v |
| **Advanced Reporting** | x | v | v |
| **Multi-cabang** | x | x | v |

- Harga ditampilkan saja, belum ada payment gateway
- Upgrade dilakukan via request ke SUPER_ADMIN

## Data Model

### Prisma Schema Changes

```prisma
enum PlanType {
  STARTER
  GROWTH
  BUSINESS
}

enum UpgradeRequestStatus {
  PENDING
  APPROVED
  REJECTED
}

// Tambah di model Institution:
plan_type              PlanType  @default(STARTER)
plan_limit_reached_at  DateTime? // timestamp pertama kali limit tercapai, null jika di bawah limit
plan_changed_at        DateTime? // timestamp terakhir plan diubah
upgrade_requests       UpgradeRequest[]

model UpgradeRequest {
  id              String    @id @default(uuid())
  institution_id  String
  institution     Institution @relation(fields: [institution_id], references: [id])
  current_plan    PlanType
  requested_plan  PlanType
  status          UpgradeRequestStatus @default(PENDING)
  message         String?       // pesan dari admin institusi
  review_notes    String?       // catatan dari SUPER_ADMIN saat approve/reject
  reviewed_by     String?       // user id SUPER_ADMIN yang review
  reviewed_at     DateTime?
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt

  @@index([status])
  @@index([institution_id])
  @@map("upgrade_requests")
}
```

### Plan Config (Hardcoded Constant)

File: `src/common/constants/plans.ts`

`null` pada `maxStudents`/`maxTutors` berarti unlimited.

```ts
export const PLAN_LIMITS = {
  STARTER: {
    label: 'Starter',
    maxStudents: 30,
    maxTutors: 5,
    features: {
      whatsappNotification: false,
      advancedReporting: false,
      multiBranch: false,
    },
    price: null,
    priceDisplay: 'Gratis',
    gracePeriodDays: 7,
    order: 0, // untuk validasi upgrade (harus ke tier lebih tinggi)
  },
  GROWTH: {
    label: 'Growth',
    maxStudents: 200,
    maxTutors: 20,
    features: {
      whatsappNotification: true,
      advancedReporting: true,
      multiBranch: false,
    },
    price: 150000,
    priceDisplay: 'Rp 150.000/bulan',
    gracePeriodDays: 7,
    order: 1,
  },
  BUSINESS: {
    label: 'Business',
    maxStudents: null, // unlimited
    maxTutors: null,   // unlimited
    features: {
      whatsappNotification: true,
      advancedReporting: true,
      multiBranch: true,
    },
    price: 500000,
    priceDisplay: 'Rp 500.000/bulan',
    gracePeriodDays: 7,
    order: 2,
  },
}
```

## Backend

### Guard & Enforcement

**PlanGuard** (`src/common/guards/plan.guard.ts`):
- `@PlanFeature('whatsappNotification')` decorator — cek akses fitur berdasarkan plan. Return 403 jika tidak tersedia.
- `@PlanLimit('students')` / `@PlanLimit('tutors')` decorator — cek jumlah saat ini vs limit plan.

**Enforcement flow (limit murid/tutor):**

1. Request masuk (misal `POST /api/admin/students`)
2. `PlanGuard` intercept → query count murid aktif di institusi
3. `maxStudents` null (unlimited) → lanjut normal
4. count < limit → lanjut normal, jika `plan_limit_reached_at` tidak null → reset ke null
5. count >= limit DAN `plan_limit_reached_at` null → set `plan_limit_reached_at = now()`, lanjut + warning di response body
6. count >= limit DAN masih dalam grace period (< 7 hari sejak `plan_limit_reached_at`) → lanjut + warning di response body
7. count >= limit DAN grace period habis → 403 + pesan upgrade

**Warning di response body** — response yang sukses tapi menyentuh limit akan menambah field `_warning`:
```json
{
  "data": { ... },
  "_warning": {
    "type": "plan_limit_reached",
    "resource": "students",
    "current": 30,
    "limit": 30,
    "gracePeriodEnds": "2026-03-27T00:00:00Z",
    "message": "Anda telah mencapai batas 30 murid. Upgrade plan untuk menambah kapasitas."
  }
}
```

Frontend Axios interceptor membaca `_warning` dan menampilkan toast/banner.

**Grace period reset:** Selain di guard (saat count turun di bawah limit pada request berikutnya), juga perlu dicek saat student/tutor di-delete atau di-nonaktifkan. Ini dilakukan via Prisma middleware atau event di service layer student/tutor — cek count setelah delete, jika di bawah limit → reset `plan_limit_reached_at`.

### API Endpoints

Semua endpoint menggunakan prefix `/api/admin/` sesuai konvensi existing. Akses SUPER_ADMIN dikontrol via `@Roles(Role.SUPER_ADMIN)`.

**Admin institusi:**
- `GET /api/admin/plan` — return plan info + current usage + limits + fitur
- `POST /api/admin/plan/upgrade-request` — simpan upgrade request di DB
  - Validasi: `requested_plan` harus lebih tinggi dari `current_plan` (berdasarkan `order`)
  - Validasi: tidak bisa buat request baru jika sudah ada request PENDING untuk institusi yang sama

**SUPER_ADMIN:**
- `PATCH /api/admin/institutions/:id/plan` — ubah plan institusi, set `plan_changed_at = now()`
- `GET /api/admin/upgrade-requests` — list semua upgrade request (filterable by status)
- `PATCH /api/admin/upgrade-requests/:id` — approve/reject request
  - Approve: otomatis ubah plan institusi + set `reviewed_by`, `reviewed_at`, `review_notes`
  - Reject: set status REJECTED + `reviewed_by`, `reviewed_at`, `review_notes`

### Downgrade Handling

Ketika SUPER_ADMIN menurunkan plan institusi (misal Growth → Starter) dan usage melebihi limit baru:
- Downgrade tetap diperbolehkan
- `plan_limit_reached_at` langsung di-set ke `now()`
- Grace period 7 hari dimulai — institusi punya waktu untuk mengurangi murid/tutor
- Setelah grace period habis, institusi tidak bisa tambah murid/tutor baru sampai usage di bawah limit

### WhatsApp Feature Gating

Plan gating dicek terlebih dahulu sebelum WhatsApp configuration. Flow:
1. Cek plan punya akses `whatsappNotification` → jika tidak, return tanpa kirim (silent no-op atau 403 tergantung context)
2. Cek WhatsApp env vars configured → jika tidak, silent no-op (behavior existing)
3. Kirim notifikasi

## Frontend Platform

### 1. Sidebar (update Layout.tsx)

Ganti mock "Pro Plan" dengan data real dari `GET /api/admin/plan`:
- Nama plan + badge warna
- Usage murid: `25/30` + progress bar
- Tombol "Upgrade" (link ke halaman Plans)

### 2. Halaman Plans & Pricing (`/settings/plans`)

- 3 kartu tier side-by-side (Starter, Growth, Business)
- Setiap kartu: nama, harga, list fitur (check/cross), limit murid & tutor
- Plan aktif di-highlight dengan badge "Current Plan"
- Tier di atas plan aktif → tombol "Request Upgrade" (buka form modal dengan field pesan)

### 3. Badge di Navbar

- Di sebelah nama institusi — "Starter" / "Growth" / "Business"
- Warna: gray (Starter), blue (Growth), gold (Business)

### 4. Warning Banner & Toast

- Mendekati limit (>80%) → banner kuning: "Anda sudah menggunakan 27/30 murid"
- Menyentuh limit → banner merah + toast saat mencoba tambah murid/tutor
- Grace period countdown: "Anda punya 5 hari tersisa sebelum penambahan murid diblokir"
- Warning diambil dari `_warning` field di response body via Axios interceptor

### 5. Feature Lock Overlay

- Fitur yang di-lock → overlay/badge "Growth Feature" atau "Business Feature" dengan CTA upgrade
- Fitur tetap terlihat tapi tidak bisa diakses (disabled state)

### 6. Services & Hooks

- `plan.service.ts` — `getPlan()`, `requestUpgrade(message)`
- `usePlan()` hook — query plan info via TanStack Query (caching & deduplication otomatis, tidak perlu Context provider terpisah)

## SUPER_ADMIN Dashboard

### Institutions List

- Tambah kolom "Plan" di tabel — badge Starter/Growth/Business
- Filter by plan type

### Institution Detail

- Section "Plan Management" — dropdown ubah plan
- Tampilkan current usage vs limit
- Warning jika downgrade akan melebihi limit baru

### Upgrade Requests

- Halaman daftar upgrade request (filterable: pending, approved, rejected)
- SUPER_ADMIN bisa approve (otomatis ubah plan) atau reject (dengan catatan)
- Tidak ada notifikasi email — SUPER_ADMIN cek manual dari dashboard

## Keputusan Design

1. **Plan sebagai config hardcoded** — tidak perlu CRUD plan, cukup constant di code. Ubah limit = deploy ulang.
2. **3 tier: Starter, Growth, Business** — limit moderat (30/5, 200/20, unlimited).
3. **Soft block dengan grace period 7 hari** — user tidak langsung diblokir saat limit tercapai.
4. **Harga display only** — belum ada payment gateway, upgrade via SUPER_ADMIN.
5. **SUPER_ADMIN only** mengelola plan — admin institusi hanya lihat dan request.
6. **Upgrade request tanpa notifikasi** — SUPER_ADMIN cek dari dashboard.
7. **`null` = unlimited** — untuk maxStudents/maxTutors, `null` berarti tidak ada batas (JSON-safe, bukan Infinity).
8. **Warning via response body** — `_warning` field di response, bukan custom header (lebih mudah dikonsumsi frontend).
9. **Route `/api/admin/`** — semua endpoint pakai prefix existing, akses dikontrol via `@Roles()`.
10. **Downgrade diperbolehkan** — grace period dimulai jika usage melebihi limit baru.
