import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { EmailService } from '../email/email.service.js';
import { GRACE_PERIOD_DAYS, REMINDER_TIERS } from './subscription.constants.js';
import { Role } from '../../../generated/prisma/client.js';

@Injectable()
export class SubscriptionCronService {
  private readonly logger = new Logger(SubscriptionCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  // Daily at midnight UTC
  @Cron('0 0 * * *')
  async handleSubscriptionLifecycle() {
    this.logger.log('Starting subscription lifecycle cron job');

    await this.transitionActiveToGracePeriod();
    await this.transitionGracePeriodToExpired();
    await this.sendExpiryReminders();

    this.logger.log('Subscription lifecycle cron job completed');
  }

  // Step 1: ACTIVE → GRACE_PERIOD
  private async transitionActiveToGracePeriod() {
    const now = new Date();

    const expiredActiveSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        expires_at: { lt: now },
      },
      include: {
        institution: {
          include: {
            users: {
              where: { role: Role.ADMIN },
              select: { email: true },
            },
          },
        },
      },
    });

    this.logger.log(
      `Step 1: Found ${expiredActiveSubscriptions.length} ACTIVE subscriptions past expiry`,
    );

    let transitioned = 0;
    let failed = 0;

    for (const subscription of expiredActiveSubscriptions) {
      const graceEndsAt = new Date(subscription.expires_at);
      graceEndsAt.setDate(graceEndsAt.getDate() + GRACE_PERIOD_DAYS);

      const admins = subscription.institution.users;

      // Email first, then DB update only if email succeeded
      let emailSent = admins.length === 0;
      for (const admin of admins) {
        try {
          await this.emailService.sendSubscriptionGracePeriodNotification(
            admin.email,
            graceEndsAt,
          );
          emailSent = true;
        } catch (error: any) {
          this.logger.error(
            `Failed to send grace period email to ${admin.email} for subscription ${subscription.id}: ${error.message}`,
          );
        }
      }

      if (!emailSent) {
        failed++;
        continue;
      }

      // Update DB (idempotent via status condition)
      try {
        const result = await this.prisma.subscription.updateMany({
          where: { id: subscription.id, status: 'ACTIVE' },
          data: {
            status: 'GRACE_PERIOD',
            grace_ends_at: graceEndsAt,
          },
        });
        if (result.count > 0) {
          transitioned++;
          this.logger.log(
            `Subscription ${subscription.id} transitioned ACTIVE → GRACE_PERIOD`,
          );
        }
      } catch (error: any) {
        failed++;
        this.logger.error(
          `Failed to update subscription ${subscription.id} to GRACE_PERIOD: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Step 1 complete: ${transitioned} transitioned, ${failed} failed`,
    );
  }

  // Step 2: GRACE_PERIOD → EXPIRED + downgrade institution to STARTER
  private async transitionGracePeriodToExpired() {
    const now = new Date();

    const expiredGraceSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'GRACE_PERIOD',
        grace_ends_at: { lt: now },
      },
      include: {
        institution: {
          include: {
            users: {
              where: { role: Role.ADMIN },
              select: { email: true },
            },
          },
        },
      },
    });

    this.logger.log(
      `Step 2: Found ${expiredGraceSubscriptions.length} GRACE_PERIOD subscriptions past grace end`,
    );

    let downgraded = 0;
    let failed = 0;

    for (const subscription of expiredGraceSubscriptions) {
      const admins = subscription.institution.users;

      // Email first, then DB update only if email succeeded
      let emailSent = admins.length === 0;
      for (const admin of admins) {
        try {
          await this.emailService.sendSubscriptionDowngradeNotification(
            admin.email,
          );
          emailSent = true;
        } catch (error: any) {
          this.logger.error(
            `Failed to send downgrade email to ${admin.email} for subscription ${subscription.id}: ${error.message}`,
          );
        }
      }

      if (!emailSent) {
        failed++;
        continue;
      }

      // Update subscription + institution in transaction (idempotent via status condition)
      try {
        const autoDowngradedAt = new Date();
        const [updateResult] = await this.prisma.$transaction([
          this.prisma.subscription.updateMany({
            where: { id: subscription.id, status: 'GRACE_PERIOD' },
            data: {
              status: 'EXPIRED',
              auto_downgraded_at: autoDowngradedAt,
            },
          }),
          this.prisma.institution.update({
            where: { id: subscription.institution_id },
            data: {
              plan_type: 'STARTER',
              plan_limit_reached_at: null,
            },
          }),
        ]);

        if (updateResult.count > 0) {
          downgraded++;
          this.logger.log(
            `Subscription ${subscription.id} transitioned GRACE_PERIOD → EXPIRED, institution ${subscription.institution_id} downgraded to STARTER`,
          );
        }
      } catch (error: any) {
        failed++;
        this.logger.error(
          `Failed to expire/downgrade subscription ${subscription.id}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Step 2 complete: ${downgraded} downgraded, ${failed} failed`,
    );
  }

  // Step 3: Send reminders for ACTIVE subscriptions expiring within 7 days
  private async sendExpiryReminders() {
    const now = new Date();
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);

    const upcomingSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        expires_at: { gte: now, lte: in7Days },
      },
      include: {
        institution: {
          select: {
            plan_type: true,
            users: {
              where: { role: Role.ADMIN },
              select: { email: true },
            },
          },
        },
      },
    });

    this.logger.log(
      `Step 3: Found ${upcomingSubscriptions.length} ACTIVE subscriptions expiring within 7 days`,
    );

    let reminded = 0;
    let skipped = 0;
    let failed = 0;

    for (const subscription of upcomingSubscriptions) {
      const msRemaining = subscription.expires_at.getTime() - now.getTime();
      const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

      // Find the matching reminder tier (1, 3, or 7)
      // Use ascending order so we find the tightest tier first:
      // e.g. daysRemaining=1 → tier=1, daysRemaining=3 → tier=3, daysRemaining=5 → tier=7
      const tier = ([1, 3, 7] as number[]).find(
        (t) => daysRemaining <= t,
      );
      if (tier === undefined) {
        skipped++;
        continue;
      }

      // Skip if already sent this tier or a more urgent one (lower value = more urgent)
      if (
        subscription.last_reminder_tier !== null &&
        subscription.last_reminder_tier !== undefined &&
        subscription.last_reminder_tier <= tier
      ) {
        skipped++;
        continue;
      }

      const admins = subscription.institution.users;
      const planType = subscription.institution.plan_type;

      // Email first, then DB update
      let emailSent = admins.length === 0;
      for (const admin of admins) {
        try {
          await this.emailService.sendSubscriptionReminder(
            admin.email,
            planType,
            subscription.expires_at,
            daysRemaining,
          );
          emailSent = true;
        } catch (error: any) {
          this.logger.error(
            `Failed to send reminder email to ${admin.email} for subscription ${subscription.id}: ${error.message}`,
          );
        }
      }

      if (emailSent) {
        try {
          await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: { last_reminder_tier: tier },
          });
          reminded++;
          this.logger.log(
            `Reminder sent for subscription ${subscription.id} at tier ${tier} (${daysRemaining} days remaining)`,
          );
        } catch (error: any) {
          failed++;
          this.logger.error(
            `Failed to update last_reminder_tier for subscription ${subscription.id}: ${error.message}`,
          );
        }
      } else {
        failed++;
      }
    }

    this.logger.log(
      `Step 3 complete: ${reminded} reminded, ${skipped} skipped, ${failed} failed`,
    );
  }
}
