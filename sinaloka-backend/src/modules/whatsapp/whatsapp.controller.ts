import {
  Controller,
  Post,
  Get,
  Patch,
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
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { WhatsappService } from './whatsapp.service.js';
import {
  FonnteWebhookSchema,
  type FonnteWebhookDto,
  WhatsappMessagesQuerySchema,
  type WhatsappMessagesQueryDto,
  UpdateWhatsappSettingsSchema,
  type UpdateWhatsappSettingsDto,
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
    @CurrentUser() user: JwtPayload,
    @Param('paymentId') paymentId: string,
  ) {
    const message = await this.whatsappService.sendPaymentReminder(
      user.institutionId!,
      paymentId,
    );
    return { success: true, message_id: message?.id ?? null };
  }

  @Get('admin/whatsapp/messages')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async getMessages(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(WhatsappMessagesQuerySchema))
    query: WhatsappMessagesQueryDto,
  ) {
    return this.whatsappService.getMessages(user.institutionId!, query);
  }

  @Get('admin/whatsapp/stats')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async getStats(
    @CurrentUser() user: JwtPayload,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) {
    return this.whatsappService.getStats(user.institutionId!, dateFrom, dateTo);
  }

  @Get('admin/whatsapp/settings')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async getSettings(@CurrentUser() user: JwtPayload) {
    return this.whatsappService.getSettings(user.institutionId!);
  }

  @Patch('admin/whatsapp/settings')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async updateSettings(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(UpdateWhatsappSettingsSchema))
    dto: UpdateWhatsappSettingsDto,
  ) {
    return this.whatsappService.updateSettings(user.institutionId!, dto);
  }
}
