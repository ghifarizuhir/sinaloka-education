import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface SubscriptionWarning {
  type: 'EXPIRED' | 'DOWNGRADE_PENDING' | 'GRACE_PERIOD' | 'EXPIRING_SOON';
  grace_ends_at?: string;
  days_remaining?: number;
}

interface RequestWithSubscriptionWarning {
  _subscriptionWarning?: SubscriptionWarning;
}

@Injectable()
export class SubscriptionWarningInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithSubscriptionWarning>();

    return next.handle().pipe(
      map((data: unknown) => {
        if (
          request._subscriptionWarning &&
          data !== null &&
          typeof data === 'object' &&
          !Array.isArray(data)
        ) {
          return {
            ...(data as object),
            _subscriptionWarning: request._subscriptionWarning,
          };
        }
        return data;
      }),
    );
  }
}
