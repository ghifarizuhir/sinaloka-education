import { Controller, Get, Patch, Param, Body, Query } from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { SubscriptionPaymentService } from './subscription-payment.service.js';
import { PaymentQuerySchema } from './dto/subscription-query.dto.js';
import type { PaymentQueryDto } from './dto/subscription-query.dto.js';
import { ConfirmSubscriptionPaymentSchema } from './dto/confirm-payment.dto.js';
import type { ConfirmSubscriptionPaymentDto } from './dto/confirm-payment.dto.js';

@Controller('admin/subscription-payments')
@Roles(Role.SUPER_ADMIN)
export class SubscriptionPaymentAdminController {
  constructor(
    private readonly subscriptionPaymentService: SubscriptionPaymentService,
  ) {}

  @Get()
  async listPayments(
    @Query(new ZodValidationPipe(PaymentQuerySchema))
    query: PaymentQueryDto,
  ) {
    return this.subscriptionPaymentService.listPayments(query);
  }

  @Patch(':id/confirm')
  async confirmPayment(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ConfirmSubscriptionPaymentSchema))
    body: ConfirmSubscriptionPaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.subscriptionPaymentService.confirmPayment(id, body, user.userId);
  }
}
