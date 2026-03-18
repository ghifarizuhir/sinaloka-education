import { Module } from '@nestjs/common';
import { SubjectController } from './subject.controller.js';
import { SubjectAdminController } from './subject-admin.controller.js';
import { SubjectService } from './subject.service.js';

@Module({
  controllers: [SubjectController, SubjectAdminController],
  providers: [SubjectService],
  exports: [SubjectService],
})
export class SubjectModule {}
