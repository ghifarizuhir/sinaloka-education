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
import { SessionService } from './session.service.js';
import {
  RequestRescheduleSchema,
  TutorScheduleQuerySchema,
  CompleteSessionSchema,
} from './session.dto.js';
import type {
  RequestRescheduleDto,
  TutorScheduleQueryDto,
  CompleteSessionDto,
} from './session.dto.js';

@Controller('tutor/schedule')
@Roles(Role.TUTOR)
export class TutorSessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  getSchedule(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(TutorScheduleQuerySchema))
    query: TutorScheduleQueryDto,
  ) {
    return this.sessionService.getTutorSchedule(user.userId, query);
  }

  @Patch(':id/request-reschedule')
  requestReschedule(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(RequestRescheduleSchema))
    dto: RequestRescheduleDto,
  ) {
    return this.sessionService.requestReschedule(user.userId, id, dto);
  }

  @Patch(':id/cancel')
  cancel(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sessionService.cancelSession(user.userId, id);
  }

  @Get(':id/students')
  getStudents(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sessionService.getSessionStudents(user.userId, id);
  }

  @Patch(':id/complete')
  complete(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(CompleteSessionSchema)) dto: CompleteSessionDto,
  ) {
    return this.sessionService.completeSession(user.userId, id, dto);
  }
}
