import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { InstitutionId } from '../../common/decorators/institution-id.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { ReportService } from './report.service.js';
import {
  AttendanceReportQuerySchema,
  FinanceReportQuerySchema,
  StudentProgressQuerySchema,
  ReportPeriodSchema,
  ExportCsvSchema,
} from './report.dto.js';
import type {
  AttendanceReportQueryDto,
  FinanceReportQueryDto,
  StudentProgressQueryDto,
  ReportPeriodDto,
  ExportCsvDto,
} from './report.dto.js';

@Controller('admin/reports')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('attendance')
  async attendance(
    @InstitutionId() institutionId: string,
    @Query(new ZodValidationPipe(AttendanceReportQuerySchema))
    q: AttendanceReportQueryDto,
    @Res() res: Response,
  ) {
    const buf = await this.reportService.generateAttendanceReport(
      institutionId,
      q,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="attendance-report.pdf"',
    });
    res.send(buf);
  }

  @Get('finance')
  async finance(
    @InstitutionId() institutionId: string,
    @Query(new ZodValidationPipe(FinanceReportQuerySchema))
    q: FinanceReportQueryDto,
    @Res() res: Response,
  ) {
    const buf = await this.reportService.generateFinanceReport(institutionId, q);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="finance-report.pdf"',
    });
    res.send(buf);
  }

  @Get('student-progress')
  async studentProgress(
    @InstitutionId() institutionId: string,
    @Query(new ZodValidationPipe(StudentProgressQuerySchema))
    q: StudentProgressQueryDto,
    @Res() res: Response,
  ) {
    const buf = await this.reportService.generateStudentProgressReport(
      institutionId,
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

  @Get('financial-summary')
  async financialSummary(
    @InstitutionId() institutionId: string,
    @Query(new ZodValidationPipe(ReportPeriodSchema)) q: ReportPeriodDto,
  ) {
    return this.reportService.getFinancialSummary(
      institutionId,
      q.period_start,
      q.period_end,
    );
  }

  @Get('revenue-breakdown')
  async revenueBreakdown(
    @InstitutionId() institutionId: string,
    @Query(new ZodValidationPipe(ReportPeriodSchema)) q: ReportPeriodDto,
  ) {
    return this.reportService.getRevenueBreakdown(
      institutionId,
      q.period_start,
      q.period_end,
    );
  }

  @Get('expense-breakdown')
  async expenseBreakdown(
    @InstitutionId() institutionId: string,
    @Query(new ZodValidationPipe(ReportPeriodSchema)) q: ReportPeriodDto,
  ) {
    return this.reportService.getExpenseBreakdown(
      institutionId,
      q.period_start,
      q.period_end,
    );
  }

  @Get('export-csv')
  async exportCsv(
    @InstitutionId() institutionId: string,
    @Query(new ZodValidationPipe(ExportCsvSchema)) q: ExportCsvDto,
    @Res() res: Response,
  ) {
    const csv = await this.reportService.exportCsv(
      institutionId,
      q.type,
      q.period_start,
      q.period_end,
    );
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${q.type}_export_${new Date().toISOString().split('T')[0]}.csv"`,
    });
    res.send(csv);
  }
}
