import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UploadService } from './upload.service.js';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DIR = '/tmp/sinaloka-test-uploads';

describe('UploadService', () => {
  let service: UploadService;

  beforeEach(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        {
          provide: ConfigService,
          useValue: { get: () => TEST_DIR },
        },
      ],
    }).compile();
    service = mod.get(UploadService);
  });

  afterAll(() => {
    if (fs.existsSync(TEST_DIR))
      fs.rmSync(TEST_DIR, { recursive: true });
  });

  it('saves a valid file and returns relative path', async () => {
    const file = {
      originalname: 'proof.pdf',
      size: 1024,
      buffer: Buffer.from('pdf-data'),
    } as Express.Multer.File;
    const rel = await service.saveFile(file, 'inst-1', 'proofs');
    expect(rel).toMatch(/^inst-1\/proofs\/.*\.pdf$/);
    const abs = path.join(TEST_DIR, rel);
    expect(fs.existsSync(abs)).toBe(true);
  });

  it('rejects disallowed extension', async () => {
    const file = {
      originalname: 'hack.exe',
      size: 100,
      buffer: Buffer.alloc(0),
    } as Express.Multer.File;
    await expect(
      service.saveFile(file, 'inst-1', 'proofs'),
    ).rejects.toThrow('not allowed');
  });

  it('rejects file exceeding 5MB', async () => {
    const file = {
      originalname: 'big.jpg',
      size: 6 * 1024 * 1024,
      buffer: Buffer.alloc(0),
    } as Express.Multer.File;
    await expect(
      service.saveFile(file, 'inst-1', 'proofs'),
    ).rejects.toThrow('5MB');
  });

  it('getFilePath rejects path traversal', () => {
    expect(() =>
      service.getFilePath('inst-1', '..', 'etc/passwd'),
    ).toThrow();
  });

  it('getFilePath rejects invalid extension', () => {
    expect(() =>
      service.getFilePath('inst-1', 'proofs', 'file.exe'),
    ).toThrow('Invalid file type');
  });

  it('getFilePath rejects non-existent file', () => {
    expect(() =>
      service.getFilePath('inst-1', 'proofs', 'nonexistent.pdf'),
    ).toThrow('File not found');
  });
});
