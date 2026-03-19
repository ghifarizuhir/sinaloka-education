import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AttendanceService } from './attendance.service.js';
import {
  UpdateAttendanceSchema,
  AttendanceQuerySchema,
  AttendanceSummaryQuerySchema,
} from './attendance.dto.js';
import type {
  UpdateAttendanceDto,
  AttendanceQueryDto,
  AttendanceSummaryQueryDto,
} from './attendance.dto.js';

@Controller('admin/attendance')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  findBySession(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(AttendanceQuerySchema))
    query: AttendanceQueryDto,
  ) {
    return this.attendanceService.findBySession(
      user.institutionId!,
      query.session_id,
    );
  }

  @Get('summary')
  getSummary(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(AttendanceSummaryQuerySchema))
    query: AttendanceSummaryQueryDto,
  ) {
    return this.attendanceService.getSummary(user.institutionId!, query);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateAttendanceSchema))
    dto: UpdateAttendanceDto,
  ) {
    return this.attendanceService.update(user.institutionId!, id, dto);
  }
}
