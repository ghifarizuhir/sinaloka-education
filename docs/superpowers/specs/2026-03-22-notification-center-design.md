# Notification Center (In-App) — Design Spec

> Sprint 7 | Platform only | 2026-03-22

## Overview

In-app notification center untuk sinaloka-platform (admin dashboard). Notifications di-push real-time via SSE, disimpan di database, dengan unread count badge dan dropdown panel dari bell icon. Full page `/notifications` untuk history dan filtering.

## Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Scope | Platform only | Bell placeholder sudah ada, extend ke app lain di sprint berikutnya |
| Real-time | SSE (Server-Sent Events) | One-way server→client cukup, NestJS native `@Sse()`, no extra deps |
| Notification types | Essential + operational | Payment, registration, session, attendance, tutor invite |
| Persistence | DB + mark as read | Preferences ditambah nanti |
| UI pattern | Dropdown panel + full page | Dropdown untuk quick glance, full page untuk history/filter |
| Architecture | Event-driven (EventEmitter2) | Loose coupling, existing modules minimal changes |

## Database Schema

```prisma
model Notification {
  id              String    @id @default(uuid())
  institution_id  String
  user_id         String?           // null = broadcast ke semua admin institution
  type            String            // 'payment.received', 'student.registered', etc.
  title           String            // "Payment Received"
  body            String            // "Budi Santoso paid Rp 500.000"
  data            Json?             // { paymentId: "xxx" } — untuk deep link
  read_at         DateTime?         // null = unread
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt

  institution     Institution @relation(fields: [institution_id], references: [id])
  user            User?       @relation(fields: [user_id], references: [id])

  @@index([institution_id, user_id, read_at, created_at])
  @@index([institution_id, created_at])
  @@map("notifications")
}
```

**Note:** Add `notifications Notification[]` to both `Institution` and `User` models in schema.prisma.

Design choices:
- `user_id` nullable — null means broadcast to all admins in institution
- `read_at` nullable — null = unread, timestamp = when read
- `data` JSON — flexible metadata for deep linking
- `type` string not enum — extensible without migrations
- `updated_at` included for consistency with all other models in the codebase
- Composite index for primary query: unread notifications for user X in institution Y, newest first

## Backend Architecture

### Setup Requirements

1. Install `@nestjs/event-emitter`: `npm install @nestjs/event-emitter`
2. Add `EventEmitterModule.forRoot()` to `app.module.ts` imports
3. Run `npx prisma migrate dev --name add-notifications` after schema changes

### Module Structure

```
src/modules/notification/
├── notification.module.ts          # Module, import EventEmitterModule
├── notification.controller.ts      # REST endpoints + SSE stream
├── notification.service.ts         # CRUD, mark read, unread count
├── notification.listener.ts        # @OnEvent handlers → create notifications
├── notification.gateway.ts         # SSE connection management
├── dto/
│   └── notification.dto.ts         # Query filters, mark-read DTOs
└── notification.events.ts          # Event type constants & payload interfaces
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/notifications` | List notifications (paginated, filter by type/read) |
| `GET` | `/api/notifications/unread-count` | Unread count for badge |
| `GET` | `/api/notifications/stream` | SSE endpoint — real-time push |
| `PATCH` | `/api/notifications/:id/read` | Mark single as read |
| `PATCH` | `/api/notifications/read-all` | Mark all as read |

### Event Flow

```
1. PaymentService.batchRecord()
   → this.eventEmitter.emit('payment.received', { institutionId, paymentId, studentName, amount })

2. NotificationListener.onPaymentReceived(payload)
   → notificationService.create({ institutionId, type, title, body, data })

3. NotificationService.create()
   → Insert DB record
   → notificationGateway.pushToInstitution(institutionId, notification)

4. NotificationGateway.pushToInstitution()
   → Find active SSE connections for institution
   → Send event to each connection
```

### SSE Authentication

The SSE endpoint (`/api/notifications/stream`) uses JWT passed via query param (`?token=<jwt>`) because `EventSource` does not support custom headers. Implementation approach:

1. Mark the SSE endpoint with `@Public()` to bypass global `JwtAuthGuard`
2. Manually verify the JWT inside the controller using `JwtService.verifyAsync()`
3. Extract `userId` and `institutionId` from the verified payload
4. Return `401 Unauthorized` if token is invalid or expired before establishing the SSE stream

**Security tradeoff:** JWT in query params appears in server logs and browser history. This is acceptable because:
- Access tokens are already short-lived (`JWT_EXPIRY`, e.g. `15m`)
- SSE reconnects automatically, so token refresh works naturally
- This is the standard pattern for SSE authentication (used by GitHub, Stripe, etc.)

### SSE Connection Management

- `NotificationGateway` maintains `Map<institutionId, Set<Response>>` of active SSE connections
- On connect: validate JWT from query param, add to map
- On disconnect: remove from map
- Heartbeat every 30s to keep connection alive
- Auto-reconnect handled by browser's `EventSource` natively

**Scaling note:** In-memory connection map works for single-instance deployments (current Railway setup). If horizontal scaling is needed in the future, this must be replaced with Redis Pub/Sub or a message broker.

### Error Handling

- **SSE push failures:** Catch per-connection, remove dead connections from the Map silently
- **DB errors in `notificationService.create()`:** Log error, do not throw to the event emitter — notification creation must never break the triggering action
- **Invalid/expired JWT on SSE connect:** Return `401` before establishing the stream

### Notification Types

```typescript
export const NOTIFICATION_EVENTS = {
  PAYMENT_RECEIVED: 'payment.received',
  STUDENT_REGISTERED: 'student.registered',
  PARENT_REGISTERED: 'parent.registered',
  SESSION_CREATED: 'session.created',
  SESSION_CANCELLED: 'session.cancelled',
  ATTENDANCE_SUBMITTED: 'attendance.submitted',
  TUTOR_INVITE_ACCEPTED: 'tutor.invite_accepted',
} as const;
```

## Frontend Architecture

### Components

```
src/components/notifications/
├── NotificationBell.tsx        # Bell icon + unread badge, toggle dropdown
├── NotificationDropdown.tsx    # Dropdown panel (max 10 items, "View all")
├── NotificationItem.tsx        # Single row: icon, title, body, relative time
└── useNotifications.ts         # SSE connection, unread count, TanStack Query
```

### Pages

```
src/pages/Notifications.tsx     # Full page: list + filter by type + pagination
```

### Hook: useNotifications

Responsibilities:
1. SSE connection lifecycle (connect on mount, reconnect on error)
2. Unread count state (real-time via SSE)
3. TanStack Query for notification list (paginated, filtered)
4. Mutations: markAsRead, markAllAsRead

### SSE Integration

- `EventSource` connects to `/api/notifications/stream?token=<jwt>`
- Backend validates token from query param (SSE-only, EventSource doesn't support custom headers)
- On new event: invalidate TanStack Query cache + update unread count
- On error/close: auto-reconnect (browser native with exponential backoff)

### Notification Bell Behavior

1. Bell icon with red badge showing unread count
2. Click toggles dropdown panel
3. Dropdown shows 10 newest notifications, unread items highlighted
4. Click item → mark as read + deep link navigate to related page
5. "Mark all read" → batch update, clear badge
6. "View all" → navigate to `/notifications`

### Deep Linking

| Type | Navigate to |
|------|-------------|
| `payment.received` | `/payments/:paymentId` |
| `student.registered` | `/students/:studentId` |
| `parent.registered` | `/parents/:parentId` |
| `session.created/cancelled` | `/sessions/:sessionId` |
| `attendance.submitted` | `/sessions/:sessionId` |
| `tutor.invite_accepted` | `/tutors/:tutorId` |

### Layout Integration

Replace existing bell icon placeholder in `Layout.tsx` (`<Bell />` button with static red dot) with `<NotificationBell />` component. All logic self-contained in component.

## Event Emission Points

Existing modules that need `emit()` added — 1-2 lines per service:

| File | Method | Event |
|------|--------|-------|
| `payment.service.ts` | `batchRecord()` | `payment.received` |
| `student.service.ts` | `create()` | `student.registered` |
| `parent-invite.service.ts` | `registerParent()` | `parent.registered` |
| `session.service.ts` | `create()` | `session.created` |
| `session.service.ts` | `cancelSession()` | `session.cancelled` |
| `attendance.service.ts` | `batchCreate()` | `attendance.submitted` |
| `invitation.service.ts` | `acceptInvite()` | `tutor.invite_accepted` |

Pattern per module:
```typescript
// Inject EventEmitter2 in constructor
constructor(
  private prisma: PrismaService,
  private eventEmitter: EventEmitter2,
) {}

// Emit after successful action
async batchRecord(institutionId: string, dto: BatchRecordPaymentDto) {
  const payments = await this.prisma.$transaction([ ... ]);
  for (const payment of payments) {
    this.eventEmitter.emit('payment.received', {
      institutionId,
      paymentId: payment.id,
      studentName: payment.student.name,
      amount: payment.amount,
    });
  }
  return payments;
}
```

## Dependencies

### Backend (new)
- `@nestjs/event-emitter` — event bus for loose coupling
- Install: `npm install @nestjs/event-emitter`
- Setup: Add `EventEmitterModule.forRoot()` to `app.module.ts` imports

### Frontend (none — all already available)
- `EventSource` — browser native, no library needed
- TanStack Query — already installed
- Lucide `Bell` icon — already used as placeholder

## Out of Scope

- Notification preferences (per-user toggle per type) — future sprint
- Email/push notification channels — future sprint
- Tutors app notifications — future sprint
- Parent app notifications — future sprint
- Notification grouping/batching — future sprint
- Horizontal scaling (Redis Pub/Sub for SSE) — future, if needed
