# Sinaloka Parent Module Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a parent module to sinaloka-backend that allows parents to view their children's attendance, sessions, payments, and enrollments via invite-based registration.

**Architecture:** New `Parent`, `ParentStudent`, and `ParentInvite` Prisma models + a `parent` NestJS module with two controllers (parent-facing read-only routes and admin management routes). Registration endpoint added to the existing auth controller. TenantInterceptor updated to support the new PARENT role.

**Tech Stack:** NestJS 11, Prisma 7, Zod, bcrypt, Jest + supertest

---

## File Structure

### New Files
- `sinaloka-backend/src/modules/parent/parent.module.ts` — NestJS module registration
- `sinaloka-backend/src/modules/parent/parent.dto.ts` — Zod schemas for all DTOs
- `sinaloka-backend/src/modules/parent/parent-invite.service.ts` — Invite creation, token validation, parent registration
- `sinaloka-backend/src/modules/parent/parent.service.ts` — Read-only queries: children list, attendance, sessions, payments, enrollments
- `sinaloka-backend/src/modules/parent/parent-admin.controller.ts` — Admin routes for managing parents/invites
- `sinaloka-backend/src/modules/parent/parent.controller.ts` — Parent-facing read-only routes
- `sinaloka-backend/src/modules/parent/guards/parent-student.guard.ts` — Authorization guard for child access
- `sinaloka-backend/src/modules/parent/parent-invite.service.spec.ts` — Unit tests for invite service
- `sinaloka-backend/src/modules/parent/parent.service.spec.ts` — Unit tests for parent service
- `sinaloka-backend/src/modules/parent/parent.controller.spec.ts` — Integration tests for parent routes

### Modified Files
- `sinaloka-backend/prisma/schema.prisma` — Add PARENT role, Parent, ParentStudent, ParentInvite models + relations
- `sinaloka-backend/src/common/interceptors/tenant.interceptor.ts` — Add PARENT role to tenant scoping
- `sinaloka-backend/src/modules/auth/auth.controller.ts` — Add `POST /auth/register/parent` route
- `sinaloka-backend/src/modules/auth/auth.dto.ts` — Add `ParentRegisterSchema`
- `sinaloka-backend/src/modules/auth/auth.module.ts` — Import ParentModule (via forwardRef) for ParentInviteService
- `sinaloka-backend/src/app.module.ts` — Register ParentModule

---

## Chunk 1: Data Model & Infrastructure

### Task 1: Prisma Schema — Add PARENT role and new models

**Files:**
- Modify: `sinaloka-backend/prisma/schema.prisma`

- [ ] **Step 1: Add PARENT to Role enum**

In `prisma/schema.prisma`, add `PARENT` to the `Role` enum:

```prisma
enum Role {
  SUPER_ADMIN
  ADMIN
  TUTOR
  PARENT
}
```

- [ ] **Step 2: Add Parent model**

After the `Tutor` model, add:

```prisma
model Parent {
  id              String          @id @default(uuid())
  user_id         String          @unique
  institution_id  String
  created_at      DateTime        @default(now())
  updated_at      DateTime        @updatedAt

  user            User            @relation(fields: [user_id], references: [id])
  institution     Institution     @relation(fields: [institution_id], references: [id])
  children        ParentStudent[]

  @@map("parents")
}

model ParentStudent {
  id          String   @id @default(uuid())
  parent_id   String
  student_id  String
  created_at  DateTime @default(now())

  parent      Parent   @relation(fields: [parent_id], references: [id], onDelete: Cascade)
  student     Student  @relation(fields: [student_id], references: [id], onDelete: Cascade)

  @@unique([parent_id, student_id])
  @@map("parent_students")
}

model ParentInvite {
  id              String    @id @default(uuid())
  institution_id  String
  email           String
  token           String    @unique
  student_ids     String[]
  used_at         DateTime?
  expires_at      DateTime
  created_at      DateTime  @default(now())

  institution     Institution @relation(fields: [institution_id], references: [id])

  @@map("parent_invites")
}
```

- [ ] **Step 3: Add reverse relations to existing models**

Add to the `User` model (after the existing `tutor Tutor?` line):

```prisma
  parent          Parent?
```

Add to the `Institution` model (after `expenses`):

```prisma
  parents         Parent[]
  parent_invites  ParentInvite[]
```

Add to the `Student` model (after `payments`):

```prisma
  parent_links    ParentStudent[]
```

- [ ] **Step 4: Generate migration and Prisma client**

Run:
```bash
cd sinaloka-backend && npx prisma migrate dev --name add_parent_models
```
Expected: Migration created and applied successfully.

Then:
```bash
npm run prisma:generate
```
Expected: Prisma client regenerated with new models.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ generated/
git commit -m "feat(schema): add Parent, ParentStudent, ParentInvite models and PARENT role"
```

---

### Task 2: Update TenantInterceptor to support PARENT role

**Files:**
- Modify: `sinaloka-backend/src/common/interceptors/tenant.interceptor.ts`

- [ ] **Step 1: Add PARENT to the role check**

In `tenant.interceptor.ts`, change line 33 from:

```typescript
    } else if (
      user.role === Role.ADMIN ||
      user.role === Role.TUTOR
    ) {
```

to:

```typescript
    } else if (
      user.role === Role.ADMIN ||
      user.role === Role.TUTOR ||
      user.role === Role.PARENT
    ) {
```

- [ ] **Step 2: Commit**

```bash
git add src/common/interceptors/tenant.interceptor.ts
git commit -m "feat(auth): add PARENT role to TenantInterceptor for institution scoping"
```

---

### Task 3: Parent DTOs

**Files:**
- Create: `sinaloka-backend/src/modules/parent/parent.dto.ts`

- [ ] **Step 1: Create DTOs file**

```typescript
import { z } from 'zod';

// --- Admin DTOs ---

export const CreateParentInviteSchema = z.object({
  email: z.string().email(),
  student_ids: z.array(z.string().uuid()).min(1, 'At least one student is required'),
});
export type CreateParentInviteDto = z.infer<typeof CreateParentInviteSchema>;

export const LinkStudentsSchema = z.object({
  student_ids: z.array(z.string().uuid()).min(1, 'At least one student is required'),
});
export type LinkStudentsDto = z.infer<typeof LinkStudentsSchema>;

export const ParentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sort_by: z.enum(['name', 'created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});
export type ParentQueryDto = z.infer<typeof ParentQuerySchema>;

// --- Auth DTOs ---

export const ParentRegisterSchema = z.object({
  token: z.string().min(1, 'Invite token is required'),
  name: z.string().min(1, 'Name is required').max(255),
  password: z.string().min(8).max(128),
});
export type ParentRegisterDto = z.infer<typeof ParentRegisterSchema>;

// --- Parent-facing DTOs ---

export const ChildAttendanceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  date_from: z.string().date().optional(),
  date_to: z.string().date().optional(),
  class_id: z.string().uuid().optional(),
});
export type ChildAttendanceQueryDto = z.infer<typeof ChildAttendanceQuerySchema>;

export const ChildSessionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']).optional(),
  date_from: z.string().date().optional(),
  date_to: z.string().date().optional(),
});
export type ChildSessionsQueryDto = z.infer<typeof ChildSessionsQuerySchema>;

export const ChildPaymentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PAID', 'PENDING', 'OVERDUE']).optional(),
});
export type ChildPaymentsQueryDto = z.infer<typeof ChildPaymentsQuerySchema>;
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/parent/parent.dto.ts
git commit -m "feat(parent): add Zod DTO schemas for parent module"
```

---

## Chunk 2: Invite Service & Registration

### Task 4: ParentInviteService — invite creation and parent registration

**Files:**
- Create: `sinaloka-backend/src/modules/parent/parent-invite.service.ts`
- Test: `sinaloka-backend/src/modules/parent/parent-invite.service.spec.ts`

- [ ] **Step 1: Write failing tests for invite creation**

Create `parent-invite.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';

jest.mock('../../common/prisma/prisma.service', () => {
  return { PrismaService: jest.fn() };
});

jest.mock('bcrypt', () => ({
  hash: jest.fn(() => Promise.resolve('hashed-password')),
}));

import { ParentInviteService } from './parent-invite.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

describe('ParentInviteService', () => {
  let service: ParentInviteService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      student: { findMany: jest.fn(), count: jest.fn() },
      parentInvite: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      user: { findUnique: jest.fn(), create: jest.fn() },
      parent: { create: jest.fn() },
      parentStudent: { createMany: jest.fn() },
      $transaction: jest.fn((fn: any) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParentInviteService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ParentInviteService>(ParentInviteService);
  });

  describe('createInvite', () => {
    it('should create an invite with valid student IDs', async () => {
      prisma.student.count.mockResolvedValue(2);
      prisma.parentInvite.create.mockResolvedValue({
        id: 'invite-1',
        token: 'mock-token',
        email: 'parent@test.com',
        student_ids: ['s1', 's2'],
        expires_at: expect.any(Date),
      });

      const result = await service.createInvite('inst-1', {
        email: 'parent@test.com',
        student_ids: ['s1', 's2'],
      });

      expect(result).toHaveProperty('token');
      expect(prisma.student.count).toHaveBeenCalledWith({
        where: { id: { in: ['s1', 's2'] }, institution_id: 'inst-1' },
      });
    });

    it('should throw if student IDs do not belong to institution', async () => {
      prisma.student.count.mockResolvedValue(1); // only 1 of 2 found

      await expect(
        service.createInvite('inst-1', {
          email: 'parent@test.com',
          student_ids: ['s1', 's2'],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('registerParent', () => {
    const validInvite = {
      id: 'invite-1',
      institution_id: 'inst-1',
      email: 'parent@test.com',
      token: 'valid-token',
      student_ids: ['s1', 's2'],
      used_at: null,
      expires_at: new Date(Date.now() + 86400000),
    };

    it('should register a parent from a valid invite', async () => {
      prisma.parentInvite.findUnique.mockResolvedValue(validInvite);
      prisma.user.findUnique.mockResolvedValue(null); // email not taken
      prisma.student.findMany.mockResolvedValue([]); // no extra matches
      const mockUser = { id: 'user-1' };
      const mockParent = { id: 'parent-1' };
      prisma.user.create.mockResolvedValue(mockUser);
      prisma.parent.create.mockResolvedValue(mockParent);
      prisma.parentStudent.createMany.mockResolvedValue({ count: 2 });
      prisma.parentInvite.update.mockResolvedValue({});

      const result = await service.registerParent({
        token: 'valid-token',
        name: 'Parent User',
        password: 'securepass123',
      });

      expect(result.user.id).toBe('user-1');
      expect(result.parent.id).toBe('parent-1');
    });

    it('should throw if invite token is invalid', async () => {
      prisma.parentInvite.findUnique.mockResolvedValue(null);

      await expect(
        service.registerParent({
          token: 'bad-token',
          name: 'Parent',
          password: 'securepass123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if invite is expired', async () => {
      prisma.parentInvite.findUnique.mockResolvedValue({
        ...validInvite,
        expires_at: new Date(Date.now() - 1000), // expired
      });

      await expect(
        service.registerParent({
          token: 'valid-token',
          name: 'Parent',
          password: 'securepass123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if invite is already used', async () => {
      prisma.parentInvite.findUnique.mockResolvedValue({
        ...validInvite,
        used_at: new Date(),
      });

      await expect(
        service.registerParent({
          token: 'valid-token',
          name: 'Parent',
          password: 'securepass123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd sinaloka-backend && npm test -- --testPathPattern=parent-invite.service.spec`
Expected: FAIL — module not found

- [ ] **Step 3: Implement ParentInviteService**

Create `parent-invite.service.ts`:

```typescript
import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import {
  CreateParentInviteDto,
  ParentRegisterDto,
} from './parent.dto.js';

@Injectable()
export class ParentInviteService {
  constructor(private readonly prisma: PrismaService) {}

  async createInvite(institutionId: string, dto: CreateParentInviteDto) {
    // Validate all student IDs belong to this institution
    const count = await this.prisma.student.count({
      where: {
        id: { in: dto.student_ids },
        institution_id: institutionId,
      },
    });

    if (count !== dto.student_ids.length) {
      throw new BadRequestException(
        'One or more student IDs do not belong to this institution',
      );
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    const invite = await this.prisma.parentInvite.create({
      data: {
        institution_id: institutionId,
        email: dto.email,
        token,
        student_ids: dto.student_ids,
        expires_at: expiresAt,
      },
    });

    return invite;
  }

  async registerParent(dto: ParentRegisterDto) {
    const invite = await this.prisma.parentInvite.findUnique({
      where: { token: dto.token },
    });

    if (!invite) {
      throw new BadRequestException('Invalid invite token');
    }

    if (invite.used_at) {
      throw new BadRequestException('Invite has already been used');
    }

    if (invite.expires_at < new Date()) {
      throw new BadRequestException('Invite has expired');
    }

    // Check if email is already registered
    const existingUser = await this.prisma.user.findUnique({
      where: { email: invite.email },
    });

    if (existingUser) {
      throw new ConflictException(
        `Email "${invite.email}" is already registered`,
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          name: dto.name,
          email: invite.email,
          password_hash: passwordHash,
          role: 'PARENT',
          institution_id: invite.institution_id,
          is_active: true,
        },
      });

      // Create parent profile
      const parent = await tx.parent.create({
        data: {
          user_id: user.id,
          institution_id: invite.institution_id,
        },
      });

      // Link students from invite
      const studentIds = [...invite.student_ids];

      // Auto-link additional students matching parent_email
      const extraStudents = await tx.student.findMany({
        where: {
          institution_id: invite.institution_id,
          parent_email: invite.email,
          id: { notIn: studentIds },
        },
        select: { id: true },
      });

      for (const s of extraStudents) {
        studentIds.push(s.id);
      }

      if (studentIds.length > 0) {
        await tx.parentStudent.createMany({
          data: studentIds.map((sid) => ({
            parent_id: parent.id,
            student_id: sid,
          })),
        });
      }

      // Mark invite as used
      await tx.parentInvite.update({
        where: { id: invite.id },
        data: { used_at: new Date() },
      });

      return { user, parent };
    });

    return result;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd sinaloka-backend && npm test -- --testPathPattern=parent-invite.service.spec`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/parent/parent-invite.service.ts src/modules/parent/parent-invite.service.spec.ts
git commit -m "feat(parent): add ParentInviteService with invite creation and registration"
```

---

### Task 5: Add parent registration route to AuthController

**Files:**
- Modify: `sinaloka-backend/src/modules/auth/auth.controller.ts`
- Modify: `sinaloka-backend/src/modules/auth/auth.module.ts`

- [ ] **Step 1: Add ParentRegisterSchema to auth.dto.ts**

In `sinaloka-backend/src/modules/auth/auth.dto.ts`, add at the bottom:

```typescript
export { ParentRegisterSchema } from '../parent/parent.dto.js';
export type { ParentRegisterDto } from '../parent/parent.dto.js';
```

- [ ] **Step 2: Add register/parent route to AuthController**

In `auth.controller.ts`, add the import:

```typescript
import { ParentRegisterSchema } from './auth.dto.js';
import type { ParentRegisterDto } from './auth.dto.js';
import { ParentInviteService } from '../parent/parent-invite.service.js';
import { AuthService } from './auth.service.js';
```

Add `ParentInviteService` to the constructor:

```typescript
constructor(
  private readonly authService: AuthService,
  private readonly parentInviteService: ParentInviteService,
) {}
```

Add new route method (after the `refresh` method):

```typescript
@Public()
@Post('register/parent')
@HttpCode(HttpStatus.CREATED)
@UsePipes(new ZodValidationPipe(ParentRegisterSchema))
async registerParent(@Body() dto: ParentRegisterDto) {
  const { user } = await this.parentInviteService.registerParent(dto);
  // Auto-login: return tokens
  return this.authService.login({
    email: user.email,
    password: dto.password,
  });
}
```

- [ ] **Step 3: Update AuthModule to import ParentInviteService**

In `auth.module.ts`, import `ParentModule` via `forwardRef` to access `ParentInviteService` (avoids duplicate service instances):

```typescript
import { Module, forwardRef } from '@nestjs/common';
import { ParentModule } from '../parent/parent.module.js';
```

Add `ParentModule` to the `imports` array:

```typescript
imports: [
  PassportModule.register({ defaultStrategy: 'jwt' }),
  JwtModule.registerAsync({ ... }),
  forwardRef(() => ParentModule),
],
```

- [ ] **Step 4: Verify the app compiles**

Run: `cd sinaloka-backend && npx tsc --noEmit`
Expected: No errors (note: this may fail until ParentModule is created — if so, skip to Task 6 and come back)

- [ ] **Step 5: Commit**

```bash
git add src/modules/auth/auth.controller.ts src/modules/auth/auth.dto.ts src/modules/auth/auth.module.ts
git commit -m "feat(auth): add POST /auth/register/parent route for invite-based registration"
```

---

## Chunk 3: Parent Service & Guard

### Task 6: ParentService — read-only queries for children data

**Files:**
- Create: `sinaloka-backend/src/modules/parent/parent.service.ts`
- Test: `sinaloka-backend/src/modules/parent/parent.service.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `parent.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

jest.mock('../../common/prisma/prisma.service', () => {
  return { PrismaService: jest.fn() };
});

import { ParentService } from './parent.service.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';

describe('ParentService', () => {
  let service: ParentService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      parent: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(), delete: jest.fn() },
      parentStudent: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      student: { count: jest.fn() },
      attendance: { findMany: jest.fn(), count: jest.fn() },
      session: { findMany: jest.fn(), count: jest.fn() },
      payment: { findMany: jest.fn(), count: jest.fn() },
      enrollment: { findMany: jest.fn(), count: jest.fn() },
      refreshToken: { deleteMany: jest.fn() },
      user: { delete: jest.fn() },
      $transaction: jest.fn((fn: any) => fn(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParentService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ParentService>(ParentService);
  });

  describe('getChildren', () => {
    it('should return linked children with summary stats', async () => {
      prisma.parent.findFirst.mockResolvedValue({
        id: 'parent-1',
        children: [
          {
            student: {
              id: 's1',
              name: 'Child 1',
              grade: '5',
              status: 'ACTIVE',
              enrollments: [],
              attendances: [],
              payments: [],
            },
          },
        ],
      });

      const result = await service.getChildren('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('s1');
    });

    it('should throw if parent profile not found', async () => {
      prisma.parent.findFirst.mockResolvedValue(null);

      await expect(service.getChildren('bad-user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getChildAttendance', () => {
    it('should return paginated attendance with summary', async () => {
      prisma.attendance.findMany.mockResolvedValue([
        { id: 'a1', status: 'PRESENT', homework_done: true },
        { id: 'a2', status: 'ABSENT', homework_done: false },
      ]);
      prisma.attendance.count.mockResolvedValue(2);

      const result = await service.getChildAttendance('inst-1', 's1', {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(2);
      expect(result.summary.present).toBe(1);
      expect(result.summary.absent).toBe(1);
      expect(result.meta.total).toBe(2);
    });
  });

  describe('deleteParent', () => {
    it('should delete parent, refresh tokens, and user in transaction', async () => {
      prisma.parent.findFirst.mockResolvedValue({
        id: 'parent-1',
        user_id: 'user-1',
      });
      prisma.parent.delete.mockResolvedValue({});
      prisma.refreshToken.deleteMany.mockResolvedValue({});
      prisma.user.delete.mockResolvedValue({});

      await service.deleteParent('inst-1', 'parent-1');

      expect(prisma.parent.delete).toHaveBeenCalledWith({
        where: { id: 'parent-1' },
      });
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { user_id: 'user-1' },
      });
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd sinaloka-backend && npm test -- --testPathPattern=parent.service.spec`
Expected: FAIL — module not found

- [ ] **Step 3: Implement ParentService**

Create `parent.service.ts`:

```typescript
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { buildPaginationMeta, PaginatedResponse } from '../../common/dto/pagination.dto.js';
import {
  ParentQueryDto,
  LinkStudentsDto,
  ChildAttendanceQueryDto,
  ChildSessionsQueryDto,
  ChildPaymentsQueryDto,
} from './parent.dto.js';

@Injectable()
export class ParentService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Parent-facing methods ---

  async getParentByUserId(userId: string) {
    const parent = await this.prisma.parent.findFirst({
      where: { user_id: userId },
    });
    if (!parent) {
      throw new NotFoundException('Parent profile not found');
    }
    return parent;
  }

  async getChildren(userId: string) {
    const parent = await this.prisma.parent.findFirst({
      where: { user_id: userId },
      include: {
        children: {
          include: {
            student: {
              include: {
                enrollments: {
                  where: { status: 'ACTIVE' },
                  include: {
                    class: {
                      select: { id: true, name: true, subject: true },
                    },
                  },
                },
                attendances: {
                  orderBy: { created_at: 'desc' },
                  take: 50,
                  select: { status: true, homework_done: true },
                },
                payments: {
                  where: { status: { in: ['PENDING', 'OVERDUE'] } },
                  select: { id: true, status: true },
                },
              },
            },
          },
        },
      },
    });

    if (!parent) {
      throw new NotFoundException('Parent profile not found');
    }

    // Get next upcoming session per child
    const childIds = parent.children.map((link) => link.student.id);
    const classIds = parent.children.flatMap((link) =>
      link.student.enrollments.map((e: any) => e.class.id),
    );

    const nextSessions = classIds.length > 0
      ? await this.prisma.session.findMany({
          where: {
            class_id: { in: classIds },
            status: 'SCHEDULED',
            date: { gte: new Date() },
          },
          orderBy: { date: 'asc' },
          include: {
            class: { select: { id: true, name: true, subject: true } },
          },
        })
      : [];

    return parent.children.map((link) => {
      const s = link.student;
      const attendances = s.attendances;
      const totalAttendance = attendances.length;
      const presentCount = attendances.filter(
        (a) => a.status === 'PRESENT' || a.status === 'LATE',
      ).length;
      const attendanceRate =
        totalAttendance > 0
          ? Math.round((presentCount / totalAttendance) * 100)
          : 0;

      const pendingPayments = s.payments.filter((p) => p.status === 'PENDING').length;
      const overduePayments = s.payments.filter((p) => p.status === 'OVERDUE').length;

      // Find next upcoming session for this child's enrolled classes
      const childClassIds = s.enrollments.map((e: any) => e.class.id);
      const nextSession = nextSessions.find((sess: any) =>
        childClassIds.includes(sess.class_id),
      );

      return {
        id: s.id,
        name: s.name,
        grade: s.grade,
        status: s.status,
        enrollment_count: s.enrollments.length,
        attendance_rate: attendanceRate,
        pending_payments: pendingPayments,
        overdue_payments: overduePayments,
        next_session: nextSession
          ? {
              date: nextSession.date,
              start_time: nextSession.start_time,
              subject: nextSession.class.subject,
              class_name: nextSession.class.name,
            }
          : null,
        enrollments: s.enrollments.map((e: any) => ({
          class_name: e.class.name,
          subject: e.class.subject,
        })),
      };
    });
  }

  async getChildDetail(institutionId: string, studentId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, institution_id: institutionId },
      include: {
        enrollments: {
          where: { status: { in: ['ACTIVE', 'TRIAL'] } },
          include: {
            class: {
              include: {
                tutor: {
                  include: {
                    user: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async getChildAttendance(
    institutionId: string,
    studentId: string,
    query: ChildAttendanceQueryDto,
  ) {
    const { page, limit, date_from, date_to, class_id } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      institution_id: institutionId,
      student_id: studentId,
    };

    const sessionFilter: Record<string, unknown> = {};
    if (class_id) sessionFilter.class_id = class_id;
    if (date_from || date_to) {
      sessionFilter.date = {};
      if (date_from) (sessionFilter.date as any).gte = new Date(date_from);
      if (date_to) (sessionFilter.date as any).lte = new Date(date_to);
    }
    if (Object.keys(sessionFilter).length > 0) {
      where.session = sessionFilter;
    }

    const [data, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          session: {
            select: {
              date: true,
              start_time: true,
              end_time: true,
              class: { select: { name: true, subject: true } },
            },
          },
        },
      }),
      this.prisma.attendance.count({ where }),
    ]);

    // Compute summary from ALL matching records (not just current page)
    const allStatuses = await this.prisma.attendance.findMany({
      where,
      select: { status: true, homework_done: true },
    });

    const present = allStatuses.filter((a) => a.status === 'PRESENT').length;
    const absent = allStatuses.filter((a) => a.status === 'ABSENT').length;
    const late = allStatuses.filter((a) => a.status === 'LATE').length;
    const homeworkDone = allStatuses.filter((a) => a.homework_done).length;
    const attendanceRate =
      total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    const homeworkRate =
      total > 0 ? Math.round((homeworkDone / total) * 100) : 0;

    return {
      data,
      summary: { present, absent, late, homework_done: homeworkDone, attendance_rate: attendanceRate, homework_rate: homeworkRate },
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getChildSessions(
    institutionId: string,
    studentId: string,
    query: ChildSessionsQueryDto,
  ) {
    const { page, limit, status, date_from, date_to } = query;
    const skip = (page - 1) * limit;

    // Get class IDs the student is enrolled in
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        institution_id: institutionId,
        student_id: studentId,
        status: { in: ['ACTIVE', 'TRIAL'] },
      },
      select: { class_id: true },
    });

    const classIds = enrollments.map((e) => e.class_id);

    if (classIds.length === 0) {
      return { data: [], meta: buildPaginationMeta(0, page, limit) };
    }

    const where: Record<string, unknown> = {
      institution_id: institutionId,
      class_id: { in: classIds },
    };

    if (status) where.status = status;
    if (date_from || date_to) {
      where.date = {};
      if (date_from) (where.date as any).gte = new Date(date_from);
      if (date_to) (where.date as any).lte = new Date(date_to);
    }

    const [data, total] = await Promise.all([
      this.prisma.session.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          class: { select: { name: true, subject: true } },
        },
      }),
      this.prisma.session.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getChildPayments(
    institutionId: string,
    studentId: string,
    query: ChildPaymentsQueryDto,
  ) {
    const { page, limit, status } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      institution_id: institutionId,
      student_id: studentId,
    };

    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { due_date: 'desc' },
        include: {
          enrollment: {
            select: {
              class: { select: { name: true, subject: true } },
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getChildEnrollments(institutionId: string, studentId: string) {
    return this.prisma.enrollment.findMany({
      where: {
        institution_id: institutionId,
        student_id: studentId,
        status: { in: ['ACTIVE', 'TRIAL'] },
      },
      include: {
        class: {
          include: {
            tutor: {
              include: { user: { select: { name: true } } },
            },
          },
        },
      },
    });
  }

  // --- Admin methods ---

  async findAll(institutionId: string, query: ParentQueryDto): Promise<PaginatedResponse<any>> {
    const { page, limit, search, sort_by, sort_order } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      institution_id: institutionId,
    };

    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const orderBy: Record<string, unknown> =
      sort_by === 'name'
        ? { user: { name: sort_order } }
        : { [sort_by]: sort_order };

    const [data, total] = await Promise.all([
      this.prisma.parent.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: {
            select: { id: true, name: true, email: true, is_active: true },
          },
          _count: { select: { children: true } },
        },
      }),
      this.prisma.parent.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findOne(institutionId: string, id: string) {
    const parent = await this.prisma.parent.findFirst({
      where: { id, institution_id: institutionId },
      include: {
        user: {
          select: { id: true, name: true, email: true, is_active: true },
        },
        children: {
          include: {
            student: {
              select: { id: true, name: true, grade: true, status: true },
            },
          },
        },
      },
    });

    if (!parent) {
      throw new NotFoundException(`Parent with ID "${id}" not found`);
    }

    return parent;
  }

  async linkStudents(institutionId: string, parentId: string, dto: LinkStudentsDto) {
    await this.findOne(institutionId, parentId);

    const count = await this.prisma.student.count({
      where: {
        id: { in: dto.student_ids },
        institution_id: institutionId,
      },
    });

    if (count !== dto.student_ids.length) {
      throw new BadRequestException(
        'One or more student IDs do not belong to this institution',
      );
    }

    await this.prisma.parentStudent.createMany({
      data: dto.student_ids.map((sid) => ({
        parent_id: parentId,
        student_id: sid,
      })),
      skipDuplicates: true,
    });

    return this.findOne(institutionId, parentId);
  }

  async unlinkStudent(institutionId: string, parentId: string, studentId: string) {
    await this.findOne(institutionId, parentId);

    const link = await this.prisma.parentStudent.findFirst({
      where: { parent_id: parentId, student_id: studentId },
    });

    if (!link) {
      throw new NotFoundException('Student is not linked to this parent');
    }

    await this.prisma.parentStudent.delete({ where: { id: link.id } });
  }

  async deleteParent(institutionId: string, id: string) {
    const parent = await this.prisma.parent.findFirst({
      where: { id, institution_id: institutionId },
    });

    if (!parent) {
      throw new NotFoundException(`Parent with ID "${id}" not found`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.parent.delete({ where: { id } });
      await tx.refreshToken.deleteMany({ where: { user_id: parent.user_id } });
      await tx.user.delete({ where: { id: parent.user_id } });
    });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd sinaloka-backend && npm test -- --testPathPattern=parent.service.spec`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/parent/parent.service.ts src/modules/parent/parent.service.spec.ts
git commit -m "feat(parent): add ParentService with children queries and admin management"
```

---

### Task 7: ParentStudentGuard

**Files:**
- Create: `sinaloka-backend/src/modules/parent/guards/parent-student.guard.ts`

- [ ] **Step 1: Create the guard**

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import type { JwtPayload } from '../../../common/decorators/current-user.decorator.js';

@Injectable()
export class ParentStudentGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;
    const studentId = request.params.studentId;

    // Only enforce for PARENT role
    if (user.role !== 'PARENT') {
      return true;
    }

    if (!studentId) {
      return true;
    }

    const parent = await this.prisma.parent.findFirst({
      where: { user_id: user.userId },
      select: { id: true },
    });

    if (!parent) {
      throw new ForbiddenException('Parent profile not found');
    }

    const link = await this.prisma.parentStudent.findFirst({
      where: {
        parent_id: parent.id,
        student_id: studentId,
      },
    });

    if (!link) {
      throw new ForbiddenException(
        'You do not have access to this student',
      );
    }

    return true;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/parent/guards/parent-student.guard.ts
git commit -m "feat(parent): add ParentStudentGuard for child access authorization"
```

---

## Chunk 4: Controllers & Module Registration

### Task 8: Parent-facing controller

**Files:**
- Create: `sinaloka-backend/src/modules/parent/parent.controller.ts`

- [ ] **Step 1: Create the controller**

```typescript
import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { ParentStudentGuard } from './guards/parent-student.guard.js';
import { ParentService } from './parent.service.js';
import {
  ChildAttendanceQuerySchema,
  ChildSessionsQuerySchema,
  ChildPaymentsQuerySchema,
} from './parent.dto.js';
import type {
  ChildAttendanceQueryDto,
  ChildSessionsQueryDto,
  ChildPaymentsQueryDto,
} from './parent.dto.js';

@Controller('parent')
@Roles(Role.PARENT)
export class ParentController {
  constructor(private readonly parentService: ParentService) {}

  @Get('children')
  async getChildren(@CurrentUser() user: JwtPayload) {
    return this.parentService.getChildren(user.userId);
  }

  @Get('children/:studentId')
  @UseGuards(ParentStudentGuard)
  async getChildDetail(
    @CurrentUser() user: JwtPayload,
    @Param('studentId') studentId: string,
  ) {
    return this.parentService.getChildDetail(user.institutionId!, studentId);
  }

  @Get('children/:studentId/attendance')
  @UseGuards(ParentStudentGuard)
  async getChildAttendance(
    @CurrentUser() user: JwtPayload,
    @Param('studentId') studentId: string,
    @Query(new ZodValidationPipe(ChildAttendanceQuerySchema)) query: ChildAttendanceQueryDto,
  ) {
    return this.parentService.getChildAttendance(user.institutionId!, studentId, query);
  }

  @Get('children/:studentId/sessions')
  @UseGuards(ParentStudentGuard)
  async getChildSessions(
    @CurrentUser() user: JwtPayload,
    @Param('studentId') studentId: string,
    @Query(new ZodValidationPipe(ChildSessionsQuerySchema)) query: ChildSessionsQueryDto,
  ) {
    return this.parentService.getChildSessions(user.institutionId!, studentId, query);
  }

  @Get('children/:studentId/payments')
  @UseGuards(ParentStudentGuard)
  async getChildPayments(
    @CurrentUser() user: JwtPayload,
    @Param('studentId') studentId: string,
    @Query(new ZodValidationPipe(ChildPaymentsQuerySchema)) query: ChildPaymentsQueryDto,
  ) {
    return this.parentService.getChildPayments(user.institutionId!, studentId, query);
  }

  @Get('children/:studentId/enrollments')
  @UseGuards(ParentStudentGuard)
  async getChildEnrollments(
    @CurrentUser() user: JwtPayload,
    @Param('studentId') studentId: string,
  ) {
    return this.parentService.getChildEnrollments(user.institutionId!, studentId);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/parent/parent.controller.ts
git commit -m "feat(parent): add parent-facing controller with read-only child routes"
```

---

### Task 9: Admin parent management controller

**Files:**
- Create: `sinaloka-backend/src/modules/parent/parent-admin.controller.ts`

- [ ] **Step 1: Create the admin controller**

```typescript
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '../../../generated/prisma/client.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { ParentService } from './parent.service.js';
import { ParentInviteService } from './parent-invite.service.js';
import {
  CreateParentInviteSchema,
  LinkStudentsSchema,
  ParentQuerySchema,
} from './parent.dto.js';
import type {
  CreateParentInviteDto,
  LinkStudentsDto,
  ParentQueryDto,
} from './parent.dto.js';

@Controller('admin/parents')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class ParentAdminController {
  constructor(
    private readonly parentService: ParentService,
    private readonly parentInviteService: ParentInviteService,
  ) {}

  @Post('invite')
  async createInvite(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(CreateParentInviteSchema)) dto: CreateParentInviteDto,
  ) {
    return this.parentInviteService.createInvite(user.institutionId!, dto);
  }

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(ParentQuerySchema)) query: ParentQueryDto,
  ) {
    return this.parentService.findAll(user.institutionId!, query);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.parentService.findOne(user.institutionId!, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    await this.parentService.deleteParent(user.institutionId!, id);
  }

  @Post(':id/link')
  async linkStudents(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(LinkStudentsSchema)) dto: LinkStudentsDto,
  ) {
    return this.parentService.linkStudents(user.institutionId!, id, dto);
  }

  @Delete(':parentId/children/:studentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlinkStudent(
    @CurrentUser() user: JwtPayload,
    @Param('parentId') parentId: string,
    @Param('studentId') studentId: string,
  ) {
    await this.parentService.unlinkStudent(user.institutionId!, parentId, studentId);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/parent/parent-admin.controller.ts
git commit -m "feat(parent): add admin controller for parent management and invites"
```

---

### Task 10: ParentModule & AppModule registration

**Files:**
- Create: `sinaloka-backend/src/modules/parent/parent.module.ts`
- Modify: `sinaloka-backend/src/app.module.ts`

- [ ] **Step 1: Create ParentModule**

```typescript
import { Module } from '@nestjs/common';
import { ParentService } from './parent.service.js';
import { ParentInviteService } from './parent-invite.service.js';
import { ParentController } from './parent.controller.js';
import { ParentAdminController } from './parent-admin.controller.js';
import { ParentStudentGuard } from './guards/parent-student.guard.js';

@Module({
  controllers: [ParentController, ParentAdminController],
  providers: [ParentService, ParentInviteService, ParentStudentGuard],
  exports: [ParentService, ParentInviteService],
})
export class ParentModule {}
```

- [ ] **Step 2: Register in AppModule**

In `app.module.ts`, add the import:

```typescript
import { ParentModule } from './modules/parent/parent.module.js';
```

Add `ParentModule` to the `imports` array (after `UploadModule`):

```typescript
imports: [
  // ... existing modules
  UploadModule,
  ParentModule,
],
```

- [ ] **Step 3: Verify the app compiles and starts**

Run: `cd sinaloka-backend && npx tsc --noEmit`
Expected: No type errors

Run: `cd sinaloka-backend && npm run start:dev`
Expected: App starts, logs show routes registered including `/api/parent/*` and `/api/admin/parents/*`

- [ ] **Step 4: Run all existing tests to check nothing is broken**

Run: `cd sinaloka-backend && npm test`
Expected: All existing tests PASS, new parent tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/parent/parent.module.ts src/app.module.ts
git commit -m "feat(parent): register ParentModule in AppModule"
```

---

## Chunk 5: Integration Test

### Task 11: Integration test for parent registration and data access

**Files:**
- Create: `sinaloka-backend/src/modules/parent/parent.controller.spec.ts`

- [ ] **Step 1: Write the integration test**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { PrismaModule } from '../../common/prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ParentModule } from './parent.module.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { TenantInterceptor } from '../../common/interceptors/tenant.interceptor.js';

describe('Parent (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let institutionId: string;
  let adminToken: string;
  let studentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AuthModule,
        ParentModule,
      ],
      providers: [
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    // Clean up
    await prisma.parentStudent.deleteMany({
      where: { parent: { institution: { slug: 'parent-test-inst' } } },
    });
    await prisma.parentInvite.deleteMany({
      where: { institution: { slug: 'parent-test-inst' } },
    });
    await prisma.parent.deleteMany({
      where: { institution: { slug: 'parent-test-inst' } },
    });
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { in: ['parent-admin@test.com', 'parent-user@test.com'] } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: ['parent-admin@test.com', 'parent-user@test.com'] } },
    });
    await prisma.student.deleteMany({
      where: { institution: { slug: 'parent-test-inst' } },
    });
    await prisma.institution.deleteMany({ where: { slug: 'parent-test-inst' } });

    // Seed
    const institution = await prisma.institution.create({
      data: { name: 'Parent Test Inst', slug: 'parent-test-inst' },
    });
    institutionId = institution.id;

    const passwordHash = await bcrypt.hash('password123', 10);
    await prisma.user.create({
      data: {
        email: 'parent-admin@test.com',
        password_hash: passwordHash,
        name: 'Admin',
        role: 'ADMIN',
        institution_id: institutionId,
        is_active: true,
      },
    });

    const student = await prisma.student.create({
      data: {
        institution_id: institutionId,
        name: 'Test Child',
        grade: '5',
        parent_email: 'parent-user@test.com',
      },
    });
    studentId = student.id;

    // Login as admin
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'parent-admin@test.com', password: 'password123' });
    adminToken = loginRes.body.access_token;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.parentStudent.deleteMany({
        where: { parent: { institution_id: institutionId } },
      });
      await prisma.parentInvite.deleteMany({ where: { institution_id: institutionId } });
      await prisma.parent.deleteMany({ where: { institution_id: institutionId } });
      await prisma.refreshToken.deleteMany({
        where: { user: { email: { in: ['parent-admin@test.com', 'parent-user@test.com'] } } },
      });
      await prisma.user.deleteMany({
        where: { email: { in: ['parent-admin@test.com', 'parent-user@test.com'] } },
      });
      await prisma.student.deleteMany({ where: { institution_id: institutionId } });
      await prisma.institution.deleteMany({ where: { id: institutionId } });
    }
    if (app) await app.close();
  });

  it('full parent flow: invite → register → view children', async () => {
    // 1. Admin creates invite
    const inviteRes = await request(app.getHttpServer())
      .post('/admin/parents/invite')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'parent-user@test.com', student_ids: [studentId] })
      .expect(201);

    expect(inviteRes.body).toHaveProperty('token');

    // 2. Parent registers
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register/parent')
      .send({
        token: inviteRes.body.token,
        name: 'Parent User',
        password: 'securepass123',
      })
      .expect(201);

    expect(registerRes.body).toHaveProperty('access_token');
    const parentToken = registerRes.body.access_token;

    // 3. Parent views children
    const childrenRes = await request(app.getHttpServer())
      .get('/parent/children')
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);

    expect(childrenRes.body).toHaveLength(1);
    expect(childrenRes.body[0].name).toBe('Test Child');
  });

  it('should deny parent access to unlinked student', async () => {
    // Create another student not linked to parent
    const otherStudent = await prisma.student.create({
      data: {
        institution_id: institutionId,
        name: 'Other Child',
        grade: '3',
      },
    });

    // Login as parent
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'parent-user@test.com', password: 'securepass123' });
    const parentToken = loginRes.body.access_token;

    // Try to access unlinked student
    await request(app.getHttpServer())
      .get(`/parent/children/${otherStudent.id}/attendance`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(403);

    // Clean up
    await prisma.student.delete({ where: { id: otherStudent.id } });
  });
});
```

- [ ] **Step 2: Run integration test**

Run: `cd sinaloka-backend && npm test -- --testPathPattern=parent.controller.spec`
Expected: All tests PASS

- [ ] **Step 3: Run full test suite**

Run: `cd sinaloka-backend && npm test`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/modules/parent/parent.controller.spec.ts
git commit -m "test(parent): add integration tests for invite, registration, and child access"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Prisma schema: PARENT role + 3 new models | `prisma/schema.prisma` |
| 2 | TenantInterceptor: add PARENT role | `tenant.interceptor.ts` |
| 3 | DTOs: Zod schemas | `parent.dto.ts` |
| 4 | ParentInviteService: invite + registration | `parent-invite.service.ts` + spec |
| 5 | Auth registration route | `auth.controller.ts`, `auth.dto.ts`, `auth.module.ts` |
| 6 | ParentService: read queries + admin ops | `parent.service.ts` + spec |
| 7 | ParentStudentGuard | `guards/parent-student.guard.ts` |
| 8 | Parent controller (read-only) | `parent.controller.ts` |
| 9 | Admin controller | `parent-admin.controller.ts` |
| 10 | Module registration | `parent.module.ts`, `app.module.ts` |
| 11 | Integration test | `parent.controller.spec.ts` |
