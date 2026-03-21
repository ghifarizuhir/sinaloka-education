import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import {
  RateLimitGuard,
  RateLimit,
} from '../../common/guards/rate-limit.guard.js';
import { RegistrationService } from './registration.service.js';
import {
  StudentRegistrationSchema,
  TutorRegistrationSchema,
} from './registration.dto.js';
import type {
  StudentRegistrationDto,
  TutorRegistrationDto,
} from './registration.dto.js';

@Controller('register')
@Public()
@UseGuards(RateLimitGuard)
export class RegisterController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Get(':slug')
  async getInstitutionInfo(@Param('slug') slug: string) {
    return this.registrationService.getInstitutionInfo(slug);
  }

  @Post(':slug/student')
  @RateLimit(5, 60 * 60 * 1000)
  async registerStudent(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(StudentRegistrationSchema))
    dto: StudentRegistrationDto,
  ) {
    return this.registrationService.submitStudentRegistration(slug, dto);
  }

  @Post(':slug/tutor')
  @RateLimit(5, 60 * 60 * 1000)
  async registerTutor(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(TutorRegistrationSchema))
    dto: TutorRegistrationDto,
  ) {
    return this.registrationService.submitTutorRegistration(slug, dto);
  }
}
