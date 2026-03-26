import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';
import { UploadModule } from '../upload/upload.module.js';
import { InstitutionModule } from '../institution/institution.module.js';

@Module({
  imports: [UploadModule, InstitutionModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
