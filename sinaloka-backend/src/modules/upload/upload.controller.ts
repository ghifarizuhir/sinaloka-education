import {
  Controller,
  Get,
  Post,
  Param,
  Res,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { UploadService } from './upload.service.js';

const ALLOWED_UPLOAD_TYPES = ['receipts', 'proofs', 'logos'];

@Controller('uploads')
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post(':type')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('type') type: string,
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!ALLOWED_UPLOAD_TYPES.includes(type)) {
      throw new BadRequestException(
        `Upload type '${type}' not allowed. Use: ${ALLOWED_UPLOAD_TYPES.join(', ')}`,
      );
    }
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    const url = await this.uploadService.saveFile(
      file,
      user.institutionId!,
      type,
    );
    return { url };
  }

  @Public()
  @Get(':institutionId/:type/:filename')
  serveFile(
    @Param('institutionId') institutionId: string,
    @Param('type') type: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const abs = this.uploadService.getFilePath(institutionId, type, filename);
    res.sendFile(abs);
  }
}
