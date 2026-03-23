# Session Snapshot Design

## Problem

When a class is edited (tutor reassigned, fee changed, subject changed), all past completed sessions retroactively show the new data because sessions only store a `class_id` foreign key and read class/tutor/subject data at query time. This corrupts historical accuracy — like an e-commerce order changing price after checkout because the seller updated the product listing.

### Fields at Risk

| Data point | Read from | Corrupts when |
|-----------|-----------|---------------|
| Tutor name/ID | `class.tutor.user.name` | Tutor reassigned |
| Subject name | `class.subject.name` | Subject changed |
| Class name | `class.name` | Class renamed |
| Student fee | `class.fee` | Fee changed |
| Room | `class.room` | Room changed |
| Tutor fee mode | `class.tutor_fee_mode` | Mode changed |

Already snapshot (safe): `session.tutor_fee_amount`, `session.date`, `session.start_time`, `session.end_time`.

### Secondary Impact

- Payout audit export (`payout.service.ts` `exportAudit`) queries sessions via `class.tutor_id` — if tutor reassigned, old tutor's audit shows 0 sessions.
- Tutor schedule view loses past session history after reassignment.

## Solution: Snapshot at Completion

Model: e-commerce checkout pattern. Session completion = checkout moment. All contextual data is frozen into the session row at that point.

### New Columns on Session Model

| Column | Type | Default | Source |
|--------|------|---------|--------|
| `snapshot_tutor_id` | String? | null | `class.tutor_id` |
| `snapshot_tutor_name` | String? | null | `class.tutor.user.name` |
| `snapshot_subject_name` | String? | null | `class.subject.name` |
| `snapshot_class_name` | String? | null | `class.name` |
| `snapshot_class_fee` | Decimal? | null | `class.fee` |
| `snapshot_class_room` | String? | null | `class.room` |
| `snapshot_tutor_fee_mode` | String? | null | `class.tutor_fee_mode` |
| `snapshot_tutor_fee_per_student` | Decimal? | null | `class.tutor_fee_per_student` |

All nullable — backward compatible with existing COMPLETED sessions that predate this feature.

**Design decisions:**
- `snapshot_tutor_fee_mode` stored as String (not enum) for forward compatibility if enum values change later.
- `snapshot_tutor_fee_per_student` included for audit trail — the existing `tutor_fee_amount` stores the computed total, but not the per-student rate used in the calculation.
- `package_fee` excluded — not relevant to session-level history (package fees are billing-level, not session-level).
- Snapshot is **immutable**. Completed sessions cannot be re-edited (existing guard: `BadRequestException('Cannot edit a completed session')`). If a session was completed with wrong data, admin must handle via correction, not re-edit.

### Trigger Point

Snapshot happens when session status transitions to `COMPLETED`. Two code paths:

1. **Admin path**: `SessionService.update()` when `dto.status === 'COMPLETED'`
2. **Tutor path**: `SessionService.completeSession()`

Both paths already fetch class with tutor + subject includes. Add snapshot fields to the `prisma.session.update()` data payload.

**Implementation note:** The admin completion path has a limited `select` that does not include `subject.name`, `tutor.user.name`, or `room`. The `select`/`include` clause must be expanded to fetch these fields before snapshot.

Sessions that are SCHEDULED, CANCELLED, or RESCHEDULE_REQUESTED are NOT snapshot.

### Display Logic: Snapshot-First Fallback

In `flattenSession()` helper (session.service.ts), use snapshot values when available, fall back to live reference for pre-feature sessions.

**Important:** `findOne()` has its own inline flattening that bypasses `flattenSession()`. It must also be updated with snapshot-first fallback, or refactored to use `flattenSession()` to avoid duplication.

```
tutor_name  = snapshot_tutor_name  ?? class.tutor.user.name
tutor_id    = snapshot_tutor_id    ?? class.tutor_id
subject     = snapshot_subject_name ?? class.subject.name
class_name  = snapshot_class_name  ?? class.name
fee         = snapshot_class_fee   ?? class.fee
room        = snapshot_class_room  ?? class.room
```

### Payout Audit Fix

`payout.service.ts` methods that query sessions by `class.tutor_id`:
- `exportAudit()`: change session filter to use `snapshot_tutor_id` with fallback to `class.tutor_id`
- `calculatePayout()`: same approach

**Query pattern** (Prisma cannot do `snapshot ?? fallback` in a single where, use OR clause):
```prisma
where: {
  OR: [
    { snapshot_tutor_id: payout.tutor_id },
    { snapshot_tutor_id: null, class: { tutor_id: payout.tutor_id } },
  ]
}
```

### What Does NOT Change

- **Frontend**: Zero changes. API response shape stays the same.
- **Class editing**: No new guards or restrictions. Admin can freely edit classes.
- **Backfill**: No backfill for existing completed sessions. They fallback to live reference (acceptable — admin says edits are rare).
- **SCHEDULED sessions**: Not snapshot. They reflect current class state until completed.

## Files Changed

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add 8 snapshot columns to Session model |
| `prisma/migrations/*/` | Additive migration (nullable columns) |
| `src/modules/session/session.service.ts` | Snapshot on complete, fallback in flattenSession |
| `src/modules/payout/payout.service.ts` | Use snapshot_tutor_id for audit queries |

## Migration

- Additive only — 8 nullable columns, no data transformation
- Zero downtime deployment
- No backfill script needed

## Success Criteria

1. Complete a session → snapshot columns populated with current class/tutor/subject data
2. Edit the class (change tutor, fee, subject) → completed session still shows original data
3. View an old session (pre-feature, no snapshot) → falls back to live reference gracefully
4. Payout audit for old tutor → still shows correct session breakdown after tutor reassignment
5. Frontend displays correctly without any changes
