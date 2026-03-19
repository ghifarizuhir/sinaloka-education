# Codebase Concerns

**Analysis Date:** 2026-03-19

---

## Tech Debt

### Pervasive `any` Typing at API Boundaries (Platform + Backend)

- Issue: Service files use `any` throughout instead of typed response shapes. The backend API shape diverges from the frontend type definitions, requiring `flattenTutor`/`flattenParent` adapter functions that operate on `any`.
- Files:
  - `sinaloka-platform/src/services/tutors.service.ts` — `flattenTutor(raw: any)`, all calls typed `api.get<any>`
  - `sinaloka-platform/src/services/parents.service.ts` — `flattenParent(raw: any)`, inner maps `(c: any)`
  - `sinaloka-platform/src/services/payouts.service.ts` — `const raw = r.data as any`
  - `sinaloka-platform/src/pages/Classes/ClassDetailDrawer.tsx` — `classDetail: { data: any }`
  - `sinaloka-platform/src/pages/Classes/GenerateSessionsModal.tsx` — `data: any` prop
  - `sinaloka-platform/src/pages/Tutors.tsx` — `(tutor as any).user?.is_active`, `onSubmit: (data: any) => void`
  - `sinaloka-platform/src/pages/Schedules/SessionDetailDrawer.tsx` — `sessionDetail: { data?: any }`
  - `sinaloka-backend/src/modules/session/session.service.ts` — `flattenSession(session: any)`
  - `sinaloka-backend/src/modules/payment/payment.service.ts` — `const where: any = { institution_id: institutionId }`
  - `sinaloka-backend/src/modules/parent/parent.service.ts` — multiple `(e: any)`, `(sessionFilter.date as any).gte`
- Impact: Runtime shape mismatches are undetected at compile time. The `flattenTutor`/`flattenParent` pattern exists because the backend returns `user.name` nested inside `user`, but the frontend `Tutor` type expects `name` at the top level — a silent contract mismatch that will break if the backend shape changes.
- Fix approach: Define typed API response DTOs in `src/types/` and use them as Axios generic parameters. For flatten functions, define explicit `RawTutorResponse` / `RawParentResponse` interfaces matching the actual backend payload shape.

---

### `settings` Column is Untyped JSON Blob

- Issue: `Institution.settings` is `Json?` in Prisma (`prisma/schema.prisma` line 91). All reads require `as any` casts, and the structure is undocumented and spread across three modules.
- Files:
  - `sinaloka-backend/prisma/schema.prisma` line 91
  - `sinaloka-backend/src/modules/settings/settings.service.ts` lines 70, 84 — `(institution.settings as any)?.billing`
  - `sinaloka-backend/src/modules/whatsapp/whatsapp.cron.ts` lines 30, 37 — `settings as Record<string, any> | null`
- Impact: Adding new settings keys requires touching multiple files with no compile-time safety. The WhatsApp `remind_days_before` field is read via an unsafe cast; a corrupt DB value silently produces `NaN`, causing `maxRemindDays` to be `NaN` and `remindDate` to be invalid.
- Fix approach: Define an `InstitutionSettings` TypeScript interface and use a Zod schema to parse the raw JSON at read time in `SettingsService.getBilling`. Alternatively, migrate WhatsApp config to dedicated DB columns.

---

### Decimal Type Conversion to Number

- Issue: 53+ instances of `Number()` wrapping Prisma `Decimal` fields in backend services.
- Files: `sinaloka-backend/src/modules/session/session.service.ts`, `sinaloka-backend/src/modules/payout/payout.service.ts`
- Impact: Conversion of `Decimal` to `number` (IEEE 754 float) loses precision for large money values. This is particularly risky in the `PER_STUDENT_ATTENDANCE` fee calculation where `feePerStudent * attendingCount` multiplies two floats.
- Fix approach: Use `Decimal.js` arithmetic throughout the calculation chain and only convert to `number` at the final JSON serialization boundary.

---

### `SidebarItem` Duplicated Across Both Layout Components

- Issue: `SidebarItem` is defined inline in both `Layout.tsx` and `SuperAdminLayout.tsx` with identical structure and `icon: any` typing.
- Files: `sinaloka-platform/src/components/Layout.tsx` line 30, `sinaloka-platform/src/components/SuperAdminLayout.tsx` line 17
- Impact: Bug fixes and design changes must be applied twice. The `icon: any` type means invalid icon components go undetected.
- Fix approach: Extract to `src/components/ui/SidebarItem.tsx` using `icon: React.ComponentType<{ size?: number }>`.

---

### Payout Auto-Creation Has No Idempotency Guard

- Issue: When a session is marked `COMPLETED`, `session.service.ts` unconditionally creates a new `Payout` record with no check for whether a payout for this session already exists. Additionally:
  1. The session `UPDATE` and the payout `INSERT` are not wrapped in a single `$transaction` — a crash between them leaves the session permanently `COMPLETED` with no payout, and no recovery path.
  2. This same logic exists in two places: the `update` method (lines 171–244) and the `completeByTutor` method (lines 609–699), both with duplicated payout-creation code.
- Files: `sinaloka-backend/src/modules/session/session.service.ts` lines 171–244, 609–699
- Impact: If an admin and a tutor complete the same session concurrently (race), two `Payout` records are created for one session. There is no `unique` DB constraint preventing this.
- Fix approach: Add `session_id String?` foreign key to the `Payout` model with a unique constraint `@@unique([session_id])`. Wrap the session update + payout creation in a single `$transaction`. Deduplicate the payout-creation logic into a private `_createPayoutForSession` helper.

---

### Overdue Payment Status Updated on Every `findAll` Read

- Issue: `PaymentService.findAll` calls `refreshOverdueStatus` on every list request, which runs an `updateMany` to flip `PENDING → OVERDUE` on the payments table.
- Files: `sinaloka-backend/src/modules/payment/payment.service.ts` lines 26–27, 71–80
- Impact: A write-heavy side effect on a read endpoint. Under concurrent load (dashboard polling, WhatsApp reminder cron, report generation) this causes unnecessary table-level lock contention. Any call to `findAll` from a non-mutation context (report service, dashboard stats) silently modifies payment state.
- Fix approach: Move overdue detection to a `PaymentCronService` with a nightly cron, mirroring `PayoutCronService`. Remove the `refreshOverdueStatus` call from `findAll`.

---

### Report Generation Loads Full Unbounded Result Sets into Memory

- Issue: `ReportService.generateAttendanceReport` and `generateFinanceReport` use `findMany` with only `where` filters and no `take` limit.
- Files: `sinaloka-backend/src/modules/report/report.service.ts` lines 74–88 (attendance), 131–150 (finance)
- Impact: An institution with years of attendance data generates a full in-memory `Buffer[]` in Node.js. No size limits or streaming. PDF column coordinates are also hardcoded (`[40, 150, 180, 80]`), causing text overflow for long student/class names.
- Fix approach: Enforce a max date range (e.g. 366 days) via Zod validation in `ReportController`. Add a cursor-based iteration loop with a streaming write for large datasets. Truncate strings to column-width before PDFKit rendering.

---

### Missing Error Handling in Frontend Services

- Issue: All service layer methods delegate error handling entirely to callers. No global error boundary at the route level.
- Files: `sinaloka-platform/src/services/students.service.ts`, `sinaloka-platform/src/services/classes.service.ts`, and most other service files
- Impact: Inconsistent error handling across pages. Network timeouts surface as unhandled promise rejections in some views.
- Fix approach: The API interceptor in `src/lib/api.ts` already handles 401 refresh logic. Extend it to forward non-401 errors to a global toast handler. Add React error boundaries at the page-router level.

---

## Known Bugs

### Tutor Search on Payouts Page Only Searches Current Page

- Symptoms: Searching for a tutor by name in the Payout list only searches within the 10 currently loaded records.
- Files: `sinaloka-platform/src/pages/Finance/TutorPayouts.tsx` lines 57–62
- Trigger: More than 10 payouts exist; user types a name into the search box and the tutor is on page 2+.
- Workaround: Manually navigate to each page and search again.

### Session Completion Payout Logic Duplicated with Inconsistent Tutor ID Source

- Symptoms: When an admin completes a session via `update()`, the tutor ID is read from `sessionClass.tutor_id`. When a tutor completes via `completeByTutor()`, the tutor ID comes from looking up the current user's `tutor` record. If the class's `tutor_id` was changed after sessions were generated, these two paths produce payouts for different tutors.
- Files: `sinaloka-backend/src/modules/session/session.service.ts` lines 208, 667
- Trigger: Admin reassigns a class to a new tutor; the new tutor completes a session; admin also marks the same session complete.

### WhatsApp Phone Normalization is Indonesian-Only

- Symptoms: Phone numbers not starting with `0` or `62` are assumed to be Indonesian and prefixed with `+62`.
- Files: `sinaloka-backend/src/modules/whatsapp/whatsapp.service.ts` lines 41–54
- Trigger: Non-Indonesian parent phone number stored without country code.
- Workaround: Store phone numbers with full international format (`+<country_code><number>`).

### Parent App Silent Catch Allows Stale State

- Symptoms: Child detail page shows outdated attendance/payment data if a refetch silently fails.
- Files: `sinaloka-parent/src/hooks/useChildDetail.ts`
- Trigger: Network outage while viewing child details.
- Workaround: Manual page refresh.

---

## Security Considerations

### CORS is Fully Open — No Origin Restriction

- Risk: `app.enableCors()` with no options defaults to `origin: '*'`, allowing any domain to make credentialed cross-origin requests to the API.
- Files: `sinaloka-backend/src/main.ts` line 11
- Current mitigation: None.
- Recommendations: Pass `{ origin: [PLATFORM_URL, TUTOR_PORTAL_URL, PARENT_PORTAL_URL] }` to `enableCors()`. Source these from environment variables.

### JWT Tokens Stored in `localStorage`

- Risk: Access and refresh tokens (7-day validity) stored in `localStorage` are readable by any JavaScript on the page, including injected scripts (XSS). Tokens persist after the browser is closed.
- Files: `sinaloka-platform/src/contexts/AuthContext.tsx` lines 54–76, `sinaloka-platform/src/lib/api.ts` lines 28, 75–92
- Current mitigation: None — the refresh token stored in `localStorage` gives 7-day persistent access.
- Recommendations: Move tokens to `httpOnly` cookies issued and refreshed by the backend. Remove the client-side token storage entirely. The refresh intercept in `api.ts` would call a cookie-refresh endpoint instead.

### No Rate Limiting on Authentication Endpoints

- Risk: Login, password reset, and refresh token endpoints have no rate limiting. Brute-force and credential-stuffing attacks are unconstrained. The forgot-password endpoint can be abused to spam users with reset emails.
- Files: `sinaloka-backend/src/modules/auth/auth.controller.ts` (login, forgot-password), `sinaloka-backend/src/app.module.ts` — no `ThrottlerModule`
- Current mitigation: None.
- Recommendations: Install `@nestjs/throttler`, add `ThrottlerModule.forRoot()` to `AppModule`, apply `@Throttle()` to auth endpoints. Apply stricter limits to `POST /api/auth/login` and `POST /api/auth/forgot-password`.

### WhatsApp Webhook Signature Verification Has a Fallback Bypass

- Risk: In `whatsapp.controller.ts` line 59, the raw body for HMAC verification falls back to `JSON.stringify(body)` when `req.rawBody` is absent. This verifies the signature against re-serialized JSON which may differ from the actual wire bytes — the signature check silently passes or fails incorrectly.
- Files: `sinaloka-backend/src/modules/whatsapp/whatsapp.controller.ts` lines 59–62, `sinaloka-backend/src/main.ts` — does not configure `rawBody: true`
- Current mitigation: The fallback `JSON.stringify(body)` is never the correct raw payload.
- Recommendations: Add `rawBody: true` to `NestFactory.create()` options in `main.ts`. Replace `(req as any).rawBody` with the typed `RawBodyRequest` interface from `@nestjs/common`.

### Upload MIME Type Not Validated — Extension Spoofing Possible

- Risk: `UploadService.saveFile` validates only the file extension from `file.originalname`. It does not check actual file magic bytes/MIME type.
- Files: `sinaloka-backend/src/modules/upload/upload.service.ts` lines 23–29
- Current mitigation: Extension allow-list (`['.jpg', '.jpeg', '.png', '.pdf']`) reduces but does not eliminate risk.
- Recommendations: Use the `file-type` npm package to check magic bytes. Reject SVG explicitly (JavaScript XSS vector). Set `Content-Disposition: attachment` on all served upload responses to prevent inline execution.

### Invoice Path Traversal Protection

- Risk: `invoice.service.ts` constructs logo file paths from `institution.logo_url` and validates the resolved path stays within `UPLOAD_DIR`.
- Files: `sinaloka-backend/src/modules/payment/invoice.service.ts` lines 196–199
- Current mitigation: `path.resolve` + `startsWith(resolvedUploadDir)` check exists — this is correctly implemented.
- Recommendations: Extend the same pattern to the `getFilePath` method in `upload.service.ts` (which already does this on line 50) — no action needed there.

---

## Performance Bottlenecks

### Overdue Payment Update on Every List Request

- Problem: `refreshOverdueStatus` runs an `updateMany` on every `GET /api/admin/payments` call.
- Files: `sinaloka-backend/src/modules/payment/payment.service.ts` lines 26–27, 71–80
- Cause: Overdue detection implemented as a read-path side effect instead of a background process.
- Improvement path: Move to a nightly `PaymentCronService`. See Tech Debt section above.

### Report Generation: No Streaming, No Row Limit

- Problem: Full attendance and finance data sets loaded into memory for PDF/CSV generation.
- Files: `sinaloka-backend/src/modules/report/report.service.ts`
- Cause: `findMany` with no `take` limit.
- Improvement path: Enforce max date range in Zod DTO. Use cursor-based streaming for large exports.

### Dashboard Activity Feed: 60 Rows Loaded to Return 20

- Problem: `getActivity` fetches `take: 20` each from 3 tables (60 rows) then sorts and slices to 20 in JavaScript.
- Files: `sinaloka-backend/src/modules/dashboard/dashboard.service.ts` lines 37–60
- Cause: No unified activity log; activity reconstructed from 3 domain tables.
- Improvement path: Reduce `take` from 20 to 7 per query for balanced representation. Long-term: add a dedicated `ActivityLog` table populated via service-level hooks.

### Payout Export Fetches All Sessions Without Pagination

- Problem: `payout.service.ts` export audit fetches all sessions for a period with no `take` limit.
- Files: `sinaloka-backend/src/modules/payout/payout.service.ts` lines 111–124
- Cause: Unbounded `findMany` for CSV generation.
- Improvement path: Add cursor-based pagination; stream CSV rows; add DB index on `(institution_id, tutor_id, status, date)`.

### WhatsApp Message Queue: No Async Processing

- Problem: `sendTemplate` makes a blocking `fetch()` call to the Graph API synchronously within the request/response cycle.
- Files: `sinaloka-backend/src/modules/whatsapp/whatsapp.service.ts` lines 93–163
- Cause: No queue mechanism; no concurrency limit.
- Improvement path: Use Bull/BullMQ with a Redis queue. Each `sendTemplate` call enqueues a job; a worker processes them with concurrency limits and exponential backoff.

### Large File Uploads Buffered Entirely in Memory

- Problem: `UploadService.saveFile` receives `file.buffer` (the full file in RAM from Multer memory storage) and writes it synchronously via `fs.writeFileSync`.
- Files: `sinaloka-backend/src/modules/upload/upload.service.ts` line 36, `sinaloka-backend/src/modules/upload/upload.controller.ts` line 28
- Cause: `FileInterceptor` uses default Multer memory storage.
- Improvement path: Switch to Multer disk storage or streaming to avoid holding 5MB files in memory. Long-term: migrate to S3/GCS with pre-signed URLs.

---

## Fragile Areas

### WhatsApp Webhook Raw Body Not Wired Up

- Files: `sinaloka-backend/src/main.ts`, `sinaloka-backend/src/modules/whatsapp/whatsapp.controller.ts`
- Why fragile: `main.ts` does not pass `rawBody: true` to `NestFactory.create()`, so `req.rawBody` is always `undefined`. The controller silently falls back to `JSON.stringify(body)` for HMAC computation — this verifies the wrong bytes.
- Safe modification: Change `NestFactory.create(AppModule)` to `NestFactory.create(AppModule, { rawBody: true })`. Use `RawBodyRequest` type in controller.
- Test coverage: `whatsapp.service.spec.ts` tests `verifyWebhookSignature` in isolation but not the end-to-end webhook path.

### Session Completion: Non-Atomic Session + Payout Writes

- Files: `sinaloka-backend/src/modules/session/session.service.ts`
- Why fragile: The session UPDATE and payout INSERT are sequential non-transactional operations. A process failure between them produces an unrecoverable inconsistent state (COMPLETED session, no payout).
- Safe modification: Wrap both writes in `$transaction`. Add `session_id` FK to `Payout` model. Requires a Prisma migration.
- Test coverage: `session.service.spec.ts` tests the happy path but not the partial-failure scenario.

### Enrollment Status Has No State Machine

- Files: `sinaloka-backend/src/modules/enrollment/enrollment.service.ts`
- Why fragile: No validation of valid status transitions. An enrollment can transition `ACTIVE → DROPPED → ACTIVE` without any guard.
- Safe modification: Add a `VALID_TRANSITIONS` map and check it before `update`. Consider `xstate` for complex flows.
- Test coverage: Controller spec exists but status transition edge cases are missing.

### PDF Column Coordinates Are Hardcoded

- Files: `sinaloka-backend/src/modules/report/report.service.ts` lines 104–123, `sinaloka-backend/src/modules/payment/invoice.service.ts`
- Why fragile: Fixed pixel column positions `[40, 150, 180, 80]`. Long names (student names with 40+ chars, class names with special characters) overflow into adjacent columns with no word-wrap.
- Safe modification: Truncate strings to `col_width / char_width` characters before PDFKit `text()` calls. Or switch to a template-based approach (Handlebars + html-to-pdf).
- Test coverage: No tests for PDF generation output.

### PayoutCron Uses `console.log` Instead of NestJS Logger

- Files: `sinaloka-backend/src/modules/payout/payout.cron.ts` line 22
- Why fragile: Log output won't be captured by NestJS's log pipeline or any log aggregation that hooks into the NestJS Logger.
- Safe modification: Add `private readonly logger = new Logger(PayoutCronService.name)` and replace `console.log` with `this.logger.log(...)`.

---

## Scaling Limits

### Local Filesystem for Uploads

- Current capacity: Uploads to `UPLOAD_DIR` on the local server disk.
- Limit: Single server, no distributed storage. Files are not accessible if the app is deployed on multiple instances. No orphan cleanup job — files accumulate indefinitely.
- Scaling path: Migrate to S3/GCS. Use pre-signed URLs for private invoice/receipt access. Add an orphan cleanup cron that removes files with no matching DB record.

### WhatsApp Message Queue is In-Process

- Current capacity: Each message delivery is a synchronous HTTP call within the request thread.
- Limit: High message volume (100+ per minute from the payment reminder cron) causes request queue buildup.
- Scaling path: Bull/BullMQ with Redis. Separate cron that enqueues jobs vs. workers that process them.

### No Database Connection Pool Configuration

- Current capacity: Default Prisma pool (20 connections in development, determined by Prisma defaults).
- Limit: High concurrent request count may exhaust connections.
- Scaling path: Set `connection_limit` in `DATABASE_URL`. Add pgBouncer in front of PostgreSQL. Add Prisma query instrumentation/metrics.

---

## Dependencies at Risk

### PDFKit with Manual Coordinate Layout

- Risk: Maintenance burden; no built-in i18n; fragile pixel-coordinate layout that breaks with non-ASCII characters and long strings.
- Impact: Invoice and report PDF formatting breaks with long institution/student names; hard to customize per institution.
- Migration plan: Consider html-to-pdf (Puppeteer, `@sparticuz/chromium-min`) using Handlebars templates. This also solves the i18n issue.

### File Uploads Stored Locally (No CDN/Object Storage)

- Risk: Files are unrecoverable if the server disk is lost. No MIME-type enforcement beyond extension check.
- Impact: Invoice PDFs and payment proof images lost on server failure.
- Migration plan: Migrate `UploadModule` to S3-compatible storage. Use `@aws-sdk/client-s3` with pre-signed URLs.

---

## Missing Critical Features

### No Rate Limiting Anywhere

- Problem: No `@nestjs/throttler` or equivalent. All endpoints — including auth, file upload, and report generation — are unconstrained.
- Blocks: Production readiness, security compliance.

### No Audit Trail for Finance Operations

- Problem: No record of who modified payouts, payments, or invoices (no before/after audit log).
- Blocks: Financial compliance, fraud detection, dispute resolution.
- Recommendation: Add an `audit_logs` table; log all finance mutations with `before`, `after`, `user_id`, and `timestamp`.

### No Concurrent Session/Tutor Conflict Detection

- Problem: A tutor can be assigned to overlapping sessions without conflict detection in session generation.
- Blocks: Accurate tutor workload planning.
- Recommendation: Add uniqueness constraint on `(tutor_id, date, start_time)` in `ClassSchedule`; surface conflicts in the UI.

### No Mechanism to Re-attempt a Failed Payout Auto-Creation

- Problem: If the payout insert fails after a session is marked `COMPLETED`, there is no retry path or admin UI to detect affected sessions.
- Blocks: Financial reconciliation for `FIXED_PER_SESSION` and `PER_STUDENT_ATTENDANCE` fee modes.

---

## Test Coverage Gaps

### `settings.service.ts` — No Tests

- What's not tested: `getBilling` default merging, `updateBilling` partial update, `getGeneral`/`updateGeneral` not-found paths.
- Files: `sinaloka-backend/src/modules/settings/settings.service.ts`
- Risk: Billing configuration changes could silently corrupt `Institution.settings` JSON.
- Priority: High

### `invitation.service.ts` — No Tests

- What's not tested: Token expiry edge cases, concurrent invite-accept race, resend-invite flow, cancel-invite, parent invite acceptance.
- Files: `sinaloka-backend/src/modules/invitation/invitation.service.ts`
- Risk: Invitation lifecycle bugs leave the system in an inconsistent state (user created, invitation not accepted, no recovery path).
- Priority: High

### `payout-slip.service.ts` — No Tests

- What's not tested: PDF/image payout slip generation, path validation, binary output correctness.
- Files: `sinaloka-backend/src/modules/payout/payout-slip.service.ts`
- Priority: Medium

### `invoice.service.ts` — No Tests

- What's not tested: Invoice PDF generation, invoice number sequencing, logo path traversal protection, bilingual output.
- Files: `sinaloka-backend/src/modules/payment/invoice.service.ts`
- Priority: Medium

### Platform E2E — No Tests for SuperAdmin Flows

- What's not tested: Institution creation, user management, impersonation enter/exit, institution deactivation.
- Files: `sinaloka-platform/e2e/specs/` — no `superadmin/` subdirectory
- Risk: SuperAdmin-specific features (impersonation, institution lifecycle) have zero E2E coverage.
- Priority: Medium

### Parent App — No Tests at All

- What's not tested: `useChildDetail.ts` hooks, all parent-facing components, mapper transformations.
- Files: `sinaloka-parent/src/` — no test files
- Risk: Silent failures in parent data display go undetected; error handling catch blocks are empty.
- Priority: Medium

### Financial Calculation Edge Cases

- What's not tested: Payout with zero sessions, negative deductions, decimal precision in `PER_STUDENT_ATTENDANCE` mode.
- Files: `sinaloka-backend/src/modules/payout/payout.service.ts`, `sinaloka-backend/src/modules/session/session.service.ts`
- Risk: Financial data corruption, reconciliation issues.
- Priority: High

---

*Concerns audit: 2026-03-19*
