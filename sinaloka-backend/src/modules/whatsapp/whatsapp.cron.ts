import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { WhatsappService } from './whatsapp.service.js';

@Injectable()
export class WhatsappCron {
  private readonly logger = new Logger(WhatsappCron.name);

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly prisma: PrismaService,
  ) {}

  // Daily at 09:00 WIB (UTC+7 = 02:00 UTC)
  @Cron('0 2 * * *')
  async sendPaymentReminders() {
    if (!this.whatsappService.isConfigured()) {
      return;
    }

    this.logger.log('Starting daily payment reminder job');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    // Load institutions that haven't opted out
    const institutions = await this.prisma.institution.findMany({
      select: { id: true, settings: true },
    });
    const activeInstitutionIds = institutions
      .filter((inst) => {
        const settings = inst.settings as Record<string, any> | null;
        return settings?.whatsapp_auto_reminders !== false;
      })
      .map((inst) => inst.id);

    if (activeInstitutionIds.length === 0) {
      this.logger.log('No institutions with auto-reminders enabled');
      return;
    }

    // Find payments needing reminders
    const payments = await this.prisma.payment.findMany({
      where: {
        institution_id: { in: activeInstitutionIds },
        OR: [
          { status: 'PENDING', due_date: { lte: tomorrow } },
          { status: 'OVERDUE' },
        ],
      },
      include: {
        student: { select: { name: true, parent_phone: true } },
      },
    });

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const payment of payments) {
      if (!payment.student.parent_phone) {
        skipped++;
        continue;
      }

      try {
        await this.whatsappService.sendPaymentReminder(
          payment.institution_id,
          payment.id,
        );
        sent++;
      } catch (error: any) {
        failed++;
        this.logger.error(
          `Failed to send reminder for payment ${payment.id}: ${error.message}`,
        );
      }
    }

    // Retry failed messages (transient failures, retry_count < 3)
    let retried = 0;
    const failedMessages = await this.prisma.whatsappMessage.findMany({
      where: {
        status: 'FAILED',
        retry_count: { lt: 3 },
        related_type: 'payment',
        created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        institution_id: { in: activeInstitutionIds },
      },
    });

    for (const msg of failedMessages) {
      if (!msg.related_id) continue;
      try {
        await this.whatsappService.sendPaymentReminder(
          msg.institution_id,
          msg.related_id,
        );
        retried++;
      } catch {
        // Already logged by service
      }
    }

    this.logger.log(
      `Payment reminders: ${sent} sent, ${skipped} skipped (no phone), ${failed} failed, ${retried} retried`,
    );
  }
}
