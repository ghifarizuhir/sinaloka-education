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
import { TutorService } from './tutor.service.js';
import {
  CreateTutorSchema,
  UpdateTutorSchema,
  TutorQuerySchema,
} from './tutor.dto.js';
import type {
  CreateTutorDto,
  UpdateTutorDto,
  TutorQueryDto,
} from './tutor.dto.js';

@Controller('admin/tutors')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class TutorController {
  constructor(private readonly tutorService: TutorService) {}

  @Post()
  async create(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(CreateTutorSchema)) dto: CreateTutorDto,
  ) {
    return this.tutorService.create(user.institutionId!, dto);
  }

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(TutorQuerySchema)) query: TutorQueryDto,
  ) {
    return this.tutorService.findAll(user.institutionId!, query);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.tutorService.findOne(user.institutionId!, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTutorSchema)) dto: UpdateTutorDto,
  ) {
    return this.tutorService.update(user.institutionId!, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    await this.tutorService.delete(user.institutionId!, id);
  }
}
