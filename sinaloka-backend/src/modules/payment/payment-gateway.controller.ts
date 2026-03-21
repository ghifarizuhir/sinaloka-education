import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  ParseUUIDPipe,
  BadRequestException,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { SubscriptionPaymentService } from '../subscription/subscription-payment.service.js';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { InstitutionId } from '../../common/decorators/institution-id.decorator.js';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { MidtransService } from './midtrans.service.js';
import { calculateFee } from '../settlement/fee-rates.js';

@Controller('payments')
export class PaymentGatewayController {
  private readonly logger = new Logger(PaymentGatewayController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
    private readonly midtransService: MidtransService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => SubscriptionPaymentService))
    private readonly subscriptionPaymentService: SubscriptionPaymentService,
  ) {}

  @Post(':id/checkout')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PARENT)
  async checkout(
    @CurrentUser() user: JwtPayload,
    @InstitutionId() institutionId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, institution_id: institutionId },
      include: {
        student: true,
        enrollment: { include: { class: true } },
      },
    });

    if (!payment) {
      throw new BadRequestException('Payment not found');
    }

    // If PARENT role, verify they own the student
    if (user.role === Role.PARENT) {
      const parent = await this.prisma.parent.findFirst({
        where: { user_id: user.userId },
        select: { id: true },
      });

      if (!parent) {
        throw new ForbiddenException('Parent profile not found');
      }

      const link = await this.prisma.parentStudent.findFirst({
        where: {
          parent_id: parent.id,
          student_id: payment.student_id,
        },
      });

      if (!link) {
        throw new ForbiddenException('You do not have access to this payment');
      }
    }

    if (payment.status !== 'PENDING' && payment.status !== 'OVERDUE') {
      throw new BadRequestException(
        'Payment must be in PENDING or OVERDUE status to checkout',
      );
    }

    const gatewayConfig = await this.settingsService.getPaymentGatewayConfig(
      institutionId,
    );

    if (
      !gatewayConfig.midtrans_server_key ||
      !gatewayConfig.midtrans_client_key
    ) {
      throw new BadRequestException('Payment gateway is not configured');
    }

    const itemName = payment.enrollment?.class?.name ?? 'Tuition Fee';

    // Unique order ID per checkout attempt — Midtrans rejects reused order_ids
    const orderId = `${payment.id}-${Date.now()}`;

    const snapResult = await this.midtransService.createSnapTransaction(
      {
        midtrans_server_key: gatewayConfig.midtrans_server_key,
        midtrans_client_key: gatewayConfig.midtrans_client_key,
        is_sandbox: gatewayConfig.is_sandbox,
      },
      {
        orderId,
        grossAmount: Number(payment.amount),
        customerName: payment.student?.name,
        itemName,
      },
    );

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        snap_token: snapResult.token,
        snap_redirect_url: snapResult.redirect_url,
        midtrans_transaction_id: orderId,
      },
    });

    return {
      snap_token: snapResult.token,
      redirect_url: snapResult.redirect_url,
    };
  }

  @Post('midtrans-webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  async midtransWebhook(@Body() body: Record<string, any>) {
    // Route subscription payments to SubscriptionPaymentService
    const orderId = body.order_id;
    if (orderId && orderId.startsWith('SUB-')) {
      return this.subscriptionPaymentService.handleWebhook(body);
    }

    const {
      order_id,
      transaction_status,
      status_code,
      gross_amount,
      signature_key,
    } = body;

    // Extract payment UUID from order_id format "{uuid}-{timestamp}"
    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const uuidPart = order_id.slice(0, 36);
    const suffix = order_id.slice(36);
    const paymentId =
      UUID_RE.test(uuidPart) && (!suffix || /^-\d{13}$/.test(suffix))
        ? uuidPart
        : order_id; // fallback: treat full string as ID (legacy format)

    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId },
      select: {
        id: true,
        status: true,
        amount: true,
        institution_id: true,
      },
    });

    if (!payment) {
      return { status: 'payment_not_found' };
    }

    if (payment.status === 'PAID') {
      return { status: 'already_paid' };
    }

    const gatewayConfig = await this.settingsService.getPaymentGatewayConfig(
      payment.institution_id,
    );

    if (!gatewayConfig.midtrans_server_key) {
      this.logger.warn(
        `Webhook for payment ${order_id} but gateway not configured`,
      );
      throw new BadRequestException(
        'Payment gateway not configured for this institution',
      );
    }

    const signatureValid = this.midtransService.verifySignature({
      orderId: order_id,
      statusCode: status_code,
      grossAmount: gross_amount,
      serverKey: gatewayConfig.midtrans_server_key,
      signatureKey: signature_key,
    });

    if (!signatureValid) {
      return { status: 'invalid_signature' };
    }

    // Verify gross_amount matches payment.amount
    const webhookAmount = parseFloat(gross_amount);
    const paymentAmount = Number(payment.amount);
    if (Math.abs(webhookAmount - paymentAmount) > 0.01) {
      return { status: 'amount_mismatch' };
    }

    const newStatus =
      this.midtransService.mapTransactionStatus(transaction_status);

    const paymentType = (body.payment_type as string) ?? 'unknown';

    if (newStatus !== null) {
      try {
        if (newStatus === 'PAID') {
          const { midtransFee, transferAmount, platformCost } = calculateFee(
            Number(payment.amount),
            paymentType,
            this.configService,
          );

          await this.prisma.$transaction(async (tx) => {
            await tx.payment.update({
              where: { id: payment.id },
              data: {
                status: 'PAID',
                paid_date: new Date(),
                method: 'MIDTRANS',
                midtrans_payment_type: paymentType,
              },
            });

            await tx.settlement.create({
              data: {
                institution_id: payment.institution_id,
                payment_id: payment.id,
                gross_amount: Number(payment.amount),
                midtrans_fee: midtransFee,
                transfer_amount: transferAmount,
                platform_cost: platformCost,
                status: 'PENDING',
              },
            });
          });
        } else {
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: newStatus,
              midtrans_payment_type: paymentType,
            },
          });
        }
      } catch (err) {
        this.logger.error(
          `Webhook processing failed for order ${order_id}: ${err}`,
        );
        throw err; // Re-throw so Midtrans gets 500 and retries
      }
    }

    return { status: 'ok' };
  }

  @Get(':id/status')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PARENT)
  async getStatus(
    @CurrentUser() user: JwtPayload,
    @InstitutionId() institutionId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, institution_id: institutionId },
      select: {
        id: true,
        status: true,
        paid_date: true,
        method: true,
        student_id: true,
      },
    });

    if (!payment) {
      throw new BadRequestException('Payment not found');
    }

    // If PARENT role, verify they own the student
    if (user.role === Role.PARENT) {
      const parent = await this.prisma.parent.findFirst({
        where: { user_id: user.userId },
        select: { id: true },
      });

      if (!parent) {
        throw new ForbiddenException('Parent profile not found');
      }

      const link = await this.prisma.parentStudent.findFirst({
        where: {
          parent_id: parent.id,
          student_id: payment.student_id,
        },
      });

      if (!link) {
        throw new ForbiddenException('You do not have access to this payment');
      }
    }

    return {
      id: payment.id,
      status: payment.status,
      paid_date: payment.paid_date,
      method: payment.method,
    };
  }
}
