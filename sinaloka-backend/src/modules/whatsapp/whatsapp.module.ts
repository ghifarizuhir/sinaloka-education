import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service.js';
import { WhatsappController } from './whatsapp.controller.js';
import { WhatsappCron } from './whatsapp.cron.js';

@Module({
  controllers: [WhatsappController],
  providers: [WhatsappService, WhatsappCron],
  exports: [WhatsappService],
})
export class WhatsappModule {}
