import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { ExpenseService } from './expense.service.js';

@Injectable()
export class ExpenseCron {
  private readonly logger = new Logger(ExpenseCron.name);

  constructor(
    private readonly expenseService: ExpenseService,
    private readonly prisma: PrismaService,
  ) {}

  @Cron('0 17 * * *') // 00:00 WIB (UTC+7)
  async processRecurringExpenses() {
    this.logger.log('Starting recurring expenses processing...');

    const institutions = await this.prisma.institution.findMany({
      select: { id: true, name: true },
    });

    let totalProcessed = 0;
    let totalCreated = 0;

    for (const institution of institutions) {
      try {
        const result = await this.expenseService.processRecurringExpenses(
          institution.id,
        );
        totalProcessed += result.processed;
        totalCreated += result.created;

        if (result.created > 0) {
          this.logger.log(
            `[${institution.name}] Created ${result.created} recurring expense(s)`,
          );
        }
      } catch (error) {
        this.logger.error(
          `[${institution.name}] Failed to process recurring expenses: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Recurring expenses done: ${totalProcessed} processed, ${totalCreated} created`,
    );
  }
}
