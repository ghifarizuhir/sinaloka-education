import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type {
  CreatePaymentDto,
  UpdatePaymentDto,
  PaymentQueryDto,
} from './payment.dto.js';

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(institutionId: string, dto: CreatePaymentDto) {
    return this.prisma.payment.create({
      data: { ...dto, institution_id: institutionId },
    });
  }

  async findAll(institutionId: string, query: PaymentQueryDto) {
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
        include: { student: true, enrollment: true },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(institutionId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, institution_id: institutionId },
      include: { student: true, enrollment: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with id ${id} not found`);
    }

    return payment;
  }

  async update(institutionId: string, id: string, dto: UpdatePaymentDto) {
    await this.findOne(institutionId, id);
    return this.prisma.payment.update({ where: { id }, data: dto });
  }

  async delete(institutionId: string, id: string) {
    await this.findOne(institutionId, id);
    return this.prisma.payment.delete({ where: { id } });
  }
}
