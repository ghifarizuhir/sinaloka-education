import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module.js';
import { PaymentController } from './payment.controller.js';
import { PaymentService } from './payment.service.js';
import { InvoiceGeneratorService } from './invoice-generator.service.js';
import { InvoiceService } from './invoice.service.js';

@Module({
  imports: [SettingsModule],
  controllers: [PaymentController],
  providers: [PaymentService, InvoiceGeneratorService, InvoiceService],
  exports: [PaymentService, InvoiceGeneratorService, InvoiceService],
})
export class PaymentModule {}
