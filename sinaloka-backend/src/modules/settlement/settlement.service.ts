import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { calculateFee } from './fee-rates.js';
import type {
  SettlementQueryDto,
  TransferSettlementDto,
  BatchTransferDto,
  ReportQueryDto,
} from './settlement.dto.js';
import { buildPaginationMeta } from '../../common/dto/pagination.dto.js';

@Injectable()
export class SettlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async createFromPayment(
    paymentId: string,
    institutionId: string,
    grossAmount: number,
    paymentType: string,
  ) {
    const { midtransFee, transferAmount, platformCost } = calculateFee(
      grossAmount,
      paymentType,
      this.configService,
    );

    return this.prisma.settlement.create({
      data: {
        institution_id: institutionId,
        payment_id: paymentId,
        gross_amount: grossAmount,
        midtrans_fee: midtransFee,
        transfer_amount: transferAmount,
        platform_cost: platformCost,
        status: 'PENDING',
      },
    });
  }

  async findAll(query: SettlementQueryDto) {
    const { page, limit, institution_id, status, from, to } = query;
    const where: Record<string, unknown> = {};
    if (institution_id) where.institution_id = institution_id;
    if (status) where.status = status;
    if (from || to) {
      where.created_at = {
        ...(from && { gte: from }),
        ...(to && { lte: to }),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.settlement.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          institution: { select: { id: true, name: true } },
          payment: {
            select: {
              id: true,
              amount: true,
              student: { select: { id: true, name: true } },
              midtrans_payment_type: true,
            },
          },
        },
      }),
      this.prisma.settlement.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async getSummary() {
    const institutions = await this.prisma.settlement.groupBy({
      by: ['institution_id', 'status'],
      _sum: { transfer_amount: true, platform_cost: true },
      _count: { id: true },
    });

    const institutionIds = [
      ...new Set(institutions.map((i) => i.institution_id)),
    ];
    const institutionNames = await this.prisma.institution.findMany({
      where: { id: { in: institutionIds } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(institutionNames.map((i) => [i.id, i.name]));

    const grouped: Record<
      string,
      {
        institution_id: string;
        institution_name: string;
        pending_count: number;
        pending_amount: number;
        transferred_count: number;
        transferred_amount: number;
        total_platform_cost: number;
      }
    > = {};

    for (const row of institutions) {
      if (!grouped[row.institution_id]) {
        grouped[row.institution_id] = {
          institution_id: row.institution_id,
          institution_name: nameMap.get(row.institution_id) ?? 'Unknown',
          pending_count: 0,
          pending_amount: 0,
          transferred_count: 0,
          transferred_amount: 0,
          total_platform_cost: 0,
        };
      }
      const entry = grouped[row.institution_id];
      const amount = Number(row._sum.transfer_amount ?? 0);
      const cost = Number(row._sum.platform_cost ?? 0);

      if (row.status === 'PENDING') {
        entry.pending_count = row._count.id;
        entry.pending_amount = amount;
      } else {
        entry.transferred_count = row._count.id;
        entry.transferred_amount = amount;
      }
      entry.total_platform_cost += cost;
    }

    const list = Object.values(grouped);
    return {
      institutions: list,
      totals: {
        total_pending: list.reduce((s, i) => s + i.pending_amount, 0),
        total_transferred: list.reduce((s, i) => s + i.transferred_amount, 0),
        total_platform_cost: list.reduce(
          (s, i) => s + i.total_platform_cost,
          0,
        ),
      },
    };
  }

  async markTransferred(
    id: string,
    dto: TransferSettlementDto,
    userId: string,
  ) {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id },
    });
    if (!settlement) throw new NotFoundException('Settlement not found');
    if (settlement.status === 'TRANSFERRED') {
      throw new BadRequestException('Settlement already transferred');
    }

    return this.prisma.settlement.update({
      where: { id },
      data: {
        status: 'TRANSFERRED',
        transferred_at: dto.transferred_at,
        transferred_by: userId,
        notes: dto.notes,
      },
    });
  }

  async batchTransfer(dto: BatchTransferDto, userId: string) {
    const count = await this.prisma.settlement.count({
      where: { id: { in: dto.settlement_ids }, status: 'PENDING' },
    });

    if (count !== dto.settlement_ids.length) {
      throw new BadRequestException(
        'Some settlements not found or already transferred',
      );
    }

    const result = await this.prisma.settlement.updateMany({
      where: { id: { in: dto.settlement_ids }, status: 'PENDING' },
      data: {
        status: 'TRANSFERRED',
        transferred_at: dto.transferred_at,
        transferred_by: userId,
        notes: dto.notes,
      },
    });

    return { updated: result.count };
  }

  async getReport(query: ReportQueryDto) {
    const [year, month] = query.period.split('-').map(Number);
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0, 23, 59, 59);

    const institution = await this.prisma.institution.findUnique({
      where: { id: query.institution_id },
      select: { name: true },
    });

    if (!institution) throw new NotFoundException('Institution not found');

    const settlements = await this.prisma.settlement.findMany({
      where: {
        institution_id: query.institution_id,
        created_at: { gte: from, lte: to },
      },
      orderBy: { created_at: 'asc' },
      include: {
        payment: {
          select: {
            student: { select: { name: true } },
            midtrans_payment_type: true,
          },
        },
      },
    });

    const transactions = settlements.map((s) => ({
      date: s.created_at,
      student_name: s.payment.student?.name ?? 'Unknown',
      payment_type: s.payment.midtrans_payment_type,
      gross_amount: Number(s.gross_amount),
      midtrans_fee: Number(s.midtrans_fee),
      transfer_amount: Number(s.transfer_amount),
      platform_cost: Number(s.platform_cost),
      status: s.status,
      transferred_at: s.transferred_at,
    }));

    return {
      institution_name: institution.name,
      period: query.period,
      transactions,
      summary: {
        total_gross: transactions.reduce((s, t) => s + t.gross_amount, 0),
        total_fee: transactions.reduce((s, t) => s + t.midtrans_fee, 0),
        total_net: transactions.reduce((s, t) => s + t.transfer_amount, 0),
        total_platform_cost: transactions.reduce(
          (s, t) => s + t.platform_cost,
          0,
        ),
      },
    };
  }
}
