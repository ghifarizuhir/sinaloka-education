import {
  Controller,
  Get,
  Post,
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
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { WhatsappService } from './whatsapp.service.js';
import type { Request } from 'express';

@Controller()
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
          await this.whatsappService.handleStatusUpdate(status.id, status.status);
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
    return { success: true, message_id: message!.id };
  }
}
