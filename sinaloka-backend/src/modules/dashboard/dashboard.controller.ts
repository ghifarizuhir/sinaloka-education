import { Controller, Get } from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { InstitutionId } from '../../common/decorators/institution-id.decorator.js';
import { DashboardService } from './dashboard.service.js';

@Controller('admin/dashboard')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getStats(@InstitutionId() institutionId: string) {
    return this.dashboardService.getStats(institutionId);
  }

  @Get('activity')
  getActivity(@InstitutionId() institutionId: string) {
    return this.dashboardService.getActivity(institutionId);
  }

  @Get('upcoming-sessions')
  getUpcomingSessions(@InstitutionId() institutionId: string) {
    return this.dashboardService.getUpcomingSessions(institutionId);
  }

  @Get('attendance-trend')
  getAttendanceTrend(@InstitutionId() institutionId: string) {
    return this.dashboardService.getAttendanceTrend(institutionId);
  }

  @Get('student-growth')
  getStudentGrowth(@InstitutionId() institutionId: string) {
    return this.dashboardService.getStudentGrowth(institutionId);
  }

  @Get('revenue-expenses')
  getRevenueExpenses(@InstitutionId() institutionId: string) {
    return this.dashboardService.getRevenueExpenses(institutionId);
  }
}
