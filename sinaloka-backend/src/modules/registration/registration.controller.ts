import { Controller, Get, Patch, Param, Body, Query } from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { RegistrationService } from './registration.service.js';
import { RejectRegistrationSchema, RegistrationQuerySchema } from './registration.dto.js';
import type { RejectRegistrationDto, RegistrationQueryDto } from './registration.dto.js';

@Controller('admin/registrations')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(RegistrationQuerySchema)) query: RegistrationQueryDto,
  ) {
    return this.registrationService.findAll(user.institutionId!, query);
  }

  @Get('count')
  async getPendingCount(@CurrentUser() user: JwtPayload) {
    return this.registrationService.getPendingCount(user.institutionId!);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.registrationService.findOne(user.institutionId!, id);
  }

  @Patch(':id/approve')
  async approve(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.registrationService.approve(user.institutionId!, id, user.userId);
  }

  @Patch(':id/reject')
  async reject(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RejectRegistrationSchema)) dto: RejectRegistrationDto,
  ) {
    return this.registrationService.reject(user.institutionId!, id, user.userId, dto);
  }
}
