import { Module } from '@nestjs/common';
import { InstitutionService } from './institution.service.js';
import { InstitutionController } from './institution.controller.js';

@Module({
  controllers: [InstitutionController],
  providers: [InstitutionService],
  exports: [InstitutionService],
})
export class InstitutionModule {}
