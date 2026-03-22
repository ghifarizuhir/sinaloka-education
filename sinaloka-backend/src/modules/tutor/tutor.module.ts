import { Module } from '@nestjs/common';
import { TutorService } from './tutor.service.js';
import { TutorController } from './tutor.controller.js';
import { TutorProfileController } from './tutor-profile.controller.js';
import { InvitationModule } from '../invitation/invitation.module.js';
import { UploadModule } from '../upload/upload.module.js';

@Module({
  imports: [InvitationModule, UploadModule],
  controllers: [TutorController, TutorProfileController],
  providers: [TutorService],
  exports: [TutorService],
})
export class TutorModule {}
