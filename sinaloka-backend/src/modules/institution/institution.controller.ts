import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { PaginationSchema } from '../../common/dto/pagination.dto.js';
import type { PaginationDto } from '../../common/dto/pagination.dto.js';
import { InstitutionService } from './institution.service.js';
import {
  CreateInstitutionSchema,
  UpdateInstitutionSchema,
} from './institution.dto.js';
import type {
  CreateInstitutionDto,
  UpdateInstitutionDto,
} from './institution.dto.js';

@Controller('admin/institutions')
@Roles(Role.SUPER_ADMIN)
export class InstitutionController {
  constructor(private readonly institutionService: InstitutionService) {}

  @Get()
  async findAll(
    @Query(new ZodValidationPipe(PaginationSchema)) query: PaginationDto,
  ) {
    return this.institutionService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.institutionService.findOne(id);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(CreateInstitutionSchema))
  async create(@Body() dto: CreateInstitutionDto) {
    return this.institutionService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateInstitutionSchema)) dto: UpdateInstitutionDto,
  ) {
    return this.institutionService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.institutionService.remove(id);
  }
}
