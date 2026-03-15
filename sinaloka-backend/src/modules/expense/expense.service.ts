import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type {
  CreateExpenseDto,
  UpdateExpenseDto,
  ExpenseQueryDto,
} from './expense.dto.js';

@Injectable()
export class ExpenseService {
  constructor(private readonly prisma: PrismaService) {}

  async create(institutionId: string, dto: CreateExpenseDto) {
    return this.prisma.expense.create({
      data: { ...dto, institution_id: institutionId },
    });
  }

  async findAll(institutionId: string, query: ExpenseQueryDto) {
    const { page, limit, category, date_from, date_to, sort_by, sort_order } = query;
    const where: any = { institution_id: institutionId };
    if (category) where.category = category;
    if (date_from || date_to) {
      where.date = {};
      if (date_from) where.date.gte = date_from;
      if (date_to) where.date.lte = date_to;
    }

    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sort_by]: sort_order },
      }),
      this.prisma.expense.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(institutionId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, institution_id: institutionId },
    });

    if (!expense) {
      throw new NotFoundException(`Expense with id ${id} not found`);
    }

    return expense;
  }

  async update(institutionId: string, id: string, dto: UpdateExpenseDto) {
    await this.findOne(institutionId, id);
    return this.prisma.expense.update({ where: { id }, data: dto });
  }

  async delete(institutionId: string, id: string) {
    await this.findOne(institutionId, id);
    return this.prisma.expense.delete({ where: { id } });
  }
}
