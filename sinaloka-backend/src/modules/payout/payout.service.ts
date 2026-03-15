import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type {
  CreatePayoutDto,
  UpdatePayoutDto,
  PayoutQueryDto,
} from './payout.dto.js';

@Injectable()
export class PayoutService {
  constructor(private readonly prisma: PrismaService) {}

  async create(institutionId: string, dto: CreatePayoutDto) {
    return this.prisma.payout.create({
      data: { ...dto, institution_id: institutionId },
    });
  }

  async findAll(institutionId: string, query: PayoutQueryDto) {
    const { page, limit, tutor_id, status, sort_by, sort_order } = query;
    const where: any = { institution_id: institutionId };
    if (tutor_id) where.tutor_id = tutor_id;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.payout.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sort_by]: sort_order },
        include: { tutor: { include: { user: { select: { name: true } } } } },
      }),
      this.prisma.payout.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(institutionId: string, id: string) {
    const payout = await this.prisma.payout.findFirst({
      where: { id, institution_id: institutionId },
      include: { tutor: { include: { user: { select: { name: true } } } } },
    });

    if (!payout) {
      throw new NotFoundException(`Payout with id ${id} not found`);
    }

    return payout;
  }

  async update(institutionId: string, id: string, dto: UpdatePayoutDto) {
    await this.findOne(institutionId, id);
    return this.prisma.payout.update({ where: { id }, data: dto });
  }

  async delete(institutionId: string, id: string) {
    await this.findOne(institutionId, id);
    return this.prisma.payout.delete({ where: { id } });
  }

  async findByTutor(institutionId: string, tutorId: string, query: PayoutQueryDto) {
    const { page, limit, status, sort_by, sort_order } = query;
    const where: any = { institution_id: institutionId, tutor_id: tutorId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.payout.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sort_by]: sort_order },
      }),
      this.prisma.payout.count({ where }),
    ]);

    return { data, total, page, limit };
  }
}
