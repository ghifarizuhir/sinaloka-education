# Parent In-App Payment Notifications

## Context

WhatsApp reminders via Fonnte (unofficial gateway) are unreliable — device disconnects, no SLA, risk of number ban. Instead of migrating to another WhatsApp provider, we shift to in-app notifications in the parent app. The backend already has a full notification system (model, service, SSE gateway, event listeners) built for the admin platform. We extend it to support parents.

## Approach

Extend the existing notification system to support PARENT role. Minimal new code — reuse Notification model, service, and SSE gateway.

## Backend Changes

### Notification Controller — open access to PARENT role

Current state: all endpoints restricted to `ADMIN` and `SUPER_ADMIN`.

Changes:
- `GET /api/notifications` — add `PARENT` role. For parents, filter strictly by `user_id = currentUser.id` (parents only see their own notifications).
- `GET /api/notifications/unread-count` — add `PARENT` role.
- `PATCH /api/notifications/:id/read` — add `PARENT` role, validate notification ownership (user_id matches current user).
- `PATCH /api/notifications/read-all` — add `PARENT` role.
- SSE stream (`GET /api/notifications/stream`) — add `PARENT` role in JWT validation. Not used by parent app MVP but kept accessible for future use.

### Payment Notification Cron

New cron job replacing WhatsApp payment reminders:
- Schedule: daily at 09:00 WIB (02:00 UTC) — `@Cron('0 2 * * *')`
- Query: payments where `(status = PENDING AND due_date <= remindDate) OR (status = OVERDUE)`, scoped to institutions with `settings.whatsapp_auto_reminders !== false` (reuse same setting)
- For each payment:
  - Lookup parent user via Prisma chain: `payment.student` → `parent_students` → `parent` → `user_id`. A student can have multiple parents — send notification to ALL linked parents.
  - Skip if student has no parent link or parent has no user account (not yet registered)
  - Dedup: check for existing notification with `type = 'payment.reminder'` and `data.paymentId = paymentId` in last 24h per parent user
  - Create `Notification` record: `user_id` = parent's user ID, `type` = `payment.reminder`, `data` = `{ paymentId, studentId, studentName, amount, dueDate, status }`
  - Push via `pushToUser()` (not `pushToInstitution()`)
- Add `PAYMENT_REMINDER: 'payment.reminder'` to `NOTIFICATION_EVENTS` constant
- Notification text in Bahasa Indonesia: title = "Pengingat Pembayaran", body = "Pembayaran untuk {studentName} sebesar Rp {amount} jatuh tempo {dueDate}"
- Cron lives in notification module: `notification/payment-reminder.cron.ts`
- Log summary: `sent, skipped (no parent), skipped (dedup), failed`

### WhatsApp Module — disable cron, hide from platform

- Remove `@Cron` decorator from `WhatsappCron.sendPaymentReminders()` (keep the method for potential manual use)
- Hide WhatsApp menu/page in platform frontend
- Keep module code intact for potential future migration to official WhatsApp provider

### Notification Service — role-aware filtering

Current `findAll()` uses `OR: [{ user_id: null }, { user_id: userId }]` which returns broadcast notifications (user_id = null). Broadcast notifications are admin-targeted (e.g., "New Student registered") and must NOT leak to parents.

Changes:
- `findAll()` — when role is PARENT, filter strictly `user_id = userId` (no null/broadcast). When role is ADMIN/SUPER_ADMIN, keep existing behavior.
- `getUnreadCount()` — same role-aware filtering.
- `markAsRead()` — add ownership validation: verify `notification.user_id === currentUser.id` for PARENT role.

### Notification Gateway — add user-targeted push

Current `pushToInstitution()` broadcasts to all SSE clients in an institution. This would push parent-specific payment reminders to admin streams.

Changes:
- Add `pushToUser(institutionId: string, userId: string, notification)` method — sends only to SSE clients matching the specific user ID. The gateway already stores `userId` per client.
- Payment notification cron uses `pushToUser()` instead of `pushToInstitution()`.

## Parent App Frontend

### Bottom Nav — add Notifications tab

BottomNav changes from 3 tabs to 4:
- Home | **Notif** | Anak | Profil
- Bell icon (Lucide `Bell`) with red badge count for unread notifications
- `activeTab` in App.tsx adds `'notifications'` state

### Notification Page

Full-page notification list (not a dropdown):
- List sorted by `created_at` desc
- Each item: icon, title, body, relative time ("2 jam lalu")
- Unread items have visual indicator (different background or dot)
- Tap item → mark as read + navigate to child detail page (Bayar tab). Notification `data` includes `studentId` for navigation. `ChildDetailPage` accepts an optional initial tab prop.
- "Tandai semua dibaca" button at top
- Empty state when no notifications exist

### Unread Count — polling

No SSE for MVP. Simple polling:
- Poll `GET /api/notifications/unread-count` every 60 seconds
- Update badge count in bottom nav
- Refresh count when opening notification page

Rationale: parent app usage pattern is check-and-go, not real-time dashboard. 60s polling is responsive enough and simpler to implement.

## Error Handling & Edge Cases

### Cron edge cases
- Parent not registered yet (student exists but parent hasn't accepted invite) → skip, no notification created
- Student without parent link → skip
- Dedup: check for `payment.reminder` notification for same payment ID within last 24h, skip if exists

### Notification ownership
- Parents can only read/mark notifications where `user_id` matches their own user ID
- Validation at service layer, not just query filter

### Frontend resilience
- Polling failure (network error) → silent retry at next interval, no error shown to user
- Notification list fetch failure → show retry button

## Testing

### Backend
- Unit test payment notification cron: pending/overdue creates notification, skip when parent not registered, 24h dedup
- Unit test notification controller: PARENT role access works, ownership validation rejects other users' notifications
- Existing admin notification tests remain passing

### Frontend
- Build check (`npm run lint && npm run build`) for parent app

## Out of Scope

- SSE/real-time in parent app (future enhancement)
- Other notification types (session, attendance) — payment reminder only for now
- Push notifications (browser push / FCM)
- WhatsApp module removal — module stays, only cron disabled
