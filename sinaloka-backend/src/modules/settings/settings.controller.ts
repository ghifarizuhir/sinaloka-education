import {
  Controller,
  Get,
  Patch,
  Body,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import type { TenantRequest } from '../../common/interceptors/tenant.interceptor.js';
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

  private getInstitutionId(req: TenantRequest, user: JwtPayload): string {
    const id = req.tenantId ?? user.institutionId;
    if (!id) {
      throw new BadRequestException('Institution ID is required');
    }
    return id;
  }

  @Get('general')
  async getGeneral(
    @Req() req: TenantRequest,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.settingsService.getGeneral(this.getInstitutionId(req, user));
  }

  @Patch('general')
  async updateGeneral(
    @Req() req: TenantRequest,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(UpdateGeneralSettingsSchema))
    dto: UpdateGeneralSettingsDto,
  ) {
    return this.settingsService.updateGeneral(
      this.getInstitutionId(req, user),
      dto,
    );
  }

  @Get('billing')
  async getBilling(
    @Req() req: TenantRequest,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.settingsService.getBilling(this.getInstitutionId(req, user));
  }

  @Patch('billing')
  async updateBilling(
    @Req() req: TenantRequest,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(UpdateBillingSettingsSchema))
    dto: UpdateBillingSettingsDto,
  ) {
    return this.settingsService.updateBilling(
      this.getInstitutionId(req, user),
      dto,
    );
  }

  @Get('academic')
  async getAcademic(
    @Req() req: TenantRequest,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.settingsService.getAcademic(this.getInstitutionId(req, user));
  }

  @Patch('academic')
  async updateAcademic(
    @Req() req: TenantRequest,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(UpdateAcademicSettingsSchema))
    dto: UpdateAcademicSettingsDto,
  ) {
    return this.settingsService.updateAcademic(
      this.getInstitutionId(req, user),
      dto,
    );
  }

  @Get('payment-gateway')
  async getPaymentGateway(
    @Req() req: TenantRequest,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.settingsService.getPaymentGateway(
      this.getInstitutionId(req, user),
    );
  }

  @Patch('payment-gateway')
  async updatePaymentGateway(
    @Req() req: TenantRequest,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(UpdatePaymentGatewaySchema))
    dto: UpdatePaymentGatewayDto,
  ) {
    return this.settingsService.updatePaymentGateway(
      this.getInstitutionId(req, user),
      dto,
    );
  }

  @Get('registration')
  async getRegistration(
    @Req() req: TenantRequest,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.settingsService.getRegistration(
      this.getInstitutionId(req, user),
    );
  }

  @Patch('registration')
  async updateRegistration(
    @Req() req: TenantRequest,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(UpdateRegistrationSettingsSchema))
    dto: UpdateRegistrationSettingsDto,
  ) {
    return this.settingsService.updateRegistration(
      this.getInstitutionId(req, user),
      dto,
    );
  }
}
