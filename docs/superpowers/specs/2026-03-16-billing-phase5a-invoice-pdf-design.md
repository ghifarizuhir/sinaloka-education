# Billing Phase 5a: Invoice PDF Generation — sinaloka

**Date:** 2026-03-16
**Status:** Draft
**Scope:** Generate downloadable PDF invoices with institution branding, sequential invoice numbers, and bank account details. Manual trigger by admin.
**Roadmap:** See `docs/superpowers/specs/2026-03-16-billing-roadmap.md`
**Depends on:** Phase 1 (billing settings — invoice_prefix, bank_accounts), Phase 2 (auto-generated payments)

## Overview

Admin clicks "Generate Invoice" on a payment to create a professional PDF invoice. The PDF includes institution branding (name, logo, address), student/class details, amount, due date, and bank account payment instructions. Invoice numbers follow a date-based sequential format. PDFs are stored on disk and served via the existing upload endpoint. Each payment can have at most one invoice.

## Database Schema Changes

### Migration: Add 2 nullable columns to Payment

```prisma
model Payment {
  // ... existing fields
  invoice_number  String?
  invoice_url     String?
}
```

- `invoice_number` — formatted string like `INV-202603-001`
- `invoice_url` — relative path to stored PDF (`{institutionId}/invoices/{filename}.pdf`)

Both nullable — payments without invoices continue to work.

## Invoice Number Generation

### Format

`{prefix}{YYYYMM}-{sequential}`

Examples: `INV-202603-001`, `INV-202603-002`, `INV-202604-001`

- `prefix` — from billing settings `invoice_prefix` (default: `INV-`)
- `YYYYMM` — year and month of generation
- `sequential` — zero-padded 3-digit counter, resets each month

### Counter Storage

Stored in institution `settings.billing.invoice_counter` JSON:

```json
{
  "billing": {
    "invoice_prefix": "INV-",
    "invoice_counter": {
      "2026-03": 3,
      "2026-04": 0
    }
  }
}
```

### Generation Logic

```typescript
async generateInvoiceNumber(institutionId: string): Promise<string> {
  const institution = await this.prisma.institution.findUnique({
    where: { id: institutionId },
    select: { settings: true },
  });

  const settings = (institution.settings as any) ?? {};
  const billing = settings.billing ?? {};
  const prefix = billing.invoice_prefix ?? 'INV-';
  const counter = billing.invoice_counter ?? {};

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const yyyymm = monthKey.replace('-', '');

  const currentCount = (counter[monthKey] ?? 0) + 1;
  counter[monthKey] = currentCount;

  // Persist updated counter
  await this.prisma.institution.update({
    where: { id: institutionId },
    data: {
      settings: { ...settings, billing: { ...billing, invoice_counter: counter } },
    },
  });

  return `${prefix}${yyyymm}-${String(currentCount).padStart(3, '0')}`;
}
```

## Backend — Invoice Service

### New Service

**Location:** `src/modules/payment/invoice.service.ts`

**Dependencies:** PrismaService, SettingsService, UploadService (for file path), PDFKit

### New Endpoint

```
POST /api/admin/payments/:id/generate-invoice
```

**Access:** ADMIN + SUPER_ADMIN

**Response:** Updated payment object with `invoice_number` and `invoice_url` fields populated.

**Error cases:**
- 404 — payment not found
- 409 — invoice already exists for this payment (`invoice_number` is not null)

### Generation Flow

```
POST /api/admin/payments/:id/generate-invoice
  → 1. Load payment with student, enrollment → class
  → 2. Check invoice_number is null (else 409 conflict)
  → 3. Load institution (name, address, phone, email, logo_url)
  → 4. Load billing settings (invoice_prefix, bank_accounts, invoice_counter)
  → 5. Generate invoice number (prefix + YYYYMM + sequential)
  → 6. Generate PDF with PDFKit
  → 7. Save PDF to {UPLOAD_DIR}/{institutionId}/invoices/{invoice_number}.pdf
  → 8. Update payment: invoice_number, invoice_url
  → 9. Return updated payment
```

### PDF Content Layout

```
┌─────────────────────────────────────┐
│  [Logo]  Institution Name           │
│          Address                    │
│          Phone | Email              │
├─────────────────────────────────────┤
│  FAKTUR / INVOICE                   │
│  No: INV-202603-001                 │
│  Tanggal: 16 Maret 2026            │
├─────────────────────────────────────┤
│  Tagihan Untuk / Bill To:           │
│  Siswa: Rina Pelajar               │
│  Kelas: Matematika SMP             │
│  Orang Tua: Budi Pelajar           │
├─────────────────────────────────────┤
│  Deskripsi          Jumlah          │
│  ─────────────────────────          │
│  Matematika SMP     Rp 500.000     │
│                                     │
│  Total:             Rp 500.000     │
│  Jatuh Tempo:       23 Maret 2026  │
│  Status:            Belum Lunas    │
├─────────────────────────────────────┤
│  Instruksi Pembayaran:              │
│  BCA - 1234567890 a/n Bimbel Cerdas│
│  Mandiri - 0987654321 a/n Bimbel   │
├─────────────────────────────────────┤
│  Dibuat oleh Sinaloka Platform      │
└─────────────────────────────────────┘
```

**Bilingual labels:** PDF uses the institution's `default_language` setting. If `id` → Indonesian labels. If `en` → English labels.

**Logo handling:** If `logo_url` exists, read the image file from the uploads directory and embed in PDF header. If null, skip logo (text-only header).

### PDF Generation (PDFKit)

Follows the same pattern as `report.service.ts`:
- Create `new PDFDocument()`
- Collect buffer chunks
- Draw header, body sections, table, footer
- Return as Buffer
- Write buffer to file system

### File Storage

Save to: `{UPLOAD_DIR}/{institutionId}/invoices/{invoice_number}.pdf`

The `invoice_url` stored on the payment is the relative path: `{institutionId}/invoices/{invoice_number}.pdf`

Download via existing upload endpoint: `GET /api/uploads/{institutionId}/invoices/{invoice_number}.pdf`

### Route Ordering

The `POST :id/generate-invoice` endpoint uses a nested route under `:id`, so no ordering conflict with other routes.

## Frontend Changes

### Payment Type Update

**`src/types/payment.ts`:**

Add to `Payment` interface:
```typescript
invoice_number: string | null;
invoice_url: string | null;
```

### New Service Method + Hook

**`src/services/payments.service.ts`:**
```typescript
generateInvoice: (id: string) =>
  api.post<Payment>(`/api/admin/payments/${id}/generate-invoice`).then(r => r.data),
```

**`src/hooks/usePayments.ts`:**
```typescript
export function useGenerateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: paymentsService.generateInvoice,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  });
}
```

### StudentPayments.tsx Changes

**1. Payment table row — Invoice badge:**

If `payment.invoice_number` exists, show a small badge next to the student name or in the status area:
```tsx
{payment.invoice_number && (
  <Badge variant="outline" className="text-[9px] ml-1">{payment.invoice_number}</Badge>
)}
```

**2. Payment detail drawer — Generate/Download:**

In the drawer that shows payment details:
- If no invoice: "Generate Invoice" button → calls `useGenerateInvoice` → success toast
- If invoice exists: "Download Invoice" button → opens invoice URL in new tab
- Show invoice number in detail fields

```tsx
{selectedPayment?.invoice_url ? (
  <Button variant="outline" onClick={() => window.open(`/api/uploads/${selectedPayment.invoice_url}`, '_blank')}>
    <FileDown size={16} />
    {t('payments.downloadInvoice')}
  </Button>
) : (
  <Button variant="outline" onClick={() => generateInvoice.mutate(selectedPayment.id)}>
    <FileText size={16} />
    {t('payments.generateInvoice')}
  </Button>
)}
```

**3. Action menu per row:**

Add "Generate Invoice" (if no invoice) or "Download Invoice" (if exists) to the per-row action buttons/tooltips.

### Translation Keys

Add to `payments` namespace:

**id.json:**
```json
"generateInvoice": "Buat Faktur",
"downloadInvoice": "Unduh Faktur",
"invoiceGenerated": "Faktur berhasil dibuat",
"invoiceExists": "Faktur sudah ada untuk pembayaran ini",
"invoiceNumber": "No. Faktur",
"generatingInvoice": "Membuat faktur..."
```

**en.json:**
```json
"generateInvoice": "Generate Invoice",
"downloadInvoice": "Download Invoice",
"invoiceGenerated": "Invoice generated successfully",
"invoiceExists": "Invoice already exists for this payment",
"invoiceNumber": "Invoice No.",
"generatingInvoice": "Generating invoice..."
```

## Constraints

- Manual trigger only — no auto-generation (deferred to Phase 5b with notifications)
- One invoice per payment — cannot regenerate (delete payment and recreate if needed)
- PDF uses institution's `default_language` for labels
- Logo embedding is best-effort — if logo file is missing/corrupt, PDF generates without logo
- No invoice editing — once generated, the invoice is immutable
- Bank accounts come from billing settings (Phase 1) — if none configured, bank section omitted from PDF
- Invoice counter is not transaction-safe for concurrent requests — acceptable for bimbel admin usage (single admin typically)
