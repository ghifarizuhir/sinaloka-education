import { Module, forwardRef } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module.js';
import { SubscriptionModule } from '../subscription/subscription.module.js';
import { PaymentController } from './payment.controller.js';
import { PaymentGatewayController } from './payment-gateway.controller.js';
import { PaymentService } from './payment.service.js';
import { InvoiceGeneratorService } from './invoice-generator.service.js';
import { InvoiceService } from './invoice.service.js';
import { MidtransService } from './midtrans.service.js';
import { PaymentGatewayService } from './payment-gateway.service.js';
import { MonthlyPaymentCron } from './monthly-payment.cron.js';

@Module({
  imports: [SettingsModule, forwardRef(() => SubscriptionModule)],
  controllers: [PaymentController, PaymentGatewayController],
  providers: [
    PaymentService,
    InvoiceGeneratorService,
    InvoiceService,
    MidtransService,
    PaymentGatewayService,
    MonthlyPaymentCron,
  ],
  exports: [
    PaymentService,
    InvoiceGeneratorService,
    InvoiceService,
    MidtransService,
    PaymentGatewayService,
  ],
})
export class PaymentModule {}
