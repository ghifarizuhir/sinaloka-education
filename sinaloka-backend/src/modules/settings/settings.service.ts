import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type {
  UpdateGeneralSettingsDto,
  UpdateBillingSettingsDto,
  UpdateAcademicSettingsDto,
  UpdatePaymentGatewayDto,
  UpdateRegistrationSettingsDto,
} from './settings.dto.js';

const REGISTRATION_DEFAULTS = {
  student_enabled: false,
  tutor_enabled: false,
};

const PAYMENT_GATEWAY_DEFAULTS = {
  provider: 'midtrans' as const,
  midtrans_server_key: '',
  midtrans_client_key: '',
  is_sandbox: true,
};

const BILLING_DEFAULTS = {
  billing_mode: 'manual' as const,
  currency: 'IDR',
  invoice_prefix: 'INV-',
  late_payment_auto_lock: false,
  late_payment_threshold: 0,
  expense_categories: ['RENT', 'UTILITIES', 'SUPPLIES', 'MARKETING', 'OTHER'],
  bank_accounts: [] as any[],
};

const ACADEMIC_DEFAULTS = {
  rooms: [] as any[],
  subject_categories: [] as any[],
  grade_levels: [
    { id: 'default-sd-1', name: 'SD 1', order: 1 },
    { id: 'default-sd-2', name: 'SD 2', order: 2 },
    { id: 'default-sd-3', name: 'SD 3', order: 3 },
    { id: 'default-sd-4', name: 'SD 4', order: 4 },
    { id: 'default-sd-5', name: 'SD 5', order: 5 },
    { id: 'default-sd-6', name: 'SD 6', order: 6 },
    { id: 'default-smp-7', name: 'SMP 7', order: 7 },
    { id: 'default-smp-8', name: 'SMP 8', order: 8 },
    { id: 'default-smp-9', name: 'SMP 9', order: 9 },
    { id: 'default-sma-10', name: 'SMA 10', order: 10 },
    { id: 'default-sma-11', name: 'SMA 11', order: 11 },
    { id: 'default-sma-12', name: 'SMA 12', order: 12 },
    { id: 'default-univ', name: 'Universitas', order: 13 },
  ],
  working_days: [1, 2, 3, 4, 5, 6] as number[], // Mon-Sat (JS day numbers)
};

const GENERAL_SELECT = {
  name: true,
  email: true,
  phone: true,
  address: true,
  timezone: true,
  default_language: true,
} as const;

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getGeneral(institutionId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: GENERAL_SELECT,
    });

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    return institution;
  }

  async updateGeneral(institutionId: string, dto: UpdateGeneralSettingsDto) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
    });

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    return this.prisma.institution.update({
      where: { id: institutionId },
      data: dto,
      select: GENERAL_SELECT,
    });
  }

  async getBilling(institutionId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { settings: true },
    });

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    const stored = (institution.settings as any)?.billing ?? {};
    return { ...BILLING_DEFAULTS, ...stored };
  }

  async updateBilling(institutionId: string, dto: UpdateBillingSettingsDto) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { settings: true },
    });

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    const currentSettings = (institution.settings as any) ?? {};
    const currentBilling = currentSettings.billing ?? {};
    const updatedBilling = { ...currentBilling, ...dto };

    await this.prisma.institution.update({
      where: { id: institutionId },
      data: {
        settings: { ...currentSettings, billing: updatedBilling },
      },
    });

    return { ...BILLING_DEFAULTS, ...updatedBilling };
  }

  async getAcademic(institutionId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { settings: true },
    });

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    const stored = (institution.settings as any)?.academic ?? {};
    return { ...ACADEMIC_DEFAULTS, ...stored };
  }

  async updateAcademic(institutionId: string, dto: UpdateAcademicSettingsDto) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { settings: true },
    });

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    const currentSettings = (institution.settings as any) ?? {};
    const currentAcademic = currentSettings.academic ?? {};
    const updatedAcademic = { ...currentAcademic, ...dto };

    await this.prisma.institution.update({
      where: { id: institutionId },
      data: {
        settings: { ...currentSettings, academic: updatedAcademic },
      },
    });

    return { ...ACADEMIC_DEFAULTS, ...updatedAcademic };
  }

  async getPaymentGateway(institutionId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { settings: true },
    });

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    const stored = (institution.settings as any)?.payment_gateway ?? {};
    const config = { ...PAYMENT_GATEWAY_DEFAULTS, ...stored };

    const maskedServerKey = config.midtrans_server_key
      ? `${config.midtrans_server_key.slice(0, 4)}${'*'.repeat(Math.max(0, config.midtrans_server_key.length - 4))}`
      : '';

    return {
      provider: config.provider,
      midtrans_server_key: maskedServerKey,
      midtrans_client_key: config.midtrans_client_key,
      is_sandbox: config.is_sandbox,
      is_configured: !!config.midtrans_server_key && !!config.midtrans_client_key,
    };
  }

  async updatePaymentGateway(
    institutionId: string,
    dto: UpdatePaymentGatewayDto,
  ) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { settings: true },
    });

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    const currentSettings = (institution.settings as any) ?? {};
    const currentGateway = currentSettings.payment_gateway ?? {};
    const updatedGateway = { ...currentGateway, ...dto };

    await this.prisma.institution.update({
      where: { id: institutionId },
      data: {
        settings: { ...currentSettings, payment_gateway: updatedGateway },
      },
    });

    return this.getPaymentGateway(institutionId);
  }

  async getRegistration(institutionId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { settings: true },
    });

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    const stored = (institution.settings as any)?.registration ?? {};
    return { ...REGISTRATION_DEFAULTS, ...stored };
  }

  async updateRegistration(
    institutionId: string,
    dto: UpdateRegistrationSettingsDto,
  ) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { settings: true },
    });

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    const currentSettings = (institution.settings as any) ?? {};
    const currentRegistration = currentSettings.registration ?? {};
    const updatedRegistration = { ...currentRegistration, ...dto };

    await this.prisma.institution.update({
      where: { id: institutionId },
      data: {
        settings: { ...currentSettings, registration: updatedRegistration },
      },
    });

    return { ...REGISTRATION_DEFAULTS, ...updatedRegistration };
  }

  async getPaymentGatewayConfig(institutionId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { settings: true },
    });

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    const stored = (institution.settings as any)?.payment_gateway ?? {};
    return { ...PAYMENT_GATEWAY_DEFAULTS, ...stored };
  }
}
