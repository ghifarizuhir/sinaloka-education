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
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
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
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(CreateParentInviteSchema))
    dto: CreateParentInviteDto,
  ) {
    return this.parentInviteService.createInvite(user.institutionId!, dto);
  }

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(ParentQuerySchema)) query: ParentQueryDto,
  ) {
    return this.parentService.findAll(user.institutionId!, query);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.parentService.findOne(user.institutionId!, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.parentService.deleteParent(user.institutionId!, id);
  }

  @Post(':id/link')
  async linkStudents(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(LinkStudentsSchema)) dto: LinkStudentsDto,
  ) {
    return this.parentService.linkStudents(user.institutionId!, id, dto);
  }

  @Delete(':parentId/children/:studentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlinkStudent(
    @CurrentUser() user: JwtPayload,
    @Param('parentId') parentId: string,
    @Param('studentId') studentId: string,
  ) {
    await this.parentService.unlinkStudent(
      user.institutionId!,
      parentId,
      studentId,
    );
  }
}
