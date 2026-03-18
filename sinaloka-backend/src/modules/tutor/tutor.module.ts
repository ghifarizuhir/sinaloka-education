import { Module } from '@nestjs/common';
import { TutorService } from './tutor.service.js';
import { TutorController } from './tutor.controller.js';
import { TutorProfileController } from './tutor-profile.controller.js';
import { InvitationModule } from '../invitation/invitation.module.js';

@Module({
  imports: [InvitationModule],
  controllers: [TutorController, TutorProfileController],
  providers: [TutorService],
  exports: [TutorService],
})
export class TutorModule {}
