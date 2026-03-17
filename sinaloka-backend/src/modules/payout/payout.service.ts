import { Injectable, NotFoundException } from '@nestjs/common';
import { stringify } from 'csv-stringify/sync';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { buildPaginationMeta } from '../../common/dto/pagination.dto.js';
import type {
  CreatePayoutDto,
  UpdatePayoutDto,
  PayoutQueryDto,
  CalculatePayoutDto,
} from './payout.dto.js';

@Injectable()
export class PayoutService {
  constructor(private readonly prisma: PrismaService) {}

  async create(institutionId: string, dto: CreatePayoutDto) {
    const payout = await this.prisma.payout.create({
      data: { ...dto, institution_id: institutionId },
      include: { tutor: { include: { user: { select: { name: true } } } } },
    });
    return this.flattenPayoutTutor(payout);
  }

  async findAll(institutionId: string, query: PayoutQueryDto) {
    const { page, limit, tutor_id, status, sort_by, sort_order } = query;
    const where: any = { institution_id: institutionId };
    if (tutor_id) where.tutor_id = tutor_id;
    if (status) where.status = status;

    const [rawData, total] = await Promise.all([
      this.prisma.payout.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sort_by]: sort_order },
        include: { tutor: { include: { user: { select: { name: true } } } } },
      }),
      this.prisma.payout.count({ where }),
    ]);

    const data = rawData.map((p) => this.flattenPayoutTutor(p));

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async findOne(institutionId: string, id: string) {
    const payout = await this.prisma.payout.findFirst({
      where: { id, institution_id: institutionId },
      include: { tutor: { include: { user: { select: { name: true } } } } },
    });

    if (!payout) {
      throw new NotFoundException(`Payout with id ${id} not found`);
    }

    return this.flattenPayoutTutor(payout);
  }

  async update(institutionId: string, id: string, dto: UpdatePayoutDto) {
    await this.findOne(institutionId, id);
    const payout = await this.prisma.payout.update({
      where: { id },
      data: dto,
      include: { tutor: { include: { user: { select: { name: true } } } } },
    });
    return this.flattenPayoutTutor(payout);
  }

  async delete(institutionId: string, id: string) {
    await this.findOne(institutionId, id);
    return this.prisma.payout.delete({ where: { id } });
  }

  async findByTutor(institutionId: string, tutorId: string, query: PayoutQueryDto) {
    const { page, limit, status, sort_by, sort_order } = query;
    const where: any = { institution_id: institutionId, tutor_id: tutorId };
    if (status) where.status = status;

    const [rawData, total] = await Promise.all([
      this.prisma.payout.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sort_by]: sort_order },
        include: { tutor: { include: { user: { select: { name: true } } } } },
      }),
      this.prisma.payout.count({ where }),
    ]);

    const data = rawData.map((p) => this.flattenPayoutTutor(p));

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async exportAudit(institutionId: string, payoutId: string): Promise<string> {
    const payout = await this.prisma.payout.findFirst({
      where: { id: payoutId, institution_id: institutionId },
      include: {
        tutor: { include: { user: { select: { name: true } } } },
      },
    });

    if (!payout) {
      throw new NotFoundException(`Payout with id ${payoutId} not found`);
    }

    const tutorName = payout.tutor?.user?.name ?? '';
    const bankName = payout.tutor?.bank_name ?? '';
    const bankAccount = payout.tutor?.bank_account_number ?? '';

    const sessions =
      payout.period_start && payout.period_end
        ? await this.prisma.session.findMany({
            where: {
              institution_id: institutionId,
              class: { tutor_id: payout.tutor_id },
              status: 'COMPLETED',
              tutor_fee_amount: { not: null },
              date: { gte: payout.period_start, lte: payout.period_end },
            },
            include: { class: { select: { name: true } } },
            orderBy: { date: 'asc' },
          })
        : [];

    const summaryRows = [
      ['Payout ID', payout.id],
      ['Tutor', tutorName],
      ['Bank', bankName],
      ['Account', bankAccount],
      ['Date', payout.date.toISOString().split('T')[0]],
      ['Period Start', payout.period_start?.toISOString().split('T')[0] ?? ''],
      ['Period End', payout.period_end?.toISOString().split('T')[0] ?? ''],
      ['Amount', String(Number(payout.amount))],
      ['Status', payout.status],
      ['Description', payout.description ?? ''],
      [],
      ['--- Session Breakdown ---', ''],
      ['Date', 'Class', 'Fee'],
      ...sessions.map((s) => [
        s.date.toISOString().split('T')[0],
        s.class?.name ?? '',
        String(Number(s.tutor_fee_amount ?? 0)),
      ]),
    ];

    return stringify(summaryRows);
  }

  /** Flatten nested tutor.user.name into tutor.name for frontend consumption */
  private flattenPayoutTutor(payout: any) {
    if (!payout.tutor) return payout;
    const { user, ...tutorRest } = payout.tutor;
    return {
      ...payout,
      tutor: {
        id: tutorRest.id,
        name: user?.name ?? '',
        bank_name: tutorRest.bank_name,
        bank_account_number: tutorRest.bank_account_number,
      },
    };
  }

  async calculatePayout(institutionId: string, params: CalculatePayoutDto) {
    const tutor = await this.prisma.tutor.findFirst({
      where: { id: params.tutor_id, institution_id: institutionId },
      include: { user: { select: { name: true } } },
    });

    if (!tutor) {
      throw new NotFoundException('Tutor not found');
    }

    const sessions = await this.prisma.session.findMany({
      where: {
        institution_id: institutionId,
        class: { tutor_id: params.tutor_id },
        status: 'COMPLETED',
        tutor_fee_amount: { not: null },
        date: { gte: params.period_start, lte: params.period_end },
      },
      include: { class: { select: { name: true } } },
      orderBy: { date: 'asc' },
    });

    const calculated_amount = sessions.reduce(
      (sum, s) => sum + Number(s.tutor_fee_amount ?? 0),
      0,
    );

    const overlapping = await this.prisma.payout.findFirst({
      where: {
        tutor_id: params.tutor_id,
        institution_id: institutionId,
        period_start: { not: null, lte: params.period_end },
        period_end: { not: null, gte: params.period_start },
      },
    });

    const overlap_warning = overlapping
      ? `Existing payout (${Number(overlapping.amount).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })}) covers ${overlapping.period_start?.toISOString().split('T')[0]} to ${overlapping.period_end?.toISOString().split('T')[0]}`
      : null;

    return {
      tutor_id: params.tutor_id,
      tutor_name: tutor.user.name,
      period_start: params.period_start,
      period_end: params.period_end,
      sessions: sessions.map((s) => ({
        session_id: s.id,
        class_name: s.class.name,
        date: s.date,
        tutor_fee_amount: Number(s.tutor_fee_amount),
      })),
      total_sessions: sessions.length,
      calculated_amount,
      overlap_warning,
    };
  }

  async generateMonthlySalaries(institutionId: string) {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const salaryPrefix = `Salary: ${monthKey}`;

    const tutors = await this.prisma.tutor.findMany({
      where: {
        institution_id: institutionId,
        monthly_salary: { not: null, gt: 0 },
      },
      include: { user: { select: { name: true } } },
    });

    let created = 0;
    for (const tutor of tutors) {
      const existing = await this.prisma.payout.findFirst({
        where: {
          tutor_id: tutor.id,
          institution_id: institutionId,
          description: { startsWith: salaryPrefix },
        },
      });

      if (existing) continue;

      await this.prisma.payout.create({
        data: {
          institution_id: institutionId,
          tutor_id: tutor.id,
          amount: tutor.monthly_salary!,
          date: now,
          status: 'PENDING',
          description: `${salaryPrefix} - ${tutor.user.name}`,
        },
      });
      created++;
    }

    return { created };
  }
}
