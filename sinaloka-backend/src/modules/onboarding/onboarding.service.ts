import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { SetBillingModeDto } from './onboarding.dto.js';
import type { BillingMode } from '../../../generated/prisma/client.js';

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(institutionId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { billing_mode: true, onboarding_completed: true, name: true, phone: true },
    });
    if (!institution) throw new NotFoundException('Institution not found');
    return {
      billing_mode: institution.billing_mode,
      onboarding_completed: institution.onboarding_completed,
      steps: { profile: !!(institution.name && institution.phone), billing: !!institution.billing_mode },
    };
  }

  async setBillingMode(institutionId: string, dto: SetBillingModeDto) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { billing_mode: true },
    });
    if (!institution) throw new NotFoundException('Institution not found');
    if (institution.billing_mode !== null) throw new BadRequestException('Billing mode already set. Contact support to change.');
    return this.prisma.institution.update({
      where: { id: institutionId },
      data: { billing_mode: dto.billing_mode as BillingMode },
      select: { billing_mode: true, onboarding_completed: true },
    });
  }

  async complete(institutionId: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { billing_mode: true },
    });
    if (!institution) throw new NotFoundException('Institution not found');
    if (!institution.billing_mode) throw new BadRequestException('Billing mode must be set before completing onboarding.');
    return this.prisma.institution.update({
      where: { id: institutionId },
      data: { onboarding_completed: true },
      select: { onboarding_completed: true },
    });
  }
}
