# Platform Terminology Standardization Design

**Date**: 2026-03-18
**Scope**: sinaloka-platform — `en.json`, `id.json`, `WhatsApp.tsx`, and pages missing hint rendering
**Goal**: Eliminate inconsistent wording across the platform UI by establishing and applying terminology standards.

---

## Problem

The platform's i18n files contain inconsistent terminology across pages:

- **3 different creation verbs** (Add, Register, Create) for the same action
- **Entity name confusion** (Course vs Class, Teacher vs Tutor, Costs vs Expenses)
- **Toast format variance** (some with periods, some with "successfully", some with neither)
- **Empty state format variance** (some with periods, some without; some with hints, some without)
- **Delete confirmation patterns** range from ultra-short to multi-step type-to-confirm
- **Subtitle style** mixes imperative "Manage..." with marketing noun phrases
- **Hardcoded strings** in WhatsApp.tsx bypass i18n entirely
- **Duplicate key** `common.allStatus` vs `common.allStatuses`

---

## Terminology Glossary

| Canonical Term | Never Use (in this context) | Notes |
|---|---|---|
| Class | Course, Classroom | "Course" was used in classes.activeCourses and subtitles |
| Tutor | Teacher, Instructor | "Teacher" was used in settings.integrations |
| Operating Expenses | Operating Costs | "Costs" was used in finance formula section |
| Session | (already consistent) | Used in Schedules page |
| Payment | (keep "Invoice" only for the PDF document) | Don't call the payment record an "invoice" |
| Payout | (keep "Monthly Salary" only as fee mode label) | Don't call payouts "salary" generically |

---

## Action Verb Standard

| Action | Standard Verb | Pattern |
|---|---|---|
| Creating a new record | **"Add"** | "Add Student", "Add Class", "Add Enrollment" |
| Recording a financial entry | **"Record"** | "Record Payment", "Record Expense" |
| Modal title (new) | **"Add [Entity]"** | Same as button |
| Modal title (edit) | **"Edit [Entity]"** | "Edit Student", "Edit Class" |
| Modal submit (new) | **"Add [Entity]"** | Matches modal title |
| Modal submit (edit) | **"Save Changes"** | Uniform across all edit modals |

---

## Section 1: Entity Name & Verb Key Changes

### Entity name fixes

| Key | Current | Proposed |
|---|---|---|
| `classes.activeCourses` | "Active Courses" | "Active Classes" |
| `classes.subtitle` | "Manage your course catalog and enrollment." | "Manage your class catalog and enrollment." |
| `enrollments.subtitle` | "Manage student course lifecycle and financial status." | "Manage student enrollment lifecycle and financial status." |
| `settings.integrations.googleCalendarDesc` | "Sync teacher schedules" | "Sync tutor schedules" |
| `finance.operatingCostsOverhead` | "- Operating Costs (Overhead)" | "- Operating Expenses (Overhead)" |

### Action verb standardization

| Key | Current | Proposed |
|---|---|---|
| `students.modal.addTitle` | "Register New Student" | "Add Student" |
| `students.modal.createStudent` | "Create Student" | "Add Student" |
| `students.modal.updateStudent` | "Update Student" | "Save Changes" |
| `classes.registerNewClass` | "Register New Class" | "Add Class" |
| `classes.modal.createTitle` | "Register New Class" | "Add Class" |
| `classes.modal.createClass` | "Create Class" | "Add Class" |
| `classes.modal.updateClass` | "Update Class" | "Save Changes" |
| `enrollments.newEnrollment` | "New Enrollment" | "Add Enrollment" |
| `enrollments.modal.newTitle` | "New Student Enrollment" | "Add Enrollment" |
| `payouts.newPayout` | "New Payout" | "Add Payout" |
| `payouts.modal.createTitle` | "Create Payout" | "Add Payout" |
| `payouts.modal.createPayout` | "Create Payout" | "Add Payout" |
| `expenses.drawer.createTitle` | "Record New Expense" | "Record Expense" |
| `expenses.drawer.saveExpense` | "Save Expense" | "Record Expense" |
| `expenses.drawer.updateExpense` | "Update Expense" | "Save Changes" |

---

## Section 2: Toast Message Format Standard

**Format**: `"[Entity] [past tense verb]"` — no period, no "successfully".

| Key | Current | Proposed |
|---|---|---|
| `tutors.toast.updated` | "Tutor updated successfully" | "Tutor updated" |
| `tutors.toast.inviteSent` | "Invitation sent successfully" | "Invitation sent" |
| `classes.toast.created` | "Class created successfully" | "Class created" |
| `classes.toast.updated` | "Class updated successfully" | "Class updated" |
| `payments.toast.recorded` | "Payment recorded successfully." | "Payment recorded" |
| `payments.toast.deleted` | "Payment deleted." | "Payment deleted" |
| `payouts.toast.confirmed` | "Payout confirmed for {{tutor}}." | "Payout confirmed for {{tutor}}" |
| `payouts.toast.created` | "Payout created successfully." | "Payout created" |
| `payouts.toast.deleted` | "Payout deleted." | "Payout deleted" |
| `expenses.toast.created` | "Expense recorded." | "Expense recorded" |
| `expenses.toast.updated` | "Expense updated." | "Expense updated" |
| `expenses.toast.deleted` | "Expense deleted." | "Expense deleted" |
| `superAdmin.toast.created` | "Institution created successfully" | "Institution created" |
| `superAdmin.toast.updated` | "Institution updated successfully" | "Institution updated" |
| `superAdmin.toast.adminCreated` | "Admin created successfully" | "Admin created" |
| `superAdmin.toast.userUpdated` | "User updated successfully" | "User updated" |
| `settings.general.saveSuccess` | "Settings saved successfully" | "Settings saved" |
| `settings.billing.saveSuccess` | "Billing settings saved successfully" | "Billing settings saved" |

---

## Section 3: Empty State Format Standard

**Format**: `"No [entities] found"` — no period. All pages get hint text.

### Remove trailing periods

| Key | Current | Proposed |
|---|---|---|
| `schedules.noSessionsFound` | "No sessions found." | "No sessions found" |
| `enrollments.noEnrollmentsFound` | "No enrollments found." | "No enrollments found" |
| `payments.noPaymentsFound` | "No payments found." | "No payments found" |
| `payouts.noPayoutsFound` | "No payouts found." | "No payouts found" |
| `expenses.noExpensesFound` | "No expenses found." | "No expenses found" |

### Add missing hint keys

Standard hint: `"Try adjusting your search or filters to find what you're looking for."`

| Key | Status |
|---|---|
| `schedules.noSessionsHint` | **New** |
| `enrollments.noEnrollmentsHint` | **New** |
| `payments.noPaymentsHint` | **New** |
| `payouts.noPayoutsHint` | **New** |
| `expenses.noExpensesHint` | **New** |

> Implementation note: Check if page components render hint text. If not, add `{t('[module].no[Entity]Hint')}` rendering to those pages.

---

## Section 4: Delete Confirmation Standard

**Tier 1 — Cascade delete** (Students, Classes): Keep detailed pattern with type-to-confirm. Already consistent.

**Tier 2 — Simple delete**: `"Are you sure you want to delete this [entity]?"`

| Key | Current | Proposed |
|---|---|---|
| `payouts.confirm.deletePayout` | "Delete this payout?" | "Are you sure you want to delete this payout?" |

All others in Tier 2 already match the standard.

---

## Section 5: Subtitle Style Standard

**Format**: Imperative "Manage..." style, describing what the page does.

| Key | Current | Proposed |
|---|---|---|
| `attendance.subtitle` | "Automated tracking, parent notifications, and session reporting." | "Manage attendance tracking, notifications, and session reporting." |
| `finance.subtitle` | "Actionable insights into your school's financial health." | "Monitor your institution's financial health and insights." |
| `payments.subtitle` | "Automated billing and revenue recovery system." | "Manage student billing and payment records." |
| `payouts.subtitle` | "Verification-first model for tutor earnings and audit trails." | "Manage tutor payout records and audit trails." |
| `expenses.subtitle` | "Track and manage non-tutor operational costs." | "Manage operational expenses and cost tracking." |

---

## Section 6: WhatsApp.tsx Hardcoded Strings

### New i18n keys needed

```json
"whatsapp": {
  "title": "WhatsApp",
  "status": {
    "pending": "Pending",
    "sent": "Sent",
    "delivered": "Delivered",
    "read": "Read",
    "failed": "Failed"
  },
  "type": {
    "payment": "Payment",
    "attendance": "Attendance",
    "enrollment": "Enrollment"
  }
}
```

> Note: `whatsapp.title` key may already exist — verify before adding. The `status` and `type` sub-keys are new.

### Code changes in WhatsApp.tsx

1. Replace hardcoded `"WhatsApp"` header with `{t('layout.pageTitle.whatsapp')}`
2. Replace hardcoded status `<option>` values with translated `{t('whatsapp.status.*')}`
3. Replace hardcoded type `<option>` values with translated `{t('whatsapp.type.*')}`

---

## Section 7: Duplicate Key Cleanup

- **Remove**: `common.allStatus` ("All Status")
- **Keep**: `common.allStatuses` ("All Statuses")
- **Code change**: Find all `t('common.allStatus')` usages and replace with `t('common.allStatuses')`

---

## Files Changed

| File | Type of Change |
|---|---|
| `src/locales/en.json` | ~49 key value updates + 5 new hint keys + WhatsApp status/type keys |
| `src/locales/id.json` | Same changes, translated to Indonesian |
| `src/pages/WhatsApp.tsx` | Replace hardcoded strings with t() calls |
| `src/pages/Schedules.tsx` | Add hint text rendering (if missing) |
| `src/pages/Enrollments.tsx` | Add hint text rendering (if missing) |
| `src/pages/Finance/StudentPayments.tsx` | Add hint text rendering (if missing) |
| `src/pages/Finance/TutorPayouts.tsx` | Add hint text rendering (if missing) |
| `src/pages/Finance/OperatingExpenses.tsx` | Add hint text rendering (if missing) |
| Any file using `t('common.allStatus')` | Replace with `t('common.allStatuses')` |

---

## Out of Scope

- Search placeholder text (contextual per page — intentionally different)
- i18n key naming convention (camelCase vs snake_case) — separate refactor
- id.json structural changes beyond translating the same keys
- New features or UI changes beyond rendering hint text
