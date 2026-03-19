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
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
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

  @Post()
  async create(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(CreateStudentSchema)) dto: CreateStudentDto,
  ) {
    return this.studentService.create(user.institutionId!, dto);
  }

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(StudentQuerySchema)) query: StudentQueryDto,
  ) {
    return this.studentService.findAll(user.institutionId!, query);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importCsv(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) throw new BadRequestException('CSV file required');
    if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
      throw new BadRequestException('File must be a CSV');
    }
    return this.studentService.importFromCsv(file.buffer, user.institutionId!);
  }

  @Get('export')
  async exportCsv(
    @Query() query: any,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const csv = await this.studentService.exportToCsv(
      query,
      user.institutionId!,
    );
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename=students.csv',
    });
    res.send(csv);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.studentService.findOne(user.institutionId!, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateStudentSchema)) dto: UpdateStudentDto,
  ) {
    return this.studentService.update(user.institutionId!, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.studentService.delete(user.institutionId!, id);
  }
}
