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
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { InstitutionId } from '../../common/decorators/institution-id.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { PlanLimit } from '../../common/decorators/plan.decorator.js';
import { StudentService } from './student.service.js';
import {
  CreateStudentSchema,
  UpdateStudentSchema,
  StudentQuerySchema,
} from './student.dto.js';
import type {
  CreateStudentDto,
  UpdateStudentDto,
  StudentQueryDto,
} from './student.dto.js';

@Controller('admin/students')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @PlanLimit('students')
  @Post()
  async create(
    @InstitutionId() institutionId: string,
    @Body(new ZodValidationPipe(CreateStudentSchema)) dto: CreateStudentDto,
  ) {
    return this.studentService.create(institutionId, dto);
  }

  @Get()
  async findAll(
    @InstitutionId() institutionId: string,
    @Query(new ZodValidationPipe(StudentQuerySchema)) query: StudentQueryDto,
  ) {
    return this.studentService.findAll(institutionId, query);
  }

  @PlanLimit('students')
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
    return this.studentService.importFromCsv(file.buffer, institutionId);
  }

  @Get('export')
  async exportCsv(
    @Query() query: any,
    @InstitutionId() institutionId: string,
    @Res() res: Response,
  ) {
    const csv = await this.studentService.exportToCsv(query, institutionId);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename=students.csv',
    });
    res.send(csv);
  }

  @Get(':id')
  async findOne(
    @InstitutionId() institutionId: string,
    @Param('id') id: string,
  ) {
    return this.studentService.findOne(institutionId, id);
  }

  @Patch(':id')
  async update(
    @InstitutionId() institutionId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateStudentSchema)) dto: UpdateStudentDto,
  ) {
    return this.studentService.update(institutionId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @InstitutionId() institutionId: string,
    @Param('id') id: string,
  ) {
    await this.studentService.delete(institutionId, id);
  }
}
