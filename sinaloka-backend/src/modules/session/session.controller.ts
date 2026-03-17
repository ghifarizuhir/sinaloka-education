import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
  CreateSessionSchema,
  UpdateSessionSchema,
  SessionQuerySchema,
  GenerateSessionsSchema,
  ApproveRescheduleSchema,
} from './session.dto.js';
import type {
  CreateSessionDto,
  UpdateSessionDto,
  SessionQueryDto,
  GenerateSessionsDto,
  ApproveRescheduleDto,
} from './session.dto.js';

@Controller('admin/sessions')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(CreateSessionSchema)) dto: CreateSessionDto,
  ) {
    return this.sessionService.create(user.institutionId!, user.userId, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(SessionQuerySchema)) query: SessionQueryDto,
  ) {
    return this.sessionService.findAll(user.institutionId!, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sessionService.findOne(user.institutionId!, id);
  }

  @Get(':id/students')
  getStudents(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sessionService.getAdminSessionStudents(user.institutionId!, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateSessionSchema)) dto: UpdateSessionDto,
  ) {
    return this.sessionService.update(user.institutionId!, id, dto);
  }

  @Delete(':id')
  delete(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sessionService.delete(user.institutionId!, id);
  }

  @Post('generate')
  generate(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(GenerateSessionsSchema)) dto: GenerateSessionsDto,
  ) {
    return this.sessionService.generateSessions(user.institutionId!, user.userId, dto);
  }

  @Patch(':id/approve')
  approveReschedule(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(ApproveRescheduleSchema)) dto: ApproveRescheduleDto,
  ) {
    return this.sessionService.approveReschedule(user.institutionId!, user.userId, id, dto);
  }
}
