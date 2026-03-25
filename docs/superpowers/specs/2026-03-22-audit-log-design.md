# Audit Log — Design Spec

> Sprint 8 | Scope: Besar | Domain: Data integrity + Security

## Overview

Centralized audit logging system that tracks who did what, when, across all institutions. Auto-captures all mutations (POST/PUT/PATCH/DELETE) with full before/after diff. Provides filterable viewer for SUPER_ADMIN and ADMIN.

## Requirements Summary

- **Capture:** All non-GET requests automatically (hybrid: auto + `@NoAuditLog()` exclude)
- **Diff:** Full before/after diff for update/delete operations
- **Retention:** Forever (no auto-cleanup)
- **Access:** SUPER_ADMIN (all institutions) + ADMIN (own institution)
- **Viewer:** Full-featured DataTable with filters, search, expandable diff rows

## Data Model

```prisma
model AuditLog {
  id              String   @id @default(cuid())
  institution_id  String?       // nullable for SUPER_ADMIN global actions
  user_id         String
  user_role       String        // SUPER_ADMIN, ADMIN, TUTOR, PARENT
  action          String        // CREATE, UPDATE, DELETE
  resource_type   String        // student, payment, session, etc.
  resource_id     String?       // ID of affected resource (null for bulk ops)
  summary         String        // "Created student Budi Santoso"
  changes         Json?         // { field: { before: "old", after: "new" } }
  http_method     String        // POST, PUT, PATCH, DELETE
  endpoint        String        // /api/admin/students
  status_code     Int           // 200, 201, etc.
  ip_address      String?
  user_agent      String?
  created_at      DateTime @default(now())

  institution     Institution? @relation(fields: [institution_id], references: [id])
  user            User         @relation(fields: [user_id], references: [id])

  @@index([institution_id, created_at])
  @@index([resource_type, resource_id])
  @@index([user_id])
  @@map("audit_log")
}
```

### Key decisions

- `changes` as JSON — flexible `{ fieldName: { before, after } }` diff format
- `summary` — human-readable one-liner for list view, auto-generated
- `resource_type` — lowercase Prisma model name, enables filtering
- Indexes optimized for: timeline query (institution + date), resource lookup, user activity

## Backend Architecture

### Capture Flow

```
Request → JwtAuthGuard → TenantInterceptor → AuditLogInterceptor → Controller → Service → Prisma
                                                    ↓                                        ↓
                                              (capture response)                    (Prisma Client Extension
                                                    ↓                                captures before-state,
                                              EventEmitter.emit('audit.log')         stores in AuditContext via ALS)
                                                    ↓
                                              AuditLogListener → PrismaService.create(auditLog)
```

### AsyncLocalStorage Context (`AuditContext`)

The `AuditContext` service manages request-scoped audit state via `AsyncLocalStorage`:

- **Instance:** Singleton `AuditContextService` with a static `AsyncLocalStorage<AuditStore>` instance.
- **Store shape:** `AuditStore = { beforeStates: Map<string, Record<string, any>> }` — keyed by `"{model}:{id}"` to handle multiple Prisma operations per request.
- **Lifecycle:**
  1. `AuditLogInterceptor` enters the ALS context: `this.auditContext.run(() => next.handle())` — wraps the entire request pipeline.
  2. Inside the request, the Prisma Client Extension writes before-states into the store before `update`/`delete` executes.
  3. After response, interceptor reads before-states from the store and includes them in the `audit.log` event payload.
  4. ALS context automatically cleans up when the `run()` callback completes — no manual cleanup needed, no cross-request leaks.

### Components

1. **`AuditLogInterceptor`** (global) — enters ALS context, captures HTTP method, endpoint, user context, status code, IP. Skips GET requests and routes with `@NoAuditLog()`. After response, reads before-states from ALS, emits `audit.log` event. **Must be registered after `TenantInterceptor`** in `app.module.ts` provider list so `request.tenantId` is available.

2. **`@NoAuditLog()` decorator** — exclude specific endpoints from audit logging.

3. **`AuditLogPrismaExtension`** — Prisma Client Extension (`$extends` with `query` component) intercepting `update`/`updateMany`/`delete`/`deleteMany`. Before execute, fetches current state (`findUnique`/`findMany`). Stores before-state in ALS via `AuditContextService`. **Registration:** `$extends()` returns a new client instance (it does not mutate). `PrismaService` exposes a `withAuditExtension()` factory method that returns the extended client. The `AuditLogModule` provides a custom `AUDIT_PRISMA` injection token using this factory. The audit extension client is used only within the audit capture pipeline; all other modules continue using the base `PrismaService`.

4. **`AuditContextService`** — singleton service owning the `AsyncLocalStorage` instance. Methods: `run(fn)`, `getBeforeStates()`, `setBeforeState(key, data)`.

5. **`AuditLogListener`** — `@OnEvent('audit.log')` handler. Receives event payload (including before-states), computes diff, constructs audit record, persists to DB. Non-blocking — response already sent to client.

6. **`AuditLogService`** — CRUD operations:
   - `create()` — persist audit record
   - `findAll(filters)` — paginated list with filters (date range, user, action, resource type)
   - `findOne(id)` — detail with full diff

7. **`AuditLogController`** — 2 endpoints:
   - `GET /api/admin/audit-logs` — list with filters. Roles: ADMIN, SUPER_ADMIN.
   - `GET /api/admin/audit-logs/:id` — detail with full diff. Roles: ADMIN, SUPER_ADMIN.

### Summary Generation

`SummaryBuilder` generates human-readable summaries using a resource identifier lookup table:

```typescript
const RESOURCE_IDENTIFIERS: Record<string, string[]> = {
  student: ['name'],
  user: ['name', 'email'],
  tutor: ['name', 'email'],
  parent: ['name', 'email'],
  class: ['name'],
  session: ['title'],
  payment: ['invoice_number'],
  subject: ['name'],
  institution: ['name'],
  enrollment: ['id'],        // no human-readable field
  attendance: ['id'],
  expense: ['description'],
  settlement: ['id'],
  payout: ['id'],
  registration: ['name'],
  subscription: ['id'],
  subscription_payment: ['id'],
  whatsapp_template: ['name'],
};
```

**Resolution order:** Check before-state first (available for update/delete), then request body, then fall back to resource ID. Format: `"{Action} {resource_type} {identifier}"` — e.g. "Updated student Budi Santoso", "Deleted payment INV-2026-001".

## Frontend — Audit Log Viewer

### Route

Two routes sharing one `AuditLogPage` component:

- **`/super/audit-logs`** — under `SuperAdminRoute` + `SuperAdminLayout` tree. SUPER_ADMIN accesses this directly. Shows all institutions with institution column + filter.
- **`/audit-logs`** — under `ProtectedRoute` + `Layout` tree. ADMIN accesses this (and SUPER_ADMIN when impersonating). Scoped to current institution, no institution column.

This follows the existing dual-tree pattern (e.g. `/super/institutions` vs `/` dashboard). The `AuditLogPage` component checks `user.role` to conditionally render institution column/filter. Sidebar navigation links to the appropriate route per role.

### Components

1. **AuditLogPage** — main page:
   - **Filter bar** (top) — date range picker, user dropdown (searchable), action type select (CREATE/UPDATE/DELETE), resource type select. Reset filters button.
   - **DataTable** — columns: Timestamp, User (name + role badge), Action (color-coded badge), Resource, Summary. Sortable by timestamp. Server-side pagination (25/page).
   - **Expandable row** — click row to expand inline diff view.

2. **AuditLogDiffView** — expandable section:
   - UPDATE: table with Field | Before | After, color-coded (red removed / green added)
   - CREATE: shows created data fields
   - DELETE: shows deleted data fields

### Design

- Consistent with existing platform design (zinc palette, Inter font)
- Action badges: CREATE = green, UPDATE = blue, DELETE = red
- Role badges: reuse existing role badge styling
- Responsive — table scrollable on mobile

### Access Control

- SUPER_ADMIN: sees all institutions, extra "Institution" column + institution filter
- ADMIN: scoped to own institution only, no institution column

## Excluded Endpoints

Default `@NoAuditLog()` exclusions:

- `POST /api/auth/login` — sensitive, can spam
- `POST /api/auth/refresh` — token refresh noise
- `POST /api/auth/logout` — low value
- `GET /api/health` — health check
- `GET /api/notifications/sse` — SSE stream
- Upload endpoints — log action but binary content not stored in changes

## Edge Cases

1. **Failed requests (4xx/5xx)** — not logged. Only successful mutations (2xx) are tracked. Failed requests haven't changed data.

2. **Bulk operations** — logged as 1 audit entry with `resource_id = null`, summary includes count (e.g. "Verified 5 tutors"), changes contains array of affected IDs.

3. **SUPER_ADMIN without institution scope** — `institution_id` is nullable. For tenant-scoped actions, derive from target resource or `request.tenantId`. For global actions (e.g. managing institutions, approving upgrades), store as `null`. ADMIN viewer filters by `institution_id = tenantId`; SUPER_ADMIN viewer shows all including null-institution entries.

4. **Create operations** — before-state = null, changes field contains created data from request body.

5. **Sensitive fields** — password, token, secret fields redacted from changes. Shows `"[REDACTED]"` instead of actual value.

## Testing Strategy

- **Unit tests:** interceptor logic, diff generation, summary generation, sensitive field redaction
- **Integration test:** end-to-end flow (create student → verify audit log entry with correct diff)
- **Frontend E2E:** Playwright with mocked API data — filter interactions, diff expansion, pagination
