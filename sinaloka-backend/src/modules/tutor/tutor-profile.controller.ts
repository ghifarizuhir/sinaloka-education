import { Controller, Get, Patch, Body } from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { TutorService } from './tutor.service.js';
import { UpdateTutorProfileSchema } from './tutor.dto.js';
import type { UpdateTutorProfileDto } from './tutor.dto.js';

@Controller('tutor/profile')
@Roles(Role.TUTOR)
export class TutorProfileController {
  constructor(private readonly tutorService: TutorService) {}

  @Get()
  async getProfile(@CurrentUser() user: JwtPayload) {
    return this.tutorService.getProfile(user.userId);
  }

  @Patch()
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(UpdateTutorProfileSchema))
    dto: UpdateTutorProfileDto,
  ) {
    return this.tutorService.updateProfile(user.userId, dto);
  }
}
