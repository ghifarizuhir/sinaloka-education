import { Module } from '@nestjs/common';
import { ParentInviteService } from './parent-invite.service.js';

@Module({
  providers: [ParentInviteService],
  exports: [ParentInviteService],
})
export class ParentModule {}
