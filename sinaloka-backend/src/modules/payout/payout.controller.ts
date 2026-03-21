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
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { InstitutionId } from '../../common/decorators/institution-id.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { PayoutService } from './payout.service.js';
import { PayoutSlipService } from './payout-slip.service.js';
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
  constructor(
    private readonly payoutService: PayoutService,
    private readonly payoutSlipService: PayoutSlipService,
  ) {}

  @Post()
  create(
    @InstitutionId() institutionId: string,
    @Body(new ZodValidationPipe(CreatePayoutSchema)) dto: CreatePayoutDto,
  ) {
    return this.payoutService.create(institutionId, dto);
  }

  @Get()
  findAll(
    @InstitutionId() institutionId: string,
    @Query(new ZodValidationPipe(PayoutQuerySchema)) query: PayoutQueryDto,
  ) {
    return this.payoutService.findAll(institutionId, query);
  }

  @Get('calculate')
  calculate(
    @InstitutionId() institutionId: string,
    @Query(new ZodValidationPipe(CalculatePayoutSchema))
    query: CalculatePayoutDto,
  ) {
    return this.payoutService.calculatePayout(institutionId, query);
  }

  @Post(':id/generate-slip')
  @HttpCode(HttpStatus.OK)
  generateSlip(
    @InstitutionId() institutionId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payoutSlipService.generateSlip(institutionId, id);
  }

  @Get(':id/export-audit')
  async exportAudit(
    @InstitutionId() institutionId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const csv = await this.payoutService.exportAudit(institutionId, id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="payout-audit-${id}.csv"`,
    );
    res.send(csv);
  }

  @Post('generate-salaries')
  @HttpCode(HttpStatus.OK)
  generateSalaries(@InstitutionId() institutionId: string) {
    return this.payoutService.generateMonthlySalaries(institutionId);
  }

  @Get(':id')
  findOne(
    @InstitutionId() institutionId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payoutService.findOne(institutionId, id);
  }

  @Patch(':id')
  update(
    @InstitutionId() institutionId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdatePayoutSchema)) dto: UpdatePayoutDto,
  ) {
    return this.payoutService.update(institutionId, id, dto);
  }

  @Delete(':id')
  delete(
    @InstitutionId() institutionId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.payoutService.delete(institutionId, id);
  }
}
