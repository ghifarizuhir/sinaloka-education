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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { InstitutionId } from '../../common/decorators/institution-id.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { EnrollmentService } from './enrollment.service.js';
import {
  CreateEnrollmentSchema,
  UpdateEnrollmentSchema,
  EnrollmentQuerySchema,
  CheckConflictSchema,
  BulkUpdateEnrollmentSchema,
  BulkDeleteEnrollmentSchema,
} from './enrollment.dto.js';
import type {
  CreateEnrollmentDto,
  UpdateEnrollmentDto,
  EnrollmentQueryDto,
  CheckConflictDto,
  BulkUpdateEnrollmentDto,
  BulkDeleteEnrollmentDto,
} from './enrollment.dto.js';

@Controller('admin/enrollments')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post('check-conflict')
  async checkConflict(
    @InstitutionId() institutionId: string,
    @Body(new ZodValidationPipe(CheckConflictSchema)) dto: CheckConflictDto,
  ) {
    return this.enrollmentService.checkConflict(institutionId, dto);
  }

  @Post()
  async create(
    @InstitutionId() institutionId: string,
    @Body(new ZodValidationPipe(CreateEnrollmentSchema))
    dto: CreateEnrollmentDto,
  ) {
    return this.enrollmentService.create(institutionId, dto);
  }

  @Get()
  async findAll(
    @InstitutionId() institutionId: string,
    @Query(new ZodValidationPipe(EnrollmentQuerySchema))
    query: EnrollmentQueryDto,
  ) {
    return this.enrollmentService.findAll(institutionId, query);
  }

  @Get('export')
  async exportCsv(
    @Query() query: any,
    @InstitutionId() institutionId: string,
    @Res() res: Response,
  ) {
    const csv = await this.enrollmentService.exportToCsv(query, institutionId);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename=enrollments_${new Date().toISOString().split('T')[0]}.csv`,
    });
    res.send(csv);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importCsv(
    @UploadedFile() file: Express.Multer.File,
    @InstitutionId() institutionId: string,
  ) {
    if (!file) throw new BadRequestException('CSV file required');
    if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
      throw new BadRequestException('File must be a CSV');
    }
    return this.enrollmentService.importFromCsv(file.buffer, institutionId);
  }

  @Patch('bulk')
  async bulkUpdate(
    @InstitutionId() institutionId: string,
    @Body(new ZodValidationPipe(BulkUpdateEnrollmentSchema))
    dto: BulkUpdateEnrollmentDto,
  ) {
    return this.enrollmentService.bulkUpdate(institutionId, dto);
  }

  @Delete('bulk')
  async bulkDelete(
    @InstitutionId() institutionId: string,
    @Body(new ZodValidationPipe(BulkDeleteEnrollmentSchema))
    dto: BulkDeleteEnrollmentDto,
  ) {
    return this.enrollmentService.bulkDelete(institutionId, dto.ids);
  }

  @Get(':id')
  async findOne(
    @InstitutionId() institutionId: string,
    @Param('id') id: string,
  ) {
    return this.enrollmentService.findOne(institutionId, id);
  }

  @Patch(':id')
  async update(
    @InstitutionId() institutionId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateEnrollmentSchema))
    dto: UpdateEnrollmentDto,
  ) {
    return this.enrollmentService.update(institutionId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @InstitutionId() institutionId: string,
    @Param('id') id: string,
  ) {
    await this.enrollmentService.delete(institutionId, id);
  }
}
