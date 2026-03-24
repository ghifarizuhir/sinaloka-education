import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { InvoiceGeneratorService } from './invoice-generator.service.js';

@Injectable()
export class MonthlyPaymentCron {
  private readonly logger = new Logger(MonthlyPaymentCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceGenerator: InvoiceGeneratorService,
  ) {}

  @Cron('0 0 1 * *')
  async generateMonthlyPayments() {
    this.logger.log('Starting monthly payment generation...');
    const institutions = await this.prisma.institution.findMany({
      where: { billing_mode: 'MONTHLY_FIXED', is_active: true },
      select: { id: true, name: true },
    });
    let totalCreated = 0;
    for (const institution of institutions) {
      try {
        const result = await this.invoiceGenerator.generateMonthlyPayments({ institutionId: institution.id });
        totalCreated += result.created;
        this.logger.log(`${institution.name}: ${result.created} payments created`);
      } catch (error) {
        this.logger.error(`Failed for ${institution.name} (${institution.id}): ${error}`);
      }
    }
    this.logger.log(`Monthly payment generation complete. Total: ${totalCreated} payments across ${institutions.length} institutions.`);
  }
}
