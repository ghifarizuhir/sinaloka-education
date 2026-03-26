# Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a customizable public landing page per institution with admin settings, gallery upload to Cloudflare R2, and aggregated stats.

**Architecture:** Extend existing Institution model with 8 new columns. Add landing settings endpoints to SettingsController, public landing endpoint to InstitutionPublicController, and R2UploadService to UploadModule. Frontend: self-contained LandingTab in Settings, new public LandingPage replacing `/welcome`.

**Tech Stack:** NestJS, Prisma, Zod, @aws-sdk/client-s3, sharp, React, TanStack Query, Lucide, motion/react

**Spec:** `docs/superpowers/specs/2026-03-26-landing-page-design.md`

---

### Task 1: Prisma Schema Migration + Install Dependencies

**Files:**
- Modify: `sinaloka-backend/prisma/schema.prisma:154-205`
- Modify: `sinaloka-backend/package.json`

- [ ] **Step 1: Add landing page fields to Institution model**

In `sinaloka-backend/prisma/schema.prisma`, add these fields to the Institution model after `background_image_url` (after line 164):

```prisma
  // Landing Page
  landing_enabled       Boolean  @default(false)
  landing_tagline       String?  @db.VarChar(200)
  landing_about         String?  @db.Text
  landing_cta_text      String?  @db.VarChar(50)
  whatsapp_number       String?  @db.VarChar(20)
  landing_features      Json?    @db.JsonB
  gallery_images        Json?    @db.JsonB
  social_links          Json?    @db.JsonB
```

- [ ] **Step 2: Install new dependencies**

Run:
```bash
cd sinaloka-backend && npm install @aws-sdk/client-s3 sharp && npm install -D @types/sharp
```

- [ ] **Step 3: Create and apply migration**

Run:
```bash
cd sinaloka-backend && npx prisma migrate dev --name add_landing_page_fields
```

Expected: Migration created successfully, 8 new columns added.

- [ ] **Step 4: Regenerate Prisma client**

Run:
```bash
cd sinaloka-backend && npm run prisma:generate
```

- [ ] **Step 5: Verify build**

Run:
```bash
cd sinaloka-backend && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add sinaloka-backend/prisma/ sinaloka-backend/package.json sinaloka-backend/package-lock.json
git commit -m "feat(backend): add landing page fields to Institution schema and install R2/sharp deps"
```

---

### Task 2: R2 Upload Service

**Files:**
- Create: `sinaloka-backend/src/modules/upload/r2-upload.service.ts`
- Modify: `sinaloka-backend/src/modules/upload/upload.module.ts`

- [ ] **Step 1: Create R2UploadService**

Create `sinaloka-backend/src/modules/upload/r2-upload.service.ts`:

```typescript
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
```

- [ ] **Step 2: Register R2UploadService in UploadModule**

Modify `sinaloka-backend/src/modules/upload/upload.module.ts`:

```typescript
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
```

- [ ] **Step 3: Verify build**

Run:
```bash
cd sinaloka-backend && npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/upload/
git commit -m "feat(backend): add R2UploadService with sharp image compression"
```

---

### Task 3: Landing Settings DTO

**Files:**
- Modify: `sinaloka-backend/src/modules/settings/settings.dto.ts`

- [ ] **Step 1: Add landing Zod schemas**

Append to `sinaloka-backend/src/modules/settings/settings.dto.ts` (after the existing schemas):

```typescript
// ─── Landing Page ───────────────────────────────────────

const LandingFeatureSchema = z.object({
  id: z.string().uuid(),
  icon: z.string().min(1).max(30),
  title: z.string().min(1).max(50),
  description: z.string().min(1).max(120),
});

const GalleryImageSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  caption: z.string().max(100).optional(),
  order: z.number().int().min(0).max(5),
});

const SocialLinksSchema = z.object({
  instagram: z.string().max(200).optional(),
  tiktok: z.string().max(200).optional(),
  facebook: z.string().max(200).optional(),
  youtube: z.string().max(200).optional(),
  website: z.string().url().max(200).optional(),
});

export const UpdateLandingSettingsSchema = z.object({
  landing_enabled: z.boolean().optional(),
  landing_tagline: z.string().max(200).optional().nullable(),
  landing_about: z.string().max(2000).optional().nullable(),
  landing_cta_text: z.string().max(50).optional().nullable(),
  whatsapp_number: z.string().max(20).optional().nullable(),
  landing_features: z.array(LandingFeatureSchema).max(4).optional().nullable(),
  gallery_images: z.array(GalleryImageSchema).max(6).optional().nullable(),
  social_links: SocialLinksSchema.optional().nullable(),
});
export type UpdateLandingSettingsDto = z.infer<typeof UpdateLandingSettingsSchema>;
```

- [ ] **Step 2: Verify build**

Run:
```bash
cd sinaloka-backend && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-backend/src/modules/settings/settings.dto.ts
git commit -m "feat(backend): add landing page Zod validation schemas"
```

---

### Task 4: Settings Service — Landing Methods

**Files:**
- Modify: `sinaloka-backend/src/modules/settings/settings.service.ts`

- [ ] **Step 1: Add LANDING_SELECT constant and landing methods**

Add at the top of `settings.service.ts` (near other SELECT constants):

```typescript
const LANDING_SELECT = {
  landing_enabled: true,
  landing_tagline: true,
  landing_about: true,
  landing_cta_text: true,
  whatsapp_number: true,
  landing_features: true,
  gallery_images: true,
  social_links: true,
};
```

Add these methods to the `SettingsService` class:

```typescript
  async getLandingSettings(institutionId: string) {
    const institution = await this.prisma.institution.findUniqueOrThrow({
      where: { id: institutionId },
      select: LANDING_SELECT,
    });
    return institution;
  }

  async updateLandingSettings(
    institutionId: string,
    dto: UpdateLandingSettingsDto,
  ) {
    const updated = await this.prisma.institution.update({
      where: { id: institutionId },
      data: dto,
      select: LANDING_SELECT,
    });
    return updated;
  }

  async addGalleryImage(
    institutionId: string,
    image: { id: string; url: string },
  ) {
    const inst = await this.prisma.institution.findUniqueOrThrow({
      where: { id: institutionId },
      select: { gallery_images: true },
    });
    const images = (inst.gallery_images as any[]) ?? [];
    if (images.length >= 6) {
      throw new BadRequestException('Maximum 6 gallery images allowed');
    }
    const newImage = { ...image, caption: null, order: images.length };
    const updated = await this.prisma.institution.update({
      where: { id: institutionId },
      data: { gallery_images: [...images, newImage] },
      select: { gallery_images: true },
    });
    return updated.gallery_images;
  }

  async removeGalleryImage(institutionId: string, imageId: string) {
    const inst = await this.prisma.institution.findUniqueOrThrow({
      where: { id: institutionId },
      select: { gallery_images: true },
    });
    const images = (inst.gallery_images as any[]) ?? [];
    const image = images.find((img) => img.id === imageId);
    if (!image) {
      throw new NotFoundException(`Gallery image ${imageId} not found`);
    }
    const filtered = images
      .filter((img) => img.id !== imageId)
      .map((img, i) => ({ ...img, order: i }));
    await this.prisma.institution.update({
      where: { id: institutionId },
      data: { gallery_images: filtered },
    });
    return image;
  }
```

- [ ] **Step 2: Add required imports**

Add to the imports at the top of `settings.service.ts`:

```typescript
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { UpdateLandingSettingsDto } from './settings.dto.js';
```

(Check which exceptions are already imported and only add missing ones.)

- [ ] **Step 3: Verify build**

Run:
```bash
cd sinaloka-backend && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/settings/settings.service.ts
git commit -m "feat(backend): add landing settings service methods"
```

---

### Task 5: Settings Controller — Landing + Gallery Endpoints

**Files:**
- Modify: `sinaloka-backend/src/modules/settings/settings.controller.ts`
- Modify: `sinaloka-backend/src/modules/settings/settings.module.ts`

- [ ] **Step 1: Import UploadModule in SettingsModule**

Modify `sinaloka-backend/src/modules/settings/settings.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';
import { UploadModule } from '../upload/upload.module.js';

@Module({
  imports: [UploadModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
```

- [ ] **Step 2: Add landing endpoints to SettingsController**

Add these imports to the top of `sinaloka-backend/src/modules/settings/settings.controller.ts`:

```typescript
import { Controller, Get, Patch, Post, Delete, Body, Param, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateLandingSettingsSchema } from './settings.dto.js';
import type { UpdateLandingSettingsDto } from './settings.dto.js';
import { R2UploadService } from '../upload/r2-upload.service.js';
```

Update the constructor to inject `R2UploadService`:

```typescript
constructor(
  private readonly settingsService: SettingsService,
  private readonly r2UploadService: R2UploadService,
) {}
```

Add these methods to the controller class (after the existing registration endpoints):

```typescript
  // ─── Landing Page ───────────────────────────────────────

  @Get('landing')
  getLandingSettings(@InstitutionId() institutionId: string) {
    return this.settingsService.getLandingSettings(institutionId);
  }

  @Patch('landing')
  updateLandingSettings(
    @InstitutionId() institutionId: string,
    @Body(new ZodValidationPipe(UpdateLandingSettingsSchema))
    dto: UpdateLandingSettingsDto,
  ) {
    return this.settingsService.updateLandingSettings(institutionId, dto);
  }

  @Post('landing/gallery')
  @UseInterceptors(FileInterceptor('file'))
  async uploadGalleryImage(
    @InstitutionId() institutionId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    const keyPrefix = `institutions/${institutionId}/gallery`;
    const { id, url } = await this.r2UploadService.uploadImage(file, keyPrefix);
    await this.settingsService.addGalleryImage(institutionId, { id, url });
    return { id, url };
  }

  @Delete('landing/gallery/:imageId')
  async deleteGalleryImage(
    @InstitutionId() institutionId: string,
    @Param('imageId') imageId: string,
  ) {
    const image = await this.settingsService.removeGalleryImage(
      institutionId,
      imageId,
    );
    const key = `institutions/${institutionId}/gallery/${imageId}.webp`;
    await this.r2UploadService.deleteImage(key);
  }
```

Also add `BadRequestException` to the `@nestjs/common` import if not already there.

- [ ] **Step 3: Verify build**

Run:
```bash
cd sinaloka-backend && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/settings/
git commit -m "feat(backend): add landing settings and gallery upload endpoints"
```

---

### Task 6: Public Landing Endpoint

**Files:**
- Modify: `sinaloka-backend/src/modules/institution/institution.service.ts`
- Modify: `sinaloka-backend/src/modules/institution/institution-public.controller.ts`

- [ ] **Step 1: Extend findBySlugPublic to include landing_enabled**

In `sinaloka-backend/src/modules/institution/institution.service.ts`, modify `findBySlugPublic` (around line 191). Add `landing_enabled: true` to the `select` object and include it in the return:

Add to select (line ~209):
```typescript
        landing_enabled: true,
```

Add to return object (after `registration_enabled`, line ~225):
```typescript
      landing_enabled: institution.landing_enabled,
```

Update the return type signature to include `landing_enabled: boolean`.

- [ ] **Step 2: Add in-memory cache and findLandingBySlug method**

Add a cache Map as a private field at the top of the `InstitutionService` class:

```typescript
  private landingCache = new Map<string, { data: any; expiry: number }>();
  private readonly LANDING_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
```

Add the `findLandingBySlug` method:

```typescript
  async findLandingBySlug(slug: string) {
    const cached = this.landingCache.get(slug);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    const institution = await this.prisma.institution.findFirst({
      where: { slug, is_active: true },
      select: {
        id: true,
        name: true,
        slug: true,
        logo_url: true,
        description: true,
        brand_color: true,
        background_image_url: true,
        email: true,
        phone: true,
        address: true,
        settings: true,
        landing_enabled: true,
        landing_tagline: true,
        landing_about: true,
        landing_cta_text: true,
        whatsapp_number: true,
        landing_features: true,
        gallery_images: true,
        social_links: true,
      },
    });
    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    const settings = institution.settings as Record<string, any> | null;
    const registrationEnabled =
      settings?.registration?.student_enabled ?? false;

    const [activeStudents, tutorCount, subjects] =
      await this.prisma.$transaction([
        this.prisma.student.count({
          where: { institution_id: institution.id, status: 'ACTIVE' },
        }),
        this.prisma.tutor.count({
          where: { institution_id: institution.id },
        }),
        this.prisma.subject.findMany({
          where: { institution_id: institution.id },
          select: { id: true, name: true },
        }),
      ]);

    const data = {
      name: institution.name,
      slug: institution.slug,
      logo_url: institution.logo_url,
      description: institution.description,
      brand_color: institution.brand_color,
      background_image_url: institution.background_image_url,
      email: institution.email,
      phone: institution.phone,
      address: institution.address,
      registration_enabled: registrationEnabled,
      landing_enabled: institution.landing_enabled,
      landing_tagline: institution.landing_tagline,
      landing_about: institution.landing_about,
      landing_cta_text: institution.landing_cta_text,
      whatsapp_number: institution.whatsapp_number,
      landing_features: institution.landing_features,
      gallery_images: institution.gallery_images,
      social_links: institution.social_links,
      stats: {
        active_students: activeStudents,
        active_tutors: tutorCount,
        total_subjects: subjects.length,
      },
      subjects,
    };

    this.landingCache.set(slug, {
      data,
      expiry: Date.now() + this.LANDING_CACHE_TTL,
    });

    return data;
  }

  invalidateLandingCache(slug: string) {
    this.landingCache.delete(slug);
  }
```

- [ ] **Step 3: Add cache invalidation to settings update flow**

In `sinaloka-backend/src/modules/settings/settings.service.ts`, inject `InstitutionService` and call cache invalidation after landing settings update.

Actually, a simpler approach: modify `SettingsController.updateLandingSettings` to also invalidate the cache. Add `InstitutionService` injection to the controller:

In `settings.module.ts`, add `InstitutionModule` to imports:
```typescript
import { InstitutionModule } from '../institution/institution.module.js';

@Module({
  imports: [UploadModule, InstitutionModule],
  // ...
})
```

In `settings.controller.ts`, inject and use:
```typescript
import { InstitutionService } from '../institution/institution.service.js';

constructor(
  private readonly settingsService: SettingsService,
  private readonly r2UploadService: R2UploadService,
  private readonly institutionService: InstitutionService,
) {}
```

Update `updateLandingSettings` to invalidate cache:
```typescript
  @Patch('landing')
  async updateLandingSettings(
    @InstitutionId() institutionId: string,
    @Body(new ZodValidationPipe(UpdateLandingSettingsSchema))
    dto: UpdateLandingSettingsDto,
  ) {
    const result = await this.settingsService.updateLandingSettings(institutionId, dto);
    // Invalidate public landing cache
    const inst = await this.settingsService.getInstitutionSlug(institutionId);
    this.institutionService.invalidateLandingCache(inst);
    return result;
  }
```

Add `getInstitutionSlug` helper to `SettingsService`:
```typescript
  async getInstitutionSlug(institutionId: string): Promise<string> {
    const inst = await this.prisma.institution.findUniqueOrThrow({
      where: { id: institutionId },
      select: { slug: true },
    });
    return inst.slug;
  }
```

- [ ] **Step 4: Add landing endpoint to InstitutionPublicController**

Modify `sinaloka-backend/src/modules/institution/institution-public.controller.ts`:

```typescript
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import {
  RateLimitGuard,
  RateLimit,
} from '../../common/guards/rate-limit.guard.js';
import { ParseSlugPipe } from '../../common/pipes/parse-slug.pipe.js';
import { InstitutionService } from './institution.service.js';

@Controller('institutions/public')
@Public()
@UseGuards(RateLimitGuard)
export class InstitutionPublicController {
  constructor(private readonly institutionService: InstitutionService) {}

  @Get(':slug')
  @RateLimit(30, 60 * 1000)
  async getBySlug(@Param('slug', ParseSlugPipe) slug: string) {
    return this.institutionService.findBySlugPublic(slug);
  }

  @Get(':slug/landing')
  @RateLimit(30, 60 * 1000)
  async getLanding(@Param('slug', ParseSlugPipe) slug: string) {
    return this.institutionService.findLandingBySlug(slug);
  }
}
```

- [ ] **Step 5: Verify build**

Run:
```bash
cd sinaloka-backend && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add sinaloka-backend/src/modules/institution/ sinaloka-backend/src/modules/settings/
git commit -m "feat(backend): add public landing endpoint with cache and stats aggregation"
```

---

### Task 7: Backend Unit Tests

**Files:**
- Modify: `sinaloka-backend/src/modules/institution/institution.service.spec.ts`

- [ ] **Step 1: Add tests for findBySlugPublic landing_enabled field**

Add to the existing `findBySlugPublic` describe block in `institution.service.spec.ts`:

```typescript
    it('should include landing_enabled in response', async () => {
      prisma.institution.findFirst.mockResolvedValue({
        name: 'Test',
        slug: 'test',
        logo_url: null,
        description: null,
        brand_color: null,
        background_image_url: null,
        settings: null,
        landing_enabled: true,
      });

      const result = await service.findBySlugPublic('test');
      expect(result.landing_enabled).toBe(true);
    });
```

- [ ] **Step 2: Add tests for findLandingBySlug**

Add a new describe block:

```typescript
  describe('findLandingBySlug', () => {
    it('should return landing data with stats and subjects', async () => {
      prisma.institution.findFirst.mockResolvedValue({
        id: 'inst-1',
        name: 'Bimbel Test',
        slug: 'bimbel-test',
        logo_url: null,
        description: 'A test institution',
        brand_color: '#6366f1',
        background_image_url: null,
        email: 'info@test.com',
        phone: '08123456789',
        address: 'Jl. Test',
        settings: { registration: { student_enabled: true } },
        landing_enabled: true,
        landing_tagline: 'Learn with us',
        landing_about: 'We are a tutoring center',
        landing_cta_text: null,
        whatsapp_number: '08123456789',
        landing_features: [
          { id: 'f1', icon: 'Users', title: 'Small class', description: 'Max 5' },
        ],
        gallery_images: null,
        social_links: { instagram: '@test' },
      });

      prisma.$transaction.mockResolvedValue([
        10, // active students
        3,  // tutors
        [{ id: 's1', name: 'Math' }, { id: 's2', name: 'Physics' }],
      ]);

      const result = await service.findLandingBySlug('bimbel-test');

      expect(result.name).toBe('Bimbel Test');
      expect(result.landing_enabled).toBe(true);
      expect(result.landing_tagline).toBe('Learn with us');
      expect(result.registration_enabled).toBe(true);
      expect(result.stats).toEqual({
        active_students: 10,
        active_tutors: 3,
        total_subjects: 2,
      });
      expect(result.subjects).toHaveLength(2);
    });

    it('should throw NotFoundException for unknown slug', async () => {
      prisma.institution.findFirst.mockResolvedValue(null);
      await expect(service.findLandingBySlug('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return cached data on second call', async () => {
      prisma.institution.findFirst.mockResolvedValue({
        id: 'inst-1', name: 'Test', slug: 'test',
        logo_url: null, description: null, brand_color: null,
        background_image_url: null, email: null, phone: null,
        address: null, settings: null, landing_enabled: false,
        landing_tagline: null, landing_about: null,
        landing_cta_text: null, whatsapp_number: null,
        landing_features: null, gallery_images: null,
        social_links: null,
      });
      prisma.$transaction.mockResolvedValue([0, 0, []]);

      await service.findLandingBySlug('test');
      await service.findLandingBySlug('test');

      // findFirst should be called only once due to cache
      expect(prisma.institution.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should clear cache on invalidateLandingCache', async () => {
      prisma.institution.findFirst.mockResolvedValue({
        id: 'inst-1', name: 'Test', slug: 'test',
        logo_url: null, description: null, brand_color: null,
        background_image_url: null, email: null, phone: null,
        address: null, settings: null, landing_enabled: false,
        landing_tagline: null, landing_about: null,
        landing_cta_text: null, whatsapp_number: null,
        landing_features: null, gallery_images: null,
        social_links: null,
      });
      prisma.$transaction.mockResolvedValue([0, 0, []]);

      await service.findLandingBySlug('test');
      service.invalidateLandingCache('test');
      await service.findLandingBySlug('test');

      expect(prisma.institution.findFirst).toHaveBeenCalledTimes(2);
    });
  });
```

- [ ] **Step 3: Run tests**

Run:
```bash
cd sinaloka-backend && npm run test -- --testPathPattern=institution.service
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/institution/institution.service.spec.ts
git commit -m "test(backend): add unit tests for landing page service methods"
```

---

### Task 8: Frontend — Types, Service, Hooks, i18n

**Files:**
- Modify: `sinaloka-platform/src/types/institution-public.ts`
- Create: `sinaloka-platform/src/types/landing.ts`
- Modify: `sinaloka-platform/src/services/settings.service.ts`
- Modify: `sinaloka-platform/src/services/institutionPublic.service.ts`
- Modify: `sinaloka-platform/src/hooks/useSettings.ts`
- Modify: `sinaloka-platform/src/locales/id.json`
- Modify: `sinaloka-platform/src/locales/en.json`

- [ ] **Step 1: Add landing_enabled to InstitutionPublicData**

Modify `sinaloka-platform/src/types/institution-public.ts`:

```typescript
export interface InstitutionPublicData {
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  brand_color: string | null;
  background_image_url: string | null;
  registration_enabled: boolean;
  landing_enabled: boolean;
}
```

- [ ] **Step 2: Create landing types**

Create `sinaloka-platform/src/types/landing.ts`:

```typescript
export interface LandingFeature {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface GalleryImage {
  id: string;
  url: string;
  caption?: string;
  order: number;
}

export interface SocialLinks {
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  youtube?: string;
  website?: string;
}

export interface LandingSettings {
  landing_enabled: boolean;
  landing_tagline: string | null;
  landing_about: string | null;
  landing_cta_text: string | null;
  whatsapp_number: string | null;
  landing_features: LandingFeature[] | null;
  gallery_images: GalleryImage[] | null;
  social_links: SocialLinks | null;
}

export interface UpdateLandingSettingsDto {
  landing_enabled?: boolean;
  landing_tagline?: string | null;
  landing_about?: string | null;
  landing_cta_text?: string | null;
  whatsapp_number?: string | null;
  landing_features?: LandingFeature[] | null;
  gallery_images?: GalleryImage[] | null;
  social_links?: SocialLinks | null;
}

export interface LandingPageData {
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  brand_color: string | null;
  background_image_url: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  registration_enabled: boolean;
  landing_enabled: boolean;
  landing_tagline: string | null;
  landing_about: string | null;
  landing_cta_text: string | null;
  whatsapp_number: string | null;
  landing_features: LandingFeature[] | null;
  gallery_images: GalleryImage[] | null;
  social_links: SocialLinks | null;
  stats: {
    active_students: number;
    active_tutors: number;
    total_subjects: number;
  };
  subjects: { id: string; name: string }[];
}
```

- [ ] **Step 3: Add landing service methods**

Append to `sinaloka-platform/src/services/settings.service.ts`:

```typescript
import type { LandingSettings, UpdateLandingSettingsDto } from '@/src/types/landing';

// Add to the settingsService object:
  getLanding: () =>
    api.get<LandingSettings>('/api/settings/landing').then((r) => r.data),
  updateLanding: (data: UpdateLandingSettingsDto) =>
    api.patch<LandingSettings>('/api/settings/landing', data).then((r) => r.data),
  uploadGalleryImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ id: string; url: string }>('/api/settings/landing/gallery', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
  deleteGalleryImage: (imageId: string) =>
    api.delete(`/api/settings/landing/gallery/${imageId}`),
```

Add landing endpoint to `sinaloka-platform/src/services/institutionPublic.service.ts`:

```typescript
import type { LandingPageData } from '@/src/types/landing';

// Add to the institutionPublicService object:
  getLanding: (slug: string) =>
    api.get<LandingPageData>(`/api/institutions/public/${slug}/landing`).then((r) => r.data),
```

- [ ] **Step 4: Add landing hooks**

Append to `sinaloka-platform/src/hooks/useSettings.ts`:

```typescript
import { settingsService } from '@/src/services/settings.service';
import type { UpdateLandingSettingsDto } from '@/src/types/landing';

export function useLandingSettings() {
  return useQuery({
    queryKey: ['settings', 'landing'],
    queryFn: settingsService.getLanding,
  });
}

export function useUpdateLandingSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateLandingSettingsDto) => settingsService.updateLanding(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'landing'] }),
  });
}
```

- [ ] **Step 5: Add i18n keys to id.json**

Add under the `"settings"` object in `sinaloka-platform/src/locales/id.json`, inside `"tabs"`:

```json
      "landing": "Landing Page"
```

Add a new `"landing"` section under `"settings"`:

```json
    "landing": {
      "title": "Landing Page",
      "description": "Kustomisasi halaman publik bimbel Anda",
      "enabled": "Aktifkan landing page",
      "enabledHint": "Jika dinonaktifkan, pengunjung langsung ke halaman login",
      "url": "URL Landing Page",
      "copy": "Salin URL",
      "preview": "Lihat Landing Page",
      "tagline": "Headline",
      "taglinePlaceholder": "Raih prestasi terbaikmu bersama kami",
      "ctaText": "Teks tombol daftar",
      "ctaDefault": "Daftar Sekarang",
      "about": "Tentang Kami",
      "aboutPlaceholder": "Ceritakan tentang bimbel Anda...",
      "features": "Keunggulan Bimbel",
      "featuresAdd": "Tambah keunggulan",
      "featuresMax": "Maksimal 4 keunggulan",
      "featureTitle": "Judul",
      "featureDescription": "Deskripsi",
      "gallery": "Galeri Foto",
      "galleryAdd": "Tambah foto",
      "galleryMax": "Maksimal 6 foto",
      "whatsapp": "Nomor WhatsApp",
      "whatsappHint": "Untuk tombol WhatsApp di landing page",
      "socialLinks": "Media Sosial",
      "saveSuccess": "Pengaturan landing page disimpan",
      "saveFailed": "Gagal menyimpan pengaturan",
      "uploadFailed": "Gagal mengunggah gambar",
      "deleteFailed": "Gagal menghapus gambar"
    }
```

Add public landing page keys (new top-level section):

```json
  "landingPage": {
    "features": "Keunggulan Kami",
    "subjects": "Mata Pelajaran",
    "about": "Tentang Kami",
    "gallery": "Galeri",
    "contact": "Hubungi Kami",
    "ready": "Siap bergabung?",
    "readyDesc": "Daftarkan anak Anda sekarang dan mulai perjalanan belajar yang lebih baik.",
    "registerNow": "Daftar Sekarang",
    "login": "Login",
    "poweredBy": "Powered by Sinaloka",
    "students": "Siswa Aktif",
    "tutors": "Tutor",
    "subjectsCount": "Mata Pelajaran",
    "whatsappChat": "Chat WhatsApp"
  }
```

- [ ] **Step 6: Add i18n keys to en.json**

Same structure in `sinaloka-platform/src/locales/en.json`:

Settings tabs:
```json
      "landing": "Landing Page"
```

Settings landing section:
```json
    "landing": {
      "title": "Landing Page",
      "description": "Customize your public institution page",
      "enabled": "Enable landing page",
      "enabledHint": "If disabled, visitors are redirected to the login page",
      "url": "Landing Page URL",
      "copy": "Copy URL",
      "preview": "View Landing Page",
      "tagline": "Headline",
      "taglinePlaceholder": "Achieve your best with us",
      "ctaText": "Register button text",
      "ctaDefault": "Register Now",
      "about": "About Us",
      "aboutPlaceholder": "Tell about your institution...",
      "features": "Key Features",
      "featuresAdd": "Add feature",
      "featuresMax": "Maximum 4 features",
      "featureTitle": "Title",
      "featureDescription": "Description",
      "gallery": "Photo Gallery",
      "galleryAdd": "Add photo",
      "galleryMax": "Maximum 6 photos",
      "whatsapp": "WhatsApp Number",
      "whatsappHint": "For the WhatsApp button on landing page",
      "socialLinks": "Social Media",
      "saveSuccess": "Landing page settings saved",
      "saveFailed": "Failed to save settings",
      "uploadFailed": "Failed to upload image",
      "deleteFailed": "Failed to delete image"
    }
```

Public landing page:
```json
  "landingPage": {
    "features": "Our Advantages",
    "subjects": "Subjects",
    "about": "About Us",
    "gallery": "Gallery",
    "contact": "Contact Us",
    "ready": "Ready to join?",
    "readyDesc": "Register your child now and start a better learning journey.",
    "registerNow": "Register Now",
    "login": "Login",
    "poweredBy": "Powered by Sinaloka",
    "students": "Active Students",
    "tutors": "Tutors",
    "subjectsCount": "Subjects",
    "whatsappChat": "Chat WhatsApp"
  }
```

- [ ] **Step 7: Verify build**

Run:
```bash
cd sinaloka-platform && npm run lint
```

- [ ] **Step 8: Commit**

```bash
git add sinaloka-platform/src/types/ sinaloka-platform/src/services/ sinaloka-platform/src/hooks/ sinaloka-platform/src/locales/
git commit -m "feat(platform): add landing page types, services, hooks, and i18n keys"
```

---

### Task 9: Frontend — Settings LandingTab

**Files:**
- Create: `sinaloka-platform/src/pages/Settings/tabs/LandingTab.tsx`
- Create: `sinaloka-platform/src/pages/Settings/tabs/components/FeatureRepeater.tsx`
- Create: `sinaloka-platform/src/pages/Settings/tabs/components/GalleryUploader.tsx`
- Create: `sinaloka-platform/src/pages/Settings/tabs/components/IconPicker.tsx`
- Modify: `sinaloka-platform/src/pages/Settings/index.tsx`

- [ ] **Step 1: Create IconPicker component**

Create `sinaloka-platform/src/pages/Settings/tabs/components/IconPicker.tsx`:

```tsx
import { useState, useRef, useEffect } from 'react';
import { icons, type LucideIcon } from 'lucide-react';
import { cn } from '@/src/lib/utils';

const POPULAR_ICONS = [
  'Users', 'BookOpen', 'CheckCircle', 'GraduationCap', 'Target',
  'Trophy', 'Star', 'Clock', 'Heart', 'Lightbulb', 'MessageCircle',
  'BarChart', 'Shield', 'Zap', 'Globe', 'Headphones', 'Award',
  'Brain', 'Rocket', 'ThumbsUp', 'Smile', 'Calendar', 'Monitor',
  'Wifi',
] as const;

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const CurrentIcon = (icons as Record<string, LucideIcon>)[value];

  const filtered = search
    ? Object.keys(icons).filter((name) =>
        name.toLowerCase().includes(search.toLowerCase()),
      ).slice(0, 24)
    : POPULAR_ICONS as unknown as string[];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-10 h-10 flex items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700"
      >
        {CurrentIcon ? <CurrentIcon size={18} /> : <span className="text-xs text-zinc-400">?</span>}
      </button>
      {open && (
        <div className="absolute z-50 top-12 left-0 w-64 p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search icons..."
            className="w-full px-2 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded mb-2"
            autoFocus
          />
          <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto">
            {filtered.map((name) => {
              const Icon = (icons as Record<string, LucideIcon>)[name];
              if (!Icon) return null;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => { onChange(name); setOpen(false); setSearch(''); }}
                  className={cn(
                    'w-9 h-9 flex items-center justify-center rounded hover:bg-zinc-100 dark:hover:bg-zinc-800',
                    value === name && 'bg-primary/10 text-primary',
                  )}
                  title={name}
                >
                  <Icon size={16} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create FeatureRepeater component**

Create `sinaloka-platform/src/pages/Settings/tabs/components/FeatureRepeater.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/src/components/UI';
import { IconPicker } from './IconPicker';
import type { LandingFeature } from '@/src/types/landing';

interface FeatureRepeaterProps {
  features: LandingFeature[];
  onChange: (features: LandingFeature[]) => void;
}

export function FeatureRepeater({ features, onChange }: FeatureRepeaterProps) {
  const { t } = useTranslation();

  const addFeature = () => {
    if (features.length >= 4) return;
    onChange([
      ...features,
      { id: crypto.randomUUID(), icon: 'Star', title: '', description: '' },
    ]);
  };

  const removeFeature = (id: string) => {
    onChange(features.filter((f) => f.id !== id));
  };

  const updateFeature = (id: string, field: keyof LandingFeature, value: string) => {
    onChange(features.map((f) => (f.id === id ? { ...f, [field]: value } : f)));
  };

  return (
    <div className="space-y-3">
      {features.map((feature) => (
        <div
          key={feature.id}
          className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg space-y-2"
        >
          <div className="flex items-center gap-2">
            <IconPicker
              value={feature.icon}
              onChange={(icon) => updateFeature(feature.id, 'icon', icon)}
            />
            <input
              type="text"
              value={feature.title}
              onChange={(e) => updateFeature(feature.id, 'title', e.target.value)}
              placeholder={t('settings.landing.featureTitle')}
              maxLength={50}
              className="flex-1 px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md"
            />
            <button
              type="button"
              onClick={() => removeFeature(feature.id)}
              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded"
            >
              <Trash2 size={16} />
            </button>
          </div>
          <input
            type="text"
            value={feature.description}
            onChange={(e) => updateFeature(feature.id, 'description', e.target.value)}
            placeholder={t('settings.landing.featureDescription')}
            maxLength={120}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md"
          />
        </div>
      ))}
      {features.length < 4 && (
        <button
          type="button"
          onClick={addFeature}
          className="w-full py-2 border border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg text-sm text-primary hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center justify-center gap-1"
        >
          <Plus size={14} />
          {t('settings.landing.featuresAdd')}
        </button>
      )}
      <p className="text-xs text-zinc-400 text-right">
        {features.length}/4
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Create GalleryUploader component**

Create `sinaloka-platform/src/pages/Settings/tabs/components/GalleryUploader.tsx`:

```tsx
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { settingsService } from '@/src/services/settings.service';
import type { GalleryImage } from '@/src/types/landing';

interface GalleryUploaderProps {
  images: GalleryImage[];
  onChange: (images: GalleryImage[]) => void;
}

export function GalleryUploader({ images, onChange }: GalleryUploaderProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const upload = useMutation({
    mutationFn: (file: File) => settingsService.uploadGalleryImage(file),
    onSuccess: (data) => {
      const newImage: GalleryImage = {
        id: data.id,
        url: data.url,
        order: images.length,
      };
      onChange([...images, newImage]);
      qc.invalidateQueries({ queryKey: ['settings', 'landing'] });
    },
    onError: () => toast.error(t('settings.landing.uploadFailed')),
  });

  const deleteMutation = useMutation({
    mutationFn: (imageId: string) => settingsService.deleteGalleryImage(imageId),
    onSuccess: (_, imageId) => {
      const filtered = images
        .filter((img) => img.id !== imageId)
        .map((img, i) => ({ ...img, order: i }));
      onChange(filtered);
      qc.invalidateQueries({ queryKey: ['settings', 'landing'] });
    },
    onError: () => toast.error(t('settings.landing.deleteFailed')),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    upload.mutate(file);
    e.target.value = '';
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {images.map((image) => (
          <div key={image.id} className="relative group aspect-[4/3] rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800">
            <img src={image.url} alt={image.caption ?? ''} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => deleteMutation.mutate(image.id)}
              disabled={deleteMutation.isPending}
              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {images.length < 6 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={upload.isPending}
            className="aspect-[4/3] border border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg flex flex-col items-center justify-center gap-1 text-primary hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm"
          >
            {upload.isPending ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <Plus size={20} />
                {t('settings.landing.galleryAdd')}
              </>
            )}
          </button>
        )}
      </div>
      <p className="text-xs text-zinc-400 text-right mt-1">{images.length}/6</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
```

- [ ] **Step 4: Create LandingTab component**

Create `sinaloka-platform/src/pages/Settings/tabs/LandingTab.tsx`:

```tsx
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Card, Skeleton, Button } from '@/src/components/UI';
import { ConfirmChangesModal } from '@/src/components/ui/confirm-changes-modal';
import { collectChanges, detectScalarChange } from '@/src/lib/change-detection';
import { useAuth } from '@/src/hooks/useAuth';
import { useLandingSettings, useUpdateLandingSettings } from '@/src/hooks/useSettings';
import { FeatureRepeater } from './components/FeatureRepeater';
import { GalleryUploader } from './components/GalleryUploader';
import type { LandingFeature, GalleryImage, SocialLinks } from '@/src/types/landing';

export const LandingTab = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: settings, isLoading } = useLandingSettings();
  const updateSettings = useUpdateLandingSettings();

  const slug = user?.institution?.slug ?? '';
  const landingUrl = `https://${slug}.sinaloka.com`;

  // Form state
  const [tagline, setTagline] = useState('');
  const [about, setAbout] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [features, setFeatures] = useState<LandingFeature[]>([]);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [social, setSocial] = useState<SocialLinks>({});

  // Confirm modal
  const [showConfirm, setShowConfirm] = useState(false);
  const initialRef = useRef<typeof settings>(null);

  // Sync from server data
  useEffect(() => {
    if (!settings) return;
    setTagline(settings.landing_tagline ?? '');
    setAbout(settings.landing_about ?? '');
    setCtaText(settings.landing_cta_text ?? '');
    setWhatsapp(settings.whatsapp_number ?? '');
    setFeatures((settings.landing_features as LandingFeature[]) ?? []);
    setGallery((settings.gallery_images as GalleryImage[]) ?? []);
    setSocial((settings.social_links as SocialLinks) ?? {});
    if (!initialRef.current) initialRef.current = settings;
  }, [settings]);

  const handleToggle = (enabled: boolean) => {
    updateSettings.mutate({ landing_enabled: enabled });
  };

  const handleSave = () => {
    const changes = collectChanges(
      detectScalarChange(t('settings.landing.tagline'), initialRef.current?.landing_tagline ?? '', tagline),
      detectScalarChange(t('settings.landing.about'), initialRef.current?.landing_about ?? '', about),
      detectScalarChange(t('settings.landing.ctaText'), initialRef.current?.landing_cta_text ?? '', ctaText),
      detectScalarChange(t('settings.landing.whatsapp'), initialRef.current?.whatsapp_number ?? '', whatsapp),
    );
    if (changes.length === 0 &&
        JSON.stringify(features) === JSON.stringify(initialRef.current?.landing_features ?? []) &&
        JSON.stringify(social) === JSON.stringify(initialRef.current?.social_links ?? {})) {
      toast.info('No changes');
      return;
    }
    setShowConfirm(true);
  };

  const confirmSave = () => {
    updateSettings.mutate(
      {
        landing_tagline: tagline || null,
        landing_about: about || null,
        landing_cta_text: ctaText || null,
        whatsapp_number: whatsapp || null,
        landing_features: features.length > 0 ? features : null,
        gallery_images: gallery.length > 0 ? gallery : null,
        social_links: Object.values(social).some(Boolean) ? social : null,
      },
      {
        onSuccess: () => {
          toast.success(t('settings.landing.saveSuccess'));
          initialRef.current = null; // will be re-set on next data sync
          setShowConfirm(false);
        },
        onError: () => toast.error(t('settings.landing.saveFailed')),
      },
    );
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(landingUrl);
    toast.success(t('settings.landing.copy'));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Globe size={20} className="text-zinc-400" />
          <h3 className="text-lg font-bold dark:text-zinc-100">{t('settings.landing.title')}</h3>
        </div>
        <p className="text-sm text-zinc-500 mb-4">{t('settings.landing.description')}</p>

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium dark:text-zinc-200">{t('settings.landing.enabled')}</p>
            <p className="text-xs text-zinc-400">{t('settings.landing.enabledHint')}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings?.landing_enabled ?? false}
            onClick={() => handleToggle(!settings?.landing_enabled)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              settings?.landing_enabled ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-600'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                settings?.landing_enabled ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </div>

        <div className="flex items-center gap-2 p-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-md text-sm">
          <span className="text-zinc-500 truncate flex-1">{landingUrl}</span>
          <button type="button" onClick={handleCopyUrl} className="text-primary hover:underline text-xs">
            <Copy size={14} />
          </button>
          <a
            href={landingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-primary text-xs ${!settings?.landing_enabled ? 'pointer-events-none opacity-40' : ''}`}
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </Card>

      {/* Hero Content */}
      <Card>
        <h3 className="text-sm font-semibold dark:text-zinc-200 mb-3">Hero</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">{t('settings.landing.tagline')}</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder={t('settings.landing.taglinePlaceholder')}
              maxLength={200}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md"
            />
            <p className="text-xs text-zinc-400 text-right">{tagline.length}/200</p>
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">{t('settings.landing.ctaText')}</label>
            <input
              type="text"
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              placeholder={t('settings.landing.ctaDefault')}
              maxLength={50}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md"
            />
          </div>
        </div>
      </Card>

      {/* About */}
      <Card>
        <h3 className="text-sm font-semibold dark:text-zinc-200 mb-3">{t('settings.landing.about')}</h3>
        <textarea
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          placeholder={t('settings.landing.aboutPlaceholder')}
          maxLength={2000}
          rows={4}
          className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md resize-none"
        />
        <p className="text-xs text-zinc-400 text-right">{about.length}/2000</p>
      </Card>

      {/* Features */}
      <Card>
        <h3 className="text-sm font-semibold dark:text-zinc-200 mb-3">{t('settings.landing.features')}</h3>
        <FeatureRepeater features={features} onChange={setFeatures} />
      </Card>

      {/* Gallery */}
      <Card>
        <h3 className="text-sm font-semibold dark:text-zinc-200 mb-3">{t('settings.landing.gallery')}</h3>
        <GalleryUploader images={gallery} onChange={setGallery} />
      </Card>

      {/* Contact & Social */}
      <Card>
        <h3 className="text-sm font-semibold dark:text-zinc-200 mb-3">{t('settings.landing.socialLinks')}</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">{t('settings.landing.whatsapp')}</label>
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="08xxxxxxxxxx"
              maxLength={20}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md"
            />
            <p className="text-xs text-zinc-400">{t('settings.landing.whatsappHint')}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(['instagram', 'tiktok', 'facebook', 'youtube'] as const).map((platform) => (
              <div key={platform}>
                <label className="text-xs text-zinc-500 mb-1 block capitalize">{platform}</label>
                <input
                  type="text"
                  value={social[platform] ?? ''}
                  onChange={(e) => setSocial({ ...social, [platform]: e.target.value })}
                  placeholder={platform === 'instagram' || platform === 'tiktok' ? '@username' : 'URL'}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md"
                />
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave}>{t('common.save')}</Button>
      </div>

      <ConfirmChangesModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmSave}
        changes={collectChanges(
          detectScalarChange(t('settings.landing.tagline'), initialRef.current?.landing_tagline ?? '', tagline),
          detectScalarChange(t('settings.landing.about'), initialRef.current?.landing_about ?? '', about),
          detectScalarChange(t('settings.landing.ctaText'), initialRef.current?.landing_cta_text ?? '', ctaText),
          detectScalarChange(t('settings.landing.whatsapp'), initialRef.current?.whatsapp_number ?? '', whatsapp),
        )}
        isLoading={updateSettings.isPending}
      />
    </div>
  );
};
```

- [ ] **Step 5: Register LandingTab in Settings page**

Modify `sinaloka-platform/src/pages/Settings/index.tsx`:

Add import:
```typescript
import { Globe } from 'lucide-react';
import { LandingTab } from './tabs/LandingTab';
```

Add to tabs array (after security):
```typescript
      { id: 'landing', label: t('settings.tabs.landing'), icon: Globe },
```

Add tab content render (after security block):
```typescript
      {activeTab === 'landing' && (
        <LandingTab />
      )}
```

- [ ] **Step 6: Verify build**

Run:
```bash
cd sinaloka-platform && npm run lint
```

- [ ] **Step 7: Commit**

```bash
git add sinaloka-platform/src/pages/Settings/
git commit -m "feat(platform): add Landing Page settings tab with feature repeater and gallery uploader"
```

---

### Task 10: Frontend — Public Landing Page Components

**Files:**
- Create: `sinaloka-platform/src/pages/public/LandingPage.tsx`
- Create: `sinaloka-platform/src/pages/public/components/LandingHero.tsx`
- Create: `sinaloka-platform/src/pages/public/components/LandingStats.tsx`
- Create: `sinaloka-platform/src/pages/public/components/LandingFeatures.tsx`
- Create: `sinaloka-platform/src/pages/public/components/LandingSubjects.tsx`
- Create: `sinaloka-platform/src/pages/public/components/LandingAbout.tsx`
- Create: `sinaloka-platform/src/pages/public/components/LandingGallery.tsx`
- Create: `sinaloka-platform/src/pages/public/components/LandingContact.tsx`
- Create: `sinaloka-platform/src/pages/public/components/LandingFooterCTA.tsx`
- Create: `sinaloka-platform/src/pages/public/components/WhatsAppFAB.tsx`

> **Note for implementing agent:** This task creates 10 files. Each component is small and focused. Use the `/frontend-design:frontend-design` skill for high visual quality. All components use the zinc palette, Inter typography, and `motion/react` for animations. `brand_color` from props is the accent color. Refer to the mockup in `.superpowers/brainstorm/307399-1774532667/content/public-landing.html` for the visual reference.

- [ ] **Step 1: Create section components**

Create each component file. Each receives relevant props from `LandingPageData`. Key patterns:
- All use `useTranslation()` for section headers
- All use `motion.div` for entrance animations
- `brand_color` is used as accent via inline `style={{ color: brandColor }}`
- Components return `null` if their data is empty/null

**LandingHero.tsx** — Renders: logo (or initial fallback), institution name, tagline (or description fallback), CTA buttons. Hero gradient uses `brand_color` as tint. "Daftar" button hidden if `!registration_enabled`.

**LandingStats.tsx** — 3 stat cards: active_students, active_tutors, total_subjects. Numbers colored with `brand_color`.

**LandingFeatures.tsx** — 2x2 grid. Each feature: Lucide icon (dynamic from `icon` name), title, description. Returns null if `landing_features` is null/empty.

**LandingSubjects.tsx** — Flex-wrap pills. Returns null if `subjects` is empty.

**LandingAbout.tsx** — Single paragraph. Returns null if `landing_about` is null.

**LandingGallery.tsx** — 3-column grid of images. Returns null if `gallery_images` is null/empty.

**LandingContact.tsx** — Email, phone, address cards + social media icons. Returns null if no contact data exists.

**LandingFooterCTA.tsx** — Final CTA with gradient bg + "Powered by Sinaloka" always shown.

**WhatsAppFAB.tsx** — Fixed bottom-right green button. Links to `https://wa.me/{number}`. Returns null if `whatsapp_number` is null.

- [ ] **Step 2: Create LandingPage.tsx**

Create `sinaloka-platform/src/pages/public/LandingPage.tsx`:

```tsx
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useInstitution } from '@/src/contexts/InstitutionContext';
import { useAuth } from '@/src/hooks/useAuth';
import { institutionPublicService } from '@/src/services/institutionPublic.service';
import { Skeleton } from '@/src/components/UI';
import { LandingHero } from './components/LandingHero';
import { LandingStats } from './components/LandingStats';
import { LandingFeatures } from './components/LandingFeatures';
import { LandingSubjects } from './components/LandingSubjects';
import { LandingAbout } from './components/LandingAbout';
import { LandingGallery } from './components/LandingGallery';
import { LandingContact } from './components/LandingContact';
import { LandingFooterCTA } from './components/LandingFooterCTA';
import { WhatsAppFAB } from './components/WhatsAppFAB';

export function LandingPage() {
  const { institution, slug } = useInstitution();
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  if (!institution?.landing_enabled) return <Navigate to="/login" replace />;

  const { data, isLoading } = useQuery({
    queryKey: ['landing', slug],
    queryFn: () => institutionPublicService.getLanding(slug!),
    enabled: !!slug,
  });

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Skeleton className="w-12 h-12 rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <LandingHero data={data} />
      <LandingStats stats={data.stats} brandColor={data.brand_color} />
      <LandingFeatures features={data.landing_features} brandColor={data.brand_color} />
      <LandingSubjects subjects={data.subjects} />
      <LandingAbout text={data.landing_about} />
      <LandingGallery images={data.gallery_images} />
      <LandingContact data={data} />
      <LandingFooterCTA data={data} />
      <WhatsAppFAB number={data.whatsapp_number} />
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run:
```bash
cd sinaloka-platform && npm run lint
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/pages/public/
git commit -m "feat(platform): add public landing page with 8 section components"
```

---

### Task 11: Frontend — Routing Changes

**Files:**
- Modify: `sinaloka-platform/src/App.tsx`
- Modify: `sinaloka-platform/src/components/ProtectedRoute.tsx`

- [ ] **Step 1: Update App.tsx routing**

In `sinaloka-platform/src/App.tsx`:

Replace the import:
```typescript
// Remove:
import { InstitutionLanding } from './pages/InstitutionLanding';
// Add:
import { LandingPage } from './pages/public/LandingPage';
```

Delete the old file:
```bash
rm sinaloka-platform/src/pages/InstitutionLanding.tsx
```

Replace the `/welcome` route (line ~90):
```typescript
// Remove:
<Route path="/welcome" element={<InstitutionLanding />} />
// Add:
<Route path="/" element={<LandingPage />} />
```

Inside the `ProtectedRoute > Layout` block, change the root redirect (line ~133):
```typescript
// Remove:
<Route path="/" element={<Navigate to="/dashboard" replace />} />
// This is no longer needed since "/" is handled by LandingPage above
```

Wait — the routing needs careful thought. The `LandingPage` is a public route (outside ProtectedRoute), but `/` is also the root inside ProtectedRoute. The public `LandingPage` route at `/` will take priority since it's listed first. Authenticated users hitting `/` will be redirected to `/dashboard` by `LandingPage` (it checks `isAuthenticated`). So remove the duplicate `<Route path="/">` inside ProtectedRoute.

- [ ] **Step 2: Update ProtectedRoute redirect**

In `sinaloka-platform/src/components/ProtectedRoute.tsx`, change the unauthenticated redirect from `/welcome` to `/`:

```typescript
// Line 16-17, change:
if (slug && (location.pathname === '/' || location.pathname === '/dashboard')) {
  return <Navigate to="/welcome" replace />;
}

// To:
if (slug && location.pathname === '/dashboard') {
  return <Navigate to="/" replace />;
}
```

This way, unauthenticated users on `/dashboard` get sent to `/` (landing page), which then either shows the landing or redirects to `/login`.

- [ ] **Step 3: Verify build**

Run:
```bash
cd sinaloka-platform && npm run lint && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-platform/src/App.tsx sinaloka-platform/src/components/ProtectedRoute.tsx
git rm sinaloka-platform/src/pages/InstitutionLanding.tsx 2>/dev/null; true
git commit -m "feat(platform): replace /welcome with public landing page at root route"
```

---

### Task 12: Final Verification

- [ ] **Step 1: Run backend tests**

```bash
cd sinaloka-backend && npm run test -- --ci
```

Expected: All tests pass.

- [ ] **Step 2: Run backend build**

```bash
cd sinaloka-backend && npm run build
```

- [ ] **Step 3: Run frontend build**

```bash
cd sinaloka-platform && npm run build
```

- [ ] **Step 4: Run frontend lint**

```bash
cd sinaloka-platform && npm run lint
```

- [ ] **Step 5: Final commit (if any fixes needed)**

```bash
git add -A && git commit -m "fix: address build/test issues from landing page implementation"
```

- [ ] **Step 6: Verify .env.example updated**

Ensure `sinaloka-backend/.env.example` includes the new R2 variables:
```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
```
