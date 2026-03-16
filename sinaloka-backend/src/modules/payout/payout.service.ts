import { Injectable, NotFoundException } from '@nestjs/common';
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
}
