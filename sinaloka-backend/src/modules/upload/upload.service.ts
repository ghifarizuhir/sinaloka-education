import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.pdf'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

@Injectable()
export class UploadService {
  private baseDir: string;

  constructor(private config: ConfigService) {
    this.baseDir = this.config.get('UPLOAD_DIR', './uploads')!;
  }

  async saveFile(
    file: Express.Multer.File,
    institutionId: string,
    type: string,
  ): Promise<string> {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.includes(ext))
      throw new BadRequestException(
        `File type ${ext} not allowed. Use: ${ALLOWED_EXT.join(', ')}`,
      );
    if (file.size > MAX_SIZE)
      throw new BadRequestException(`File exceeds 5MB limit`);

    const dir = path.join(this.baseDir, institutionId, type);
    fs.mkdirSync(dir, { recursive: true });

    const filename = `${randomUUID()}${ext}`;
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, file.buffer);

    return `${institutionId}/${type}/${filename}`;
  }

  getFilePath(institutionId: string, type: string, filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    if (!ALLOWED_EXT.includes(ext))
      throw new BadRequestException('Invalid file type');
    const abs = path.resolve(this.baseDir, institutionId, type, filename);
    if (!abs.startsWith(path.resolve(this.baseDir)))
      throw new BadRequestException('Invalid path');
    if (!fs.existsSync(abs)) throw new BadRequestException('File not found');
    return abs;
  }
}
