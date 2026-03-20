import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  const corsOrigins = configService.get<string>('CORS_ORIGINS', '');
  // Trust proxy for correct client IP behind Railway reverse proxy
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  app.enableCors({
    origin: corsOrigins ? corsOrigins.split(',').map(o => o.trim()) : true,
    credentials: true,
  });
  app.setGlobalPrefix('api');

  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Application is running on: http://localhost:${port}/api`);
}

bootstrap();
