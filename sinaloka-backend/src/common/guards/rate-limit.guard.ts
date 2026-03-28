import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

const RATE_LIMIT_KEY = 'rate_limit';

export const RateLimit = (maxRequests: number, windowMs: number) =>
  SetMetadata(RATE_LIMIT_KEY, { maxRequests, windowMs });

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * In-memory store for rate limiting.
 *
 * ⚠️ SINGLE-INSTANCE LIMITATION: This Map lives in process memory.
 * It is effective only when the backend runs as a single process (current
 * Railway deployment). If the service is ever scaled horizontally to multiple
 * instances, each instance will maintain its own separate counter, allowing
 * a client to multiply its allowed request rate by the instance count.
 *
 * Future migration path: replace with @nestjs/throttler backed by a Redis
 * adapter (e.g. `@nest-lab/throttler-storage-redis`) so counters are shared
 * across all instances.
 *
 * SA-AUTH-005 — tracked in audit-2026-03-28-auth.md
 */
const ipMap = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 10 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of ipMap) {
      if (entry.resetAt <= now) ipMap.delete(key);
    }
  },
  10 * 60 * 1000,
);

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const config = this.reflector.get<{
      maxRequests: number;
      windowMs: number;
    }>(RATE_LIMIT_KEY, context.getHandler());

    if (!config) return true;

    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    const key = `${ip}:${context.getHandler().name}`;
    const now = Date.now();

    const entry = ipMap.get(key);

    if (!entry || entry.resetAt <= now) {
      ipMap.set(key, { count: 1, resetAt: now + config.windowMs });
      return true;
    }

    if (entry.count >= config.maxRequests) {
      throw new HttpException(
        'Terlalu banyak percobaan. Silakan coba lagi nanti.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    entry.count++;
    return true;
  }
}
