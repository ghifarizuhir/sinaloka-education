import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import {
  RateLimitGuard,
  RateLimit,
} from '../../common/guards/rate-limit.guard.js';
import { ParseSlugPipe } from '../../common/pipes/parse-slug.pipe.js';
import { InstitutionService } from './institution.service.js';

@Controller('institutions/public')
@Public()
@UseGuards(RateLimitGuard)
export class InstitutionPublicController {
  constructor(private readonly institutionService: InstitutionService) {}

  @Get(':slug')
  @RateLimit(30, 60 * 1000)
  async getBySlug(@Param('slug', ParseSlugPipe) slug: string) {
    return this.institutionService.findBySlugPublic(slug);
  }

  @Get(':slug/landing')
  @RateLimit(30, 60 * 1000)
  async getLanding(@Param('slug', ParseSlugPipe) slug: string) {
    return this.institutionService.findLandingBySlug(slug);
  }
}
