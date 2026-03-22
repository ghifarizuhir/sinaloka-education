import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { InstitutionId } from '../../common/decorators/institution-id.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AuditLogService } from './audit-log.service.js';
import { AuditLogQuerySchema } from './dto/audit-log.dto.js';
import type { AuditLogQueryDto } from './dto/audit-log.dto.js';
import { NoAuditLog } from './decorators/no-audit-log.decorator.js';
import { Role } from '../../../generated/prisma/client.js';

@Controller('admin/audit-logs')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
@NoAuditLog()
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  findAll(
    @CurrentUser() user: { userId: string; role: string; institutionId: string | null },
    @InstitutionId() institutionId: string,
    @Query(new ZodValidationPipe(AuditLogQuerySchema)) query: AuditLogQueryDto,
  ) {
    const scopedInstitutionId = user.role === 'SUPER_ADMIN' ? null : institutionId;
    return this.auditLogService.findAll(scopedInstitutionId, query);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string; role: string; institutionId: string | null },
    @InstitutionId() institutionId: string,
  ) {
    const scopedInstitutionId = user.role === 'SUPER_ADMIN' ? null : institutionId;
    const log = await this.auditLogService.findOne(id, scopedInstitutionId);
    if (!log) throw new NotFoundException('Audit log not found');
    return log;
  }
}
