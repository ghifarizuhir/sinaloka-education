import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface PlanWarning {
  type: string;
  resource: string;
  current: number;
  limit: number;
  gracePeriodEnds: string;
  message: string;
}

interface RequestWithPlanWarning {
  _planWarning?: PlanWarning;
}

@Injectable()
export class PlanWarningInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithPlanWarning>();

    return next.handle().pipe(
      map((data: unknown) => {
        if (request._planWarning) {
          return {
            ...(data as object),
            _warning: request._planWarning,
          };
        }
        return data;
      }),
    );
  }
}
