import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  const corsOrigins = configService.get<string>('CORS_ORIGINS', '');
  const wildcardDomain = configService.get<string>('CORS_WILDCARD_DOMAIN', '');
  // Trust proxy for correct client IP behind Railway reverse proxy
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (non-browser, e.g. mobile apps, curl)
      if (!origin) return callback(null, true);

      // Check static allowed origins
      const allowed = corsOrigins
        ? corsOrigins.split(',').map((o) => o.trim())
        : [];

      if (allowed.length === 0 && !wildcardDomain) {
        // No restrictions configured — allow all (backward compatible)
        return callback(null, true);
      }

      if (allowed.includes(origin)) {
        return callback(null, true);
      }

      // Check wildcard subdomain
      if (wildcardDomain) {
        try {
          const url = new URL(origin);
          if (url.hostname.endsWith(`.${wildcardDomain}`)) {
            return callback(null, true);
          }
        } catch {
          // malformed origin — reject
        }
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });
  app.setGlobalPrefix('api');

  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Application is running on: http://localhost:${port}/api`);
}

bootstrap();
