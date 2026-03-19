import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { Role } from '../../../generated/prisma/client.js';
import { JwtPayload } from '../decorators/current-user.decorator.js';

export interface TenantRequest extends Request {
  user: JwtPayload;
  tenantId: string | null;
}

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    const user = request.user;

    // Skip tenant injection if no user (public routes)
    if (!user) {
      return next.handle();
    }

    if (user.role === Role.SUPER_ADMIN) {
      // SUPER_ADMIN can optionally scope to an institution via query param
      request.tenantId = (request.query['institution_id'] as string) || null;
    } else if (
      user.role === Role.ADMIN ||
      user.role === Role.TUTOR ||
      user.role === Role.PARENT
    ) {
      if (!user.institutionId) {
        throw new ForbiddenException(
          'User is not associated with any institution',
        );
      }
      request.tenantId = user.institutionId;
    } else {
      request.tenantId = null;
    }

    return next.handle();
  }
}
