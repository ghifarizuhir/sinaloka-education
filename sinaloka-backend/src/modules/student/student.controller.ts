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

  @Get(':id')
  async findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
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
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    await this.studentService.delete(user.institutionId!, id);
  }
}
