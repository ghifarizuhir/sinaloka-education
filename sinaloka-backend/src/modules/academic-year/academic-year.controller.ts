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
import { AcademicYearService } from './academic-year.service.js';
import {
  CreateAcademicYearSchema,
  UpdateAcademicYearSchema,
  AcademicYearQuerySchema,
  CreateSemesterSchema,
  UpdateSemesterSchema,
  RollOverSchema,
} from './academic-year.dto.js';
import type {
  CreateAcademicYearDto,
  UpdateAcademicYearDto,
  AcademicYearQueryDto,
  CreateSemesterDto,
  UpdateSemesterDto,
  RollOverDto,
} from './academic-year.dto.js';

@Controller('admin/academic-years')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class AcademicYearController {
  constructor(private readonly service: AcademicYearService) {}

  @Post()
  async createYear(
    @InstitutionId() institutionId: string,
    @Body(new ZodValidationPipe(CreateAcademicYearSchema)) dto: CreateAcademicYearDto,
  ) {
    return this.service.createYear(institutionId, dto);
  }

  @Get()
  async findAllYears(
    @InstitutionId() institutionId: string,
    @Query(new ZodValidationPipe(AcademicYearQuerySchema)) query: AcademicYearQueryDto,
  ) {
    return this.service.findAllYears(institutionId, query);
  }

  @Get(':id')
  async findYearById(
    @InstitutionId() institutionId: string,
    @Param('id') id: string,
  ) {
    return this.service.findYearById(institutionId, id);
  }

  @Patch(':id')
  async updateYear(
    @InstitutionId() institutionId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateAcademicYearSchema)) dto: UpdateAcademicYearDto,
  ) {
    return this.service.updateYear(institutionId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteYear(
    @InstitutionId() institutionId: string,
    @Param('id') id: string,
  ) {
    await this.service.deleteYear(institutionId, id);
  }

  @Post(':yearId/semesters')
  async createSemester(
    @InstitutionId() institutionId: string,
    @Param('yearId') yearId: string,
    @Body(new ZodValidationPipe(CreateSemesterSchema)) dto: CreateSemesterDto,
  ) {
    return this.service.createSemester(institutionId, yearId, dto);
  }
}

@Controller('admin/semesters')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class SemesterController {
  constructor(private readonly service: AcademicYearService) {}

  @Get(':id')
  async findSemesterById(
    @InstitutionId() institutionId: string,
    @Param('id') id: string,
  ) {
    return this.service.findSemesterById(institutionId, id);
  }

  @Patch(':id')
  async updateSemester(
    @InstitutionId() institutionId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateSemesterSchema)) dto: UpdateSemesterDto,
  ) {
    return this.service.updateSemester(institutionId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSemester(
    @InstitutionId() institutionId: string,
    @Param('id') id: string,
  ) {
    await this.service.deleteSemester(institutionId, id);
  }

  @Patch(':id/archive')
  async archiveSemester(
    @InstitutionId() institutionId: string,
    @Param('id') id: string,
  ) {
    return this.service.archiveSemester(institutionId, id);
  }

  @Post(':id/roll-over')
  async rollOver(
    @InstitutionId() institutionId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RollOverSchema)) dto: RollOverDto,
  ) {
    return this.service.rollOver(institutionId, id, dto);
  }
}
