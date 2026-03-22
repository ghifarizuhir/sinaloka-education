import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { buildPaginationMeta } from '../../common/dto/pagination.dto.js';
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
    const {
      page,
      limit,
      category,
      date_from,
      date_to,
      search,
      sort_by,
      sort_order,
    } = query;
    const where: any = { institution_id: institutionId };
    if (category) where.category = category;
    if (date_from || date_to) {
      where.date = {};
      if (date_from) where.date.gte = date_from;
      if (date_to) where.date.lte = date_to;
    }
    if (search) {
      where.description = { contains: search, mode: 'insensitive' };
    }

    const [data, total, aggregate] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sort_by]: sort_order },
      }),
      this.prisma.expense.count({ where }),
      this.prisma.expense.aggregate({
        where,
        _sum: { amount: true },
      }),
    ]);

    return {
      data,
      meta: {
        ...buildPaginationMeta(total, page, limit),
        total_amount: Number(aggregate._sum.amount ?? 0),
      },
    };
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

  async processRecurringExpenses(
    institutionId: string,
  ): Promise<{ processed: number; created: number }> {
    const recurringExpenses = await this.prisma.expense.findMany({
      where: { institution_id: institutionId, is_recurring: true },
    });

    let processed = 0;
    let created = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const expense of recurringExpenses) {
      processed++;
      const frequency = expense.recurrence_frequency as
        | 'weekly'
        | 'monthly'
        | null;
      if (!frequency) continue;

      const endDate = expense.recurrence_end_date
        ? new Date(expense.recurrence_end_date)
        : today;
      endDate.setHours(0, 0, 0, 0);

      const baseDate = new Date(expense.date);
      baseDate.setHours(0, 0, 0, 0);

      // Generate all occurrence dates from baseDate up to min(endDate, today)
      const upperBound = endDate < today ? endDate : today;
      const current = new Date(baseDate);

      // Advance to next occurrence after the base
      if (frequency === 'weekly') {
        current.setDate(current.getDate() + 7);
      } else {
        current.setMonth(current.getMonth() + 1);
      }

      while (current <= upperBound) {
        const occurrenceDate = new Date(current);
        occurrenceDate.setHours(0, 0, 0, 0);

        // Duplicate check: same category + amount + date + is_recurring=false
        const existing = await this.prisma.expense.findFirst({
          where: {
            institution_id: institutionId,
            category: expense.category,
            amount: expense.amount,
            date: occurrenceDate,
            is_recurring: false,
          },
        });

        if (!existing) {
          await this.prisma.expense.create({
            data: {
              institution_id: institutionId,
              category: expense.category,
              amount: expense.amount,
              date: occurrenceDate,
              description: expense.description,
              receipt_url: expense.receipt_url,
              is_recurring: false,
              recurrence_frequency: null,
              recurrence_end_date: null,
            },
          });
          created++;
        }

        if (frequency === 'weekly') {
          current.setDate(current.getDate() + 7);
        } else {
          current.setMonth(current.getMonth() + 1);
        }
      }
    }

    return { processed, created };
  }
}
