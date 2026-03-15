import { Controller, Get } from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { DashboardService } from './dashboard.service.js';

@Controller('admin/dashboard')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getStats(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getStats(user.institutionId!);
  }

  @Get('activity')
  getActivity(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getActivity(user.institutionId!);
  }
}
