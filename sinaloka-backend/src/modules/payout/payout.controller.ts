import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { PayoutService } from './payout.service.js';
import {
  CreatePayoutSchema,
  UpdatePayoutSchema,
  PayoutQuerySchema,
  CalculatePayoutSchema,
} from './payout.dto.js';
import type {
  CreatePayoutDto,
  UpdatePayoutDto,
  PayoutQueryDto,
  CalculatePayoutDto,
} from './payout.dto.js';

@Controller('admin/payouts')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class PayoutController {
  constructor(private readonly payoutService: PayoutService) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(CreatePayoutSchema)) dto: CreatePayoutDto,
  ) {
    return this.payoutService.create(user.institutionId!, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(PayoutQuerySchema)) query: PayoutQueryDto,
  ) {
    return this.payoutService.findAll(user.institutionId!, query);
  }

  @Get('calculate')
  calculate(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(CalculatePayoutSchema)) query: CalculatePayoutDto,
  ) {
    return this.payoutService.calculatePayout(user.institutionId!, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payoutService.findOne(user.institutionId!, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdatePayoutSchema)) dto: UpdatePayoutDto,
  ) {
    return this.payoutService.update(user.institutionId!, id, dto);
  }

  @Delete(':id')
  delete(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payoutService.delete(user.institutionId!, id);
  }
}
