import { Module } from '@nestjs/common';
import { ExpenseController } from './expense.controller.js';
import { ExpenseService } from './expense.service.js';
import { ExpenseCron } from './expense.cron.js';

@Module({
  controllers: [ExpenseController],
  providers: [ExpenseService, ExpenseCron],
  exports: [ExpenseService],
})
export class ExpenseModule {}
