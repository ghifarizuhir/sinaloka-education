import { Controller, Get, Param } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { SubjectService } from './subject.service.js';

@Controller('subjects')
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @Get()
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.subjectService.findAll(user.institutionId!);
  }

  @Get(':id/tutors')
  async findTutors(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.subjectService.findTutorsBySubject(user.institutionId!, id);
  }
}
