# Parallel Planning Workflow Design

**Date:** 2026-03-23
**Scope:** Workflow/process improvement — bukan fitur app
**Project:** Sinaloka (single project scope)

## Problem

Saat ingin mengembangkan beberapa fitur secara paralel, tidak ada cara sistematis untuk:
1. Mengetahui apakah plan-plan tersebut bisa dieksekusi bersamaan
2. Mendeteksi file yang di-touch oleh lebih dari satu plan
3. Menentukan urutan eksekusi yang optimal

## Solution Overview

Dua komponen:
1. **Plan format standard** — section `## Files Affected` wajib ada di setiap plan doc
2. **Conflict detection skill** (`/conflict-detect`) — scan plan docs, build dependency matrix, output execution waves

### Workflow

```
Brainstorm A → Plan A ─┐
Brainstorm B → Plan B ──┼→ /conflict-detect → Execute per Wave
Brainstorm C → Plan C ─┘
```

## Component 1: Plan Format Standard

Setiap plan doc yang ditulis (via `writing-plans` skill atau manual) harus menyertakan section **`## Files Affected`** di bagian akhir.

### Format

```markdown
## Files Affected

### Modify
- src/modules/payment/payment.service.ts
- src/modules/payment/payment.controller.ts
- prisma/schema.prisma

### Create
- src/modules/payment/dto/refund.dto.ts
- src/modules/payment/refund.service.ts

### Delete
- src/modules/payment/legacy-payment.helper.ts
```

### Rules

- Path relatif dari root project
- Tiga kategori: **Modify**, **Create**, **Delete**
- Kategori yang kosong di-omit
- Section ini ditulis oleh Claude sebagai bagian akhir dari plan generation
- File yang hanya di-read (untuk referensi) tidak masuk list

## Component 2: Conflict Detection Skill

### Trigger

Dipanggil manual via `/conflict-detect` ketika ada 2+ plan docs yang mau dieksekusi.

### Input

- Auto-scan `docs/superpowers/plans/` untuk plan docs yang belum dieksekusi (plan dianggap "executed" jika memiliki frontmatter `status: done` atau sudah dipindahkan ke `docs/superpowers/plans/archive/`)
- Atau path eksplisit ke plan files

### Process

**Step 1 — Extract**
Scan semua plan docs, parse section `## Files Affected`, kumpulkan file paths per plan.

**Step 2 — Compare**
Cross-reference semua file paths antar plan. Classify overlap:

| Overlap Type | Condition | Risk Level |
|---|---|---|
| No overlap | Tidak ada file yang sama | None — full parallel |
| Create-Create | Dua plan create file yang sama | High — desain konflik |
| Modify-Modify | Dua plan modify file yang sama | Medium — kemungkinan merge conflict |
| Modify-Delete | Satu modify, satu delete file yang sama | High — intent konflik |
| Create-Modify | Satu create, satu modify file yang sama | Low — plan yang create harus duluan |
| Create-Delete | Satu create, satu delete file yang sama | High — intent konflik |
| Delete-Delete | Dua plan delete file yang sama | Low — idempotent, tapi flag sebagai possible desain issue |

**Step 3 — Build Matrix**
Tabel N×N antar plan, isi dengan risk level tertinggi dari semua overlap di antara pasangan plan.

**Step 4 — Determine Execution Waves**
- Plans tanpa overlap → same wave (parallel)
- Plans dengan Medium/High overlap → sequential
- Urutan ditentukan secara heuristic oleh Claude dengan membaca konten plan (bukan hanya file matrix) — misal plan yang setup schema/infrastructure duluan sebelum plan yang consume. File overlap adalah sinyal, tapi Claude harus baca context plan untuk judgment call yang tepat.

**Step 5 — Output**
Report markdown di-print ke terminal + disimpan ke `docs/superpowers/conflict-reports/YYYY-MM-DD-report.md` (gitignored — report ini ephemeral, untuk decision making saja).

### Output Format

```markdown
# Conflict Detection Report

## Plans Analyzed
| # | Plan | File |
|---|------|------|
| A | Student enrollment refactor | docs/superpowers/plans/2026-03-23-enrollment-refactor.md |
| B | Payment webhook integration | docs/superpowers/plans/2026-03-23-payment-webhook.md |
| C | Attendance notification system | docs/superpowers/plans/2026-03-23-attendance-notif.md |

## Dependency Matrix

|   | A | B | C |
|---|---|---|---|
| A | — | Medium | None |
| B | Medium | — | None |
| C | None | None | — |

## Overlapping Files

### A ↔ B (Medium)
| File | Plan A | Plan B |
|------|--------|--------|
| prisma/schema.prisma | Modify | Modify |
| src/modules/student/student.service.ts | Modify | Modify |

**Reasoning:** Kedua plan modify Prisma schema (beda model, tapi satu file)
dan student service. Kemungkinan merge conflict rendah kalau touch bagian
berbeda, tapi safer sequential. Plan A (enrollment) lebih fundamental karena
B depend on student data structure.

## Execution Waves

### Wave 1 (parallel)
- **Plan A** — Student enrollment refactor
- **Plan C** — Attendance notification system

### Wave 2 (after Wave 1)
- **Plan B** — Payment webhook integration
  - *Reason:* Depends on Plan A's schema changes
```

## Integration with Existing Workflow

### Kapan pakai
- Ada 2+ plan docs yang mau dieksekusi dalam waktu berdekatan
- Panggil `/conflict-detect` sebelum mulai execute

### Kapan tidak perlu
- Cuma 1 plan — langsung execute
- Plans jelas beda domain — skip, langsung parallel

### Skill implementation
- **`batch-plan`** bukan skill terpisah — cukup convention `## Files Affected` yang di-enforce di `writing-plans` skill
- **`conflict-detect`** adalah skill baru yang callable via `/conflict-detect`
- Report tidak perlu di-commit — ephemeral, gitignored
- Tambahkan `docs/superpowers/conflict-reports/` ke `.gitignore` sebagai bagian skill setup
- Jika semua plan tidak ada overlap, output cukup: _"All N plans can execute in parallel — no overlapping files detected."_

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Scope | Single project | Plans dalam satu repo share file space |
| Parallel plans | 2-3 | Keeps matrix simple, no over-engineering |
| Detection timing | Batch after all plans written | Simpler than incremental |
| File detail level | Minimal (paths only) | Claude generates this, accuracy sufficient at file level |
| Output detail | Matrix + waves + reasoning | Full context for decision making |
| Two skills vs one | Two (convention + skill) | Modular, each useful independently |
