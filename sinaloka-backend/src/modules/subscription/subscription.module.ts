import { Module, forwardRef } from '@nestjs/common';
import { SubscriptionController } from './subscription.controller.js';
import { SubscriptionAdminController } from './subscription-admin.controller.js';
import { SubscriptionPaymentAdminController } from './subscription-payment-admin.controller.js';
import { SubscriptionService } from './subscription.service.js';
import { SubscriptionPaymentService } from './subscription-payment.service.js';
import { SubscriptionCronService } from './subscription-cron.service.js';
import { PaymentModule } from '../payment/payment.module.js';

@Module({
  imports: [forwardRef(() => PaymentModule)],
  controllers: [
    SubscriptionController,
    SubscriptionAdminController,
    SubscriptionPaymentAdminController,
  ],
  providers: [
    SubscriptionService,
    SubscriptionPaymentService,
    SubscriptionCronService,
  ],
  exports: [SubscriptionService, SubscriptionPaymentService],
})
export class SubscriptionModule {}
