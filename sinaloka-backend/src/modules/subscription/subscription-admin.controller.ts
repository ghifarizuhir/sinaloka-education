import { Controller, Get, Patch, Param, Body, Query } from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { SubscriptionService } from './subscription.service.js';
import { SubscriptionQuerySchema } from './dto/subscription-query.dto.js';
import type { SubscriptionQueryDto } from './dto/subscription-query.dto.js';
import { OverrideSubscriptionSchema } from './dto/override-subscription.dto.js';
import type { OverrideSubscriptionDto } from './dto/override-subscription.dto.js';

@Controller('admin/subscriptions')
@Roles(Role.SUPER_ADMIN)
export class SubscriptionAdminController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  async listSubscriptions(
    @Query(new ZodValidationPipe(SubscriptionQuerySchema))
    query: SubscriptionQueryDto,
  ) {
    return this.subscriptionService.listSubscriptions(query);
  }

  @Get('stats')
  async getStats() {
    return this.subscriptionService.getStats();
  }

  @Patch(':id')
  async overrideSubscription(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(OverrideSubscriptionSchema))
    body: OverrideSubscriptionDto,
  ) {
    return this.subscriptionService.overrideSubscription(id, body);
  }
}
