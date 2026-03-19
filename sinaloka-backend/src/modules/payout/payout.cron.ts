import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { PayoutService } from './payout.service.js';

@Injectable()
export class PayoutCronService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payoutService: PayoutService,
  ) {}

  @Cron('0 0 1 * *')
  async handleMonthlySalaries() {
    const institutions = await this.prisma.institution.findMany({
      select: { id: true },
    });

    for (const inst of institutions) {
      const result = await this.payoutService.generateMonthlySalaries(inst.id);
      if (result.created > 0) {
        console.log(
          `[PayoutCron] Generated ${result.created} salary payouts for institution ${inst.id}`,
        );
      }
    }
  }
}
