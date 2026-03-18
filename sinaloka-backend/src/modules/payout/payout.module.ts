import { Module } from '@nestjs/common';
import { PayoutController } from './payout.controller.js';
import { TutorPayoutController } from './tutor-payout.controller.js';
import { PayoutService } from './payout.service.js';
import { PayoutSlipService } from './payout-slip.service.js';
import { PayoutCronService } from './payout.cron.js';

@Module({
  controllers: [PayoutController, TutorPayoutController],
  providers: [PayoutService, PayoutSlipService, PayoutCronService],
  exports: [PayoutService],
})
export class PayoutModule {}
