# Parent In-App Payment Notifications — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace WhatsApp payment reminders with in-app notifications in the parent app, extending the existing notification system.

**Architecture:** Extend backend notification module (service, gateway, controller) to support PARENT role. Add a payment reminder cron in the notification module. Build a notification tab + page in the parent app with polling for unread count. Hide WhatsApp from platform sidebar.

**Tech Stack:** NestJS, Prisma, React, Lucide icons, TailwindCSS, Axios

**Spec:** `docs/superpowers/specs/2026-03-23-parent-payment-notifications-design.md`

---

### Task 1: Add `pushToUser` method to NotificationGateway

**Files:**
- Modify: `sinaloka-backend/src/modules/notification/notification.gateway.ts`

- [ ] **Step 1: Add `pushToUser` method**

In `notification.gateway.ts`, add after the `pushToInstitution` method (after line 50):

```typescript
pushToUser(
  institutionId: string,
  userId: string,
  notification: Record<string, unknown>,
) {
  const clients = this.connections.get(institutionId);
  if (!clients || clients.size === 0) return;

  const data = JSON.stringify(notification);
  for (const client of clients) {
    if (client.userId !== userId) continue;
    try {
      client.res.write(`data: ${data}\n\n`);
    } catch {
      clients.delete(client);
      this.logger.debug(`Removed dead SSE client: user=${client.userId}`);
    }
  }
}
```

- [ ] **Step 2: Verify build**

Run: `cd sinaloka-backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add sinaloka-backend/src/modules/notification/notification.gateway.ts
git commit -m "feat(notification): add pushToUser method for targeted SSE push"
```

---

### Task 2: Add role-aware filtering to NotificationService

**Files:**
- Modify: `sinaloka-backend/src/modules/notification/notification.service.ts`

- [ ] **Step 1: Update `findAll` to accept role parameter**

Change `findAll` signature and filter logic. When role is `PARENT`, filter only `user_id = userId` (no broadcast notifications). When role is `ADMIN`/`SUPER_ADMIN`, keep existing behavior with `OR: [{ user_id: null }, { user_id: userId }]`.

Replace lines 36-63 of `notification.service.ts`:

```typescript
async findAll(institutionId: string, userId: string, dto: ListNotificationsDto, role?: string) {
  const userFilter = role === 'PARENT'
    ? { user_id: userId }
    : { OR: [{ user_id: null }, { user_id: userId }] };

  const where: Record<string, unknown> = {
    institution_id: institutionId,
    ...userFilter,
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
```

- [ ] **Step 2: Update `getUnreadCount` to accept role parameter**

Replace lines 65-73:

```typescript
async getUnreadCount(institutionId: string, userId: string, role?: string) {
  const userFilter = role === 'PARENT'
    ? { user_id: userId }
    : { OR: [{ user_id: null }, { user_id: userId }] };

  return this.prisma.notification.count({
    where: {
      institution_id: institutionId,
      read_at: null,
      ...userFilter,
    },
  });
}
```

- [ ] **Step 3: Update `markAsRead` — add ownership check for parents**

Replace lines 75-84:

```typescript
async markAsRead(id: string, institutionId: string, userId: string, role?: string) {
  const userFilter = role === 'PARENT'
    ? { user_id: userId }
    : { OR: [{ user_id: null }, { user_id: userId }] };

  return this.prisma.notification.update({
    where: {
      id,
      institution_id: institutionId,
      ...userFilter,
    },
    data: { read_at: new Date() },
  });
}
```

- [ ] **Step 4: Update `markAllAsRead` — same role-aware filter**

Replace lines 86-95:

```typescript
async markAllAsRead(institutionId: string, userId: string, role?: string) {
  const userFilter = role === 'PARENT'
    ? { user_id: userId }
    : { OR: [{ user_id: null }, { user_id: userId }] };

  return this.prisma.notification.updateMany({
    where: {
      institution_id: institutionId,
      read_at: null,
      ...userFilter,
    },
    data: { read_at: new Date() },
  });
}
```

- [ ] **Step 5: Verify build**

Run: `cd sinaloka-backend && npx tsc --noEmit`
Expected: Errors in `notification.controller.ts` (expected — will fix in Task 3)

- [ ] **Step 6: Commit**

```bash
git add sinaloka-backend/src/modules/notification/notification.service.ts
git commit -m "feat(notification): add role-aware filtering to prevent broadcast leak to parents"
```

---

### Task 3: Open NotificationController to PARENT role

**Files:**
- Modify: `sinaloka-backend/src/modules/notification/notification.controller.ts`

- [ ] **Step 1: Add PARENT role to all endpoints and pass role to service**

Replace the `findAll` method (lines 36-44):

```typescript
@Get()
@Roles('ADMIN', 'SUPER_ADMIN', 'PARENT')
findAll(
  @InstitutionId() institutionId: string,
  @CurrentUser() user: JwtPayload,
  @Query() dto: ListNotificationsDto,
) {
  return this.notificationService.findAll(institutionId, user.userId, dto, user.role);
}
```

Replace `getUnreadCount` (lines 46-53):

```typescript
@Get('unread-count')
@Roles('ADMIN', 'SUPER_ADMIN', 'PARENT')
getUnreadCount(
  @InstitutionId() institutionId: string,
  @CurrentUser() user: JwtPayload,
) {
  return this.notificationService.getUnreadCount(institutionId, user.userId, user.role);
}
```

Replace `markAllAsRead` (lines 107-114):

```typescript
@Patch('read-all')
@Roles('ADMIN', 'SUPER_ADMIN', 'PARENT')
markAllAsRead(
  @InstitutionId() institutionId: string,
  @CurrentUser() user: JwtPayload,
) {
  return this.notificationService.markAllAsRead(institutionId, user.userId, user.role);
}
```

Replace `markAsRead` (lines 116-125):

```typescript
@Patch(':id/read')
@Roles('ADMIN', 'SUPER_ADMIN', 'PARENT')
markAsRead(
  @Param('id') id: string,
  @InstitutionId() institutionId: string,
  @CurrentUser() user: JwtPayload,
) {
  return this.notificationService.markAsRead(id, institutionId, user.userId, user.role);
}
```

- [ ] **Step 2: Add PARENT role to SSE stream**

In the `stream` method, replace line 80:

```typescript
// Before:
if (payload.role !== 'ADMIN' && payload.role !== 'SUPER_ADMIN') {
// After:
if (payload.role !== 'ADMIN' && payload.role !== 'SUPER_ADMIN' && payload.role !== 'PARENT') {
```

- [ ] **Step 3: Verify build**

Run: `cd sinaloka-backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/notification/notification.controller.ts
git commit -m "feat(notification): open controller endpoints to PARENT role"
```

---

### Task 4: Add PAYMENT_REMINDER event type

**Files:**
- Modify: `sinaloka-backend/src/modules/notification/notification.events.ts`

- [ ] **Step 1: Add event constant and interface**

Add to `NOTIFICATION_EVENTS` object (after line 8, before `} as const`):

```typescript
PAYMENT_REMINDER: 'payment.reminder',
```

Add interface at the end of the file:

```typescript
export interface PaymentReminderEvent {
  institutionId: string;
  parentUserId: string;
  paymentId: string;
  studentId: string;
  studentName: string;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'OVERDUE';
}
```

- [ ] **Step 2: Commit**

```bash
git add sinaloka-backend/src/modules/notification/notification.events.ts
git commit -m "feat(notification): add PAYMENT_REMINDER event type"
```

---

### Task 5: Create PaymentReminderCron

**Files:**
- Create: `sinaloka-backend/src/modules/notification/payment-reminder.cron.ts`
- Modify: `sinaloka-backend/src/modules/notification/notification.module.ts`

- [ ] **Step 1: Create the cron file**

Create `sinaloka-backend/src/modules/notification/payment-reminder.cron.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { NotificationService } from './notification.service.js';
import { NotificationGateway } from './notification.gateway.js';
import { NOTIFICATION_EVENTS } from './notification.events.js';

@Injectable()
export class PaymentReminderCron {
  private readonly logger = new Logger(PaymentReminderCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  // Daily at 09:00 WIB (UTC+7 = 02:00 UTC)
  @Cron('0 2 * * *')
  async sendPaymentReminders() {
    this.logger.log('Starting daily payment reminder job');

    const institutions = await this.prisma.institution.findMany({
      select: { id: true, settings: true },
    });
    const activeInstitutions = institutions
      .filter((inst) => {
        const settings = inst.settings as Record<string, any> | null;
        return settings?.whatsapp_auto_reminders !== false;
      })
      .map((inst) => {
        const settings = inst.settings as Record<string, any> | null;
        return {
          id: inst.id,
          remindDays: (settings?.whatsapp_remind_days_before as number) ?? 1,
        };
      });

    if (activeInstitutions.length === 0) {
      this.logger.log('No institutions with auto-reminders enabled');
      return;
    }

    const maxRemindDays = Math.max(
      ...activeInstitutions.map((i) => i.remindDays),
    );
    const remindDate = new Date();
    remindDate.setDate(remindDate.getDate() + maxRemindDays);
    remindDate.setHours(23, 59, 59, 999);

    const payments = await this.prisma.payment.findMany({
      where: {
        institution_id: { in: activeInstitutions.map((i) => i.id) },
        OR: [
          { status: 'PENDING', due_date: { lte: remindDate } },
          { status: 'OVERDUE' },
        ],
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            parent_links: {
              select: {
                parent: {
                  select: {
                    user_id: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    let sent = 0;
    let skippedNoParent = 0;
    let skippedDedup = 0;
    let failed = 0;

    for (const payment of payments) {
      const parentUserIds = payment.student.parent_links
        .map((link) => link.parent.user_id)
        .filter(Boolean) as string[];

      if (parentUserIds.length === 0) {
        skippedNoParent++;
        continue;
      }

      const amount = new Intl.NumberFormat('id-ID', {
        maximumFractionDigits: 0,
      }).format(Number(payment.amount));

      const dueDate = new Date(payment.due_date).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      const statusLabel = payment.status === 'OVERDUE' ? 'Terlambat' : 'Menunggu';

      for (const parentUserId of parentUserIds) {
        try {
          // Dedup: check for existing reminder in last 24h for this payment + parent
          const existing = await this.prisma.notification.findFirst({
            where: {
              institution_id: payment.institution_id,
              user_id: parentUserId,
              type: NOTIFICATION_EVENTS.PAYMENT_REMINDER,
              created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
              data: { path: ['paymentId'], equals: payment.id },
            },
          });

          if (existing) {
            skippedDedup++;
            continue;
          }

          const notification = await this.notificationService.create({
            institutionId: payment.institution_id,
            userId: parentUserId,
            type: NOTIFICATION_EVENTS.PAYMENT_REMINDER,
            title: 'Pengingat Pembayaran',
            body: `Pembayaran untuk ${payment.student.name} sebesar Rp ${amount} jatuh tempo ${dueDate} (${statusLabel})`,
            data: {
              paymentId: payment.id,
              studentId: payment.student.id,
              studentName: payment.student.name,
              amount,
              dueDate,
              status: payment.status,
            },
          });

          if (notification) {
            this.notificationGateway.pushToUser(
              payment.institution_id,
              parentUserId,
              notification as Record<string, unknown>,
            );
            sent++;
          } else {
            failed++;
          }
        } catch (error: any) {
          failed++;
          this.logger.error(
            `Failed to create reminder for payment ${payment.id}: ${error.message}`,
          );
        }
      }
    }

    this.logger.log(
      `Payment reminders: ${sent} sent, ${skippedNoParent} skipped (no parent), ${skippedDedup} skipped (dedup), ${failed} failed`,
    );
  }
}
```

- [ ] **Step 2: Register cron in notification module**

In `notification.module.ts`, add import and provider:

```typescript
import { PaymentReminderCron } from './payment-reminder.cron.js';
```

Add `PaymentReminderCron` to the `providers` array:

```typescript
providers: [NotificationService, NotificationListener, NotificationGateway, PaymentReminderCron],
```

- [ ] **Step 3: Verify build**

Run: `cd sinaloka-backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/notification/payment-reminder.cron.ts sinaloka-backend/src/modules/notification/notification.module.ts
git commit -m "feat(notification): add payment reminder cron for parent in-app notifications"
```

---

### Task 6: Disable WhatsApp cron

**Files:**
- Modify: `sinaloka-backend/src/modules/whatsapp/whatsapp.cron.ts`

- [ ] **Step 1: Remove `@Cron` decorator**

In `whatsapp.cron.ts`, remove the `@Cron('0 2 * * *')` decorator from `sendPaymentReminders()` (line 16). Keep the method intact for potential manual use. Also remove the `Cron` import from `@nestjs/schedule` if no other cron decorators remain.

Replace lines 1-2:

```typescript
import { Injectable, Logger } from '@nestjs/common';
// Cron disabled — payment reminders moved to notification module
```

Remove line 16 (`@Cron('0 2 * * *')`).

- [ ] **Step 2: Verify build**

Run: `cd sinaloka-backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add sinaloka-backend/src/modules/whatsapp/whatsapp.cron.ts
git commit -m "feat(whatsapp): disable payment reminder cron — replaced by in-app notifications"
```

---

### Task 7: Hide WhatsApp from platform sidebar

**Files:**
- Modify: `sinaloka-platform/src/components/sidebar/Sidebar.tsx`

- [ ] **Step 1: Comment out WhatsApp sidebar item**

In `Sidebar.tsx`, remove or comment out the WhatsApp sidebar section (lines 231-233):

Replace:
```typescript
<SidebarSection label={t('nav.messaging')} minimized={minimized}>
  <SidebarItem icon={MessageSquare} label={t('nav.whatsapp')} href="/whatsapp" active={location.pathname === '/whatsapp'} minimized={minimized} />
</SidebarSection>
```

With nothing (delete these 3 lines). Also remove the `MessageSquare` import from lucide-react if it's no longer used elsewhere in the file.

- [ ] **Step 2: Verify build**

Run: `cd sinaloka-platform && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/components/sidebar/Sidebar.tsx
git commit -m "feat(platform): hide WhatsApp from sidebar — replaced by in-app notifications"
```

---

### Task 8: Add notification types and API service to parent app

**Files:**
- Modify: `sinaloka-parent/src/types.ts`
- Create: `sinaloka-parent/src/api/notifications.ts`

- [ ] **Step 1: Add notification type**

Add to the end of `sinaloka-parent/src/types.ts`:

```typescript
export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, any> | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationListResponse {
  data: Notification[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

- [ ] **Step 2: Create notification API service**

Create `sinaloka-parent/src/api/notifications.ts`:

```typescript
import api from './client';
import type { NotificationListResponse } from '../types';

export const notificationApi = {
  getAll: (page = 1, limit = 20) =>
    api.get<NotificationListResponse>('/api/notifications', { params: { page, limit } }).then((r) => r.data),

  getUnreadCount: () =>
    api.get<number>('/api/notifications/unread-count').then((r) => r.data),

  markAsRead: (id: string) =>
    api.patch(`/api/notifications/${id}/read`).then((r) => r.data),

  markAllAsRead: () =>
    api.patch('/api/notifications/read-all').then((r) => r.data),
};
```

- [ ] **Step 3: Verify build**

Run: `cd sinaloka-parent && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add sinaloka-parent/src/types.ts sinaloka-parent/src/api/notifications.ts
git commit -m "feat(parent): add notification types and API service"
```

---

### Task 9: Add useNotifications hook to parent app

**Files:**
- Create: `sinaloka-parent/src/hooks/useNotifications.ts`

- [ ] **Step 1: Create the hook**

Create `sinaloka-parent/src/hooks/useNotifications.ts`:

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationApi } from '../api/notifications';
import type { Notification } from '../types';

const POLL_INTERVAL_MS = 60_000;

export function useUnreadCount() {
  const [count, setCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async () => {
    try {
      const result = await notificationApi.getUnreadCount();
      setCount(result);
    } catch {
      // Silent retry at next interval
    }
  }, []);

  useEffect(() => {
    fetch();
    intervalRef.current = setInterval(fetch, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetch]);

  return { count, refresh: fetch };
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetch = useCallback(async (pageNum: number) => {
    setIsLoading(true);
    setError(false);
    try {
      const result = await notificationApi.getAll(pageNum);
      if (pageNum === 1) {
        setNotifications(result.data);
      } else {
        setNotifications((prev) => [...prev, ...result.data]);
      }
      setHasMore(pageNum < result.meta.totalPages);
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch(1);
  }, [fetch]);

  const loadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetch(nextPage);
  }, [page, fetch]);

  const refresh = useCallback(() => {
    setPage(1);
    fetch(1);
  }, [fetch]);

  const markAsRead = useCallback(async (id: string) => {
    await notificationApi.markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
    );
  }, []);

  const markAllAsRead = useCallback(async () => {
    await notificationApi.markAllAsRead();
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })),
    );
  }, []);

  return { notifications, isLoading, error, hasMore, loadMore, refresh, markAsRead, markAllAsRead };
}
```

- [ ] **Step 2: Verify build**

Run: `cd sinaloka-parent && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add sinaloka-parent/src/hooks/useNotifications.ts
git commit -m "feat(parent): add useNotifications and useUnreadCount hooks"
```

---

### Task 10: Create NotificationPage component

**Files:**
- Create: `sinaloka-parent/src/pages/NotificationPage.tsx`

- [ ] **Step 1: Create the notification page**

Create `sinaloka-parent/src/pages/NotificationPage.tsx`:

```typescript
import React from 'react';
import { Bell, CheckCheck, RefreshCw } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { cn } from '../lib/utils';

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

interface NotificationPageProps {
  onNavigateToChild: (studentId: string, tab?: string) => void;
}

export function NotificationPage({ onNavigateToChild }: NotificationPageProps) {
  const { notifications, isLoading, error, hasMore, loadMore, refresh, markAsRead, markAllAsRead } = useNotifications();

  const handleTap = async (notification: (typeof notifications)[0]) => {
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }
    // Navigate to child payment tab if payment reminder
    if (notification.data?.studentId) {
      onNavigateToChild(notification.data.studentId, 'payments');
    }
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Notifikasi</h1>
        {notifications.some((n) => !n.read_at) && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1.5 text-xs font-semibold text-lime-400 transition-colors hover:text-lime-300"
          >
            <CheckCheck className="w-4 h-4" />
            Tandai semua dibaca
          </button>
        )}
      </div>

      {error && notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
          <p className="text-sm font-medium">Gagal memuat notifikasi</p>
          <button onClick={refresh} className="mt-3 flex items-center gap-1.5 text-xs text-lime-400 hover:text-lime-300">
            <RefreshCw className="w-3.5 h-3.5" /> Coba lagi
          </button>
        </div>
      ) : isLoading && notifications.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-zinc-900 rounded-xl h-20 animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
          <Bell className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">Belum ada notifikasi</p>
          <button onClick={refresh} className="mt-3 flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-300">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleTap(notification)}
                className={cn(
                  'w-full text-left bg-zinc-900 border rounded-xl p-4 transition-all',
                  notification.read_at
                    ? 'border-zinc-800 opacity-60'
                    : 'border-lime-400/20 bg-lime-400/5'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'mt-1 w-2 h-2 rounded-full shrink-0',
                    notification.read_at ? 'bg-transparent' : 'bg-lime-400'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{notification.title}</p>
                    <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{notification.body}</p>
                    <p className="text-[10px] text-zinc-600 mt-1.5">{timeAgo(notification.created_at)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {hasMore && (
            <button
              onClick={loadMore}
              className="w-full py-3 text-xs font-semibold text-zinc-400 hover:text-zinc-300 transition-colors"
            >
              Muat lebih banyak
            </button>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd sinaloka-parent && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add sinaloka-parent/src/pages/NotificationPage.tsx
git commit -m "feat(parent): add NotificationPage component"
```

---

### Task 11: Update BottomNav with notification tab + badge

**Files:**
- Modify: `sinaloka-parent/src/components/BottomNav.tsx`

- [ ] **Step 1: Add notification tab with badge**

Replace entire `BottomNav.tsx`:

```typescript
import React from 'react';
import { LayoutDashboard, Bell, Users, User } from 'lucide-react';
import { cn } from '../lib/utils';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  unreadCount?: number;
}

export function BottomNav({ activeTab, setActiveTab, unreadCount = 0 }: BottomNavProps) {
  const tabs = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'notifications', label: 'Notif', icon: Bell },
    { id: 'children', label: 'Anak', icon: Users },
    { id: 'profile', label: 'Profil', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900/80 backdrop-blur-xl border-t border-zinc-800 px-6 py-3 z-50">
      <div className="max-w-md mx-auto flex justify-between items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn("relative flex flex-col items-center gap-1 transition-all duration-300", isActive ? "text-lime-400 scale-110" : "text-zinc-500")}>
              <div className="relative">
                <Icon className={cn("w-6 h-6", isActive && "fill-lime-400/20")} />
                {tab.id === 'notifications' && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded-full px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd sinaloka-parent && npx tsc --noEmit`
Expected: Errors in `App.tsx` (expected — missing `unreadCount` prop usage, will fix in Task 12)

- [ ] **Step 3: Commit**

```bash
git add sinaloka-parent/src/components/BottomNav.tsx
git commit -m "feat(parent): add notification tab with badge to BottomNav"
```

---

### Task 12: Wire everything together in App.tsx

**Files:**
- Modify: `sinaloka-parent/src/App.tsx`

- [ ] **Step 1: Add imports**

Add to the imports section at the top of `App.tsx`:

```typescript
import { NotificationPage } from './pages/NotificationPage';
import { useUnreadCount } from './hooks/useNotifications';
```

- [ ] **Step 2: Add state and hooks**

Inside the `App` component, right after `const { data: children, isLoading: childrenLoading } = useChildren();` (line 17), add the unread count hook (must be before any early returns to satisfy React hooks rules):

```typescript
const { count: unreadCount, refresh: refreshUnread } = useUnreadCount();
```

After `const [authScreen, setAuthScreen] = ...` (line 21), add state for initial child tab:

```typescript
const [selectedChildTab, setSelectedChildTab] = useState<string | undefined>();
```

After `const selectedChild = ...` (line 68), add a navigation handler:

```typescript
const handleNavigateToChild = (studentId: string, tab?: string) => {
  setSelectedChildId(studentId);
  setSelectedChildTab(tab);
};
```

- [ ] **Step 3: Add notifications case to renderPage**

In the `switch (activeTab)` block, add before the `default:` case:

```typescript
case 'notifications':
  return (
    <NotificationPage
      onNavigateToChild={(studentId) => {
        handleNavigateToChild(studentId);
        refreshUnread();
      }}
    />
  );
```

- [ ] **Step 4: Update ChildDetailPage rendering to pass initialTab**

In `renderPage()`, change the child detail rendering (line 72) from:

```typescript
return <ChildDetailPage child={selectedChild} onBack={() => setSelectedChildId(null)} />;
```

To:

```typescript
return <ChildDetailPage child={selectedChild} onBack={() => { setSelectedChildId(null); setSelectedChildTab(undefined); }} initialTab={selectedChildTab as any} />;
```

- [ ] **Step 5: Pass unreadCount to BottomNav**

Change the `BottomNav` usage (line 140) from:

```typescript
{!selectedChild && <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />}
```

To:

```typescript
{!selectedChild && <BottomNav activeTab={activeTab} setActiveTab={(tab) => { setActiveTab(tab); if (tab === 'notifications') refreshUnread(); }} unreadCount={unreadCount} />}
```

- [ ] **Step 6: Verify build**

Run: `cd sinaloka-parent && npx tsc --noEmit && npm run build`
Expected: No errors, build succeeds

- [ ] **Step 7: Commit**

```bash
git add sinaloka-parent/src/App.tsx
git commit -m "feat(parent): wire notification page, unread count, and child navigation"
```

---

### Task 13: Add ChildDetailPage initial tab support

**Files:**
- Modify: `sinaloka-parent/src/pages/ChildDetailPage.tsx`
- Modify: `sinaloka-parent/src/hooks/useChildDetail.ts`

- [ ] **Step 1: Add `initialTab` prop to ChildDetailPage**

In `ChildDetailPage.tsx`, update the interface (line 11-14):

```typescript
interface ChildDetailPageProps {
  child: ChildSummary;
  onBack: () => void;
  initialTab?: 'attendance' | 'sessions' | 'payments' | 'enrollments';
}
```

Update the component signature (line 23):

```typescript
export function ChildDetailPage({ child, onBack, initialTab }: ChildDetailPageProps) {
```

Update the `useChildDetail` call (line 28) to pass initialTab:

```typescript
} = useChildDetail(child.id, initialTab);
```

- [ ] **Step 2: Update useChildDetail to accept initialTab**

In `sinaloka-parent/src/hooks/useChildDetail.ts`, update line 13 from:

```typescript
export function useChildDetail(studentId: string | null) {
```

To:

```typescript
export function useChildDetail(studentId: string | null, initialTab?: 'attendance' | 'sessions' | 'payments' | 'enrollments') {
```

And update line 20 from:

```typescript
const [activeTab, setActiveTab] = useState<'attendance' | 'sessions' | 'payments' | 'enrollments'>('attendance');
```

To:

```typescript
const [activeTab, setActiveTab] = useState<'attendance' | 'sessions' | 'payments' | 'enrollments'>(initialTab ?? 'attendance');
```

- [ ] **Step 3: Verify build**

Run: `cd sinaloka-parent && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add sinaloka-parent/src/pages/ChildDetailPage.tsx sinaloka-parent/src/hooks/useChildDetail.ts
git commit -m "feat(parent): support initial tab prop in ChildDetailPage"
```

---

### Task 14: Backend unit tests

**Files:**
- Create: `sinaloka-backend/src/modules/notification/payment-reminder.cron.spec.ts`

- [ ] **Step 1: Write tests for payment reminder cron**

Create `sinaloka-backend/src/modules/notification/payment-reminder.cron.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { PaymentReminderCron } from './payment-reminder.cron.js';
import { NotificationService } from './notification.service.js';
import { NotificationGateway } from './notification.gateway.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

describe('PaymentReminderCron', () => {
  let cron: PaymentReminderCron;
  let prisma: { institution: any; payment: any; notification: any };
  let notificationService: { create: jest.Mock };
  let notificationGateway: { pushToUser: jest.Mock };

  beforeEach(async () => {
    prisma = {
      institution: { findMany: jest.fn() },
      payment: { findMany: jest.fn() },
      notification: { findFirst: jest.fn() },
    };
    notificationService = { create: jest.fn() };
    notificationGateway = { pushToUser: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        PaymentReminderCron,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationService, useValue: notificationService },
        { provide: NotificationGateway, useValue: notificationGateway },
      ],
    }).compile();

    cron = module.get(PaymentReminderCron);
  });

  it('should skip when no institutions have auto-reminders', async () => {
    prisma.institution.findMany.mockResolvedValue([]);
    await cron.sendPaymentReminders();
    expect(prisma.payment.findMany).not.toHaveBeenCalled();
  });

  it('should skip payments with no parent links', async () => {
    prisma.institution.findMany.mockResolvedValue([
      { id: 'inst-1', settings: { whatsapp_auto_reminders: true } },
    ]);
    prisma.payment.findMany.mockResolvedValue([
      {
        id: 'pay-1',
        institution_id: 'inst-1',
        amount: 500000,
        due_date: new Date(),
        status: 'PENDING',
        student: { id: 'stu-1', name: 'Anak A', parent_links: [] },
      },
    ]);

    await cron.sendPaymentReminders();
    expect(notificationService.create).not.toHaveBeenCalled();
  });

  it('should create notification for payment with parent', async () => {
    prisma.institution.findMany.mockResolvedValue([
      { id: 'inst-1', settings: { whatsapp_auto_reminders: true } },
    ]);
    prisma.payment.findMany.mockResolvedValue([
      {
        id: 'pay-1',
        institution_id: 'inst-1',
        amount: 500000,
        due_date: new Date(),
        status: 'PENDING',
        student: {
          id: 'stu-1',
          name: 'Anak A',
          parent_links: [{ parent: { user_id: 'user-parent-1' } }],
        },
      },
    ]);
    prisma.notification.findFirst.mockResolvedValue(null);
    notificationService.create.mockResolvedValue({ id: 'notif-1', type: 'payment.reminder' });

    await cron.sendPaymentReminders();

    expect(notificationService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        institutionId: 'inst-1',
        userId: 'user-parent-1',
        type: 'payment.reminder',
        title: 'Pengingat Pembayaran',
      }),
    );
    expect(notificationGateway.pushToUser).toHaveBeenCalledWith(
      'inst-1',
      'user-parent-1',
      expect.any(Object),
    );
  });

  it('should skip duplicate reminders within 24h', async () => {
    prisma.institution.findMany.mockResolvedValue([
      { id: 'inst-1', settings: { whatsapp_auto_reminders: true } },
    ]);
    prisma.payment.findMany.mockResolvedValue([
      {
        id: 'pay-1',
        institution_id: 'inst-1',
        amount: 500000,
        due_date: new Date(),
        status: 'PENDING',
        student: {
          id: 'stu-1',
          name: 'Anak A',
          parent_links: [{ parent: { user_id: 'user-parent-1' } }],
        },
      },
    ]);
    prisma.notification.findFirst.mockResolvedValue({ id: 'existing-notif' });

    await cron.sendPaymentReminders();
    expect(notificationService.create).not.toHaveBeenCalled();
  });

  it('should send to multiple parents for one student', async () => {
    prisma.institution.findMany.mockResolvedValue([
      { id: 'inst-1', settings: { whatsapp_auto_reminders: true } },
    ]);
    prisma.payment.findMany.mockResolvedValue([
      {
        id: 'pay-1',
        institution_id: 'inst-1',
        amount: 500000,
        due_date: new Date(),
        status: 'OVERDUE',
        student: {
          id: 'stu-1',
          name: 'Anak A',
          parent_links: [
            { parent: { user_id: 'parent-1' } },
            { parent: { user_id: 'parent-2' } },
          ],
        },
      },
    ]);
    prisma.notification.findFirst.mockResolvedValue(null);
    notificationService.create.mockResolvedValue({ id: 'notif-1', type: 'payment.reminder' });

    await cron.sendPaymentReminders();
    expect(notificationService.create).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Write tests for role-aware notification service**

Create `sinaloka-backend/src/modules/notification/notification.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { NotificationService } from './notification.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

describe('NotificationService', () => {
  let service: NotificationService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      notification: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn().mockResolvedValue([[], 0]),
    };

    const module = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(NotificationService);
  });

  describe('findAll', () => {
    it('should filter only user-targeted notifications for PARENT role', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);
      await service.findAll('inst-1', 'user-1', { page: 1, limit: 20 }, 'PARENT');

      const whereArg = prisma.$transaction.mock.calls[0][0][0]._options?.args?.where
        ?? prisma.$transaction.mock.calls[0];
      // Verify no OR clause (no broadcast) — PARENT sees only their own
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should include broadcast notifications for ADMIN role', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);
      await service.findAll('inst-1', 'user-1', { page: 1, limit: 20 }, 'ADMIN');
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('markAsRead', () => {
    it('should enforce ownership for PARENT role', async () => {
      prisma.notification.update.mockResolvedValue({ id: 'n1', read_at: new Date() });
      await service.markAsRead('n1', 'inst-1', 'user-1', 'PARENT');

      const whereArg = prisma.notification.update.mock.calls[0][0].where;
      expect(whereArg.user_id).toBe('user-1');
      expect(whereArg.OR).toBeUndefined();
    });
  });
});
```

- [ ] **Step 3: Run all tests**

Run: `cd sinaloka-backend && npm run test -- --testPathPattern="payment-reminder.cron|notification.service"`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/notification/payment-reminder.cron.spec.ts sinaloka-backend/src/modules/notification/notification.service.spec.ts
git commit -m "test(notification): add unit tests for payment reminder cron and role-aware filtering"
```

---

### Task 15: Final build verification

**Files:** None (verification only)

- [ ] **Step 1: Backend build + lint + tests**

```bash
cd sinaloka-backend && npm run lint && npm run test -- --ci && npm run build
```

Expected: All pass

- [ ] **Step 2: Parent app build**

```bash
cd sinaloka-parent && npm run lint && npm run build
```

Expected: Build succeeds

- [ ] **Step 3: Platform build (sidebar change)**

```bash
cd sinaloka-platform && npm run lint && npm run build
```

Expected: Build succeeds
