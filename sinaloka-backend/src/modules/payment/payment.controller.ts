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
import { InstitutionId } from '../../common/decorators/institution-id.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { PaymentService } from './payment.service.js';
import { InvoiceService } from './invoice.service.js';
import { InvoiceGeneratorService } from './invoice-generator.service.js';
import {
  CreatePaymentSchema,
  UpdatePaymentSchema,
  PaymentQuerySchema,
  BatchRecordPaymentSchema,
} from './payment.dto.js';
import type {
  CreatePaymentDto,
  UpdatePaymentDto,
  PaymentQueryDto,
  BatchRecordPaymentDto,
} from './payment.dto.js';

@Controller('admin/payments')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly invoiceService: InvoiceService,
    private readonly invoiceGeneratorService: InvoiceGeneratorService,
  ) {}

  @Post()
  create(
    @InstitutionId() institutionId: string,
    @Body(new ZodValidationPipe(CreatePaymentSchema)) dto: CreatePaymentDto,
  ) {
    return this.paymentService.create(institutionId, dto);
  }

  @Get()
  findAll(
    @InstitutionId() institutionId: string,
    @Query(new ZodValidationPipe(PaymentQuerySchema)) query: PaymentQueryDto,
  ) {
    return this.paymentService.findAll(institutionId, query);
  }

  @Post('batch-record')
  batchRecord(
    @InstitutionId() institutionId: string,
    @Body(new ZodValidationPipe(BatchRecordPaymentSchema))
    dto: BatchRecordPaymentDto,
  ) {
    return this.paymentService.batchRecord(institutionId, dto);
  }

  @Post('generate-monthly')
  generateMonthly(@InstitutionId() institutionId: string) {
    return this.invoiceGeneratorService.generateMonthlyPayments({
      institutionId,
    });
  }

  @Get('overdue-summary')
  getOverdueSummary(@InstitutionId() institutionId: string) {
    return this.paymentService.getOverdueSummary(institutionId);
  }

  @Get(':id')
  findOne(
    @InstitutionId() institutionId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentService.findOne(institutionId, id);
  }

  @Patch(':id')
  update(
    @InstitutionId() institutionId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdatePaymentSchema)) dto: UpdatePaymentDto,
  ) {
    return this.paymentService.update(institutionId, id, dto);
  }

  @Delete(':id')
  delete(
    @InstitutionId() institutionId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentService.delete(institutionId, id);
  }

  @Post(':id/generate-invoice')
  generateInvoice(
    @InstitutionId() institutionId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invoiceService.generateInvoice(institutionId, id);
  }

  @Post(':id/remind')
  remind(
    @InstitutionId() institutionId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentService.remind(institutionId, id);
  }
}
