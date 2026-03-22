import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { buildPaginationMeta } from '../../common/dto/pagination.dto.js';
import { SettingsService } from '../settings/settings.service.js';
import { NOTIFICATION_EVENTS } from '../notification/notification.events.js';
import type {
  CreatePaymentDto,
  UpdatePaymentDto,
  PaymentQueryDto,
  BatchRecordPaymentDto,
} from './payment.dto.js';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(institutionId: string, dto: CreatePaymentDto) {
    return this.prisma.payment.create({
      data: { ...dto, institution_id: institutionId },
    });
  }

  async findAll(institutionId: string, query: PaymentQueryDto) {
    // Auto-detect overdue payments
    await this.refreshOverdueStatus(institutionId);

    const { page, limit, status, student_id, sort_by, sort_order } = query;
    const where: any = { institution_id: institutionId };
    if (status) where.status = status;
    if (student_id) where.student_id = student_id;

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sort_by]: sort_order },
        include: { student: true, enrollment: { include: { class: true } } },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async findOne(institutionId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, institution_id: institutionId },
      include: { student: true, enrollment: { include: { class: true } } },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with id ${id} not found`);
    }

    return payment;
  }

  async update(institutionId: string, id: string, dto: UpdatePaymentDto) {
    const payment = await this.findOne(institutionId, id);
    const updated = await this.prisma.payment.update({
      where: { id },
      data: dto,
    });

    // Sync enrollment payment_status when payment status changes
    if (dto.status && dto.status !== payment.status) {
      await this.syncEnrollmentPaymentStatus(payment.enrollment_id);
    }

    return updated;
  }

  async delete(institutionId: string, id: string) {
    await this.findOne(institutionId, id);
    return this.prisma.payment.delete({ where: { id } });
  }

  /**
   * Derive enrollment payment_status from its payments:
   * - All PAID → PAID
   * - Any OVERDUE → OVERDUE
   * - Any PENDING → PENDING
   * - No payments → NEW
   */
  private async syncEnrollmentPaymentStatus(enrollmentId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { enrollment_id: enrollmentId },
      select: { status: true },
    });

    if (payments.length === 0) return;

    const statuses = payments.map((p) => p.status);
    let derivedStatus: string;

    if (statuses.every((s) => s === 'PAID')) {
      derivedStatus = 'PAID';
    } else if (statuses.some((s) => s === 'OVERDUE')) {
      derivedStatus = 'OVERDUE';
    } else if (statuses.some((s) => s === 'PENDING')) {
      derivedStatus = 'PENDING';
    } else {
      derivedStatus = 'NEW';
    }

    await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { payment_status: derivedStatus as any },
    });
  }

  async refreshOverdueStatus(institutionId: string): Promise<number> {
    // Compare against start of today (date-only) so payments due today are NOT overdue
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.prisma.payment.updateMany({
      where: {
        institution_id: institutionId,
        status: 'PENDING',
        due_date: { lt: today },
      },
      data: { status: 'OVERDUE' },
    });
    return result.count;
  }

  async batchRecord(institutionId: string, dto: BatchRecordPaymentDto) {
    const count = await this.prisma.payment.count({
      where: {
        id: { in: dto.payment_ids },
        institution_id: institutionId,
        status: { in: ['PENDING', 'OVERDUE'] },
      },
    });

    if (count !== dto.payment_ids.length) {
      throw new NotFoundException(
        'One or more payments not found or not eligible for recording',
      );
    }

    // Get enrollment IDs before batch update
    const payments = await this.prisma.payment.findMany({
      where: { id: { in: dto.payment_ids }, institution_id: institutionId },
      select: { enrollment_id: true },
    });
    const enrollmentIds = [...new Set(payments.map((p) => p.enrollment_id))];

    const result = await this.prisma.payment.updateMany({
      where: {
        id: { in: dto.payment_ids },
        institution_id: institutionId,
      },
      data: {
        status: 'PAID',
        paid_date: dto.paid_date,
        method: dto.method,
      },
    });

    // Sync enrollment payment_status for all affected enrollments
    for (const enrollmentId of enrollmentIds) {
      await this.syncEnrollmentPaymentStatus(enrollmentId);
    }

    // Emit payment received events for each recorded payment
    const recordedPayments = await this.prisma.payment.findMany({
      where: { id: { in: dto.payment_ids }, institution_id: institutionId },
      include: { student: { select: { name: true } } },
    });
    for (const payment of recordedPayments) {
      this.eventEmitter.emit(NOTIFICATION_EVENTS.PAYMENT_RECEIVED, {
        institutionId,
        paymentId: payment.id,
        studentName: payment.student?.name ?? 'Unknown',
        amount: Number(payment.amount),
      });
    }

    return { updated: result.count };
  }

  async remind(institutionId: string, paymentId: string) {
    const payment = await this.findOne(institutionId, paymentId);
    return {
      reminded: true,
      method: 'logged',
      payment_id: payment.id,
      student_id: payment.student_id,
    };
  }

  async getOverdueSummary(institutionId: string) {
    await this.refreshOverdueStatus(institutionId);

    const billing = await this.settingsService.getBilling(institutionId);

    const overdueByStudent = await this.prisma.payment.groupBy({
      by: ['student_id'],
      where: { institution_id: institutionId, status: 'OVERDUE' },
      _sum: { amount: true },
      _count: { id: true },
    });

    const overdue_count = overdueByStudent.reduce(
      (sum, s) => sum + s._count.id,
      0,
    );
    const total_overdue_amount = overdueByStudent.reduce(
      (sum, s) => sum + Number(s._sum.amount ?? 0),
      0,
    );

    let flaggedStudentIds = overdueByStudent.map((s) => s.student_id);
    if (billing.late_payment_auto_lock && billing.late_payment_threshold > 0) {
      flaggedStudentIds = overdueByStudent
        .filter(
          (s) => Number(s._sum.amount ?? 0) >= billing.late_payment_threshold,
        )
        .map((s) => s.student_id);
    }

    const students =
      flaggedStudentIds.length > 0
        ? await this.prisma.student.findMany({
            where: { id: { in: flaggedStudentIds } },
            select: { id: true, name: true },
          })
        : [];

    const studentMap = new Map(students.map((s) => [s.id, s.name]));

    const flagged_students = overdueByStudent
      .filter((s) => flaggedStudentIds.includes(s.student_id))
      .map((s) => ({
        student_id: s.student_id,
        student_name: studentMap.get(s.student_id) ?? 'Unknown',
        total_debt: Number(s._sum.amount ?? 0),
        overdue_payments: s._count.id,
      }))
      .sort((a, b) => b.total_debt - a.total_debt);

    return { overdue_count, total_overdue_amount, flagged_students };
  }
}
