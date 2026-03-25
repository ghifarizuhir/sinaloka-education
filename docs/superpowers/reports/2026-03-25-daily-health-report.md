# Daily Health Report — 2026-03-25
**Generated:** 2026-03-26 05:53 WIB
**Period:** 2026-03-25 00:00 WIB — 2026-03-25 23:59 WIB

---

## 1. Executive Summary

| Item | Status | Detail |
|------|--------|--------|
| API Uptime | ⚠️ DEGRADED | HTTP 200 on 2/3 checks, 1 timeout, avg 3.66s |
| Route Handling | ✅ PASS | auth=401, 404=404 |
| Last Deploy | ✅ SUCCESS | `fix(backend,platform): remove redundant migration and fix E2E mock data (#99)` |
| Runtime Errors | ✅ None | Clean startup, no errors in 300-line window |
| Anomaly Detected | ⚠️ Yes | 1 connection timeout on Check 3; healthcheck needed 2 retries on deploy |

---

## 2. API Uptime Detail

Health Check Results:

```
Successful checks: 2/3
Average response time: 3.66s (includes 10s timeout)

Check 1: HTTP=200 | Time=0.468624s | DNS=0.003136s
Check 2: HTTP=200 | Time=0.508226s | DNS=0.005083s
Check 3: HTTP=000 | Time=10.001903s | DNS=0.005793s — FAILED (timeout or connection error)
```

Response Body:

```json
{"status":"ok"}
```

**Assessment:** DEGRADED — Checks 1 and 2 responded in under 0.51s (healthy range), but Check 3 hit the 10-second curl timeout with no HTTP response. DNS resolved successfully on all 3 checks (5ms), ruling out DNS failure. The root cause is likely a transient network interruption or Railway container GC/scheduling pause. The average of 3.66s is misleading — the two successful checks averaged ~0.49s (HEALTHY), but the single timeout dragged the metric up.

---

## 3. Endpoint Smoke Tests

```
- Auth endpoint (/api/auth/me):             HTTP 401 (expected: 401) — PASS
- Dummy route (/api/__healthcheck_dummy__): HTTP 404 (expected: 404) — PASS
```

**Assessment:** All routing is working correctly. Auth guard is active (401, not 200 or 500). Unknown routes return 404 as expected (not 500 or redirect loops).

---

## 4. Railway Runtime Logs

### Error & Warning Summary
- Total ERROR lines: 0
- Total WARN lines: 1 (Node.js runtime warning, not application-level)

### Sample Log Evidence

```
(node:1) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///app/dist/generated/prisma/internal/class.js
is not specified and it doesn't parse as CommonJS. Reparsing as ES module because module syntax was detected.
This incurs a performance overhead. To eliminate this warning, add "type": "module" to /app/package.json.

[NestFactory] Starting Nest application...
[Bootstrap] Application is running on: http://localhost:5000/api
[WhatsappService] WhatsApp (Fonnte) configured
[NestApplication] Nest application successfully started  +408ms
```

### Assessment

Runtime logs are clean. The 300-line window captures only the most recent startup sequence — all 40+ modules initialized without errors, all routes mapped successfully. The only anomaly is a Node.js `MODULE_TYPELESS_PACKAGE_JSON` warning on the Prisma generated client. This is a performance overhead warning, not an error, but it causes Node to reparse the file as an ES module on every startup, adding minor latency. This warning has been present since the Prisma ESM workaround was introduced.

---

## 5. Railway Deploy / Build Logs

### Build Status
- Last build: ✅ SUCCESS
- Build duration: 38.80 seconds
- npm vulnerabilities: Not shown in build output
- Healthcheck: Required 2 retries before succeeding (~22 seconds post-start)

### Notable Build Output

```
[INFO] [4/8] RUN npm ci
[INFO] [6/8] RUN npx prisma generate
  ✔ Generated Prisma Client (7.5.0) to ./generated/prisma in 547ms
[INFO] [7/8] RUN npm run build
  > nest build  — completed successfully
[92mBuild time: 38.80 seconds[0m

[93mAttempt #1 failed with service unavailable. Continuing to retry for 4m49s[0m
[93mAttempt #2 failed with service unavailable. Continuing to retry for 4m38s[0m
[92m[1/1] Healthcheck succeeded![0m
```

**Note:** The 2 healthcheck retries (~22 seconds gap) indicate the NestJS application took about 11 seconds post-container-start to become HTTP-ready. This is normal for cold starts with Prisma migration checks, but is worth monitoring if retry count increases over time.

---

## 6. Deployment & Git Activity

Commits in Last 48 Hours:

```
a9c8d57f | 2026-03-26 05:53 | Ghifari               | docs: add daily health report 2026-03-25
dc820ef0 | 2026-03-26 05:48 | Muhammad Ghifari Zuhir| fix(backend,platform): remove redundant migration and fix E2E mock data (#99)
fadafd80 | 2026-03-26 05:12 | Muhammad Ghifari Zuhir| fix(ci): add prisma:generate to backend lint and fix platform E2E path (#98)
6bb2751f | 2026-03-25 21:55 | Muhammad Ghifari Zuhir| fix(platform,backend): i18n, soft-delete filters, billing mode, and review fixes (#97)
dc0ab3e9 | 2026-03-25 21:07 | Muhammad Ghifari Zuhir| fix(platform): add i18n to ChangePassword page and fix TypeScript errors (#96)
a04a968d | 2026-03-25 21:07 | Muhammad Ghifari Zuhir| fix(backend): soft-delete tutors instead of hard delete to preserve financial data (#95)
72105ce7 | 2026-03-25 20:11 | Muhammad Ghifari Zuhir| fix(platform): fix hardcoded i18n labels in class drawer and sidebar (#94)
16c7c49e | 2026-03-25 11:07 | Claude                | docs: add daily review 2026-03-24 and unignore daily-review folder
591b1910 | 2026-03-25 07:08 | Muhammad Ghifari Zuhir| fix(platform): restructure onboarding wizard and fix academic settings 400 error (#93)
4384b5bf | 2026-03-24 23:04 | Muhammad Ghifari Zuhir| fix(platform): replace crypto.randomUUID with safe fallback in onboarding (#92)
62646a92 | 2026-03-24 22:54 | Muhammad Ghifari Zuhir| feat(platform): redesign register and onboarding pages with teal branding (#91)
1ee7ad11 | 2026-03-24 22:13 | Ghifari               | fix(platform): match Daftar button style to Masuk button on welcome page
e2223308 | 2026-03-24 22:08 | Ghifari               | fix(platform): improve readability on welcome and login pages
ae888bde | 2026-03-24 22:01 | Muhammad Ghifari Zuhir| feat(platform): unify subdomain pages with Sinaloka teal branding (#90)
8394ec6c | 2026-03-24 21:37 | Muhammad Ghifari Zuhir| feat(platform): redesign login page with branded split-screen layout (#89)
261b28ec | 2026-03-24 20:59 | Muhammad Ghifari Zuhir| fix(platform): lock password step after completion in onboarding wizard (#88)
ed8b33c3 | 2026-03-24 20:55 | Ghifari               | fix: institution form validation mismatches
7f3b68b7 | 2026-03-24 20:41 | Muhammad Ghifari Zuhir| feat(platform): refactor onboarding to 4-step wizard (#87)
8440950a | 2026-03-24 18:53 | Ghifari               | fix(platform): remove stale 4-mode billing section from SuperAdmin InstitutionForm
90f860d2 | 2026-03-24 13:34 | Muhammad Ghifari Zuhir| fix(platform): select dropdown clipped when scrolling inside modal (#86)
de544927 | 2026-03-24 11:03 | Ghifari               | fix: sync plan pricing with landing page
d1dd58c9 | 2026-03-24 10:54 | Ghifari               | fix(backend): fix onboarding billing-mode endpoint validation
d1dfc157 | 2026-03-24 10:40 | Ghifari               | fix(backend): add separate backfill migration for billing_mode
ee4c7278 | 2026-03-24 10:28 | Ghifari               | style(platform): replace placeholder logos with book stack brand logo
4898b5bd | 2026-03-24 10:18 | Muhammad Ghifari Zuhir| feat: simplify student billing to 2 modes with onboarding wizard (#85)
cbd886bd | 2026-03-24 06:58 | Muhammad Ghifari Zuhir| feat(platform): redesign date picker & time picker with Radix UI (#84)
c9126ff8 | 2026-03-24 06:31 | Ghifari               | chore(landing): update WhatsApp contact number
```

Analysis:
- Total commits: 27 in 48 hours
- Fix commits: 17 (dc820ef0, fadafd80, 6bb2751f, dc0ab3e9, a04a968d, 72105ce7, 591b1910, 4384b5bf, 1ee7ad11, e2223308, 261b28ec, ed8b33c3, 8440950a, 90f860d2, de544927, d1dd58c9, d1dfc157)
- Feature commits: 6 (62646a92, ae888bde, 8394ec6c, 7f3b68b7, 4898b5bd, cbd886bd)
- Anomalies: Very high commit velocity — 27 commits across 48 hours is significantly elevated. The clustering around onboarding/billing-mode (multiple fix: commits chasing the same domain) suggests an incident period around 2026-03-24 10:00–11:00 and again around 20:00–23:00. Three fix: commits to backend in one session (`d1dfc157`, `d1dd58c9`, `a04a968d`) targeting billing and soft-delete logic indicate iterative hotfix behavior rather than planned fixes.

---

## 7. Findings & Hypothesis

### Finding A — Transient Timeout on Health Check 3
**Severity:** Medium
**Evidence:**
```
Check 3: HTTP=000 | Time=10.001903s | DNS=0.005793s — FAILED (timeout)
```
**Hypothesis:** DNS resolved successfully, so the failure was not DNS-related. The most likely causes are: (1) Railway container scheduling pause / GC pause causing the process to stop accepting connections briefly, (2) transient upstream network interruption between the monitoring host and Railway's us-west1 region. Given that Check 1 and 2 at the same interval responded in <0.51s, this appears to be an isolated spike rather than sustained degradation. No indication of application crash (runtime logs show normal operation). Worth monitoring in subsequent checks — if timeouts become frequent, investigate Railway container restart frequency.

### Finding B — Healthcheck Required 2 Retries Post-Deploy
**Severity:** Low
**Evidence:**
```
Attempt #1 failed with service unavailable. Continuing to retry for 4m49s
Attempt #2 failed with service unavailable. Continuing to retry for 4m38s
Healthcheck succeeded!
```
**Hypothesis:** The NestJS application takes ~11–22 seconds post-container-start to be HTTP-ready (migrations + module initialization). This is within Railway's 5-minute retry window so deploys are safe, but if startup time continues to grow (more modules, larger schema), there is a risk of healthcheck timeout. Current startup is acceptable.

### Finding C — Node.js MODULE_TYPELESS_PACKAGE_JSON Warning
**Severity:** Low
**Evidence:**
```
(node:1) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///app/dist/generated/prisma/internal/class.js
is not specified... Reparsing as ES module... This incurs a performance overhead.
```
**Hypothesis:** The Prisma-generated client files lack explicit `"type": "module"` in their `package.json`. The generated `package.json` workaround in the Dockerfile only sets the root `generated/prisma/package.json`, but Node.js also checks internal subdirectory module type. This causes a reparse on every startup, adding minor cold-start overhead. The warning itself is harmless to runtime behavior, but fixing it would clean the logs and slightly improve startup time.

### Finding D — High Fix-to-Feature Commit Ratio Suggesting Iterative Hotfixing
**Severity:** Low
**Evidence:**
```
17 fix: commits vs 6 feat: commits in 48 hours
Multiple fix: commits targeting same domain (billing-mode, onboarding) in rapid succession
fix(backend): fix onboarding billing-mode endpoint validation  (10:54)
fix(backend): add separate backfill migration for billing_mode  (10:40)
```
**Hypothesis:** The onboarding and billing-mode feature shipped as a feature commit (`feat: simplify student billing`) and required 2 immediate backend fix commits within 30 minutes, plus continued platform fixes for several hours after. This indicates the feature was merged without full validation of the backend validation and migration paths. The `a04a968d` soft-delete fix also suggests a data integrity issue was discovered post-merge. Not a runtime incident today, but the pattern warrants process review (more thorough pre-merge testing on financial domain changes).

---

## 8. Recommendations

| Priority | Action | Reason |
|----------|--------|--------|
| Medium | Monitor timeout frequency in next 3–5 health checks | 1 timeout in 3 checks (33%) is above acceptable threshold; if it recurs, escalate to Railway support or investigate container stability |
| Low | Add `"type": "module"` resolution to all Prisma internal generated `package.json` files | Eliminates NODE warning and minor startup overhead |
| Low | Review pre-merge checklist for financial/onboarding domain changes | High fix commit velocity following billing-mode feature suggests insufficient pre-merge backend validation |
| Low | Track Railway healthcheck retry count per deploy | Increasing retry count over time signals startup regression; set alert if retries reach 3+ |

---

## 9. Monitoring Coverage

| Source | Status | Notes |
|--------|--------|-------|
| HTTP Health Check | Available | 3-point check, avg response time — 1 timeout detected |
| Endpoint Smoke Tests | Available | auth + 404 routing — both PASS |
| Railway Runtime Logs | Available | Last 300 lines via Railway CLI — clean startup, no errors |
| Railway Build Logs | Available | Last 300 lines via Railway CLI — build SUCCESS in 38.80s |
| Git Activity | Available | 48-hour window — 27 commits, high fix velocity noted |
| Database Metrics | Not Available | No DB monitoring endpoint |
| Memory/CPU Metrics | Not Available | No metrics endpoint configured |
