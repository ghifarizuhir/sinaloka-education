import { Module } from '@nestjs/common';
import { InvitationService } from './invitation.service.js';
import { InvitationController } from './invitation.controller.js';

@Module({
  controllers: [InvitationController],
  providers: [InvitationService],
  exports: [InvitationService],
})
export class InvitationModule {}
