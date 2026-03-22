import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, from, switchMap, tap } from 'rxjs';
import { Request, Response } from 'express';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { AUDIT_EVENTS, AuditLogEvent } from './audit-log.events.js';
import { NO_AUDIT_LOG_KEY } from './decorators/no-audit-log.decorator.js';
import { buildSummary } from './audit-log.summary.js';
import { computeDiff, buildCreateChanges, buildDeleteChanges } from './audit-log.utils.js';

const MUTATION_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

function resolveAction(method: string): string {
  if (method === 'POST') return 'CREATE';
  if (method === 'PUT' || method === 'PATCH') return 'UPDATE';
  if (method === 'DELETE') return 'DELETE';
  return method;
}

const RESOURCE_TO_MODEL: Record<string, string> = {
  student: 'student',
  tutor: 'user',
  parent: 'user',
  user: 'user',
  class: 'class',
  session: 'session',
  payment: 'payment',
  enrollment: 'enrollment',
  attendance: 'attendance',
  expense: 'expense',
  subject: 'subject',
  settlement: 'settlement',
  payout: 'payout',
  registration: 'registration',
  invitation: 'invitation',
  whatsapp_template: 'whatsappTemplate',
  notification: 'notification',
  institution: 'institution',
  subscription: 'subscription',
};

function resolveResourceType(endpoint: string): string {
  const segments = endpoint.replace(/^\/api\/(admin|super-admin|tutor|parent)\//, '').split('/');
  let resource = segments[0] ?? 'unknown';
  if (resource === 'finance' && segments[1]) resource = segments[1];
  return resource
    .replace(/-/g, '_')
    .replace(/ies$/, 'y')
    .replace(/s$/, '');
}

function resolveResourceIdFromUrl(endpoint: string): string | null {
  const idMatch = endpoint.match(
    /\/([a-f0-9-]{36}|c[a-z0-9]{24,})(?:\/|$)/i,
  );
  return idMatch ? idMatch[1] : null;
}

interface TenantRequest extends Request {
  tenantId?: string;
  user?: { userId: string; role: string; institutionId?: string };
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    const method = request.method;

    if (!MUTATION_METHODS.includes(method)) {
      return next.handle();
    }

    const noAudit = this.reflector.getAllAndOverride<boolean>(NO_AUDIT_LOG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (noAudit) {
      return next.handle();
    }

    if (!request.user?.userId) {
      return next.handle();
    }

    const user = request.user;
    const endpoint = request.originalUrl.split('?')[0];
    const requestBody = request.body as Record<string, unknown> | null;
    const action = resolveAction(method);
    const resourceType = resolveResourceType(endpoint);
    const resourceIdFromUrl = resolveResourceIdFromUrl(endpoint);

    const needsBeforeState = (action === 'UPDATE' || action === 'DELETE') && resourceIdFromUrl;
    const beforeStatePromise = needsBeforeState
      ? this.fetchBeforeState(resourceType, resourceIdFromUrl!)
      : Promise.resolve(null);

    return from(beforeStatePromise).pipe(
      switchMap((beforeState) =>
        next.handle().pipe(
          tap({
            next: (responseBody) => {
              const response = context.switchToHttp().getResponse<Response>();
              const statusCode = response.statusCode;

              if (statusCode < 200 || statusCode >= 300) return;

              const resourceId = resourceIdFromUrl ??
                (responseBody && typeof responseBody === 'object' && 'id' in responseBody
                  ? (responseBody as Record<string, unknown>).id as string
                  : null);

              let changes: Record<string, { before: unknown; after: unknown }> | null = null;
              if (action === 'UPDATE' && beforeState && responseBody && typeof responseBody === 'object') {
                changes = computeDiff(beforeState, responseBody as Record<string, unknown>);
              } else if (action === 'CREATE' && responseBody && typeof responseBody === 'object') {
                changes = buildCreateChanges(responseBody as Record<string, unknown>);
              } else if (action === 'DELETE' && beforeState) {
                changes = buildDeleteChanges(beforeState);
              }

              const summary = buildSummary(action, resourceType, beforeState, requestBody, resourceId);

              const event: AuditLogEvent = {
                institutionId: request.tenantId ?? user.institutionId ?? null,
                userId: user.userId,
                userRole: user.role,
                action,
                resourceType,
                resourceId,
                summary,
                changes,
                httpMethod: method,
                endpoint,
                statusCode,
                ipAddress: (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? request.ip ?? null,
                userAgent: request.headers['user-agent'] ?? null,
              };

              this.eventEmitter.emit(AUDIT_EVENTS.LOG, event);
            },
          }),
        ),
      ),
    );
  }

  private async fetchBeforeState(
    resourceType: string,
    resourceId: string,
  ): Promise<Record<string, unknown> | null> {
    try {
      const modelName = RESOURCE_TO_MODEL[resourceType];
      if (!modelName) return null;

      const delegate = (this.prisma as any)[modelName];
      if (!delegate?.findUnique) return null;

      return await delegate.findUnique({ where: { id: resourceId } });
    } catch {
      this.logger.warn(`Failed to fetch before-state for ${resourceType}:${resourceId}`);
      return null;
    }
  }
}
