---
phase: 1
slug: academic-settings
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.x (backend), tsc --noEmit (frontend) |
| **Config file** | `sinaloka-backend/jest.config.ts`, `sinaloka-platform/tsconfig.json` |
| **Quick run command** | `cd sinaloka-backend && npm run test -- --testPathPattern=settings` |
| **Full suite command** | `cd sinaloka-backend && npm run test && cd ../sinaloka-platform && npm run lint` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd sinaloka-backend && npm run test -- --testPathPattern=settings`
- **After every plan wave:** Run `cd sinaloka-backend && npm run test && cd ../sinaloka-platform && npm run lint`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | ACAD-06 | unit | `npm run test -- --testPathPattern=settings` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | ACAD-01 | type-check | `cd sinaloka-platform && npm run lint` | ✅ | ⬜ pending |
| TBD | TBD | TBD | ACAD-05 | type-check | `cd sinaloka-platform && npm run lint` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `sinaloka-backend/src/modules/settings/settings.service.spec.ts` — extend with academic settings test stubs (getAcademic, updateAcademic)
- [ ] Existing Jest infrastructure covers all backend requirements

*Existing test infrastructure covers all phase requirements — no new framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Room dropdown in Class form | ACAD-05 | UI interaction — requires browser | Open Class form, verify room field is Select not Input, verify only Available rooms shown |
| Academic tab persistence | ACAD-01-04 | Full round-trip | Create room in Settings, refresh page, verify room persists |
| Online room unlimited capacity | ACAD-01 | UI logic | Select Online type, verify capacity field is hidden or shows unlimited |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
