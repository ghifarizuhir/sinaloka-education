import { Module } from '@nestjs/common';
import { StudentService } from './student.service.js';
import { StudentController } from './student.controller.js';
import { AttendanceModule } from '../attendance/attendance.module.js';

@Module({
  imports: [AttendanceModule],
  controllers: [StudentController],
  providers: [StudentService],
  exports: [StudentService],
})
export class StudentModule {}
