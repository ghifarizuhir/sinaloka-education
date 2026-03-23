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
        .filter(Boolean);

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

      const statusLabel =
        payment.status === 'OVERDUE' ? 'Terlambat' : 'Menunggu';

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
        } catch (error) {
          failed++;
          this.logger.error(
            `Failed to create reminder for payment ${payment.id}`,
            error,
          );
        }
      }
    }

    this.logger.log(
      `Payment reminders: ${sent} sent, ${skippedNoParent} skipped (no parent), ${skippedDedup} skipped (dedup), ${failed} failed`,
    );
  }
}
