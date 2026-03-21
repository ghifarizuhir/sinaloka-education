import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import type { TenantRequest } from '../interceptors/tenant.interceptor.js';

/**
 * Resolves the institution ID from the request.
 * Uses `request.tenantId` (set by TenantInterceptor) with fallback to `user.institutionId`.
 * Throws BadRequestException if neither is available.
 *
 * This is the correct way to get institution ID in controllers —
 * do NOT use `user.institutionId!` directly, as it is null for SUPER_ADMIN.
 */
export const InstitutionId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<TenantRequest>();
    const id = request.tenantId ?? request.user?.institutionId;
    if (!id) {
      throw new BadRequestException('Institution ID is required');
    }
    return id;
  },
);
