import { Module } from '@nestjs/common';
import { TutorService } from './tutor.service.js';
import { TutorController } from './tutor.controller.js';
import { TutorProfileController } from './tutor-profile.controller.js';

@Module({
  controllers: [TutorController, TutorProfileController],
  providers: [TutorService],
  exports: [TutorService],
})
export class TutorModule {}
