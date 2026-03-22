import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { MidtransService } from './midtrans.service.js';
import { SettingsService } from '../settings/settings.service.js';

@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);

  constructor(
    private prisma: PrismaService,
    private midtransService: MidtransService,
    private settingsService: SettingsService,
  ) {}

  async getOrCreateCheckoutUrl(
    paymentId: string,
    institutionId: string,
  ): Promise<string | null> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, institution_id: institutionId },
      include: {
        student: { select: { name: true, email: true, parent_phone: true } },
        institution: { select: { name: true } },
      },
    });

    if (!payment) return null;

    // Only create checkout for PENDING or OVERDUE payments
    if (payment.status !== 'PENDING' && payment.status !== 'OVERDUE') {
      return null;
    }

    // Reuse existing URL if already generated
    if (payment.snap_redirect_url) {
      return payment.snap_redirect_url;
    }

    // Generate new checkout URL
    try {
      const config =
        await this.settingsService.getPaymentGatewayConfig(institutionId);
      if (!config?.midtrans_server_key || !config?.midtrans_client_key) {
        return null;
      }

      const orderId = `${payment.id}-${Date.now()}`;
      const result = await this.midtransService.createSnapTransaction(
        {
          midtrans_server_key: config.midtrans_server_key,
          midtrans_client_key: config.midtrans_client_key,
          is_sandbox: config.is_sandbox ?? true,
        },
        {
          orderId,
          grossAmount: Number(payment.amount),
          customerName: payment.student.name,
          itemName: 'Tuition Fee',
        },
      );

      // Persist on payment record
      await this.prisma.payment.update({
        where: { id: paymentId, institution_id: institutionId },
        data: {
          snap_token: result.token,
          snap_redirect_url: result.redirect_url,
          midtrans_transaction_id: orderId,
        },
      });

      return result.redirect_url;
    } catch (error) {
      this.logger.error(
        `Failed to create checkout URL for payment ${paymentId}`,
        error,
      );
      return null;
    }
  }
}
