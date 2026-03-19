import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';

interface PerSessionPaymentParams {
  institutionId: string;
  studentId: string;
  sessionId: string;
  classId: string;
}

interface PackagePaymentParams {
  institutionId: string;
  studentId: string;
  enrollmentId: string;
  classId: string;
  enrolledAt: Date;
}

@Injectable()
export class InvoiceGeneratorService {
  private readonly logger = new Logger(InvoiceGeneratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  async generatePerSessionPayment(
    params: PerSessionPaymentParams,
  ): Promise<void> {
    try {
      const billing = await this.settingsService.getBilling(
        params.institutionId,
      );
      if (billing.billing_mode !== 'per_session') return;

      // Look up the session to get the date
      const session = await this.prisma.session.findFirst({
        where: { id: params.sessionId, institution_id: params.institutionId },
        select: { date: true },
      });
      if (!session) return;

      const sessionDateStr = new Date(session.date).toISOString().split('T')[0];

      // Look up enrollment for this student + class
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          student_id: params.studentId,
          class_id: params.classId,
          status: { in: ['ACTIVE', 'TRIAL'] },
        },
      });
      if (!enrollment) return;

      // Duplicate check: payment already exists for this enrollment + session date
      const existing = await this.prisma.payment.findFirst({
        where: {
          enrollment_id: enrollment.id,
          notes: { contains: `Auto: Session ${sessionDateStr}` },
        },
      });
      if (existing) return;

      // Get class fee
      const classRecord = await this.prisma.class.findFirst({
        where: { id: params.classId, institution_id: params.institutionId },
        select: { fee: true },
      });
      if (!classRecord) return;

      await this.prisma.payment.create({
        data: {
          institution_id: params.institutionId,
          student_id: params.studentId,
          enrollment_id: enrollment.id,
          amount: classRecord.fee,
          due_date: session.date,
          status: 'PENDING',
          notes: `Auto: Session ${sessionDateStr}`,
        },
      });

      this.logger.log(
        `Auto-payment created for student ${params.studentId}, session ${sessionDateStr}`,
      );
    } catch (error) {
      this.logger.error(`Failed to generate per-session payment: ${error}`);
    }
  }

  async generatePackagePayment(params: PackagePaymentParams): Promise<void> {
    try {
      const billing = await this.settingsService.getBilling(
        params.institutionId,
      );
      if (billing.billing_mode !== 'package') return;

      // Duplicate check
      const existing = await this.prisma.payment.findFirst({
        where: {
          enrollment_id: params.enrollmentId,
          notes: { startsWith: 'Auto: Package' },
        },
      });
      if (existing) return;

      // Get class fee
      const classRecord = await this.prisma.class.findFirst({
        where: { id: params.classId, institution_id: params.institutionId },
        select: { fee: true, package_fee: true },
      });
      if (!classRecord) return;

      const amount = classRecord.package_fee ?? classRecord.fee;
      const dueDate = new Date(params.enrolledAt);
      dueDate.setDate(dueDate.getDate() + 7);

      await this.prisma.payment.create({
        data: {
          institution_id: params.institutionId,
          student_id: params.studentId,
          enrollment_id: params.enrollmentId,
          amount,
          due_date: dueDate,
          status: 'PENDING',
          notes: 'Auto: Package enrollment',
        },
      });

      this.logger.log(
        `Auto-package payment created for enrollment ${params.enrollmentId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to generate package payment: ${error}`);
    }
  }

  async generateSubscriptionPayments(params: {
    institutionId: string;
  }): Promise<{ created: number }> {
    const billing = await this.settingsService.getBilling(params.institutionId);
    if (billing.billing_mode !== 'subscription') return { created: 0 };

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        institution_id: params.institutionId,
        status: { in: ['ACTIVE', 'TRIAL'] },
      },
      include: { class: { select: { fee: true } } },
    });

    let created = 0;

    for (const enrollment of enrollments) {
      const existing = await this.prisma.payment.findFirst({
        where: {
          enrollment_id: enrollment.id,
          notes: { startsWith: `Auto: Subscription ${monthKey}` },
        },
      });
      if (existing) continue;

      const dueDate = new Date(now.getFullYear(), now.getMonth(), 1);

      await this.prisma.payment.create({
        data: {
          institution_id: params.institutionId,
          student_id: enrollment.student_id,
          enrollment_id: enrollment.id,
          amount: enrollment.class.fee,
          due_date: dueDate,
          status: 'PENDING',
          notes: `Auto: Subscription ${monthKey}`,
        },
      });

      created++;
    }

    this.logger.log(
      `Subscription payments generated for ${params.institutionId}: ${created} created for ${monthKey}`,
    );

    return { created };
  }
}
