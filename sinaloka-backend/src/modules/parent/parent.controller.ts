import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { ParentStudentGuard } from './guards/parent-student.guard.js';
import { ParentService } from './parent.service.js';
import {
  ChildAttendanceQuerySchema,
  ChildSessionsQuerySchema,
  ChildPaymentsQuerySchema,
} from './parent.dto.js';
import type {
  ChildAttendanceQueryDto,
  ChildSessionsQueryDto,
  ChildPaymentsQueryDto,
} from './parent.dto.js';

@Controller('parent')
@Roles(Role.PARENT)
export class ParentController {
  constructor(private readonly parentService: ParentService) {}

  @Get('children')
  async getChildren(@CurrentUser() user: JwtPayload) {
    return this.parentService.getChildren(user.userId);
  }

  @Get('children/:studentId')
  @UseGuards(ParentStudentGuard)
  async getChildDetail(
    @CurrentUser() user: JwtPayload,
    @Param('studentId') studentId: string,
  ) {
    return this.parentService.getChildDetail(user.institutionId!, studentId);
  }

  @Get('children/:studentId/attendance')
  @UseGuards(ParentStudentGuard)
  async getChildAttendance(
    @CurrentUser() user: JwtPayload,
    @Param('studentId') studentId: string,
    @Query(new ZodValidationPipe(ChildAttendanceQuerySchema)) query: ChildAttendanceQueryDto,
  ) {
    return this.parentService.getChildAttendance(user.institutionId!, studentId, query);
  }

  @Get('children/:studentId/sessions')
  @UseGuards(ParentStudentGuard)
  async getChildSessions(
    @CurrentUser() user: JwtPayload,
    @Param('studentId') studentId: string,
    @Query(new ZodValidationPipe(ChildSessionsQuerySchema)) query: ChildSessionsQueryDto,
  ) {
    return this.parentService.getChildSessions(user.institutionId!, studentId, query);
  }

  @Get('children/:studentId/payments')
  @UseGuards(ParentStudentGuard)
  async getChildPayments(
    @CurrentUser() user: JwtPayload,
    @Param('studentId') studentId: string,
    @Query(new ZodValidationPipe(ChildPaymentsQuerySchema)) query: ChildPaymentsQueryDto,
  ) {
    return this.parentService.getChildPayments(user.institutionId!, studentId, query);
  }

  @Get('children/:studentId/enrollments')
  @UseGuards(ParentStudentGuard)
  async getChildEnrollments(
    @CurrentUser() user: JwtPayload,
    @Param('studentId') studentId: string,
  ) {
    return this.parentService.getChildEnrollments(user.institutionId!, studentId);
  }
}
