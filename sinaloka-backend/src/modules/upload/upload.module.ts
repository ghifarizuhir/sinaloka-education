import { Module } from '@nestjs/common';
import { UploadService } from './upload.service.js';
import { UploadController } from './upload.controller.js';
import { R2UploadService } from './r2-upload.service.js';

@Module({
  controllers: [UploadController],
  providers: [UploadService, R2UploadService],
  exports: [UploadService, R2UploadService],
})
export class UploadModule {}
