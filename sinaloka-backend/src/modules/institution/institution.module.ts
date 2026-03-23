import { Module } from '@nestjs/common';
import { InstitutionService } from './institution.service.js';
import { InstitutionController } from './institution.controller.js';
import { InstitutionPublicController } from './institution-public.controller.js';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard.js';

@Module({
  controllers: [InstitutionController, InstitutionPublicController],
  providers: [InstitutionService, RateLimitGuard],
  exports: [InstitutionService],
})
export class InstitutionModule {}
