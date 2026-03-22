# Notification Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-app notification center to sinaloka-platform with real-time SSE push, persistent notifications in DB, dropdown panel from bell icon, and full notifications page.

**Architecture:** Event-driven — existing services emit events via `@nestjs/event-emitter`, a `NotificationListener` creates DB records and pushes to connected SSE clients. Frontend uses `EventSource` for real-time updates, TanStack Query for data fetching, and a dropdown + full page UI.

**Tech Stack:** NestJS EventEmitter, Prisma, SSE (native NestJS), React, TanStack Query, Lucide icons, TailwindCSS v4

**Spec:** `docs/superpowers/specs/2026-03-22-notification-center-design.md`

---

## File Structure

### Backend — New Files
| File | Responsibility |
|------|---------------|
| `src/modules/notification/notification.module.ts` | Module definition, imports EventEmitterModule |
| `src/modules/notification/notification.service.ts` | CRUD: create, list, unread count, mark read |
| `src/modules/notification/notification.controller.ts` | REST endpoints + SSE stream |
| `src/modules/notification/notification.listener.ts` | `@OnEvent` handlers → create notifications |
| `src/modules/notification/notification.gateway.ts` | SSE connection map, push to clients |
| `src/modules/notification/notification.events.ts` | Event constants + payload interfaces |
| `src/modules/notification/dto/notification.dto.ts` | Zod schemas for query/mutation DTOs |

### Backend — Modified Files
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `Notification` model + relations on `Institution` and `User` |
| `src/app.module.ts` | Add `EventEmitterModule.forRoot()` + `NotificationModule` |
| `src/modules/payment/payment.service.ts` | Emit `payment.received` in `batchRecord()` |
| `src/modules/student/student.service.ts` | Emit `student.registered` in `create()` |
| `src/modules/parent/parent-invite.service.ts` | Emit `parent.registered` in `registerParent()` |
| `src/modules/session/session.service.ts` | Emit `session.created` in `create()`, `session.cancelled` in `cancelSession()` |
| `src/modules/attendance/attendance.service.ts` | Emit `attendance.submitted` in `batchCreate()` |
| `src/modules/invitation/invitation.service.ts` | Emit `tutor.invite_accepted` in `acceptInvite()` |

### Frontend — New Files
| File | Responsibility |
|------|---------------|
| `src/services/notifications.service.ts` | API calls: list, unread count, mark read |
| `src/hooks/useNotifications.ts` | SSE connection, TanStack Query, mutations |
| `src/components/notifications/NotificationBell.tsx` | Bell icon + badge + dropdown toggle |
| `src/components/notifications/NotificationDropdown.tsx` | Dropdown panel with notification list |
| `src/components/notifications/NotificationItem.tsx` | Single notification row |
| `src/pages/Notifications.tsx` | Full page with filters + pagination |

### Frontend — Modified Files
| File | Change |
|------|--------|
| `src/components/Layout.tsx` | Replace bell placeholder with `<NotificationBell />` |
| `src/App.tsx` | Add `/notifications` route |

---

## Task 1: Database Schema & Migration

**Files:**
- Modify: `sinaloka-backend/prisma/schema.prisma`

- [ ] **Step 1: Add Notification model to Prisma schema**

After the `User` model (around line 325), add:

```prisma
model Notification {
  id              String    @id @default(uuid())
  institution_id  String
  user_id         String?
  type            String
  title           String
  body            String
  data            Json?
  read_at         DateTime?
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt

  institution     Institution @relation(fields: [institution_id], references: [id])
  user            User?       @relation(fields: [user_id], references: [id])

  @@index([institution_id, user_id, read_at, created_at])
  @@index([institution_id, created_at])
  @@map("notifications")
}
```

- [ ] **Step 2: Add relations to Institution and User models**

In the `Institution` model (after line 178), add:
```prisma
notifications     Notification[]
```

In the `User` model (after line 322), add:
```prisma
notifications     Notification[]
```

- [ ] **Step 3: Generate migration and Prisma client**

Run:
```bash
cd sinaloka-backend
npx prisma migrate dev --name add_notifications
npm run prisma:generate
```

Expected: Migration file created in `prisma/migrations/`, Prisma client regenerated.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(backend): add notifications table schema and migration"
```

---

## Task 2: Install EventEmitter & Register Module

**Files:**
- Modify: `sinaloka-backend/package.json`
- Modify: `sinaloka-backend/src/app.module.ts`

- [ ] **Step 1: Install @nestjs/event-emitter**

```bash
cd sinaloka-backend
npm install @nestjs/event-emitter
```

- [ ] **Step 2: Add EventEmitterModule to app.module.ts**

In `sinaloka-backend/src/app.module.ts`, add import at top:
```typescript
import { EventEmitterModule } from '@nestjs/event-emitter';
```

Add to the `imports` array (after `ScheduleModule.forRoot()` at line 70):
```typescript
EventEmitterModule.forRoot(),
```

- [ ] **Step 3: Verify backend starts**

```bash
cd sinaloka-backend
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/package.json sinaloka-backend/package-lock.json sinaloka-backend/src/app.module.ts
git commit -m "feat(backend): install and configure @nestjs/event-emitter"
```

---

## Task 3: Notification Events & DTOs

**Files:**
- Create: `sinaloka-backend/src/modules/notification/notification.events.ts`
- Create: `sinaloka-backend/src/modules/notification/dto/notification.dto.ts`

- [ ] **Step 1: Create event constants and payload interfaces**

Create `sinaloka-backend/src/modules/notification/notification.events.ts`:

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

export interface PaymentReceivedEvent {
  institutionId: string;
  paymentId: string;
  studentName: string;
  amount: number;
}

export interface StudentRegisteredEvent {
  institutionId: string;
  studentId: string;
  studentName: string;
}

export interface ParentRegisteredEvent {
  institutionId: string;
  parentId: string;
  parentName: string;
  studentNames: string[];
}

export interface SessionCreatedEvent {
  institutionId: string;
  sessionId: string;
  className: string;
  date: string;
}

export interface SessionCancelledEvent {
  institutionId: string;
  sessionId: string;
  className: string;
  date: string;
  reason?: string;
}

export interface AttendanceSubmittedEvent {
  institutionId: string;
  sessionId: string;
  className: string;
  tutorName: string;
  studentCount: number;
}

export interface TutorInviteAcceptedEvent {
  institutionId: string;
  tutorId: string;
  tutorName: string;
}
```

- [ ] **Step 2: Create DTOs with Zod schemas**

Create `sinaloka-backend/src/modules/notification/dto/notification.dto.ts`:

```typescript
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const listNotificationsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.string().optional(),
  unread: z.coerce.boolean().optional(),
});

export class ListNotificationsDto extends createZodDto(listNotificationsSchema) {}
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-backend/src/modules/notification/
git commit -m "feat(backend): add notification event types and DTOs"
```

---

## Task 4: Notification Service

**Files:**
- Create: `sinaloka-backend/src/modules/notification/notification.service.ts`

- [ ] **Step 1: Create notification service**

Create `sinaloka-backend/src/modules/notification/notification.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ListNotificationsDto } from './dto/notification.dto';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private prisma: PrismaService) {}

  async create(data: {
    institutionId: string;
    userId?: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }) {
    try {
      return await this.prisma.notification.create({
        data: {
          institution_id: data.institutionId,
          user_id: data.userId ?? null,
          type: data.type,
          title: data.title,
          body: data.body,
          data: data.data ?? undefined,
        },
      });
    } catch (error) {
      this.logger.error('Failed to create notification', error);
      return null;
    }
  }

  async findAll(institutionId: string, dto: ListNotificationsDto) {
    const where: Record<string, unknown> = {
      institution_id: institutionId,
    };

    if (dto.type) where.type = dto.type;
    if (dto.unread) where.read_at = null;

    const [notifications, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        page: dto.page,
        limit: dto.limit,
        totalPages: Math.ceil(total / dto.limit),
      },
    };
  }

  async getUnreadCount(institutionId: string) {
    return this.prisma.notification.count({
      where: {
        institution_id: institutionId,
        read_at: null,
      },
    });
  }

  async markAsRead(id: string, institutionId: string) {
    return this.prisma.notification.update({
      where: { id, institution_id: institutionId },
      data: { read_at: new Date() },
    });
  }

  async markAllAsRead(institutionId: string) {
    return this.prisma.notification.updateMany({
      where: {
        institution_id: institutionId,
        read_at: null,
      },
      data: { read_at: new Date() },
    });
  }
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd sinaloka-backend && npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors related to notification.service.ts

- [ ] **Step 3: Commit**

```bash
git add sinaloka-backend/src/modules/notification/notification.service.ts
git commit -m "feat(backend): add notification service with CRUD operations"
```

---

## Task 5: SSE Gateway

**Files:**
- Create: `sinaloka-backend/src/modules/notification/notification.gateway.ts`

- [ ] **Step 1: Create SSE gateway for connection management**

Create `sinaloka-backend/src/modules/notification/notification.gateway.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';

interface SseClient {
  res: Response;
  userId: string;
}

@Injectable()
export class NotificationGateway {
  private readonly logger = new Logger(NotificationGateway.name);
  private connections = new Map<string, Set<SseClient>>();

  addClient(institutionId: string, userId: string, res: Response) {
    if (!this.connections.has(institutionId)) {
      this.connections.set(institutionId, new Set());
    }
    const client: SseClient = { res, userId };
    this.connections.get(institutionId)!.add(client);

    this.logger.debug(
      `SSE client connected: user=${userId}, institution=${institutionId}, total=${this.connections.get(institutionId)!.size}`,
    );

    res.on('close', () => {
      this.connections.get(institutionId)?.delete(client);
      if (this.connections.get(institutionId)?.size === 0) {
        this.connections.delete(institutionId);
      }
      this.logger.debug(`SSE client disconnected: user=${userId}`);
    });
  }

  pushToInstitution(institutionId: string, notification: Record<string, unknown>) {
    const clients = this.connections.get(institutionId);
    if (!clients || clients.size === 0) return;

    const data = JSON.stringify(notification);

    for (const client of clients) {
      try {
        client.res.write(`data: ${data}\n\n`);
      } catch {
        clients.delete(client);
        this.logger.debug(`Removed dead SSE client: user=${client.userId}`);
      }
    }
  }

  getConnectionCount(institutionId?: string): number {
    if (institutionId) {
      return this.connections.get(institutionId)?.size ?? 0;
    }
    let total = 0;
    for (const clients of this.connections.values()) {
      total += clients.size;
    }
    return total;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-backend/src/modules/notification/notification.gateway.ts
git commit -m "feat(backend): add SSE gateway for real-time notification push"
```

---

## Task 6: Notification Controller (REST + SSE)

**Files:**
- Create: `sinaloka-backend/src/modules/notification/notification.controller.ts`

- [ ] **Step 1: Create controller with REST endpoints and SSE stream**

Create `sinaloka-backend/src/modules/notification/notification.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Req,
  Res,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { ListNotificationsDto } from './dto/notification.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { InstitutionId } from '../../common/decorators/institution-id.decorator';

@Controller('notifications')
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(
    private notificationService: NotificationService,
    private notificationGateway: NotificationGateway,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN')
  findAll(
    @InstitutionId() institutionId: string,
    @Query() dto: ListNotificationsDto,
  ) {
    return this.notificationService.findAll(institutionId, dto);
  }

  @Get('unread-count')
  @Roles('ADMIN', 'SUPER_ADMIN')
  getUnreadCount(@InstitutionId() institutionId: string) {
    return this.notificationService.getUnreadCount(institutionId);
  }

  @Public()
  @Get('stream')
  async stream(
    @Query('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!token) {
      throw new UnauthorizedException('Token required');
    }

    let payload: { sub: string; institutionId: string; role: string };
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (!payload.institutionId) {
      throw new UnauthorizedException('Institution context required');
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Send initial connection event
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    this.notificationGateway.addClient(
      payload.institutionId,
      payload.sub,
      res,
    );

    // Heartbeat every 30s
    const heartbeat = setInterval(() => {
      try {
        res.write(`: heartbeat\n\n`);
      } catch {
        clearInterval(heartbeat);
      }
    }, 30000);

    req.on('close', () => {
      clearInterval(heartbeat);
    });
  }

  @Patch(':id/read')
  @Roles('ADMIN', 'SUPER_ADMIN')
  markAsRead(
    @Param('id') id: string,
    @InstitutionId() institutionId: string,
  ) {
    return this.notificationService.markAsRead(id, institutionId);
  }

  @Patch('read-all')
  @Roles('ADMIN', 'SUPER_ADMIN')
  markAllAsRead(@InstitutionId() institutionId: string) {
    return this.notificationService.markAllAsRead(institutionId);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-backend/src/modules/notification/notification.controller.ts
git commit -m "feat(backend): add notification controller with REST + SSE endpoints"
```

---

## Task 7: Notification Listener (Event Handlers)

**Files:**
- Create: `sinaloka-backend/src/modules/notification/notification.listener.ts`

- [ ] **Step 1: Create event listener that creates notifications**

Create `sinaloka-backend/src/modules/notification/notification.listener.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import {
  NOTIFICATION_EVENTS,
  PaymentReceivedEvent,
  StudentRegisteredEvent,
  ParentRegisteredEvent,
  SessionCreatedEvent,
  SessionCancelledEvent,
  AttendanceSubmittedEvent,
  TutorInviteAcceptedEvent,
} from './notification.events';

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    private notificationService: NotificationService,
    private notificationGateway: NotificationGateway,
  ) {}

  @OnEvent(NOTIFICATION_EVENTS.PAYMENT_RECEIVED)
  async onPaymentReceived(event: PaymentReceivedEvent) {
    const notification = await this.notificationService.create({
      institutionId: event.institutionId,
      type: NOTIFICATION_EVENTS.PAYMENT_RECEIVED,
      title: 'Payment Received',
      body: `${event.studentName} made a payment of Rp ${event.amount.toLocaleString('id-ID')}`,
      data: { paymentId: event.paymentId },
    });
    if (notification) {
      this.notificationGateway.pushToInstitution(event.institutionId, notification);
    }
  }

  @OnEvent(NOTIFICATION_EVENTS.STUDENT_REGISTERED)
  async onStudentRegistered(event: StudentRegisteredEvent) {
    const notification = await this.notificationService.create({
      institutionId: event.institutionId,
      type: NOTIFICATION_EVENTS.STUDENT_REGISTERED,
      title: 'New Student',
      body: `${event.studentName} has been registered`,
      data: { studentId: event.studentId },
    });
    if (notification) {
      this.notificationGateway.pushToInstitution(event.institutionId, notification);
    }
  }

  @OnEvent(NOTIFICATION_EVENTS.PARENT_REGISTERED)
  async onParentRegistered(event: ParentRegisteredEvent) {
    const notification = await this.notificationService.create({
      institutionId: event.institutionId,
      type: NOTIFICATION_EVENTS.PARENT_REGISTERED,
      title: 'New Parent',
      body: `${event.parentName} joined as parent of ${event.studentNames.join(', ')}`,
      data: { parentId: event.parentId, studentNames: event.studentNames },
    });
    if (notification) {
      this.notificationGateway.pushToInstitution(event.institutionId, notification);
    }
  }

  @OnEvent(NOTIFICATION_EVENTS.SESSION_CREATED)
  async onSessionCreated(event: SessionCreatedEvent) {
    const notification = await this.notificationService.create({
      institutionId: event.institutionId,
      type: NOTIFICATION_EVENTS.SESSION_CREATED,
      title: 'Session Scheduled',
      body: `New session for ${event.className} on ${event.date}`,
      data: { sessionId: event.sessionId },
    });
    if (notification) {
      this.notificationGateway.pushToInstitution(event.institutionId, notification);
    }
  }

  @OnEvent(NOTIFICATION_EVENTS.SESSION_CANCELLED)
  async onSessionCancelled(event: SessionCancelledEvent) {
    const notification = await this.notificationService.create({
      institutionId: event.institutionId,
      type: NOTIFICATION_EVENTS.SESSION_CANCELLED,
      title: 'Session Cancelled',
      body: `Session for ${event.className} on ${event.date} was cancelled${event.reason ? `: ${event.reason}` : ''}`,
      data: { sessionId: event.sessionId },
    });
    if (notification) {
      this.notificationGateway.pushToInstitution(event.institutionId, notification);
    }
  }

  @OnEvent(NOTIFICATION_EVENTS.ATTENDANCE_SUBMITTED)
  async onAttendanceSubmitted(event: AttendanceSubmittedEvent) {
    const notification = await this.notificationService.create({
      institutionId: event.institutionId,
      type: NOTIFICATION_EVENTS.ATTENDANCE_SUBMITTED,
      title: 'Attendance Submitted',
      body: `${event.tutorName} submitted attendance for ${event.className} (${event.studentCount} students)`,
      data: { sessionId: event.sessionId },
    });
    if (notification) {
      this.notificationGateway.pushToInstitution(event.institutionId, notification);
    }
  }

  @OnEvent(NOTIFICATION_EVENTS.TUTOR_INVITE_ACCEPTED)
  async onTutorInviteAccepted(event: TutorInviteAcceptedEvent) {
    const notification = await this.notificationService.create({
      institutionId: event.institutionId,
      type: NOTIFICATION_EVENTS.TUTOR_INVITE_ACCEPTED,
      title: 'Tutor Joined',
      body: `${event.tutorName} accepted the tutor invitation`,
      data: { tutorId: event.tutorId },
    });
    if (notification) {
      this.notificationGateway.pushToInstitution(event.institutionId, notification);
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-backend/src/modules/notification/notification.listener.ts
git commit -m "feat(backend): add notification event listeners for all event types"
```

---

## Task 8: Notification Module & App Registration

**Files:**
- Create: `sinaloka-backend/src/modules/notification/notification.module.ts`
- Modify: `sinaloka-backend/src/app.module.ts`

- [ ] **Step 1: Create notification module**

Create `sinaloka-backend/src/modules/notification/notification.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationListener } from './notification.listener';
import { NotificationGateway } from './notification.gateway';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationListener, NotificationGateway],
  exports: [NotificationService],
})
export class NotificationModule {}
```

- [ ] **Step 2: Register in app.module.ts**

In `sinaloka-backend/src/app.module.ts`, add import:
```typescript
import { NotificationModule } from './modules/notification/notification.module';
```

Add `NotificationModule` to the `imports` array.

- [ ] **Step 3: Verify backend builds**

```bash
cd sinaloka-backend && npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/notification/notification.module.ts sinaloka-backend/src/app.module.ts
git commit -m "feat(backend): register notification module in app"
```

---

## Task 9: Emit Events from Existing Services

**Files:**
- Modify: `sinaloka-backend/src/modules/payment/payment.service.ts`
- Modify: `sinaloka-backend/src/modules/student/student.service.ts`
- Modify: `sinaloka-backend/src/modules/parent/parent-invite.service.ts`
- Modify: `sinaloka-backend/src/modules/session/session.service.ts`
- Modify: `sinaloka-backend/src/modules/attendance/attendance.service.ts`
- Modify: `sinaloka-backend/src/modules/invitation/invitation.service.ts`

Each service needs two changes: (1) inject `EventEmitter2`, (2) emit event after the action.

- [ ] **Step 1: Add EventEmitter2 to PaymentService**

In `sinaloka-backend/src/modules/payment/payment.service.ts`:

Add import:
```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NOTIFICATION_EVENTS } from '../notification/notification.events';
```

Add to constructor:
```typescript
private eventEmitter: EventEmitter2,
```

In `batchRecord()` method (around line 131), after the payments are recorded and before return, emit events for each payment:
```typescript
for (const payment of updatedPayments) {
  this.eventEmitter.emit(NOTIFICATION_EVENTS.PAYMENT_RECEIVED, {
    institutionId,
    paymentId: payment.id,
    studentName: payment.student?.name ?? 'Unknown',
    amount: Number(payment.amount),
  });
}
```

- [ ] **Step 2: Add EventEmitter2 to StudentService**

In `sinaloka-backend/src/modules/student/student.service.ts`:

Add import:
```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NOTIFICATION_EVENTS } from '../notification/notification.events';
```

Add to constructor:
```typescript
private eventEmitter: EventEmitter2,
```

In `create()` method (around line 17), after student is created, emit:
```typescript
this.eventEmitter.emit(NOTIFICATION_EVENTS.STUDENT_REGISTERED, {
  institutionId,
  studentId: student.id,
  studentName: student.name,
});
```

- [ ] **Step 3: Add EventEmitter2 to ParentInviteService**

In `sinaloka-backend/src/modules/parent/parent-invite.service.ts`:

Add import:
```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NOTIFICATION_EVENTS } from '../notification/notification.events';
```

Add to constructor:
```typescript
private eventEmitter: EventEmitter2,
```

In `registerParent()` method (around line 68), after the transaction completes (after line 152) and before `return result`, fetch student names and emit:
```typescript
// Fetch student names for the notification
const students = await this.prisma.student.findMany({
  where: { id: { in: [...invite.student_ids] } },
  select: { name: true },
});

this.eventEmitter.emit(NOTIFICATION_EVENTS.PARENT_REGISTERED, {
  institutionId: invite.institution_id,
  parentId: result.parent.id,
  parentName: dto.name,
  studentNames: students.map((s) => s.name),
});
```

- [ ] **Step 4: Add EventEmitter2 to SessionService**

In `sinaloka-backend/src/modules/session/session.service.ts`:

Add import:
```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NOTIFICATION_EVENTS } from '../notification/notification.events';
```

Add to constructor:
```typescript
private eventEmitter: EventEmitter2,
```

In `create()` method (around line 94), after session is created, emit:
```typescript
this.eventEmitter.emit(NOTIFICATION_EVENTS.SESSION_CREATED, {
  institutionId,
  sessionId: session.id,
  className: session.class?.name ?? 'Unknown',
  date: session.date.toISOString().split('T')[0],
});
```

In `cancelSession()` method (around line 536), after session is cancelled, emit:
```typescript
this.eventEmitter.emit(NOTIFICATION_EVENTS.SESSION_CANCELLED, {
  institutionId: session.class?.institution_id,
  sessionId: session.id,
  className: session.class?.name ?? 'Unknown',
  date: session.date.toISOString().split('T')[0],
  reason: session.cancel_reason,
});
```

- [ ] **Step 5: Add EventEmitter2 to AttendanceService**

In `sinaloka-backend/src/modules/attendance/attendance.service.ts`:

Add import:
```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NOTIFICATION_EVENTS } from '../notification/notification.events';
```

Add to constructor:
```typescript
private eventEmitter: EventEmitter2,
```

In `batchCreate()` method (around line 24), after attendance records are created, emit:
```typescript
this.eventEmitter.emit(NOTIFICATION_EVENTS.ATTENDANCE_SUBMITTED, {
  institutionId: session.class?.institution_id,
  sessionId: dto.sessionId,
  className: session.class?.name ?? 'Unknown',
  tutorName: tutor?.name ?? 'Unknown',
  studentCount: dto.records.length,
});
```

- [ ] **Step 6: Add EventEmitter2 to InvitationService**

In `sinaloka-backend/src/modules/invitation/invitation.service.ts`:

Add import:
```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NOTIFICATION_EVENTS } from '../notification/notification.events';
```

Add to constructor:
```typescript
private eventEmitter: EventEmitter2,
```

In `acceptInvite()` method (around line 288), after the transaction completes and before return, emit:
```typescript
this.eventEmitter.emit(NOTIFICATION_EVENTS.TUTOR_INVITE_ACCEPTED, {
  institutionId: invitation.institution_id,
  tutorId: user.id,
  tutorName: dto.name,
});
```

- [ ] **Step 7: Verify backend builds**

```bash
cd sinaloka-backend && npm run build
```

Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add sinaloka-backend/src/modules/payment/payment.service.ts \
  sinaloka-backend/src/modules/student/student.service.ts \
  sinaloka-backend/src/modules/parent/parent-invite.service.ts \
  sinaloka-backend/src/modules/session/session.service.ts \
  sinaloka-backend/src/modules/attendance/attendance.service.ts \
  sinaloka-backend/src/modules/invitation/invitation.service.ts
git commit -m "feat(backend): emit notification events from existing services"
```

---

## Task 10: Frontend — Notification Service & Hook

**Files:**
- Create: `sinaloka-platform/src/services/notifications.service.ts`
- Create: `sinaloka-platform/src/hooks/useNotifications.ts`

- [ ] **Step 1: Create notification API service**

Create `sinaloka-platform/src/services/notifications.service.ts`:

```typescript
import api from '../lib/api';

export interface Notification {
  id: string;
  institution_id: string;
  user_id: string | null;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const notificationsService = {
  getAll: (params?: { page?: number; limit?: number; type?: string; unread?: boolean }) =>
    api.get<PaginatedResponse<Notification>>('/notifications', { params }).then((r) => r.data),

  getUnreadCount: () =>
    api.get<number>('/notifications/unread-count').then((r) => r.data),

  markAsRead: (id: string) =>
    api.patch(`/notifications/${id}/read`).then((r) => r.data),

  markAllAsRead: () =>
    api.patch('/notifications/read-all').then((r) => r.data),
};
```

- [ ] **Step 2: Create useNotifications hook**

Create `sinaloka-platform/src/hooks/useNotifications.ts`:

```typescript
import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsService, Notification } from '../services/notifications.service';

const API_URL = import.meta.env.VITE_API_URL || '';

export function useNotifications(params?: { page?: number; limit?: number; type?: string; unread?: boolean }) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => notificationsService.getAll(params),
  });
}

export function useUnreadCount() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: notificationsService.getUnreadCount,
    refetchInterval: 60000,
  });

  return { ...query, queryClient };
}

export function useNotificationSSE() {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `${API_URL}/notifications/stream?token=${token}`;
    const es = new EventSource(url);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'connected') return;

        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      // Reconnect after 5s
      setTimeout(connect, 5000);
    };

    eventSourceRef.current = es;
  }, [queryClient]);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, [connect]);
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsService.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/services/notifications.service.ts sinaloka-platform/src/hooks/useNotifications.ts
git commit -m "feat(platform): add notification service and hooks with SSE support"
```

---

## Task 11: Frontend — Notification Components

**Files:**
- Create: `sinaloka-platform/src/components/notifications/NotificationItem.tsx`
- Create: `sinaloka-platform/src/components/notifications/NotificationDropdown.tsx`
- Create: `sinaloka-platform/src/components/notifications/NotificationBell.tsx`

- [ ] **Step 1: Create NotificationItem component**

Create `sinaloka-platform/src/components/notifications/NotificationItem.tsx`:

```tsx
import { DollarSign, UserPlus, Users, Calendar, CalendarX, ClipboardCheck, UserCheck } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Notification } from '../../services/notifications.service';

const ICON_MAP: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  'payment.received': { icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' },
  'student.registered': { icon: UserPlus, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  'parent.registered': { icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  'session.created': { icon: Calendar, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  'session.cancelled': { icon: CalendarX, color: 'text-red-500', bg: 'bg-red-500/10' },
  'attendance.submitted': { icon: ClipboardCheck, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  'tutor.invite_accepted': { icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface NotificationItemProps {
  notification: Notification;
  onClick?: (notification: Notification) => void;
}

export default function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const iconConfig = ICON_MAP[notification.type] ?? {
    icon: UserPlus,
    color: 'text-zinc-500',
    bg: 'bg-zinc-500/10',
  };
  const Icon = iconConfig.icon;
  const isUnread = !notification.read_at;

  return (
    <button
      onClick={() => onClick?.(notification)}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent',
        isUnread && 'bg-blue-500/5',
      )}
    >
      <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', iconConfig.bg)}>
        <Icon size={16} className={iconConfig.color} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm', isUnread ? 'font-medium text-foreground' : 'text-muted-foreground')}>
          {notification.body}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(notification.created_at)}</p>
      </div>
      {isUnread && <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
    </button>
  );
}
```

- [ ] **Step 2: Create NotificationDropdown component**

Create `sinaloka-platform/src/components/notifications/NotificationDropdown.tsx`:

```tsx
import { useNavigate } from 'react-router-dom';
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '../../hooks/useNotifications';
import { Notification } from '../../services/notifications.service';
import NotificationItem from './NotificationItem';

const DEEP_LINK_MAP: Record<string, (data: Record<string, unknown>) => string> = {
  'payment.received': (d) => `/payments/${d.paymentId}`,
  'student.registered': (d) => `/students/${d.studentId}`,
  'parent.registered': (d) => `/parents/${d.parentId}`,
  'session.created': (d) => `/sessions/${d.sessionId}`,
  'session.cancelled': (d) => `/sessions/${d.sessionId}`,
  'attendance.submitted': (d) => `/sessions/${d.sessionId}`,
  'tutor.invite_accepted': (d) => `/tutors/${d.tutorId}`,
};

interface NotificationDropdownProps {
  onClose: () => void;
}

export default function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const navigate = useNavigate();
  const { data } = useNotifications({ limit: 10 });
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const handleClick = (notification: Notification) => {
    if (!notification.read_at) {
      markAsRead.mutate(notification.id);
    }

    const linkFn = DEEP_LINK_MAP[notification.type];
    if (linkFn && notification.data) {
      navigate(linkFn(notification.data as Record<string, unknown>));
    }

    onClose();
  };

  const handleMarkAllRead = () => {
    markAllAsRead.mutate();
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-[380px] rounded-lg border border-border bg-popover shadow-lg z-50">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">Notifications</h3>
        <button
          onClick={handleMarkAllRead}
          className="text-xs text-primary hover:underline"
          disabled={markAllAsRead.isPending}
        >
          Mark all read
        </button>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {data?.data && data.data.length > 0 ? (
          data.data.map((n) => (
            <NotificationItem key={n.id} notification={n} onClick={handleClick} />
          ))
        ) : (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        )}
      </div>

      <div className="border-t border-border p-2 text-center">
        <button
          onClick={() => {
            navigate('/notifications');
            onClose();
          }}
          className="text-sm text-primary hover:underline"
        >
          View all notifications
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create NotificationBell component**

Create `sinaloka-platform/src/components/notifications/NotificationBell.tsx`:

```tsx
import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useUnreadCount, useNotificationSSE } from '../../hooks/useNotifications';
import NotificationDropdown from './NotificationDropdown';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: unreadCount } = useUnreadCount();

  useNotificationSSE();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Bell size={20} />
        {unreadCount && unreadCount > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen && <NotificationDropdown onClose={() => setIsOpen(false)} />}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/components/notifications/
git commit -m "feat(platform): add notification bell, dropdown, and item components"
```

---

## Task 12: Frontend — Notifications Full Page

**Files:**
- Create: `sinaloka-platform/src/pages/Notifications.tsx`
- Modify: `sinaloka-platform/src/App.tsx`

- [ ] **Step 1: Create Notifications page**

Create `sinaloka-platform/src/pages/Notifications.tsx`:

```tsx
import { useState } from 'react';
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '../hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { Notification } from '../services/notifications.service';
import NotificationItem from '../components/notifications/NotificationItem';
import { useTranslation } from 'react-i18next';

const NOTIFICATION_TYPES = [
  { value: '', label: 'All' },
  { value: 'payment.received', label: 'Payments' },
  { value: 'student.registered', label: 'Students' },
  { value: 'parent.registered', label: 'Parents' },
  { value: 'session.created', label: 'Sessions' },
  { value: 'session.cancelled', label: 'Cancelled Sessions' },
  { value: 'attendance.submitted', label: 'Attendance' },
  { value: 'tutor.invite_accepted', label: 'Tutors' },
];

const DEEP_LINK_MAP: Record<string, (data: Record<string, unknown>) => string> = {
  'payment.received': (d) => `/payments/${d.paymentId}`,
  'student.registered': (d) => `/students/${d.studentId}`,
  'parent.registered': (d) => `/parents/${d.parentId}`,
  'session.created': (d) => `/sessions/${d.sessionId}`,
  'session.cancelled': (d) => `/sessions/${d.sessionId}`,
  'attendance.submitted': (d) => `/sessions/${d.sessionId}`,
  'tutor.invite_accepted': (d) => `/tutors/${d.tutorId}`,
};

export default function Notifications() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data, isLoading } = useNotifications({
    page,
    limit: 20,
    type: type || undefined,
    unread: unreadOnly || undefined,
  });
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const handleClick = (notification: Notification) => {
    if (!notification.read_at) {
      markAsRead.mutate(notification.id);
    }
    const linkFn = DEEP_LINK_MAP[notification.type];
    if (linkFn && notification.data) {
      navigate(linkFn(notification.data as Record<string, unknown>));
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('notifications', 'Notifications')}</h1>
        <button
          onClick={() => markAllAsRead.mutate()}
          className="text-sm text-primary hover:underline"
          disabled={markAllAsRead.isPending}
        >
          Mark all as read
        </button>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={type}
          onChange={(e) => { setType(e.target.value); setPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
        >
          {NOTIFICATION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => { setUnreadOnly(e.target.checked); setPage(1); }}
            className="rounded border-input"
          />
          Unread only
        </label>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {isLoading ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : data?.data && data.data.length > 0 ? (
          <div className="divide-y divide-border">
            {data.data.map((n) => (
              <NotificationItem key={n.id} notification={n} onClick={handleClick} />
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No notifications found
          </div>
        )}
      </div>

      {data?.meta && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-md border border-input px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {data.meta.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
            disabled={page >= data.meta.totalPages}
            className="rounded-md border border-input px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add route in App.tsx**

In `sinaloka-platform/src/App.tsx`, add import:
```typescript
import Notifications from './pages/Notifications';
```

Add route inside the protected `<Route element={<Layout />}>` block:
```tsx
<Route path="/notifications" element={<Notifications />} />
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/pages/Notifications.tsx sinaloka-platform/src/App.tsx
git commit -m "feat(platform): add notifications full page with filters and pagination"
```

---

## Task 13: Frontend — Integrate NotificationBell into Layout

**Files:**
- Modify: `sinaloka-platform/src/components/Layout.tsx`

- [ ] **Step 1: Replace bell placeholder with NotificationBell**

In `sinaloka-platform/src/components/Layout.tsx`:

Add import:
```typescript
import NotificationBell from './notifications/NotificationBell';
```

Replace the bell button placeholder (the `<button>` containing `<Bell size={20} />` and static red dot) with:
```tsx
<NotificationBell />
```

- [ ] **Step 2: Verify frontend builds**

```bash
cd sinaloka-platform && npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/components/Layout.tsx
git commit -m "feat(platform): replace bell placeholder with live NotificationBell component"
```

---

## Task 14: Build Verification & Final Check

- [ ] **Step 1: Build backend**

```bash
cd sinaloka-backend && npm run build
```

Expected: Build succeeds.

- [ ] **Step 2: Build platform**

```bash
cd sinaloka-platform && npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Run backend tests**

```bash
cd sinaloka-backend && npm run test -- --ci
```

Expected: All existing tests pass (event emitter inject may cause some DI test failures — fix by adding `EventEmitter2` to test module providers if needed).

- [ ] **Step 4: Run platform lint**

```bash
cd sinaloka-platform && npm run lint
```

Expected: No type errors.
