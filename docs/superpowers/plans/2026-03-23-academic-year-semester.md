# Academic Year & Semester Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add academic year and semester system so tutoring institutions can organize classes by period, roll-over classes between semesters, and auto-archive old semester data.

**Architecture:** Two new Prisma models (AcademicYear, Semester) with a nullable FK on Class. One new NestJS module handles both entities. Frontend gets a new Academic Years page and semester filter on Classes page.

**Tech Stack:** NestJS, Prisma, PostgreSQL, Zod, React, TanStack Query, TailwindCSS v4

**Spec:** `docs/superpowers/specs/2026-03-23-academic-year-semester-design.md`

---

## File Structure

### Backend — New Files
| File | Responsibility |
|------|---------------|
| `sinaloka-backend/src/modules/academic-year/academic-year.module.ts` | Module registration |
| `sinaloka-backend/src/modules/academic-year/academic-year.controller.ts` | Admin CRUD endpoints for academic years + semesters |
| `sinaloka-backend/src/modules/academic-year/academic-year.service.ts` | Business logic for academic years, semesters, roll-over, archive |
| `sinaloka-backend/src/modules/academic-year/academic-year.dto.ts` | Zod schemas + type exports |
| `sinaloka-backend/src/modules/academic-year/academic-year.service.spec.ts` | Unit tests |

### Backend — Modified Files
| File | Change |
|------|--------|
| `sinaloka-backend/prisma/schema.prisma` | Add AcademicYear, Semester models, enums, FK on Class, relations on Institution |
| `sinaloka-backend/src/app.module.ts` | Import AcademicYearModule |
| `sinaloka-backend/src/modules/class/class.dto.ts` | Add `semester_id` to CreateClassSchema, ClassQuerySchema |

### Frontend — New Files
| File | Responsibility |
|------|---------------|
| `sinaloka-platform/src/types/academic-year.ts` | TypeScript interfaces |
| `sinaloka-platform/src/services/academic-year.service.ts` | API service layer |
| `sinaloka-platform/src/hooks/useAcademicYears.ts` | TanStack Query hooks |
| `sinaloka-platform/src/pages/AcademicYears/index.tsx` | Page component |
| `sinaloka-platform/src/pages/AcademicYears/useAcademicYearsPage.ts` | Page state/logic hook |
| `sinaloka-platform/src/pages/AcademicYears/components/AcademicYearTable.tsx` | Year list table |
| `sinaloka-platform/src/pages/AcademicYears/components/AcademicYearFormModal.tsx` | Create/edit year modal |
| `sinaloka-platform/src/pages/AcademicYears/components/SemesterSection.tsx` | Semester list + actions within year detail |
| `sinaloka-platform/src/pages/AcademicYears/components/SemesterFormModal.tsx` | Create/edit semester modal |
| `sinaloka-platform/src/pages/AcademicYears/components/RollOverModal.tsx` | Roll-over confirmation modal |

### Frontend — Modified Files
| File | Change |
|------|--------|
| `sinaloka-platform/src/App.tsx` | Add route for `/academic-years` |
| `sinaloka-platform/src/components/sidebar/Sidebar.tsx` | Add "Academic Years" nav item under Academics section |
| `sinaloka-platform/src/types/class.ts` | Add `semester_id` and `semester` to Class interface |
| `sinaloka-platform/src/pages/Classes/` | Add semester filter dropdown + semester field in create form |

---

## Task 1: Prisma Schema — Add Models & Migration

**Files:**
- Modify: `sinaloka-backend/prisma/schema.prisma`

- [ ] **Step 1: Add enums to schema**

Add after existing enums (near top of file, where other enums like `ClassStatus` are defined):

```prisma
enum AcademicYearStatus {
  ACTIVE
  ARCHIVED
}

enum SemesterStatus {
  ACTIVE
  ARCHIVED
}
```

- [ ] **Step 2: Add AcademicYear model**

Add after the existing models (after Subject or near Class):

```prisma
model AcademicYear {
  id             String             @id @default(uuid())
  institution_id String
  name           String
  start_date     DateTime           @db.Date
  end_date       DateTime           @db.Date
  status         AcademicYearStatus @default(ACTIVE)
  created_at     DateTime           @default(now())
  updated_at     DateTime           @updatedAt

  institution    Institution        @relation(fields: [institution_id], references: [id])
  semesters      Semester[]

  @@unique([institution_id, name])
  @@index([institution_id])
  @@map("academic_years")
}
```

- [ ] **Step 3: Add Semester model**

Add right after AcademicYear:

```prisma
model Semester {
  id               String         @id @default(uuid())
  institution_id   String
  academic_year_id String
  name             String
  start_date       DateTime       @db.Date
  end_date         DateTime       @db.Date
  status           SemesterStatus @default(ACTIVE)
  created_at       DateTime       @default(now())
  updated_at       DateTime       @updatedAt

  institution      Institution    @relation(fields: [institution_id], references: [id])
  academic_year    AcademicYear   @relation(fields: [academic_year_id], references: [id])
  classes          Class[]

  @@unique([academic_year_id, name])
  @@index([institution_id])
  @@index([academic_year_id])
  @@map("semesters")
}
```

- [ ] **Step 4: Add semester FK to Class model**

In the Class model, add these two lines (after `status` field, before relations):

```prisma
  semester_id    String?
  semester       Semester?  @relation(fields: [semester_id], references: [id])
```

- [ ] **Step 5: Add relations to Institution model**

In the Institution model's relations section, add:

```prisma
  academic_years AcademicYear[]
  semesters      Semester[]
```

- [ ] **Step 6: Generate migration**

Run:
```bash
cd sinaloka-backend && npx prisma migrate dev --name add_academic_year_semester
```
Expected: Migration created successfully, Prisma client regenerated.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(backend): add academic year and semester schema"
```

---

## Task 2: Backend DTOs

**Files:**
- Create: `sinaloka-backend/src/modules/academic-year/academic-year.dto.ts`

- [ ] **Step 1: Create DTO file with all Zod schemas**

```typescript
import { z } from 'zod';

// --- Academic Year ---

export const CreateAcademicYearSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(50),
    start_date: z.coerce.date(),
    end_date: z.coerce.date(),
  })
  .refine((d) => d.start_date < d.end_date, {
    message: 'start_date must be before end_date',
    path: ['end_date'],
  });
export type CreateAcademicYearDto = z.infer<typeof CreateAcademicYearSchema>;

export const UpdateAcademicYearSchema = z
  .object({
    name: z.string().min(1).max(50).optional(),
    start_date: z.coerce.date().optional(),
    end_date: z.coerce.date().optional(),
  })
  .refine(
    (d) => {
      if (d.start_date && d.end_date) return d.start_date < d.end_date;
      return true;
    },
    { message: 'start_date must be before end_date', path: ['end_date'] },
  );
export type UpdateAcademicYearDto = z.infer<typeof UpdateAcademicYearSchema>;

export const AcademicYearQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
});
export type AcademicYearQueryDto = z.infer<typeof AcademicYearQuerySchema>;

// --- Semester ---

export const CreateSemesterSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(50),
    start_date: z.coerce.date(),
    end_date: z.coerce.date(),
  })
  .refine((d) => d.start_date < d.end_date, {
    message: 'start_date must be before end_date',
    path: ['end_date'],
  });
export type CreateSemesterDto = z.infer<typeof CreateSemesterSchema>;

export const UpdateSemesterSchema = z
  .object({
    name: z.string().min(1).max(50).optional(),
    start_date: z.coerce.date().optional(),
    end_date: z.coerce.date().optional(),
  })
  .refine(
    (d) => {
      if (d.start_date && d.end_date) return d.start_date < d.end_date;
      return true;
    },
    { message: 'start_date must be before end_date', path: ['end_date'] },
  );
export type UpdateSemesterDto = z.infer<typeof UpdateSemesterSchema>;

// --- Roll-over ---

export const RollOverSchema = z.object({
  source_semester_id: z.string().uuid(),
  class_ids: z.array(z.string().uuid()).optional(),
});
export type RollOverDto = z.infer<typeof RollOverSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/academic-year/academic-year.dto.ts
git commit -m "feat(backend): add academic year and semester DTOs"
```

---

## Task 3: Backend Service

**Files:**
- Create: `sinaloka-backend/src/modules/academic-year/academic-year.service.ts`

- [ ] **Step 1: Create service with Academic Year CRUD**

```typescript
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type {
  CreateAcademicYearDto,
  UpdateAcademicYearDto,
  AcademicYearQueryDto,
  CreateSemesterDto,
  UpdateSemesterDto,
  RollOverDto,
} from './academic-year.dto.js';

@Injectable()
export class AcademicYearService {
  constructor(private prisma: PrismaService) {}

  // ─── Academic Year ───

  async findAllYears(tenantId: string, query: AcademicYearQueryDto) {
    const where: Record<string, unknown> = { institution_id: tenantId };
    if (query.status) where.status = query.status;

    return this.prisma.academicYear.findMany({
      where,
      include: {
        semesters: { orderBy: { start_date: 'asc' } },
      },
      orderBy: { start_date: 'desc' },
    });
  }

  async findYearById(tenantId: string, id: string) {
    const year = await this.prisma.academicYear.findFirst({
      where: { id, institution_id: tenantId },
      include: {
        semesters: {
          orderBy: { start_date: 'asc' },
          include: {
            _count: { select: { classes: true } },
          },
        },
      },
    });
    if (!year) throw new NotFoundException('Academic year not found');
    return year;
  }

  async createYear(tenantId: string, dto: CreateAcademicYearDto) {
    const existing = await this.prisma.academicYear.findUnique({
      where: {
        institution_id_name: { institution_id: tenantId, name: dto.name },
      },
    });
    if (existing) throw new ConflictException('Academic year name already exists');

    return this.prisma.academicYear.create({
      data: {
        institution_id: tenantId,
        name: dto.name,
        start_date: dto.start_date,
        end_date: dto.end_date,
      },
    });
  }

  async updateYear(tenantId: string, id: string, dto: UpdateAcademicYearDto) {
    const year = await this.prisma.academicYear.findFirst({
      where: { id, institution_id: tenantId },
    });
    if (!year) throw new NotFoundException('Academic year not found');

    if (dto.name && dto.name !== year.name) {
      const existing = await this.prisma.academicYear.findUnique({
        where: {
          institution_id_name: { institution_id: tenantId, name: dto.name },
        },
      });
      if (existing) throw new ConflictException('Academic year name already exists');
    }

    return this.prisma.academicYear.update({ where: { id }, data: dto });
  }

  async deleteYear(tenantId: string, id: string) {
    const year = await this.prisma.academicYear.findFirst({
      where: { id, institution_id: tenantId },
    });
    if (!year) throw new NotFoundException('Academic year not found');

    const semesterCount = await this.prisma.semester.count({
      where: { academic_year_id: id },
    });
    if (semesterCount > 0) {
      throw new BadRequestException(
        'Cannot delete academic year: still has semesters. Archive or delete semesters first.',
      );
    }

    return this.prisma.academicYear.delete({ where: { id } });
  }

  // ─── Semester ───

  async findSemesterById(tenantId: string, id: string) {
    const semester = await this.prisma.semester.findFirst({
      where: { id, institution_id: tenantId },
      include: {
        academic_year: true,
        classes: {
          include: {
            subject: { select: { id: true, name: true } },
            tutor: { select: { id: true, user: { select: { name: true } } } },
            schedules: true,
            _count: { select: { enrollments: true } },
          },
          orderBy: { name: 'asc' },
        },
      },
    });
    if (!semester) throw new NotFoundException('Semester not found');
    return semester;
  }

  async createSemester(tenantId: string, yearId: string, dto: CreateSemesterDto) {
    const year = await this.prisma.academicYear.findFirst({
      where: { id: yearId, institution_id: tenantId },
    });
    if (!year) throw new NotFoundException('Academic year not found');

    const existing = await this.prisma.semester.findUnique({
      where: {
        academic_year_id_name: { academic_year_id: yearId, name: dto.name },
      },
    });
    if (existing) throw new ConflictException('Semester name already exists in this academic year');

    return this.prisma.semester.create({
      data: {
        institution_id: tenantId,
        academic_year_id: yearId,
        name: dto.name,
        start_date: dto.start_date,
        end_date: dto.end_date,
      },
    });
  }

  async updateSemester(tenantId: string, id: string, dto: UpdateSemesterDto) {
    const semester = await this.prisma.semester.findFirst({
      where: { id, institution_id: tenantId },
    });
    if (!semester) throw new NotFoundException('Semester not found');

    if (dto.name && dto.name !== semester.name) {
      const existing = await this.prisma.semester.findUnique({
        where: {
          academic_year_id_name: {
            academic_year_id: semester.academic_year_id,
            name: dto.name,
          },
        },
      });
      if (existing) throw new ConflictException('Semester name already exists in this academic year');
    }

    return this.prisma.semester.update({ where: { id }, data: dto });
  }

  async deleteSemester(tenantId: string, id: string) {
    const semester = await this.prisma.semester.findFirst({
      where: { id, institution_id: tenantId },
    });
    if (!semester) throw new NotFoundException('Semester not found');

    const classCount = await this.prisma.class.count({
      where: { semester_id: id },
    });
    if (classCount > 0) {
      throw new BadRequestException(
        'Cannot delete semester: still has classes. Archive the semester instead.',
      );
    }

    return this.prisma.semester.delete({ where: { id } });
  }

  async archiveSemester(tenantId: string, id: string) {
    const semester = await this.prisma.semester.findFirst({
      where: { id, institution_id: tenantId },
      include: { academic_year: true },
    });
    if (!semester) throw new NotFoundException('Semester not found');

    return this.prisma.$transaction(async (tx) => {
      // Archive the semester
      await tx.semester.update({
        where: { id },
        data: { status: 'ARCHIVED' },
      });

      // Archive all classes in this semester
      await tx.class.updateMany({
        where: { semester_id: id, status: 'ACTIVE' },
        data: { status: 'ARCHIVED' },
      });

      // Check if all semesters in the academic year are now archived
      const activeSemesters = await tx.semester.count({
        where: {
          academic_year_id: semester.academic_year_id,
          status: 'ACTIVE',
          id: { not: id }, // exclude the one we just archived
        },
      });

      if (activeSemesters === 0) {
        await tx.academicYear.update({
          where: { id: semester.academic_year_id },
          data: { status: 'ARCHIVED' },
        });
      }

      return { archived_classes: true, year_archived: activeSemesters === 0 };
    });
  }

  // ─── Roll-over ───

  async rollOver(tenantId: string, targetSemesterId: string, dto: RollOverDto) {
    const targetSemester = await this.prisma.semester.findFirst({
      where: { id: targetSemesterId, institution_id: tenantId },
    });
    if (!targetSemester) throw new NotFoundException('Target semester not found');

    const sourceSemester = await this.prisma.semester.findFirst({
      where: { id: dto.source_semester_id, institution_id: tenantId },
    });
    if (!sourceSemester) throw new NotFoundException('Source semester not found');

    // Get classes to copy
    const whereClasses: Record<string, unknown> = { semester_id: dto.source_semester_id };
    if (dto.class_ids?.length) {
      whereClasses.id = { in: dto.class_ids };
    }

    const sourceClasses = await this.prisma.class.findMany({
      where: whereClasses,
      include: { schedules: true },
    });

    if (sourceClasses.length === 0) {
      throw new BadRequestException('No classes found in source semester to roll over');
    }

    // Check for duplicate class names in target semester
    const existingTargetClasses = await this.prisma.class.findMany({
      where: { semester_id: targetSemesterId },
      select: { name: true },
    });
    const existingNames = new Set(existingTargetClasses.map((c) => c.name));
    const classesToCopy = sourceClasses.filter((c) => !existingNames.has(c.name));

    if (classesToCopy.length === 0) {
      throw new BadRequestException('All classes already exist in target semester');
    }

    // Create new classes in target semester within a transaction
    return this.prisma.$transaction(async (tx) => {
      const createdClasses = [];

      for (const sourceClass of classesToCopy) {
        const newClass = await tx.class.create({
          data: {
            institution_id: tenantId,
            semester_id: targetSemesterId,
            name: sourceClass.name,
            subject_id: sourceClass.subject_id,
            tutor_id: sourceClass.tutor_id,
            capacity: sourceClass.capacity,
            fee: sourceClass.fee,
            package_fee: sourceClass.package_fee,
            tutor_fee: sourceClass.tutor_fee,
            tutor_fee_mode: sourceClass.tutor_fee_mode,
            tutor_fee_per_student: sourceClass.tutor_fee_per_student,
            room: sourceClass.room,
            status: 'ACTIVE',
          },
        });

        // Copy schedules
        if (sourceClass.schedules.length > 0) {
          await tx.classSchedule.createMany({
            data: sourceClass.schedules.map((s) => ({
              class_id: newClass.id,
              day: s.day,
              start_time: s.start_time,
              end_time: s.end_time,
            })),
          });
        }

        createdClasses.push(newClass);
      }

      return {
        created_count: createdClasses.length,
        skipped_count: sourceClasses.length - classesToCopy.length,
        classes: createdClasses,
      };
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/academic-year/academic-year.service.ts
git commit -m "feat(backend): add academic year service with CRUD, archive, and roll-over"
```

---

## Task 4: Backend Controller

**Files:**
- Create: `sinaloka-backend/src/modules/academic-year/academic-year.controller.ts`

- [ ] **Step 1: Create controller**

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { InstitutionId } from '../../common/decorators/institution-id.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AcademicYearService } from './academic-year.service.js';
import {
  CreateAcademicYearSchema,
  UpdateAcademicYearSchema,
  AcademicYearQuerySchema,
  CreateSemesterSchema,
  UpdateSemesterSchema,
  RollOverSchema,
} from './academic-year.dto.js';
import type {
  CreateAcademicYearDto,
  UpdateAcademicYearDto,
  AcademicYearQueryDto,
  CreateSemesterDto,
  UpdateSemesterDto,
  RollOverDto,
} from './academic-year.dto.js';

@Controller('admin/academic-years')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class AcademicYearController {
  constructor(private readonly service: AcademicYearService) {}

  // ─── Academic Year ───

  @Post()
  async createYear(
    @InstitutionId() institutionId: string,
    @Body(new ZodValidationPipe(CreateAcademicYearSchema)) dto: CreateAcademicYearDto,
  ) {
    return this.service.createYear(institutionId, dto);
  }

  @Get()
  async findAllYears(
    @InstitutionId() institutionId: string,
    @Query(new ZodValidationPipe(AcademicYearQuerySchema)) query: AcademicYearQueryDto,
  ) {
    return this.service.findAllYears(institutionId, query);
  }

  @Get(':id')
  async findYearById(
    @InstitutionId() institutionId: string,
    @Param('id') id: string,
  ) {
    return this.service.findYearById(institutionId, id);
  }

  @Patch(':id')
  async updateYear(
    @InstitutionId() institutionId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateAcademicYearSchema)) dto: UpdateAcademicYearDto,
  ) {
    return this.service.updateYear(institutionId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteYear(
    @InstitutionId() institutionId: string,
    @Param('id') id: string,
  ) {
    await this.service.deleteYear(institutionId, id);
  }

  // ─── Semester ───

  @Post(':yearId/semesters')
  async createSemester(
    @InstitutionId() institutionId: string,
    @Param('yearId') yearId: string,
    @Body(new ZodValidationPipe(CreateSemesterSchema)) dto: CreateSemesterDto,
  ) {
    return this.service.createSemester(institutionId, yearId, dto);
  }
}

@Controller('admin/semesters')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class SemesterController {
  constructor(private readonly service: AcademicYearService) {}

  @Get(':id')
  async findSemesterById(
    @InstitutionId() institutionId: string,
    @Param('id') id: string,
  ) {
    return this.service.findSemesterById(institutionId, id);
  }

  @Patch(':id')
  async updateSemester(
    @InstitutionId() institutionId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateSemesterSchema)) dto: UpdateSemesterDto,
  ) {
    return this.service.updateSemester(institutionId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSemester(
    @InstitutionId() institutionId: string,
    @Param('id') id: string,
  ) {
    await this.service.deleteSemester(institutionId, id);
  }

  @Patch(':id/archive')
  async archiveSemester(
    @InstitutionId() institutionId: string,
    @Param('id') id: string,
  ) {
    return this.service.archiveSemester(institutionId, id);
  }

  @Post(':id/roll-over')
  async rollOver(
    @InstitutionId() institutionId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RollOverSchema)) dto: RollOverDto,
  ) {
    return this.service.rollOver(institutionId, id, dto);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/academic-year/academic-year.controller.ts
git commit -m "feat(backend): add academic year and semester controllers"
```

---

## Task 5: Backend Module Registration

**Files:**
- Create: `sinaloka-backend/src/modules/academic-year/academic-year.module.ts`
- Modify: `sinaloka-backend/src/app.module.ts`

- [ ] **Step 1: Create module file**

```typescript
import { Module } from '@nestjs/common';
import { AcademicYearController, SemesterController } from './academic-year.controller.js';
import { AcademicYearService } from './academic-year.service.js';

@Module({
  controllers: [AcademicYearController, SemesterController],
  providers: [AcademicYearService],
  exports: [AcademicYearService],
})
export class AcademicYearModule {}
```

- [ ] **Step 2: Register in app.module.ts**

Add import at top:
```typescript
import { AcademicYearModule } from './modules/academic-year/academic-year.module.js';
```

Add `AcademicYearModule` to the `imports` array.

- [ ] **Step 3: Verify build**

Run:
```bash
cd sinaloka-backend && npm run build
```
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/modules/academic-year/academic-year.module.ts src/app.module.ts
git commit -m "feat(backend): register academic year module"
```

---

## Task 6: Modify Class Module — Add semester_id Support

**Files:**
- Modify: `sinaloka-backend/src/modules/class/class.dto.ts`
- Modify: `sinaloka-backend/src/modules/class/class.service.ts` (add semester_id to create and query)

- [ ] **Step 1: Update CreateClassSchema**

In `class.dto.ts`, add to the `CreateClassSchema` object (after `status` field):
```typescript
    semester_id: z.string().uuid().optional().nullable(),
```

- [ ] **Step 2: Update UpdateClassSchema**

In `class.dto.ts`, add to `UpdateClassSchema`:
```typescript
  semester_id: z.string().uuid().optional().nullable(),
```

- [ ] **Step 3: Update ClassQuerySchema**

In `class.dto.ts`, add to `ClassQuerySchema` (use `z.string()` not `z.string().uuid()` to support the special value `'none'`):
```typescript
  semester_id: z.string().optional(),
```

- [ ] **Step 4: Update class service findAll**

In `class.service.ts`, in the `findAll` method, add semester_id to the where clause construction (where other filters like `subject_id`, `tutor_id` are added):
```typescript
    if (query.semester_id === 'none') {
      where.semester_id = null;
    } else if (query.semester_id) {
      where.semester_id = query.semester_id;
    }
```

- [ ] **Step 5: Update class service create**

In `class.service.ts`, in the `create` method's `tx.class.create({ data: { ... } })` block, add `semester_id` alongside the other fields:
```typescript
    semester_id: dto.semester_id ?? null,
```

- [ ] **Step 5b: Update class service update**

In `class.service.ts`, in the `update` method, ensure `semester_id` is included in the destructuring and conditional spread so it gets passed to Prisma. Add it to the data object alongside other optional fields:
```typescript
    // In the destructuring:
    const { semester_id, ...otherFields } = dto;
    // In the update data spread:
    ...(semester_id !== undefined && { semester_id }),
```

- [ ] **Step 6: Update class service findAll include**

In the `findAll` method's Prisma query, add `semester` to the include:
```typescript
    include: {
      // ...existing includes
      semester: { select: { id: true, name: true, academic_year: { select: { id: true, name: true } } } },
    }
```

- [ ] **Step 7: Verify build**

Run:
```bash
cd sinaloka-backend && npm run build
```
Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/modules/class/class.dto.ts src/modules/class/class.service.ts
git commit -m "feat(backend): add semester_id support to class module"
```

---

## Task 7: Backend Unit Tests

**Files:**
- Create: `sinaloka-backend/src/modules/academic-year/academic-year.service.spec.ts`

- [ ] **Step 1: Create test file**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

jest.mock('../../common/prisma/prisma.service', () => {
  return { PrismaService: jest.fn() };
});

import { AcademicYearService } from './academic-year.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

describe('AcademicYearService', () => {
  let service: AcademicYearService;
  let prisma: {
    academicYear: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    semester: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    class: {
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      updateMany: jest.Mock;
    };
    classSchedule: {
      createMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const tenantId = 'inst-1';
  const mockYear = {
    id: 'year-1',
    institution_id: tenantId,
    name: '2025/2026',
    start_date: new Date('2025-07-01'),
    end_date: new Date('2026-06-30'),
    status: 'ACTIVE',
  };
  const mockSemester = {
    id: 'sem-1',
    institution_id: tenantId,
    academic_year_id: 'year-1',
    name: 'Ganjil',
    start_date: new Date('2025-07-01'),
    end_date: new Date('2025-12-31'),
    status: 'ACTIVE',
  };

  beforeEach(async () => {
    prisma = {
      academicYear: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      semester: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      class: {
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      classSchedule: {
        createMany: jest.fn(),
      },
      $transaction: jest.fn((fn) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcademicYearService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(AcademicYearService);
  });

  describe('createYear', () => {
    it('should create an academic year', async () => {
      prisma.academicYear.findUnique.mockResolvedValue(null);
      prisma.academicYear.create.mockResolvedValue(mockYear);

      const result = await service.createYear(tenantId, {
        name: '2025/2026',
        start_date: new Date('2025-07-01'),
        end_date: new Date('2026-06-30'),
      });

      expect(result).toEqual(mockYear);
      expect(prisma.academicYear.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: '2025/2026', institution_id: tenantId }),
      });
    });

    it('should throw ConflictException if name exists', async () => {
      prisma.academicYear.findUnique.mockResolvedValue(mockYear);

      await expect(
        service.createYear(tenantId, {
          name: '2025/2026',
          start_date: new Date('2025-07-01'),
          end_date: new Date('2026-06-30'),
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteYear', () => {
    it('should throw NotFoundException if year not found', async () => {
      prisma.academicYear.findFirst.mockResolvedValue(null);
      await expect(service.deleteYear(tenantId, 'nope')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if year has semesters', async () => {
      prisma.academicYear.findFirst.mockResolvedValue(mockYear);
      prisma.semester.count.mockResolvedValue(2);
      await expect(service.deleteYear(tenantId, 'year-1')).rejects.toThrow(BadRequestException);
    });

    it('should delete if year has no semesters', async () => {
      prisma.academicYear.findFirst.mockResolvedValue(mockYear);
      prisma.semester.count.mockResolvedValue(0);
      prisma.academicYear.delete.mockResolvedValue(mockYear);
      await service.deleteYear(tenantId, 'year-1');
      expect(prisma.academicYear.delete).toHaveBeenCalledWith({ where: { id: 'year-1' } });
    });
  });

  describe('archiveSemester', () => {
    it('should archive semester and its classes', async () => {
      prisma.semester.findFirst.mockResolvedValue({
        ...mockSemester,
        academic_year: mockYear,
      });
      prisma.semester.update.mockResolvedValue({ ...mockSemester, status: 'ARCHIVED' });
      prisma.class.updateMany.mockResolvedValue({ count: 3 });
      prisma.semester.count.mockResolvedValue(0); // no more active semesters
      prisma.academicYear.update.mockResolvedValue({ ...mockYear, status: 'ARCHIVED' });

      const result = await service.archiveSemester(tenantId, 'sem-1');
      expect(result).toEqual({ archived_classes: true, year_archived: true });
      expect(prisma.class.updateMany).toHaveBeenCalled();
      expect(prisma.academicYear.update).toHaveBeenCalled(); // auto-archive year
    });

    it('should not archive year if other semesters are still active', async () => {
      prisma.semester.findFirst.mockResolvedValue({
        ...mockSemester,
        academic_year: mockYear,
      });
      prisma.semester.update.mockResolvedValue({ ...mockSemester, status: 'ARCHIVED' });
      prisma.class.updateMany.mockResolvedValue({ count: 1 });
      prisma.semester.count.mockResolvedValue(1); // 1 active semester remains

      const result = await service.archiveSemester(tenantId, 'sem-1');
      expect(result).toEqual({ archived_classes: true, year_archived: false });
      expect(prisma.academicYear.update).not.toHaveBeenCalled();
    });
  });

  describe('createSemester', () => {
    it('should create a semester', async () => {
      prisma.academicYear.findFirst.mockResolvedValue(mockYear);
      prisma.semester.findUnique.mockResolvedValue(null);
      prisma.semester.create.mockResolvedValue(mockSemester);

      const result = await service.createSemester(tenantId, 'year-1', {
        name: 'Ganjil',
        start_date: new Date('2025-07-01'),
        end_date: new Date('2025-12-31'),
      });
      expect(result).toEqual(mockSemester);
    });

    it('should throw NotFoundException if year not found', async () => {
      prisma.academicYear.findFirst.mockResolvedValue(null);
      await expect(
        service.createSemester(tenantId, 'nope', {
          name: 'Ganjil',
          start_date: new Date('2025-07-01'),
          end_date: new Date('2025-12-31'),
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if name exists', async () => {
      prisma.academicYear.findFirst.mockResolvedValue(mockYear);
      prisma.semester.findUnique.mockResolvedValue(mockSemester);
      await expect(
        service.createSemester(tenantId, 'year-1', {
          name: 'Ganjil',
          start_date: new Date('2025-07-01'),
          end_date: new Date('2025-12-31'),
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateYear', () => {
    it('should update an academic year', async () => {
      prisma.academicYear.findFirst.mockResolvedValue(mockYear);
      prisma.academicYear.update.mockResolvedValue({ ...mockYear, name: '2026/2027' });
      const result = await service.updateYear(tenantId, 'year-1', { name: '2026/2027' });
      expect(result.name).toBe('2026/2027');
    });

    it('should throw ConflictException if new name already exists', async () => {
      prisma.academicYear.findFirst.mockResolvedValue(mockYear);
      prisma.academicYear.findUnique.mockResolvedValue({ id: 'year-2', name: '2024/2025' });
      await expect(
        service.updateYear(tenantId, 'year-1', { name: '2024/2025' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('rollOver', () => {
    it('should copy classes from source to target semester', async () => {
      const sourceClass = {
        id: 'class-1',
        name: 'Math 101',
        subject_id: 'sub-1',
        tutor_id: 'tutor-1',
        capacity: 20,
        fee: 500000,
        package_fee: null,
        tutor_fee: 200000,
        tutor_fee_mode: 'FIXED_PER_SESSION',
        tutor_fee_per_student: null,
        room: 'A1',
        schedules: [{ day: 'Monday', start_time: '14:00', end_time: '15:30' }],
      };

      prisma.semester.findFirst
        .mockResolvedValueOnce({ id: 'sem-2', institution_id: tenantId }) // target
        .mockResolvedValueOnce({ id: 'sem-1', institution_id: tenantId }); // source
      prisma.class.findMany
        .mockResolvedValueOnce([sourceClass]) // source classes
        .mockResolvedValueOnce([]); // existing target classes (none)
      prisma.class.create.mockResolvedValue({ ...sourceClass, id: 'class-new', semester_id: 'sem-2' });
      prisma.classSchedule.createMany.mockResolvedValue({ count: 1 });

      const result = await service.rollOver(tenantId, 'sem-2', {
        source_semester_id: 'sem-1',
      });

      expect(result.created_count).toBe(1);
      expect(result.skipped_count).toBe(0);
      expect(prisma.class.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          semester_id: 'sem-2',
          name: 'Math 101',
        }),
      });
      expect(prisma.classSchedule.createMany).toHaveBeenCalled();
    });

    it('should skip classes that already exist in target semester', async () => {
      const sourceClass = {
        id: 'class-1',
        name: 'Math 101',
        subject_id: 'sub-1',
        tutor_id: 'tutor-1',
        capacity: 20,
        fee: 500000,
        package_fee: null,
        tutor_fee: 200000,
        tutor_fee_mode: 'FIXED_PER_SESSION',
        tutor_fee_per_student: null,
        room: 'A1',
        schedules: [],
      };

      prisma.semester.findFirst
        .mockResolvedValueOnce({ id: 'sem-2', institution_id: tenantId })
        .mockResolvedValueOnce({ id: 'sem-1', institution_id: tenantId });
      prisma.class.findMany
        .mockResolvedValueOnce([sourceClass]) // source classes
        .mockResolvedValueOnce([{ name: 'Math 101' }]); // already exists in target

      await expect(
        service.rollOver(tenantId, 'sem-2', { source_semester_id: 'sem-1' }),
      ).rejects.toThrow(BadRequestException); // all classes already exist
    });

    it('should throw if no classes found in source', async () => {
      prisma.semester.findFirst
        .mockResolvedValueOnce({ id: 'sem-2', institution_id: tenantId })
        .mockResolvedValueOnce({ id: 'sem-1', institution_id: tenantId });
      prisma.class.findMany.mockResolvedValue([]);

      await expect(
        service.rollOver(tenantId, 'sem-2', { source_semester_id: 'sem-1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
```

- [ ] **Step 2: Run tests**

Run:
```bash
cd sinaloka-backend && npm run test -- --testPathPattern=academic-year
```
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/modules/academic-year/academic-year.service.spec.ts
git commit -m "test(backend): add academic year service unit tests"
```

---

## Task 8: Frontend Types & Service Layer

**Files:**
- Create: `sinaloka-platform/src/types/academic-year.ts`
- Create: `sinaloka-platform/src/services/academic-year.service.ts`
- Create: `sinaloka-platform/src/hooks/useAcademicYears.ts`

- [ ] **Step 1: Create types**

```typescript
export interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'ACTIVE' | 'ARCHIVED';
  semesters: Semester[];
  created_at: string;
  updated_at: string;
}

export interface Semester {
  id: string;
  academic_year_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'ACTIVE' | 'ARCHIVED';
  _count?: { classes: number };
  created_at: string;
  updated_at: string;
}

export interface SemesterDetail extends Semester {
  academic_year: AcademicYear;
  classes: SemesterClass[];
}

export interface SemesterClass {
  id: string;
  name: string;
  subject: { id: string; name: string };
  tutor: { id: string; user: { name: string } };
  capacity: number;
  fee: number;
  status: 'ACTIVE' | 'ARCHIVED';
  _count: { enrollments: number };
}

export interface CreateAcademicYearDto {
  name: string;
  start_date: string;
  end_date: string;
}

export type UpdateAcademicYearDto = Partial<CreateAcademicYearDto>;

export interface CreateSemesterDto {
  name: string;
  start_date: string;
  end_date: string;
}

export type UpdateSemesterDto = Partial<CreateSemesterDto>;

export interface RollOverDto {
  source_semester_id: string;
  class_ids?: string[];
}

export interface RollOverResult {
  created_count: number;
  skipped_count: number;
}
```

- [ ] **Step 2: Create service**

```typescript
import api from '@/src/lib/api';
import type {
  AcademicYear,
  Semester,
  SemesterDetail,
  CreateAcademicYearDto,
  UpdateAcademicYearDto,
  CreateSemesterDto,
  UpdateSemesterDto,
  RollOverDto,
  RollOverResult,
} from '@/src/types/academic-year';

export const academicYearService = {
  // Academic Years
  getAll: (params?: { status?: string }) =>
    api.get<AcademicYear[]>('/api/admin/academic-years', { params }).then((r) => r.data),
  getById: (id: string) =>
    api.get<AcademicYear>(`/api/admin/academic-years/${id}`).then((r) => r.data),
  create: (data: CreateAcademicYearDto) =>
    api.post<AcademicYear>('/api/admin/academic-years', data).then((r) => r.data),
  update: ({ id, data }: { id: string; data: UpdateAcademicYearDto }) =>
    api.patch<AcademicYear>(`/api/admin/academic-years/${id}`, data).then((r) => r.data),
  remove: (id: string) =>
    api.delete(`/api/admin/academic-years/${id}`),

  // Semesters
  getSemester: (id: string) =>
    api.get<SemesterDetail>(`/api/admin/semesters/${id}`).then((r) => r.data),
  createSemester: ({ yearId, data }: { yearId: string; data: CreateSemesterDto }) =>
    api.post<Semester>(`/api/admin/academic-years/${yearId}/semesters`, data).then((r) => r.data),
  updateSemester: ({ id, data }: { id: string; data: UpdateSemesterDto }) =>
    api.patch<Semester>(`/api/admin/semesters/${id}`, data).then((r) => r.data),
  removeSemester: (id: string) =>
    api.delete(`/api/admin/semesters/${id}`),
  archiveSemester: (id: string) =>
    api.patch(`/api/admin/semesters/${id}/archive`).then((r) => r.data),
  rollOver: ({ id, data }: { id: string; data: RollOverDto }) =>
    api.post<RollOverResult>(`/api/admin/semesters/${id}/roll-over`, data).then((r) => r.data),
};
```

- [ ] **Step 3: Create hooks**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academicYearService } from '@/src/services/academic-year.service';

export function useAcademicYears(params?: { status?: string }) {
  return useQuery({
    queryKey: ['academic-years', params],
    queryFn: () => academicYearService.getAll(params),
  });
}

export function useAcademicYear(id: string | null) {
  return useQuery({
    queryKey: ['academic-years', id],
    queryFn: () => academicYearService.getById(id!),
    enabled: !!id,
  });
}

export function useSemester(id: string | null) {
  return useQuery({
    queryKey: ['semesters', id],
    queryFn: () => academicYearService.getSemester(id!),
    enabled: !!id,
  });
}

export function useCreateAcademicYear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: academicYearService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academic-years'] }),
  });
}

export function useUpdateAcademicYear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: academicYearService.update,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academic-years'] }),
  });
}

export function useDeleteAcademicYear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: academicYearService.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academic-years'] }),
  });
}

export function useCreateSemester() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: academicYearService.createSemester,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academic-years'] }),
  });
}

export function useUpdateSemester() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: academicYearService.updateSemester,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academic-years'] }),
  });
}

export function useDeleteSemester() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: academicYearService.removeSemester,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academic-years'] }),
  });
}

export function useArchiveSemester() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: academicYearService.archiveSemester,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academic-years'] }),
  });
}

export function useRollOver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: academicYearService.rollOver,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academic-years'] });
      qc.invalidateQueries({ queryKey: ['classes'] });
    },
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/types/academic-year.ts src/services/academic-year.service.ts src/hooks/useAcademicYears.ts
git commit -m "feat(platform): add academic year types, service, and hooks"
```

---

## Task 9: Frontend Academic Years Page

**Files:**
- Create: `sinaloka-platform/src/pages/AcademicYears/index.tsx`
- Create: `sinaloka-platform/src/pages/AcademicYears/useAcademicYearsPage.ts`
- Create: `sinaloka-platform/src/pages/AcademicYears/components/AcademicYearTable.tsx`
- Create: `sinaloka-platform/src/pages/AcademicYears/components/AcademicYearFormModal.tsx`
- Create: `sinaloka-platform/src/pages/AcademicYears/components/SemesterSection.tsx`
- Create: `sinaloka-platform/src/pages/AcademicYears/components/SemesterFormModal.tsx`
- Create: `sinaloka-platform/src/pages/AcademicYears/components/RollOverModal.tsx`
- Modify: `sinaloka-platform/src/App.tsx`
- Modify: `sinaloka-platform/src/components/sidebar/Sidebar.tsx`

This is the largest task. The implementer should follow existing page patterns (Classes page as reference). Key components:

- [ ] **Step 1: Create `useAcademicYearsPage.ts`**

Page hook managing: year list query, selected year (detail view), modals state (create/edit year, create/edit semester, archive confirm, roll-over), mutation handlers with toast notifications. Follow the same pattern as `useClassesPage.ts`.

- [ ] **Step 2: Create `AcademicYearTable.tsx`**

Table displaying: name, start date, end date, status badge, semester count, action menu (edit, delete). Click row → expand/select to show detail with semesters. Follow existing table patterns (DataTable component if exists, or manual table like ClassTable).

- [ ] **Step 3: Create `AcademicYearFormModal.tsx`**

Modal with fields: name (text input), start_date (date picker), end_date (date picker). Used for both create and edit (pre-populated when editing). Validate end > start.

- [ ] **Step 4: Create `SemesterSection.tsx`**

Shown when an academic year is selected/expanded. Lists semesters with: name, date range, status badge, class count. Action buttons: edit, archive (with confirmation), delete (only if no classes). "Add Semester" button. "Roll-over" button on each semester.

- [ ] **Step 5: Create `SemesterFormModal.tsx`**

Modal with: name (text, e.g. "Ganjil"), start_date, end_date. For create and edit.

- [ ] **Step 6: Create `RollOverModal.tsx`**

Modal shown when clicking "Roll-over" on a target semester. Steps:
1. Select source semester (dropdown of all semesters except the target)
2. Show preview of classes that will be copied (fetched from `GET /api/admin/semesters/:sourceId`)
3. Optional: checkboxes to select specific classes
4. Confirm button → calls `useRollOver` mutation
5. On success: toast + redirect/refresh

- [ ] **Step 7: Create `index.tsx` page component**

Thin wrapper: calls `useAcademicYearsPage()`, renders PageHeader with "Academic Years" title and "Create" button, then AcademicYearTable, then SemesterSection (if year selected), then all modals.

- [ ] **Step 8: Add route in App.tsx**

Add import and route:
```tsx
import AcademicYears from './pages/AcademicYears/index';
// In Routes:
<Route path="/academic-years" element={<AcademicYears />} />
```

- [ ] **Step 9: Add sidebar item**

In `Sidebar.tsx`, add to the "Academics" section (after Classes), update `itemCount` from 3 to 4:
```tsx
<SidebarItem
  icon={CalendarRange}  // from lucide-react
  label={t('sidebar.academicYears', 'Academic Years')}
  href="/academic-years"
  active={location.pathname === '/academic-years'}
/>
```

- [ ] **Step 10: Add active semester info badge**

In `Sidebar.tsx` (or a shared layout component), show a small informational badge displaying the current active semester name (e.g. "2025/2026 — Ganjil"). Fetch active academic years via `useAcademicYears({ status: 'ACTIVE' })`, find the first active semester, and display it as a subtle text/badge near the top of the sidebar. This is informational only — not a context switch.

- [ ] **Step 11: Verify build**

Run:
```bash
cd sinaloka-platform && npm run build
```
Expected: Build succeeds.

- [ ] **Step 12: Commit**

```bash
git add src/pages/AcademicYears/ src/App.tsx src/components/sidebar/Sidebar.tsx
git commit -m "feat(platform): add academic years page with semester management"
```

---

## Task 10: Frontend — Add Semester Filter to Classes Page

**Files:**
- Modify: `sinaloka-platform/src/types/class.ts`
- Modify: Classes page files (filters component, page hook)

- [ ] **Step 1: Update Class type**

In `class.ts`, add to `Class` interface:
```typescript
  semester_id: string | null;
  semester?: { id: string; name: string; academic_year: { id: string; name: string } } | null;
```

Add to `CreateClassDto`:
```typescript
  semester_id?: string | null;
```

Add to `ClassQueryParams`:
```typescript
  semester_id?: string;
```

- [ ] **Step 2: Add semester filter to Classes page**

In the Classes page filters component, add a dropdown that:
- Fetches semesters via `useAcademicYears()` (flatten semesters from all active years)
- Options: "All Semesters", "No Semester", then each semester as `"{yearName} - {semesterName}"`
- Selected value updates `semester_id` query param

- [ ] **Step 3: Add semester_id to class create form**

In the class form modal, add a semester dropdown (optional field):
- Fetch active academic years + their semesters
- Display as grouped options: year name → semester names
- Default: first active semester (if any)

- [ ] **Step 4: Verify build**

Run:
```bash
cd sinaloka-platform && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/types/class.ts src/pages/Classes/
git commit -m "feat(platform): add semester filter and field to classes page"
```

---

## Task 11: Full Build & Lint Verification

- [ ] **Step 1: Backend lint + test + build**

```bash
cd sinaloka-backend && npm run lint && npm run test -- --ci && npm run build
```
Expected: All pass.

- [ ] **Step 2: Frontend lint + build**

```bash
cd sinaloka-platform && npm run lint && npm run build
```
Expected: All pass.

- [ ] **Step 3: Manual smoke test (if dev servers available)**

1. Start backend: `npm run start:dev`
2. Start platform: `npm run dev`
3. Create academic year → create 2 semesters
4. Create class with semester → verify shows in class list with semester label
5. Roll-over classes to new semester → verify copies
6. Archive semester → verify classes archived
7. Filter classes by semester → verify filter works
