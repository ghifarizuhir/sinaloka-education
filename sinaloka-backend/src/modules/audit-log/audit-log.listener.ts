import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { AUDIT_EVENTS } from './audit-log.events.js';
import type { AuditLogEvent } from './audit-log.events.js';

@Injectable()
export class AuditLogListener {
  private readonly logger = new Logger(AuditLogListener.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(AUDIT_EVENTS.LOG, { async: true })
  async handleAuditLog(event: AuditLogEvent): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          institution_id: event.institutionId,
          user_id: event.userId,
          user_role: event.userRole,
          action: event.action,
          resource_type: event.resourceType,
          resource_id: event.resourceId,
          summary: event.summary,
          changes: event.changes ? (event.changes as object) : undefined,
          http_method: event.httpMethod,
          endpoint: event.endpoint,
          status_code: event.statusCode,
          ip_address: event.ipAddress,
          user_agent: event.userAgent,
        },
      });
    } catch (error) {
      this.logger.error('Failed to persist audit log', error);
    }
  }
}
