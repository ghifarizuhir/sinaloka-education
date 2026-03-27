import {
  Controller,
  Post,
  Patch,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AttendanceService } from './attendance.service.js';
import {
  BatchCreateAttendanceSchema,
  UpdateAttendanceSchema,
} from './attendance.dto.js';
import type {
  BatchCreateAttendanceDto,
  UpdateAttendanceDto,
} from './attendance.dto.js';

@Controller('tutor/attendance')
@Roles(Role.TUTOR)
export class TutorAttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  batchCreate(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(BatchCreateAttendanceSchema))
    dto: BatchCreateAttendanceDto,
  ) {
    return this.attendanceService.batchCreate(user.institutionId!, user.userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateAttendanceSchema))
    dto: UpdateAttendanceDto,
  ) {
    return this.attendanceService.updateByTutor(user.institutionId!, user.userId, id, dto);
  }
}
