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
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(CreatePaymentSchema)) dto: CreatePaymentDto,
  ) {
    return this.paymentService.create(user.institutionId!, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(PaymentQuerySchema)) query: PaymentQueryDto,
  ) {
    return this.paymentService.findAll(user.institutionId!, query);
  }

  @Post('batch-record')
  batchRecord(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(BatchRecordPaymentSchema)) dto: BatchRecordPaymentDto,
  ) {
    return this.paymentService.batchRecord(user.institutionId!, dto);
  }

  @Post('generate-subscriptions')
  generateSubscriptions(@CurrentUser() user: JwtPayload) {
    return this.invoiceGeneratorService.generateSubscriptionPayments({
      institutionId: user.institutionId!,
    });
  }

  @Get('overdue-summary')
  getOverdueSummary(@CurrentUser() user: JwtPayload) {
    return this.paymentService.getOverdueSummary(user.institutionId!);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentService.findOne(user.institutionId!, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdatePaymentSchema)) dto: UpdatePaymentDto,
  ) {
    return this.paymentService.update(user.institutionId!, id, dto);
  }

  @Delete(':id')
  delete(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentService.delete(user.institutionId!, id);
  }

  @Post(':id/generate-invoice')
  generateInvoice(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invoiceService.generateInvoice(user.institutionId!, id);
  }

  @Post(':id/remind')
  remind(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentService.remind(user.institutionId!, id);
  }
}
