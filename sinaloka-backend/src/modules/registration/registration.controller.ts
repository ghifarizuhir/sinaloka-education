import { Controller, Get, Patch, Param, Body, Query } from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { InstitutionId } from '../../common/decorators/institution-id.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { RegistrationService } from './registration.service.js';
import {
  RejectRegistrationSchema,
  RegistrationQuerySchema,
} from './registration.dto.js';
import type {
  RejectRegistrationDto,
  RegistrationQueryDto,
} from './registration.dto.js';

@Controller('admin/registrations')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Get()
  async findAll(
    @InstitutionId() institutionId: string,
    @Query(new ZodValidationPipe(RegistrationQuerySchema))
    query: RegistrationQueryDto,
  ) {
    return this.registrationService.findAll(institutionId, query);
  }

  @Get('count')
  async getPendingCount(@InstitutionId() institutionId: string) {
    return this.registrationService.getPendingCount(institutionId);
  }

  @Get(':id')
  async findOne(
    @InstitutionId() institutionId: string,
    @Param('id') id: string,
  ) {
    return this.registrationService.findOne(institutionId, id);
  }

  @Patch(':id/approve')
  async approve(
    @InstitutionId() institutionId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.registrationService.approve(institutionId, id, user.userId);
  }

  @Patch(':id/reject')
  async reject(
    @InstitutionId() institutionId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RejectRegistrationSchema))
    dto: RejectRegistrationDto,
  ) {
    return this.registrationService.reject(institutionId, id, user.userId, dto);
  }
}
