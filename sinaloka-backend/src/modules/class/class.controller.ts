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
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
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
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(CreateClassSchema)) dto: CreateClassDto,
  ) {
    return this.classService.create(user.institutionId!, dto);
  }

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(ClassQuerySchema)) query: ClassQueryDto,
  ) {
    return this.classService.findAll(user.institutionId!, query);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.classService.findOne(user.institutionId!, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateClassSchema)) dto: UpdateClassDto,
  ) {
    return this.classService.update(user.institutionId!, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.classService.delete(user.institutionId!, id);
  }
}
