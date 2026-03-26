import { Module } from '@nestjs/common';
import {
  AcademicYearController,
  SemesterController,
} from './academic-year.controller.js';
import { AcademicYearService } from './academic-year.service.js';

@Module({
  controllers: [AcademicYearController, SemesterController],
  providers: [AcademicYearService],
  exports: [AcademicYearService],
})
export class AcademicYearModule {}
