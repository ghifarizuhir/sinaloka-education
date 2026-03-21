import { Controller, Get, Post, Body, Request } from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { SubscriptionService } from './subscription.service.js';
import { SubscriptionPaymentService } from './subscription-payment.service.js';
import { CreateSubscriptionPaymentSchema } from './dto/create-payment.dto.js';
import type { CreateSubscriptionPaymentDto } from './dto/create-payment.dto.js';

@Controller('subscription')
@Roles(Role.ADMIN)
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly subscriptionPaymentService: SubscriptionPaymentService,
  ) {}

  @Get()
  async getStatus(@Request() req: { tenantId: string }) {
    return this.subscriptionService.getStatus(req.tenantId);
  }

  @Get('invoices')
  async getInvoices(@Request() req: { tenantId: string }) {
    return this.subscriptionService.getInvoices(req.tenantId);
  }

  @Post('pay')
  async createPayment(
    @Request() req: { tenantId: string },
    @Body(new ZodValidationPipe(CreateSubscriptionPaymentSchema))
    body: CreateSubscriptionPaymentDto,
  ) {
    return this.subscriptionPaymentService.createPayment(req.tenantId, body);
  }
}
