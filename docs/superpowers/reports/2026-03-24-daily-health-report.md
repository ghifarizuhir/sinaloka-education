# Daily Health Report — 2026-03-24
**Generated:** 2026-03-26 06:08 WIB
**Period:** 2026-03-24 00:00 WIB — 2026-03-24 23:59 WIB

---

## 1. Executive Summary

| Item | Status | Detail |
|------|--------|--------|
| API Uptime | ⚠️ UNKNOWN | Monitoring sandbox blocked by egress proxy — `api.sinaloka.com` not in allowed hosts |
| Route Handling | ⚠️ UNKNOWN | Cannot reach production from this environment |
| Recent Deployments | 13 commits | Last on 2026-03-24: `4898b5b feat: simplify student billing to 2 modes with onboarding wizard (#85)` |
| Anomaly Detected | ⚠️ Yes | High commit velocity on 2026-03-24 (13 commits in one day, multiple fix: commits) |

> **Note:** Direct HTTP checks to `api.sinaloka.com` are blocked by the sandbox egress proxy
> (`host_not_allowed` — 403 from Envoy). All uptime metrics in this report are based on
> git history and deployment patterns only. See Section 7 for monitoring limitations.

---

## 2. API Uptime Detail

### Health Check Results
```
Attempt: curl -w "HTTP=%{http_code} | Time=%{time_total}s" https://api.sinaloka.com/api/health
Result:  CONNECT tunnel failed — 403 Forbidden (x-deny-reason: host_not_allowed)
         Proxy: container egress proxy does not allow api.sinaloka.com
```

### Response Body
```
Not available — egress proxy blocked connection before reaching origin
```

**Assessment:** UNKNOWN — The monitoring agent runs inside a sandboxed container whose egress
proxy allowlist does not include `api.sinaloka.com`. This is an environment limitation, not an
API outage. The Railway healthcheck (which runs from Railway's own network) would be the
authoritative source for actual uptime. No evidence of downtime found in git history (no
hotfix/rollback commits).

---

## 3. Endpoint Smoke Tests

```
Auth endpoint (GET /api/auth/me — expect 401):
  Result: BLOCKED — same proxy restriction as above

404 handling (GET /api/__healthcheck_dummy__ — expect 404):
  Result: BLOCKED — same proxy restriction as above
```

**Assessment:** Unable to verify routing from this environment. No evidence of routing issues
in git history — all recent changes are frontend and onboarding-related with no changes to
routing configuration or global guards.

---

## 4. Deployment & Git Activity

### Commits in Last 48 Hours (covering 2026-03-24)
```
dc820ef | 2026-03-26 05:48:07 +0700 | Muhammad Ghifari Zuhir | fix(backend,platform): remove redundant migration and fix E2E mock data (#99)
fadafd8 | 2026-03-26 05:12:09 +0700 | Muhammad Ghifari Zuhir | fix(ci): add prisma:generate to backend lint and fix platform E2E path (#98)
6bb2751 | 2026-03-25 21:55:32 +0700 | Muhammad Ghifari Zuhir | fix(platform,backend): i18n, soft-delete filters, billing mode, and review fixes (#97)
dc0ab3e | 2026-03-25 21:07:43 +0700 | Muhammad Ghifari Zuhir | fix(platform): add i18n to ChangePassword page and fix TypeScript errors (#96)
a04a968 | 2026-03-25 21:07:35 +0700 | Muhammad Ghifari Zuhir | fix(backend): soft-delete tutors instead of hard delete to preserve financial data (#95)
72105ce | 2026-03-25 20:11:40 +0700 | Muhammad Ghifari Zuhir | fix(platform): fix hardcoded i18n labels in class drawer and sidebar (#94)
16c7c49 | 2026-03-25 04:07:48 +0000 | Claude               | docs: add daily review 2026-03-24 and unignore daily-review folder
591b191 | 2026-03-25 07:08:18 +0700 | Muhammad Ghifari Zuhir | fix(platform): restructure onboarding wizard and fix academic settings 400 error (#93)
4384b5b | 2026-03-24 23:04:17 +0700 | Muhammad Ghifari Zuhir | fix(platform): replace crypto.randomUUID with safe fallback in onboarding (#92)
62646a9 | 2026-03-24 22:54:02 +0700 | Muhammad Ghifari Zuhir | feat(platform): redesign register and onboarding pages with teal branding (#91)
1ee7ad1 | 2026-03-24 22:13:37 +0700 | Ghifari              | fix(platform): match Daftar button style to Masuk button on welcome page
e222330 | 2026-03-24 22:08:28 +0700 | Ghifari              | fix(platform): improve readability on welcome and login pages
ae888bd | 2026-03-24 22:01:37 +0700 | Muhammad Ghifari Zuhir | feat(platform): unify subdomain pages with Sinaloka teal branding (#90)
8394ec6 | 2026-03-24 21:37:03 +0700 | Muhammad Ghifari Zuhir | feat(platform): redesign login page with branded split-screen layout (#89)
261b28e | 2026-03-24 20:59:44 +0700 | Muhammad Ghifari Zuhir | fix(platform): lock password step after completion in onboarding wizard (#88)
ed8b33c | 2026-03-24 20:55:03 +0700 | Ghifari              | fix: institution form validation mismatches
7f3b68b | 2026-03-24 20:41:38 +0700 | Muhammad Ghifari Zuhir | feat(platform): refactor onboarding to 4-step wizard (#87)
8440950 | 2026-03-24 18:53:40 +0700 | Ghifari              | fix(platform): remove stale 4-mode billing section from SuperAdmin InstitutionForm
90f860d | 2026-03-24 13:34:42 +0700 | Muhammad Ghifari Zuhir | fix(platform): select dropdown clipped when scrolling inside modal (#86)
de54492 | 2026-03-24 11:03:12 +0700 | Ghifari              | fix: sync plan pricing with landing page
d1dd58c | 2026-03-24 10:54:07 +0700 | Ghifari              | fix(backend): fix onboarding billing-mode endpoint validation
d1dfc15 | 2026-03-24 10:40:30 +0700 | Ghifari              | fix(backend): add separate backfill migration for billing_mode
ee4c727 | 2026-03-24 10:28:20 +0700 | Ghifari              | style(platform): replace placeholder logos with book stack brand logo
4898b5b | 2026-03-24 10:18:25 +0700 | Muhammad Ghifari Zuhir | feat: simplify student billing to 2 modes with onboarding wizard (#85)
cbd886b | 2026-03-24 06:58:42 +0700 | Muhammad Ghifari Zuhir | feat(platform): redesign date picker & time picker with Radix UI (#84)
c9126ff | 2026-03-24 06:31:40 +0700 | Ghifari              | chore(landing): update WhatsApp contact number
```

### Analysis
- **Total commits (2026-03-24 only):** 16 commits
- **Fix commits:**
  - `4384b5b` fix(platform): replace crypto.randomUUID with safe fallback in onboarding
  - `1ee7ad1` fix(platform): match Daftar button style to Masuk button on welcome page
  - `e222330` fix(platform): improve readability on welcome and login pages
  - `261b28e` fix(platform): lock password step after completion in onboarding wizard
  - `ed8b33c` fix: institution form validation mismatches
  - `8440950` fix(platform): remove stale 4-mode billing section from SuperAdmin InstitutionForm
  - `90f860d` fix(platform): select dropdown clipped when scrolling inside modal
  - `de54492` fix: sync plan pricing with landing page
  - `d1dd58c` fix(backend): fix onboarding billing-mode endpoint validation
  - `d1dfc15` fix(backend): add separate backfill migration for billing_mode
- **Feature additions:**
  - `62646a9` feat(platform): redesign register and onboarding pages with teal branding (#91)
  - `ae888bd` feat(platform): unify subdomain pages with Sinaloka teal branding (#90)
  - `8394ec6` feat(platform): redesign login page with branded split-screen layout (#89)
  - `7f3b68b` feat(platform): refactor onboarding to 4-step wizard (#87)
  - `4898b5b` feat: simplify student billing to 2 modes with onboarding wizard (#85)
  - `cbd886b` feat(platform): redesign date picker & time picker with Radix UI (#84)
- **Anomalies:** High-velocity development day — 16 commits spanning 06:31 to 23:04 WIB
  (16.5-hour window). Two backend fix commits (`d1dd58c`, `d1dfc15`) involving a billing_mode
  migration backfill suggest a data migration was applied to production. Commit clustering
  after 20:00 WIB (7 commits in ~2.5 hours) indicates rapid iteration, likely fixing issues
  found in QA after the day's major feature merge.

---

## 5. Findings & Hypothesis

### Finding A — Billing Mode Migration Applied to Production
**Severity:** 🟡 Medium
**Evidence:**
```
d1dfc15 | 2026-03-24 10:40:30 +0700 | fix(backend): add separate backfill migration for billing_mode
d1dd58c | 2026-03-24 10:54:07 +0700 | fix(backend): fix onboarding billing-mode endpoint validation
```
**Hypothesis:** The billing simplification feature (#85, merged at 10:18 WIB) required a
backfill migration to update existing institution records with the new `billing_mode` field.
The follow-up fix at 10:54 WIB suggests the endpoint validation was also incorrect and
needed a quick patch. This is a medium-severity finding because data migrations carry risk
of partial failure if the deploy window is short. No rollback commits were observed, suggesting
the migration completed successfully.

### Finding B — crypto.randomUUID Compatibility Issue Patched
**Severity:** 🟢 Low
**Evidence:**
```
4384b5b | 2026-03-24 23:04:17 +0700 | fix(platform): replace crypto.randomUUID with safe fallback in onboarding
```
**Hypothesis:** `crypto.randomUUID` is not available in all browser/HTTPS contexts (e.g., HTTP
environments or older browsers). This was caught in testing and patched same-day. Low severity
because it only affects the onboarding wizard UI, not the backend or data integrity.

### Finding C — Rapid Onboarding Wizard Iteration (Evening Spike)
**Severity:** 🟢 Low
**Evidence:**
```
7f3b68b | 2026-03-24 20:41:38 +0700 | feat(platform): refactor onboarding to 4-step wizard (#87)
261b28e | 2026-03-24 20:59:44 +0700 | fix(platform): lock password step after completion
ae888bd | 2026-03-24 22:01:37 +0700 | feat(platform): unify subdomain pages with teal branding (#90)
8394ec6 | 2026-03-24 21:37:03 +0700 | feat(platform): redesign login page with branded split-screen layout (#89)
62646a9 | 2026-03-24 22:54:02 +0700 | feat(platform): redesign register and onboarding pages (#91)
4384b5b | 2026-03-24 23:04:17 +0700 | fix(platform): replace crypto.randomUUID with safe fallback
```
**Hypothesis:** A large UX overhaul of the onboarding and authentication flow was delivered
in one evening. The tight commit cadence (6 merges in ~2.5 hours) suggests rapid QA and
fix cycles. This is low severity for system health — all changes are frontend-only and the
fix commit immediately followed feature commits, indicating good discipline. However, the
rapid pace increases the chance of subtle regressions being deployed before full testing.

---

## 6. Recommendations

| Priority | Action | Reason |
|----------|--------|--------|
| High | Configure monitoring agent with an egress-allowed endpoint or Railway MCP connector | Current agent cannot reach `api.sinaloka.com` — uptime reports will always be UNKNOWN without this fix |
| Medium | Add a post-migration smoke test to CI for billing_mode changes | Two consecutive fix commits after a billing migration (#85 → `d1dfc15` → `d1dd58c`) suggest the migration wasn't fully validated before deploy |
| Medium | Consider a feature freeze window after large UX refactors | 6 frontend merges in 2.5 hours increases regression risk; a short stabilization period before next deploy would reduce risk |
| Low | Add `crypto.randomUUID` polyfill or safe fallback as a shared utility | Prevent similar browser-compat issues in future features |

---

## 7. Monitoring Limitations
- **API uptime check:** Not available — sandbox egress proxy blocks `api.sinaloka.com` (403 `host_not_allowed` from Envoy). All health checks returned `HTTP=000`.
- **Railway runtime logs:** Not available (no Railway MCP connector)
- **Database query metrics:** Not available
- **Memory/CPU metrics:** Not available
- **Response time history:** Not available

*Note: To enable full uptime monitoring, either (1) add `api.sinaloka.com` to the sandbox egress allowlist, or (2) connect Railway MCP at claude.ai/settings/connectors to enable log and metric analysis.*
