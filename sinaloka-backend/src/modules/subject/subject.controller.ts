import { Controller, Get, Param } from '@nestjs/common';
import { InstitutionId } from '../../common/decorators/institution-id.decorator.js';
import { SubjectService } from './subject.service.js';

@Controller('subjects')
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @Get()
  async findAll(@InstitutionId() institutionId: string) {
    return this.subjectService.findAll(institutionId);
  }

  @Get(':id/tutors')
  async findTutors(
    @InstitutionId() institutionId: string,
    @Param('id') id: string,
  ) {
    return this.subjectService.findTutorsBySubject(institutionId, id);
  }
}
