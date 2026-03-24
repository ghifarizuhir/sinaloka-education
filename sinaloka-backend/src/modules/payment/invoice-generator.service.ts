import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';

interface PerSessionPaymentParams {
  institutionId: string;
  studentId: string;
  sessionId: string;
  classId: string;
}

interface MonthlyPaymentParams {
  institutionId: string;
}

interface MidMonthEnrollmentParams {
  institutionId: string;
  studentId: string;
  enrollmentId: string;
  classId: string;
  enrolledAt: Date;
}

@Injectable()
export class InvoiceGeneratorService {
  private readonly logger = new Logger(InvoiceGeneratorService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generatePerSessionPayment(
    params: PerSessionPaymentParams,
  ): Promise<void> {
    try {
      const institution = await this.prisma.institution.findUnique({
        where: { id: params.institutionId },
        select: { billing_mode: true },
      });
      if (institution?.billing_mode !== 'PER_SESSION') return;

      const session = await this.prisma.session.findFirst({
        where: { id: params.sessionId, institution_id: params.institutionId },
        select: { date: true },
      });
      if (!session) return;

      const sessionDateStr = new Date(session.date)
        .toISOString()
        .split('T')[0];

      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          student_id: params.studentId,
          class_id: params.classId,
          status: { in: ['ACTIVE', 'TRIAL'] },
        },
      });
      if (!enrollment) return;

      // Per-session uses notes-based dedup (billing_period is null).
      // @@unique([enrollment_id, billing_period]) does NOT protect when billing_period is NULL.
      // This is intentional — per-session dedup uses notes; monthly uses billing_period.
      const existing = await this.prisma.payment.findFirst({
        where: {
          enrollment_id: enrollment.id,
          notes: { contains: `Auto: Session ${sessionDateStr}` },
        },
      });
      if (existing) return;

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
        `Per-session payment created: student=${params.studentId}, session=${sessionDateStr}`,
      );
    } catch (error) {
      this.logger.error(`Failed to generate per-session payment: ${error}`);
    }
  }

  async generateMonthlyPayments(
    params: MonthlyPaymentParams,
  ): Promise<{ created: number }> {
    const institution = await this.prisma.institution.findUnique({
      where: { id: params.institutionId },
      select: { billing_mode: true },
    });
    if (institution?.billing_mode !== 'MONTHLY_FIXED') return { created: 0 };

    const now = new Date();
    const billingPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const dueDate = new Date(now.getFullYear(), now.getMonth(), 1);

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        institution_id: params.institutionId,
        status: { in: ['ACTIVE', 'TRIAL'] },
      },
      include: { class: { select: { fee: true } } },
    });

    let created = 0;

    for (const enrollment of enrollments) {
      try {
        await this.prisma.payment.create({
          data: {
            institution_id: params.institutionId,
            student_id: enrollment.student_id,
            enrollment_id: enrollment.id,
            amount: enrollment.class.fee,
            due_date: dueDate,
            billing_period: billingPeriod,
            status: 'PENDING',
            notes: `Auto: Monthly ${billingPeriod}`,
          },
        });
        created++;
      } catch (error: any) {
        if (error?.code === 'P2002') continue;
        this.logger.error(
          `Failed to create monthly payment for enrollment ${enrollment.id}: ${error}`,
        );
      }
    }

    this.logger.log(
      `Monthly payments for ${params.institutionId}: ${created} created for ${billingPeriod}`,
    );
    return { created };
  }

  async generateMidMonthEnrollmentPayment(
    params: MidMonthEnrollmentParams,
  ): Promise<void> {
    try {
      const institution = await this.prisma.institution.findUnique({
        where: { id: params.institutionId },
        select: { billing_mode: true },
      });
      if (institution?.billing_mode !== 'MONTHLY_FIXED') return;

      const now = new Date(params.enrolledAt);
      const billingPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const classRecord = await this.prisma.class.findFirst({
        where: { id: params.classId, institution_id: params.institutionId },
        select: { fee: true },
      });
      if (!classRecord) return;

      const dueDate = new Date(params.enrolledAt);
      dueDate.setDate(dueDate.getDate() + 7);

      await this.prisma.payment.create({
        data: {
          institution_id: params.institutionId,
          student_id: params.studentId,
          enrollment_id: params.enrollmentId,
          amount: classRecord.fee,
          due_date: dueDate,
          billing_period: billingPeriod,
          status: 'PENDING',
          notes: `Auto: Monthly ${billingPeriod} (mid-month enrollment)`,
        },
      });

      this.logger.log(
        `Mid-month enrollment payment created: enrollment=${params.enrollmentId}`,
      );
    } catch (error: any) {
      if (error?.code === 'P2002') return;
      this.logger.error(
        `Failed to generate mid-month enrollment payment: ${error}`,
      );
    }
  }
}
