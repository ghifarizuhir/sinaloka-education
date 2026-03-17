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
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(CreateExpenseSchema)) dto: CreateExpenseDto,
  ) {
    return this.expenseService.create(user.institutionId!, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(ExpenseQuerySchema)) query: ExpenseQueryDto,
  ) {
    return this.expenseService.findAll(user.institutionId!, query);
  }

  @Post('process-recurring')
  processRecurring(@CurrentUser() user: JwtPayload) {
    return this.expenseService.processRecurringExpenses(user.institutionId!);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.expenseService.findOne(user.institutionId!, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateExpenseSchema)) dto: UpdateExpenseDto,
  ) {
    return this.expenseService.update(user.institutionId!, id, dto);
  }

  @Delete(':id')
  delete(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.expenseService.delete(user.institutionId!, id);
  }
}
