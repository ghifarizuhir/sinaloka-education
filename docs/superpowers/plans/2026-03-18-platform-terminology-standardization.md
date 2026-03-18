# Platform Terminology Standardization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate inconsistent wording across the sinaloka-platform UI by standardizing entity names, action verbs, toast messages, empty states, subtitles, and untranslated enum values.

**Architecture:** All display text lives in i18n JSON files (`en.json`, `id.json`). Changes are primarily value updates in those files, plus minor JSX fixes in WhatsApp.tsx and 5 pages needing empty state hint rendering upgrades.

**Tech Stack:** React, i18next, TypeScript, TailwindCSS

**Spec:** `docs/superpowers/specs/2026-03-18-platform-terminology-standardization-design.md`

---

## File Structure

| File | Responsibility |
|---|---|
| `src/locales/en.json` | English translations — bulk of changes (~71 key operations) |
| `src/locales/id.json` | Indonesian translations — mirror all en.json changes |
| `src/pages/WhatsApp.tsx` | Fix hardcoded header + untranslated enum values |
| `src/pages/Schedules.tsx` | Upgrade empty state to include hint text |
| `src/pages/Enrollments.tsx` | Upgrade empty state to include hint text |
| `src/pages/Finance/StudentPayments.tsx` | Upgrade empty state to include hint text |
| `src/pages/Finance/TutorPayouts.tsx` | Upgrade empty state to include hint text |
| `src/pages/Finance/OperatingExpenses.tsx` | Upgrade empty state to include hint text |

---

### Task 1: Entity Name Fixes in en.json

**Files:**
- Modify: `src/locales/en.json`

- [ ] **Step 1: Fix "Course" → "Class" entity name**

Change these values in `en.json`:
```
"activeCourses": "Active Courses"  →  "activeCourses": "Active Classes"
```
In `classes.subtitle`:
```
"Manage your course catalog and enrollment."  →  "Manage your class catalog and enrollment."
```
In `enrollments.subtitle`:
```
"Manage student course lifecycle and financial status."  →  "Manage student enrollment lifecycle and financial status."
```

- [ ] **Step 2: Fix "Teacher" → "Tutor"**

In `settings.integrations.googleCalendarDesc`:
```
"Sync teacher schedules"  →  "Sync tutor schedules"
```

- [ ] **Step 3: Fix "Operating Costs" → "Operating Expenses"**

In `finance.operatingCostsOverhead`:
```
"- Operating Costs (Overhead)"  →  "- Operating Expenses (Overhead)"
```

- [ ] **Step 4: Remove dead key `common.allStatus`**

Delete this line from the `common` section:
```
"allStatus": "All Status",
```

- [ ] **Step 5: Verify changes**

Run: `cd sinaloka-platform && npm run lint`
Expected: PASS (no type errors — these are just JSON value changes)

- [ ] **Step 6: Commit**

```bash
git add src/locales/en.json
git commit -m "fix(i18n): standardize entity names in en.json (Course→Class, Teacher→Tutor, Costs→Expenses)"
```

---

### Task 2: Entity Name Fixes in id.json

**Files:**
- Modify: `src/locales/id.json`

- [ ] **Step 1: Fix "Course" → "Class" equivalent in Indonesian**

Change these values in `id.json`:
```
"activeCourses": "Kursus Aktif"  →  "activeCourses": "Kelas Aktif"
```
In `classes.subtitle` — update to match the class-based wording (check current Indonesian value and replace "kursus" with "kelas" if present).

In `enrollments.subtitle` — update to match enrollment-based wording.

- [ ] **Step 2: Fix "Teacher" → "Tutor" equivalent**

In `settings.integrations.googleCalendarDesc` — replace "guru" with "tutor" if applicable.

- [ ] **Step 3: Fix "Operating Costs" → "Operating Expenses" equivalent**

In `finance.operatingCostsOverhead` — replace "Biaya" wording to match the nav term "Biaya Operasional".

- [ ] **Step 4: Remove dead key `common.allStatus`**

Delete:
```
"allStatus": "Semua Status",
```

- [ ] **Step 5: Commit**

```bash
git add src/locales/id.json
git commit -m "fix(i18n): standardize entity names in id.json (mirror en.json changes)"
```

---

### Task 3: Action Verb Standardization in en.json

**Files:**
- Modify: `src/locales/en.json`

- [ ] **Step 1: Standardize Students action verbs**

```
"addTitle": "Register New Student"  →  "addTitle": "Add Student"
"createStudent": "Create Student"  →  "createStudent": "Add Student"
"updateStudent": "Update Student"  →  "updateStudent": "Save Changes"
```

- [ ] **Step 2: Standardize Classes action verbs**

```
"registerNewClass": "Register New Class"  →  "registerNewClass": "Add Class"
"createTitle": "Register New Class"  →  "createTitle": "Add Class"
"createClass": "Create Class"  →  "createClass": "Add Class"
"updateClass": "Update Class"  →  "updateClass": "Save Changes"
```

- [ ] **Step 3: Standardize Enrollments action verbs**

```
"newEnrollment": "New Enrollment"  →  "newEnrollment": "Add Enrollment"
"newTitle": "New Student Enrollment"  →  "newTitle": "Add Enrollment"
```

- [ ] **Step 4: Standardize Payouts action verbs**

```
"newPayout": "New Payout"  →  "newPayout": "Add Payout"
"createTitle": "Create Payout"  →  "createTitle": "Add Payout"
"createPayout": "Create Payout"  →  "createPayout": "Add Payout"
```

- [ ] **Step 5: Standardize Expenses action verbs**

```
"createTitle": "Record New Expense"  →  "createTitle": "Record Expense"
"saveExpense": "Save Expense"  →  "saveExpense": "Record Expense"
"updateExpense": "Update Expense"  →  "updateExpense": "Save Changes"
```

- [ ] **Step 6: Standardize SuperAdmin action verbs**

```
"createInstitution": "Create Institution"  →  "createInstitution": "Add Institution"
"createAdmin": "Create Admin"  →  "createAdmin": "Add Admin"
```
In `superAdmin.createAdminModal`:
```
"title": "Create Admin"  →  "title": "Add Admin"
```

- [ ] **Step 7: Commit**

```bash
git add src/locales/en.json
git commit -m "fix(i18n): standardize action verbs in en.json (Add/Record/Save Changes)"
```

---

### Task 4: Action Verb Standardization in id.json

**Files:**
- Modify: `src/locales/id.json`

- [ ] **Step 1: Mirror all action verb changes from Task 3**

Apply the Indonesian equivalents:
- "Register New Student" / "Create Student" → "Tambah Siswa" (Add Student)
- "Update Student" → "Simpan Perubahan" (Save Changes)
- "Register New Class" / "Create Class" → "Tambah Kelas" (Add Class)
- "Update Class" → "Simpan Perubahan"
- "New Enrollment" / "New Student Enrollment" → "Tambah Pendaftaran" (Add Enrollment)
- "New Payout" / "Create Payout" → "Tambah Pembayaran" (Add Payout)
- "Record New Expense" / "Save Expense" → "Catat Pengeluaran" (Record Expense)
- "Update Expense" → "Simpan Perubahan"
- "Create Institution" → "Tambah Institusi"
- "Create Admin" → "Tambah Admin"

> Check each current id.json value before changing — the Indonesian translations may use different phrasing. Match the pattern, not literal word-for-word.

- [ ] **Step 2: Commit**

```bash
git add src/locales/id.json
git commit -m "fix(i18n): standardize action verbs in id.json (mirror en.json)"
```

---

### Task 5: Toast Message Format Standardization in en.json

**Files:**
- Modify: `src/locales/en.json`

- [ ] **Step 1: Remove "successfully" from all toast messages**

Apply these changes (remove "successfully" and any trailing periods):

```
"updated": "Tutor updated successfully"  →  "updated": "Tutor updated"
"inviteSent": "Invitation sent successfully"  →  "inviteSent": "Invitation sent"
"created": "Class created successfully"  →  "created": "Class created"
"updated": "Class updated successfully"  →  "updated": "Class updated"
"recorded": "Payment recorded successfully."  →  "recorded": "Payment recorded"
"deleted": "Payment deleted."  →  "deleted": "Payment deleted"
"confirmed": "Payout confirmed for {{tutor}}."  →  "confirmed": "Payout confirmed for {{tutor}}"
"created": "Payout created successfully."  →  "created": "Payout created"
"deleted": "Payout deleted."  →  "deleted": "Payout deleted"
"created": "Expense recorded."  →  "created": "Expense recorded"
"updated": "Expense updated."  →  "updated": "Expense updated"
"deleted": "Expense deleted."  →  "deleted": "Expense deleted"
"created": "Institution created successfully"  →  "created": "Institution created"
"updated": "Institution updated successfully"  →  "updated": "Institution updated"
"adminCreated": "Admin created successfully"  →  "adminCreated": "Admin created"
"userUpdated": "User updated successfully"  →  "userUpdated": "User updated"
"saveSuccess": "Settings saved successfully"  →  "saveSuccess": "Settings saved"
"saveSuccess": "Billing settings saved successfully"  →  "saveSuccess": "Billing settings saved"
"importSuccess": "Students imported successfully"  →  "importSuccess": "Students imported"
"sessionsGenerated": "Sessions generated successfully"  →  "sessionsGenerated": "Sessions generated"
"generateSuccess": "{{count}} sessions generated successfully"  →  "generateSuccess": "{{count}} sessions generated"
"enrolled": "{{count}} student(s) enrolled successfully"  →  "enrolled": "{{count}} student(s) enrolled"
"importSuccess": "Successfully imported {{count}} enrollment(s)"  →  "importSuccess": "{{count}} enrollment(s) imported"
"exportSuccess": "Enrollments exported successfully"  →  "exportSuccess": "Enrollments exported"
"invoiceGenerated": "Invoice generated successfully"  →  "invoiceGenerated": "Invoice generated"
"exportedSuccess": "{{name}} exported successfully to CSV."  →  "exportedSuccess": "{{name}} exported to CSV"
```

- [ ] **Step 2: Commit**

```bash
git add src/locales/en.json
git commit -m "fix(i18n): standardize toast message format in en.json (no periods, no 'successfully')"
```

---

### Task 6: Toast Message Format Standardization in id.json

**Files:**
- Modify: `src/locales/id.json`

- [ ] **Step 1: Mirror toast changes — remove trailing periods and "berhasil" (successfully) where it creates inconsistency**

Apply the same pattern: short past-tense messages, no periods.

> Check each current id.json toast value. Remove trailing periods. For "berhasil" (successfully), remove it to match the terse format. E.g.:
> - "Tutor berhasil diperbarui" → "Tutor diperbarui"
> - "Kelas berhasil dibuat" → "Kelas dibuat"
> - "Pembayaran berhasil dicatat." → "Pembayaran dicatat"

- [ ] **Step 2: Commit**

```bash
git add src/locales/id.json
git commit -m "fix(i18n): standardize toast message format in id.json (mirror en.json)"
```

---

### Task 7: Empty State & Subtitle Standardization in en.json

**Files:**
- Modify: `src/locales/en.json`

- [ ] **Step 1: Remove trailing periods from empty state messages**

```
"noSessionsFound": "No sessions found."  →  "noSessionsFound": "No sessions found"
"noEnrollmentsFound": "No enrollments found."  →  "noEnrollmentsFound": "No enrollments found"
"noPaymentsFound": "No payments found."  →  "noPaymentsFound": "No payments found"
"noPayoutsFound": "No payouts found."  →  "noPayoutsFound": "No payouts found"
"noExpensesFound": "No expenses found."  →  "noExpensesFound": "No expenses found"
```

- [ ] **Step 2: Add missing hint keys**

Add after each `noXFound` key in its respective section:

In `schedules`:
```json
"noSessionsHint": "Try adjusting your search or filters to find what you're looking for."
```

In `enrollments`:
```json
"noEnrollmentsHint": "Try adjusting your search or filters to find what you're looking for."
```

In `payments`:
```json
"noPaymentsHint": "Try adjusting your search or filters to find what you're looking for."
```

In `payouts`:
```json
"noPayoutsHint": "Try adjusting your search or filters to find what you're looking for."
```

In `expenses`:
```json
"noExpensesHint": "Try adjusting your search or filters to find what you're looking for."
```

- [ ] **Step 3: Fix delete confirmation**

In `payouts.confirm`:
```
"deletePayout": "Delete this payout?"  →  "deletePayout": "Are you sure you want to delete this payout?"
```

- [ ] **Step 4: Standardize subtitles**

```
"subtitle": "Automated tracking, parent notifications, and session reporting."
→  "subtitle": "Manage attendance tracking, notifications, and session reporting."
```

```
"subtitle": "Actionable insights into your school's financial health."
→  "subtitle": "Monitor your institution's financial health and insights."
```

```
"subtitle": "Automated billing and revenue recovery system."
→  "subtitle": "Manage student billing and payment records."
```

```
"subtitle": "Verification-first model for tutor earnings and audit trails."
→  "subtitle": "Manage tutor payout records and audit trails."
```

```
"subtitle": "Track and manage non-tutor operational costs."
→  "subtitle": "Manage non-tutor operational expenses."
```

- [ ] **Step 5: Commit**

```bash
git add src/locales/en.json
git commit -m "fix(i18n): standardize empty states, subtitles, and delete confirmations in en.json"
```

---

### Task 8: Empty State & Subtitle Standardization in id.json

**Files:**
- Modify: `src/locales/id.json`

- [ ] **Step 1: Remove trailing periods from empty states**

Mirror the 5 period removals from Task 7.

- [ ] **Step 2: Add missing hint keys in Indonesian**

```json
"noSessionsHint": "Coba sesuaikan pencarian atau filter untuk menemukan yang Anda cari."
"noEnrollmentsHint": "Coba sesuaikan pencarian atau filter untuk menemukan yang Anda cari."
"noPaymentsHint": "Coba sesuaikan pencarian atau filter untuk menemukan yang Anda cari."
"noPayoutsHint": "Coba sesuaikan pencarian atau filter untuk menemukan yang Anda cari."
"noExpensesHint": "Coba sesuaikan pencarian atau filter untuk menemukan yang Anda cari."
```

> Check existing Indonesian hint text in `students.noStudentsHint` or `tutors.noTutorsHint` for the exact phrasing used, then match it.

- [ ] **Step 3: Fix delete confirmation and subtitles**

Mirror the delete confirmation and subtitle changes from Task 7 in Indonesian.

- [ ] **Step 4: Commit**

```bash
git add src/locales/id.json
git commit -m "fix(i18n): standardize empty states, subtitles, and delete confirmations in id.json"
```

---

### Task 9: Upgrade Empty State Rendering in 5 Pages

**Files:**
- Modify: `src/pages/Schedules.tsx` (line ~300-303)
- Modify: `src/pages/Enrollments.tsx` (line ~384-387)
- Modify: `src/pages/Finance/StudentPayments.tsx` (line ~236-241)
- Modify: `src/pages/Finance/TutorPayouts.tsx` (line ~517-522)
- Modify: `src/pages/Finance/OperatingExpenses.tsx` (line ~314-319)

All 5 pages currently use the simple pattern:
```jsx
<tr>
  <td colSpan={N} className="px-6 py-12 text-center text-zinc-400 text-sm">
    {t('module.noXFound')}
  </td>
</tr>
```

Upgrade each to match the existing pattern from Classes.tsx (icon + heading + hint):
```jsx
<tr>
  <td colSpan={N} className="px-6 py-20 text-center">
    <div className="flex flex-col items-center justify-center">
      <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-4">
        <Search size={32} className="text-zinc-300" />
      </div>
      <h3 className="text-lg font-bold mb-1">{t('module.noXFound')}</h3>
      <p className="text-zinc-500 text-sm mb-6">{t('module.noXHint')}</p>
    </div>
  </td>
</tr>
```

- [ ] **Step 1: Check Search icon import in each file**

Each file must import `Search` from `lucide-react`. Check if it's already imported — add it if missing.

- [ ] **Step 2: Upgrade Schedules.tsx empty state**

Replace the simple `<td>` at line ~300-303 with the card pattern. Use `colSpan={5}` and keys `schedules.noSessionsFound` + `schedules.noSessionsHint`.

- [ ] **Step 3: Upgrade Enrollments.tsx empty state**

Replace at line ~384-387. Use `colSpan={7}` and keys `enrollments.noEnrollmentsFound` + `enrollments.noEnrollmentsHint`.

- [ ] **Step 4: Upgrade StudentPayments.tsx empty state**

Replace at line ~236-241. Use `colSpan={7}` and keys `payments.noPaymentsFound` + `payments.noPaymentsHint`.

- [ ] **Step 5: Upgrade TutorPayouts.tsx empty state**

Replace at line ~517-522. Use `colSpan={5}` and keys `payouts.noPayoutsFound` + `payouts.noPayoutsHint`.

- [ ] **Step 6: Upgrade OperatingExpenses.tsx empty state**

Replace at line ~314-319. Use `colSpan={5}` and keys `expenses.noExpensesFound` + `expenses.noExpensesHint`.

- [ ] **Step 7: Verify build**

Run: `cd sinaloka-platform && npm run lint`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/pages/Schedules.tsx src/pages/Enrollments.tsx src/pages/Finance/StudentPayments.tsx src/pages/Finance/TutorPayouts.tsx src/pages/Finance/OperatingExpenses.tsx
git commit -m "fix(platform): upgrade empty state rendering with hint text in 5 pages"
```

---

### Task 10: Fix WhatsApp.tsx Untranslated Enum Values

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/id.json`
- Modify: `src/pages/WhatsApp.tsx`

- [ ] **Step 1: Add WhatsApp status and type keys to en.json**

Add inside the existing `whatsapp` section:

```json
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
```

- [ ] **Step 2: Add WhatsApp status and type keys to id.json**

```json
"status": {
  "pending": "Menunggu",
  "sent": "Terkirim",
  "delivered": "Diterima",
  "read": "Dibaca",
  "failed": "Gagal"
},
"type": {
  "payment": "Pembayaran",
  "attendance": "Kehadiran",
  "enrollment": "Pendaftaran"
}
```

- [ ] **Step 3: Fix hardcoded header in WhatsApp.tsx**

Replace (line ~110):
```jsx
<h2 className="text-2xl font-bold tracking-tight">WhatsApp</h2>
```
With:
```jsx
<h2 className="text-2xl font-bold tracking-tight">{t('layout.pageTitle.whatsapp')}</h2>
```

- [ ] **Step 4: Fix status filter options**

Replace hardcoded status `<option>` elements (lines ~175-180):
```jsx
<option value="PENDING">PENDING</option>
<option value="SENT">SENT</option>
<option value="DELIVERED">DELIVERED</option>
<option value="READ">READ</option>
<option value="FAILED">FAILED</option>
```
With:
```jsx
<option value="PENDING">{t('whatsapp.status.pending')}</option>
<option value="SENT">{t('whatsapp.status.sent')}</option>
<option value="DELIVERED">{t('whatsapp.status.delivered')}</option>
<option value="READ">{t('whatsapp.status.read')}</option>
<option value="FAILED">{t('whatsapp.status.failed')}</option>
```

- [ ] **Step 5: Fix type filter options**

Replace hardcoded type `<option>` elements (lines ~204-206):
```jsx
<option value="payment">Payment</option>
<option value="attendance">Attendance</option>
<option value="enrollment">Enrollment</option>
```
With:
```jsx
<option value="payment">{t('whatsapp.type.payment')}</option>
<option value="attendance">{t('whatsapp.type.attendance')}</option>
<option value="enrollment">{t('whatsapp.type.enrollment')}</option>
```

- [ ] **Step 6: Fix status badge rendering**

Replace raw `{msg.status}` in badge (line ~258) with a helper or inline map:
```jsx
<Badge variant={badge.variant} className={badge.className}>
  {t(`whatsapp.status.${msg.status.toLowerCase()}`)}
</Badge>
```

- [ ] **Step 7: Fix related_type table cell rendering**

Replace raw `{msg.related_type}` with:
```jsx
{t(`whatsapp.type.${msg.related_type}`)}
```

- [ ] **Step 7b: Fix drawer-level enum displays**

The message detail drawer also shows raw enum values:

At line ~348, replace `{selectedMessage.status}` badge text with:
```jsx
{t(`whatsapp.status.${selectedMessage.status.toLowerCase()}`)}
```

At line ~381, replace `{selectedMessage.related_type}` with:
```jsx
{t(`whatsapp.type.${selectedMessage.related_type}`)}
```

- [ ] **Step 8: Verify build**

Run: `cd sinaloka-platform && npm run lint`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/locales/en.json src/locales/id.json src/pages/WhatsApp.tsx
git commit -m "fix(whatsapp): replace hardcoded strings and enum values with i18n translations"
```

---

### Task 11: Final Verification

- [ ] **Step 1: Run full type check**

```bash
cd sinaloka-platform && npm run lint
```
Expected: PASS

- [ ] **Step 2: Run build**

```bash
cd sinaloka-platform && npm run build
```
Expected: PASS — no build errors

- [ ] **Step 3: Spot check in browser (manual)**

Start dev server and visually verify:
- Students page: "Add Student" button, modal title "Add Student", submit button "Add Student"
- Classes page: "Add Class" button, "Active Classes" stat card
- Finance Overview: "Operating Expenses (Overhead)" in formula
- Settings → Integrations: "Sync tutor schedules"
- WhatsApp page: translated status badges and filter dropdowns
- Any page empty state: shows icon + heading + hint text

- [ ] **Step 4: Check Indonesian translations**

Switch language to Indonesian (`sinaloka-lang` in localStorage) and verify the same pages show correct Indonesian text.
