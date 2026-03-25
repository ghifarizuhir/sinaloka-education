# Remove Non-Functional UI Elements from sinaloka-tutors

**Date:** 2026-03-15
**Status:** Approved

## Overview

Remove all buttons, cards, and interactive elements that have no backend support or handler implementation. This cleans up the tutor app so every visible interactive element actually does something.

## Elements to Remove

### Dashboard
1. **Bell/notification button** + red dot badge — no notification system exists
2. **Entire "Quick Actions" section** — both child buttons ("Rating Siswa", "Sertifikasi") are dead

### ScheduleCard
3. **Edit button** (pencil icon next to subject name) — no session edit endpoint for tutors
4. **"Atur Ulang" (Reschedule) button** — no UI for collecting reschedule details; change action grid from 3-col to 2-col (Absen Murid + Cancel remain)

### Attendance View
5. **"Upload Lesson Notes" button** — no file upload endpoint for tutors
6. **MessageSquare button** per student card — no per-student note endpoint

### Proof Modal
7. **"Simpan Gambar" download button** — no download implementation. Keep the image display and close button.

### Profile Page
8. **Settings icon overlay** on avatar — decorative, not clickable
9. **"Metode Pembayaran" menu item** — no payment method page
10. **"Pengaturan Akun" menu item** — no account settings page

## Props and Code Cleanup

- Remove `onReschedule` and `onEdit` props from `ScheduleCard` component interface
- Remove `handleReschedule` and `handleEdit` handlers from `App.tsx`
- Remove unused icon imports (`Edit`, `RefreshCcw`, `Bell`, `Star`, `ShieldCheck`, `CreditCard`, `Settings`, `Download` where no longer used, `MessageSquare`)

## Elements That Stay (all functional)

- Login form, logout button
- Bottom navigation tabs
- Schedule filter tabs (Upcoming, Completed, Cancelled)
- ScheduleCard: Absen Murid button, Cancel button
- Attendance: P/A/L buttons, HW Done checkbox, Mark All Present, Topic input, Session Summary textarea, Finalize & Close
- Payouts: transaction cards, proof image modal (view only)
- Profile: tutor name, subject, rating, verified badge

## Files Modified

- `sinaloka-tutors/src/App.tsx` — remove dead elements, handlers, imports
- `sinaloka-tutors/src/components/ScheduleCard.tsx` — remove Edit button, Reschedule button, simplify props and grid
