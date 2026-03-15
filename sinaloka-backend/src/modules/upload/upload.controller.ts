import {
  Controller,
  Get,
  Param,
  Res,
  ForbiddenException,
} from '@nestjs/common';
import { Response } from 'express';
import { Role } from '../../../generated/prisma/client.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { UploadService } from './upload.service.js';

@Controller('uploads')
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Get(':institutionId/:type/:filename')
  serveFile(
    @Param('institutionId') institutionId: string,
    @Param('type') type: string,
    @Param('filename') filename: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    if (
      user.role !== Role.SUPER_ADMIN &&
      user.institutionId !== institutionId
    ) {
      throw new ForbiddenException('Access denied');
    }
    const abs = this.uploadService.getFilePath(
      institutionId,
      type,
      filename,
    );
    res.sendFile(abs);
  }
}
