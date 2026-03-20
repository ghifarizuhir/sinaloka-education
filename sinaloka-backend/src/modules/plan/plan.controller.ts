import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { PlanService } from './plan.service.js';
import {
  UpgradeRequestSchema,
  ReviewUpgradeRequestSchema,
  UpdateInstitutionPlanSchema,
  UpgradeRequestQuerySchema,
} from './plan.dto.js';
import type {
  UpgradeRequestDto,
  ReviewUpgradeRequestDto,
  UpdateInstitutionPlanDto,
  UpgradeRequestQueryDto,
} from './plan.dto.js';

@Controller('admin/plan')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Get()
  async getPlanInfo(@CurrentUser() user: JwtPayload) {
    return this.planService.getPlanInfo(user.institutionId!);
  }

  @Post('upgrade-request')
  async requestUpgrade(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(UpgradeRequestSchema)) dto: UpgradeRequestDto,
  ) {
    return this.planService.requestUpgrade(user.institutionId!, dto);
  }

  @Get('upgrade-requests')
  @Roles(Role.SUPER_ADMIN)
  async getUpgradeRequests(
    @Query(new ZodValidationPipe(UpgradeRequestQuerySchema))
    query: UpgradeRequestQueryDto,
  ) {
    return this.planService.getUpgradeRequests(query);
  }

  @Patch('upgrade-requests/:id')
  @Roles(Role.SUPER_ADMIN)
  async reviewUpgradeRequest(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(ReviewUpgradeRequestSchema))
    dto: ReviewUpgradeRequestDto,
  ) {
    return this.planService.reviewUpgradeRequest(id, user.userId, dto);
  }

  @Patch('institutions/:id')
  @Roles(Role.SUPER_ADMIN)
  async updateInstitutionPlan(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateInstitutionPlanSchema))
    dto: UpdateInstitutionPlanDto,
  ) {
    return this.planService.updateInstitutionPlan(id, dto);
  }
}
