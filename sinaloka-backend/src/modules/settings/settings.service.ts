import { Injectable, NotFoundException, GoneException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type {
  UpdateGeneralSettingsDto,
  UpdateBillingSettingsDto,
  UpdateAcademicSettingsDto,
  UpdatePaymentGatewayDto,
  UpdateRegistrationSettingsDto,
  UpdateLandingSettingsDto,
} from './settings.dto.js';

const REGISTRATION_DEFAULTS = {
  student_enabled: false,
  tutor_enabled: false,
};

const BILLING_DEFAULTS = {
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

const LANDING_SELECT = {
  landing_enabled: true,
  landing_tagline: true,
  landing_about: true,
  landing_cta_text: true,
  whatsapp_number: true,
  landing_features: true,
  gallery_images: true,
  social_links: true,
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

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

  async getPaymentGateway(_institutionId?: string) {
    const serverKey =
      this.configService.get<string>('MIDTRANS_SERVER_KEY') ?? '';
    const clientKey =
      this.configService.get<string>('MIDTRANS_CLIENT_KEY') ?? '';

    const maskedServerKey = serverKey
      ? `${serverKey.slice(0, 4)}${'*'.repeat(Math.max(0, serverKey.length - 4))}`
      : '';

    return {
      provider: 'midtrans' as const,
      midtrans_server_key: maskedServerKey,
      midtrans_client_key: clientKey,
      is_sandbox:
        this.configService.get<string>('MIDTRANS_IS_SANDBOX') !== 'false',
      is_configured: !!serverKey && !!clientKey,
    };
  }

  async updatePaymentGateway(
    _institutionId: string,
    _dto: UpdatePaymentGatewayDto,
  ) {
    throw new GoneException(
      'Payment gateway configuration is now managed at platform level. Contact Super Admin.',
    );
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

  async getPaymentGatewayConfig(_institutionId?: string) {
    return {
      provider: 'midtrans' as const,
      midtrans_server_key:
        this.configService.get<string>('MIDTRANS_SERVER_KEY') ?? '',
      midtrans_client_key:
        this.configService.get<string>('MIDTRANS_CLIENT_KEY') ?? '',
      is_sandbox:
        this.configService.get<string>('MIDTRANS_IS_SANDBOX') !== 'false',
    };
  }

  // ─── Landing Page ───────────────────────────────────────

  async getLandingSettings(institutionId: string) {
    const institution = await this.prisma.institution.findUniqueOrThrow({
      where: { id: institutionId },
      select: LANDING_SELECT,
    });
    return institution;
  }

  async updateLandingSettings(
    institutionId: string,
    dto: UpdateLandingSettingsDto,
  ) {
    const updated = await this.prisma.institution.update({
      where: { id: institutionId },
      data: dto as any,
      select: LANDING_SELECT,
    });
    return updated;
  }

  async addGalleryImage(
    institutionId: string,
    image: { id: string; url: string },
  ) {
    const inst = await this.prisma.institution.findUniqueOrThrow({
      where: { id: institutionId },
      select: { gallery_images: true },
    });
    const images = (inst.gallery_images as any[]) ?? [];
    if (images.length >= 6) {
      throw new BadRequestException('Maximum 6 gallery images allowed');
    }
    const newImage = { ...image, caption: null, order: images.length };
    const updated = await this.prisma.institution.update({
      where: { id: institutionId },
      data: { gallery_images: [...images, newImage] },
      select: { gallery_images: true },
    });
    return updated.gallery_images;
  }

  async removeGalleryImage(institutionId: string, imageId: string) {
    const inst = await this.prisma.institution.findUniqueOrThrow({
      where: { id: institutionId },
      select: { gallery_images: true },
    });
    const images = (inst.gallery_images as any[]) ?? [];
    const image = images.find((img) => img.id === imageId);
    if (!image) {
      throw new NotFoundException(`Gallery image ${imageId} not found`);
    }
    const filtered = images
      .filter((img) => img.id !== imageId)
      .map((img, i) => ({ ...img, order: i }));
    await this.prisma.institution.update({
      where: { id: institutionId },
      data: { gallery_images: filtered },
    });
    return image;
  }

  async getInstitutionSlug(institutionId: string): Promise<string> {
    const inst = await this.prisma.institution.findUniqueOrThrow({
      where: { id: institutionId },
      select: { slug: true },
    });
    return inst.slug;
  }
}
