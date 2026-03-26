import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { InstitutionId } from '../../common/decorators/institution-id.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { SettingsService } from './settings.service.js';
import { R2UploadService } from '../upload/r2-upload.service.js';
import { InstitutionService } from '../institution/institution.service.js';
import {
  UpdateGeneralSettingsSchema,
  UpdateBillingSettingsSchema,
  UpdateAcademicSettingsSchema,
  UpdatePaymentGatewaySchema,
  UpdateRegistrationSettingsSchema,
  UpdateLandingSettingsSchema,
} from './settings.dto.js';
import type {
  UpdateGeneralSettingsDto,
  UpdateBillingSettingsDto,
  UpdateAcademicSettingsDto,
  UpdatePaymentGatewayDto,
  UpdateRegistrationSettingsDto,
  UpdateLandingSettingsDto,
} from './settings.dto.js';

@Controller('settings')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly r2UploadService: R2UploadService,
    private readonly institutionService: InstitutionService,
  ) {}

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

  // ─── Landing Page ───────────────────────────────────────

  @Get('landing')
  getLandingSettings(@InstitutionId() institutionId: string) {
    return this.settingsService.getLandingSettings(institutionId);
  }

  @Patch('landing')
  async updateLandingSettings(
    @InstitutionId() institutionId: string,
    @Body(new ZodValidationPipe(UpdateLandingSettingsSchema))
    dto: UpdateLandingSettingsDto,
  ) {
    const result = await this.settingsService.updateLandingSettings(
      institutionId,
      dto,
    );
    const slug =
      await this.settingsService.getInstitutionSlug(institutionId);
    this.institutionService.invalidateLandingCache(slug);
    return result;
  }

  @Post('landing/gallery')
  @UseInterceptors(FileInterceptor('file'))
  async uploadGalleryImage(
    @InstitutionId() institutionId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    const keyPrefix = `institutions/${institutionId}/gallery`;
    const { id, url } = await this.r2UploadService.uploadImage(
      file,
      keyPrefix,
    );
    await this.settingsService.addGalleryImage(institutionId, { id, url });
    const slug = await this.settingsService.getInstitutionSlug(institutionId);
    this.institutionService.invalidateLandingCache(slug);
    return { id, url };
  }

  @Delete('landing/gallery/:imageId')
  async deleteGalleryImage(
    @InstitutionId() institutionId: string,
    @Param('imageId') imageId: string,
  ) {
    const image = await this.settingsService.removeGalleryImage(
      institutionId,
      imageId,
    );
    const key = `institutions/${institutionId}/gallery/${imageId}.webp`;
    await this.r2UploadService.deleteImage(key);
    const slug = await this.settingsService.getInstitutionSlug(institutionId);
    this.institutionService.invalidateLandingCache(slug);
  }
}
