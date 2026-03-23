import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationController } from './notification.controller.js';
import { NotificationService } from './notification.service.js';
import { NotificationListener } from './notification.listener.js';
import { NotificationGateway } from './notification.gateway.js';
import { PaymentReminderCron } from './payment-reminder.cron.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationListener, NotificationGateway, PaymentReminderCron],
  exports: [NotificationService],
})
export class NotificationModule {}
