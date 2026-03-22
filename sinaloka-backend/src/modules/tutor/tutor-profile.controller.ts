import {
  Controller,
  Get,
  Patch,
  Body,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { InstitutionId } from '../../common/decorators/institution-id.decorator.js';
import { TutorService } from './tutor.service.js';
import { UpdateTutorProfileSchema } from './tutor.dto.js';
import type { UpdateTutorProfileDto } from './tutor.dto.js';
import { UploadService } from '../upload/upload.service.js';

@Controller('tutor/profile')
@Roles(Role.TUTOR)
export class TutorProfileController {
  constructor(
    private readonly tutorService: TutorService,
    private readonly uploadService: UploadService,
  ) {}

  @Get()
  async getProfile(@CurrentUser() user: JwtPayload) {
    return this.tutorService.getProfile(user.userId);
  }

  @Patch()
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(UpdateTutorProfileSchema))
    dto: UpdateTutorProfileDto,
  ) {
    return this.tutorService.updateProfile(user.userId, dto);
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @CurrentUser() user: JwtPayload,
    @InstitutionId() institutionId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    const url = await this.uploadService.saveFile(
      file,
      institutionId,
      'avatars',
    );
    await this.tutorService.updateAvatar(user.userId, url);
    return { url };
  }
}
