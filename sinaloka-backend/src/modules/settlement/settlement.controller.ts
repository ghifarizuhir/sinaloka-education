import {
  Controller,
  Get,
  Patch,
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
import { SettlementService } from './settlement.service.js';
import {
  SettlementQuerySchema,
  TransferSettlementSchema,
  BatchTransferSchema,
  ReportQuerySchema,
} from './settlement.dto.js';
import type {
  SettlementQueryDto,
  TransferSettlementDto,
  BatchTransferDto,
  ReportQueryDto,
} from './settlement.dto.js';

@Controller('admin/settlements')
@Roles(Role.SUPER_ADMIN)
export class SettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  @Get()
  async findAll(
    @Query(new ZodValidationPipe(SettlementQuerySchema))
    query: SettlementQueryDto,
  ) {
    return this.settlementService.findAll(query);
  }

  @Get('summary')
  async getSummary() {
    return this.settlementService.getSummary();
  }

  @Get('report')
  async getReport(
    @Query(new ZodValidationPipe(ReportQuerySchema)) query: ReportQueryDto,
  ) {
    return this.settlementService.getReport(query);
  }

  @Patch('batch-transfer')
  async batchTransfer(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(BatchTransferSchema)) dto: BatchTransferDto,
  ) {
    return this.settlementService.batchTransfer(dto, user.userId);
  }

  @Patch(':id/transfer')
  async markTransferred(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(TransferSettlementSchema))
    dto: TransferSettlementDto,
  ) {
    return this.settlementService.markTransferred(id, dto, user.userId);
  }
}
