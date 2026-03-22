import { Module } from '@nestjs/common';
import { AuditLogController } from './audit-log.controller.js';
import { AuditLogService } from './audit-log.service.js';
import { AuditLogListener } from './audit-log.listener.js';

@Module({
  controllers: [AuditLogController],
  providers: [AuditLogService, AuditLogListener],
})
export class AuditLogModule {}
