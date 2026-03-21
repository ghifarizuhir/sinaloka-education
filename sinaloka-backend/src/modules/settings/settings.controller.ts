import { Controller, Get, Patch, Body } from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { InstitutionId } from '../../common/decorators/institution-id.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { SettingsService } from './settings.service.js';
import {
  UpdateGeneralSettingsSchema,
  UpdateBillingSettingsSchema,
  UpdateAcademicSettingsSchema,
  UpdatePaymentGatewaySchema,
  UpdateRegistrationSettingsSchema,
} from './settings.dto.js';
import type {
  UpdateGeneralSettingsDto,
  UpdateBillingSettingsDto,
  UpdateAcademicSettingsDto,
  UpdatePaymentGatewayDto,
  UpdateRegistrationSettingsDto,
} from './settings.dto.js';

@Controller('settings')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('general')
  async getGeneral(@InstitutionId() institutionId: string) {
    return this.settingsService.getGeneral(institutionId);
  }

  @Patch('general')
  async updateGeneral(
    @InstitutionId() institutionId: string,
    @Body(new ZodValidationPipe(UpdateGeneralSettingsSchema))
    dto: UpdateGeneralSettingsDto,
  ) {
    return this.settingsService.updateGeneral(institutionId, dto);
  }

  @Get('billing')
  async getBilling(@InstitutionId() institutionId: string) {
    return this.settingsService.getBilling(institutionId);
  }

  @Patch('billing')
  async updateBilling(
    @InstitutionId() institutionId: string,
    @Body(new ZodValidationPipe(UpdateBillingSettingsSchema))
    dto: UpdateBillingSettingsDto,
  ) {
    return this.settingsService.updateBilling(institutionId, dto);
  }

  @Get('academic')
  async getAcademic(@InstitutionId() institutionId: string) {
    return this.settingsService.getAcademic(institutionId);
  }

  @Patch('academic')
  async updateAcademic(
    @InstitutionId() institutionId: string,
    @Body(new ZodValidationPipe(UpdateAcademicSettingsSchema))
    dto: UpdateAcademicSettingsDto,
  ) {
    return this.settingsService.updateAcademic(institutionId, dto);
  }

  @Get('payment-gateway')
  async getPaymentGateway(@InstitutionId() institutionId: string) {
    return this.settingsService.getPaymentGateway(institutionId);
  }

  @Patch('payment-gateway')
  async updatePaymentGateway(
    @InstitutionId() institutionId: string,
    @Body(new ZodValidationPipe(UpdatePaymentGatewaySchema))
    dto: UpdatePaymentGatewayDto,
  ) {
    return this.settingsService.updatePaymentGateway(institutionId, dto);
  }

  @Get('registration')
  async getRegistration(@InstitutionId() institutionId: string) {
    return this.settingsService.getRegistration(institutionId);
  }

  @Patch('registration')
  async updateRegistration(
    @InstitutionId() institutionId: string,
    @Body(new ZodValidationPipe(UpdateRegistrationSettingsSchema))
    dto: UpdateRegistrationSettingsDto,
  ) {
    return this.settingsService.updateRegistration(institutionId, dto);
  }
}
