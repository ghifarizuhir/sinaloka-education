import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { ReportService } from './report.service.js';
import {
  AttendanceReportQuerySchema,
  FinanceReportQuerySchema,
  StudentProgressQuerySchema,
} from './report.dto.js';
import type {
  AttendanceReportQueryDto,
  FinanceReportQueryDto,
  StudentProgressQueryDto,
} from './report.dto.js';

@Controller('admin/reports')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('attendance')
  async attendance(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(AttendanceReportQuerySchema)) q: AttendanceReportQueryDto,
    @Res() res: Response,
  ) {
    const buf = await this.reportService.generateAttendanceReport(user.institutionId!, q);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="attendance-report.pdf"',
    });
    res.send(buf);
  }

  @Get('finance')
  async finance(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(FinanceReportQuerySchema)) q: FinanceReportQueryDto,
    @Res() res: Response,
  ) {
    const buf = await this.reportService.generateFinanceReport(user.institutionId!, q);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="finance-report.pdf"',
    });
    res.send(buf);
  }

  @Get('student-progress')
  async studentProgress(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(StudentProgressQuerySchema)) q: StudentProgressQueryDto,
    @Res() res: Response,
  ) {
    const buf = await this.reportService.generateStudentProgressReport(
      user.institutionId!,
      q.student_id,
      q.date_from,
      q.date_to,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="student-progress.pdf"',
    });
    res.send(buf);
  }
}
