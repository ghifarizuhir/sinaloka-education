import { Controller, Get, Post, Body, UsePipes } from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { InstitutionId } from '../../common/decorators/institution-id.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { OnboardingService } from './onboarding.service.js';
import { SetBillingModeSchema } from './onboarding.dto.js';
import type { SetBillingModeDto } from './onboarding.dto.js';

@Controller('onboarding')
@Roles(Role.ADMIN)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('status')
  getStatus(@InstitutionId() institutionId: string) {
    return this.onboardingService.getStatus(institutionId);
  }

  @Post('billing-mode')
  @UsePipes(new ZodValidationPipe(SetBillingModeSchema))
  setBillingMode(@InstitutionId() institutionId: string, @Body() dto: SetBillingModeDto) {
    return this.onboardingService.setBillingMode(institutionId, dto);
  }

  @Post('complete')
  complete(@InstitutionId() institutionId: string) {
    return this.onboardingService.complete(institutionId);
  }
}
