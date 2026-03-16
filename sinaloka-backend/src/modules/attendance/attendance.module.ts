import { Module } from '@nestjs/common';
import { PaymentModule } from '../payment/payment.module.js';
import { AttendanceController } from './attendance.controller.js';
import { TutorAttendanceController } from './tutor-attendance.controller.js';
import { AttendanceService } from './attendance.service.js';

@Module({
  imports: [PaymentModule],
  controllers: [AttendanceController, TutorAttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
