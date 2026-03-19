import { Module } from '@nestjs/common';
import { ParentService } from './parent.service.js';
import { ParentInviteService } from './parent-invite.service.js';
import { ParentController } from './parent.controller.js';
import { ParentAdminController } from './parent-admin.controller.js';
import { ParentStudentGuard } from './guards/parent-student.guard.js';
import { SettingsModule } from '../settings/settings.module.js';

@Module({
  imports: [SettingsModule],
  controllers: [ParentController, ParentAdminController],
  providers: [ParentService, ParentInviteService, ParentStudentGuard],
  exports: [ParentService, ParentInviteService],
})
export class ParentModule {}
