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
} from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { MidtransService } from './midtrans.service.js';

@Controller('payments')
export class PaymentGatewayController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
    private readonly midtransService: MidtransService,
  ) {}

  @Post(':id/checkout')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PARENT)
  async checkout(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, institution_id: user.institutionId! },
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
      user.institutionId!,
    );

    if (!gatewayConfig.midtrans_server_key || !gatewayConfig.midtrans_client_key) {
      throw new BadRequestException('Payment gateway is not configured');
    }

    const itemName = payment.enrollment?.class?.name ?? 'Tuition Fee';

    const snapResult = await this.midtransService.createSnapTransaction(
      {
        midtrans_server_key: gatewayConfig.midtrans_server_key,
        midtrans_client_key: gatewayConfig.midtrans_client_key,
        is_sandbox: gatewayConfig.is_sandbox,
      },
      {
        orderId: payment.id,
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
        midtrans_transaction_id: payment.id,
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
    const {
      order_id,
      transaction_status,
      status_code,
      gross_amount,
      signature_key,
    } = body;

    const payment = await this.prisma.payment.findFirst({
      where: { id: order_id },
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

    const newStatus = this.midtransService.mapTransactionStatus(transaction_status);

    if (newStatus !== null) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: newStatus,
          ...(newStatus === 'PAID' && {
            paid_date: new Date(),
            method: 'MIDTRANS',
          }),
        },
      });
    }

    return { status: 'ok' };
  }

  @Get(':id/status')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PARENT)
  async getStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, institution_id: user.institutionId! },
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
