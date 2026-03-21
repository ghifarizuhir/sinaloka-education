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
import { InstitutionId } from '../../common/decorators/institution-id.decorator.js';
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
    @InstitutionId() institutionId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(CreateSessionSchema)) dto: CreateSessionDto,
  ) {
    return this.sessionService.create(institutionId, user.userId, dto);
  }

  @Get()
  findAll(
    @InstitutionId() institutionId: string,
    @Query(new ZodValidationPipe(SessionQuerySchema)) query: SessionQueryDto,
  ) {
    return this.sessionService.findAll(institutionId, query);
  }

  @Get(':id')
  findOne(
    @InstitutionId() institutionId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sessionService.findOne(institutionId, id);
  }

  @Get(':id/students')
  getStudents(
    @InstitutionId() institutionId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sessionService.getAdminSessionStudents(institutionId, id);
  }

  @Patch(':id')
  update(
    @InstitutionId() institutionId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateSessionSchema)) dto: UpdateSessionDto,
  ) {
    return this.sessionService.update(institutionId, id, dto);
  }

  @Delete(':id')
  delete(
    @InstitutionId() institutionId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sessionService.delete(institutionId, id);
  }

  @Post('generate')
  generate(
    @InstitutionId() institutionId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(GenerateSessionsSchema))
    dto: GenerateSessionsDto,
  ) {
    return this.sessionService.generateSessions(institutionId, user.userId, dto);
  }

  @Patch(':id/approve')
  approveReschedule(
    @InstitutionId() institutionId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(ApproveRescheduleSchema))
    dto: ApproveRescheduleDto,
  ) {
    return this.sessionService.approveReschedule(
      institutionId,
      user.userId,
      id,
      dto,
    );
  }
}
