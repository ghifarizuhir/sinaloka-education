import { Controller, Get, Patch, Body } from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { SettingsService } from './settings.service.js';
import {
  UpdateGeneralSettingsSchema,
  UpdateBillingSettingsSchema,
  UpdateAcademicSettingsSchema,
  UpdatePaymentGatewaySchema,
} from './settings.dto.js';
import type {
  UpdateGeneralSettingsDto,
  UpdateBillingSettingsDto,
  UpdateAcademicSettingsDto,
  UpdatePaymentGatewayDto,
} from './settings.dto.js';

@Controller('settings')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('general')
  async getGeneral(@CurrentUser() user: JwtPayload) {
    return this.settingsService.getGeneral(user.institutionId!);
  }

  @Patch('general')
  async updateGeneral(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(UpdateGeneralSettingsSchema))
    dto: UpdateGeneralSettingsDto,
  ) {
    return this.settingsService.updateGeneral(user.institutionId!, dto);
  }

  @Get('billing')
  async getBilling(@CurrentUser() user: JwtPayload) {
    return this.settingsService.getBilling(user.institutionId!);
  }

  @Patch('billing')
  async updateBilling(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(UpdateBillingSettingsSchema))
    dto: UpdateBillingSettingsDto,
  ) {
    return this.settingsService.updateBilling(user.institutionId!, dto);
  }

  @Get('academic')
  async getAcademic(@CurrentUser() user: JwtPayload) {
    return this.settingsService.getAcademic(user.institutionId!);
  }

  @Patch('academic')
  async updateAcademic(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(UpdateAcademicSettingsSchema))
    dto: UpdateAcademicSettingsDto,
  ) {
    return this.settingsService.updateAcademic(user.institutionId!, dto);
  }

  @Get('payment-gateway')
  async getPaymentGateway(@CurrentUser() user: JwtPayload) {
    return this.settingsService.getPaymentGateway(user.institutionId!);
  }

  @Patch('payment-gateway')
  async updatePaymentGateway(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(UpdatePaymentGatewaySchema))
    dto: UpdatePaymentGatewayDto,
  ) {
    return this.settingsService.updatePaymentGateway(user.institutionId!, dto);
  }
}
