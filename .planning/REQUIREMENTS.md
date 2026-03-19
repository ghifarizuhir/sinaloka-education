# Requirements: Sinaloka Platform — Full Integration & Polish

**Defined:** 2026-03-19
**Core Value:** Every feature visible in the admin UI must be functional — no mock data, no placeholder buttons, no disconnected settings.

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Academic Settings

- [x] **ACAD-01**: Admin can create, edit, and delete rooms in Settings Academic tab with backend persistence (including an "Online" room type option for virtual classes)
- [x] **ACAD-02**: Admin can manage subject categories in Settings Academic tab with backend persistence
- [x] **ACAD-03**: Admin can manage grade levels in Settings Academic tab with backend persistence
- [x] **ACAD-04**: Admin can configure working days (Mon-Sun toggles) in Settings Academic tab with backend persistence
- [ ] **ACAD-05**: Class creation/edit form shows room dropdown populated from institution's rooms in Settings (replacing free-text input)
- [x] **ACAD-06**: Backend API endpoints exist for academic settings CRUD (rooms, subject categories, grade levels, working days) stored in Institution.settings JSON blob

### Branding Settings

- [ ] **BRND-01**: Admin can set primary color in Settings Branding tab and it persists to backend across page refreshes

### Settings Cleanup

- [ ] **SETT-01**: Security tab is removed or replaced with a minimal "coming soon" placeholder (not fake toggles)
- [ ] **SETT-02**: Integrations tab shows real integration status — WhatsApp shows "connected" if credentials exist in institution settings, others show "not configured"
- [ ] **SETT-03**: "Delete Institution" button in General tab either works with confirmation dialog or is hidden for non-SUPER_ADMIN users

### Finance Features

- [ ] **FINA-01**: "Revenue Analytics" button on Student Payments page shows revenue analytics view (chart/summary of payment data)
- [ ] **FINA-02**: "Export PDF" button in payment ledger drawer generates and downloads a PDF statement
- [ ] **FINA-03**: "Resend Receipt" button in payment ledger drawer sends receipt notification to parent
- [ ] **FINA-04**: "Export" button on Operating Expenses page exports expenses to CSV
- [ ] **FINA-05**: "Filters" button on Operating Expenses page opens a filter panel (by category, date range, amount)

### Attendance Features

- [ ] **ATTN-01**: "View History" button on Attendance page navigates to or shows attendance history for the selected session/class

### Quality Polish

- [ ] **QUAL-01**: No placeholder buttons exist anywhere in the platform — every visible button either works or is properly disabled with explanation
- [ ] **QUAL-02**: No hardcoded mock data in any page or component — all data comes from backend API

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Security

- **SECU-01**: Admin can enable/disable 2FA for their institution
- **SECU-02**: Admin can configure password policies (minimum length, complexity, expiry)
- **SECU-03**: Admin can view active sessions and force-logout users

### Branding Extended

- **BRND-02**: Custom domain configuration for institution portal
- **BRND-03**: Institution logo upload and display in sidebar/header

### Integrations

- **INTG-01**: Midtrans payment gateway integration
- **INTG-02**: Google Calendar sync for session scheduling
- **INTG-03**: Resend email provider configuration and status

## Out of Scope

| Feature | Reason |
|---------|--------|
| Tutor app changes | Separate project — focus is admin platform only |
| Parent app changes | Separate project — focus is admin platform only |
| New pages or major features | Focus is completing/fixing existing UI |
| Mobile responsiveness | Platform is a desktop admin dashboard |
| Custom Domain (Branding) | Intentionally marked as "Pro Feature" |
| Backend architecture refactoring | Only add endpoints needed for Settings |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ACAD-01 | Phase 1 | Complete |
| ACAD-02 | Phase 1 | Complete |
| ACAD-03 | Phase 1 | Complete |
| ACAD-04 | Phase 1 | Complete |
| ACAD-05 | Phase 1 | Pending |
| ACAD-06 | Phase 1 | Complete |
| BRND-01 | Phase 2 | Pending |
| SETT-01 | Phase 2 | Pending |
| SETT-02 | Phase 2 | Pending |
| SETT-03 | Phase 2 | Pending |
| FINA-01 | Phase 3 | Pending |
| FINA-02 | Phase 3 | Pending |
| FINA-03 | Phase 3 | Pending |
| FINA-04 | Phase 3 | Pending |
| FINA-05 | Phase 3 | Pending |
| ATTN-01 | Phase 3 | Pending |
| QUAL-01 | Phase 4 | Pending |
| QUAL-02 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-19 — traceability filled after roadmap creation*
