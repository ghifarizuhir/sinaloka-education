import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WhatsappService } from '../whatsapp.service.js';

@Injectable()
export class PaymentRemindListener {
  private readonly logger = new Logger(PaymentRemindListener.name);

  constructor(private readonly whatsappService: WhatsappService) {}

  @OnEvent('payment.remind')
  async handlePaymentRemind(payload: {
    institutionId: string;
    paymentId: string;
  }) {
    try {
      await this.whatsappService.sendPaymentReminder(
        payload.institutionId,
        payload.paymentId,
      );
      this.logger.log(`Payment reminder sent for payment ${payload.paymentId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send payment reminder for ${payload.paymentId}: ${error.message}`,
      );
    }
  }
}
