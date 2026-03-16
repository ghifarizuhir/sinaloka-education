import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { UpdateGeneralSettingsDto, UpdateBillingSettingsDto } from './settings.dto.js';

const BILLING_DEFAULTS = {
  billing_mode: 'manual' as const,
  currency: 'IDR',
  invoice_prefix: 'INV-',
  late_payment_auto_lock: false,
  late_payment_threshold: 0,
  expense_categories: ['RENT', 'UTILITIES', 'SUPPLIES', 'MARKETING', 'OTHER'],
  bank_accounts: [] as any[],
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

  async updateGeneral(
    institutionId: string,
    dto: UpdateGeneralSettingsDto,
  ) {
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
}
