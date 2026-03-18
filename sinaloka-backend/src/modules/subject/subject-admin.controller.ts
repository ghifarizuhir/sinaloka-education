import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { SubjectService } from './subject.service.js';
import { CreateSubjectSchema, UpdateSubjectSchema } from './subject.dto.js';
import type { CreateSubjectDto, UpdateSubjectDto } from './subject.dto.js';

@Controller('admin/subjects')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class SubjectAdminController {
  constructor(private readonly subjectService: SubjectService) {}

  @Post()
  async create(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(CreateSubjectSchema)) dto: CreateSubjectDto,
  ) {
    return this.subjectService.create(user.institutionId!, dto);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateSubjectSchema)) dto: UpdateSubjectDto,
  ) {
    return this.subjectService.update(user.institutionId!, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    await this.subjectService.delete(user.institutionId!, id);
  }
}
