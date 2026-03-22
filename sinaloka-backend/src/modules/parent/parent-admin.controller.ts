import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { InstitutionId } from '../../common/decorators/institution-id.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { ParentService } from './parent.service.js';
import { ParentInviteService } from './parent-invite.service.js';
import {
  CreateParentInviteSchema,
  LinkStudentsSchema,
  ParentQuerySchema,
} from './parent.dto.js';
import type {
  CreateParentInviteDto,
  LinkStudentsDto,
  ParentQueryDto,
} from './parent.dto.js';

@Controller('admin/parents')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class ParentAdminController {
  constructor(
    private readonly parentService: ParentService,
    private readonly parentInviteService: ParentInviteService,
  ) {}

  @Post('invite')
  async createInvite(
    @InstitutionId() institutionId: string,
    @Body(new ZodValidationPipe(CreateParentInviteSchema))
    dto: CreateParentInviteDto,
  ) {
    return this.parentInviteService.createInvite(institutionId, dto);
  }

  @Get()
  async findAll(
    @InstitutionId() institutionId: string,
    @Query(new ZodValidationPipe(ParentQuerySchema)) query: ParentQueryDto,
  ) {
    return this.parentService.findAll(institutionId, query);
  }

  @Get(':id')
  async findOne(
    @InstitutionId() institutionId: string,
    @Param('id') id: string,
  ) {
    return this.parentService.findOne(institutionId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @InstitutionId() institutionId: string,
    @Param('id') id: string,
  ) {
    await this.parentService.deleteParent(institutionId, id);
  }

  @Post(':id/link')
  async linkStudents(
    @InstitutionId() institutionId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(LinkStudentsSchema)) dto: LinkStudentsDto,
  ) {
    return this.parentService.linkStudents(institutionId, id, dto);
  }

  @Delete(':parentId/children/:studentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlinkStudent(
    @InstitutionId() institutionId: string,
    @Param('parentId') parentId: string,
    @Param('studentId') studentId: string,
  ) {
    await this.parentService.unlinkStudent(institutionId, parentId, studentId);
  }
}
