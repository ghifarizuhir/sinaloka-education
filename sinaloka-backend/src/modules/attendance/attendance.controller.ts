import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { InstitutionId } from '../../common/decorators/institution-id.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AttendanceService } from './attendance.service.js';
import {
  BatchCreateAttendanceSchema,
  UpdateAttendanceSchema,
  AttendanceQuerySchema,
  AttendanceSummaryQuerySchema,
} from './attendance.dto.js';
import type {
  BatchCreateAttendanceDto,
  UpdateAttendanceDto,
  AttendanceQueryDto,
  AttendanceSummaryQueryDto,
} from './attendance.dto.js';

@Controller('admin/attendance')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('batch')
  batchCreate(
    @InstitutionId() institutionId: string,
    @Body(new ZodValidationPipe(BatchCreateAttendanceSchema))
    dto: BatchCreateAttendanceDto,
  ) {
    return this.attendanceService.adminBatchCreate(institutionId, dto);
  }

  @Get()
  findBySession(
    @InstitutionId() institutionId: string,
    @Query(new ZodValidationPipe(AttendanceQuerySchema))
    query: AttendanceQueryDto,
  ) {
    return this.attendanceService.findBySession(
      institutionId,
      query.session_id,
    );
  }

  @Get('summary')
  getSummary(
    @InstitutionId() institutionId: string,
    @Query(new ZodValidationPipe(AttendanceSummaryQuerySchema))
    query: AttendanceSummaryQueryDto,
  ) {
    return this.attendanceService.getSummary(institutionId, query);
  }

  @Patch(':id')
  update(
    @InstitutionId() institutionId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateAttendanceSchema))
    dto: UpdateAttendanceDto,
  ) {
    return this.attendanceService.update(institutionId, id, dto);
  }
}
