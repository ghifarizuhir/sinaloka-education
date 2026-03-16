import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { WhatsappMessagesQueryDto, UpdateWhatsappSettingsDto } from './whatsapp.dto.js';

const GRAPH_API_URL = 'https://graph.facebook.com/v21.0';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly accessToken: string | undefined;
  private readonly phoneNumberId: string | undefined;
  private readonly appSecret: string | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.accessToken = this.config.get<string>('WHATSAPP_ACCESS_TOKEN');
    this.phoneNumberId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID');
    this.appSecret = this.config.get<string>('WHATSAPP_APP_SECRET');

    if (this.accessToken) {
      this.logger.log('WhatsApp Cloud API configured');
    } else {
      this.logger.warn('WhatsApp Cloud API not configured — module is no-op');
    }
  }

  isConfigured(): boolean {
    return !!this.accessToken && !!this.phoneNumberId;
  }

  normalizePhone(raw: string): string {
    let phone = raw.replace(/[\s\-\(\)]/g, '');
    if (phone.startsWith('0')) {
      phone = '+62' + phone.slice(1);
    } else if (phone.startsWith('62')) {
      phone = '+' + phone;
    } else if (!phone.startsWith('+')) {
      phone = '+62' + phone;
    }
    if (!/^\+\d{10,15}$/.test(phone)) {
      throw new BadRequestException(`Invalid phone number: ${raw}`);
    }
    return phone;
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.appSecret || !signature) return false;
    const expected = 'sha256=' + crypto
      .createHmac('sha256', this.appSecret)
      .update(payload)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }

  async sendTemplate(params: {
    institutionId: string;
    phone: string;
    templateName: string;
    templateLanguage: string;
    templateParams: string[];
    relatedType?: string;
    relatedId?: string;
  }) {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('WhatsApp is not configured');
    }

    const normalizedPhone = this.normalizePhone(params.phone);

    // Create pending record
    const message = await this.prisma.whatsappMessage.create({
      data: {
        institution_id: params.institutionId,
        phone: normalizedPhone,
        template_name: params.templateName,
        template_params: params.templateParams,
        related_type: params.relatedType ?? null,
        related_id: params.relatedId ?? null,
        status: 'PENDING',
      },
    });

    try {
      const response = await fetch(
        `${GRAPH_API_URL}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: normalizedPhone.replace('+', ''),
            type: 'template',
            template: {
              name: params.templateName,
              language: { code: params.templateLanguage },
              components: [
                {
                  type: 'body',
                  parameters: params.templateParams.map((value) => ({
                    type: 'text',
                    text: value,
                  })),
                },
              ],
            },
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data?.error?.message || `HTTP ${response.status}`;
        const isTransient = response.status >= 500 || response.status === 429;

        await this.prisma.whatsappMessage.update({
          where: { id: message.id },
          data: {
            status: 'FAILED',
            error: errorMsg,
            retry_count: isTransient ? { increment: 1 } : message.retry_count,
          },
        });

        this.logger.error(`WhatsApp send failed: ${errorMsg}`, { messageId: message.id });
        return this.prisma.whatsappMessage.findUnique({ where: { id: message.id } });
      }

      const waMessageId = data?.messages?.[0]?.id;
      return this.prisma.whatsappMessage.update({
        where: { id: message.id },
        data: {
          status: 'SENT',
          wa_message_id: waMessageId ?? null,
        },
      });
    } catch (error: any) {
      // Network error — transient, retryable
      await this.prisma.whatsappMessage.update({
        where: { id: message.id },
        data: {
          status: 'FAILED',
          error: error.message || 'Network error',
          retry_count: { increment: 1 },
        },
      });

      this.logger.error(`WhatsApp send error: ${error.message}`, { messageId: message.id });
      return this.prisma.whatsappMessage.findUnique({ where: { id: message.id } });
    }
  }

  async handleStatusUpdate(waMessageId: string, status: string): Promise<void> {
    if (!waMessageId) return;

    const statusMap: Record<string, string> = {
      sent: 'SENT',
      delivered: 'DELIVERED',
      read: 'READ',
      failed: 'FAILED',
    };

    const mappedStatus = statusMap[status];
    if (!mappedStatus) return;

    await this.prisma.whatsappMessage.updateMany({
      where: { wa_message_id: waMessageId },
      data: { status: mappedStatus },
    });
  }

  async getMessages(institutionId: string, query: WhatsappMessagesQueryDto) {
    const { page, limit, status, date_from, date_to, related_type } = query;
    const where: any = { institution_id: institutionId };
    if (status) where.status = status;
    if (related_type) where.related_type = related_type;
    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) where.created_at.gte = new Date(date_from);
      if (date_to) where.created_at.lte = new Date(date_to + 'T23:59:59.999Z');
    }

    const [data, total] = await Promise.all([
      this.prisma.whatsappMessage.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.whatsappMessage.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getStats(institutionId: string, dateFrom?: string, dateTo?: string) {
    const now = new Date();
    const startOfMonth = dateFrom
      ? new Date(dateFrom)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = dateTo
      ? new Date(dateTo + 'T23:59:59.999Z')
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const messages = await this.prisma.whatsappMessage.groupBy({
      by: ['status'],
      where: {
        institution_id: institutionId,
        created_at: { gte: startOfMonth, lte: endOfMonth },
      },
      _count: true,
    });

    const counts: Record<string, number> = {};
    let total = 0;
    for (const m of messages) {
      counts[m.status] = m._count;
      total += m._count;
    }

    return {
      configured: this.isConfigured(),
      total,
      sent: counts['SENT'] ?? 0,
      delivered: counts['DELIVERED'] ?? 0,
      read: counts['READ'] ?? 0,
      failed: counts['FAILED'] ?? 0,
      pending: counts['PENDING'] ?? 0,
    };
  }

  async getSettings(institutionId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { settings: true },
    });
    const settings = institution?.settings as Record<string, any> | null;
    return {
      auto_reminders: settings?.whatsapp_auto_reminders ?? true,
      remind_days_before: settings?.whatsapp_remind_days_before ?? 1,
    };
  }

  async updateSettings(institutionId: string, dto: UpdateWhatsappSettingsDto) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { settings: true },
    });
    const existing = (institution?.settings as Record<string, any>) ?? {};

    const updated = { ...existing };
    if (dto.auto_reminders !== undefined) {
      updated.whatsapp_auto_reminders = dto.auto_reminders;
    }
    if (dto.remind_days_before !== undefined) {
      updated.whatsapp_remind_days_before = dto.remind_days_before;
    }

    await this.prisma.institution.update({
      where: { id: institutionId },
      data: { settings: updated },
    });

    return {
      auto_reminders: updated.whatsapp_auto_reminders ?? true,
      remind_days_before: updated.whatsapp_remind_days_before ?? 1,
    };
  }

  async sendPaymentReminder(institutionId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, institution_id: institutionId },
      include: {
        student: { select: { name: true, parent_phone: true } },
        institution: { select: { name: true, default_language: true } },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    const parentPhone = payment.student.parent_phone;
    if (!parentPhone) {
      throw new BadRequestException('Student has no parent phone number');
    }

    // Dedup check — no successful message in last 24h
    const recentMessage = await this.prisma.whatsappMessage.findFirst({
      where: {
        related_type: 'payment',
        related_id: paymentId,
        status: { not: 'FAILED' },
        created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    if (recentMessage) {
      this.logger.debug(`Skipping payment ${paymentId} — reminder already sent`);
      return recentMessage;
    }

    const lang = payment.institution.default_language || 'id';
    const amount = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(payment.amount));
    const dueDate = new Date(payment.due_date).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const statusLabel = payment.status === 'OVERDUE'
      ? (lang === 'id' ? 'Terlambat' : 'Overdue')
      : (lang === 'id' ? 'Menunggu' : 'Pending');

    return this.sendTemplate({
      institutionId,
      phone: parentPhone,
      templateName: 'payment_reminder',
      templateLanguage: lang,
      templateParams: [
        payment.student.name,
        payment.institution.name,
        amount,
        dueDate,
        statusLabel,
      ],
      relatedType: 'payment',
      relatedId: paymentId,
    });
  }
}
