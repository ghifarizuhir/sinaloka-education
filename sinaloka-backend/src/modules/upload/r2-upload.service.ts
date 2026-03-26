import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { randomUUID } from 'crypto';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_RAW_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_WIDTH = 1200;
const WEBP_QUALITY = 80;

@Injectable()
export class R2UploadService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly logger = new Logger(R2UploadService.name);

  constructor(private config: ConfigService) {
    const accountId = this.config.get<string>('R2_ACCOUNT_ID', '');
    this.bucket = this.config.get<string>('R2_BUCKET_NAME', '');
    this.publicUrl = this.config.get<string>('R2_PUBLIC_URL', '');

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.config.get<string>('R2_ACCESS_KEY_ID', ''),
        secretAccessKey: this.config.get<string>('R2_SECRET_ACCESS_KEY', ''),
      },
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    keyPrefix: string,
  ): Promise<{ id: string; url: string }> {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} not allowed. Use: jpg, png, webp`,
      );
    }
    if (file.size > MAX_RAW_SIZE) {
      throw new BadRequestException('File exceeds 2MB limit');
    }

    const id = randomUUID();
    const key = `${keyPrefix}/${id}.webp`;

    const compressed = await sharp(file.buffer)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: compressed,
        ContentType: 'image/webp',
      }),
    );

    const url = `${this.publicUrl}/${key}`;
    this.logger.log(`Uploaded ${key} (${compressed.length} bytes)`);
    return { id, url };
  }

  async deleteImage(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
    this.logger.log(`Deleted ${key}`);
  }
}
