import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Headers,
  Req,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { PlanFeature } from '../../common/decorators/plan.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { WhatsappService } from './whatsapp.service.js';
import {
  WhatsappMessagesQuerySchema,
  type WhatsappMessagesQueryDto,
  UpdateWhatsappSettingsSchema,
  type UpdateWhatsappSettingsDto,
} from './whatsapp.dto.js';
import type { Request } from 'express';

@Controller()
@PlanFeature('whatsappNotification')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  // --- Webhook endpoints (public, no auth) ---

  @Public()
  @Get('whatsapp/webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
  ) {
    const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    if (mode === 'subscribe' && verifyToken === expected) {
      return challenge;
    }
    throw new ForbiddenException('Webhook verification failed');
  }

  @Public()
  @Post('whatsapp/webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() body: any,
    @Headers('x-hub-signature-256') signature: string,
    @Req() req: Request,
  ) {
    // Verify signature
    const rawBody = (req as any).rawBody?.toString() || JSON.stringify(body);
    if (!this.whatsappService.verifyWebhookSignature(rawBody, signature)) {
      throw new ForbiddenException('Invalid webhook signature');
    }

    // Process status updates
    const entries = body?.entry ?? [];
    for (const entry of entries) {
      const changes = entry?.changes ?? [];
      for (const change of changes) {
        const statuses = change?.value?.statuses ?? [];
        for (const status of statuses) {
          await this.whatsappService.handleStatusUpdate(
            status.id,
            status.status,
          );
        }
      }
    }

    return 'OK';
  }

  // --- Admin endpoint ---

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
