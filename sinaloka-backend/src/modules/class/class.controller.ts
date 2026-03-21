import {
  Controller,
  Get,
  Post,
  Patch,
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
import { ClassService } from './class.service.js';
import {
  CreateClassSchema,
  UpdateClassSchema,
  ClassQuerySchema,
} from './class.dto.js';
import type {
  CreateClassDto,
  UpdateClassDto,
  ClassQueryDto,
} from './class.dto.js';

@Controller('admin/classes')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  @Post()
  async create(
    @InstitutionId() institutionId: string,
    @Body(new ZodValidationPipe(CreateClassSchema)) dto: CreateClassDto,
  ) {
    return this.classService.create(institutionId, dto);
  }

  @Get()
  async findAll(
    @InstitutionId() institutionId: string,
    @Query(new ZodValidationPipe(ClassQuerySchema)) query: ClassQueryDto,
  ) {
    return this.classService.findAll(institutionId, query);
  }

  @Get(':id')
  async findOne(
    @InstitutionId() institutionId: string,
    @Param('id') id: string,
  ) {
    return this.classService.findOne(institutionId, id);
  }

  @Patch(':id')
  async update(
    @InstitutionId() institutionId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateClassSchema)) dto: UpdateClassDto,
  ) {
    return this.classService.update(institutionId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @InstitutionId() institutionId: string,
    @Param('id') id: string,
  ) {
    await this.classService.delete(institutionId, id);
  }
}
