import { Injectable, Logger } from '@nestjs/common';
import { Snap } from 'midtrans-client';
import * as crypto from 'crypto';

interface CreateTransactionParams {
  orderId: string;
  grossAmount: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  itemName: string;
}

interface GatewayConfig {
  midtrans_server_key: string;
  midtrans_client_key: string;
  is_sandbox: boolean;
}

interface VerifySignatureParams {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  serverKey: string;
  signatureKey: string;
}

@Injectable()
export class MidtransService {
  private readonly logger = new Logger(MidtransService.name);

  async createSnapTransaction(
    config: GatewayConfig,
    params: CreateTransactionParams,
  ): Promise<{ token: string; redirect_url: string }> {
    const snap = new Snap({
      isProduction: !config.is_sandbox,
      serverKey: config.midtrans_server_key,
      clientKey: config.midtrans_client_key,
    });

    const transactionParams = {
      transaction_details: {
        order_id: params.orderId,
        gross_amount: params.grossAmount,
      },
      customer_details: {
        first_name: params.customerName,
        email: params.customerEmail,
        phone: params.customerPhone,
      },
      item_details: [
        {
          id: params.orderId,
          price: params.grossAmount,
          quantity: 1,
          name: params.itemName.slice(0, 50),
        },
      ],
    };

    this.logger.log(`Creating Snap transaction for order ${params.orderId}`);
    return snap.createTransaction(transactionParams);
  }

  verifySignature(params: VerifySignatureParams): boolean {
    const hash = crypto
      .createHash('sha512')
      .update(
        params.orderId + params.statusCode + params.grossAmount + params.serverKey,
      )
      .digest('hex');
    return hash === params.signatureKey;
  }

  mapTransactionStatus(transactionStatus: string): 'PAID' | 'PENDING' | null {
    switch (transactionStatus) {
      case 'settlement':
      case 'capture':
        return 'PAID';
      case 'expire':
        return 'PENDING';
      default:
        return null;
    }
  }
}
