import { Module } from '@nestjs/common';
import { PayoutController } from './payout.controller.js';
import { TutorPayoutController } from './tutor-payout.controller.js';
import { PayoutService } from './payout.service.js';

@Module({
  controllers: [PayoutController, TutorPayoutController],
  providers: [PayoutService],
  exports: [PayoutService],
})
export class PayoutModule {}
