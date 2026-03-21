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
import { ExpenseService } from './expense.service.js';
import {
  CreateExpenseSchema,
  UpdateExpenseSchema,
  ExpenseQuerySchema,
} from './expense.dto.js';
import type {
  CreateExpenseDto,
  UpdateExpenseDto,
  ExpenseQueryDto,
} from './expense.dto.js';

@Controller('admin/expenses')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Post()
  create(
    @InstitutionId() institutionId: string,
    @Body(new ZodValidationPipe(CreateExpenseSchema)) dto: CreateExpenseDto,
  ) {
    return this.expenseService.create(institutionId, dto);
  }

  @Get()
  findAll(
    @InstitutionId() institutionId: string,
    @Query(new ZodValidationPipe(ExpenseQuerySchema)) query: ExpenseQueryDto,
  ) {
    return this.expenseService.findAll(institutionId, query);
  }

  @Post('process-recurring')
  processRecurring(@InstitutionId() institutionId: string) {
    return this.expenseService.processRecurringExpenses(institutionId);
  }

  @Get(':id')
  findOne(
    @InstitutionId() institutionId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.expenseService.findOne(institutionId, id);
  }

  @Patch(':id')
  update(
    @InstitutionId() institutionId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateExpenseSchema)) dto: UpdateExpenseDto,
  ) {
    return this.expenseService.update(institutionId, id, dto);
  }

  @Delete(':id')
  delete(
    @InstitutionId() institutionId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.expenseService.delete(institutionId, id);
  }
}
