# Settings Restructure — Design Spec

**Date:** 2026-03-20
**Status:** Approved

## Problem

Semua pengaturan (billing, payment gateway, academic) saat ini ada di halaman Settings yang hanya bisa diakses oleh Admin institution. Padahal, billing mode dan payment gateway (Midtrans keys) adalah keputusan platform-level yang seharusnya dikelola oleh Super Admin — karena:

1. Midtrans keys biasanya milik platform owner, bukan admin institution
2. Billing mode ditentukan saat onboarding, bukan dipilih sendiri oleh admin
3. Admin institution seharusnya fokus ke operasional, bukan konfigurasi commercial terms

## Approach

**Pindahkan billing & payment gateway ke Super Admin panel. Restructure Admin Settings dengan tab navigation dan confirmation modal.**

## Perubahan Super Admin Panel

### Institution Detail — Tab baru: "Billing & Payment"

Posisi tab: General → **Billing & Payment** → Admins → Overview

Satu halaman dengan 2 card, 1 tombol save di bawah:

**Card 1 — Billing Configuration:**
- Billing Mode — card selector: `per_session` (Pay As You Go), `package` (Package / Prepaid), `subscription` (Subscription)
- Currency — dropdown: `IDR (Rp)`, `USD ($)`
- Invoice Prefix — text input (e.g. `INV-`)
- Late Payment Auto-Lock — toggle switch + threshold number input (hari)

**Card 2 — Payment Gateway:**
- Server Key — password field (masked on load, hanya dikirim ke backend jika user ketik value baru)
- Client Key — text input
- Sandbox Mode — toggle
- Status badge: "Connected" (hijau) jika kedua key terisi, "Not Configured" (kuning) jika belum

**Tombol Save:** Satu tombol "Simpan" di bawah kedua card. Save mengirim ke 2 endpoint: `PATCH /api/settings/billing` dan `PATCH /api/settings/payment-gateway`.

### Create Institution — Optional Section

Saat Create Institution, setelah form General + First Admin, tampilkan optional collapsible section "Billing & Payment" yang bisa diisi langsung. Jika dikosongkan, institution menggunakan default values dari backend (billing_mode: manual, currency: IDR, sandbox: true).

## Perubahan Admin Settings

### Navigasi: Scroll-spy → Tab switching

**Sekarang:** Semua tab di-render ke bawah sebagai satu halaman panjang, scroll-spy highlight tab aktif.

**Baru:** Klik tab → render hanya konten tab itu. URL menggunakan query param: `/settings?tab=general`, `/settings?tab=billing`, `/settings?tab=academic`. Default tab: `general`.

### Tab structure (setelah restructure)

| Tab | Query param | Isi |
|-----|-------------|-----|
| General | `?tab=general` | Nama institution, email, phone, address, timezone, language |
| Billing | `?tab=billing` | Expense categories, bank accounts |
| Academic | `?tab=academic` | Working days, subjects, grades, rooms |

**Yang dihapus dari Admin Settings:**
- Tab "Payment Gateway" — seluruhnya pindah ke Super Admin
- Dari tab Billing: billing mode, currency, invoice prefix, late payment auto-lock — pindah ke Super Admin
- Yang tetap di tab Billing: expense categories + bank accounts (operasional per-institution)

### Save pattern: 1 tombol per tab

Setiap tab memiliki satu tombol "Simpan" di bawah konten tab. Tidak ada lagi save per card.

## Confirmation Modal (berlaku di semua tab)

### Flow

1. User edit beberapa field di tab
2. Klik "Simpan"
3. Modal muncul: **"Konfirmasi Perubahan"**
4. List perubahan ditampilkan
5. User klik "Konfirmasi & Simpan" → save ke API → toast success
6. Atau "Batal" → kembali ke form, perubahan tidak hilang

### Cara mendeteksi perubahan

Compare `initialState` (snapshot saat data pertama kali di-load dari API) vs `currentState` (state form saat ini). Hanya tampilkan field yang nilainya berbeda.

### Format tampilan perubahan

**Untuk field scalar (string, number, boolean):**
```
Nama Field: nilai lama → nilai baru
```
Contoh:
- `Billing Mode: per_session → package`
- `Currency: IDR → USD`
- `Late Payment Auto-Lock: Nonaktif → Aktif (30 hari)`
- `Sandbox Mode: Aktif → Nonaktif`

**Untuk array (expense categories, bank accounts, rooms, working days, grades):**
```
Expense Categories:
  + TRANSPORT (ditambahkan)
  - MARKETING (dihapus)

Bank Accounts:
  + BRI - 1234567890 (ditambahkan)
```

**Untuk password/masked fields (Midtrans Server Key):**
```
Server Key: diperbarui
```
(Tidak tampilkan value, hanya info bahwa field diubah)

### Tombol modal

- "Batal" — secondary/outline, tutup modal, kembali ke form
- "Konfirmasi & Simpan" — primary, kirim ke API

### Edge case

- Jika tidak ada perubahan saat klik "Simpan" → tampilkan toast info "Tidak ada perubahan" tanpa modal
- Jika API gagal → toast error, modal tertutup, form tetap di state terakhir (perubahan tidak hilang)

## File yang Dimodifikasi

### Platform (Frontend)

| File | Perubahan |
|------|-----------|
| `src/pages/SuperAdmin/InstitutionDetail.tsx` | Tambah tab "Billing & Payment" |
| `src/pages/SuperAdmin/BillingPaymentTab.tsx` | **Baru** — komponen tab billing + payment gateway untuk Super Admin |
| `src/pages/SuperAdmin/InstitutionForm.tsx` | Tambah optional "Billing & Payment" collapsible section |
| `src/pages/Settings/index.tsx` | Refactor dari scroll-spy ke tab switching via `?tab=` |
| `src/pages/Settings/tabs/BillingTab.tsx` | Hapus billing mode, currency, prefix, late payment. Sisakan expense categories + bank accounts |
| `src/pages/Settings/tabs/PaymentGatewayTab.tsx` | **Hapus** — pindah ke Super Admin |
| `src/pages/Settings/useSettingsPage.ts` | Update logic: hapus payment gateway state, tambah change detection |
| `src/components/ConfirmChangesModal.tsx` | **Baru** — reusable confirmation modal yang menampilkan diff perubahan |

### Backend

Tidak ada perubahan backend. Endpoint `/api/settings/*` sudah support role `SUPER_ADMIN` dan `ADMIN`. Data storage tetap di `institution.settings` JSON column.

## Yang Tidak Berubah

- Backend API endpoints — tidak ada endpoint baru
- Backend role/permission check — sudah benar
- Data storage structure — tetap JSON column di Institution
- Tab General di Admin Settings — tidak berubah
- Tab Academic di Admin Settings — tidak berubah (hanya save pattern yang berubah ke 1 tombol)
- Super Admin tabs: General, Admins, Overview — tidak berubah

## Success Criteria

- Super Admin bisa set billing mode + payment gateway saat create/edit institution
- Admin Settings hanya menampilkan 3 tab: General, Billing (sisa), Academic
- Tab Payment Gateway tidak ada lagi di Admin Settings
- Navigasi tab menggunakan `?tab=` query param (bukan scroll)
- Setiap save menampilkan confirmation modal dengan list perubahan
- Tidak ada perubahan backend — frontend only
