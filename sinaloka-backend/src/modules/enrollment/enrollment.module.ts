import { Module } from '@nestjs/common';
import { PaymentModule } from '../payment/payment.module.js';
import { EnrollmentService } from './enrollment.service.js';
import { EnrollmentController } from './enrollment.controller.js';

@Module({
  imports: [PaymentModule],
  controllers: [EnrollmentController],
  providers: [EnrollmentService],
  exports: [EnrollmentService],
})
export class EnrollmentModule {}
