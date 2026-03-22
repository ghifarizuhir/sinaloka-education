import {
  Controller,
  Post,
  Get,
  Patch,
  Put,
  Delete,
  Param,
  Query,
  Body,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { PlanFeature } from '../../common/decorators/plan.decorator.js';
import { InstitutionId } from '../../common/decorators/institution-id.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { WhatsappService } from './whatsapp.service.js';
import {
  FonnteWebhookSchema,
  type FonnteWebhookDto,
  WhatsappMessagesQuerySchema,
  type WhatsappMessagesQueryDto,
  UpdateWhatsappSettingsSchema,
  type UpdateWhatsappSettingsDto,
  UpdateTemplateSchema,
  type UpdateTemplateDto,
} from './whatsapp.dto.js';

@Controller()
@PlanFeature('whatsappNotification')
export class WhatsappController {
  private readonly fonnteDeviceNumber: string | undefined;

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly config: ConfigService,
  ) {
    this.fonnteDeviceNumber = this.config.get<string>('FONNTE_DEVICE_NUMBER');
  }

  // --- Webhook endpoint (public, no JWT auth) ---

  @Public()
  @Post('whatsapp/webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body(new ZodValidationPipe(FonnteWebhookSchema)) body: FonnteWebhookDto,
  ) {
    // Authenticate: Fonnte sends the device phone number in body.device
    if (!this.fonnteDeviceNumber || body.device !== this.fonnteDeviceNumber) {
      throw new ForbiddenException('Invalid webhook source');
    }

    await this.whatsappService.handleStatusUpdate(body.id, body.status);
    return 'OK';
  }

  // --- Admin endpoints ---

  @Post('admin/whatsapp/payment-reminder/:paymentId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async sendPaymentReminder(
    @InstitutionId() institutionId: string,
    @Param('paymentId') paymentId: string,
  ) {
    const message = await this.whatsappService.sendPaymentReminder(
      institutionId,
      paymentId,
    );
    return { success: true, message_id: message?.id ?? null };
  }

  @Get('admin/whatsapp/messages')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async getMessages(
    @InstitutionId() institutionId: string,
    @Query(new ZodValidationPipe(WhatsappMessagesQuerySchema))
    query: WhatsappMessagesQueryDto,
  ) {
    return this.whatsappService.getMessages(institutionId, query);
  }

  @Get('admin/whatsapp/stats')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async getStats(
    @InstitutionId() institutionId: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) {
    return this.whatsappService.getStats(institutionId, dateFrom, dateTo);
  }

  @Get('admin/whatsapp/settings')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async getSettings(@InstitutionId() institutionId: string) {
    return this.whatsappService.getSettings(institutionId);
  }

  @Patch('admin/whatsapp/settings')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async updateSettings(
    @InstitutionId() institutionId: string,
    @Body(new ZodValidationPipe(UpdateWhatsappSettingsSchema))
    dto: UpdateWhatsappSettingsDto,
  ) {
    return this.whatsappService.updateSettings(institutionId, dto);
  }

  // --- Template endpoints ---

  @Get('admin/whatsapp/templates')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async getTemplates(@InstitutionId() institutionId: string) {
    return this.whatsappService.getTemplates(institutionId);
  }

  @Get('admin/whatsapp/templates/:name')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async getTemplate(
    @InstitutionId() institutionId: string,
    @Param('name') name: string,
  ) {
    return this.whatsappService.getTemplate(institutionId, name);
  }

  @Put('admin/whatsapp/templates/:name')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async updateTemplate(
    @InstitutionId() institutionId: string,
    @Param('name') name: string,
    @Body(new ZodValidationPipe(UpdateTemplateSchema)) dto: UpdateTemplateDto,
  ) {
    return this.whatsappService.updateTemplate(institutionId, name, dto);
  }

  @Delete('admin/whatsapp/templates/:name')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async deleteTemplate(
    @InstitutionId() institutionId: string,
    @Param('name') name: string,
  ) {
    return this.whatsappService.deleteTemplate(institutionId, name);
  }
}
