import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { MidtransService } from '../payment/midtrans.service.js';
import { SubscriptionService } from './subscription.service.js';
import { EmailService } from '../email/email.service.js';
import { PLAN_LIMITS } from '../../common/constants/plans.js';
import { SUBSCRIPTION_ORDER_PREFIX } from './subscription.constants.js';
import type { CreateSubscriptionPaymentDto } from './dto/create-payment.dto.js';
import type { ConfirmSubscriptionPaymentDto } from './dto/confirm-payment.dto.js';
import type { PaymentQueryDto } from './dto/subscription-query.dto.js';
import type { PlanType } from '../../../generated/prisma/client.js';

@Injectable()
export class SubscriptionPaymentService {
  private readonly logger = new Logger(SubscriptionPaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly midtransService: MidtransService,
    private readonly subscriptionService: SubscriptionService,
    private readonly emailService: EmailService,
  ) {}

  private getMidtransConfig() {
    return {
      midtrans_server_key:
        this.configService.get<string>('SUBSCRIPTION_MIDTRANS_SERVER_KEY') ??
        '',
      midtrans_client_key:
        this.configService.get<string>('SUBSCRIPTION_MIDTRANS_CLIENT_KEY') ??
        '',
      is_sandbox:
        this.configService.get<string>('SUBSCRIPTION_MIDTRANS_SANDBOX') !==
        'false',
    };
  }

  private async generateInvoiceNumber(): Promise<string> {
    const result = await this.prisma.$queryRaw<[{ nextval: bigint }]>`
      SELECT nextval('subscription_invoice_seq')
    `;
    const seq = Number(result[0].nextval);
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    return `INV-${yearMonth}-${String(seq).padStart(5, '0')}`;
  }

  async createPayment(
    institutionId: string,
    dto: CreateSubscriptionPaymentDto,
  ) {
    const planConfig = PLAN_LIMITS[dto.plan_type as PlanType];
    if (!planConfig || planConfig.price === null) {
      throw new BadRequestException('This plan does not require payment');
    }
    const amount = planConfig.price;

    // Check for existing PENDING payment
    const existingPending = await this.prisma.subscriptionPayment.findFirst({
      where: {
        institution_id: institutionId,
        status: 'PENDING',
      },
    });

    if (existingPending) {
      throw new BadRequestException(
        'There is already a pending payment for this institution. Please complete or cancel it first.',
      );
    }

    if (dto.method === 'MIDTRANS') {
      const orderId = `${SUBSCRIPTION_ORDER_PREFIX}-${institutionId}-${Date.now()}`;
      const config = this.getMidtransConfig();

      if (!config.midtrans_server_key || !config.midtrans_client_key) {
        throw new BadRequestException(
          'Subscription payment gateway is not configured',
        );
      }

      const snapResult = await this.midtransService.createSnapTransaction(
        config,
        {
          orderId,
          grossAmount: amount,
          itemName: `Sinaloka ${planConfig.label} Plan - ${dto.type === 'renewal' ? 'Renewal' : 'New'}`,
        },
      );

      const payment = await this.prisma.subscriptionPayment.create({
        data: {
          institution_id: institutionId,
          plan_type: dto.plan_type as PlanType,
          payment_type: dto.type,
          amount,
          method: 'MIDTRANS',
          status: 'PENDING',
          subscription_id: null,
          midtrans_order_id: orderId,
        },
      });

      return {
        payment_id: payment.id,
        snap_token: snapResult.token,
        snap_redirect_url: snapResult.redirect_url,
      };
    } else {
      // MANUAL_TRANSFER
      if (!dto.proof_url) {
        throw new BadRequestException(
          'proof_url is required for manual transfer payments',
        );
      }

      const payment = await this.prisma.subscriptionPayment.create({
        data: {
          institution_id: institutionId,
          plan_type: dto.plan_type as PlanType,
          payment_type: dto.type,
          amount,
          method: 'MANUAL_TRANSFER',
          status: 'PENDING',
          subscription_id: null,
          proof_url: dto.proof_url,
        },
      });

      // Email SUPER_ADMINs about pending payment
      const superAdmins = await this.prisma.user.findMany({
        where: { role: 'SUPER_ADMIN', is_active: true },
        select: { email: true, name: true },
      });

      const institution = await this.prisma.institution.findUnique({
        where: { id: institutionId },
        select: { name: true },
      });

      for (const admin of superAdmins) {
        this.emailService
          .sendSubscriptionPendingPaymentNotification(
            admin.email,
            institution?.name ?? institutionId,
          )
          .catch((err: unknown) => {
            this.logger.warn(
              `Failed to send pending review email to ${admin.email}`,
              err,
            );
          });
      }

      return {
        payment_id: payment.id,
        status: 'PENDING',
      };
    }
  }

  async handleWebhook(body: Record<string, unknown>) {
    const {
      order_id,
      transaction_id,
      transaction_status,
      status_code,
      gross_amount,
      signature_key,
    } = body as {
      order_id: string;
      transaction_id: string;
      transaction_status: string;
      status_code: string;
      gross_amount: string;
      signature_key: string;
    };

    const payment = await this.prisma.subscriptionPayment.findFirst({
      where: { midtrans_order_id: order_id },
      select: {
        id: true,
        status: true,
        amount: true,
        institution_id: true,
        plan_type: true,
        payment_type: true,
      },
    });

    if (!payment) {
      return { status: 'payment_not_found' };
    }

    if (payment.status === 'PAID') {
      return { status: 'already_paid' };
    }

    const config = this.getMidtransConfig();

    const signatureValid = this.midtransService.verifySignature({
      orderId: order_id,
      statusCode: status_code,
      grossAmount: gross_amount,
      serverKey: config.midtrans_server_key,
      signatureKey: signature_key,
    });

    if (!signatureValid) {
      this.logger.warn(
        `Invalid signature for subscription webhook order ${order_id}`,
      );
      return { status: 'invalid_signature' };
    }

    const newStatus =
      this.midtransService.mapTransactionStatus(transaction_status);

    if (newStatus === 'PAID') {
      // Activate subscription
      const subscriptionId =
        await this.subscriptionService.activateSubscription(
          payment.institution_id,
          payment.plan_type,
          payment.payment_type as 'new' | 'renewal',
        );

      const now = new Date();

      // Update payment: set PAID + link to subscription
      await this.prisma.subscriptionPayment.update({
        where: { id: payment.id },
        data: {
          status: 'PAID',
          paid_at: now,
          midtrans_transaction_id: transaction_id,
          subscription_id: subscriptionId,
        },
      });

      // Get subscription dates for accurate invoice period
      const activatedSubscription =
        await this.subscriptionService.getActiveSubscription(
          payment.institution_id,
        );
      const periodStart = activatedSubscription?.started_at ?? now;
      const periodEnd = activatedSubscription?.expires_at ?? now;

      // Create invoice now that we have a subscription
      await this.createInvoiceForPayment(
        payment.id,
        payment.institution_id,
        subscriptionId,
        payment.amount,
        'PAID',
        periodStart,
        periodEnd,
      );

      // Email ADMINs confirmation
      await this.sendActivationEmails(
        payment.institution_id,
        payment.plan_type,
      );
    } else if (newStatus === 'PENDING') {
      // Expired or other non-terminal state — do not change payment status
      // (Midtrans expire → leave as PENDING, or mark EXPIRED)
      if (transaction_status === 'expire') {
        await this.prisma.subscriptionPayment.update({
          where: { id: payment.id },
          data: { status: 'EXPIRED' },
        });
      }
    }

    return { status: 'ok' };
  }

  async confirmPayment(
    paymentId: string,
    dto: ConfirmSubscriptionPaymentDto,
    reviewerId: string,
  ) {
    const payment = await this.prisma.subscriptionPayment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        status: true,
        method: true,
        institution_id: true,
        plan_type: true,
        payment_type: true,
        amount: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== 'PENDING') {
      throw new BadRequestException('Payment is not in PENDING status');
    }

    if (payment.method !== 'MANUAL_TRANSFER') {
      throw new BadRequestException(
        'Only MANUAL_TRANSFER payments can be confirmed manually',
      );
    }

    const now = new Date();

    if (dto.action === 'approve') {
      // Activate subscription
      const subscriptionId =
        await this.subscriptionService.activateSubscription(
          payment.institution_id,
          payment.plan_type,
          payment.payment_type as 'new' | 'renewal',
        );

      // Update payment: PAID + link to subscription
      await this.prisma.subscriptionPayment.update({
        where: { id: paymentId },
        data: {
          status: 'PAID',
          paid_at: now,
          confirmed_by: reviewerId,
          confirmed_at: now,
          subscription_id: subscriptionId,
        },
      });

      // Get subscription dates for accurate invoice period
      const activatedSubscription =
        await this.subscriptionService.getActiveSubscription(
          payment.institution_id,
        );
      const periodStart = activatedSubscription?.started_at ?? now;
      const periodEnd = activatedSubscription?.expires_at ?? now;

      // Create invoice now that we have a subscription
      await this.createInvoiceForPayment(
        payment.id,
        payment.institution_id,
        subscriptionId,
        payment.amount,
        'PAID',
        periodStart,
        periodEnd,
      );

      // Email ADMINs confirmation
      await this.sendActivationEmails(
        payment.institution_id,
        payment.plan_type,
      );

      return { status: 'approved' };
    } else {
      // reject
      await this.prisma.subscriptionPayment.update({
        where: { id: paymentId },
        data: {
          status: 'FAILED',
          confirmed_by: reviewerId,
          confirmed_at: now,
          notes: dto.notes,
        },
      });

      // Email ADMINs rejection with reason
      await this.sendRejectionEmails(
        payment.institution_id,
        payment.plan_type,
        dto.notes,
      );

      return { status: 'rejected' };
    }
  }

  async listPayments(query: PaymentQueryDto) {
    const where: Record<string, unknown> = {};
    if (query.status) where['status'] = query.status;
    if (query.method) where['method'] = query.method;
    if (query.institution_id) where['institution_id'] = query.institution_id;

    const skip = (query.page - 1) * query.limit;

    const [items, total] = await Promise.all([
      this.prisma.subscriptionPayment.findMany({
        where,
        include: {
          institution: {
            select: { id: true, name: true },
          },
          subscription: {
            select: {
              id: true,
              plan_type: true,
              status: true,
              expires_at: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.subscriptionPayment.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  private async createInvoiceForPayment(
    paymentId: string,
    institutionId: string,
    subscriptionId: string,
    amount: number,
    status: 'DRAFT' | 'SENT' | 'PAID',
    periodStart: Date,
    periodEnd: Date,
  ) {
    const invoiceNumber = await this.generateInvoiceNumber();

    await this.prisma.subscriptionInvoice.create({
      data: {
        institution_id: institutionId,
        subscription_id: subscriptionId,
        invoice_number: invoiceNumber,
        amount,
        period_start: periodStart,
        period_end: periodEnd,
        due_date: periodStart,
        status,
        payment_id: paymentId,
      },
    });
  }

  private async sendActivationEmails(
    institutionId: string,
    planType: PlanType,
  ) {
    const admins = await this.prisma.user.findMany({
      where: {
        institution_id: institutionId,
        role: 'ADMIN',
        is_active: true,
      },
      select: { email: true },
    });

    const subscription =
      await this.subscriptionService.getActiveSubscription(institutionId);
    const expiresAt = subscription?.expires_at ?? new Date();

    for (const admin of admins) {
      this.emailService
        .sendSubscriptionPaymentConfirmed(admin.email, planType, expiresAt)
        .catch((err: unknown) => {
          this.logger.warn(
            `Failed to send activation email to ${admin.email}`,
            err,
          );
        });
    }
  }

  private async sendRejectionEmails(
    institutionId: string,
    _planType: PlanType,
    reason?: string,
  ) {
    const admins = await this.prisma.user.findMany({
      where: {
        institution_id: institutionId,
        role: 'ADMIN',
        is_active: true,
      },
      select: { email: true },
    });

    for (const admin of admins) {
      this.emailService
        .sendSubscriptionPaymentRejected(admin.email, reason ?? '')
        .catch((err: unknown) => {
          this.logger.warn(
            `Failed to send rejection email to ${admin.email}`,
            err,
          );
        });
    }
  }
}
