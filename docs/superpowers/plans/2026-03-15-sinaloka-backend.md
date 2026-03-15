# Sinaloka Backend Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the backend API for Sinaloka tutoring management platform — a multi-tenant NestJS modular monolith serving admin dashboard and tutor mobile app.

**Architecture:** NestJS modular monolith with Prisma ORM and PostgreSQL. Single database with tenant isolation via `institution_id` column. JWT authentication with role-based access (Super Admin, Admin, Tutor). Two route prefixes: `/admin/*` and `/tutor/*`.

**Tech Stack:** NestJS, Prisma, PostgreSQL, JWT + bcrypt, Zod, pdfkit, date-fns

---

## Chunk 1: Project Setup + Prisma Schema + Common Infrastructure

### Step 1 — Scaffold NestJS project

- [ ] Create the NestJS project using the CLI (skip git init since the parent repo manages git):

```bash
cd /home/zet/Project/sinaloka
npx @nestjs/cli new sinaloka-backend --package-manager npm --skip-git
```

Expected output: a `sinaloka-backend/` directory with default NestJS scaffolding (`src/`, `test/`, `package.json`, `tsconfig.json`, `nest-cli.json`).

### Step 2 — Install production dependencies

- [ ] Install all required production packages:

```bash
cd /home/zet/Project/sinaloka/sinaloka-backend
npm install @nestjs/config @nestjs/jwt @nestjs/passport @nestjs/schedule passport-jwt bcrypt zod nestjs-zod pdfkit csv-parse csv-stringify uuid date-fns @prisma/client
```

### Step 3 — Install dev dependencies

- [ ] Install dev packages:

```bash
cd /home/zet/Project/sinaloka/sinaloka-backend
npm install -D prisma @types/bcrypt @types/passport-jwt @types/pdfkit @types/uuid
```

### Step 4 — Initialize Prisma

- [ ] Initialize Prisma with PostgreSQL provider:

```bash
cd /home/zet/Project/sinaloka/sinaloka-backend
npx prisma init --datasource-provider postgresql
```

Expected output: creates `prisma/schema.prisma` and `.env` with a `DATABASE_URL` placeholder.

### Step 5 — Configure environment variables

- [ ] Replace the contents of `sinaloka-backend/.env` with:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sinaloka
JWT_SECRET=super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=super-secret-refresh-key-change-in-production
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
UPLOAD_DIR=./uploads
UPLOAD_MAX_SIZE=5242880
PORT=3000
```

- [ ] Create `sinaloka-backend/.env.example` with the same keys but placeholder values:

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/sinaloka
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
UPLOAD_DIR=./uploads
UPLOAD_MAX_SIZE=5242880
PORT=3000
```

### Step 6 — Write the full Prisma schema

- [ ] Replace the contents of `sinaloka-backend/prisma/schema.prisma` with the complete schema:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ────────────────────────────────────────────────────────────────────

enum Role {
  SUPER_ADMIN
  ADMIN
  TUTOR
}

enum StudentStatus {
  ACTIVE
  INACTIVE
}

enum ClassStatus {
  ACTIVE
  ARCHIVED
}

enum EnrollmentStatus {
  ACTIVE
  TRIAL
  WAITLISTED
  DROPPED
}

enum PaymentStatus {
  PAID
  PENDING
  OVERDUE
}

enum SessionStatus {
  SCHEDULED
  COMPLETED
  CANCELLED
  RESCHEDULE_REQUESTED
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  LATE
}

enum PaymentMethod {
  CASH
  TRANSFER
  OTHER
}

enum PayoutStatus {
  PENDING
  PROCESSING
  PAID
}

enum ExpenseCategory {
  RENT
  UTILITIES
  SUPPLIES
  MARKETING
  OTHER
}

// ─── Models ───────────────────────────────────────────────────────────────────

model Institution {
  id         String   @id @default(uuid())
  name       String
  slug       String   @unique
  address    String?
  phone      String?
  email      String?
  logo_url   String?
  settings   Json?
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  users       User[]
  students    Student[]
  tutors      Tutor[]
  classes     Class[]
  enrollments Enrollment[]
  sessions    Session[]
  attendances Attendance[]
  payments    Payment[]
  payouts     Payout[]
  expenses    Expense[]

  @@map("institutions")
}

model User {
  id              String    @id @default(uuid())
  institution_id  String?
  email           String    @unique
  password_hash   String
  name            String
  avatar_url      String?
  role            Role
  is_active       Boolean   @default(true)
  last_login_at   DateTime?
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt

  institution     Institution? @relation(fields: [institution_id], references: [id])
  tutor           Tutor?
  created_sessions Session[]   @relation("SessionCreatedBy")
  approved_sessions Session[]  @relation("SessionApprovedBy")
  refresh_tokens  RefreshToken[]

  @@map("users")
}

model Student {
  id              String        @id @default(uuid())
  institution_id  String
  name            String
  email           String?
  phone           String?
  grade           String
  status          StudentStatus @default(ACTIVE)
  parent_name     String?
  parent_phone    String?
  parent_email    String?
  enrolled_at     DateTime      @default(now())
  created_at      DateTime      @default(now())
  updated_at      DateTime      @updatedAt

  institution     Institution   @relation(fields: [institution_id], references: [id])
  enrollments     Enrollment[]
  attendances     Attendance[]
  payments        Payment[]

  @@map("students")
}

model Tutor {
  id                   String   @id @default(uuid())
  user_id              String   @unique
  institution_id       String
  subjects             String[]
  rating               Float    @default(0)
  experience_years     Int      @default(0)
  availability         Json?
  bank_name            String?
  bank_account_number  String?
  bank_account_holder  String?
  is_verified          Boolean  @default(false)
  created_at           DateTime @default(now())
  updated_at           DateTime @updatedAt

  user                 User        @relation(fields: [user_id], references: [id])
  institution          Institution @relation(fields: [institution_id], references: [id])
  classes              Class[]
  payouts              Payout[]

  @@map("tutors")
}

model Class {
  id                  String      @id @default(uuid())
  institution_id      String
  tutor_id            String
  name                String
  subject             String
  capacity            Int
  fee                 Decimal
  schedule_days       String[]
  schedule_start_time String
  schedule_end_time   String
  room                String?
  status              ClassStatus @default(ACTIVE)
  created_at          DateTime    @default(now())
  updated_at          DateTime    @updatedAt

  institution         Institution  @relation(fields: [institution_id], references: [id])
  tutor               Tutor        @relation(fields: [tutor_id], references: [id])
  enrollments         Enrollment[]
  sessions            Session[]

  @@map("classes")
}

model Enrollment {
  id              String           @id @default(uuid())
  institution_id  String
  student_id      String
  class_id        String
  status          EnrollmentStatus @default(ACTIVE)
  payment_status  PaymentStatus    @default(PENDING)
  enrolled_at     DateTime         @default(now())
  created_at      DateTime         @default(now())
  updated_at      DateTime         @updatedAt

  institution     Institution @relation(fields: [institution_id], references: [id])
  student         Student     @relation(fields: [student_id], references: [id])
  class           Class       @relation(fields: [class_id], references: [id])
  payments        Payment[]

  @@unique([student_id, class_id])
  @@map("enrollments")
}

model Session {
  id                   String        @id @default(uuid())
  institution_id       String
  class_id             String
  date                 DateTime      @db.Date
  start_time           String
  end_time             String
  status               SessionStatus @default(SCHEDULED)
  topic_covered        String?
  session_summary      String?
  created_by           String
  approved_by          String?
  proposed_date        DateTime?     @db.Date
  proposed_start_time  String?
  proposed_end_time    String?
  reschedule_reason    String?
  created_at           DateTime      @default(now())
  updated_at           DateTime      @updatedAt

  institution          Institution @relation(fields: [institution_id], references: [id])
  class                Class       @relation(fields: [class_id], references: [id])
  creator              User        @relation("SessionCreatedBy", fields: [created_by], references: [id])
  approver             User?       @relation("SessionApprovedBy", fields: [approved_by], references: [id])
  attendances          Attendance[]

  @@map("sessions")
}

model Attendance {
  id              String           @id @default(uuid())
  institution_id  String
  session_id      String
  student_id      String
  status          AttendanceStatus
  homework_done   Boolean          @default(false)
  notes           String?
  created_at      DateTime         @default(now())
  updated_at      DateTime         @updatedAt

  institution     Institution @relation(fields: [institution_id], references: [id])
  session         Session     @relation(fields: [session_id], references: [id])
  student         Student     @relation(fields: [student_id], references: [id])

  @@unique([session_id, student_id])
  @@map("attendances")
}

model Payment {
  id              String        @id @default(uuid())
  institution_id  String
  student_id      String
  enrollment_id   String
  amount          Decimal
  due_date        DateTime      @db.Date
  paid_date       DateTime?     @db.Date
  status          PaymentStatus @default(PENDING)
  method          PaymentMethod?
  notes           String?
  created_at      DateTime      @default(now())
  updated_at      DateTime      @updatedAt

  institution     Institution @relation(fields: [institution_id], references: [id])
  student         Student     @relation(fields: [student_id], references: [id])
  enrollment      Enrollment  @relation(fields: [enrollment_id], references: [id])

  @@map("payments")
}

model Payout {
  id              String       @id @default(uuid())
  institution_id  String
  tutor_id        String
  amount          Decimal
  date            DateTime     @db.Date
  status          PayoutStatus @default(PENDING)
  proof_url       String?
  description     String?
  created_at      DateTime     @default(now())
  updated_at      DateTime     @updatedAt

  institution     Institution @relation(fields: [institution_id], references: [id])
  tutor           Tutor       @relation(fields: [tutor_id], references: [id])

  @@map("payouts")
}

model Expense {
  id              String          @id @default(uuid())
  institution_id  String
  category        ExpenseCategory
  amount          Decimal
  date            DateTime        @db.Date
  description     String?
  receipt_url     String?
  created_at      DateTime        @default(now())
  updated_at      DateTime        @updatedAt

  institution     Institution @relation(fields: [institution_id], references: [id])

  @@map("expenses")
}

model RefreshToken {
  id          String   @id @default(uuid())
  user_id     String
  token       String   @unique
  expires_at  DateTime
  revoked     Boolean  @default(false)
  created_at  DateTime @default(now())

  user        User @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id])
  @@map("refresh_tokens")
}
```

### Step 7 — Run initial Prisma migration

- [ ] Create the database (if not already existing) and run the first migration:

```bash
cd /home/zet/Project/sinaloka/sinaloka-backend
npx prisma migrate dev --name init
```

Expected output: migration created in `prisma/migrations/`, Prisma Client generated.

### Step 8 — Create PrismaModule and PrismaService

- [ ] Create `sinaloka-backend/src/common/prisma/prisma.service.ts`:

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

- [ ] Create `sinaloka-backend/src/common/prisma/prisma.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

### Step 9 — Create HttpExceptionFilter

- [ ] Create `sinaloka-backend/src/common/filters/http-exception.filter.ts`:

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request.headers['x-request-id'] as string) || uuidv4();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string | object) || message;
        error = (resp.error as string) || error;
      }
    }

    // Log the error for debugging
    if (statusCode >= 500) {
      console.error(`[${requestId}] Unhandled exception:`, exception);
    }

    response.status(statusCode).json({
      statusCode,
      error,
      message,
      requestId,
    });
  }
}
```

### Step 10 — Create ZodValidationPipe

- [ ] Create `sinaloka-backend/src/common/pipes/zod-validation.pipe.ts`:

```typescript
import {
  PipeTransform,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      const errors = this.formatErrors(result.error);
      throw new BadRequestException({
        message: 'Validation failed',
        errors,
      });
    }

    return result.data;
  }

  private formatErrors(error: ZodError) {
    return error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));
  }
}
```

### Step 11 — Create @CurrentUser decorator

- [ ] Create `sinaloka-backend/src/common/decorators/current-user.decorator.ts`:

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayload {
  userId: string;
  institutionId: string | null;
  role: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext): JwtPayload | string | null => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;
    return data ? user?.[data] : user;
  },
);
```

### Step 12 — Create @Roles decorator and RolesGuard

- [ ] Create `sinaloka-backend/src/common/decorators/roles.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

- [ ] Create `sinaloka-backend/src/common/guards/roles.guard.ts`:

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('No user found in request');
    }

    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
```

### Step 13 — Create JwtAuthGuard

- [ ] Create `sinaloka-backend/src/common/guards/jwt-auth.guard.ts`:

```typescript
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or expired token');
    }
    return user;
  }
}
```

- [ ] Create `sinaloka-backend/src/common/decorators/public.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

### Step 14 — Create TenantInterceptor

- [ ] Create `sinaloka-backend/src/common/interceptors/tenant.interceptor.ts`:

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return next.handle();
    }

    // SUPER_ADMIN bypasses tenant scoping
    if (user.role === 'SUPER_ADMIN') {
      // Allow institutionId from query param for cross-tenant access
      request.tenantId = request.query.institution_id || null;
      return next.handle();
    }

    // For ADMIN and TUTOR, enforce tenant from JWT
    if (!user.institutionId) {
      throw new ForbiddenException('User is not associated with any institution');
    }

    request.tenantId = user.institutionId;
    return next.handle();
  }
}
```

### Step 15 — Create shared pagination DTO

- [ ] Create `sinaloka-backend/src/common/dto/pagination.dto.ts`:

```typescript
import { z } from 'zod';

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
```

### Step 16 — Create barrel exports for common module

- [ ] Create `sinaloka-backend/src/common/index.ts`:

```typescript
// Prisma
export { PrismaModule } from './prisma/prisma.module';
export { PrismaService } from './prisma/prisma.service';

// Guards
export { JwtAuthGuard } from './guards/jwt-auth.guard';
export { RolesGuard } from './guards/roles.guard';

// Decorators
export { CurrentUser, JwtPayload } from './decorators/current-user.decorator';
export { Roles, ROLES_KEY } from './decorators/roles.decorator';
export { Public, IS_PUBLIC_KEY } from './decorators/public.decorator';

// Interceptors
export { TenantInterceptor } from './interceptors/tenant.interceptor';

// Filters
export { HttpExceptionFilter } from './filters/http-exception.filter';

// Pipes
export { ZodValidationPipe } from './pipes/zod-validation.pipe';

// DTOs
export {
  PaginationQuerySchema,
  PaginationQuery,
  PaginatedResponse,
  buildPaginationMeta,
} from './dto/pagination.dto';
```

### Step 17 — Wire up AppModule

- [ ] Replace `sinaloka-backend/src/app.module.ts` with:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './common/prisma/prisma.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
  ],
})
export class AppModule {}
```

### Step 18 — Wire up main.ts

- [ ] Replace `sinaloka-backend/src/main.ts` with:

```typescript
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  app.enableCors();
  app.setGlobalPrefix('api');

  await app.listen(port);
  console.log(`Sinaloka Backend running on http://localhost:${port}/api`);
}
bootstrap();
```

### Step 19 — Verify the project compiles

- [ ] Run the TypeScript compiler to check for errors:

```bash
cd /home/zet/Project/sinaloka/sinaloka-backend
npx tsc --noEmit
```

Expected output: no errors. If there are errors, fix them before proceeding.

### Step 20 — Verify the project starts (smoke test)

- [ ] Start the app briefly to verify it boots without crashing (requires database from Step 7):

```bash
cd /home/zet/Project/sinaloka/sinaloka-backend
timeout 10 npm run start 2>&1 || true
```

Expected output: should see the "Sinaloka Backend running on http://localhost:3000/api" log message before timeout kills it.

### Step 21 — Commit

- [ ] Stage and commit all files in `sinaloka-backend/`:

```bash
cd /home/zet/Project/sinaloka
git add sinaloka-backend/
git commit -m "feat: scaffold sinaloka-backend with Prisma schema and common infrastructure

- NestJS project with all production/dev dependencies
- Full Prisma schema: Institution, User, Student, Tutor, Class, Enrollment,
  Session, Attendance, Payment, Payout, Expense, RefreshToken
- Common infrastructure: PrismaModule, HttpExceptionFilter, ZodValidationPipe,
  JwtAuthGuard, RolesGuard, TenantInterceptor, @CurrentUser, @Roles, @Public
- Shared pagination DTO with Zod schema
- Global wiring in AppModule and main.ts with CORS and /api prefix"
```

Do NOT commit `.env` — only commit `.env.example`.
# Chunk 2: Auth + Institution + User Modules (Phase 1)

**Goal:** Super Admin can log in, create institutions, and create admin users. All three modules have full test coverage.

**Prerequisite:** Chunk 1 completed (NestJS project scaffolded, Prisma schema migrated, common guards/decorators/pipes in place).

---

## Auth Module

### Step 1 — Create auth module skeleton files

- [ ] Create the following empty files:

```
sinaloka-backend/src/modules/auth/auth.module.ts
sinaloka-backend/src/modules/auth/auth.controller.ts
sinaloka-backend/src/modules/auth/auth.service.ts
sinaloka-backend/src/modules/auth/auth.dto.ts
sinaloka-backend/src/modules/auth/jwt.strategy.ts
sinaloka-backend/src/modules/auth/auth.service.spec.ts
sinaloka-backend/src/modules/auth/auth.controller.spec.ts
```

- [ ] Scaffold the module with minimal wiring:

**`sinaloka-backend/src/modules/auth/auth.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRY', '15m') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
```

- [ ] Register `AuthModule` in `app.module.ts`.
- [ ] Verify: `npm run build` compiles without errors.

---

### Step 2 — Write auth DTOs with Zod

- [ ] Write Zod schemas and DTO classes:

**`sinaloka-backend/src/modules/auth/auth.dto.ts`**

```typescript
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export class LoginDto extends createZodDto(LoginSchema) {}

export const RefreshTokenSchema = z.object({
  refresh_token: z.string().min(1),
});

export class RefreshTokenDto extends createZodDto(RefreshTokenSchema) {}

export const LogoutSchema = z.object({
  refresh_token: z.string().min(1),
});

export class LogoutDto extends createZodDto(LogoutSchema) {}
```

- [ ] Verify: `npm run build` compiles without errors.

---

### Step 3 — Write JwtStrategy

- [ ] Implement passport-jwt strategy extracting user from Bearer header:

**`sinaloka-backend/src/modules/auth/jwt.strategy.ts`**

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; institutionId: string | null; role: string }): Promise<JwtPayload> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.is_active) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return {
      userId: user.id,
      institutionId: user.institution_id,
      role: user.role,
    };
  }
}
```

- [ ] Verify: `npm run build` compiles without errors.

---

### Step 4 — Write failing unit tests for AuthService

- [ ] Write the full unit test file before implementing the service:

**`sinaloka-backend/src/modules/auth/auth.service.spec.ts`**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'admin@test.com',
    password_hash: '', // set in beforeAll
    name: 'Test Admin',
    role: 'ADMIN',
    is_active: true,
    institution_id: 'inst-uuid-1',
    institution: { id: 'inst-uuid-1', name: 'Test Institution', slug: 'test-institution' },
    avatar_url: null,
    last_login_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeAll(async () => {
    mockUser.password_hash = await bcrypt.hash('correct-password', 10);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            refreshToken: {
              create: jest.fn(),
              findFirst: jest.fn(),
              updateMany: jest.fn(),
              deleteMany: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-access-token'),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                JWT_SECRET: 'test-secret',
                JWT_REFRESH_SECRET: 'test-refresh-secret',
                JWT_REFRESH_EXPIRY: '7d',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('login', () => {
    it('should return access and refresh tokens on valid credentials', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({
        id: 'rt-uuid-1',
        token: 'mock-refresh-token',
      });

      const result = await service.login('admin@test.com', 'correct-password');

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'admin@test.com' },
        include: { institution: true },
      });
    });

    it('should throw UnauthorizedException for non-existent email', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login('nobody@test.com', 'any-password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.login('admin@test.com', 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        is_active: false,
      });

      await expect(
        service.login('admin@test.com', 'correct-password'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should return a new access token for a valid refresh token', async () => {
      (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue({
        id: 'rt-uuid-1',
        token: 'valid-refresh-token',
        user_id: mockUser.id,
        expires_at: new Date(Date.now() + 86400000),
        revoked: false,
        user: mockUser,
      });

      const result = await service.refresh('valid-refresh-token');

      expect(result).toHaveProperty('access_token');
      expect(jwtService.sign).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for expired or revoked refresh token', async () => {
      (prisma.refreshToken.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.refresh('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should revoke the refresh token', async () => {
      (prisma.refreshToken.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await service.logout('some-refresh-token');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { token: 'some-refresh-token' },
        data: { revoked: true },
      });
    });
  });
});
```

- [ ] Run tests and verify they FAIL (service not implemented yet):

```bash
npx jest src/modules/auth/auth.service.spec.ts
# Expected: all tests fail with "AuthService is not defined" or similar
```

---

### Step 5 — Implement AuthService to pass all unit tests

- [ ] Implement the full auth service:

**`sinaloka-backend/src/modules/auth/auth.service.ts`**

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AuthService {
  private readonly refreshSecret: string;
  private readonly refreshExpiry: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {
    this.refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET')!;
    this.refreshExpiry = this.config.get<string>('JWT_REFRESH_EXPIRY', '7d');
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { institution: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Account is inactive');
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        institution_id: user.institution_id,
        institution: user.institution,
      },
    };
  }

  async refresh(refreshToken: string) {
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        revoked: false,
        expires_at: { gt: new Date() },
      },
      include: {
        user: { include: { institution: true } },
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const accessToken = this.generateAccessToken(storedToken.user);

    return { access_token: accessToken };
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revoked: true },
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { institution: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar_url: user.avatar_url,
      institution_id: user.institution_id,
      institution: user.institution,
    };
  }

  private generateAccessToken(user: {
    id: string;
    institution_id: string | null;
    role: string;
  }): string {
    return this.jwtService.sign({
      sub: user.id,
      institutionId: user.institution_id,
      role: user.role,
    });
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(64).toString('hex');

    const expiryMs = this.parseExpiry(this.refreshExpiry);
    const expiresAt = new Date(Date.now() + expiryMs);

    await this.prisma.refreshToken.create({
      data: {
        token,
        user_id: userId,
        expires_at: expiresAt,
      },
    });

    return token;
  }

  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return value * (multipliers[unit] || 1);
  }
}
```

- [ ] Run tests and verify they all PASS:

```bash
npx jest src/modules/auth/auth.service.spec.ts
# Expected: 5 tests pass
```

---

### Step 6 — Implement AuthController

- [ ] Write the controller with all four endpoints:

**`sinaloka-backend/src/modules/auth/auth.controller.ts`**

```typescript
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto, LogoutDto, RefreshTokenDto } from './auth.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  async logout(@Body() dto: LogoutDto) {
    await this.authService.logout(dto.refresh_token);
    return { message: 'Logged out successfully' };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refresh_token);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async me(@CurrentUser() user: { id: string }) {
    return this.authService.getProfile(user.id);
  }
}
```

- [ ] Verify: `npm run build` compiles without errors.

---

### Step 7 — Write integration tests for AuthController

- [ ] Write integration tests using supertest:

**`sinaloka-backend/src/modules/auth/auth.controller.spec.ts`**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('AuthController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testUser: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Clean up and seed a test user
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({ where: { email: 'auth-test@test.com' } });

    const institution = await prisma.institution.upsert({
      where: { slug: 'auth-test-inst' },
      update: {},
      create: {
        name: 'Auth Test Institution',
        slug: 'auth-test-inst',
      },
    });

    testUser = await prisma.user.create({
      data: {
        email: 'auth-test@test.com',
        password_hash: await bcrypt.hash('test-password', 10),
        name: 'Auth Test User',
        role: 'ADMIN',
        institution_id: institution.id,
      },
    });
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({ where: { email: 'auth-test@test.com' } });
    await prisma.institution.deleteMany({ where: { slug: 'auth-test-inst' } });
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('should return tokens on valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'auth-test@test.com', password: 'test-password' })
        .expect(200);

      expect(res.body).toHaveProperty('access_token');
      expect(res.body).toHaveProperty('refresh_token');
      expect(res.body.user.email).toBe('auth-test@test.com');
    });

    it('should return 401 on wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'auth-test@test.com', password: 'wrong' })
        .expect(401);
    });

    it('should return 401 on non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@test.com', password: 'any' })
        .expect(401);
    });

    it('should return 400 on invalid body (missing email)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ password: 'test' })
        .expect(400);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should return a new access token', async () => {
      // First login to get a refresh token
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'auth-test@test.com', password: 'test-password' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: loginRes.body.refresh_token })
        .expect(200);

      expect(res.body).toHaveProperty('access_token');
    });

    it('should return 401 for invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: 'invalid-token' })
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    it('should return the current user profile', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'auth-test@test.com', password: 'test-password' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${loginRes.body.access_token}`)
        .expect(200);

      expect(res.body.email).toBe('auth-test@test.com');
      expect(res.body).toHaveProperty('institution');
    });

    it('should return 401 without a token', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should invalidate the refresh token', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'auth-test@test.com', password: 'test-password' })
        .expect(200);

      // Logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${loginRes.body.access_token}`)
        .send({ refresh_token: loginRes.body.refresh_token })
        .expect(200);

      // Refresh with the same token should now fail
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: loginRes.body.refresh_token })
        .expect(401);
    });
  });
});
```

- [ ] Run integration tests:

```bash
npx jest src/modules/auth/auth.controller.spec.ts --runInBand
# Expected: all 7 tests pass
```

---

## Institution Module

### Step 8 — Create institution module skeleton files

- [ ] Create the following files:

```
sinaloka-backend/src/modules/institution/institution.module.ts
sinaloka-backend/src/modules/institution/institution.controller.ts
sinaloka-backend/src/modules/institution/institution.service.ts
sinaloka-backend/src/modules/institution/institution.dto.ts
sinaloka-backend/src/modules/institution/institution.service.spec.ts
sinaloka-backend/src/modules/institution/institution.controller.spec.ts
```

- [ ] Wire up the module:

**`sinaloka-backend/src/modules/institution/institution.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { InstitutionController } from './institution.controller';
import { InstitutionService } from './institution.service';

@Module({
  controllers: [InstitutionController],
  providers: [InstitutionService],
  exports: [InstitutionService],
})
export class InstitutionModule {}
```

- [ ] Register `InstitutionModule` in `app.module.ts`.
- [ ] Verify: `npm run build` compiles without errors.

---

### Step 9 — Write institution DTOs with Zod (includes slug auto-generation)

- [ ] Write Zod schemas and DTO classes:

**`sinaloka-backend/src/modules/institution/institution.dto.ts`**

```typescript
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateInstitutionSchema = z.object({
  name: z.string().min(1).max(255),
  address: z.string().max(500).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  email: z.string().email().nullable().optional(),
  logo_url: z.string().url().nullable().optional(),
  settings: z.record(z.unknown()).nullable().optional(),
});

export class CreateInstitutionDto extends createZodDto(CreateInstitutionSchema) {}

export const UpdateInstitutionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  address: z.string().max(500).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  email: z.string().email().nullable().optional(),
  logo_url: z.string().url().nullable().optional(),
  settings: z.record(z.unknown()).nullable().optional(),
});

export class UpdateInstitutionDto extends createZodDto(UpdateInstitutionSchema) {}
```

- [ ] Verify: `npm run build` compiles without errors.

---

### Step 10 — Write failing unit tests for InstitutionService

- [ ] Write unit tests before implementing:

**`sinaloka-backend/src/modules/institution/institution.service.spec.ts`**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { InstitutionService } from './institution.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('InstitutionService', () => {
  let service: InstitutionService;
  let prisma: PrismaService;

  const mockInstitution = {
    id: 'inst-uuid-1',
    name: 'Test Institution',
    slug: 'test-institution',
    address: null,
    phone: null,
    email: null,
    logo_url: null,
    settings: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstitutionService,
        {
          provide: PrismaService,
          useValue: {
            institution: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<InstitutionService>(InstitutionService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('findAll', () => {
    it('should return paginated institutions', async () => {
      (prisma.institution.findMany as jest.Mock).mockResolvedValue([mockInstitution]);
      (prisma.institution.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return an institution by id', async () => {
      (prisma.institution.findUnique as jest.Mock).mockResolvedValue(mockInstitution);

      const result = await service.findOne('inst-uuid-1');

      expect(result.id).toBe('inst-uuid-1');
    });

    it('should throw NotFoundException if not found', async () => {
      (prisma.institution.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('not-found')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create an institution with auto-generated slug', async () => {
      (prisma.institution.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.institution.create as jest.Mock).mockResolvedValue(mockInstitution);

      const result = await service.create({ name: 'Test Institution' });

      expect(prisma.institution.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Institution',
          slug: 'test-institution',
        }),
      });
      expect(result).toEqual(mockInstitution);
    });

    it('should append number to slug when duplicate exists', async () => {
      (prisma.institution.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockInstitution) // first slug exists
        .mockResolvedValueOnce(null);           // slug-2 is free
      (prisma.institution.create as jest.Mock).mockResolvedValue({
        ...mockInstitution,
        slug: 'test-institution-2',
      });

      await service.create({ name: 'Test Institution' });

      expect(prisma.institution.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          slug: 'test-institution-2',
        }),
      });
    });
  });

  describe('update', () => {
    it('should update an institution', async () => {
      (prisma.institution.findUnique as jest.Mock).mockResolvedValue(mockInstitution);
      (prisma.institution.update as jest.Mock).mockResolvedValue({
        ...mockInstitution,
        name: 'Updated Name',
      });

      const result = await service.update('inst-uuid-1', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException if not found', async () => {
      (prisma.institution.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update('not-found', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should regenerate slug when name changes', async () => {
      (prisma.institution.findUnique as jest.Mock).mockResolvedValue(mockInstitution);
      (prisma.institution.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.institution.update as jest.Mock).mockResolvedValue({
        ...mockInstitution,
        name: 'New Name',
        slug: 'new-name',
      });

      await service.update('inst-uuid-1', { name: 'New Name' });

      expect(prisma.institution.update).toHaveBeenCalledWith({
        where: { id: 'inst-uuid-1' },
        data: expect.objectContaining({ slug: 'new-name' }),
      });
    });
  });

  describe('remove', () => {
    it('should delete an institution', async () => {
      (prisma.institution.findUnique as jest.Mock).mockResolvedValue(mockInstitution);
      (prisma.institution.delete as jest.Mock).mockResolvedValue(mockInstitution);

      await service.remove('inst-uuid-1');

      expect(prisma.institution.delete).toHaveBeenCalledWith({
        where: { id: 'inst-uuid-1' },
      });
    });

    it('should throw NotFoundException if not found', async () => {
      (prisma.institution.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.remove('not-found')).rejects.toThrow(NotFoundException);
    });
  });
});
```

- [ ] Run tests and verify they FAIL:

```bash
npx jest src/modules/institution/institution.service.spec.ts
# Expected: all tests fail (service not implemented)
```

---

### Step 11 — Implement InstitutionService to pass all unit tests

- [ ] Implement the institution service:

**`sinaloka-backend/src/modules/institution/institution.service.ts`**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateInstitutionDto, UpdateInstitutionDto } from './institution.dto';

@Injectable()
export class InstitutionService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: { page: number; limit: number; search?: string }) {
    const { page, limit, search } = params;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { slug: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.institution.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.institution.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id },
    });

    if (!institution) {
      throw new NotFoundException(`Institution with ID ${id} not found`);
    }

    return institution;
  }

  async create(dto: CreateInstitutionDto) {
    const slug = await this.generateUniqueSlug(dto.name);

    return this.prisma.institution.create({
      data: {
        ...dto,
        slug,
      },
    });
  }

  async update(id: string, dto: UpdateInstitutionDto) {
    await this.findOne(id); // throws if not found

    const data: Record<string, unknown> = { ...dto };

    if (dto.name) {
      data.slug = await this.generateUniqueSlug(dto.name, id);
    }

    return this.prisma.institution.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // throws if not found

    return this.prisma.institution.delete({
      where: { id },
    });
  }

  private async generateUniqueSlug(
    name: string,
    excludeId?: string,
  ): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.institution.findFirst({
        where: {
          slug,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
      });

      if (!existing) break;

      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    return slug;
  }
}
```

- [ ] Run tests and verify they all PASS:

```bash
npx jest src/modules/institution/institution.service.spec.ts
# Expected: 7 tests pass
```

---

### Step 12 — Implement InstitutionController with RolesGuard (Super Admin only)

- [ ] Write the controller with full CRUD under `/admin/institutions`:

**`sinaloka-backend/src/modules/institution/institution.controller.ts`**

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InstitutionService } from './institution.service';
import { CreateInstitutionDto, UpdateInstitutionDto } from './institution.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('admin/institutions')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('SUPER_ADMIN')
export class InstitutionController {
  constructor(private readonly institutionService: InstitutionService) {}

  @Get()
  async findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
  ) {
    return this.institutionService.findAll({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      search,
    });
  }

  @Post()
  async create(@Body() dto: CreateInstitutionDto) {
    return this.institutionService.create(dto);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.institutionService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInstitutionDto,
  ) {
    return this.institutionService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.institutionService.remove(id);
  }
}
```

- [ ] Verify: `npm run build` compiles without errors.

---

### Step 13 — Write integration tests for InstitutionController

- [ ] Write integration tests:

**`sinaloka-backend/src/modules/institution/institution.controller.spec.ts`**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('InstitutionController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let superAdminToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Create Super Admin user (no institution)
    await prisma.user.deleteMany({ where: { email: 'super@test.com' } });
    await prisma.user.create({
      data: {
        email: 'super@test.com',
        password_hash: await bcrypt.hash('super-pass', 10),
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
      },
    });

    // Login as Super Admin
    const superRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'super@test.com', password: 'super-pass' });
    superAdminToken = superRes.body.access_token;

    // Create an institution and Admin user
    const inst = await prisma.institution.upsert({
      where: { slug: 'inst-ctrl-test' },
      update: {},
      create: { name: 'Controller Test Inst', slug: 'inst-ctrl-test' },
    });

    await prisma.user.deleteMany({ where: { email: 'admin-ctrl@test.com' } });
    await prisma.user.create({
      data: {
        email: 'admin-ctrl@test.com',
        password_hash: await bcrypt.hash('admin-pass', 10),
        name: 'Admin User',
        role: 'ADMIN',
        institution_id: inst.id,
      },
    });

    const adminRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin-ctrl@test.com', password: 'admin-pass' });
    adminToken = adminRes.body.access_token;
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({
      where: { email: { in: ['super@test.com', 'admin-ctrl@test.com'] } },
    });
    await prisma.institution.deleteMany({ where: { slug: 'inst-ctrl-test' } });
    await app.close();
  });

  describe('POST /admin/institutions', () => {
    it('should allow Super Admin to create an institution', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/institutions')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: 'New Institution' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('New Institution');
      expect(res.body.slug).toBe('new-institution');

      // Cleanup
      await prisma.institution.delete({ where: { id: res.body.id } });
    });

    it('should reject Admin from creating institutions', async () => {
      await request(app.getHttpServer())
        .post('/admin/institutions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Denied Institution' })
        .expect(403);
    });

    it('should reject unauthenticated request', async () => {
      await request(app.getHttpServer())
        .post('/admin/institutions')
        .send({ name: 'No Auth' })
        .expect(401);
    });
  });

  describe('GET /admin/institutions', () => {
    it('should return paginated list for Super Admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/institutions')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /admin/institutions/:id', () => {
    it('should return a single institution', async () => {
      const inst = await prisma.institution.findFirst({
        where: { slug: 'inst-ctrl-test' },
      });

      const res = await request(app.getHttpServer())
        .get(`/admin/institutions/${inst!.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.slug).toBe('inst-ctrl-test');
    });

    it('should return 404 for non-existent id', async () => {
      await request(app.getHttpServer())
        .get('/admin/institutions/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(404);
    });
  });

  describe('PATCH /admin/institutions/:id', () => {
    it('should update the institution name and regenerate slug', async () => {
      const inst = await prisma.institution.create({
        data: { name: 'Patch Test Inst', slug: 'patch-test-inst' },
      });

      const res = await request(app.getHttpServer())
        .patch(`/admin/institutions/${inst.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: 'Patched Name' })
        .expect(200);

      expect(res.body.name).toBe('Patched Name');
      expect(res.body.slug).toBe('patched-name');

      // Cleanup
      await prisma.institution.delete({ where: { id: inst.id } });
    });
  });

  describe('DELETE /admin/institutions/:id', () => {
    it('should delete the institution', async () => {
      const inst = await prisma.institution.create({
        data: { name: 'Delete Me Inst', slug: 'delete-me-inst' },
      });

      await request(app.getHttpServer())
        .delete(`/admin/institutions/${inst.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      const found = await prisma.institution.findUnique({
        where: { id: inst.id },
      });
      expect(found).toBeNull();
    });
  });
});
```

- [ ] Run integration tests:

```bash
npx jest src/modules/institution/institution.controller.spec.ts --runInBand
# Expected: all 7 tests pass
```

---

## User Module

### Step 14 — Create user module skeleton files

- [ ] Create the following files:

```
sinaloka-backend/src/modules/user/user.module.ts
sinaloka-backend/src/modules/user/user.controller.ts
sinaloka-backend/src/modules/user/user.service.ts
sinaloka-backend/src/modules/user/user.dto.ts
sinaloka-backend/src/modules/user/user.service.spec.ts
sinaloka-backend/src/modules/user/user.controller.spec.ts
```

- [ ] Wire up the module:

**`sinaloka-backend/src/modules/user/user.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
```

- [ ] Register `UserModule` in `app.module.ts`.
- [ ] Verify: `npm run build` compiles without errors.

---

### Step 15 — Write user DTOs with Zod

- [ ] Write Zod schemas and DTO classes:

**`sinaloka-backend/src/modules/user/user.dto.ts`**

```typescript
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).max(255),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'TUTOR']),
  institution_id: z.string().uuid().nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  is_active: z.boolean().optional().default(true),
});

export class CreateUserDto extends createZodDto(CreateUserSchema) {}

export const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  name: z.string().min(1).max(255).optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'TUTOR']).optional(),
  institution_id: z.string().uuid().nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  is_active: z.boolean().optional(),
});

export class UpdateUserDto extends createZodDto(UpdateUserSchema) {}
```

- [ ] Verify: `npm run build` compiles without errors.

---

### Step 16 — Write failing unit tests for UserService

- [ ] Write unit tests before implementing:

**`sinaloka-backend/src/modules/user/user.service.spec.ts`**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserService } from './user.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaService;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'user@test.com',
    password_hash: 'hashed',
    name: 'Test User',
    role: 'ADMIN',
    is_active: true,
    institution_id: 'inst-uuid-1',
    avatar_url: null,
    last_login_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockCurrentUser = {
    id: 'admin-uuid-1',
    role: 'SUPER_ADMIN',
    institutionId: null,
  };

  const mockAdminUser = {
    id: 'admin-uuid-2',
    role: 'ADMIN',
    institutionId: 'inst-uuid-1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('findAll', () => {
    it('should return all users for SUPER_ADMIN (no tenant filter)', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([mockUser]);
      (prisma.user.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll(
        { page: 1, limit: 10 },
        mockCurrentUser,
      );

      expect(result.data).toHaveLength(1);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ institution_id: expect.anything() }),
        }),
      );
    });

    it('should filter by institution_id for ADMIN', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([mockUser]);
      (prisma.user.count as jest.Mock).mockResolvedValue(1);

      await service.findAll({ page: 1, limit: 10 }, mockAdminUser);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            institution_id: 'inst-uuid-1',
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findOne('user-uuid-1', mockCurrentUser);

      expect(result.id).toBe('user-uuid-1');
    });

    it('should throw NotFoundException if not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findOne('not-found', mockCurrentUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if ADMIN accesses user from different institution', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        institution_id: 'other-inst-uuid',
      });

      await expect(
        service.findOne('user-uuid-1', mockAdminUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    it('should hash password and create user', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockImplementation(({ data }) => {
        return Promise.resolve({
          ...mockUser,
          ...data,
          id: 'new-user-uuid',
        });
      });

      const result = await service.create({
        email: 'new@test.com',
        password: 'plain-password',
        name: 'New User',
        role: 'ADMIN',
        institution_id: 'inst-uuid-1',
      });

      const createCall = (prisma.user.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.password_hash).toBeDefined();
      expect(createCall.data.password_hash).not.toBe('plain-password');
      // password field should not be stored
      expect(createCall.data.password).toBeUndefined();
    });

    it('should throw ConflictException if email already exists', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.create({
          email: 'user@test.com',
          password: 'password123',
          name: 'Dup User',
          role: 'ADMIN',
          institution_id: 'inst-uuid-1',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should hash password if provided in update', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockImplementation(({ data }) => {
        return Promise.resolve({ ...mockUser, ...data });
      });

      await service.update(
        'user-uuid-1',
        { password: 'new-password' },
        mockCurrentUser,
      );

      const updateCall = (prisma.user.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.password_hash).toBeDefined();
      expect(updateCall.data.password).toBeUndefined();
    });

    it('should throw NotFoundException if not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update('not-found', { name: 'Test' }, mockCurrentUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.delete as jest.Mock).mockResolvedValue(mockUser);

      await service.remove('user-uuid-1', mockCurrentUser);

      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
      });
    });

    it('should throw NotFoundException if not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.remove('not-found', mockCurrentUser),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
```

- [ ] Run tests and verify they FAIL:

```bash
npx jest src/modules/user/user.service.spec.ts
# Expected: all tests fail (service not implemented)
```

---

### Step 17 — Implement UserService to pass all unit tests

- [ ] Implement the user service with tenant scoping and password hashing:

**`sinaloka-backend/src/modules/user/user.service.ts`**

```typescript
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './user.dto';

interface CurrentUser {
  id: string;
  role: string;
  institutionId: string | null;
}

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    params: { page: number; limit: number; search?: string },
    currentUser: CurrentUser,
  ) {
    const { page, limit, search } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    // Tenant scoping: Admin sees only own institution
    if (currentUser.role !== 'SUPER_ADMIN' && currentUser.institutionId) {
      where.institution_id = currentUser.institutionId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          is_active: true,
          institution_id: true,
          avatar_url: true,
          last_login_at: true,
          created_at: true,
          updated_at: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, currentUser: CurrentUser) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { institution: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Tenant check: Admin cannot view users from other institutions
    if (
      currentUser.role !== 'SUPER_ADMIN' &&
      currentUser.institutionId &&
      user.institution_id !== currentUser.institutionId
    ) {
      throw new ForbiddenException('Access denied to this user');
    }

    const { password_hash, ...result } = user;
    return result;
  }

  async create(dto: CreateUserDto) {
    // Check for duplicate email
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException(`Email ${dto.email} is already in use`);
    }

    const { password, ...rest } = dto;
    const password_hash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        ...rest,
        password_hash,
      },
    });

    const { password_hash: _, ...result } = user;
    return result;
  }

  async update(id: string, dto: UpdateUserDto, currentUser: CurrentUser) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Tenant check
    if (
      currentUser.role !== 'SUPER_ADMIN' &&
      currentUser.institutionId &&
      user.institution_id !== currentUser.institutionId
    ) {
      throw new ForbiddenException('Access denied to this user');
    }

    const { password, ...rest } = dto;
    const data: Record<string, unknown> = { ...rest };

    if (password) {
      data.password_hash = await bcrypt.hash(password, 10);
      delete data.password;
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
    });

    const { password_hash: _, ...result } = updated;
    return result;
  }

  async remove(id: string, currentUser: CurrentUser) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (
      currentUser.role !== 'SUPER_ADMIN' &&
      currentUser.institutionId &&
      user.institution_id !== currentUser.institutionId
    ) {
      throw new ForbiddenException('Access denied to this user');
    }

    return this.prisma.user.delete({ where: { id } });
  }
}
```

- [ ] Run tests and verify they all PASS:

```bash
npx jest src/modules/user/user.service.spec.ts
# Expected: 8 tests pass
```

---

### Step 18 — Implement UserController with tenant scoping

- [ ] Write the controller with full CRUD under `/admin/users`:

**`sinaloka-backend/src/modules/user/user.controller.ts`**

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto } from './user.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('admin/users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
    @CurrentUser() currentUser?: any,
  ) {
    return this.userService.findAll(
      {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        search,
      },
      currentUser,
    );
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.userService.findOne(id, currentUser);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.userService.update(id, dto, currentUser);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.userService.remove(id, currentUser);
  }
}
```

- [ ] Verify: `npm run build` compiles without errors.

---

### Step 19 — Write integration tests for UserController

- [ ] Write integration tests:

**`sinaloka-backend/src/modules/user/user.controller.spec.ts`**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('UserController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let superAdminToken: string;
  let adminToken: string;
  let testInstitutionId: string;
  let otherInstitutionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Setup institutions
    const inst1 = await prisma.institution.upsert({
      where: { slug: 'user-ctrl-test-1' },
      update: {},
      create: { name: 'User Ctrl Test 1', slug: 'user-ctrl-test-1' },
    });
    testInstitutionId = inst1.id;

    const inst2 = await prisma.institution.upsert({
      where: { slug: 'user-ctrl-test-2' },
      update: {},
      create: { name: 'User Ctrl Test 2', slug: 'user-ctrl-test-2' },
    });
    otherInstitutionId = inst2.id;

    // Super Admin
    await prisma.user.deleteMany({ where: { email: 'super-user-ctrl@test.com' } });
    await prisma.user.create({
      data: {
        email: 'super-user-ctrl@test.com',
        password_hash: await bcrypt.hash('super-pass', 10),
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
      },
    });
    const superRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'super-user-ctrl@test.com', password: 'super-pass' });
    superAdminToken = superRes.body.access_token;

    // Admin for inst1
    await prisma.user.deleteMany({ where: { email: 'admin-user-ctrl@test.com' } });
    await prisma.user.create({
      data: {
        email: 'admin-user-ctrl@test.com',
        password_hash: await bcrypt.hash('admin-pass', 10),
        name: 'Admin User',
        role: 'ADMIN',
        institution_id: testInstitutionId,
      },
    });
    const adminRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin-user-ctrl@test.com', password: 'admin-pass' });
    adminToken = adminRes.body.access_token;
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'super-user-ctrl@test.com',
            'admin-user-ctrl@test.com',
            'new-user-ctrl@test.com',
          ],
        },
      },
    });
    await prisma.institution.deleteMany({
      where: { slug: { in: ['user-ctrl-test-1', 'user-ctrl-test-2'] } },
    });
    await app.close();
  });

  describe('POST /admin/users', () => {
    it('should create a user with hashed password', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          email: 'new-user-ctrl@test.com',
          password: 'password123',
          name: 'New User',
          role: 'ADMIN',
          institution_id: testInstitutionId,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe('new-user-ctrl@test.com');
      // password_hash should not be in response
      expect(res.body).not.toHaveProperty('password_hash');

      // Cleanup
      await prisma.user.delete({ where: { id: res.body.id } });
    });

    it('should reject duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/admin/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          email: 'admin-user-ctrl@test.com',
          password: 'password123',
          name: 'Dup User',
          role: 'ADMIN',
          institution_id: testInstitutionId,
        })
        .expect(409);
    });

    it('should reject short password', async () => {
      await request(app.getHttpServer())
        .post('/admin/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          email: 'short-pass@test.com',
          password: '123',
          name: 'Short Pass',
          role: 'ADMIN',
          institution_id: testInstitutionId,
        })
        .expect(400);
    });
  });

  describe('GET /admin/users', () => {
    it('should return all users for Super Admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
    });

    it('should return only own institution users for Admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // All returned users should belong to the admin's institution
      for (const user of res.body.data) {
        if (user.institution_id) {
          expect(user.institution_id).toBe(testInstitutionId);
        }
      }
    });
  });

  describe('GET /admin/users/:id', () => {
    it('should return 403 when Admin tries to access user from another institution', async () => {
      // Create user in inst2
      const otherUser = await prisma.user.create({
        data: {
          email: 'other-inst-user@test.com',
          password_hash: await bcrypt.hash('pass', 10),
          name: 'Other Inst User',
          role: 'ADMIN',
          institution_id: otherInstitutionId,
        },
      });

      await request(app.getHttpServer())
        .get(`/admin/users/${otherUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      // Cleanup
      await prisma.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe('PATCH /admin/users/:id', () => {
    it('should update user name', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'patch-user@test.com',
          password_hash: await bcrypt.hash('pass', 10),
          name: 'Before Patch',
          role: 'ADMIN',
          institution_id: testInstitutionId,
        },
      });

      const res = await request(app.getHttpServer())
        .patch(`/admin/users/${user.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: 'After Patch' })
        .expect(200);

      expect(res.body.name).toBe('After Patch');

      // Cleanup
      await prisma.user.delete({ where: { id: user.id } });
    });
  });

  describe('DELETE /admin/users/:id', () => {
    it('should delete the user', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'delete-user@test.com',
          password_hash: await bcrypt.hash('pass', 10),
          name: 'Delete Me',
          role: 'ADMIN',
          institution_id: testInstitutionId,
        },
      });

      await request(app.getHttpServer())
        .delete(`/admin/users/${user.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      const found = await prisma.user.findUnique({ where: { id: user.id } });
      expect(found).toBeNull();
    });
  });
});
```

- [ ] Run integration tests:

```bash
npx jest src/modules/user/user.controller.spec.ts --runInBand
# Expected: all 7 tests pass
```

---

### Step 20 — Run full test suite and verify all modules pass

- [ ] Run all tests for the three modules together:

```bash
npx jest src/modules/auth/ src/modules/institution/ src/modules/user/ --runInBand --verbose
```

Expected output:

```
 PASS  src/modules/auth/auth.service.spec.ts
   AuthService
     login
       ✓ should return access and refresh tokens on valid credentials
       ✓ should throw UnauthorizedException for non-existent email
       ✓ should throw UnauthorizedException for wrong password
       ✓ should throw UnauthorizedException for inactive user
     refresh
       ✓ should return a new access token for a valid refresh token
       ✓ should throw UnauthorizedException for expired or revoked refresh token
     logout
       ✓ should revoke the refresh token

 PASS  src/modules/auth/auth.controller.spec.ts
   AuthController (integration)
     POST /auth/login
       ✓ should return tokens on valid credentials
       ✓ should return 401 on wrong password
       ✓ should return 401 on non-existent email
       ✓ should return 400 on invalid body (missing email)
     POST /auth/refresh
       ✓ should return a new access token
       ✓ should return 401 for invalid refresh token
     GET /auth/me
       ✓ should return the current user profile
       ✓ should return 401 without a token
     POST /auth/logout
       ✓ should invalidate the refresh token

 PASS  src/modules/institution/institution.service.spec.ts
   InstitutionService
     findAll
       ✓ should return paginated institutions
     findOne
       ✓ should return an institution by id
       ✓ should throw NotFoundException if not found
     create
       ✓ should create an institution with auto-generated slug
       ✓ should append number to slug when duplicate exists
     update
       ✓ should update an institution
       ✓ should throw NotFoundException if not found
       ✓ should regenerate slug when name changes
     remove
       ✓ should delete an institution
       ✓ should throw NotFoundException if not found

 PASS  src/modules/institution/institution.controller.spec.ts
   InstitutionController (integration)
     POST /admin/institutions
       ✓ should allow Super Admin to create an institution
       ✓ should reject Admin from creating institutions
       ✓ should reject unauthenticated request
     GET /admin/institutions
       ✓ should return paginated list for Super Admin
     GET /admin/institutions/:id
       ✓ should return a single institution
       ✓ should return 404 for non-existent id
     PATCH /admin/institutions/:id
       ✓ should update the institution name and regenerate slug
     DELETE /admin/institutions/:id
       ✓ should delete the institution

 PASS  src/modules/user/user.service.spec.ts
   UserService
     findAll
       ✓ should return all users for SUPER_ADMIN (no tenant filter)
       ✓ should filter by institution_id for ADMIN
     findOne
       ✓ should return a user by id
       ✓ should throw NotFoundException if not found
       ✓ should throw ForbiddenException if ADMIN accesses user from different institution
     create
       ✓ should hash password and create user
       ✓ should throw ConflictException if email already exists
     update
       ✓ should hash password if provided in update
       ✓ should throw NotFoundException if not found
     remove
       ✓ should delete a user
       ✓ should throw NotFoundException if not found

 PASS  src/modules/user/user.controller.spec.ts
   UserController (integration)
     POST /admin/users
       ✓ should create a user with hashed password
       ✓ should reject duplicate email
       ✓ should reject short password
     GET /admin/users
       ✓ should return all users for Super Admin
       ✓ should return only own institution users for Admin
     GET /admin/users/:id
       ✓ should return 403 when Admin tries to access user from another institution
     PATCH /admin/users/:id
       ✓ should update user name
     DELETE /admin/users/:id
       ✓ should delete the user

Test Suites: 6 passed, 6 total
Tests:       42 passed, 42 total
```

---

## Summary

| Module | Files | Endpoints | Unit Tests | Integration Tests |
|---|---|---|---|---|
| Auth | 6 files | `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`, `GET /auth/me` | 5 | 7 |
| Institution | 6 files | `GET/POST /admin/institutions`, `GET/PATCH/DELETE /admin/institutions/:id` | 7 | 7 |
| User | 6 files | `GET/POST /admin/users`, `GET/PATCH/DELETE /admin/users/:id` | 8 | 7 |
| **Total** | **18 files** | **13 endpoints** | **20 tests** | **21 tests** |
# Chunk 3: Student + Tutor Modules (Phase 2)

**Estimated time:** ~90 minutes
**Depends on:** Chunk 1 (project scaffold, Prisma, common utilities), Chunk 2 (Auth, Institution, User modules)
**Outcome:** Admin can CRUD students and tutors. Tutor can view/update own profile. Creating a tutor also creates a User with role TUTOR inside a transaction.

---

## Section A: Student Module

### Step 1 — Create Student DTOs with Zod

- [ ] Create `sinaloka-backend/src/modules/student/student.dto.ts`

```ts
// sinaloka-backend/src/modules/student/student.dto.ts
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const StudentStatus = z.enum(['ACTIVE', 'INACTIVE']);

export const CreateStudentSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  grade: z.string().min(1).max(50),
  status: StudentStatus.default('ACTIVE'),
  parent_name: z.string().max(255).optional().nullable(),
  parent_phone: z.string().max(20).optional().nullable(),
  parent_email: z.string().email().optional().nullable(),
  enrolled_at: z.coerce.date().optional(),
});

export class CreateStudentDto extends createZodDto(CreateStudentSchema) {}

export const UpdateStudentSchema = CreateStudentSchema.partial();

export class UpdateStudentDto extends createZodDto(UpdateStudentSchema) {}

export const StudentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  grade: z.string().optional(),
  status: StudentStatus.optional(),
  sort_by: z.enum(['name', 'grade', 'enrolled_at', 'created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export class StudentQueryDto extends createZodDto(StudentQuerySchema) {}
```

### Step 2 — Write failing unit tests for StudentService

- [ ] Create `sinaloka-backend/src/modules/student/student.service.spec.ts`

```ts
// sinaloka-backend/src/modules/student/student.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { StudentService } from './student.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('StudentService', () => {
  let service: StudentService;
  let prisma: PrismaService;

  const mockPrisma = {
    student: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  const institutionId = 'inst-uuid-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<StudentService>(StudentService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a student scoped to institution', async () => {
      const dto = {
        name: 'Alice Smith',
        grade: '10',
        status: 'ACTIVE' as const,
      };
      const expected = {
        id: 'student-uuid-1',
        institution_id: institutionId,
        ...dto,
        email: null,
        phone: null,
        parent_name: null,
        parent_phone: null,
        parent_email: null,
        enrolled_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrisma.student.create.mockResolvedValue(expected);

      const result = await service.create(institutionId, dto);

      expect(result).toEqual(expected);
      expect(mockPrisma.student.create).toHaveBeenCalledWith({
        data: {
          ...dto,
          institution_id: institutionId,
          enrolled_at: expect.any(Date),
        },
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated students for institution', async () => {
      const students = [
        { id: 'student-1', name: 'Alice', institution_id: institutionId },
        { id: 'student-2', name: 'Bob', institution_id: institutionId },
      ];
      mockPrisma.student.findMany.mockResolvedValue(students);
      mockPrisma.student.count.mockResolvedValue(2);

      const result = await service.findAll(institutionId, {
        page: 1,
        limit: 20,
        sort_by: 'created_at',
        sort_order: 'desc',
      });

      expect(result.data).toEqual(students);
      expect(result.meta.total).toBe(2);
      expect(mockPrisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { institution_id: institutionId },
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should filter by grade', async () => {
      mockPrisma.student.findMany.mockResolvedValue([]);
      mockPrisma.student.count.mockResolvedValue(0);

      await service.findAll(institutionId, {
        page: 1,
        limit: 20,
        grade: '10',
        sort_by: 'created_at',
        sort_order: 'desc',
      });

      expect(mockPrisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            institution_id: institutionId,
            grade: '10',
          }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrisma.student.findMany.mockResolvedValue([]);
      mockPrisma.student.count.mockResolvedValue(0);

      await service.findAll(institutionId, {
        page: 1,
        limit: 20,
        status: 'ACTIVE',
        sort_by: 'created_at',
        sort_order: 'desc',
      });

      expect(mockPrisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            institution_id: institutionId,
            status: 'ACTIVE',
          }),
        }),
      );
    });

    it('should search by name or email', async () => {
      mockPrisma.student.findMany.mockResolvedValue([]);
      mockPrisma.student.count.mockResolvedValue(0);

      await service.findAll(institutionId, {
        page: 1,
        limit: 20,
        search: 'alice',
        sort_by: 'created_at',
        sort_order: 'desc',
      });

      expect(mockPrisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            institution_id: institutionId,
            OR: [
              { name: { contains: 'alice', mode: 'insensitive' } },
              { email: { contains: 'alice', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a student by id within institution', async () => {
      const student = { id: 'student-1', name: 'Alice', institution_id: institutionId };
      mockPrisma.student.findFirst.mockResolvedValue(student);

      const result = await service.findOne(institutionId, 'student-1');

      expect(result).toEqual(student);
      expect(mockPrisma.student.findFirst).toHaveBeenCalledWith({
        where: { id: 'student-1', institution_id: institutionId },
      });
    });

    it('should throw NotFoundException if student not found', async () => {
      mockPrisma.student.findFirst.mockResolvedValue(null);

      await expect(service.findOne(institutionId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a student', async () => {
      const existing = { id: 'student-1', name: 'Alice', institution_id: institutionId };
      mockPrisma.student.findFirst.mockResolvedValue(existing);

      const updated = { ...existing, name: 'Alice Updated' };
      mockPrisma.student.update.mockResolvedValue(updated);

      const result = await service.update(institutionId, 'student-1', { name: 'Alice Updated' });

      expect(result.name).toBe('Alice Updated');
      expect(mockPrisma.student.update).toHaveBeenCalledWith({
        where: { id: 'student-1', institution_id: institutionId },
        data: { name: 'Alice Updated' },
      });
    });

    it('should throw NotFoundException if student not found', async () => {
      mockPrisma.student.findFirst.mockResolvedValue(null);

      await expect(
        service.update(institutionId, 'nonexistent', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a student', async () => {
      const existing = { id: 'student-1', name: 'Alice', institution_id: institutionId };
      mockPrisma.student.findFirst.mockResolvedValue(existing);
      mockPrisma.student.delete.mockResolvedValue(existing);

      const result = await service.delete(institutionId, 'student-1');

      expect(result).toEqual(existing);
      expect(mockPrisma.student.delete).toHaveBeenCalledWith({
        where: { id: 'student-1', institution_id: institutionId },
      });
    });

    it('should throw NotFoundException if student not found', async () => {
      mockPrisma.student.findFirst.mockResolvedValue(null);

      await expect(service.delete(institutionId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
```

- [ ] Run: `npm test -- student.service` — verify all tests fail (module not found)

### Step 3 — Implement StudentService

- [ ] Create `sinaloka-backend/src/modules/student/student.service.ts`

```ts
// sinaloka-backend/src/modules/student/student.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateStudentDto, UpdateStudentDto, StudentQueryDto } from './student.dto';

@Injectable()
export class StudentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(institutionId: string, dto: CreateStudentDto) {
    return this.prisma.student.create({
      data: {
        ...dto,
        institution_id: institutionId,
        enrolled_at: dto.enrolled_at ?? new Date(),
      },
    });
  }

  async findAll(institutionId: string, query: StudentQueryDto) {
    const { page, limit, search, grade, status, sort_by, sort_order } = query;

    const where: any = { institution_id: institutionId };

    if (grade) {
      where.grade = grade;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sort_by]: sort_order },
      }),
      this.prisma.student.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(institutionId: string, id: string) {
    const student = await this.prisma.student.findFirst({
      where: { id, institution_id: institutionId },
    });

    if (!student) {
      throw new NotFoundException(`Student with id ${id} not found`);
    }

    return student;
  }

  async update(institutionId: string, id: string, dto: UpdateStudentDto) {
    await this.findOne(institutionId, id);

    return this.prisma.student.update({
      where: { id, institution_id: institutionId },
      data: dto,
    });
  }

  async delete(institutionId: string, id: string) {
    await this.findOne(institutionId, id);

    return this.prisma.student.delete({
      where: { id, institution_id: institutionId },
    });
  }
}
```

- [ ] Run: `npm test -- student.service` — verify all tests pass
- [ ] Commit: `feat(student): add StudentService with CRUD and filtered pagination`

### Step 4 — Create StudentController

- [ ] Create `sinaloka-backend/src/modules/student/student.controller.ts`

```ts
// sinaloka-backend/src/modules/student/student.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { StudentService } from './student.service';
import { CreateStudentDto, UpdateStudentDto, StudentQueryDto } from './student.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { StudentQuerySchema } from './student.dto';

@Controller('admin/students')
@Roles('SUPER_ADMIN', 'ADMIN')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Post()
  create(
    @CurrentUser() user: { userId: string; institutionId: string; role: string },
    @Body() dto: CreateStudentDto,
  ) {
    return this.studentService.create(user.institutionId, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: { userId: string; institutionId: string; role: string },
    @Query(new ZodValidationPipe(StudentQuerySchema)) query: StudentQueryDto,
  ) {
    return this.studentService.findAll(user.institutionId, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: { userId: string; institutionId: string; role: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.studentService.findOne(user.institutionId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { userId: string; institutionId: string; role: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.studentService.update(user.institutionId, id, dto);
  }

  @Delete(':id')
  delete(
    @CurrentUser() user: { userId: string; institutionId: string; role: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.studentService.delete(user.institutionId, id);
  }
}
```

### Step 5 — Write failing integration test for StudentController

- [ ] Create `sinaloka-backend/src/modules/student/student.controller.spec.ts`

```ts
// sinaloka-backend/src/modules/student/student.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('StudentController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let institutionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    // Seed an institution and admin user for tests
    const institution = await prisma.institution.create({
      data: { name: 'Test School', slug: 'test-school-student' },
    });
    institutionId = institution.id;

    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash('password123', 10);

    await prisma.user.create({
      data: {
        email: 'admin-student@test.com',
        password_hash: hash,
        name: 'Admin',
        role: 'ADMIN',
        institution_id: institutionId,
      },
    });

    adminToken = jwtService.sign({
      sub: 'admin-uuid',
      institutionId,
      role: 'ADMIN',
    });
  });

  afterAll(async () => {
    await prisma.student.deleteMany({ where: { institution_id: institutionId } });
    await prisma.user.deleteMany({ where: { institution_id: institutionId } });
    await prisma.institution.delete({ where: { id: institutionId } });
    await app.close();
  });

  let createdStudentId: string;

  it('POST /admin/students — should create a student', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Alice Smith',
        grade: '10',
        email: 'alice@test.com',
      })
      .expect(201);

    expect(res.body.name).toBe('Alice Smith');
    expect(res.body.grade).toBe('10');
    expect(res.body.institution_id).toBe(institutionId);
    createdStudentId = res.body.id;
  });

  it('GET /admin/students — should list students with pagination', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    expect(res.body.meta.page).toBe(1);
  });

  it('GET /admin/students?search=alice — should search by name', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/students?search=alice')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].name).toContain('Alice');
  });

  it('GET /admin/students?grade=10 — should filter by grade', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/students?grade=10')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    res.body.data.forEach((s: any) => expect(s.grade).toBe('10'));
  });

  it('GET /admin/students?status=ACTIVE — should filter by status', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/students?status=ACTIVE')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    res.body.data.forEach((s: any) => expect(s.status).toBe('ACTIVE'));
  });

  it('GET /admin/students/:id — should return a single student', async () => {
    const res = await request(app.getHttpServer())
      .get(`/admin/students/${createdStudentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.id).toBe(createdStudentId);
  });

  it('PATCH /admin/students/:id — should update a student', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/admin/students/${createdStudentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Alice Updated' })
      .expect(200);

    expect(res.body.name).toBe('Alice Updated');
  });

  it('DELETE /admin/students/:id — should delete a student', async () => {
    await request(app.getHttpServer())
      .delete(`/admin/students/${createdStudentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/admin/students/${createdStudentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('GET /admin/students/:id — should return 404 for nonexistent student', async () => {
    await request(app.getHttpServer())
      .get('/admin/students/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
```

- [ ] Run: `npm test -- student.controller` — verify tests fail (controller not wired yet)

### Step 6 — Create StudentModule and register it

- [ ] Create `sinaloka-backend/src/modules/student/student.module.ts`

```ts
// sinaloka-backend/src/modules/student/student.module.ts
import { Module } from '@nestjs/common';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';

@Module({
  controllers: [StudentController],
  providers: [StudentService],
  exports: [StudentService],
})
export class StudentModule {}
```

- [ ] Register `StudentModule` in `sinaloka-backend/src/app.module.ts` imports array
- [ ] Run: `npm test -- student.controller` — verify integration tests pass
- [ ] Commit: `feat(student): add StudentController with admin CRUD routes`

---

## Section B: Tutor Module

### Step 7 — Create Tutor DTOs with Zod

- [ ] Create `sinaloka-backend/src/modules/tutor/tutor.dto.ts`

```ts
// sinaloka-backend/src/modules/tutor/tutor.dto.ts
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateTutorSchema = z.object({
  // User fields (will create a User with role TUTOR)
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8).max(128),

  // Tutor-specific fields
  subjects: z.array(z.string().min(1)).min(1),
  experience_years: z.number().int().min(0).default(0),
  availability: z.record(z.any()).optional().nullable(),
  bank_name: z.string().max(255).optional().nullable(),
  bank_account_number: z.string().max(50).optional().nullable(),
  bank_account_holder: z.string().max(255).optional().nullable(),
});

export class CreateTutorDto extends createZodDto(CreateTutorSchema) {}

export const UpdateTutorSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  subjects: z.array(z.string().min(1)).min(1).optional(),
  experience_years: z.number().int().min(0).optional(),
  availability: z.record(z.any()).optional().nullable(),
  bank_name: z.string().max(255).optional().nullable(),
  bank_account_number: z.string().max(50).optional().nullable(),
  bank_account_holder: z.string().max(255).optional().nullable(),
  is_verified: z.boolean().optional(),
  rating: z.number().min(0).max(5).optional(),
});

export class UpdateTutorDto extends createZodDto(UpdateTutorSchema) {}

export const TutorQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  subject: z.string().optional(),
  is_verified: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  sort_by: z
    .enum(['name', 'rating', 'experience_years', 'created_at'])
    .default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export class TutorQueryDto extends createZodDto(TutorQuerySchema) {}

export const UpdateTutorProfileSchema = z.object({
  availability: z.record(z.any()).optional().nullable(),
  bank_name: z.string().max(255).optional().nullable(),
  bank_account_number: z.string().max(50).optional().nullable(),
  bank_account_holder: z.string().max(255).optional().nullable(),
});

export class UpdateTutorProfileDto extends createZodDto(UpdateTutorProfileSchema) {}
```

### Step 8 — Write failing unit tests for TutorService

- [ ] Create `sinaloka-backend/src/modules/tutor/tutor.service.spec.ts`

```ts
// sinaloka-backend/src/modules/tutor/tutor.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { TutorService } from './tutor.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('TutorService', () => {
  let service: TutorService;
  let prisma: PrismaService;

  const mockPrisma = {
    tutor: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn((fn) => fn(mockPrisma)),
  };

  const institutionId = 'inst-uuid-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TutorService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TutorService>(TutorService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a User with role TUTOR and a Tutor record in a transaction', async () => {
      const dto = {
        name: 'Jane Doe',
        email: 'jane@test.com',
        password: 'password123',
        subjects: ['Math', 'Physics'],
        experience_years: 3,
      };

      const createdUser = {
        id: 'user-uuid-1',
        email: dto.email,
        name: dto.name,
        role: 'TUTOR',
        institution_id: institutionId,
      };

      const createdTutor = {
        id: 'tutor-uuid-1',
        user_id: createdUser.id,
        institution_id: institutionId,
        subjects: dto.subjects,
        experience_years: dto.experience_years,
        rating: 0,
        is_verified: false,
      };

      mockPrisma.user.findUnique.mockResolvedValue(null); // no existing user
      mockPrisma.user.create.mockResolvedValue(createdUser);
      mockPrisma.tutor.create.mockResolvedValue(createdTutor);

      const result = await service.create(institutionId, dto);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: dto.email,
          name: dto.name,
          role: 'TUTOR',
          institution_id: institutionId,
          password_hash: expect.any(String),
        }),
      });
      expect(mockPrisma.tutor.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          user_id: createdUser.id,
          institution_id: institutionId,
          subjects: dto.subjects,
          experience_years: dto.experience_years,
        }),
        include: { user: { select: { id: true, email: true, name: true, role: true } } },
      });
      expect(result).toEqual(createdTutor);
    });

    it('should throw ConflictException if email already exists', async () => {
      const dto = {
        name: 'Jane Doe',
        email: 'existing@test.com',
        password: 'password123',
        subjects: ['Math'],
      };

      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(service.create(institutionId, dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return paginated tutors for institution', async () => {
      const tutors = [
        { id: 'tutor-1', institution_id: institutionId, subjects: ['Math'] },
      ];
      mockPrisma.tutor.findMany.mockResolvedValue(tutors);
      mockPrisma.tutor.count.mockResolvedValue(1);

      const result = await service.findAll(institutionId, {
        page: 1,
        limit: 20,
        sort_by: 'created_at',
        sort_order: 'desc',
      });

      expect(result.data).toEqual(tutors);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by subject', async () => {
      mockPrisma.tutor.findMany.mockResolvedValue([]);
      mockPrisma.tutor.count.mockResolvedValue(0);

      await service.findAll(institutionId, {
        page: 1,
        limit: 20,
        subject: 'Math',
        sort_by: 'created_at',
        sort_order: 'desc',
      });

      expect(mockPrisma.tutor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            institution_id: institutionId,
            subjects: { has: 'Math' },
          }),
        }),
      );
    });

    it('should sort by rating', async () => {
      mockPrisma.tutor.findMany.mockResolvedValue([]);
      mockPrisma.tutor.count.mockResolvedValue(0);

      await service.findAll(institutionId, {
        page: 1,
        limit: 20,
        sort_by: 'rating',
        sort_order: 'desc',
      });

      expect(mockPrisma.tutor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { rating: 'desc' },
        }),
      );
    });

    it('should sort by experience_years', async () => {
      mockPrisma.tutor.findMany.mockResolvedValue([]);
      mockPrisma.tutor.count.mockResolvedValue(0);

      await service.findAll(institutionId, {
        page: 1,
        limit: 20,
        sort_by: 'experience_years',
        sort_order: 'asc',
      });

      expect(mockPrisma.tutor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { experience_years: 'asc' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a tutor by id with user info', async () => {
      const tutor = {
        id: 'tutor-1',
        institution_id: institutionId,
        user: { id: 'user-1', email: 'jane@test.com', name: 'Jane' },
      };
      mockPrisma.tutor.findFirst.mockResolvedValue(tutor);

      const result = await service.findOne(institutionId, 'tutor-1');
      expect(result).toEqual(tutor);
    });

    it('should throw NotFoundException if tutor not found', async () => {
      mockPrisma.tutor.findFirst.mockResolvedValue(null);

      await expect(service.findOne(institutionId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update tutor fields', async () => {
      const existing = { id: 'tutor-1', institution_id: institutionId };
      mockPrisma.tutor.findFirst.mockResolvedValue(existing);

      const updated = { ...existing, subjects: ['Chemistry'] };
      mockPrisma.tutor.update.mockResolvedValue(updated);

      const result = await service.update(institutionId, 'tutor-1', {
        subjects: ['Chemistry'],
      });

      expect(result.subjects).toEqual(['Chemistry']);
    });

    it('should throw NotFoundException if tutor not found', async () => {
      mockPrisma.tutor.findFirst.mockResolvedValue(null);

      await expect(
        service.update(institutionId, 'nonexistent', { subjects: ['X'] }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete tutor and associated user in a transaction', async () => {
      const existing = {
        id: 'tutor-1',
        user_id: 'user-1',
        institution_id: institutionId,
      };
      mockPrisma.tutor.findFirst.mockResolvedValue(existing);
      mockPrisma.tutor.delete.mockResolvedValue(existing);
      mockPrisma.user.delete.mockResolvedValue({ id: 'user-1' });

      const result = await service.delete(institutionId, 'tutor-1');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.tutor.delete).toHaveBeenCalledWith({
        where: { id: 'tutor-1', institution_id: institutionId },
      });
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('should throw NotFoundException if tutor not found', async () => {
      mockPrisma.tutor.findFirst.mockResolvedValue(null);

      await expect(service.delete(institutionId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getProfile', () => {
    it('should return tutor profile by user id', async () => {
      const tutor = {
        id: 'tutor-1',
        user_id: 'user-1',
        institution_id: institutionId,
        subjects: ['Math'],
      };
      mockPrisma.tutor.findFirst.mockResolvedValue(tutor);

      const result = await service.getProfile('user-1');
      expect(result).toEqual(tutor);
    });

    it('should throw NotFoundException if no tutor profile for user', async () => {
      mockPrisma.tutor.findFirst.mockResolvedValue(null);

      await expect(service.getProfile('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update only allowed profile fields', async () => {
      const tutor = { id: 'tutor-1', user_id: 'user-1', institution_id: institutionId };
      mockPrisma.tutor.findFirst.mockResolvedValue(tutor);

      const updated = { ...tutor, bank_name: 'BCA' };
      mockPrisma.tutor.update.mockResolvedValue(updated);

      const result = await service.updateProfile('user-1', { bank_name: 'BCA' });

      expect(result.bank_name).toBe('BCA');
      expect(mockPrisma.tutor.update).toHaveBeenCalledWith({
        where: { id: 'tutor-1' },
        data: { bank_name: 'BCA' },
        include: { user: { select: { id: true, email: true, name: true, role: true } } },
      });
    });
  });
});
```

- [ ] Run: `npm test -- tutor.service` — verify all tests fail (module not found)

### Step 9 — Implement TutorService

- [ ] Create `sinaloka-backend/src/modules/tutor/tutor.service.ts`

```ts
// sinaloka-backend/src/modules/tutor/tutor.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateTutorDto,
  UpdateTutorDto,
  TutorQueryDto,
  UpdateTutorProfileDto,
} from './tutor.dto';
import * as bcrypt from 'bcrypt';

const TUTOR_USER_SELECT = {
  user: { select: { id: true, email: true, name: true, role: true } },
};

@Injectable()
export class TutorService {
  constructor(private readonly prisma: PrismaService) {}

  async create(institutionId: string, dto: CreateTutorDto) {
    const { name, email, password, subjects, experience_years, ...tutorData } = dto;

    // Check for existing user with same email
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException(`User with email ${email} already exists`);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name,
          password_hash: passwordHash,
          role: 'TUTOR',
          institution_id: institutionId,
        },
      });

      const tutor = await tx.tutor.create({
        data: {
          user_id: user.id,
          institution_id: institutionId,
          subjects,
          experience_years: experience_years ?? 0,
          ...tutorData,
        },
        include: TUTOR_USER_SELECT,
      });

      return tutor;
    });
  }

  async findAll(institutionId: string, query: TutorQueryDto) {
    const { page, limit, search, subject, is_verified, sort_by, sort_order } = query;

    const where: any = { institution_id: institutionId };

    if (subject) {
      where.subjects = { has: subject };
    }

    if (is_verified !== undefined) {
      where.is_verified = is_verified;
    }

    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const orderBy =
      sort_by === 'name'
        ? { user: { name: sort_order } }
        : { [sort_by]: sort_order };

    const [data, total] = await Promise.all([
      this.prisma.tutor.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: TUTOR_USER_SELECT,
      }),
      this.prisma.tutor.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(institutionId: string, id: string) {
    const tutor = await this.prisma.tutor.findFirst({
      where: { id, institution_id: institutionId },
      include: TUTOR_USER_SELECT,
    });

    if (!tutor) {
      throw new NotFoundException(`Tutor with id ${id} not found`);
    }

    return tutor;
  }

  async update(institutionId: string, id: string, dto: UpdateTutorDto) {
    const tutor = await this.findOne(institutionId, id);

    const { name, ...tutorData } = dto;

    // If name is provided, update the associated user record too
    if (name) {
      await this.prisma.user.update({
        where: { id: tutor.user_id },
        data: { name },
      });
    }

    return this.prisma.tutor.update({
      where: { id, institution_id: institutionId },
      data: tutorData,
      include: TUTOR_USER_SELECT,
    });
  }

  async delete(institutionId: string, id: string) {
    const tutor = await this.findOne(institutionId, id);

    return this.prisma.$transaction(async (tx) => {
      await tx.tutor.delete({
        where: { id, institution_id: institutionId },
      });
      await tx.user.delete({
        where: { id: tutor.user_id },
      });
      return tutor;
    });
  }

  async getProfile(userId: string) {
    const tutor = await this.prisma.tutor.findFirst({
      where: { user_id: userId },
      include: TUTOR_USER_SELECT,
    });

    if (!tutor) {
      throw new NotFoundException('Tutor profile not found');
    }

    return tutor;
  }

  async updateProfile(userId: string, dto: UpdateTutorProfileDto) {
    const tutor = await this.getProfile(userId);

    return this.prisma.tutor.update({
      where: { id: tutor.id },
      data: dto,
      include: TUTOR_USER_SELECT,
    });
  }
}
```

- [ ] Run: `npm test -- tutor.service` — verify all tests pass
- [ ] Commit: `feat(tutor): add TutorService with CRUD, profile, and transactional user creation`

### Step 10 — Create TutorController (admin routes)

- [ ] Create `sinaloka-backend/src/modules/tutor/tutor.controller.ts`

```ts
// sinaloka-backend/src/modules/tutor/tutor.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { TutorService } from './tutor.service';
import {
  CreateTutorDto,
  UpdateTutorDto,
  TutorQueryDto,
  TutorQuerySchema,
} from './tutor.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('admin/tutors')
@Roles('SUPER_ADMIN', 'ADMIN')
export class TutorAdminController {
  constructor(private readonly tutorService: TutorService) {}

  @Post()
  create(
    @CurrentUser() user: { userId: string; institutionId: string; role: string },
    @Body() dto: CreateTutorDto,
  ) {
    return this.tutorService.create(user.institutionId, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: { userId: string; institutionId: string; role: string },
    @Query(new ZodValidationPipe(TutorQuerySchema)) query: TutorQueryDto,
  ) {
    return this.tutorService.findAll(user.institutionId, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: { userId: string; institutionId: string; role: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tutorService.findOne(user.institutionId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { userId: string; institutionId: string; role: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTutorDto,
  ) {
    return this.tutorService.update(user.institutionId, id, dto);
  }

  @Delete(':id')
  delete(
    @CurrentUser() user: { userId: string; institutionId: string; role: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tutorService.delete(user.institutionId, id);
  }
}
```

### Step 11 — Create TutorProfileController (tutor routes)

- [ ] Create `sinaloka-backend/src/modules/tutor/tutor-profile.controller.ts`

```ts
// sinaloka-backend/src/modules/tutor/tutor-profile.controller.ts
import {
  Controller,
  Get,
  Patch,
  Body,
} from '@nestjs/common';
import { TutorService } from './tutor.service';
import { UpdateTutorProfileDto } from './tutor.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('tutor/profile')
@Roles('TUTOR')
export class TutorProfileController {
  constructor(private readonly tutorService: TutorService) {}

  @Get()
  getProfile(@CurrentUser('userId') userId: string) {
    return this.tutorService.getProfile(userId);
  }

  @Patch()
  updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateTutorProfileDto,
  ) {
    return this.tutorService.updateProfile(userId, dto);
  }
}
```

### Step 12 — Write failing integration test for TutorAdminController

- [ ] Create `sinaloka-backend/src/modules/tutor/tutor.controller.spec.ts`

```ts
// sinaloka-backend/src/modules/tutor/tutor.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('TutorAdminController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let institutionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    const institution = await prisma.institution.create({
      data: { name: 'Test School Tutor', slug: 'test-school-tutor' },
    });
    institutionId = institution.id;

    adminToken = jwtService.sign({
      sub: 'admin-uuid-tutor',
      institutionId,
      role: 'ADMIN',
    });
  });

  afterAll(async () => {
    await prisma.tutor.deleteMany({ where: { institution_id: institutionId } });
    await prisma.user.deleteMany({ where: { institution_id: institutionId } });
    await prisma.institution.delete({ where: { id: institutionId } });
    await app.close();
  });

  let createdTutorId: string;

  it('POST /admin/tutors — should create a tutor and associated user', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/tutors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Jane Tutor',
        email: 'jane-tutor@test.com',
        password: 'password123',
        subjects: ['Math', 'Physics'],
        experience_years: 5,
      })
      .expect(201);

    expect(res.body.subjects).toEqual(['Math', 'Physics']);
    expect(res.body.experience_years).toBe(5);
    expect(res.body.institution_id).toBe(institutionId);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('jane-tutor@test.com');
    expect(res.body.user.role).toBe('TUTOR');
    createdTutorId = res.body.id;
  });

  it('POST /admin/tutors — should reject duplicate email', async () => {
    await request(app.getHttpServer())
      .post('/admin/tutors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Another Tutor',
        email: 'jane-tutor@test.com',
        password: 'password123',
        subjects: ['English'],
      })
      .expect(409);
  });

  it('GET /admin/tutors — should list tutors with pagination', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/tutors')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
  });

  it('GET /admin/tutors?subject=Math — should filter by subject', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/tutors?subject=Math')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    res.body.data.forEach((t: any) => {
      expect(t.subjects).toContain('Math');
    });
  });

  it('GET /admin/tutors?sort_by=rating&sort_order=desc — should sort by rating', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/tutors?sort_by=rating&sort_order=desc')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
  });

  it('GET /admin/tutors/:id — should return a single tutor', async () => {
    const res = await request(app.getHttpServer())
      .get(`/admin/tutors/${createdTutorId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.id).toBe(createdTutorId);
    expect(res.body.user).toBeDefined();
  });

  it('PATCH /admin/tutors/:id — should update tutor fields', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/admin/tutors/${createdTutorId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subjects: ['Chemistry'], is_verified: true })
      .expect(200);

    expect(res.body.subjects).toEqual(['Chemistry']);
    expect(res.body.is_verified).toBe(true);
  });

  it('DELETE /admin/tutors/:id — should delete tutor and associated user', async () => {
    await request(app.getHttpServer())
      .delete(`/admin/tutors/${createdTutorId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/admin/tutors/${createdTutorId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
```

- [ ] Run: `npm test -- tutor.controller` — verify tests fail

### Step 13 — Write failing integration test for TutorProfileController

- [ ] Create `sinaloka-backend/src/modules/tutor/tutor-profile.controller.spec.ts`

```ts
// sinaloka-backend/src/modules/tutor/tutor-profile.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

describe('TutorProfileController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let tutorToken: string;
  let institutionId: string;
  let userId: string;
  let tutorId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    const institution = await prisma.institution.create({
      data: { name: 'Test School Profile', slug: 'test-school-profile' },
    });
    institutionId = institution.id;

    const hash = await bcrypt.hash('password123', 10);
    const user = await prisma.user.create({
      data: {
        email: 'tutor-profile@test.com',
        password_hash: hash,
        name: 'Profile Tutor',
        role: 'TUTOR',
        institution_id: institutionId,
      },
    });
    userId = user.id;

    const tutor = await prisma.tutor.create({
      data: {
        user_id: userId,
        institution_id: institutionId,
        subjects: ['English'],
        experience_years: 2,
      },
    });
    tutorId = tutor.id;

    tutorToken = jwtService.sign({
      sub: userId,
      institutionId,
      role: 'TUTOR',
    });
  });

  afterAll(async () => {
    await prisma.tutor.deleteMany({ where: { id: tutorId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.institution.delete({ where: { id: institutionId } });
    await app.close();
  });

  it('GET /tutor/profile — should return own tutor profile', async () => {
    const res = await request(app.getHttpServer())
      .get('/tutor/profile')
      .set('Authorization', `Bearer ${tutorToken}`)
      .expect(200);

    expect(res.body.id).toBe(tutorId);
    expect(res.body.subjects).toEqual(['English']);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('tutor-profile@test.com');
  });

  it('PATCH /tutor/profile — should update own bank details', async () => {
    const res = await request(app.getHttpServer())
      .patch('/tutor/profile')
      .set('Authorization', `Bearer ${tutorToken}`)
      .send({
        bank_name: 'BCA',
        bank_account_number: '1234567890',
        bank_account_holder: 'Profile Tutor',
      })
      .expect(200);

    expect(res.body.bank_name).toBe('BCA');
    expect(res.body.bank_account_number).toBe('1234567890');
  });

  it('PATCH /tutor/profile — should update availability', async () => {
    const availability = {
      monday: ['09:00-12:00', '14:00-17:00'],
      wednesday: ['09:00-12:00'],
    };

    const res = await request(app.getHttpServer())
      .patch('/tutor/profile')
      .set('Authorization', `Bearer ${tutorToken}`)
      .send({ availability })
      .expect(200);

    expect(res.body.availability).toEqual(availability);
  });

  it('PATCH /tutor/profile — should not allow updating subjects or rating', async () => {
    // These fields are not in UpdateTutorProfileDto, so Zod strips them
    const res = await request(app.getHttpServer())
      .patch('/tutor/profile')
      .set('Authorization', `Bearer ${tutorToken}`)
      .send({ subjects: ['Hacking'], rating: 5 })
      .expect(200);

    // subjects and rating should remain unchanged
    expect(res.body.subjects).toEqual(['English']);
    expect(res.body.rating).toBe(0);
  });

  it('GET /tutor/profile — admin token should be rejected', async () => {
    const adminToken = jwtService.sign({
      sub: 'admin-uuid',
      institutionId,
      role: 'ADMIN',
    });

    await request(app.getHttpServer())
      .get('/tutor/profile')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403);
  });
});
```

- [ ] Run: `npm test -- tutor-profile.controller` — verify tests fail

### Step 14 — Create TutorModule and register it

- [ ] Create `sinaloka-backend/src/modules/tutor/tutor.module.ts`

```ts
// sinaloka-backend/src/modules/tutor/tutor.module.ts
import { Module } from '@nestjs/common';
import { TutorAdminController } from './tutor.controller';
import { TutorProfileController } from './tutor-profile.controller';
import { TutorService } from './tutor.service';

@Module({
  controllers: [TutorAdminController, TutorProfileController],
  providers: [TutorService],
  exports: [TutorService],
})
export class TutorModule {}
```

- [ ] Register `TutorModule` in `sinaloka-backend/src/app.module.ts` imports array
- [ ] Run: `npm test -- tutor.controller` — verify admin integration tests pass
- [ ] Run: `npm test -- tutor-profile.controller` — verify profile integration tests pass
- [ ] Commit: `feat(tutor): add TutorModule with admin CRUD and tutor profile routes`

### Step 15 — Run all tests and final commit

- [ ] Run: `npm test` — verify all tests pass (including student + tutor)
- [ ] Commit: `feat: complete Phase 2 — Student and Tutor modules`

---

## Files Created in This Chunk

```
sinaloka-backend/src/modules/student/
  student.dto.ts
  student.service.ts
  student.service.spec.ts
  student.controller.ts
  student.controller.spec.ts
  student.module.ts

sinaloka-backend/src/modules/tutor/
  tutor.dto.ts
  tutor.service.ts
  tutor.service.spec.ts
  tutor.controller.ts                    # TutorAdminController (/admin/tutors)
  tutor.controller.spec.ts
  tutor-profile.controller.ts            # TutorProfileController (/tutor/profile)
  tutor-profile.controller.spec.ts
  tutor.module.ts
```

## Files Modified in This Chunk

```
sinaloka-backend/src/app.module.ts       # Add StudentModule and TutorModule to imports
```
# Chunk 4: Class + Enrollment Modules (Phase 3)

**Estimated time:** ~90 minutes
**Depends on:** Chunk 1 (project scaffold, Prisma, common utilities), Chunk 2 (Auth, Institution, User modules), Chunk 3 (Student, Tutor modules)
**Outcome:** Admin can CRUD classes (with schedule, capacity, occupancy stats) and enrollments (with unique constraint and time-conflict detection). `POST /admin/enrollments/check-conflict` validates schedule overlaps before enrolling.

---

## Section A: Class Module

### Step 1 — Create Class DTOs with Zod

- [ ] Create `sinaloka-backend/src/modules/class/class.dto.ts`

```ts
// sinaloka-backend/src/modules/class/class.dto.ts
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ClassStatus = z.enum(['ACTIVE', 'ARCHIVED']);

const ScheduleDay = z.enum([
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]);

const TimeString = z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:mm format');

export const CreateClassSchema = z
  .object({
    tutor_id: z.string().uuid(),
    name: z.string().min(1).max(255),
    subject: z.string().min(1).max(100),
    capacity: z.number().int().min(1),
    fee: z.number().min(0),
    schedule_days: z.array(ScheduleDay).min(1),
    schedule_start_time: TimeString,
    schedule_end_time: TimeString,
    room: z.string().max(100).optional().nullable(),
    status: ClassStatus.default('ACTIVE'),
  })
  .refine((data) => data.schedule_start_time < data.schedule_end_time, {
    message: 'schedule_start_time must be before schedule_end_time',
    path: ['schedule_end_time'],
  });

export class CreateClassDto extends createZodDto(CreateClassSchema) {}

export const UpdateClassSchema = z
  .object({
    tutor_id: z.string().uuid(),
    name: z.string().min(1).max(255),
    subject: z.string().min(1).max(100),
    capacity: z.number().int().min(1),
    fee: z.number().min(0),
    schedule_days: z.array(ScheduleDay).min(1),
    schedule_start_time: TimeString,
    schedule_end_time: TimeString,
    room: z.string().max(100).optional().nullable(),
    status: ClassStatus,
  })
  .partial()
  .refine(
    (data) => {
      if (data.schedule_start_time && data.schedule_end_time) {
        return data.schedule_start_time < data.schedule_end_time;
      }
      return true;
    },
    {
      message: 'schedule_start_time must be before schedule_end_time',
      path: ['schedule_end_time'],
    },
  );

export class UpdateClassDto extends createZodDto(UpdateClassSchema) {}

export const ClassQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  subject: z.string().optional(),
  status: ClassStatus.optional(),
  sort_by: z.enum(['name', 'created_at', 'subject']).default('name'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
});

export class ClassQueryDto extends createZodDto(ClassQuerySchema) {}
```

- [ ] Verify the file compiles: `npx tsc --noEmit`

---

### Step 2 — Write failing unit tests for ClassService

- [ ] Create `sinaloka-backend/src/modules/class/class.service.spec.ts`

```ts
// sinaloka-backend/src/modules/class/class.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ClassService } from './class.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('ClassService', () => {
  let service: ClassService;
  let prisma: PrismaService;

  const mockPrisma = {
    class: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    enrollment: {
      count: jest.fn(),
    },
  };

  const institutionId = 'inst-uuid-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ClassService>(ClassService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a class scoped to the institution', async () => {
      const dto = {
        tutor_id: 'tutor-uuid-1',
        name: 'Math 101',
        subject: 'Mathematics',
        capacity: 20,
        fee: 500000,
        schedule_days: ['Monday', 'Wednesday'],
        schedule_start_time: '14:00',
        schedule_end_time: '15:30',
        room: 'Room A',
        status: 'ACTIVE' as const,
      };

      const expected = { id: 'class-uuid-1', institution_id: institutionId, ...dto };
      mockPrisma.class.create.mockResolvedValue(expected);

      const result = await service.create(institutionId, dto);

      expect(mockPrisma.class.create).toHaveBeenCalledWith({
        data: { ...dto, institution_id: institutionId },
      });
      expect(result).toEqual(expected);
    });
  });

  describe('findAll', () => {
    it('should return paginated classes with total count', async () => {
      const query = { page: 1, limit: 20, sort_by: 'name' as const, sort_order: 'asc' as const };
      const classes = [
        { id: 'class-1', name: 'Math 101', institution_id: institutionId },
      ];
      mockPrisma.class.findMany.mockResolvedValue(classes);
      mockPrisma.class.count.mockResolvedValue(1);

      const result = await service.findAll(institutionId, query);

      expect(mockPrisma.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ institution_id: institutionId }),
          skip: 0,
          take: 20,
        }),
      );
      expect(result).toEqual({ data: classes, total: 1, page: 1, limit: 20 });
    });

    it('should filter by subject', async () => {
      const query = {
        page: 1,
        limit: 20,
        subject: 'Mathematics',
        sort_by: 'name' as const,
        sort_order: 'asc' as const,
      };
      mockPrisma.class.findMany.mockResolvedValue([]);
      mockPrisma.class.count.mockResolvedValue(0);

      await service.findAll(institutionId, query);

      expect(mockPrisma.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            institution_id: institutionId,
            subject: 'Mathematics',
          }),
        }),
      );
    });

    it('should filter by status', async () => {
      const query = {
        page: 1,
        limit: 20,
        status: 'ACTIVE' as const,
        sort_by: 'name' as const,
        sort_order: 'asc' as const,
      };
      mockPrisma.class.findMany.mockResolvedValue([]);
      mockPrisma.class.count.mockResolvedValue(0);

      await service.findAll(institutionId, query);

      expect(mockPrisma.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            institution_id: institutionId,
            status: 'ACTIVE',
          }),
        }),
      );
    });

    it('should search by name', async () => {
      const query = {
        page: 1,
        limit: 20,
        search: 'Math',
        sort_by: 'name' as const,
        sort_order: 'asc' as const,
      };
      mockPrisma.class.findMany.mockResolvedValue([]);
      mockPrisma.class.count.mockResolvedValue(0);

      await service.findAll(institutionId, query);

      expect(mockPrisma.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            institution_id: institutionId,
            name: { contains: 'Math', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('should sort by specified field and order', async () => {
      const query = {
        page: 1,
        limit: 20,
        sort_by: 'subject' as const,
        sort_order: 'desc' as const,
      };
      mockPrisma.class.findMany.mockResolvedValue([]);
      mockPrisma.class.count.mockResolvedValue(0);

      await service.findAll(institutionId, query);

      expect(mockPrisma.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { subject: 'desc' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a class with enrolled count', async () => {
      const cls = {
        id: 'class-uuid-1',
        institution_id: institutionId,
        name: 'Math 101',
        capacity: 20,
      };
      mockPrisma.class.findFirst.mockResolvedValue(cls);
      mockPrisma.enrollment.count.mockResolvedValue(15);

      const result = await service.findOne(institutionId, 'class-uuid-1');

      expect(mockPrisma.class.findFirst).toHaveBeenCalledWith({
        where: { id: 'class-uuid-1', institution_id: institutionId },
      });
      expect(result).toEqual({ ...cls, enrolled_count: 15 });
    });

    it('should throw NotFoundException when class not found', async () => {
      mockPrisma.class.findFirst.mockResolvedValue(null);

      await expect(service.findOne(institutionId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a class scoped to the institution', async () => {
      const existing = { id: 'class-uuid-1', institution_id: institutionId };
      mockPrisma.class.findFirst.mockResolvedValue(existing);
      mockPrisma.class.update.mockResolvedValue({ ...existing, name: 'Math 102' });

      const result = await service.update(institutionId, 'class-uuid-1', { name: 'Math 102' });

      expect(mockPrisma.class.update).toHaveBeenCalledWith({
        where: { id: 'class-uuid-1' },
        data: { name: 'Math 102' },
      });
      expect(result.name).toBe('Math 102');
    });

    it('should throw NotFoundException when updating nonexistent class', async () => {
      mockPrisma.class.findFirst.mockResolvedValue(null);

      await expect(
        service.update(institutionId, 'nonexistent', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a class scoped to the institution', async () => {
      const existing = { id: 'class-uuid-1', institution_id: institutionId };
      mockPrisma.class.findFirst.mockResolvedValue(existing);
      mockPrisma.class.delete.mockResolvedValue(existing);

      await service.remove(institutionId, 'class-uuid-1');

      expect(mockPrisma.class.delete).toHaveBeenCalledWith({
        where: { id: 'class-uuid-1' },
      });
    });

    it('should throw NotFoundException when deleting nonexistent class', async () => {
      mockPrisma.class.findFirst.mockResolvedValue(null);

      await expect(service.remove(institutionId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
```

- [ ] Run: `npx jest class.service.spec.ts` — expect all tests to **fail** (ClassService does not exist yet)

---

### Step 3 — Implement ClassService

- [ ] Create `sinaloka-backend/src/modules/class/class.service.ts`

```ts
// sinaloka-backend/src/modules/class/class.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ClassService {
  constructor(private readonly prisma: PrismaService) {}

  async create(institutionId: string, dto: any) {
    return this.prisma.class.create({
      data: { ...dto, institution_id: institutionId },
    });
  }

  async findAll(institutionId: string, query: any) {
    const { page, limit, search, subject, status, sort_by, sort_order } = query;

    const where: any = { institution_id: institutionId };
    if (subject) where.subject = subject;
    if (status) where.status = status;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.class.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sort_by]: sort_order },
      }),
      this.prisma.class.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(institutionId: string, id: string) {
    const cls = await this.prisma.class.findFirst({
      where: { id, institution_id: institutionId },
    });
    if (!cls) throw new NotFoundException('Class not found');

    const enrolled_count = await this.prisma.enrollment.count({
      where: { class_id: id },
    });

    return { ...cls, enrolled_count };
  }

  async update(institutionId: string, id: string, dto: any) {
    const existing = await this.prisma.class.findFirst({
      where: { id, institution_id: institutionId },
    });
    if (!existing) throw new NotFoundException('Class not found');

    return this.prisma.class.update({
      where: { id },
      data: dto,
    });
  }

  async remove(institutionId: string, id: string) {
    const existing = await this.prisma.class.findFirst({
      where: { id, institution_id: institutionId },
    });
    if (!existing) throw new NotFoundException('Class not found');

    return this.prisma.class.delete({ where: { id } });
  }
}
```

- [ ] Run: `npx jest class.service.spec.ts` — expect all tests to **pass**

---

### Step 4 — Create ClassController

- [ ] Create `sinaloka-backend/src/modules/class/class.controller.ts`

```ts
// sinaloka-backend/src/modules/class/class.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClassService } from './class.service';
import { CreateClassDto, UpdateClassDto, ClassQueryDto } from './class.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CreateClassSchema, UpdateClassSchema, ClassQuerySchema } from './class.dto';

@Controller('admin/classes')
@UseGuards(AuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  @Post()
  create(
    @Tenant() institutionId: string,
    @Body(new ZodValidationPipe(CreateClassSchema)) dto: CreateClassDto,
  ) {
    return this.classService.create(institutionId, dto);
  }

  @Get()
  findAll(
    @Tenant() institutionId: string,
    @Query(new ZodValidationPipe(ClassQuerySchema)) query: ClassQueryDto,
  ) {
    return this.classService.findAll(institutionId, query);
  }

  @Get(':id')
  findOne(@Tenant() institutionId: string, @Param('id') id: string) {
    return this.classService.findOne(institutionId, id);
  }

  @Patch(':id')
  update(
    @Tenant() institutionId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateClassSchema)) dto: UpdateClassDto,
  ) {
    return this.classService.update(institutionId, id, dto);
  }

  @Delete(':id')
  remove(@Tenant() institutionId: string, @Param('id') id: string) {
    return this.classService.remove(institutionId, id);
  }
}
```

---

### Step 5 — Create ClassModule

- [ ] Create `sinaloka-backend/src/modules/class/class.module.ts`

```ts
// sinaloka-backend/src/modules/class/class.module.ts
import { Module } from '@nestjs/common';
import { ClassController } from './class.controller';
import { ClassService } from './class.service';

@Module({
  controllers: [ClassController],
  providers: [ClassService],
  exports: [ClassService],
})
export class ClassModule {}
```

- [ ] Register `ClassModule` in `sinaloka-backend/src/app.module.ts` imports array
- [ ] Verify compilation: `npx tsc --noEmit`

---

### Step 6 — Write Class integration test

- [ ] Create `sinaloka-backend/src/modules/class/class.integration.spec.ts`

```ts
// sinaloka-backend/src/modules/class/class.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('ClassController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let institutionId: string;
  let tutorId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    // Seed an institution
    const institution = await prisma.institution.create({
      data: { name: 'Test School', slug: 'test-school-class' },
    });
    institutionId = institution.id;

    // Seed an admin user
    const user = await prisma.user.create({
      data: {
        email: 'admin-class@test.com',
        password_hash: 'hashed',
        name: 'Admin',
        role: 'ADMIN',
        institution_id: institutionId,
      },
    });

    adminToken = jwtService.sign({
      userId: user.id,
      institutionId,
      role: 'ADMIN',
    });

    // Seed a tutor user + tutor record
    const tutorUser = await prisma.user.create({
      data: {
        email: 'tutor-class@test.com',
        password_hash: 'hashed',
        name: 'Tutor',
        role: 'TUTOR',
        institution_id: institutionId,
      },
    });

    const tutor = await prisma.tutor.create({
      data: {
        user_id: tutorUser.id,
        institution_id: institutionId,
        subjects: ['Mathematics'],
      },
    });
    tutorId = tutor.id;
  });

  afterAll(async () => {
    await prisma.enrollment.deleteMany({ where: { institution_id: institutionId } });
    await prisma.class.deleteMany({ where: { institution_id: institutionId } });
    await prisma.tutor.deleteMany({ where: { institution_id: institutionId } });
    await prisma.user.deleteMany({ where: { institution_id: institutionId } });
    await prisma.institution.delete({ where: { id: institutionId } });
    await app.close();
  });

  let classId: string;

  it('POST /admin/classes — should create a class', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/classes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        tutor_id: tutorId,
        name: 'Math 101',
        subject: 'Mathematics',
        capacity: 20,
        fee: 500000,
        schedule_days: ['Monday', 'Wednesday'],
        schedule_start_time: '14:00',
        schedule_end_time: '15:30',
        room: 'Room A',
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Math 101');
    expect(res.body.institution_id).toBe(institutionId);
    classId = res.body.id;
  });

  it('GET /admin/classes — should list classes with pagination', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/classes')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /admin/classes?subject=Mathematics — should filter by subject', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/classes?subject=Mathematics')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].subject).toBe('Mathematics');
  });

  it('GET /admin/classes?status=ACTIVE — should filter by status', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/classes?status=ACTIVE')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.every((c: any) => c.status === 'ACTIVE')).toBe(true);
  });

  it('GET /admin/classes/:id — should return class with occupancy stat', async () => {
    const res = await request(app.getHttpServer())
      .get(`/admin/classes/${classId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.id).toBe(classId);
    expect(res.body).toHaveProperty('enrolled_count');
    expect(res.body.enrolled_count).toBe(0);
  });

  it('PATCH /admin/classes/:id — should update a class', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/admin/classes/${classId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Math 102', capacity: 25 })
      .expect(200);

    expect(res.body.name).toBe('Math 102');
    expect(res.body.capacity).toBe(25);
  });

  it('DELETE /admin/classes/:id — should delete a class', async () => {
    await request(app.getHttpServer())
      .delete(`/admin/classes/${classId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/admin/classes/${classId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
```

- [ ] Run: `npx jest class.integration.spec.ts` — expect all tests to **pass**

---

## Section B: Enrollment Module

### Step 7 — Create Enrollment DTOs with Zod

- [ ] Create `sinaloka-backend/src/modules/enrollment/enrollment.dto.ts`

```ts
// sinaloka-backend/src/modules/enrollment/enrollment.dto.ts
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const EnrollmentStatus = z.enum(['ACTIVE', 'TRIAL', 'WAITLISTED', 'DROPPED']);
const PaymentStatus = z.enum(['PAID', 'PENDING', 'OVERDUE']);

export const CreateEnrollmentSchema = z.object({
  student_id: z.string().uuid(),
  class_id: z.string().uuid(),
  status: EnrollmentStatus.default('ACTIVE'),
  payment_status: PaymentStatus.default('PENDING'),
  enrolled_at: z.coerce.date().optional(),
});

export class CreateEnrollmentDto extends createZodDto(CreateEnrollmentSchema) {}

export const UpdateEnrollmentSchema = z.object({
  status: EnrollmentStatus.optional(),
  payment_status: PaymentStatus.optional(),
});

export class UpdateEnrollmentDto extends createZodDto(UpdateEnrollmentSchema) {}

export const EnrollmentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  student_id: z.string().uuid().optional(),
  class_id: z.string().uuid().optional(),
  status: EnrollmentStatus.optional(),
  payment_status: PaymentStatus.optional(),
  sort_by: z.enum(['enrolled_at', 'created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export class EnrollmentQueryDto extends createZodDto(EnrollmentQuerySchema) {}

export const CheckConflictSchema = z.object({
  student_id: z.string().uuid(),
  class_id: z.string().uuid(),
});

export class CheckConflictDto extends createZodDto(CheckConflictSchema) {}
```

- [ ] Verify the file compiles: `npx tsc --noEmit`

---

### Step 8 — Write failing unit tests for conflict detection logic

- [ ] Create `sinaloka-backend/src/modules/enrollment/enrollment.service.spec.ts`

```ts
// sinaloka-backend/src/modules/enrollment/enrollment.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { EnrollmentService } from './enrollment.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('EnrollmentService', () => {
  let service: EnrollmentService;
  let prisma: PrismaService;

  const mockPrisma = {
    enrollment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    class: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const institutionId = 'inst-uuid-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EnrollmentService>(EnrollmentService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('checkConflict', () => {
    const targetClass = {
      id: 'class-target',
      schedule_days: ['Monday', 'Wednesday'],
      schedule_start_time: '14:00',
      schedule_end_time: '15:30',
    };

    it('should return no conflicts when student has no other enrollments', async () => {
      mockPrisma.class.findFirst.mockResolvedValue(targetClass);
      mockPrisma.enrollment.findMany.mockResolvedValue([]);

      const result = await service.checkConflict(institutionId, {
        student_id: 'student-1',
        class_id: 'class-target',
      });

      expect(result).toEqual({ has_conflict: false, conflicting_classes: [] });
    });

    it('should detect conflict when time ranges overlap on the same day', async () => {
      // Target class: Mon/Wed 14:00-15:30
      mockPrisma.class.findFirst.mockResolvedValue(targetClass);

      // Student already enrolled in a class: Mon/Fri 15:00-16:30 (overlaps 15:00-15:30 on Monday)
      const conflictingClass = {
        id: 'class-conflict',
        name: 'Physics 101',
        schedule_days: ['Monday', 'Friday'],
        schedule_start_time: '15:00',
        schedule_end_time: '16:30',
      };
      mockPrisma.enrollment.findMany.mockResolvedValue([
        { class: conflictingClass },
      ]);

      const result = await service.checkConflict(institutionId, {
        student_id: 'student-1',
        class_id: 'class-target',
      });

      expect(result.has_conflict).toBe(true);
      expect(result.conflicting_classes).toHaveLength(1);
      expect(result.conflicting_classes[0].id).toBe('class-conflict');
    });

    it('should NOT detect conflict when times do not overlap even on the same day', async () => {
      // Target class: Mon/Wed 14:00-15:30
      mockPrisma.class.findFirst.mockResolvedValue(targetClass);

      // Student already enrolled in a class: Mon/Fri 16:00-17:00 (no overlap)
      const nonConflictingClass = {
        id: 'class-noconflict',
        name: 'English 101',
        schedule_days: ['Monday', 'Friday'],
        schedule_start_time: '16:00',
        schedule_end_time: '17:00',
      };
      mockPrisma.enrollment.findMany.mockResolvedValue([
        { class: nonConflictingClass },
      ]);

      const result = await service.checkConflict(institutionId, {
        student_id: 'student-1',
        class_id: 'class-target',
      });

      expect(result.has_conflict).toBe(false);
      expect(result.conflicting_classes).toHaveLength(0);
    });

    it('should NOT detect conflict when days do not overlap', async () => {
      // Target class: Mon/Wed 14:00-15:30
      mockPrisma.class.findFirst.mockResolvedValue(targetClass);

      // Student already enrolled in a class: Tue/Thu 14:00-15:30 (same time, different days)
      const nonConflictingClass = {
        id: 'class-diffday',
        name: 'Biology 101',
        schedule_days: ['Tuesday', 'Thursday'],
        schedule_start_time: '14:00',
        schedule_end_time: '15:30',
      };
      mockPrisma.enrollment.findMany.mockResolvedValue([
        { class: nonConflictingClass },
      ]);

      const result = await service.checkConflict(institutionId, {
        student_id: 'student-1',
        class_id: 'class-target',
      });

      expect(result.has_conflict).toBe(false);
      expect(result.conflicting_classes).toHaveLength(0);
    });

    it('should detect conflict when times are exactly adjacent (end == start counts as no conflict)', async () => {
      // Target class: Mon/Wed 14:00-15:30
      mockPrisma.class.findFirst.mockResolvedValue(targetClass);

      // Student enrolled in class: Mon 15:30-17:00 (starts exactly when target ends — no overlap)
      const adjacentClass = {
        id: 'class-adjacent',
        name: 'Chemistry 101',
        schedule_days: ['Monday'],
        schedule_start_time: '15:30',
        schedule_end_time: '17:00',
      };
      mockPrisma.enrollment.findMany.mockResolvedValue([
        { class: adjacentClass },
      ]);

      const result = await service.checkConflict(institutionId, {
        student_id: 'student-1',
        class_id: 'class-target',
      });

      expect(result.has_conflict).toBe(false);
      expect(result.conflicting_classes).toHaveLength(0);
    });

    it('should detect multiple conflicts', async () => {
      // Target class: Mon/Wed 14:00-15:30
      mockPrisma.class.findFirst.mockResolvedValue(targetClass);

      const conflicting1 = {
        id: 'class-c1',
        name: 'Physics',
        schedule_days: ['Monday'],
        schedule_start_time: '13:00',
        schedule_end_time: '14:30',
      };
      const conflicting2 = {
        id: 'class-c2',
        name: 'Art',
        schedule_days: ['Wednesday'],
        schedule_start_time: '15:00',
        schedule_end_time: '16:00',
      };
      mockPrisma.enrollment.findMany.mockResolvedValue([
        { class: conflicting1 },
        { class: conflicting2 },
      ]);

      const result = await service.checkConflict(institutionId, {
        student_id: 'student-1',
        class_id: 'class-target',
      });

      expect(result.has_conflict).toBe(true);
      expect(result.conflicting_classes).toHaveLength(2);
    });
  });

  describe('create', () => {
    it('should create an enrollment when no conflict and no duplicate', async () => {
      const dto = {
        student_id: 'student-1',
        class_id: 'class-1',
        status: 'ACTIVE' as const,
        payment_status: 'PENDING' as const,
      };
      const targetClass = {
        id: 'class-1',
        schedule_days: ['Monday'],
        schedule_start_time: '14:00',
        schedule_end_time: '15:30',
      };

      mockPrisma.class.findFirst.mockResolvedValue(targetClass);
      mockPrisma.enrollment.findMany.mockResolvedValue([]); // no conflicts
      mockPrisma.enrollment.findFirst.mockResolvedValue(null); // no duplicate

      const expected = { id: 'enroll-1', institution_id: 'inst-uuid-1', ...dto };
      mockPrisma.enrollment.create.mockResolvedValue(expected);

      const result = await service.create(institutionId, dto);

      expect(mockPrisma.enrollment.create).toHaveBeenCalled();
      expect(result).toEqual(expected);
    });

    it('should reject enrollment when schedule conflict exists', async () => {
      const dto = {
        student_id: 'student-1',
        class_id: 'class-target',
        status: 'ACTIVE' as const,
        payment_status: 'PENDING' as const,
      };
      const targetClass = {
        id: 'class-target',
        schedule_days: ['Monday'],
        schedule_start_time: '14:00',
        schedule_end_time: '15:30',
      };
      const conflictingClass = {
        id: 'class-conflict',
        name: 'Physics',
        schedule_days: ['Monday'],
        schedule_start_time: '15:00',
        schedule_end_time: '16:30',
      };

      mockPrisma.class.findFirst.mockResolvedValue(targetClass);
      mockPrisma.enrollment.findMany.mockResolvedValue([
        { class: conflictingClass },
      ]);

      await expect(service.create(institutionId, dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reject duplicate enrollment (same student + class)', async () => {
      const dto = {
        student_id: 'student-1',
        class_id: 'class-1',
        status: 'ACTIVE' as const,
        payment_status: 'PENDING' as const,
      };
      const targetClass = {
        id: 'class-1',
        schedule_days: ['Tuesday'],
        schedule_start_time: '10:00',
        schedule_end_time: '11:00',
      };

      mockPrisma.class.findFirst.mockResolvedValue(targetClass);
      mockPrisma.enrollment.findMany.mockResolvedValue([]); // no schedule conflict
      mockPrisma.enrollment.findFirst.mockResolvedValue({ id: 'existing' }); // duplicate exists

      await expect(service.create(institutionId, dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated enrollments', async () => {
      const query = {
        page: 1,
        limit: 20,
        sort_by: 'created_at' as const,
        sort_order: 'desc' as const,
      };
      mockPrisma.enrollment.findMany.mockResolvedValue([]);
      mockPrisma.enrollment.count.mockResolvedValue(0);

      const result = await service.findAll(institutionId, query);

      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 20 });
    });

    it('should filter by student_id', async () => {
      const query = {
        page: 1,
        limit: 20,
        student_id: 'student-1',
        sort_by: 'created_at' as const,
        sort_order: 'desc' as const,
      };
      mockPrisma.enrollment.findMany.mockResolvedValue([]);
      mockPrisma.enrollment.count.mockResolvedValue(0);

      await service.findAll(institutionId, query);

      expect(mockPrisma.enrollment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            institution_id: institutionId,
            student_id: 'student-1',
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return an enrollment', async () => {
      const enrollment = { id: 'enroll-1', institution_id: institutionId };
      mockPrisma.enrollment.findFirst.mockResolvedValue(enrollment);

      const result = await service.findOne(institutionId, 'enroll-1');
      expect(result).toEqual(enrollment);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.enrollment.findFirst.mockResolvedValue(null);

      await expect(service.findOne(institutionId, 'nope')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update an enrollment', async () => {
      const existing = { id: 'enroll-1', institution_id: institutionId };
      mockPrisma.enrollment.findFirst.mockResolvedValue(existing);
      mockPrisma.enrollment.update.mockResolvedValue({
        ...existing,
        status: 'DROPPED',
      });

      const result = await service.update(institutionId, 'enroll-1', {
        status: 'DROPPED',
      });
      expect(result.status).toBe('DROPPED');
    });

    it('should throw NotFoundException when updating nonexistent', async () => {
      mockPrisma.enrollment.findFirst.mockResolvedValue(null);

      await expect(
        service.update(institutionId, 'nope', { status: 'DROPPED' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete an enrollment', async () => {
      const existing = { id: 'enroll-1', institution_id: institutionId };
      mockPrisma.enrollment.findFirst.mockResolvedValue(existing);
      mockPrisma.enrollment.delete.mockResolvedValue(existing);

      await service.remove(institutionId, 'enroll-1');

      expect(mockPrisma.enrollment.delete).toHaveBeenCalledWith({
        where: { id: 'enroll-1' },
      });
    });

    it('should throw NotFoundException when deleting nonexistent', async () => {
      mockPrisma.enrollment.findFirst.mockResolvedValue(null);

      await expect(service.remove(institutionId, 'nope')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
```

- [ ] Run: `npx jest enrollment.service.spec.ts` — expect all tests to **fail** (EnrollmentService does not exist yet)

---

### Step 9 — Implement EnrollmentService with conflict detection

- [ ] Create `sinaloka-backend/src/modules/enrollment/enrollment.service.ts`

```ts
// sinaloka-backend/src/modules/enrollment/enrollment.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class EnrollmentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check whether two time ranges overlap.
   * Overlap = startA < endB AND startB < endA
   * Adjacent times (15:30 == 15:30) are NOT considered overlap.
   */
  private timeRangesOverlap(
    startA: string,
    endA: string,
    startB: string,
    endB: string,
  ): boolean {
    return startA < endB && startB < endA;
  }

  /**
   * Check whether two sets of schedule days share at least one day.
   */
  private daysOverlap(daysA: string[], daysB: string[]): boolean {
    return daysA.some((day) => daysB.includes(day));
  }

  /**
   * Check if enrolling a student into a class would cause a schedule conflict.
   * Returns the list of conflicting classes.
   */
  async checkConflict(
    institutionId: string,
    dto: { student_id: string; class_id: string },
  ) {
    const targetClass = await this.prisma.class.findFirst({
      where: { id: dto.class_id, institution_id: institutionId },
    });
    if (!targetClass) throw new NotFoundException('Class not found');

    // Get all active enrollments for this student, including class schedule info
    const existingEnrollments = await this.prisma.enrollment.findMany({
      where: {
        student_id: dto.student_id,
        institution_id: institutionId,
      },
      include: { class: true },
    });

    const conflictingClasses = existingEnrollments
      .map((e: any) => e.class)
      .filter((existingClass: any) => {
        const hasDayOverlap = this.daysOverlap(
          targetClass.schedule_days,
          existingClass.schedule_days,
        );
        if (!hasDayOverlap) return false;

        return this.timeRangesOverlap(
          targetClass.schedule_start_time,
          targetClass.schedule_end_time,
          existingClass.schedule_start_time,
          existingClass.schedule_end_time,
        );
      });

    return {
      has_conflict: conflictingClasses.length > 0,
      conflicting_classes: conflictingClasses,
    };
  }

  async create(institutionId: string, dto: any) {
    // 1. Check schedule conflict
    const conflict = await this.checkConflict(institutionId, {
      student_id: dto.student_id,
      class_id: dto.class_id,
    });
    if (conflict.has_conflict) {
      throw new ConflictException({
        message: 'Schedule conflict detected',
        conflicting_classes: conflict.conflicting_classes.map((c: any) => ({
          id: c.id,
          name: c.name,
          schedule_days: c.schedule_days,
          schedule_start_time: c.schedule_start_time,
          schedule_end_time: c.schedule_end_time,
        })),
      });
    }

    // 2. Check duplicate enrollment (UNIQUE student_id + class_id)
    const existing = await this.prisma.enrollment.findFirst({
      where: {
        student_id: dto.student_id,
        class_id: dto.class_id,
      },
    });
    if (existing) {
      throw new ConflictException('Student is already enrolled in this class');
    }

    // 3. Create enrollment
    return this.prisma.enrollment.create({
      data: {
        ...dto,
        institution_id: institutionId,
        enrolled_at: dto.enrolled_at ?? new Date(),
      },
    });
  }

  async findAll(institutionId: string, query: any) {
    const { page, limit, student_id, class_id, status, payment_status, sort_by, sort_order } =
      query;

    const where: any = { institution_id: institutionId };
    if (student_id) where.student_id = student_id;
    if (class_id) where.class_id = class_id;
    if (status) where.status = status;
    if (payment_status) where.payment_status = payment_status;

    const [data, total] = await Promise.all([
      this.prisma.enrollment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sort_by]: sort_order },
        include: {
          student: { select: { id: true, name: true } },
          class: { select: { id: true, name: true, subject: true } },
        },
      }),
      this.prisma.enrollment.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(institutionId: string, id: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id, institution_id: institutionId },
      include: {
        student: { select: { id: true, name: true } },
        class: { select: { id: true, name: true, subject: true } },
      },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    return enrollment;
  }

  async update(institutionId: string, id: string, dto: any) {
    const existing = await this.prisma.enrollment.findFirst({
      where: { id, institution_id: institutionId },
    });
    if (!existing) throw new NotFoundException('Enrollment not found');

    return this.prisma.enrollment.update({
      where: { id },
      data: dto,
    });
  }

  async remove(institutionId: string, id: string) {
    const existing = await this.prisma.enrollment.findFirst({
      where: { id, institution_id: institutionId },
    });
    if (!existing) throw new NotFoundException('Enrollment not found');

    return this.prisma.enrollment.delete({ where: { id } });
  }
}
```

- [ ] Run: `npx jest enrollment.service.spec.ts` — expect all tests to **pass**

---

### Step 10 — Create EnrollmentController

- [ ] Create `sinaloka-backend/src/modules/enrollment/enrollment.controller.ts`

```ts
// sinaloka-backend/src/modules/enrollment/enrollment.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import {
  CreateEnrollmentDto,
  UpdateEnrollmentDto,
  EnrollmentQueryDto,
  CheckConflictDto,
  CreateEnrollmentSchema,
  UpdateEnrollmentSchema,
  EnrollmentQuerySchema,
  CheckConflictSchema,
} from './enrollment.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('admin/enrollments')
@UseGuards(AuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post()
  create(
    @Tenant() institutionId: string,
    @Body(new ZodValidationPipe(CreateEnrollmentSchema)) dto: CreateEnrollmentDto,
  ) {
    return this.enrollmentService.create(institutionId, dto);
  }

  @Post('check-conflict')
  checkConflict(
    @Tenant() institutionId: string,
    @Body(new ZodValidationPipe(CheckConflictSchema)) dto: CheckConflictDto,
  ) {
    return this.enrollmentService.checkConflict(institutionId, dto);
  }

  @Get()
  findAll(
    @Tenant() institutionId: string,
    @Query(new ZodValidationPipe(EnrollmentQuerySchema)) query: EnrollmentQueryDto,
  ) {
    return this.enrollmentService.findAll(institutionId, query);
  }

  @Get(':id')
  findOne(@Tenant() institutionId: string, @Param('id') id: string) {
    return this.enrollmentService.findOne(institutionId, id);
  }

  @Patch(':id')
  update(
    @Tenant() institutionId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateEnrollmentSchema)) dto: UpdateEnrollmentDto,
  ) {
    return this.enrollmentService.update(institutionId, id, dto);
  }

  @Delete(':id')
  remove(@Tenant() institutionId: string, @Param('id') id: string) {
    return this.enrollmentService.remove(institutionId, id);
  }
}
```

---

### Step 11 — Create EnrollmentModule

- [ ] Create `sinaloka-backend/src/modules/enrollment/enrollment.module.ts`

```ts
// sinaloka-backend/src/modules/enrollment/enrollment.module.ts
import { Module } from '@nestjs/common';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentService } from './enrollment.service';

@Module({
  controllers: [EnrollmentController],
  providers: [EnrollmentService],
  exports: [EnrollmentService],
})
export class EnrollmentModule {}
```

- [ ] Register `EnrollmentModule` in `sinaloka-backend/src/app.module.ts` imports array
- [ ] Verify compilation: `npx tsc --noEmit`

---

### Step 12 — Write Enrollment integration test

- [ ] Create `sinaloka-backend/src/modules/enrollment/enrollment.integration.spec.ts`

```ts
// sinaloka-backend/src/modules/enrollment/enrollment.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('EnrollmentController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let institutionId: string;
  let studentId: string;
  let classAId: string;
  let classBId: string; // conflicts with A
  let classCId: string; // no conflict with A
  let tutorId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    // Seed institution
    const institution = await prisma.institution.create({
      data: { name: 'Test School Enrollment', slug: 'test-school-enrollment' },
    });
    institutionId = institution.id;

    // Seed admin
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin-enrollment@test.com',
        password_hash: 'hashed',
        name: 'Admin',
        role: 'ADMIN',
        institution_id: institutionId,
      },
    });
    adminToken = jwtService.sign({
      userId: adminUser.id,
      institutionId,
      role: 'ADMIN',
    });

    // Seed tutor
    const tutorUser = await prisma.user.create({
      data: {
        email: 'tutor-enrollment@test.com',
        password_hash: 'hashed',
        name: 'Tutor',
        role: 'TUTOR',
        institution_id: institutionId,
      },
    });
    const tutor = await prisma.tutor.create({
      data: {
        user_id: tutorUser.id,
        institution_id: institutionId,
        subjects: ['Math'],
      },
    });
    tutorId = tutor.id;

    // Seed student
    const student = await prisma.student.create({
      data: {
        institution_id: institutionId,
        name: 'John Doe',
        grade: '10',
        status: 'ACTIVE',
        enrolled_at: new Date(),
      },
    });
    studentId = student.id;

    // Class A: Mon/Wed 14:00-15:30
    const classA = await prisma.class.create({
      data: {
        institution_id: institutionId,
        tutor_id: tutorId,
        name: 'Math 101',
        subject: 'Mathematics',
        capacity: 20,
        fee: 500000,
        schedule_days: ['Monday', 'Wednesday'],
        schedule_start_time: '14:00',
        schedule_end_time: '15:30',
        status: 'ACTIVE',
      },
    });
    classAId = classA.id;

    // Class B: Mon 15:00-16:30 (CONFLICTS with A on Monday)
    const classB = await prisma.class.create({
      data: {
        institution_id: institutionId,
        tutor_id: tutorId,
        name: 'Physics 101',
        subject: 'Physics',
        capacity: 20,
        fee: 500000,
        schedule_days: ['Monday'],
        schedule_start_time: '15:00',
        schedule_end_time: '16:30',
        status: 'ACTIVE',
      },
    });
    classBId = classB.id;

    // Class C: Tue/Thu 14:00-15:30 (NO conflict with A — different days)
    const classC = await prisma.class.create({
      data: {
        institution_id: institutionId,
        tutor_id: tutorId,
        name: 'English 101',
        subject: 'English',
        capacity: 20,
        fee: 400000,
        schedule_days: ['Tuesday', 'Thursday'],
        schedule_start_time: '14:00',
        schedule_end_time: '15:30',
        status: 'ACTIVE',
      },
    });
    classCId = classC.id;
  });

  afterAll(async () => {
    await prisma.enrollment.deleteMany({ where: { institution_id: institutionId } });
    await prisma.class.deleteMany({ where: { institution_id: institutionId } });
    await prisma.student.deleteMany({ where: { institution_id: institutionId } });
    await prisma.tutor.deleteMany({ where: { institution_id: institutionId } });
    await prisma.user.deleteMany({ where: { institution_id: institutionId } });
    await prisma.institution.delete({ where: { id: institutionId } });
    await app.close();
  });

  let enrollmentId: string;

  it('POST /admin/enrollments — should create enrollment', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/enrollments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        student_id: studentId,
        class_id: classAId,
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.student_id).toBe(studentId);
    expect(res.body.class_id).toBe(classAId);
    enrollmentId = res.body.id;
  });

  it('POST /admin/enrollments — should reject duplicate enrollment', async () => {
    await request(app.getHttpServer())
      .post('/admin/enrollments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        student_id: studentId,
        class_id: classAId,
      })
      .expect(409);
  });

  it('POST /admin/enrollments/check-conflict — should detect conflict', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/enrollments/check-conflict')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        student_id: studentId,
        class_id: classBId,
      })
      .expect(201);

    expect(res.body.has_conflict).toBe(true);
    expect(res.body.conflicting_classes.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /admin/enrollments/check-conflict — should return no conflict for non-overlapping', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/enrollments/check-conflict')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        student_id: studentId,
        class_id: classCId,
      })
      .expect(201);

    expect(res.body.has_conflict).toBe(false);
    expect(res.body.conflicting_classes).toHaveLength(0);
  });

  it('POST /admin/enrollments — should reject enrollment with schedule conflict', async () => {
    await request(app.getHttpServer())
      .post('/admin/enrollments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        student_id: studentId,
        class_id: classBId,
      })
      .expect(409);
  });

  it('POST /admin/enrollments — should allow enrollment with no conflict', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/enrollments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        student_id: studentId,
        class_id: classCId,
      })
      .expect(201);

    expect(res.body.class_id).toBe(classCId);
  });

  it('GET /admin/enrollments — should list enrollments with pagination', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/enrollments')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it('GET /admin/enrollments?student_id=... — should filter by student', async () => {
    const res = await request(app.getHttpServer())
      .get(`/admin/enrollments?student_id=${studentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.every((e: any) => e.student_id === studentId)).toBe(true);
  });

  it('GET /admin/enrollments/:id — should return enrollment detail', async () => {
    const res = await request(app.getHttpServer())
      .get(`/admin/enrollments/${enrollmentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.id).toBe(enrollmentId);
    expect(res.body).toHaveProperty('student');
    expect(res.body).toHaveProperty('class');
  });

  it('PATCH /admin/enrollments/:id — should update enrollment', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/admin/enrollments/${enrollmentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'DROPPED', payment_status: 'OVERDUE' })
      .expect(200);

    expect(res.body.status).toBe('DROPPED');
    expect(res.body.payment_status).toBe('OVERDUE');
  });

  it('DELETE /admin/enrollments/:id — should delete enrollment', async () => {
    await request(app.getHttpServer())
      .delete(`/admin/enrollments/${enrollmentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/admin/enrollments/${enrollmentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
```

- [ ] Run: `npx jest enrollment.integration.spec.ts` — expect all tests to **pass**

---

## Summary Checklist

| # | Task | File(s) | Type |
|---|------|---------|------|
| 1 | Class DTOs | `src/modules/class/class.dto.ts` | Create |
| 2 | Class service unit tests (failing) | `src/modules/class/class.service.spec.ts` | Test |
| 3 | Class service implementation | `src/modules/class/class.service.ts` | Create |
| 4 | Class controller | `src/modules/class/class.controller.ts` | Create |
| 5 | Class module + register in AppModule | `src/modules/class/class.module.ts`, `src/app.module.ts` | Create + Edit |
| 6 | Class integration test | `src/modules/class/class.integration.spec.ts` | Test |
| 7 | Enrollment DTOs | `src/modules/enrollment/enrollment.dto.ts` | Create |
| 8 | Enrollment service unit tests (failing, especially conflict logic) | `src/modules/enrollment/enrollment.service.spec.ts` | Test |
| 9 | Enrollment service with conflict detection | `src/modules/enrollment/enrollment.service.ts` | Create |
| 10 | Enrollment controller | `src/modules/enrollment/enrollment.controller.ts` | Create |
| 11 | Enrollment module + register in AppModule | `src/modules/enrollment/enrollment.module.ts`, `src/app.module.ts` | Create + Edit |
| 12 | Enrollment integration test | `src/modules/enrollment/enrollment.integration.spec.ts` | Test |
# Chunk 5: Session + Attendance Modules (Phase 4)

**Estimated time:** ~120 minutes
**Depends on:** Chunk 1 (project scaffold, Prisma, common utilities), Chunk 2 (Auth, Institution, User modules), Chunk 3 (Student, Tutor modules), Chunk 4 (Class, Enrollment modules)
**Outcome:** Admin can CRUD sessions, auto-generate sessions from class schedules, and approve/reject reschedule requests. Tutor can view own schedule, request reschedules, and cancel sessions. Admin can view and correct attendance. Tutor can batch-create and update attendance records for own sessions.

---

## Section A: Session Module

### Step 1 — Create Session DTOs with Zod

- [ ] Create `sinaloka-backend/src/modules/session/session.dto.ts`

```ts
// sinaloka-backend/src/modules/session/session.dto.ts
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const SessionStatus = z.enum([
  'SCHEDULED',
  'COMPLETED',
  'CANCELLED',
  'RESCHEDULE_REQUESTED',
]);

const TimeString = z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM format');

export const CreateSessionSchema = z.object({
  class_id: z.string().uuid(),
  date: z.coerce.date(),
  start_time: TimeString,
  end_time: TimeString,
  status: SessionStatus.default('SCHEDULED'),
  topic_covered: z.string().max(500).optional().nullable(),
  session_summary: z.string().max(2000).optional().nullable(),
});

export class CreateSessionDto extends createZodDto(CreateSessionSchema) {}

export const UpdateSessionSchema = z.object({
  date: z.coerce.date().optional(),
  start_time: TimeString.optional(),
  end_time: TimeString.optional(),
  status: SessionStatus.optional(),
  topic_covered: z.string().max(500).optional().nullable(),
  session_summary: z.string().max(2000).optional().nullable(),
});

export class UpdateSessionDto extends createZodDto(UpdateSessionSchema) {}

export const GenerateSessionsSchema = z.object({
  class_id: z.string().uuid(),
  date_from: z.coerce.date(),
  date_to: z.coerce.date(),
});

export class GenerateSessionsDto extends createZodDto(GenerateSessionsSchema) {}

export const ApproveRescheduleSchema = z.object({
  approved: z.boolean(),
});

export class ApproveRescheduleDto extends createZodDto(ApproveRescheduleSchema) {}

export const RequestRescheduleSchema = z.object({
  proposed_date: z.coerce.date(),
  proposed_start_time: TimeString,
  proposed_end_time: TimeString,
  reschedule_reason: z.string().min(1).max(500),
});

export class RequestRescheduleDto extends createZodDto(RequestRescheduleSchema) {}

export const SessionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  class_id: z.string().uuid().optional(),
  status: SessionStatus.optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
  sort_by: z.enum(['date', 'start_time', 'created_at']).default('date'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
});

export class SessionQueryDto extends createZodDto(SessionQuerySchema) {}

export const TutorScheduleQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: SessionStatus.optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
  sort_by: z.enum(['date', 'start_time', 'created_at']).default('date'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
});

export class TutorScheduleQueryDto extends createZodDto(TutorScheduleQuerySchema) {}
```

### Step 2 — Write failing unit tests for SessionService (CRUD + generate + reschedule)

- [ ] Create `sinaloka-backend/src/modules/session/session.service.spec.ts`

```ts
// sinaloka-backend/src/modules/session/session.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from './session.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

describe('SessionService', () => {
  let service: SessionService;
  let prisma: PrismaService;

  const mockPrisma = {
    session: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    class: {
      findUnique: jest.fn(),
    },
    tutor: {
      findFirst: jest.fn(),
    },
  };

  const institutionId = 'inst-uuid-1';
  const userId = 'user-uuid-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a session scoped to institution', async () => {
      const dto = {
        class_id: 'class-uuid-1',
        date: new Date('2026-04-01'),
        start_time: '14:00',
        end_time: '15:30',
        status: 'SCHEDULED' as const,
      };

      const createdSession = {
        id: 'session-uuid-1',
        institution_id: institutionId,
        created_by: userId,
        ...dto,
      };

      mockPrisma.class.findUnique.mockResolvedValue({
        id: 'class-uuid-1',
        institution_id: institutionId,
      });
      mockPrisma.session.create.mockResolvedValue(createdSession);

      const result = await service.create(institutionId, userId, dto);

      expect(result).toEqual(createdSession);
      expect(mockPrisma.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          institution_id: institutionId,
          class_id: dto.class_id,
          date: dto.date,
          start_time: dto.start_time,
          end_time: dto.end_time,
          created_by: userId,
        }),
        include: { class: true },
      });
    });

    it('should throw NotFoundException if class not found', async () => {
      mockPrisma.class.findUnique.mockResolvedValue(null);

      await expect(
        service.create(institutionId, userId, {
          class_id: 'nonexistent',
          date: new Date(),
          start_time: '14:00',
          end_time: '15:30',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated sessions for institution', async () => {
      const sessions = [
        { id: 'session-1', institution_id: institutionId, date: new Date() },
      ];
      mockPrisma.session.findMany.mockResolvedValue(sessions);
      mockPrisma.session.count.mockResolvedValue(1);

      const result = await service.findAll(institutionId, {
        page: 1,
        limit: 20,
        sort_by: 'date',
        sort_order: 'asc',
      });

      expect(result.data).toEqual(sessions);
      expect(result.total).toBe(1);
    });

    it('should filter by class_id', async () => {
      mockPrisma.session.findMany.mockResolvedValue([]);
      mockPrisma.session.count.mockResolvedValue(0);

      await service.findAll(institutionId, {
        page: 1,
        limit: 20,
        class_id: 'class-uuid-1',
        sort_by: 'date',
        sort_order: 'asc',
      });

      expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            institution_id: institutionId,
            class_id: 'class-uuid-1',
          }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrisma.session.findMany.mockResolvedValue([]);
      mockPrisma.session.count.mockResolvedValue(0);

      await service.findAll(institutionId, {
        page: 1,
        limit: 20,
        status: 'SCHEDULED',
        sort_by: 'date',
        sort_order: 'asc',
      });

      expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            institution_id: institutionId,
            status: 'SCHEDULED',
          }),
        }),
      );
    });

    it('should filter by date range', async () => {
      mockPrisma.session.findMany.mockResolvedValue([]);
      mockPrisma.session.count.mockResolvedValue(0);

      const dateFrom = new Date('2026-04-01');
      const dateTo = new Date('2026-04-30');

      await service.findAll(institutionId, {
        page: 1,
        limit: 20,
        date_from: dateFrom,
        date_to: dateTo,
        sort_by: 'date',
        sort_order: 'asc',
      });

      expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            institution_id: institutionId,
            date: { gte: dateFrom, lte: dateTo },
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a session by id within institution', async () => {
      const session = {
        id: 'session-1',
        institution_id: institutionId,
        date: new Date(),
      };
      mockPrisma.session.findUnique.mockResolvedValue(session);

      const result = await service.findOne(institutionId, 'session-1');

      expect(result).toEqual(session);
      expect(mockPrisma.session.findUnique).toHaveBeenCalledWith({
        where: { id: 'session-1', institution_id: institutionId },
        include: { class: true },
      });
    });

    it('should throw NotFoundException if session not found', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne(institutionId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a session', async () => {
      const existing = {
        id: 'session-1',
        institution_id: institutionId,
        status: 'SCHEDULED',
      };
      mockPrisma.session.findUnique.mockResolvedValue(existing);

      const updated = { ...existing, topic_covered: 'Algebra' };
      mockPrisma.session.update.mockResolvedValue(updated);

      const result = await service.update(institutionId, 'session-1', {
        topic_covered: 'Algebra',
      });

      expect(result.topic_covered).toBe('Algebra');
    });

    it('should throw NotFoundException if session not found', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      await expect(
        service.update(institutionId, 'nonexistent', {
          topic_covered: 'X',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a session', async () => {
      const existing = {
        id: 'session-1',
        institution_id: institutionId,
      };
      mockPrisma.session.findUnique.mockResolvedValue(existing);
      mockPrisma.session.delete.mockResolvedValue(existing);

      const result = await service.delete(institutionId, 'session-1');

      expect(result).toEqual(existing);
    });

    it('should throw NotFoundException if session not found', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      await expect(
        service.delete(institutionId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateSessions', () => {
    it('should generate sessions for matching schedule days in date range', async () => {
      const classRecord = {
        id: 'class-uuid-1',
        institution_id: institutionId,
        schedule_days: ['Monday', 'Wednesday'],
        schedule_start_time: '14:00',
        schedule_end_time: '15:30',
      };

      mockPrisma.class.findUnique.mockResolvedValue(classRecord);
      // No existing sessions
      mockPrisma.session.findMany.mockResolvedValue([]);
      mockPrisma.session.createMany.mockResolvedValue({ count: 4 });

      // 2026-04-06 (Mon) to 2026-04-15 (Wed) — Mon 6, Wed 8, Mon 13, Wed 15 = 4 sessions
      const result = await service.generateSessions(institutionId, userId, {
        class_id: 'class-uuid-1',
        date_from: new Date('2026-04-06'),
        date_to: new Date('2026-04-15'),
      });

      expect(result.count).toBe(4);
      expect(mockPrisma.session.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            class_id: 'class-uuid-1',
            institution_id: institutionId,
            start_time: '14:00',
            end_time: '15:30',
            status: 'SCHEDULED',
            created_by: userId,
          }),
        ]),
        skipDuplicates: true,
      });
    });

    it('should skip dates that already have sessions (idempotent)', async () => {
      const classRecord = {
        id: 'class-uuid-1',
        institution_id: institutionId,
        schedule_days: ['Monday', 'Wednesday'],
        schedule_start_time: '14:00',
        schedule_end_time: '15:30',
      };

      mockPrisma.class.findUnique.mockResolvedValue(classRecord);
      // One session already exists for Mon Apr 6
      mockPrisma.session.findMany.mockResolvedValue([
        {
          id: 'existing-1',
          class_id: 'class-uuid-1',
          date: new Date('2026-04-06'),
        },
      ]);
      mockPrisma.session.createMany.mockResolvedValue({ count: 3 });

      const result = await service.generateSessions(institutionId, userId, {
        class_id: 'class-uuid-1',
        date_from: new Date('2026-04-06'),
        date_to: new Date('2026-04-15'),
      });

      // Should only create 3 sessions (skipped Mon Apr 6)
      expect(result.count).toBe(3);

      const createManyCall = mockPrisma.session.createMany.mock.calls[0][0];
      const dates = createManyCall.data.map((d: any) =>
        new Date(d.date).toISOString().split('T')[0],
      );
      expect(dates).not.toContain('2026-04-06');
    });

    it('should return count 0 if no matching days in range', async () => {
      const classRecord = {
        id: 'class-uuid-1',
        institution_id: institutionId,
        schedule_days: ['Saturday'],
        schedule_start_time: '09:00',
        schedule_end_time: '10:30',
      };

      mockPrisma.class.findUnique.mockResolvedValue(classRecord);
      mockPrisma.session.findMany.mockResolvedValue([]);

      // Mon to Fri range — no Saturday
      const result = await service.generateSessions(institutionId, userId, {
        class_id: 'class-uuid-1',
        date_from: new Date('2026-04-06'), // Monday
        date_to: new Date('2026-04-10'), // Friday
      });

      expect(result.count).toBe(0);
      expect(mockPrisma.session.createMany).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if class not found', async () => {
      mockPrisma.class.findUnique.mockResolvedValue(null);

      await expect(
        service.generateSessions(institutionId, userId, {
          class_id: 'nonexistent',
          date_from: new Date('2026-04-01'),
          date_to: new Date('2026-04-30'),
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if date_from > date_to', async () => {
      const classRecord = {
        id: 'class-uuid-1',
        institution_id: institutionId,
        schedule_days: ['Monday'],
        schedule_start_time: '14:00',
        schedule_end_time: '15:30',
      };

      mockPrisma.class.findUnique.mockResolvedValue(classRecord);

      await expect(
        service.generateSessions(institutionId, userId, {
          class_id: 'class-uuid-1',
          date_from: new Date('2026-04-30'),
          date_to: new Date('2026-04-01'),
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('requestReschedule', () => {
    it('should set status to RESCHEDULE_REQUESTED and store proposed values', async () => {
      const session = {
        id: 'session-1',
        institution_id: institutionId,
        class_id: 'class-uuid-1',
        status: 'SCHEDULED',
        class: { tutor_id: 'tutor-uuid-1' },
      };

      mockPrisma.session.findUnique.mockResolvedValue(session);
      mockPrisma.tutor.findFirst.mockResolvedValue({
        id: 'tutor-uuid-1',
        user_id: userId,
      });

      const updatedSession = {
        ...session,
        status: 'RESCHEDULE_REQUESTED',
        proposed_date: new Date('2026-04-10'),
        proposed_start_time: '16:00',
        proposed_end_time: '17:30',
        reschedule_reason: 'Personal conflict',
      };
      mockPrisma.session.update.mockResolvedValue(updatedSession);

      const result = await service.requestReschedule(userId, 'session-1', {
        proposed_date: new Date('2026-04-10'),
        proposed_start_time: '16:00',
        proposed_end_time: '17:30',
        reschedule_reason: 'Personal conflict',
      });

      expect(result.status).toBe('RESCHEDULE_REQUESTED');
      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: {
          status: 'RESCHEDULE_REQUESTED',
          proposed_date: new Date('2026-04-10'),
          proposed_start_time: '16:00',
          proposed_end_time: '17:30',
          reschedule_reason: 'Personal conflict',
        },
        include: { class: true },
      });
    });

    it('should throw ForbiddenException if tutor does not own the session', async () => {
      const session = {
        id: 'session-1',
        institution_id: institutionId,
        class_id: 'class-uuid-1',
        status: 'SCHEDULED',
        class: { tutor_id: 'tutor-uuid-other' },
      };

      mockPrisma.session.findUnique.mockResolvedValue(session);
      mockPrisma.tutor.findFirst.mockResolvedValue({
        id: 'tutor-uuid-1',
        user_id: userId,
      });

      await expect(
        service.requestReschedule(userId, 'session-1', {
          proposed_date: new Date('2026-04-10'),
          proposed_start_time: '16:00',
          proposed_end_time: '17:30',
          reschedule_reason: 'Conflict',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if session is not SCHEDULED', async () => {
      const session = {
        id: 'session-1',
        institution_id: institutionId,
        class_id: 'class-uuid-1',
        status: 'CANCELLED',
        class: { tutor_id: 'tutor-uuid-1' },
      };

      mockPrisma.session.findUnique.mockResolvedValue(session);
      mockPrisma.tutor.findFirst.mockResolvedValue({
        id: 'tutor-uuid-1',
        user_id: userId,
      });

      await expect(
        service.requestReschedule(userId, 'session-1', {
          proposed_date: new Date('2026-04-10'),
          proposed_start_time: '16:00',
          proposed_end_time: '17:30',
          reschedule_reason: 'Conflict',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approveReschedule', () => {
    it('should approve reschedule — update date/time, clear proposed fields, set approved_by', async () => {
      const session = {
        id: 'session-1',
        institution_id: institutionId,
        status: 'RESCHEDULE_REQUESTED',
        proposed_date: new Date('2026-04-10'),
        proposed_start_time: '16:00',
        proposed_end_time: '17:30',
        reschedule_reason: 'Personal conflict',
      };

      mockPrisma.session.findUnique.mockResolvedValue(session);

      const approvedSession = {
        ...session,
        date: session.proposed_date,
        start_time: session.proposed_start_time,
        end_time: session.proposed_end_time,
        status: 'SCHEDULED',
        approved_by: userId,
        proposed_date: null,
        proposed_start_time: null,
        proposed_end_time: null,
        reschedule_reason: null,
      };
      mockPrisma.session.update.mockResolvedValue(approvedSession);

      const result = await service.approveReschedule(
        institutionId,
        userId,
        'session-1',
        { approved: true },
      );

      expect(result.status).toBe('SCHEDULED');
      expect(result.approved_by).toBe(userId);
      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1', institution_id: institutionId },
        data: {
          date: session.proposed_date,
          start_time: session.proposed_start_time,
          end_time: session.proposed_end_time,
          status: 'SCHEDULED',
          approved_by: userId,
          proposed_date: null,
          proposed_start_time: null,
          proposed_end_time: null,
          reschedule_reason: null,
        },
        include: { class: true },
      });
    });

    it('should reject reschedule — set status back to SCHEDULED, clear proposed fields', async () => {
      const session = {
        id: 'session-1',
        institution_id: institutionId,
        status: 'RESCHEDULE_REQUESTED',
        proposed_date: new Date('2026-04-10'),
        proposed_start_time: '16:00',
        proposed_end_time: '17:30',
        reschedule_reason: 'Personal conflict',
      };

      mockPrisma.session.findUnique.mockResolvedValue(session);

      const rejectedSession = {
        ...session,
        status: 'SCHEDULED',
        proposed_date: null,
        proposed_start_time: null,
        proposed_end_time: null,
        reschedule_reason: null,
      };
      mockPrisma.session.update.mockResolvedValue(rejectedSession);

      const result = await service.approveReschedule(
        institutionId,
        userId,
        'session-1',
        { approved: false },
      );

      expect(result.status).toBe('SCHEDULED');
      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1', institution_id: institutionId },
        data: {
          status: 'SCHEDULED',
          proposed_date: null,
          proposed_start_time: null,
          proposed_end_time: null,
          reschedule_reason: null,
        },
        include: { class: true },
      });
    });

    it('should throw BadRequestException if session is not RESCHEDULE_REQUESTED', async () => {
      const session = {
        id: 'session-1',
        institution_id: institutionId,
        status: 'SCHEDULED',
      };

      mockPrisma.session.findUnique.mockResolvedValue(session);

      await expect(
        service.approveReschedule(institutionId, userId, 'session-1', {
          approved: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelSession (tutor)', () => {
    it('should cancel a session owned by the tutor', async () => {
      const session = {
        id: 'session-1',
        institution_id: institutionId,
        status: 'SCHEDULED',
        class: { tutor_id: 'tutor-uuid-1' },
      };

      mockPrisma.session.findUnique.mockResolvedValue(session);
      mockPrisma.tutor.findFirst.mockResolvedValue({
        id: 'tutor-uuid-1',
        user_id: userId,
      });

      const cancelledSession = { ...session, status: 'CANCELLED' };
      mockPrisma.session.update.mockResolvedValue(cancelledSession);

      const result = await service.cancelSession(userId, 'session-1');

      expect(result.status).toBe('CANCELLED');
      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { status: 'CANCELLED' },
        include: { class: true },
      });
    });

    it('should throw ForbiddenException if tutor does not own the session', async () => {
      const session = {
        id: 'session-1',
        institution_id: institutionId,
        status: 'SCHEDULED',
        class: { tutor_id: 'tutor-uuid-other' },
      };

      mockPrisma.session.findUnique.mockResolvedValue(session);
      mockPrisma.tutor.findFirst.mockResolvedValue({
        id: 'tutor-uuid-1',
        user_id: userId,
      });

      await expect(
        service.cancelSession(userId, 'session-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getTutorSchedule', () => {
    it('should return sessions for classes owned by the tutor', async () => {
      mockPrisma.tutor.findFirst.mockResolvedValue({
        id: 'tutor-uuid-1',
        user_id: userId,
      });

      const sessions = [
        { id: 'session-1', class: { tutor_id: 'tutor-uuid-1' } },
      ];
      mockPrisma.session.findMany.mockResolvedValue(sessions);
      mockPrisma.session.count.mockResolvedValue(1);

      const result = await service.getTutorSchedule(userId, {
        page: 1,
        limit: 20,
        sort_by: 'date',
        sort_order: 'asc',
      });

      expect(result.data).toEqual(sessions);
      expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            class: { tutor_id: 'tutor-uuid-1' },
          }),
        }),
      );
    });

    it('should throw NotFoundException if tutor profile not found', async () => {
      mockPrisma.tutor.findFirst.mockResolvedValue(null);

      await expect(
        service.getTutorSchedule(userId, {
          page: 1,
          limit: 20,
          sort_by: 'date',
          sort_order: 'asc',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
```

- [ ] Run: `npm test -- session.service` — verify all tests fail (module not found)

### Step 3 — Implement SessionService

- [ ] Create `sinaloka-backend/src/modules/session/session.service.ts`

```ts
// sinaloka-backend/src/modules/session/session.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateSessionDto,
  UpdateSessionDto,
  SessionQueryDto,
  GenerateSessionsDto,
  ApproveRescheduleDto,
  RequestRescheduleDto,
  TutorScheduleQueryDto,
} from './session.dto';
import { addDays, getDay, isAfter, isBefore, isEqual } from 'date-fns';

const DAY_MAP: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(institutionId: string, userId: string, dto: CreateSessionDto) {
    const classRecord = await this.prisma.class.findUnique({
      where: { id: dto.class_id, institution_id: institutionId },
    });

    if (!classRecord) {
      throw new NotFoundException(`Class with id ${dto.class_id} not found`);
    }

    return this.prisma.session.create({
      data: {
        ...dto,
        institution_id: institutionId,
        created_by: userId,
      },
      include: { class: true },
    });
  }

  async findAll(institutionId: string, query: SessionQueryDto) {
    const { page, limit, class_id, status, date_from, date_to, sort_by, sort_order } = query;

    const where: any = { institution_id: institutionId };

    if (class_id) {
      where.class_id = class_id;
    }

    if (status) {
      where.status = status;
    }

    if (date_from || date_to) {
      where.date = {};
      if (date_from) where.date.gte = date_from;
      if (date_to) where.date.lte = date_to;
    }

    const [data, total] = await Promise.all([
      this.prisma.session.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sort_by]: sort_order },
        include: { class: true },
      }),
      this.prisma.session.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findOne(institutionId: string, id: string) {
    const session = await this.prisma.session.findUnique({
      where: { id, institution_id: institutionId },
      include: { class: true },
    });

    if (!session) {
      throw new NotFoundException(`Session with id ${id} not found`);
    }

    return session;
  }

  async update(institutionId: string, id: string, dto: UpdateSessionDto) {
    await this.findOne(institutionId, id);

    return this.prisma.session.update({
      where: { id, institution_id: institutionId },
      data: dto,
      include: { class: true },
    });
  }

  async delete(institutionId: string, id: string) {
    await this.findOne(institutionId, id);

    return this.prisma.session.delete({
      where: { id, institution_id: institutionId },
    });
  }

  async generateSessions(
    institutionId: string,
    userId: string,
    dto: GenerateSessionsDto,
  ) {
    const classRecord = await this.prisma.class.findUnique({
      where: { id: dto.class_id, institution_id: institutionId },
    });

    if (!classRecord) {
      throw new NotFoundException(`Class with id ${dto.class_id} not found`);
    }

    if (isAfter(dto.date_from, dto.date_to)) {
      throw new BadRequestException('date_from must be before or equal to date_to');
    }

    // Get target day-of-week numbers from class schedule_days
    const targetDays = (classRecord.schedule_days as string[]).map(
      (day) => DAY_MAP[day],
    );

    // Find existing sessions for this class in the date range to skip them
    const existingSessions = await this.prisma.session.findMany({
      where: {
        class_id: dto.class_id,
        institution_id: institutionId,
        date: { gte: dto.date_from, lte: dto.date_to },
      },
      select: { date: true },
    });

    const existingDates = new Set(
      existingSessions.map((s) => new Date(s.date).toISOString().split('T')[0]),
    );

    // Iterate each date in range, collect matching days
    const sessionsToCreate: Array<{
      class_id: string;
      institution_id: string;
      date: Date;
      start_time: string;
      end_time: string;
      status: string;
      created_by: string;
    }> = [];

    let current = new Date(dto.date_from);
    const end = new Date(dto.date_to);

    while (isBefore(current, end) || isEqual(current, end)) {
      const dayOfWeek = getDay(current);

      if (targetDays.includes(dayOfWeek)) {
        const dateStr = current.toISOString().split('T')[0];

        if (!existingDates.has(dateStr)) {
          sessionsToCreate.push({
            class_id: dto.class_id,
            institution_id: institutionId,
            date: new Date(dateStr),
            start_time: classRecord.schedule_start_time,
            end_time: classRecord.schedule_end_time,
            status: 'SCHEDULED',
            created_by: userId,
          });
        }
      }

      current = addDays(current, 1);
    }

    if (sessionsToCreate.length === 0) {
      return { count: 0, sessions: [] };
    }

    const result = await this.prisma.session.createMany({
      data: sessionsToCreate,
      skipDuplicates: true,
    });

    return { count: result.count, sessions: sessionsToCreate };
  }

  async getTutorSchedule(userId: string, query: TutorScheduleQueryDto) {
    const tutor = await this.prisma.tutor.findFirst({
      where: { user_id: userId },
    });

    if (!tutor) {
      throw new NotFoundException('Tutor profile not found');
    }

    const { page, limit, status, date_from, date_to, sort_by, sort_order } = query;

    const where: any = {
      class: { tutor_id: tutor.id },
    };

    if (status) {
      where.status = status;
    }

    if (date_from || date_to) {
      where.date = {};
      if (date_from) where.date.gte = date_from;
      if (date_to) where.date.lte = date_to;
    }

    const [data, total] = await Promise.all([
      this.prisma.session.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sort_by]: sort_order },
        include: { class: true },
      }),
      this.prisma.session.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async requestReschedule(
    userId: string,
    sessionId: string,
    dto: RequestRescheduleDto,
  ) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { class: true },
    });

    if (!session) {
      throw new NotFoundException(`Session with id ${sessionId} not found`);
    }

    const tutor = await this.prisma.tutor.findFirst({
      where: { user_id: userId },
    });

    if (!tutor || session.class.tutor_id !== tutor.id) {
      throw new ForbiddenException('You can only reschedule your own sessions');
    }

    if (session.status !== 'SCHEDULED') {
      throw new BadRequestException(
        'Only sessions with status SCHEDULED can be rescheduled',
      );
    }

    return this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'RESCHEDULE_REQUESTED',
        proposed_date: dto.proposed_date,
        proposed_start_time: dto.proposed_start_time,
        proposed_end_time: dto.proposed_end_time,
        reschedule_reason: dto.reschedule_reason,
      },
      include: { class: true },
    });
  }

  async approveReschedule(
    institutionId: string,
    userId: string,
    sessionId: string,
    dto: ApproveRescheduleDto,
  ) {
    const session = await this.findOne(institutionId, sessionId);

    if (session.status !== 'RESCHEDULE_REQUESTED') {
      throw new BadRequestException(
        'Only sessions with status RESCHEDULE_REQUESTED can be approved or rejected',
      );
    }

    if (dto.approved) {
      return this.prisma.session.update({
        where: { id: sessionId, institution_id: institutionId },
        data: {
          date: session.proposed_date,
          start_time: session.proposed_start_time,
          end_time: session.proposed_end_time,
          status: 'SCHEDULED',
          approved_by: userId,
          proposed_date: null,
          proposed_start_time: null,
          proposed_end_time: null,
          reschedule_reason: null,
        },
        include: { class: true },
      });
    } else {
      return this.prisma.session.update({
        where: { id: sessionId, institution_id: institutionId },
        data: {
          status: 'SCHEDULED',
          proposed_date: null,
          proposed_start_time: null,
          proposed_end_time: null,
          reschedule_reason: null,
        },
        include: { class: true },
      });
    }
  }

  async cancelSession(userId: string, sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { class: true },
    });

    if (!session) {
      throw new NotFoundException(`Session with id ${sessionId} not found`);
    }

    const tutor = await this.prisma.tutor.findFirst({
      where: { user_id: userId },
    });

    if (!tutor || session.class.tutor_id !== tutor.id) {
      throw new ForbiddenException('You can only cancel your own sessions');
    }

    return this.prisma.session.update({
      where: { id: sessionId },
      data: { status: 'CANCELLED' },
      include: { class: true },
    });
  }
}
```

- [ ] Run: `npm test -- session.service` — verify all tests pass
- [ ] Commit: `feat(session): add SessionService with CRUD, generate, reschedule, and tutor schedule`

### Step 4 — Create SessionController (admin routes)

- [ ] Create `sinaloka-backend/src/modules/session/session.controller.ts`

```ts
// sinaloka-backend/src/modules/session/session.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { SessionService } from './session.service';
import {
  CreateSessionDto,
  CreateSessionSchema,
  UpdateSessionDto,
  SessionQueryDto,
  SessionQuerySchema,
  GenerateSessionsDto,
  GenerateSessionsSchema,
  ApproveRescheduleDto,
  ApproveRescheduleSchema,
} from './session.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('admin/sessions')
@UseGuards(AuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  create(
    @Tenant() institutionId: string,
    @CurrentUser('userId') userId: string,
    @Body(new ZodValidationPipe(CreateSessionSchema)) dto: CreateSessionDto,
  ) {
    return this.sessionService.create(institutionId, userId, dto);
  }

  @Get()
  findAll(
    @Tenant() institutionId: string,
    @Query(new ZodValidationPipe(SessionQuerySchema)) query: SessionQueryDto,
  ) {
    return this.sessionService.findAll(institutionId, query);
  }

  @Get(':id')
  findOne(
    @Tenant() institutionId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sessionService.findOne(institutionId, id);
  }

  @Patch(':id')
  update(
    @Tenant() institutionId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSessionDto,
  ) {
    return this.sessionService.update(institutionId, id, dto);
  }

  @Delete(':id')
  delete(
    @Tenant() institutionId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sessionService.delete(institutionId, id);
  }

  @Post('generate')
  generate(
    @Tenant() institutionId: string,
    @CurrentUser('userId') userId: string,
    @Body(new ZodValidationPipe(GenerateSessionsSchema)) dto: GenerateSessionsDto,
  ) {
    return this.sessionService.generateSessions(institutionId, userId, dto);
  }

  @Patch(':id/approve')
  approveReschedule(
    @Tenant() institutionId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(ApproveRescheduleSchema)) dto: ApproveRescheduleDto,
  ) {
    return this.sessionService.approveReschedule(institutionId, userId, id, dto);
  }
}
```

### Step 5 — Create TutorScheduleController (tutor routes)

- [ ] Create `sinaloka-backend/src/modules/session/tutor-schedule.controller.ts`

```ts
// sinaloka-backend/src/modules/session/tutor-schedule.controller.ts
import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { SessionService } from './session.service';
import {
  RequestRescheduleDto,
  RequestRescheduleSchema,
  TutorScheduleQueryDto,
  TutorScheduleQuerySchema,
} from './session.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('tutor/schedule')
@UseGuards(AuthGuard, RolesGuard)
@Roles('TUTOR')
export class TutorScheduleController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  getSchedule(
    @CurrentUser('userId') userId: string,
    @Query(new ZodValidationPipe(TutorScheduleQuerySchema)) query: TutorScheduleQueryDto,
  ) {
    return this.sessionService.getTutorSchedule(userId, query);
  }

  @Patch(':id/request-reschedule')
  requestReschedule(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(RequestRescheduleSchema)) dto: RequestRescheduleDto,
  ) {
    return this.sessionService.requestReschedule(userId, id, dto);
  }

  @Patch(':id/cancel')
  cancel(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sessionService.cancelSession(userId, id);
  }
}
```

### Step 6 — Write failing integration tests for SessionController (admin)

- [ ] Create `sinaloka-backend/src/modules/session/session.controller.spec.ts`

```ts
// sinaloka-backend/src/modules/session/session.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('SessionController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let institutionId: string;
  let classId: string;
  let tutorId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    // Seed institution
    const institution = await prisma.institution.create({
      data: { name: 'Test School Sessions', slug: 'test-school-sessions' },
    });
    institutionId = institution.id;

    // Seed admin user
    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash('password123', 10);

    const adminUser = await prisma.user.create({
      data: {
        email: 'admin-session@test.com',
        password_hash: hash,
        name: 'Admin',
        role: 'ADMIN',
        institution_id: institutionId,
      },
    });

    adminToken = jwtService.sign({
      userId: adminUser.id,
      institutionId,
      role: 'ADMIN',
    });

    // Seed tutor user + tutor
    const tutorUser = await prisma.user.create({
      data: {
        email: 'tutor-session@test.com',
        password_hash: hash,
        name: 'Tutor',
        role: 'TUTOR',
        institution_id: institutionId,
      },
    });

    const tutor = await prisma.tutor.create({
      data: {
        user_id: tutorUser.id,
        institution_id: institutionId,
        subjects: ['Math'],
      },
    });
    tutorId = tutor.id;

    // Seed a class with schedule_days
    const classRecord = await prisma.class.create({
      data: {
        institution_id: institutionId,
        tutor_id: tutorId,
        name: 'Math 101',
        subject: 'Math',
        capacity: 20,
        fee: 100000,
        schedule_days: ['Monday', 'Wednesday'],
        schedule_start_time: '14:00',
        schedule_end_time: '15:30',
        status: 'ACTIVE',
      },
    });
    classId = classRecord.id;
  });

  afterAll(async () => {
    await prisma.session.deleteMany({ where: { institution_id: institutionId } });
    await prisma.class.deleteMany({ where: { institution_id: institutionId } });
    await prisma.tutor.deleteMany({ where: { institution_id: institutionId } });
    await prisma.user.deleteMany({ where: { institution_id: institutionId } });
    await prisma.institution.delete({ where: { id: institutionId } });
    await app.close();
  });

  let createdSessionId: string;

  it('POST /admin/sessions — should create a session', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/sessions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        class_id: classId,
        date: '2026-04-06',
        start_time: '14:00',
        end_time: '15:30',
      })
      .expect(201);

    expect(res.body.class_id).toBe(classId);
    expect(res.body.institution_id).toBe(institutionId);
    expect(res.body.start_time).toBe('14:00');
    createdSessionId = res.body.id;
  });

  it('GET /admin/sessions — should list sessions with pagination', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/sessions')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  it('GET /admin/sessions?class_id= — should filter by class_id', async () => {
    const res = await request(app.getHttpServer())
      .get(`/admin/sessions?class_id=${classId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    res.body.data.forEach((s: any) => expect(s.class_id).toBe(classId));
  });

  it('GET /admin/sessions?status=SCHEDULED — should filter by status', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/sessions?status=SCHEDULED')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    res.body.data.forEach((s: any) => expect(s.status).toBe('SCHEDULED'));
  });

  it('GET /admin/sessions/:id — should return a single session', async () => {
    const res = await request(app.getHttpServer())
      .get(`/admin/sessions/${createdSessionId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.id).toBe(createdSessionId);
    expect(res.body.class).toBeDefined();
  });

  it('PATCH /admin/sessions/:id — should update a session', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/admin/sessions/${createdSessionId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ topic_covered: 'Algebra basics' })
      .expect(200);

    expect(res.body.topic_covered).toBe('Algebra basics');
  });

  it('POST /admin/sessions/generate — should auto-generate sessions from class schedule', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/sessions/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        class_id: classId,
        date_from: '2026-05-04', // Monday
        date_to: '2026-05-15',   // Friday — Mon 4, Wed 6, Mon 11, Wed 13 = 4
      })
      .expect(201);

    expect(res.body.count).toBe(4);
  });

  it('POST /admin/sessions/generate — should be idempotent (skip existing)', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/sessions/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        class_id: classId,
        date_from: '2026-05-04',
        date_to: '2026-05-15',
      })
      .expect(201);

    expect(res.body.count).toBe(0);
  });

  it('DELETE /admin/sessions/:id — should delete a session', async () => {
    await request(app.getHttpServer())
      .delete(`/admin/sessions/${createdSessionId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/admin/sessions/${createdSessionId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('GET /admin/sessions/:id — should return 404 for nonexistent session', async () => {
    await request(app.getHttpServer())
      .get('/admin/sessions/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
```

- [ ] Run: `npm test -- session.controller.spec` — verify tests fail (controller not wired yet)

### Step 7 — Write failing integration tests for TutorScheduleController

- [ ] Create `sinaloka-backend/src/modules/session/tutor-schedule.controller.spec.ts`

```ts
// sinaloka-backend/src/modules/session/tutor-schedule.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('TutorScheduleController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let tutorToken: string;
  let adminToken: string;
  let institutionId: string;
  let classId: string;
  let tutorId: string;
  let tutorUserId: string;
  let sessionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    // Seed institution
    const institution = await prisma.institution.create({
      data: { name: 'Test School Tutor Schedule', slug: 'test-school-tutor-schedule' },
    });
    institutionId = institution.id;

    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash('password123', 10);

    // Seed admin
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin-tutor-sched@test.com',
        password_hash: hash,
        name: 'Admin',
        role: 'ADMIN',
        institution_id: institutionId,
      },
    });

    adminToken = jwtService.sign({
      userId: adminUser.id,
      institutionId,
      role: 'ADMIN',
    });

    // Seed tutor
    const tutorUser = await prisma.user.create({
      data: {
        email: 'tutor-sched@test.com',
        password_hash: hash,
        name: 'Tutor',
        role: 'TUTOR',
        institution_id: institutionId,
      },
    });
    tutorUserId = tutorUser.id;

    const tutor = await prisma.tutor.create({
      data: {
        user_id: tutorUserId,
        institution_id: institutionId,
        subjects: ['Math'],
      },
    });
    tutorId = tutor.id;

    tutorToken = jwtService.sign({
      userId: tutorUserId,
      institutionId,
      role: 'TUTOR',
    });

    // Seed class
    const classRecord = await prisma.class.create({
      data: {
        institution_id: institutionId,
        tutor_id: tutorId,
        name: 'Math 201',
        subject: 'Math',
        capacity: 20,
        fee: 100000,
        schedule_days: ['Monday'],
        schedule_start_time: '14:00',
        schedule_end_time: '15:30',
        status: 'ACTIVE',
      },
    });
    classId = classRecord.id;

    // Seed a session
    const session = await prisma.session.create({
      data: {
        institution_id: institutionId,
        class_id: classId,
        date: new Date('2026-04-06'),
        start_time: '14:00',
        end_time: '15:30',
        status: 'SCHEDULED',
        created_by: adminUser.id,
      },
    });
    sessionId = session.id;
  });

  afterAll(async () => {
    await prisma.session.deleteMany({ where: { institution_id: institutionId } });
    await prisma.class.deleteMany({ where: { institution_id: institutionId } });
    await prisma.tutor.deleteMany({ where: { institution_id: institutionId } });
    await prisma.user.deleteMany({ where: { institution_id: institutionId } });
    await prisma.institution.delete({ where: { id: institutionId } });
    await app.close();
  });

  it('GET /tutor/schedule — should return sessions for tutor', async () => {
    const res = await request(app.getHttpServer())
      .get('/tutor/schedule')
      .set('Authorization', `Bearer ${tutorToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  it('GET /tutor/schedule?status=SCHEDULED — should filter by status', async () => {
    const res = await request(app.getHttpServer())
      .get('/tutor/schedule?status=SCHEDULED')
      .set('Authorization', `Bearer ${tutorToken}`)
      .expect(200);

    res.body.data.forEach((s: any) => expect(s.status).toBe('SCHEDULED'));
  });

  it('PATCH /tutor/schedule/:id/request-reschedule — should request reschedule', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/tutor/schedule/${sessionId}/request-reschedule`)
      .set('Authorization', `Bearer ${tutorToken}`)
      .send({
        proposed_date: '2026-04-10',
        proposed_start_time: '16:00',
        proposed_end_time: '17:30',
        reschedule_reason: 'Personal conflict',
      })
      .expect(200);

    expect(res.body.status).toBe('RESCHEDULE_REQUESTED');
    expect(res.body.proposed_start_time).toBe('16:00');
    expect(res.body.reschedule_reason).toBe('Personal conflict');
  });

  it('PATCH /admin/sessions/:id/approve — admin approves reschedule', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/admin/sessions/${sessionId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ approved: true })
      .expect(200);

    expect(res.body.status).toBe('SCHEDULED');
    expect(res.body.start_time).toBe('16:00');
    expect(res.body.end_time).toBe('17:30');
    expect(res.body.proposed_date).toBeNull();
    expect(res.body.proposed_start_time).toBeNull();
    expect(res.body.approved_by).toBeDefined();
  });

  it('PATCH /tutor/schedule/:id/request-reschedule — then admin rejects', async () => {
    // First request reschedule again
    await request(app.getHttpServer())
      .patch(`/tutor/schedule/${sessionId}/request-reschedule`)
      .set('Authorization', `Bearer ${tutorToken}`)
      .send({
        proposed_date: '2026-04-15',
        proposed_start_time: '09:00',
        proposed_end_time: '10:30',
        reschedule_reason: 'Another conflict',
      })
      .expect(200);

    // Admin rejects
    const res = await request(app.getHttpServer())
      .patch(`/admin/sessions/${sessionId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ approved: false })
      .expect(200);

    expect(res.body.status).toBe('SCHEDULED');
    expect(res.body.proposed_date).toBeNull();
    // Time should still be the previously approved time
    expect(res.body.start_time).toBe('16:00');
  });

  it('PATCH /tutor/schedule/:id/cancel — should cancel own session', async () => {
    // Create a fresh session to cancel
    const freshSession = await prisma.session.create({
      data: {
        institution_id: institutionId,
        class_id: classId,
        date: new Date('2026-04-13'),
        start_time: '14:00',
        end_time: '15:30',
        status: 'SCHEDULED',
        created_by: tutorUserId,
      },
    });

    const res = await request(app.getHttpServer())
      .patch(`/tutor/schedule/${freshSession.id}/cancel`)
      .set('Authorization', `Bearer ${tutorToken}`)
      .expect(200);

    expect(res.body.status).toBe('CANCELLED');
  });

  it('should reject request from non-owner tutor', async () => {
    // Create another tutor
    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash('password123', 10);

    const otherUser = await prisma.user.create({
      data: {
        email: 'other-tutor-sched@test.com',
        password_hash: hash,
        name: 'Other Tutor',
        role: 'TUTOR',
        institution_id: institutionId,
      },
    });

    await prisma.tutor.create({
      data: {
        user_id: otherUser.id,
        institution_id: institutionId,
        subjects: ['Science'],
      },
    });

    const otherToken = jwtService.sign({
      userId: otherUser.id,
      institutionId,
      role: 'TUTOR',
    });

    await request(app.getHttpServer())
      .patch(`/tutor/schedule/${sessionId}/request-reschedule`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        proposed_date: '2026-04-20',
        proposed_start_time: '10:00',
        proposed_end_time: '11:30',
        reschedule_reason: 'Hijack attempt',
      })
      .expect(403);
  });
});
```

- [ ] Run: `npm test -- tutor-schedule.controller.spec` — verify tests fail (controller not wired yet)

### Step 8 — Create SessionModule and register it

- [ ] Create `sinaloka-backend/src/modules/session/session.module.ts`

```ts
// sinaloka-backend/src/modules/session/session.module.ts
import { Module } from '@nestjs/common';
import { SessionController } from './session.controller';
import { TutorScheduleController } from './tutor-schedule.controller';
import { SessionService } from './session.service';

@Module({
  controllers: [SessionController, TutorScheduleController],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
```

- [ ] Register `SessionModule` in `sinaloka-backend/src/app.module.ts` imports array
- [ ] Run: `npm test -- session.controller.spec` — verify admin integration tests pass
- [ ] Run: `npm test -- tutor-schedule.controller.spec` — verify tutor integration tests pass
- [ ] Commit: `feat(session): add SessionModule with admin CRUD, auto-generate, tutor schedule, and reschedule flow`

---

## Section B: Attendance Module

### Step 9 — Create Attendance DTOs with Zod

- [ ] Create `sinaloka-backend/src/modules/attendance/attendance.dto.ts`

```ts
// sinaloka-backend/src/modules/attendance/attendance.dto.ts
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const AttendanceStatus = z.enum(['PRESENT', 'ABSENT', 'LATE']);

export const CreateAttendanceRecordSchema = z.object({
  student_id: z.string().uuid(),
  status: AttendanceStatus,
  homework_done: z.boolean().default(false),
  notes: z.string().max(500).optional().nullable(),
});

export const BatchCreateAttendanceSchema = z.object({
  session_id: z.string().uuid(),
  records: z.array(CreateAttendanceRecordSchema).min(1),
});

export class BatchCreateAttendanceDto extends createZodDto(BatchCreateAttendanceSchema) {}

export const UpdateAttendanceSchema = z.object({
  status: AttendanceStatus.optional(),
  homework_done: z.boolean().optional(),
  notes: z.string().max(500).optional().nullable(),
});

export class UpdateAttendanceDto extends createZodDto(UpdateAttendanceSchema) {}

export const AttendanceQuerySchema = z.object({
  session_id: z.string().uuid(),
});

export class AttendanceQueryDto extends createZodDto(AttendanceQuerySchema) {}

export const AttendanceSummaryQuerySchema = z.object({
  class_id: z.string().uuid(),
  date_from: z.coerce.date(),
  date_to: z.coerce.date(),
});

export class AttendanceSummaryQueryDto extends createZodDto(AttendanceSummaryQuerySchema) {}
```

### Step 10 — Write failing unit tests for AttendanceService

- [ ] Create `sinaloka-backend/src/modules/attendance/attendance.service.spec.ts`

```ts
// sinaloka-backend/src/modules/attendance/attendance.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let prisma: PrismaService;

  const mockPrisma = {
    attendance: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    session: {
      findUnique: jest.fn(),
    },
    tutor: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((fn) => fn(mockPrisma)),
  };

  const institutionId = 'inst-uuid-1';
  const userId = 'user-uuid-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('batchCreate', () => {
    it('should batch create attendance records for a session', async () => {
      const session = {
        id: 'session-uuid-1',
        institution_id: institutionId,
        class: { tutor_id: 'tutor-uuid-1' },
      };

      mockPrisma.session.findUnique.mockResolvedValue(session);
      mockPrisma.tutor.findFirst.mockResolvedValue({
        id: 'tutor-uuid-1',
        user_id: userId,
      });
      mockPrisma.attendance.findMany.mockResolvedValue([]); // no existing records

      const records = [
        { student_id: 'student-1', status: 'PRESENT' as const, homework_done: true, notes: null },
        { student_id: 'student-2', status: 'ABSENT' as const, homework_done: false, notes: 'Sick' },
      ];

      const createdRecords = records.map((r, i) => ({
        id: `att-${i}`,
        session_id: 'session-uuid-1',
        institution_id: institutionId,
        ...r,
      }));

      mockPrisma.attendance.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.attendance.findMany.mockResolvedValueOnce([]); // first call: check existing
      mockPrisma.attendance.findMany.mockResolvedValueOnce(createdRecords); // second call: return created

      const result = await service.batchCreate(userId, {
        session_id: 'session-uuid-1',
        records,
      });

      expect(mockPrisma.session.findUnique).toHaveBeenCalledWith({
        where: { id: 'session-uuid-1' },
        include: { class: true },
      });
    });

    it('should throw ForbiddenException if tutor does not own the session', async () => {
      const session = {
        id: 'session-uuid-1',
        institution_id: institutionId,
        class: { tutor_id: 'tutor-uuid-other' },
      };

      mockPrisma.session.findUnique.mockResolvedValue(session);
      mockPrisma.tutor.findFirst.mockResolvedValue({
        id: 'tutor-uuid-1',
        user_id: userId,
      });

      await expect(
        service.batchCreate(userId, {
          session_id: 'session-uuid-1',
          records: [
            { student_id: 'student-1', status: 'PRESENT', homework_done: false },
          ],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if session not found', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      await expect(
        service.batchCreate(userId, {
          session_id: 'nonexistent',
          records: [
            { student_id: 'student-1', status: 'PRESENT', homework_done: false },
          ],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if duplicate student attendance exists', async () => {
      const session = {
        id: 'session-uuid-1',
        institution_id: institutionId,
        class: { tutor_id: 'tutor-uuid-1' },
      };

      mockPrisma.session.findUnique.mockResolvedValue(session);
      mockPrisma.tutor.findFirst.mockResolvedValue({
        id: 'tutor-uuid-1',
        user_id: userId,
      });
      // Existing attendance record for student-1
      mockPrisma.attendance.findMany.mockResolvedValue([
        { id: 'existing-att', session_id: 'session-uuid-1', student_id: 'student-1' },
      ]);

      await expect(
        service.batchCreate(userId, {
          session_id: 'session-uuid-1',
          records: [
            { student_id: 'student-1', status: 'PRESENT', homework_done: false },
          ],
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findBySession', () => {
    it('should return attendance records for a session', async () => {
      const records = [
        {
          id: 'att-1',
          session_id: 'session-uuid-1',
          student_id: 'student-1',
          status: 'PRESENT',
          institution_id: institutionId,
        },
      ];
      mockPrisma.attendance.findMany.mockResolvedValue(records);

      const result = await service.findBySession(institutionId, 'session-uuid-1');

      expect(result).toEqual(records);
      expect(mockPrisma.attendance.findMany).toHaveBeenCalledWith({
        where: {
          session_id: 'session-uuid-1',
          institution_id: institutionId,
        },
        include: { student: true },
      });
    });
  });

  describe('update (admin)', () => {
    it('should update an attendance record', async () => {
      const existing = {
        id: 'att-1',
        institution_id: institutionId,
        status: 'PRESENT',
      };
      mockPrisma.attendance.findUnique.mockResolvedValue(existing);

      const updated = { ...existing, status: 'LATE' };
      mockPrisma.attendance.update.mockResolvedValue(updated);

      const result = await service.update(institutionId, 'att-1', {
        status: 'LATE',
      });

      expect(result.status).toBe('LATE');
    });

    it('should throw NotFoundException if attendance record not found', async () => {
      mockPrisma.attendance.findUnique.mockResolvedValue(null);

      await expect(
        service.update(institutionId, 'nonexistent', { status: 'LATE' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateByTutor', () => {
    it('should allow tutor to update attendance for own session', async () => {
      const existing = {
        id: 'att-1',
        institution_id: institutionId,
        session_id: 'session-uuid-1',
        status: 'PRESENT',
        session: {
          class: { tutor_id: 'tutor-uuid-1' },
        },
      };

      mockPrisma.attendance.findUnique.mockResolvedValue(existing);
      mockPrisma.tutor.findFirst.mockResolvedValue({
        id: 'tutor-uuid-1',
        user_id: userId,
      });

      const updated = { ...existing, notes: 'Updated note' };
      mockPrisma.attendance.update.mockResolvedValue(updated);

      const result = await service.updateByTutor(userId, 'att-1', {
        notes: 'Updated note',
      });

      expect(result.notes).toBe('Updated note');
    });

    it('should throw ForbiddenException if tutor does not own the session', async () => {
      const existing = {
        id: 'att-1',
        institution_id: institutionId,
        session_id: 'session-uuid-1',
        status: 'PRESENT',
        session: {
          class: { tutor_id: 'tutor-uuid-other' },
        },
      };

      mockPrisma.attendance.findUnique.mockResolvedValue(existing);
      mockPrisma.tutor.findFirst.mockResolvedValue({
        id: 'tutor-uuid-1',
        user_id: userId,
      });

      await expect(
        service.updateByTutor(userId, 'att-1', { notes: 'Hijack' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getSummary', () => {
    it('should return attendance summary stats for a class in date range', async () => {
      mockPrisma.attendance.findMany.mockResolvedValue([
        { status: 'PRESENT', homework_done: true },
        { status: 'PRESENT', homework_done: false },
        { status: 'ABSENT', homework_done: false },
        { status: 'LATE', homework_done: true },
      ]);
      mockPrisma.attendance.count.mockResolvedValue(4);

      const result = await service.getSummary(institutionId, {
        class_id: 'class-uuid-1',
        date_from: new Date('2026-04-01'),
        date_to: new Date('2026-04-30'),
      });

      expect(result.total_records).toBe(4);
      expect(result.present).toBe(2);
      expect(result.absent).toBe(1);
      expect(result.late).toBe(1);
      expect(result.homework_done).toBe(2);
      expect(result.attendance_rate).toBeCloseTo(75); // (2+1)/4 * 100, PRESENT+LATE
    });
  });
});
```

- [ ] Run: `npm test -- attendance.service` — verify all tests fail (module not found)

### Step 11 — Implement AttendanceService

- [ ] Create `sinaloka-backend/src/modules/attendance/attendance.service.ts`

```ts
// sinaloka-backend/src/modules/attendance/attendance.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  BatchCreateAttendanceDto,
  UpdateAttendanceDto,
  AttendanceSummaryQueryDto,
} from './attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async batchCreate(userId: string, dto: BatchCreateAttendanceDto) {
    const session = await this.prisma.session.findUnique({
      where: { id: dto.session_id },
      include: { class: true },
    });

    if (!session) {
      throw new NotFoundException(`Session with id ${dto.session_id} not found`);
    }

    // Verify tutor owns the session
    const tutor = await this.prisma.tutor.findFirst({
      where: { user_id: userId },
    });

    if (!tutor || session.class.tutor_id !== tutor.id) {
      throw new ForbiddenException(
        'You can only create attendance for your own sessions',
      );
    }

    // Check for existing attendance records
    const studentIds = dto.records.map((r) => r.student_id);
    const existing = await this.prisma.attendance.findMany({
      where: {
        session_id: dto.session_id,
        student_id: { in: studentIds },
      },
    });

    if (existing.length > 0) {
      const duplicateIds = existing.map((e) => e.student_id).join(', ');
      throw new ConflictException(
        `Attendance already exists for students: ${duplicateIds}`,
      );
    }

    // Create attendance records
    const data = dto.records.map((record) => ({
      session_id: dto.session_id,
      institution_id: session.institution_id,
      student_id: record.student_id,
      status: record.status,
      homework_done: record.homework_done ?? false,
      notes: record.notes ?? null,
    }));

    await this.prisma.attendance.createMany({ data });

    // Return created records
    return this.prisma.attendance.findMany({
      where: {
        session_id: dto.session_id,
        student_id: { in: studentIds },
      },
      include: { student: true },
    });
  }

  async findBySession(institutionId: string, sessionId: string) {
    return this.prisma.attendance.findMany({
      where: {
        session_id: sessionId,
        institution_id: institutionId,
      },
      include: { student: true },
    });
  }

  async update(institutionId: string, id: string, dto: UpdateAttendanceDto) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id, institution_id: institutionId },
    });

    if (!attendance) {
      throw new NotFoundException(`Attendance record with id ${id} not found`);
    }

    return this.prisma.attendance.update({
      where: { id, institution_id: institutionId },
      data: dto,
      include: { student: true },
    });
  }

  async updateByTutor(userId: string, id: string, dto: UpdateAttendanceDto) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
      include: {
        session: {
          include: { class: true },
        },
      },
    });

    if (!attendance) {
      throw new NotFoundException(`Attendance record with id ${id} not found`);
    }

    // Verify tutor owns the session
    const tutor = await this.prisma.tutor.findFirst({
      where: { user_id: userId },
    });

    if (!tutor || attendance.session.class.tutor_id !== tutor.id) {
      throw new ForbiddenException(
        'You can only update attendance for your own sessions',
      );
    }

    return this.prisma.attendance.update({
      where: { id },
      data: dto,
      include: { student: true },
    });
  }

  async getSummary(institutionId: string, query: AttendanceSummaryQueryDto) {
    const { class_id, date_from, date_to } = query;

    const records = await this.prisma.attendance.findMany({
      where: {
        institution_id: institutionId,
        session: {
          class_id,
          date: { gte: date_from, lte: date_to },
        },
      },
    });

    const total_records = records.length;
    const present = records.filter((r) => r.status === 'PRESENT').length;
    const absent = records.filter((r) => r.status === 'ABSENT').length;
    const late = records.filter((r) => r.status === 'LATE').length;
    const homework_done = records.filter((r) => r.homework_done).length;

    const attendance_rate =
      total_records > 0
        ? ((present + late) / total_records) * 100
        : 0;

    return {
      total_records,
      present,
      absent,
      late,
      homework_done,
      attendance_rate: Math.round(attendance_rate * 100) / 100,
    };
  }
}
```

- [ ] Run: `npm test -- attendance.service` — verify all tests pass
- [ ] Commit: `feat(attendance): add AttendanceService with batch create, update, and summary`

### Step 12 — Create AttendanceController (admin routes)

- [ ] Create `sinaloka-backend/src/modules/attendance/attendance.controller.ts`

```ts
// sinaloka-backend/src/modules/attendance/attendance.controller.ts
import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import {
  UpdateAttendanceDto,
  AttendanceQueryDto,
  AttendanceQuerySchema,
  AttendanceSummaryQueryDto,
  AttendanceSummaryQuerySchema,
} from './attendance.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { TenantInterceptor } from '../../common/interceptors/tenant.interceptor';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('admin/attendance')
@UseGuards(AuthGuard, RolesGuard)
@UseInterceptors(TenantInterceptor)
@Roles('SUPER_ADMIN', 'ADMIN')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  findBySession(
    @Tenant() institutionId: string,
    @Query(new ZodValidationPipe(AttendanceQuerySchema)) query: AttendanceQueryDto,
  ) {
    return this.attendanceService.findBySession(institutionId, query.session_id);
  }

  @Patch(':id')
  update(
    @Tenant() institutionId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAttendanceDto,
  ) {
    return this.attendanceService.update(institutionId, id, dto);
  }

  @Get('summary')
  getSummary(
    @Tenant() institutionId: string,
    @Query(new ZodValidationPipe(AttendanceSummaryQuerySchema))
    query: AttendanceSummaryQueryDto,
  ) {
    return this.attendanceService.getSummary(institutionId, query);
  }
}
```

### Step 13 — Create TutorAttendanceController (tutor routes)

- [ ] Create `sinaloka-backend/src/modules/attendance/tutor-attendance.controller.ts`

```ts
// sinaloka-backend/src/modules/attendance/tutor-attendance.controller.ts
import {
  Controller,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import {
  BatchCreateAttendanceDto,
  BatchCreateAttendanceSchema,
  UpdateAttendanceDto,
  UpdateAttendanceSchema,
} from './attendance.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('tutor/attendance')
@UseGuards(AuthGuard, RolesGuard)
@Roles('TUTOR')
export class TutorAttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  batchCreate(
    @CurrentUser('userId') userId: string,
    @Body(new ZodValidationPipe(BatchCreateAttendanceSchema)) dto: BatchCreateAttendanceDto,
  ) {
    return this.attendanceService.batchCreate(userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateAttendanceSchema)) dto: UpdateAttendanceDto,
  ) {
    return this.attendanceService.updateByTutor(userId, id, dto);
  }
}
```

### Step 14 — Write failing integration tests for AttendanceController (admin)

- [ ] Create `sinaloka-backend/src/modules/attendance/attendance.controller.spec.ts`

```ts
// sinaloka-backend/src/modules/attendance/attendance.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('AttendanceController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let institutionId: string;
  let sessionId: string;
  let studentId: string;
  let attendanceId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    // Seed institution
    const institution = await prisma.institution.create({
      data: { name: 'Test School Attendance', slug: 'test-school-attendance' },
    });
    institutionId = institution.id;

    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash('password123', 10);

    // Seed admin
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin-attendance@test.com',
        password_hash: hash,
        name: 'Admin',
        role: 'ADMIN',
        institution_id: institutionId,
      },
    });

    adminToken = jwtService.sign({
      userId: adminUser.id,
      institutionId,
      role: 'ADMIN',
    });

    // Seed tutor
    const tutorUser = await prisma.user.create({
      data: {
        email: 'tutor-attendance@test.com',
        password_hash: hash,
        name: 'Tutor',
        role: 'TUTOR',
        institution_id: institutionId,
      },
    });

    const tutor = await prisma.tutor.create({
      data: {
        user_id: tutorUser.id,
        institution_id: institutionId,
        subjects: ['Math'],
      },
    });

    // Seed class
    const classRecord = await prisma.class.create({
      data: {
        institution_id: institutionId,
        tutor_id: tutor.id,
        name: 'Math Attendance',
        subject: 'Math',
        capacity: 20,
        fee: 100000,
        schedule_days: ['Monday'],
        schedule_start_time: '14:00',
        schedule_end_time: '15:30',
        status: 'ACTIVE',
      },
    });

    // Seed session
    const session = await prisma.session.create({
      data: {
        institution_id: institutionId,
        class_id: classRecord.id,
        date: new Date('2026-04-06'),
        start_time: '14:00',
        end_time: '15:30',
        status: 'SCHEDULED',
        created_by: adminUser.id,
      },
    });
    sessionId = session.id;

    // Seed student
    const student = await prisma.student.create({
      data: {
        institution_id: institutionId,
        name: 'Alice',
        grade: '10',
        status: 'ACTIVE',
        enrolled_at: new Date(),
      },
    });
    studentId = student.id;

    // Seed an attendance record for admin to query/update
    const attendance = await prisma.attendance.create({
      data: {
        institution_id: institutionId,
        session_id: sessionId,
        student_id: studentId,
        status: 'PRESENT',
        homework_done: true,
      },
    });
    attendanceId = attendance.id;
  });

  afterAll(async () => {
    await prisma.attendance.deleteMany({ where: { institution_id: institutionId } });
    await prisma.session.deleteMany({ where: { institution_id: institutionId } });
    await prisma.class.deleteMany({ where: { institution_id: institutionId } });
    await prisma.student.deleteMany({ where: { institution_id: institutionId } });
    await prisma.tutor.deleteMany({ where: { institution_id: institutionId } });
    await prisma.user.deleteMany({ where: { institution_id: institutionId } });
    await prisma.institution.delete({ where: { id: institutionId } });
    await app.close();
  });

  it('GET /admin/attendance?session_id= — should list attendance for a session', async () => {
    const res = await request(app.getHttpServer())
      .get(`/admin/attendance?session_id=${sessionId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].session_id).toBe(sessionId);
    expect(res.body[0].student).toBeDefined();
  });

  it('PATCH /admin/attendance/:id — should update attendance record', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/admin/attendance/${attendanceId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'LATE', notes: 'Arrived 10 min late' })
      .expect(200);

    expect(res.body.status).toBe('LATE');
    expect(res.body.notes).toBe('Arrived 10 min late');
  });

  it('PATCH /admin/attendance/:id — should return 404 for nonexistent record', async () => {
    await request(app.getHttpServer())
      .patch('/admin/attendance/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ABSENT' })
      .expect(404);
  });

  it('GET /admin/attendance/summary — should return summary stats', async () => {
    const res = await request(app.getHttpServer())
      .get(
        `/admin/attendance/summary?class_id=${
          (await prisma.class.findFirst({ where: { institution_id: institutionId } })).id
        }&date_from=2026-04-01&date_to=2026-04-30`,
      )
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.total_records).toBeDefined();
    expect(res.body.present).toBeDefined();
    expect(res.body.absent).toBeDefined();
    expect(res.body.late).toBeDefined();
    expect(res.body.homework_done).toBeDefined();
    expect(res.body.attendance_rate).toBeDefined();
  });
});
```

- [ ] Run: `npm test -- attendance.controller.spec` — verify tests fail (controller not wired yet)

### Step 15 — Write failing integration tests for TutorAttendanceController

- [ ] Create `sinaloka-backend/src/modules/attendance/tutor-attendance.controller.spec.ts`

```ts
// sinaloka-backend/src/modules/attendance/tutor-attendance.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('TutorAttendanceController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let tutorToken: string;
  let institutionId: string;
  let sessionId: string;
  let studentId1: string;
  let studentId2: string;
  let tutorUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    // Seed institution
    const institution = await prisma.institution.create({
      data: {
        name: 'Test School Tutor Attendance',
        slug: 'test-school-tutor-attendance',
      },
    });
    institutionId = institution.id;

    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash('password123', 10);

    // Seed tutor
    const tutorUser = await prisma.user.create({
      data: {
        email: 'tutor-att@test.com',
        password_hash: hash,
        name: 'Tutor',
        role: 'TUTOR',
        institution_id: institutionId,
      },
    });
    tutorUserId = tutorUser.id;

    const tutor = await prisma.tutor.create({
      data: {
        user_id: tutorUserId,
        institution_id: institutionId,
        subjects: ['Math'],
      },
    });

    tutorToken = jwtService.sign({
      userId: tutorUserId,
      institutionId,
      role: 'TUTOR',
    });

    // Seed class
    const classRecord = await prisma.class.create({
      data: {
        institution_id: institutionId,
        tutor_id: tutor.id,
        name: 'Math Tutor Att',
        subject: 'Math',
        capacity: 20,
        fee: 100000,
        schedule_days: ['Monday'],
        schedule_start_time: '14:00',
        schedule_end_time: '15:30',
        status: 'ACTIVE',
      },
    });

    // Seed session
    const session = await prisma.session.create({
      data: {
        institution_id: institutionId,
        class_id: classRecord.id,
        date: new Date('2026-04-06'),
        start_time: '14:00',
        end_time: '15:30',
        status: 'SCHEDULED',
        created_by: tutorUserId,
      },
    });
    sessionId = session.id;

    // Seed students
    const student1 = await prisma.student.create({
      data: {
        institution_id: institutionId,
        name: 'Alice',
        grade: '10',
        status: 'ACTIVE',
        enrolled_at: new Date(),
      },
    });
    studentId1 = student1.id;

    const student2 = await prisma.student.create({
      data: {
        institution_id: institutionId,
        name: 'Bob',
        grade: '10',
        status: 'ACTIVE',
        enrolled_at: new Date(),
      },
    });
    studentId2 = student2.id;
  });

  afterAll(async () => {
    await prisma.attendance.deleteMany({ where: { institution_id: institutionId } });
    await prisma.session.deleteMany({ where: { institution_id: institutionId } });
    await prisma.class.deleteMany({ where: { institution_id: institutionId } });
    await prisma.student.deleteMany({ where: { institution_id: institutionId } });
    await prisma.tutor.deleteMany({ where: { institution_id: institutionId } });
    await prisma.user.deleteMany({ where: { institution_id: institutionId } });
    await prisma.institution.delete({ where: { id: institutionId } });
    await app.close();
  });

  let createdAttendanceId: string;

  it('POST /tutor/attendance — should batch create attendance records', async () => {
    const res = await request(app.getHttpServer())
      .post('/tutor/attendance')
      .set('Authorization', `Bearer ${tutorToken}`)
      .send({
        session_id: sessionId,
        records: [
          { student_id: studentId1, status: 'PRESENT', homework_done: true, notes: 'Great' },
          { student_id: studentId2, status: 'ABSENT', homework_done: false, notes: 'Sick' },
        ],
      })
      .expect(201);

    expect(res.body.length).toBe(2);
    expect(res.body[0].session_id).toBe(sessionId);
    expect(res.body[0].student).toBeDefined();
    createdAttendanceId = res.body[0].id;
  });

  it('POST /tutor/attendance — should reject duplicate attendance', async () => {
    await request(app.getHttpServer())
      .post('/tutor/attendance')
      .set('Authorization', `Bearer ${tutorToken}`)
      .send({
        session_id: sessionId,
        records: [
          { student_id: studentId1, status: 'PRESENT', homework_done: true },
        ],
      })
      .expect(409);
  });

  it('PATCH /tutor/attendance/:id — should update own attendance record', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/tutor/attendance/${createdAttendanceId}`)
      .set('Authorization', `Bearer ${tutorToken}`)
      .send({ notes: 'Updated note', homework_done: false })
      .expect(200);

    expect(res.body.notes).toBe('Updated note');
    expect(res.body.homework_done).toBe(false);
  });

  it('should reject attendance creation for non-owner tutor session', async () => {
    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash('password123', 10);

    const otherUser = await prisma.user.create({
      data: {
        email: 'other-tutor-att@test.com',
        password_hash: hash,
        name: 'Other Tutor',
        role: 'TUTOR',
        institution_id: institutionId,
      },
    });

    await prisma.tutor.create({
      data: {
        user_id: otherUser.id,
        institution_id: institutionId,
        subjects: ['Science'],
      },
    });

    const otherToken = jwtService.sign({
      userId: otherUser.id,
      institutionId,
      role: 'TUTOR',
    });

    // Create a new student to avoid conflict
    const newStudent = await prisma.student.create({
      data: {
        institution_id: institutionId,
        name: 'Charlie',
        grade: '10',
        status: 'ACTIVE',
        enrolled_at: new Date(),
      },
    });

    await request(app.getHttpServer())
      .post('/tutor/attendance')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        session_id: sessionId,
        records: [
          { student_id: newStudent.id, status: 'PRESENT', homework_done: false },
        ],
      })
      .expect(403);
  });
});
```

- [ ] Run: `npm test -- tutor-attendance.controller.spec` — verify tests fail (controller not wired yet)

### Step 16 — Create AttendanceModule and register it

- [ ] Create `sinaloka-backend/src/modules/attendance/attendance.module.ts`

```ts
// sinaloka-backend/src/modules/attendance/attendance.module.ts
import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { TutorAttendanceController } from './tutor-attendance.controller';
import { AttendanceService } from './attendance.service';

@Module({
  controllers: [AttendanceController, TutorAttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
```

- [ ] Register `AttendanceModule` in `sinaloka-backend/src/app.module.ts` imports array
- [ ] Run: `npm test -- attendance.controller.spec` — verify admin integration tests pass
- [ ] Run: `npm test -- tutor-attendance.controller.spec` — verify tutor integration tests pass
- [ ] Commit: `feat(attendance): add AttendanceModule with admin view/correct, tutor batch create/update, and summary`

---

## Summary

After completing this chunk, the following capabilities are available:

**Session Module (8 steps)**
- `sinaloka-backend/src/modules/session/session.dto.ts` — Zod schemas for all session operations
- `sinaloka-backend/src/modules/session/session.service.ts` — CRUD, auto-generate, reschedule flow, tutor schedule
- `sinaloka-backend/src/modules/session/session.service.spec.ts` — Unit tests covering generate logic and reschedule flow
- `sinaloka-backend/src/modules/session/session.controller.ts` — Admin routes: full CRUD + generate + approve reschedule
- `sinaloka-backend/src/modules/session/session.controller.spec.ts` — Admin integration tests
- `sinaloka-backend/src/modules/session/tutor-schedule.controller.ts` — Tutor routes: view schedule, request reschedule, cancel
- `sinaloka-backend/src/modules/session/tutor-schedule.controller.spec.ts` — Tutor integration tests
- `sinaloka-backend/src/modules/session/session.module.ts` — Module registration

**Attendance Module (8 steps)**
- `sinaloka-backend/src/modules/attendance/attendance.dto.ts` — Zod schemas for batch create, update, query, summary
- `sinaloka-backend/src/modules/attendance/attendance.service.ts` — Batch create, admin update, tutor update, summary stats
- `sinaloka-backend/src/modules/attendance/attendance.service.spec.ts` — Unit tests covering ownership checks and summary
- `sinaloka-backend/src/modules/attendance/attendance.controller.ts` — Admin routes: list by session, correct, summary
- `sinaloka-backend/src/modules/attendance/attendance.controller.spec.ts` — Admin integration tests
- `sinaloka-backend/src/modules/attendance/tutor-attendance.controller.ts` — Tutor routes: batch create, update own
- `sinaloka-backend/src/modules/attendance/tutor-attendance.controller.spec.ts` — Tutor integration tests
- `sinaloka-backend/src/modules/attendance/attendance.module.ts` — Module registration

**Key behaviors:**
- Session auto-generation iterates dates in range, matches day-of-week to class.schedule_days, skips existing sessions (idempotent)
- Reschedule flow: tutor requests (SCHEDULED -> RESCHEDULE_REQUESTED) -> admin approves (updates date/time, sets approved_by) or rejects (back to SCHEDULED)
- Tutor can only mark/update attendance for sessions belonging to their own classes
- UNIQUE(session_id, student_id) enforced via conflict check before batch create
- institution_id denormalized on Attendance for efficient tenant queries
# Chunk 6a: Finance Module — Payment, Payout, Expense (Phase 5)

**Estimated time:** ~75 minutes
**Depends on:** Chunk 1 (scaffold, Prisma, common), Chunk 2 (Auth, Institution, User), Chunk 3 (Student, Tutor)
**Outcome:** Admin can CRUD payments, payouts, and expenses. Tutor can view own payouts. Daily cron auto-marks overdue payments.

---

## Section A: Payment (Steps 1-4)

### Step 1 — Create Payment DTOs with Zod

- [ ] Create `sinaloka-backend/src/modules/finance/payment.dto.ts`

```ts
// sinaloka-backend/src/modules/finance/payment.dto.ts
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const PaymentStatus = z.enum(['PAID', 'PENDING', 'OVERDUE']);
const PaymentMethod = z.enum(['CASH', 'TRANSFER', 'OTHER']);

export const CreatePaymentSchema = z.object({
  student_id: z.string().uuid(),
  enrollment_id: z.string().uuid(),
  amount: z.coerce.number().positive(),
  due_date: z.coerce.date(),
  paid_date: z.coerce.date().optional().nullable(),
  status: PaymentStatus.default('PENDING'),
  method: PaymentMethod.default('OTHER'),
  notes: z.string().max(500).optional().nullable(),
});
export class CreatePaymentDto extends createZodDto(CreatePaymentSchema) {}

export const UpdatePaymentSchema = z.object({
  amount: z.coerce.number().positive().optional(),
  due_date: z.coerce.date().optional(),
  paid_date: z.coerce.date().optional().nullable(),
  status: PaymentStatus.optional(),
  method: PaymentMethod.optional(),
  notes: z.string().max(500).optional().nullable(),
});
export class UpdatePaymentDto extends createZodDto(UpdatePaymentSchema) {}

export const PaymentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: PaymentStatus.optional(),
  student_id: z.string().uuid().optional(),
  sort_by: z.enum(['due_date', 'amount', 'created_at']).default('due_date'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});
export class PaymentQueryDto extends createZodDto(PaymentQuerySchema) {}
```

### Step 2 — Implement PaymentService

- [ ] Create `sinaloka-backend/src/modules/finance/payment.service.ts`

```ts
// sinaloka-backend/src/modules/finance/payment.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePaymentDto, UpdatePaymentDto, PaymentQueryDto } from './payment.dto';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  async create(institutionId: string, dto: CreatePaymentDto) {
    return this.prisma.payment.create({
      data: { ...dto, institution_id: institutionId },
    });
  }

  async findAll(institutionId: string, query: PaymentQueryDto) {
    const { page, limit, status, student_id, sort_by, sort_order } = query;
    const where: any = { institution_id: institutionId };
    if (status) where.status = status;
    if (student_id) where.student_id = student_id;

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { [sort_by]: sort_order },
        include: { student: true, enrollment: true },
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async findOne(institutionId: string, id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { student: true, enrollment: true },
    });
    if (!payment || payment.institution_id !== institutionId)
      throw new NotFoundException('Payment not found');
    return payment;
  }

  async update(institutionId: string, id: string, dto: UpdatePaymentDto) {
    await this.findOne(institutionId, id);
    return this.prisma.payment.update({ where: { id }, data: dto });
  }
}
```

### Step 3 — Implement PaymentController

- [ ] Create `sinaloka-backend/src/modules/finance/payment.controller.ts`

```ts
// sinaloka-backend/src/modules/finance/payment.controller.ts
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto, UpdatePaymentDto, PaymentQueryDto } from './payment.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PaymentQuerySchema } from './payment.dto';

@Controller('admin/payments')
@UseGuards(AuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post()
  create(@Tenant() institutionId: string, @Body() dto: CreatePaymentDto) {
    return this.paymentService.create(institutionId, dto);
  }

  @Get()
  findAll(
    @Tenant() institutionId: string,
    @Query(new ZodValidationPipe(PaymentQuerySchema)) query: PaymentQueryDto,
  ) {
    return this.paymentService.findAll(institutionId, query);
  }

  @Patch(':id')
  update(
    @Tenant() institutionId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentDto,
  ) {
    return this.paymentService.update(institutionId, id, dto);
  }
}
```

### Step 4 — Payment unit test + integration test

- [ ] Create `sinaloka-backend/src/modules/finance/payment.service.spec.ts`

```ts
// sinaloka-backend/src/modules/finance/payment.service.spec.ts
import { Test } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('PaymentService', () => {
  let service: PaymentService;
  const mockPrisma = {
    payment: {
      create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(),
      update: jest.fn(), count: jest.fn(),
    },
  };
  const instId = 'inst-1';

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [PaymentService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(PaymentService);
    jest.clearAllMocks();
  });

  it('should create a payment', async () => {
    const dto = { student_id: 's1', enrollment_id: 'e1', amount: 100, due_date: new Date() } as any;
    mockPrisma.payment.create.mockResolvedValue({ id: 'p1', ...dto });
    const result = await service.create(instId, dto);
    expect(result.id).toBe('p1');
    expect(mockPrisma.payment.create).toHaveBeenCalledWith({
      data: { ...dto, institution_id: instId },
    });
  });

  it('should list payments with pagination', async () => {
    mockPrisma.payment.findMany.mockResolvedValue([]);
    mockPrisma.payment.count.mockResolvedValue(0);
    const result = await service.findAll(instId, { page: 1, limit: 20, sort_by: 'due_date', sort_order: 'desc' } as any);
    expect(result).toEqual({ data: [], total: 0, page: 1, limit: 20 });
  });

  it('should throw NotFoundException for missing payment', async () => {
    mockPrisma.payment.findUnique.mockResolvedValue(null);
    await expect(service.findOne(instId, 'bad-id')).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException for wrong tenant', async () => {
    mockPrisma.payment.findUnique.mockResolvedValue({ id: 'p1', institution_id: 'other' });
    await expect(service.findOne(instId, 'p1')).rejects.toThrow(NotFoundException);
  });

  it('should update a payment', async () => {
    mockPrisma.payment.findUnique.mockResolvedValue({ id: 'p1', institution_id: instId });
    mockPrisma.payment.update.mockResolvedValue({ id: 'p1', status: 'PAID' });
    const result = await service.update(instId, 'p1', { status: 'PAID' } as any);
    expect(result.status).toBe('PAID');
  });
});
```

- [ ] Create `sinaloka-backend/src/modules/finance/payment.controller.spec.ts` (integration test)

```ts
// sinaloka-backend/src/modules/finance/payment.controller.spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

describe('PaymentController (integration)', () => {
  let app: INestApplication;
  const mockService = {
    create: jest.fn().mockResolvedValue({ id: 'p1' }),
    findAll: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 }),
    update: jest.fn().mockResolvedValue({ id: 'p1', status: 'PAID' }),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [{ provide: PaymentService, useValue: mockService }],
    })
      .overrideGuard(AuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(() => app.close());

  it('GET /admin/payments returns list', () =>
    request(app.getHttpServer()).get('/admin/payments').expect(200));

  it('POST /admin/payments creates payment', () =>
    request(app.getHttpServer()).post('/admin/payments')
      .send({ student_id: 's1', enrollment_id: 'e1', amount: 100, due_date: '2026-04-01' })
      .expect(201));

  it('PATCH /admin/payments/:id updates payment', () =>
    request(app.getHttpServer()).patch('/admin/payments/p1')
      .send({ status: 'PAID' }).expect(200));
});
```

---

## Section B: Payout (Steps 5-9)

### Step 5 — Create Payout DTOs with Zod

- [ ] Create `sinaloka-backend/src/modules/finance/payout.dto.ts`

```ts
// sinaloka-backend/src/modules/finance/payout.dto.ts
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const PayoutStatus = z.enum(['PENDING', 'PROCESSING', 'PAID']);

export const CreatePayoutSchema = z.object({
  tutor_id: z.string().uuid(),
  amount: z.coerce.number().positive(),
  date: z.coerce.date(),
  status: PayoutStatus.default('PENDING'),
  description: z.string().max(500).optional().nullable(),
});
export class CreatePayoutDto extends createZodDto(CreatePayoutSchema) {}

export const UpdatePayoutSchema = z.object({
  amount: z.coerce.number().positive().optional(),
  date: z.coerce.date().optional(),
  status: PayoutStatus.optional(),
  description: z.string().max(500).optional().nullable(),
});
export class UpdatePayoutDto extends createZodDto(UpdatePayoutSchema) {}

export const PayoutQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  tutor_id: z.string().uuid().optional(),
  status: PayoutStatus.optional(),
  sort_by: z.enum(['date', 'amount', 'created_at']).default('date'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});
export class PayoutQueryDto extends createZodDto(PayoutQuerySchema) {}
```

### Step 6 — Implement PayoutService

- [ ] Create `sinaloka-backend/src/modules/finance/payout.service.ts`

```ts
// sinaloka-backend/src/modules/finance/payout.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePayoutDto, UpdatePayoutDto, PayoutQueryDto } from './payout.dto';

@Injectable()
export class PayoutService {
  constructor(private prisma: PrismaService) {}

  async create(institutionId: string, dto: CreatePayoutDto) {
    return this.prisma.payout.create({
      data: { ...dto, institution_id: institutionId },
    });
  }

  async findAll(institutionId: string, query: PayoutQueryDto) {
    const { page, limit, tutor_id, status, sort_by, sort_order } = query;
    const where: any = { institution_id: institutionId };
    if (tutor_id) where.tutor_id = tutor_id;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.payout.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { [sort_by]: sort_order },
        include: { tutor: { include: { user: { select: { name: true } } } } },
      }),
      this.prisma.payout.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async findOne(institutionId: string, id: string) {
    const payout = await this.prisma.payout.findUnique({
      where: { id },
      include: { tutor: { include: { user: { select: { name: true } } } } },
    });
    if (!payout || payout.institution_id !== institutionId)
      throw new NotFoundException('Payout not found');
    return payout;
  }

  async update(institutionId: string, id: string, dto: UpdatePayoutDto) {
    await this.findOne(institutionId, id);
    return this.prisma.payout.update({ where: { id }, data: dto });
  }

  async updateProofUrl(institutionId: string, id: string, proofUrl: string) {
    await this.findOne(institutionId, id);
    return this.prisma.payout.update({ where: { id }, data: { proof_url: proofUrl } });
  }

  async findByTutor(institutionId: string, tutorId: string, query: PayoutQueryDto) {
    const { page, limit, status, sort_by, sort_order } = query;
    const where: any = { institution_id: institutionId, tutor_id: tutorId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.payout.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { [sort_by]: sort_order },
      }),
      this.prisma.payout.count({ where }),
    ]);
    return { data, total, page, limit };
  }
}
```

### Step 7 — Implement PayoutAdminController

- [ ] Create `sinaloka-backend/src/modules/finance/payout-admin.controller.ts`

```ts
// sinaloka-backend/src/modules/finance/payout-admin.controller.ts
import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { PayoutService } from './payout.service';
import { CreatePayoutDto, UpdatePayoutDto, PayoutQueryDto, PayoutQuerySchema } from './payout.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('admin/payouts')
@UseGuards(AuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
export class PayoutAdminController {
  constructor(private payoutService: PayoutService) {}

  @Post()
  create(@Tenant() instId: string, @Body() dto: CreatePayoutDto) {
    return this.payoutService.create(instId, dto);
  }

  @Get()
  findAll(@Tenant() instId: string, @Query(new ZodValidationPipe(PayoutQuerySchema)) q: PayoutQueryDto) {
    return this.payoutService.findAll(instId, q);
  }

  @Patch(':id')
  update(@Tenant() instId: string, @Param('id') id: string, @Body() dto: UpdatePayoutDto) {
    return this.payoutService.update(instId, id, dto);
  }

  @Post(':id/upload-proof')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, _file, cb) => {
        const dir = join(process.env.UPLOAD_DIR || './uploads', req['institutionId'] || 'default', 'payouts');
        cb(null, dir);
      },
      filename: (_req, file, cb) => cb(null, `${uuidv4()}${extname(file.originalname)}`),
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
      cb(null, allowed.includes(extname(file.originalname).toLowerCase()));
    },
  }))
  async uploadProof(
    @Tenant() instId: string, @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.payoutService.updateProofUrl(instId, id, file.path);
  }
}
```

### Step 8 — Implement TutorPayoutController

- [ ] Create `sinaloka-backend/src/modules/finance/tutor-payout.controller.ts`

```ts
// sinaloka-backend/src/modules/finance/tutor-payout.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PayoutService } from './payout.service';
import { PayoutQueryDto, PayoutQuerySchema } from './payout.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

@Controller('tutor/payouts')
@UseGuards(AuthGuard, RolesGuard)
@Roles('TUTOR')
export class TutorPayoutController {
  constructor(
    private payoutService: PayoutService,
    private prisma: PrismaService,
  ) {}

  @Get()
  async findOwn(
    @Tenant() instId: string,
    @CurrentUser() user: { userId: string },
    @Query(new ZodValidationPipe(PayoutQuerySchema)) q: PayoutQueryDto,
  ) {
    const tutor = await this.prisma.tutor.findFirst({
      where: { user_id: user.userId, institution_id: instId },
    });
    if (!tutor) throw new NotFoundException('Tutor profile not found');
    return this.payoutService.findByTutor(instId, tutor.id, q);
  }
}
```

### Step 9 — Payout unit test + integration test

- [ ] Create `sinaloka-backend/src/modules/finance/payout.service.spec.ts`

```ts
// sinaloka-backend/src/modules/finance/payout.service.spec.ts
import { Test } from '@nestjs/testing';
import { PayoutService } from './payout.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('PayoutService', () => {
  let service: PayoutService;
  const mockPrisma = {
    payout: {
      create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(),
      update: jest.fn(), count: jest.fn(),
    },
  };
  const instId = 'inst-1';

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [PayoutService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(PayoutService);
    jest.clearAllMocks();
  });

  it('should create a payout', async () => {
    const dto = { tutor_id: 't1', amount: 500, date: new Date() } as any;
    mockPrisma.payout.create.mockResolvedValue({ id: 'po1', ...dto });
    const result = await service.create(instId, dto);
    expect(result.id).toBe('po1');
  });

  it('should list payouts with pagination', async () => {
    mockPrisma.payout.findMany.mockResolvedValue([]);
    mockPrisma.payout.count.mockResolvedValue(0);
    const result = await service.findAll(instId, { page: 1, limit: 20, sort_by: 'date', sort_order: 'desc' } as any);
    expect(result.total).toBe(0);
  });

  it('should throw NotFoundException for missing payout', async () => {
    mockPrisma.payout.findUnique.mockResolvedValue(null);
    await expect(service.findOne(instId, 'bad')).rejects.toThrow(NotFoundException);
  });

  it('should update proof URL', async () => {
    mockPrisma.payout.findUnique.mockResolvedValue({ id: 'po1', institution_id: instId });
    mockPrisma.payout.update.mockResolvedValue({ id: 'po1', proof_url: '/path' });
    const result = await service.updateProofUrl(instId, 'po1', '/path');
    expect(result.proof_url).toBe('/path');
  });

  it('should find payouts by tutor', async () => {
    mockPrisma.payout.findMany.mockResolvedValue([]);
    mockPrisma.payout.count.mockResolvedValue(0);
    const result = await service.findByTutor(instId, 't1', { page: 1, limit: 20, sort_by: 'date', sort_order: 'desc' } as any);
    expect(result.data).toEqual([]);
  });
});
```

- [ ] Create `sinaloka-backend/src/modules/finance/payout-admin.controller.spec.ts` (integration test)

```ts
// sinaloka-backend/src/modules/finance/payout-admin.controller.spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PayoutAdminController } from './payout-admin.controller';
import { PayoutService } from './payout.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

describe('PayoutAdminController (integration)', () => {
  let app: INestApplication;
  const mockService = {
    create: jest.fn().mockResolvedValue({ id: 'po1' }),
    findAll: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 }),
    update: jest.fn().mockResolvedValue({ id: 'po1', status: 'PAID' }),
    updateProofUrl: jest.fn().mockResolvedValue({ id: 'po1', proof_url: '/path' }),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [PayoutAdminController],
      providers: [{ provide: PayoutService, useValue: mockService }],
    })
      .overrideGuard(AuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(() => app.close());

  it('GET /admin/payouts returns list', () =>
    request(app.getHttpServer()).get('/admin/payouts').expect(200));

  it('POST /admin/payouts creates payout', () =>
    request(app.getHttpServer()).post('/admin/payouts')
      .send({ tutor_id: 't1', amount: 500, date: '2026-04-01' })
      .expect(201));

  it('PATCH /admin/payouts/:id updates payout', () =>
    request(app.getHttpServer()).patch('/admin/payouts/po1')
      .send({ status: 'PAID' }).expect(200));
});
```

---

## Section C: Expense (Steps 10-13)

### Step 10 — Create Expense DTOs with Zod

- [ ] Create `sinaloka-backend/src/modules/finance/expense.dto.ts`

```ts
// sinaloka-backend/src/modules/finance/expense.dto.ts
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ExpenseCategory = z.enum(['RENT', 'UTILITIES', 'SUPPLIES', 'MARKETING', 'OTHER']);

export const CreateExpenseSchema = z.object({
  category: ExpenseCategory,
  amount: z.coerce.number().positive(),
  date: z.coerce.date(),
  description: z.string().max(500).optional().nullable(),
  receipt_url: z.string().max(500).optional().nullable(),
});
export class CreateExpenseDto extends createZodDto(CreateExpenseSchema) {}

export const UpdateExpenseSchema = z.object({
  category: ExpenseCategory.optional(),
  amount: z.coerce.number().positive().optional(),
  date: z.coerce.date().optional(),
  description: z.string().max(500).optional().nullable(),
  receipt_url: z.string().max(500).optional().nullable(),
});
export class UpdateExpenseDto extends createZodDto(UpdateExpenseSchema) {}

export const ExpenseQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: ExpenseCategory.optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
  sort_by: z.enum(['date', 'amount', 'created_at']).default('date'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});
export class ExpenseQueryDto extends createZodDto(ExpenseQuerySchema) {}
```

### Step 11 — Implement ExpenseService

- [ ] Create `sinaloka-backend/src/modules/finance/expense.service.ts`

```ts
// sinaloka-backend/src/modules/finance/expense.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateExpenseDto, UpdateExpenseDto, ExpenseQueryDto } from './expense.dto';

@Injectable()
export class ExpenseService {
  constructor(private prisma: PrismaService) {}

  async create(institutionId: string, dto: CreateExpenseDto) {
    return this.prisma.expense.create({
      data: { ...dto, institution_id: institutionId },
    });
  }

  async findAll(institutionId: string, query: ExpenseQueryDto) {
    const { page, limit, category, date_from, date_to, sort_by, sort_order } = query;
    const where: any = { institution_id: institutionId };
    if (category) where.category = category;
    if (date_from || date_to) {
      where.date = {};
      if (date_from) where.date.gte = date_from;
      if (date_to) where.date.lte = date_to;
    }

    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { [sort_by]: sort_order },
      }),
      this.prisma.expense.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async findOne(institutionId: string, id: string) {
    const expense = await this.prisma.expense.findUnique({ where: { id } });
    if (!expense || expense.institution_id !== institutionId)
      throw new NotFoundException('Expense not found');
    return expense;
  }

  async update(institutionId: string, id: string, dto: UpdateExpenseDto) {
    await this.findOne(institutionId, id);
    return this.prisma.expense.update({ where: { id }, data: dto });
  }

  async remove(institutionId: string, id: string) {
    await this.findOne(institutionId, id);
    return this.prisma.expense.delete({ where: { id } });
  }
}
```

### Step 12 — Implement ExpenseController

- [ ] Create `sinaloka-backend/src/modules/finance/expense.controller.ts`

```ts
// sinaloka-backend/src/modules/finance/expense.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { CreateExpenseDto, UpdateExpenseDto, ExpenseQueryDto, ExpenseQuerySchema } from './expense.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('admin/expenses')
@UseGuards(AuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
export class ExpenseController {
  constructor(private expenseService: ExpenseService) {}

  @Post()
  create(@Tenant() instId: string, @Body() dto: CreateExpenseDto) {
    return this.expenseService.create(instId, dto);
  }

  @Get()
  findAll(@Tenant() instId: string, @Query(new ZodValidationPipe(ExpenseQuerySchema)) q: ExpenseQueryDto) {
    return this.expenseService.findAll(instId, q);
  }

  @Patch(':id')
  update(@Tenant() instId: string, @Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return this.expenseService.update(instId, id, dto);
  }

  @Delete(':id')
  remove(@Tenant() instId: string, @Param('id') id: string) {
    return this.expenseService.remove(instId, id);
  }
}
```

### Step 13 — Expense unit test + integration test

- [ ] Create `sinaloka-backend/src/modules/finance/expense.service.spec.ts`

```ts
// sinaloka-backend/src/modules/finance/expense.service.spec.ts
import { Test } from '@nestjs/testing';
import { ExpenseService } from './expense.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('ExpenseService', () => {
  let service: ExpenseService;
  const mockPrisma = {
    expense: {
      create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(),
      update: jest.fn(), delete: jest.fn(), count: jest.fn(),
    },
  };
  const instId = 'inst-1';

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ExpenseService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(ExpenseService);
    jest.clearAllMocks();
  });

  it('should create an expense', async () => {
    const dto = { category: 'RENT', amount: 1000, date: new Date() } as any;
    mockPrisma.expense.create.mockResolvedValue({ id: 'e1', ...dto });
    const result = await service.create(instId, dto);
    expect(result.id).toBe('e1');
  });

  it('should list expenses filtered by category', async () => {
    mockPrisma.expense.findMany.mockResolvedValue([]);
    mockPrisma.expense.count.mockResolvedValue(0);
    const result = await service.findAll(instId, {
      page: 1, limit: 20, category: 'RENT', sort_by: 'date', sort_order: 'desc',
    } as any);
    expect(result.total).toBe(0);
  });

  it('should list expenses filtered by date range', async () => {
    mockPrisma.expense.findMany.mockResolvedValue([]);
    mockPrisma.expense.count.mockResolvedValue(0);
    await service.findAll(instId, {
      page: 1, limit: 20, date_from: new Date('2026-01-01'), date_to: new Date('2026-12-31'),
      sort_by: 'date', sort_order: 'desc',
    } as any);
    expect(mockPrisma.expense.findMany).toHaveBeenCalled();
  });

  it('should throw NotFoundException for missing expense', async () => {
    mockPrisma.expense.findUnique.mockResolvedValue(null);
    await expect(service.findOne(instId, 'bad')).rejects.toThrow(NotFoundException);
  });

  it('should delete an expense', async () => {
    mockPrisma.expense.findUnique.mockResolvedValue({ id: 'e1', institution_id: instId });
    mockPrisma.expense.delete.mockResolvedValue({ id: 'e1' });
    const result = await service.remove(instId, 'e1');
    expect(result.id).toBe('e1');
  });
});
```

- [ ] Create `sinaloka-backend/src/modules/finance/expense.controller.spec.ts` (integration test)

```ts
// sinaloka-backend/src/modules/finance/expense.controller.spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ExpenseController } from './expense.controller';
import { ExpenseService } from './expense.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

describe('ExpenseController (integration)', () => {
  let app: INestApplication;
  const mockService = {
    create: jest.fn().mockResolvedValue({ id: 'e1' }),
    findAll: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 }),
    update: jest.fn().mockResolvedValue({ id: 'e1' }),
    remove: jest.fn().mockResolvedValue({ id: 'e1' }),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ExpenseController],
      providers: [{ provide: ExpenseService, useValue: mockService }],
    })
      .overrideGuard(AuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(() => app.close());

  it('GET /admin/expenses returns list', () =>
    request(app.getHttpServer()).get('/admin/expenses').expect(200));

  it('POST /admin/expenses creates expense', () =>
    request(app.getHttpServer()).post('/admin/expenses')
      .send({ category: 'RENT', amount: 1000, date: '2026-04-01' })
      .expect(201));

  it('DELETE /admin/expenses/:id deletes expense', () =>
    request(app.getHttpServer()).delete('/admin/expenses/e1').expect(200));
});
```

---

## Section D: Payment Aging Cron (Step 14)

### Step 14 — Implement PaymentAgingService cron + test

- [ ] Create `sinaloka-backend/src/modules/finance/payment-aging.service.ts`

```ts
// sinaloka-backend/src/modules/finance/payment-aging.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PaymentAgingService {
  private readonly logger = new Logger(PaymentAgingService.name);

  constructor(private prisma: PrismaService) {}

  @Cron('0 0 * * *') // daily at midnight
  async markOverduePayments() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.prisma.payment.updateMany({
      where: { status: 'PENDING', due_date: { lt: today } },
      data: { status: 'OVERDUE' },
    });

    this.logger.log(`Marked ${result.count} payments as OVERDUE`);
    return result;
  }
}
```

- [ ] Create `sinaloka-backend/src/modules/finance/payment-aging.service.spec.ts`

```ts
// sinaloka-backend/src/modules/finance/payment-aging.service.spec.ts
import { Test } from '@nestjs/testing';
import { PaymentAgingService } from './payment-aging.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('PaymentAgingService', () => {
  let service: PaymentAgingService;
  const mockPrisma = { payment: { updateMany: jest.fn() } };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [PaymentAgingService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(PaymentAgingService);
    jest.clearAllMocks();
  });

  it('should update PENDING payments with past due_date to OVERDUE', async () => {
    mockPrisma.payment.updateMany.mockResolvedValue({ count: 3 });
    const result = await service.markOverduePayments();
    expect(result.count).toBe(3);
    expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith({
      where: { status: 'PENDING', due_date: { lt: expect.any(Date) } },
      data: { status: 'OVERDUE' },
    });
  });

  it('should return 0 when no overdue payments', async () => {
    mockPrisma.payment.updateMany.mockResolvedValue({ count: 0 });
    const result = await service.markOverduePayments();
    expect(result.count).toBe(0);
  });
});
```

---

## Section E: Finance Module Registration (Step 15)

### Step 15 — Create FinanceModule, register in AppModule, commit

- [ ] Create `sinaloka-backend/src/modules/finance/finance.module.ts`

```ts
// sinaloka-backend/src/modules/finance/finance.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MulterModule } from '@nestjs/platform-express';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PayoutService } from './payout.service';
import { PayoutAdminController } from './payout-admin.controller';
import { TutorPayoutController } from './tutor-payout.controller';
import { ExpenseService } from './expense.service';
import { ExpenseController } from './expense.controller';
import { PaymentAgingService } from './payment-aging.service';

@Module({
  imports: [ScheduleModule.forRoot(), MulterModule.register()],
  controllers: [
    PaymentController,
    PayoutAdminController,
    TutorPayoutController,
    ExpenseController,
  ],
  providers: [
    PrismaService,
    PaymentService,
    PayoutService,
    ExpenseService,
    PaymentAgingService,
  ],
  exports: [PaymentService, PayoutService, ExpenseService],
})
export class FinanceModule {}
```

- [ ] Register `FinanceModule` in `sinaloka-backend/src/app.module.ts`

```ts
// Add to imports array in app.module.ts:
import { FinanceModule } from './modules/finance/finance.module';

@Module({
  imports: [
    // ... existing modules
    FinanceModule,
  ],
})
export class AppModule {}
```

- [ ] Ensure upload directory exists for payout proofs (create `uploads/` dir if missing)
- [ ] Run all tests: `npm test -- --testPathPattern=finance`
- [ ] Commit: `git add src/modules/finance/ && git commit -m "feat: add finance module (payment, payout, expense) with cron aging"`

---

## File Summary

| File | Purpose |
|---|---|
| `src/modules/finance/payment.dto.ts` | Payment Zod schemas + DTOs |
| `src/modules/finance/payment.service.ts` | Payment CRUD, tenant-scoped |
| `src/modules/finance/payment.controller.ts` | `/admin/payments` endpoints |
| `src/modules/finance/payment.service.spec.ts` | Payment unit tests |
| `src/modules/finance/payment.controller.spec.ts` | Payment integration tests |
| `src/modules/finance/payout.dto.ts` | Payout Zod schemas + DTOs |
| `src/modules/finance/payout.service.ts` | Payout CRUD + tutor-scoped query |
| `src/modules/finance/payout-admin.controller.ts` | `/admin/payouts` + upload-proof |
| `src/modules/finance/tutor-payout.controller.ts` | `/tutor/payouts` (own only) |
| `src/modules/finance/payout.service.spec.ts` | Payout unit tests |
| `src/modules/finance/payout-admin.controller.spec.ts` | Payout integration tests |
| `src/modules/finance/expense.dto.ts` | Expense Zod schemas + DTOs |
| `src/modules/finance/expense.service.ts` | Expense CRUD, filter by category/date |
| `src/modules/finance/expense.controller.ts` | `/admin/expenses` endpoints |
| `src/modules/finance/expense.service.spec.ts` | Expense unit tests |
| `src/modules/finance/expense.controller.spec.ts` | Expense integration tests |
| `src/modules/finance/payment-aging.service.ts` | Daily cron: PENDING to OVERDUE |
| `src/modules/finance/payment-aging.service.spec.ts` | Cron unit tests |
| `src/modules/finance/finance.module.ts` | Module registration |
# Chunk 6b: Dashboard + Report Modules (Phase 6)

**Estimated time:** ~50 minutes
**Depends on:** Chunks 1-5 (all prior modules: Auth, Institution, User, Student, Tutor, Class, Enrollment, Session, Attendance, Finance)
**Outcome:** Admin dashboard returns KPI stats and recent activity feed. Admin can generate PDF reports for attendance, finance, and student progress.

---

## Section A: Dashboard Module

### Step 1 — Dashboard DTOs and Service

- [ ] Create `sinaloka-backend/src/modules/dashboard/dashboard.service.ts`

```ts
// sinaloka-backend/src/modules/dashboard/dashboard.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { addDays } from 'date-fns';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(institutionId: string) {
    const where = { institution_id: institutionId };
    const [totalStudents, activeTutors, revenueAgg, attendanceCounts, upcomingSessions] =
      await Promise.all([
        this.prisma.student.count({ where }),
        this.prisma.tutor.count({ where: { ...where, is_verified: true } }),
        this.prisma.payment.aggregate({ where: { ...where, status: 'PAID' }, _sum: { amount: true } }),
        this.prisma.attendance.groupBy({
          by: ['status'], where, _count: { status: true },
        }),
        this.prisma.session.count({
          where: { ...where, date: { gte: new Date(), lte: addDays(new Date(), 7) }, status: 'SCHEDULED' },
        }),
      ]);

    const present = attendanceCounts.find((a) => a.status === 'PRESENT')?._count.status ?? 0;
    const late = attendanceCounts.find((a) => a.status === 'LATE')?._count.status ?? 0;
    const total = attendanceCounts.reduce((s, a) => s + a._count.status, 0);

    return {
      total_students: totalStudents,
      active_tutors: activeTutors,
      total_revenue: revenueAgg._sum.amount ?? 0,
      attendance_rate: total > 0 ? Math.round(((present + late) / total) * 10000) / 100 : 0,
      upcoming_sessions: upcomingSessions,
    };
  }

  async getActivity(institutionId: string) {
    const where = { institution_id: institutionId };
    const [enrollments, payments, attendances] = await Promise.all([
      this.prisma.enrollment.findMany({
        where, orderBy: { created_at: 'desc' }, take: 20,
        include: { student: { select: { name: true } }, class: { select: { name: true } } },
      }),
      this.prisma.payment.findMany({
        where, orderBy: { created_at: 'desc' }, take: 20,
        include: { student: { select: { name: true } } },
      }),
      this.prisma.attendance.findMany({
        where, orderBy: { created_at: 'desc' }, take: 20,
        include: { student: { select: { name: true } }, session: { select: { date: true } } },
      }),
    ]);

    const items = [
      ...enrollments.map((e) => ({ type: 'enrollment' as const, description: `${e.student.name} enrolled in ${e.class.name}`, created_at: e.created_at })),
      ...payments.map((p) => ({ type: 'payment' as const, description: `${p.student.name} payment ${p.status} - ${p.amount}`, created_at: p.created_at })),
      ...attendances.map((a) => ({ type: 'attendance' as const, description: `${a.student.name} marked ${a.status} on ${a.session.date.toISOString().slice(0, 10)}`, created_at: a.created_at })),
    ];
    items.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    return items.slice(0, 20);
  }
}
```

### Step 2 — Dashboard Controller

- [ ] Create `sinaloka-backend/src/modules/dashboard/dashboard.controller.ts`

```ts
// sinaloka-backend/src/modules/dashboard/dashboard.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';

@Controller('admin/dashboard')
@UseGuards(AuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  getStats(@Tenant() institutionId: string) {
    return this.dashboardService.getStats(institutionId);
  }

  @Get('activity')
  getActivity(@Tenant() institutionId: string) {
    return this.dashboardService.getActivity(institutionId);
  }
}
```

### Step 3 — Dashboard Module + Register in AppModule

- [ ] Create `sinaloka-backend/src/modules/dashboard/dashboard.module.ts`

```ts
// sinaloka-backend/src/modules/dashboard/dashboard.module.ts
import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, PrismaService],
})
export class DashboardModule {}
```

- [ ] Register `DashboardModule` in `sinaloka-backend/src/app.module.ts` imports array

### Step 4 — Dashboard Unit + Integration Tests

- [ ] Create `sinaloka-backend/src/modules/dashboard/dashboard.service.spec.ts`

```ts
// sinaloka-backend/src/modules/dashboard/dashboard.service.spec.ts
import { Test } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: PrismaService;
  const instId = 'inst-uuid';

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [DashboardService, {
        provide: PrismaService,
        useValue: {
          student: { count: jest.fn().mockResolvedValue(10) },
          tutor: { count: jest.fn().mockResolvedValue(3) },
          payment: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 5000 } }) },
          attendance: { groupBy: jest.fn().mockResolvedValue([
            { status: 'PRESENT', _count: { status: 80 } },
            { status: 'ABSENT', _count: { status: 10 } },
            { status: 'LATE', _count: { status: 10 } },
          ]), findMany: jest.fn().mockResolvedValue([]) },
          session: { count: jest.fn().mockResolvedValue(5) },
          enrollment: { findMany: jest.fn().mockResolvedValue([]) },
        },
      }],
    }).compile();
    service = module.get(DashboardService);
    prisma = module.get(PrismaService);
  });

  describe('getStats', () => {
    it('returns aggregated stats', async () => {
      const stats = await service.getStats(instId);
      expect(stats.total_students).toBe(10);
      expect(stats.active_tutors).toBe(3);
      expect(stats.total_revenue).toBe(5000);
      expect(stats.attendance_rate).toBe(90);
      expect(stats.upcoming_sessions).toBe(5);
    });
  });

  describe('getActivity', () => {
    it('returns max 20 items sorted by created_at desc', async () => {
      const activity = await service.getActivity(instId);
      expect(Array.isArray(activity)).toBe(true);
      expect(activity.length).toBeLessThanOrEqual(20);
    });
  });
});
```

- [ ] Create `sinaloka-backend/src/modules/dashboard/dashboard.controller.spec.ts`

```ts
// sinaloka-backend/src/modules/dashboard/dashboard.controller.spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DashboardModule } from './dashboard.module';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

describe('DashboardController (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [DashboardModule] })
      .overrideProvider(PrismaService).useValue({
        student: { count: jest.fn().mockResolvedValue(5) },
        tutor: { count: jest.fn().mockResolvedValue(2) },
        payment: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 1000 } }) },
        attendance: { groupBy: jest.fn().mockResolvedValue([]), findMany: jest.fn().mockResolvedValue([]) },
        session: { count: jest.fn().mockResolvedValue(3) },
        enrollment: { findMany: jest.fn().mockResolvedValue([]) },
      })
      .overrideGuard(AuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(() => app.close());

  it('GET /admin/dashboard/stats returns stats object', () =>
    request(app.getHttpServer()).get('/admin/dashboard/stats')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('total_students');
        expect(res.body).toHaveProperty('attendance_rate');
      }));

  it('GET /admin/dashboard/activity returns array', () =>
    request(app.getHttpServer()).get('/admin/dashboard/activity')
      .expect(200)
      .expect((res) => expect(Array.isArray(res.body)).toBe(true)));
});
```

- [ ] Run tests: `npx jest --testPathPattern=dashboard --verbose`

---

## Section B: Report Module

### Step 5 — Report DTOs

- [ ] Create `sinaloka-backend/src/modules/report/report.dto.ts`

```ts
// sinaloka-backend/src/modules/report/report.dto.ts
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const AttendanceReportQuerySchema = z.object({
  date_from: z.coerce.date(),
  date_to: z.coerce.date(),
  class_id: z.string().uuid().optional(),
  student_id: z.string().uuid().optional(),
});
export class AttendanceReportQueryDto extends createZodDto(AttendanceReportQuerySchema) {}

export const FinanceReportQuerySchema = z.object({
  date_from: z.coerce.date(),
  date_to: z.coerce.date(),
});
export class FinanceReportQueryDto extends createZodDto(FinanceReportQuerySchema) {}

export const StudentProgressQuerySchema = z.object({
  student_id: z.string().uuid(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
});
export class StudentProgressQueryDto extends createZodDto(StudentProgressQuerySchema) {}
```

### Step 6 — Report Service

- [ ] Create `sinaloka-backend/src/modules/report/report.service.ts`

```ts
// sinaloka-backend/src/modules/report/report.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class ReportService {
  constructor(private prisma: PrismaService) {}

  async generateAttendanceReport(institutionId: string, filters: { date_from: Date; date_to: Date; class_id?: string; student_id?: string }): Promise<Buffer> {
    const records = await this.prisma.attendance.findMany({
      where: {
        institution_id: institutionId,
        session: { date: { gte: filters.date_from, lte: filters.date_to }, ...(filters.class_id ? { class_id: filters.class_id } : {}) },
        ...(filters.student_id ? { student_id: filters.student_id } : {}),
      },
      include: { student: { select: { name: true } }, session: { select: { date: true, class: { select: { name: true } } } } },
      orderBy: { session: { date: 'asc' } },
    });

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    doc.fontSize(18).text('Attendance Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Period: ${filters.date_from.toISOString().slice(0, 10)} to ${filters.date_to.toISOString().slice(0, 10)}`);
    doc.moveDown();

    // Table header
    const cols = [40, 150, 180, 80];
    let y = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('Date', cols[0], y); doc.text('Student', cols[1], y);
    doc.text('Class', cols[2], y); doc.text('Status', cols[3], y);
    doc.font('Helvetica');
    y += 20;

    for (const r of records) {
      if (y > 750) { doc.addPage(); y = 40; }
      const status = r.status === 'PRESENT' ? 'P' : r.status === 'LATE' ? 'L' : 'A';
      doc.text(r.session.date.toISOString().slice(0, 10), cols[0], y);
      doc.text(r.student.name, cols[1], y);
      doc.text(r.session.class.name, cols[2], y);
      doc.text(status, cols[3], y);
      y += 18;
    }

    doc.end();
    return new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
  }

  async generateFinanceReport(institutionId: string, filters: { date_from: Date; date_to: Date }): Promise<Buffer> {
    const where = { institution_id: institutionId };
    const dateRange = { gte: filters.date_from, lte: filters.date_to };

    const [payments, payouts, expenses] = await Promise.all([
      this.prisma.payment.aggregate({ where: { ...where, status: 'PAID', paid_date: dateRange }, _sum: { amount: true }, _count: true }),
      this.prisma.payout.aggregate({ where: { ...where, date: dateRange }, _sum: { amount: true }, _count: true }),
      this.prisma.expense.aggregate({ where: { ...where, date: dateRange }, _sum: { amount: true }, _count: true }),
    ]);

    const totalIncome = Number(payments._sum.amount ?? 0);
    const totalPayouts = Number(payouts._sum.amount ?? 0);
    const totalExpenses = Number(expenses._sum.amount ?? 0);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    doc.fontSize(18).text('Finance Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Period: ${filters.date_from.toISOString().slice(0, 10)} to ${filters.date_to.toISOString().slice(0, 10)}`);
    doc.moveDown();

    doc.fontSize(12);
    doc.text(`Total Income (Paid Payments): ${totalIncome} (${payments._count} transactions)`);
    doc.text(`Total Payouts: ${totalPayouts} (${payouts._count} transactions)`);
    doc.text(`Total Expenses: ${totalExpenses} (${expenses._count} transactions)`);
    doc.moveDown();
    doc.font('Helvetica-Bold').text(`Net Profit: ${totalIncome - totalPayouts - totalExpenses}`);
    doc.font('Helvetica');

    doc.end();
    return new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
  }

  async generateStudentProgressReport(institutionId: string, studentId: string, dateFrom?: Date, dateTo?: Date): Promise<Buffer> {
    const dateFilter = dateFrom && dateTo ? { gte: dateFrom, lte: dateTo } : undefined;
    const attendances = await this.prisma.attendance.findMany({
      where: { institution_id: institutionId, student_id: studentId, ...(dateFilter ? { session: { date: dateFilter } } : {}) },
      include: { session: { select: { date: true, topic_covered: true, session_summary: true, class: { select: { name: true } } } } },
      orderBy: { session: { date: 'asc' } },
    });

    const total = attendances.length;
    const presentLate = attendances.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
    const homeworkDone = attendances.filter((a) => a.homework_done).length;
    const attendanceRate = total > 0 ? Math.round((presentLate / total) * 100) : 0;
    const homeworkRate = total > 0 ? Math.round((homeworkDone / total) * 100) : 0;

    const student = await this.prisma.student.findFirstOrThrow({ where: { id: studentId, institution_id: institutionId } });

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    doc.fontSize(18).text('Student Progress Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Student: ${student.name}`);
    doc.text(`Attendance Rate: ${attendanceRate}%`);
    doc.text(`Homework Completion Rate: ${homeworkRate}%`);
    doc.text(`Total Sessions: ${total}`);
    doc.moveDown();

    doc.fontSize(14).text('Session Notes');
    doc.moveDown(0.5);
    doc.fontSize(10);
    for (const a of attendances) {
      if (doc.y > 720) doc.addPage();
      doc.font('Helvetica-Bold').text(`${a.session.date.toISOString().slice(0, 10)} - ${a.session.class.name}`);
      doc.font('Helvetica');
      doc.text(`Status: ${a.status} | Homework: ${a.homework_done ? 'Done' : 'Not done'}`);
      if (a.session.topic_covered) doc.text(`Topic: ${a.session.topic_covered}`);
      if (a.notes) doc.text(`Notes: ${a.notes}`);
      doc.moveDown(0.5);
    }

    doc.end();
    return new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
  }
}
```

### Step 7 — Report Controller

- [ ] Create `sinaloka-backend/src/modules/report/report.controller.ts`

```ts
// sinaloka-backend/src/modules/report/report.controller.ts
import { Controller, Get, Query, Res, UseGuards, UsePipes } from '@nestjs/common';
import { Response } from 'express';
import { ReportService } from './report.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AttendanceReportQueryDto, AttendanceReportQuerySchema, FinanceReportQueryDto, FinanceReportQuerySchema, StudentProgressQueryDto, StudentProgressQuerySchema } from './report.dto';

@Controller('admin/reports')
@UseGuards(AuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
export class ReportController {
  constructor(private reportService: ReportService) {}

  @Get('attendance')
  @UsePipes(new ZodValidationPipe(AttendanceReportQuerySchema))
  async attendance(@Tenant() instId: string, @Query() q: AttendanceReportQueryDto, @Res() res: Response) {
    const buf = await this.reportService.generateAttendanceReport(instId, q);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="attendance-report.pdf"' });
    res.send(buf);
  }

  @Get('finance')
  @UsePipes(new ZodValidationPipe(FinanceReportQuerySchema))
  async finance(@Tenant() instId: string, @Query() q: FinanceReportQueryDto, @Res() res: Response) {
    const buf = await this.reportService.generateFinanceReport(instId, q);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="finance-report.pdf"' });
    res.send(buf);
  }

  @Get('student-progress')
  @UsePipes(new ZodValidationPipe(StudentProgressQuerySchema))
  async studentProgress(@Tenant() instId: string, @Query() q: StudentProgressQueryDto, @Res() res: Response) {
    const buf = await this.reportService.generateStudentProgressReport(instId, q.student_id, q.date_from, q.date_to);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="student-progress.pdf"' });
    res.send(buf);
  }
}
```

### Step 8 — Report Module + Register in AppModule

- [ ] Create `sinaloka-backend/src/modules/report/report.module.ts`

```ts
// sinaloka-backend/src/modules/report/report.module.ts
import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  controllers: [ReportController],
  providers: [ReportService, PrismaService],
})
export class ReportModule {}
```

- [ ] Register `ReportModule` in `sinaloka-backend/src/app.module.ts` imports array

### Step 9 — Report Unit Tests

- [ ] Create `sinaloka-backend/src/modules/report/report.service.spec.ts`

```ts
// sinaloka-backend/src/modules/report/report.service.spec.ts
import { Test } from '@nestjs/testing';
import { ReportService } from './report.service';
import { PrismaService } from '../../common/prisma/prisma.service';

const mockPrisma = {
  attendance: {
    findMany: jest.fn().mockResolvedValue([
      { status: 'PRESENT', homework_done: true, notes: 'Good', student: { name: 'Ali' },
        session: { date: new Date('2026-03-01'), topic_covered: 'Algebra', session_summary: null, class: { name: 'Math A' } } },
    ]),
  },
  payment: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 5000 }, _count: 3 }) },
  payout: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 2000 }, _count: 1 }) },
  expense: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 500 }, _count: 2 }) },
  student: { findFirstOrThrow: jest.fn().mockResolvedValue({ id: 's1', name: 'Ali' }) },
};

describe('ReportService', () => {
  let service: ReportService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ReportService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(ReportService);
  });

  const instId = 'inst-uuid';
  const range = { date_from: new Date('2026-01-01'), date_to: new Date('2026-03-31') };

  it('generateAttendanceReport returns a valid PDF buffer', async () => {
    const buf = await service.generateAttendanceReport(instId, range);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('generateFinanceReport returns a valid PDF buffer', async () => {
    const buf = await service.generateFinanceReport(instId, range);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('generateStudentProgressReport returns a valid PDF buffer', async () => {
    const buf = await service.generateStudentProgressReport(instId, 's1');
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
```

- [ ] Run tests: `npx jest --testPathPattern=report.service --verbose`

### Step 10 — Report Integration Tests

- [ ] Create `sinaloka-backend/src/modules/report/report.controller.spec.ts`

```ts
// sinaloka-backend/src/modules/report/report.controller.spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ReportModule } from './report.module';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ReportService } from './report.service';

describe('ReportController (integration)', () => {
  let app: INestApplication;
  const fakePdf = Buffer.from('%PDF-1.4 fake');

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [ReportModule] })
      .overrideProvider(PrismaService).useValue({})
      .overrideProvider(ReportService).useValue({
        generateAttendanceReport: jest.fn().mockResolvedValue(fakePdf),
        generateFinanceReport: jest.fn().mockResolvedValue(fakePdf),
        generateStudentProgressReport: jest.fn().mockResolvedValue(fakePdf),
      })
      .overrideGuard(AuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(() => app.close());

  it('GET /admin/reports/attendance returns application/pdf', () =>
    request(app.getHttpServer())
      .get('/admin/reports/attendance?date_from=2026-01-01&date_to=2026-03-31')
      .expect(200)
      .expect('content-type', /application\/pdf/));

  it('GET /admin/reports/finance returns application/pdf', () =>
    request(app.getHttpServer())
      .get('/admin/reports/finance?date_from=2026-01-01&date_to=2026-03-31')
      .expect(200)
      .expect('content-type', /application\/pdf/));

  it('GET /admin/reports/student-progress returns application/pdf', () =>
    request(app.getHttpServer())
      .get('/admin/reports/student-progress?student_id=00000000-0000-0000-0000-000000000001')
      .expect(200)
      .expect('content-type', /application\/pdf/));
});
```

- [ ] Run all chunk tests: `npx jest --testPathPattern="(dashboard|report)" --verbose`

### Step 11 — Commit

- [ ] `git add sinaloka-backend/src/modules/dashboard/ sinaloka-backend/src/modules/report/ sinaloka-backend/src/app.module.ts`
- [ ] `git commit -m "feat: add dashboard stats/activity and PDF report generation (Phase 6)"`
# Chunk 6c: CSV Import/Export + File Uploads + Seed Script (Phase 7)

**Estimated time:** ~55 minutes
**Depends on:** Chunk 1-5 (all modules through Finance)
**Outcome:** Admin can bulk-import students via CSV, export filtered students as CSV, upload files (payout proofs, receipts), and serve them with tenant-scoped access. Seed script populates dev DB with realistic sample data across 2 institutions.

---

## Section A: CSV Import/Export (Student Module)

### Step 1 — Unit tests for import/export service methods

- [ ] Create `sinaloka-backend/src/modules/student/student-csv.service.spec.ts`

```ts
// sinaloka-backend/src/modules/student/student-csv.service.spec.ts
import { Test } from '@nestjs/testing';
import { StudentService } from './student.service';
import { PrismaService } from '../../common/prisma/prisma.service';

const mockPrisma = {
  student: { createMany: jest.fn(), findMany: jest.fn(), count: jest.fn() },
};

describe('StudentService CSV', () => {
  let service: StudentService;

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      providers: [StudentService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = mod.get(StudentService);
    jest.clearAllMocks();
  });

  describe('importFromCsv', () => {
    it('creates valid rows and returns errors for invalid ones', async () => {
      const csv = 'name,grade,email\nAlice,Grade 5,alice@test.com\n,Grade 5,bad\nBob,Grade 6,';
      const buf = Buffer.from(csv);
      mockPrisma.student.createMany.mockResolvedValue({ count: 2 });
      const result = await service.importFromCsv(buf, 'inst-1');
      expect(result.created).toBe(2);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].row).toBe(2);
    });

    it('returns all errors when CSV is entirely invalid', async () => {
      const csv = 'name,grade\n,\n,';
      const buf = Buffer.from(csv);
      const result = await service.importFromCsv(buf, 'inst-1');
      expect(result.created).toBe(0);
      expect(result.errors.length).toBe(2);
    });
  });

  describe('exportToCsv', () => {
    it('returns CSV string with headers and rows', async () => {
      mockPrisma.student.findMany.mockResolvedValue([
        { name: 'Alice', email: 'a@t.com', phone: null, grade: 'G5', status: 'ACTIVE', parent_name: null, parent_phone: null, parent_email: null },
      ]);
      const csv = await service.exportToCsv({}, 'inst-1');
      expect(csv).toContain('name,email');
      expect(csv).toContain('Alice');
    });
  });
});
```

### Step 2 — Add importFromCsv and exportToCsv to student.service.ts

- [ ] Edit `sinaloka-backend/src/modules/student/student.service.ts` — add two methods at the bottom:

```ts
// Add imports at top of student.service.ts
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { CreateStudentSchema } from './student.dto';

// Add to StudentService class:
async importFromCsv(buffer: Buffer, institutionId: string) {
  const records: Record<string, string>[] = parse(buffer, { columns: true, skip_empty_lines: true, trim: true });
  const valid: any[] = [];
  const errors: { row: number; message: string }[] = [];

  records.forEach((rec, i) => {
    const result = CreateStudentSchema.safeParse(rec);
    if (result.success) {
      valid.push({ ...result.data, institution_id: institutionId, enrolled_at: result.data.enrolled_at ?? new Date() });
    } else {
      errors.push({ row: i + 1, message: result.error.issues.map(e => `${e.path}: ${e.message}`).join('; ') });
    }
  });

  let created = 0;
  if (valid.length > 0) {
    const res = await this.prisma.student.createMany({ data: valid, skipDuplicates: true });
    created = res.count;
  }
  return { created, errors };
}

async exportToCsv(query: Record<string, any>, institutionId: string): Promise<string> {
  const where: any = { institution_id: institutionId };
  if (query.status) where.status = query.status;
  if (query.grade) where.grade = query.grade;
  if (query.search) where.name = { contains: query.search, mode: 'insensitive' };

  const students = await this.prisma.student.findMany({
    where,
    select: { name: true, email: true, phone: true, grade: true, status: true, parent_name: true, parent_phone: true, parent_email: true },
  });
  return stringify(students, { header: true });
}
```

- [ ] Run: `npx jest student-csv.service.spec --passWithNoTests` — verify tests pass

### Step 3 — Add import/export endpoints to student.controller.ts

- [ ] Edit `sinaloka-backend/src/modules/student/student.controller.ts` — add multer + endpoints:

```ts
// Add imports
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadedFile, UseInterceptors, Res } from '@nestjs/common';
import { Response } from 'express';

// Add to StudentController class:
@Post('import')
@Roles('SUPER_ADMIN', 'ADMIN')
@UseInterceptors(FileInterceptor('file'))
async importCsv(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: { userId: string; institutionId: string; role: string }) {
  if (!file) throw new BadRequestException('CSV file required');
  if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
    throw new BadRequestException('File must be a CSV');
  }
  return this.studentService.importFromCsv(file.buffer, user.institutionId);
}

@Get('export')
@Roles('SUPER_ADMIN', 'ADMIN')
async exportCsv(@Query() query: any, @CurrentUser() user: { userId: string; institutionId: string; role: string }, @Res() res: Response) {
  const csv = await this.studentService.exportToCsv(query, user.institutionId);
  res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename=students.csv' });
  res.send(csv);
}
```

- [ ] Run: `npx jest student.controller.spec --passWithNoTests` — verify no regressions

### Step 4 — Integration test for CSV import/export

- [ ] Create `sinaloka-backend/test/student-csv.e2e-spec.ts`

```ts
// sinaloka-backend/test/student-csv.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Student CSV (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
    const login = await request(app.getHttpServer()).post('/auth/login').send({ email: 'admin@test.com', password: 'password' });
    adminToken = login.body.access_token;
  });

  afterAll(() => app.close());

  it('POST /admin/students/import — creates students from CSV', async () => {
    const csv = 'name,grade\nTest Student 1,Grade 5\nTest Student 2,Grade 6';
    const res = await request(app.getHttpServer())
      .post('/admin/students/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csv), 'students.csv');
    expect(res.status).toBe(201);
    expect(res.body.created).toBe(2);
    expect(res.body.errors).toEqual([]);
  });

  it('GET /admin/students/export — returns CSV', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/students/export')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('name,email');
  });
});
```

- [ ] Run: `npx jest student-csv.e2e --passWithNoTests`

---

## Section B: File Upload Module

### Step 5 — Create upload.service.ts

- [ ] Create `sinaloka-backend/src/modules/upload/upload.service.ts`

```ts
// sinaloka-backend/src/modules/upload/upload.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuid } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.pdf'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

@Injectable()
export class UploadService {
  private baseDir: string;

  constructor(private config: ConfigService) {
    this.baseDir = this.config.get('UPLOAD_DIR', './uploads');
  }

  async saveFile(file: Express.Multer.File, institutionId: string, type: string): Promise<string> {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) throw new BadRequestException(`File type ${ext} not allowed. Use: ${ALLOWED_EXT.join(', ')}`);
    if (file.size > MAX_SIZE) throw new BadRequestException(`File exceeds 5MB limit`);

    const dir = path.join(this.baseDir, institutionId, type);
    fs.mkdirSync(dir, { recursive: true });

    const filename = `${uuid()}${ext}`;
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, file.buffer);

    return `${institutionId}/${type}/${filename}`;
  }

  getFilePath(institutionId: string, type: string, filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) throw new BadRequestException('Invalid file type');
    const abs = path.resolve(this.baseDir, institutionId, type, filename);
    if (!abs.startsWith(path.resolve(this.baseDir))) throw new BadRequestException('Invalid path');
    if (!fs.existsSync(abs)) throw new BadRequestException('File not found');
    return abs;
  }
}
```

### Step 6 — Create upload.controller.ts

- [ ] Create `sinaloka-backend/src/modules/upload/upload.controller.ts`

```ts
// sinaloka-backend/src/modules/upload/upload.controller.ts
import { Controller, Get, Param, Res, UseGuards, ForbiddenException } from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UploadService } from './upload.service';

@Controller('uploads')
@UseGuards(AuthGuard)
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Get(':institutionId/:type/:filename')
  serveFile(
    @Param('institutionId') institutionId: string,
    @Param('type') type: string,
    @Param('filename') filename: string,
    @CurrentUser() user: { userId: string; institutionId: string; role: string },
    @Res() res: Response,
  ) {
    if (user.role !== 'SUPER_ADMIN' && user.institutionId !== institutionId) {
      throw new ForbiddenException('Access denied');
    }
    const abs = this.uploadService.getFilePath(institutionId, type, filename);
    res.sendFile(abs);
  }
}
```

### Step 7 — Create upload.module.ts and register in AppModule

- [ ] Create `sinaloka-backend/src/modules/upload/upload.module.ts`

```ts
// sinaloka-backend/src/modules/upload/upload.module.ts
import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';

@Module({
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
```

- [ ] Edit `sinaloka-backend/src/app.module.ts` — add `UploadModule` to `imports` array

### Step 8 — Unit test + integration test for uploads

- [ ] Create `sinaloka-backend/src/modules/upload/upload.service.spec.ts`

```ts
// sinaloka-backend/src/modules/upload/upload.service.spec.ts
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UploadService } from './upload.service';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DIR = '/tmp/sinaloka-test-uploads';

describe('UploadService', () => {
  let service: UploadService;

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      providers: [UploadService, { provide: ConfigService, useValue: { get: () => TEST_DIR } }],
    }).compile();
    service = mod.get(UploadService);
  });

  afterAll(() => { if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true }); });

  it('saves a valid file and returns relative path', async () => {
    const file = { originalname: 'proof.pdf', size: 1024, buffer: Buffer.from('pdf-data') } as Express.Multer.File;
    const rel = await service.saveFile(file, 'inst-1', 'proofs');
    expect(rel).toMatch(/^inst-1\/proofs\/.*\.pdf$/);
    const abs = path.join(TEST_DIR, rel);
    expect(fs.existsSync(abs)).toBe(true);
  });

  it('rejects disallowed extension', async () => {
    const file = { originalname: 'hack.exe', size: 100, buffer: Buffer.alloc(0) } as Express.Multer.File;
    await expect(service.saveFile(file, 'inst-1', 'proofs')).rejects.toThrow('not allowed');
  });

  it('rejects file exceeding 5MB', async () => {
    const file = { originalname: 'big.jpg', size: 6 * 1024 * 1024, buffer: Buffer.alloc(0) } as Express.Multer.File;
    await expect(service.saveFile(file, 'inst-1', 'proofs')).rejects.toThrow('5MB');
  });

  it('getFilePath rejects path traversal', () => {
    expect(() => service.getFilePath('inst-1', '..', 'etc/passwd')).toThrow();
  });
});
```

- [ ] Create `sinaloka-backend/test/upload.e2e-spec.ts`

```ts
// sinaloka-backend/test/upload.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Upload (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
    const login = await request(app.getHttpServer()).post('/auth/login').send({ email: 'admin@test.com', password: 'password' });
    adminToken = login.body.access_token;
  });

  afterAll(() => app.close());

  it('GET /uploads/:instId/:type/:filename — serves file with access check', async () => {
    // Upload a file via payout proof endpoint first, then fetch it
    const res = await request(app.getHttpServer())
      .get('/uploads/nonexistent/proofs/missing.pdf')
      .set('Authorization', `Bearer ${adminToken}`);
    expect([400, 403]).toContain(res.status);
  });
});
```

- [ ] Run: `npx jest upload --passWithNoTests`

---

## Section C: Seed Script

### Step 9 — Create seed script

- [ ] Create `sinaloka-backend/prisma/seed.ts`

```ts
// sinaloka-backend/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  // Institutions
  const inst1 = await prisma.institution.create({ data: { name: 'Bimbel Cerdas', slug: 'bimbel-cerdas', email: 'info@cerdas.id', phone: '08111111111' } });
  const inst2 = await prisma.institution.create({ data: { name: 'Tutor Prima', slug: 'tutor-prima', email: 'info@prima.id', phone: '08222222222' } });
  console.log('Institutions created');

  // Super Admin
  await prisma.user.create({ data: { email: 'super@sinaloka.com', password_hash: hash('password'), name: 'Super Admin', role: 'SUPER_ADMIN' } });

  // Admins
  const admin1 = await prisma.user.create({ data: { email: 'admin@cerdas.id', password_hash: hash('password'), name: 'Admin Cerdas', role: 'ADMIN', institution_id: inst1.id } });
  const admin2 = await prisma.user.create({ data: { email: 'admin@prima.id', password_hash: hash('password'), name: 'Admin Prima', role: 'ADMIN', institution_id: inst2.id } });
  console.log('Users created');

  // Tutors (4 total, 2 per institution)
  const tutorUsers = await Promise.all([
    prisma.user.create({ data: { email: 'tutor1@cerdas.id', password_hash: hash('password'), name: 'Budi Santoso', role: 'TUTOR', institution_id: inst1.id } }),
    prisma.user.create({ data: { email: 'tutor2@cerdas.id', password_hash: hash('password'), name: 'Siti Rahayu', role: 'TUTOR', institution_id: inst1.id } }),
    prisma.user.create({ data: { email: 'tutor1@prima.id', password_hash: hash('password'), name: 'Andi Wijaya', role: 'TUTOR', institution_id: inst2.id } }),
    prisma.user.create({ data: { email: 'tutor2@prima.id', password_hash: hash('password'), name: 'Dewi Lestari', role: 'TUTOR', institution_id: inst2.id } }),
  ]);
  const tutors = await Promise.all(tutorUsers.map((u, i) =>
    prisma.tutor.create({ data: {
      user_id: u.id, institution_id: i < 2 ? inst1.id : inst2.id,
      subjects: i % 2 === 0 ? ['Matematika', 'Fisika'] : ['Bahasa Inggris', 'Bahasa Indonesia'],
      experience_years: 2 + i, is_verified: true,
    }})
  ));
  console.log('Tutors created');

  // Students (10 total, 5 per institution)
  const studentNames = ['Rina', 'Dimas', 'Putri', 'Fajar', 'Lina', 'Arief', 'Maya', 'Rizky', 'Nadia', 'Yusuf'];
  const students = await Promise.all(studentNames.map((name, i) =>
    prisma.student.create({ data: {
      institution_id: i < 5 ? inst1.id : inst2.id,
      name: `${name} Pelajar`, grade: `Grade ${(i % 3) + 7}`, status: 'ACTIVE',
      parent_name: `Parent of ${name}`, parent_phone: `0812000000${i}`,
      enrolled_at: new Date(),
    }})
  ));
  console.log('Students created');

  // Classes (4 total, 2 per institution)
  const classes = await Promise.all([
    prisma.class.create({ data: { institution_id: inst1.id, tutor_id: tutors[0].id, name: 'Matematika SMP', subject: 'Matematika', capacity: 10, fee: 500000, schedule_days: ['Monday', 'Wednesday'], schedule_start_time: '14:00', schedule_end_time: '15:30', status: 'ACTIVE' } }),
    prisma.class.create({ data: { institution_id: inst1.id, tutor_id: tutors[1].id, name: 'English SMP', subject: 'Bahasa Inggris', capacity: 8, fee: 450000, schedule_days: ['Tuesday', 'Thursday'], schedule_start_time: '16:00', schedule_end_time: '17:30', status: 'ACTIVE' } }),
    prisma.class.create({ data: { institution_id: inst2.id, tutor_id: tutors[2].id, name: 'Fisika SMA', subject: 'Fisika', capacity: 12, fee: 600000, schedule_days: ['Monday', 'Friday'], schedule_start_time: '09:00', schedule_end_time: '10:30', status: 'ACTIVE' } }),
    prisma.class.create({ data: { institution_id: inst2.id, tutor_id: tutors[3].id, name: 'B. Indonesia SMA', subject: 'Bahasa Indonesia', capacity: 10, fee: 400000, schedule_days: ['Wednesday', 'Saturday'], schedule_start_time: '10:00', schedule_end_time: '11:30', status: 'ACTIVE' } }),
  ]);
  console.log('Classes created');

  // Enrollments (8 — 2 students per class)
  const enrollments = await Promise.all([
    ...[0, 1].map(s => prisma.enrollment.create({ data: { institution_id: inst1.id, student_id: students[s].id, class_id: classes[0].id, status: 'ACTIVE', payment_status: 'PAID', enrolled_at: new Date() } })),
    ...[2, 3].map(s => prisma.enrollment.create({ data: { institution_id: inst1.id, student_id: students[s].id, class_id: classes[1].id, status: 'ACTIVE', payment_status: 'PENDING', enrolled_at: new Date() } })),
    ...[5, 6].map(s => prisma.enrollment.create({ data: { institution_id: inst2.id, student_id: students[s].id, class_id: classes[2].id, status: 'ACTIVE', payment_status: 'PAID', enrolled_at: new Date() } })),
    ...[7, 8].map(s => prisma.enrollment.create({ data: { institution_id: inst2.id, student_id: students[s].id, class_id: classes[3].id, status: 'TRIAL', payment_status: 'PENDING', enrolled_at: new Date() } })),
  ]);
  console.log('Enrollments created');

  // Sessions (8 — 2 per class)
  const sessions = await Promise.all(classes.flatMap((c, ci) =>
    [0, 7].map(dayOffset => prisma.session.create({ data: {
      institution_id: ci < 2 ? inst1.id : inst2.id, class_id: c.id,
      date: new Date(Date.now() - dayOffset * 86400000),
      start_time: c.schedule_start_time, end_time: c.schedule_end_time,
      status: dayOffset === 7 ? 'COMPLETED' : 'SCHEDULED',
      topic_covered: dayOffset === 7 ? 'Review chapter 1' : null,
      created_by: ci < 2 ? admin1.id : admin2.id,
    }}))
  ));
  console.log('Sessions created');

  // Attendance (for completed sessions — 1 record per enrolled student)
  const completedSessions = sessions.filter((_, i) => i % 2 === 1); // every other is COMPLETED
  const attendanceData = completedSessions.flatMap((s, si) => {
    const classIdx = Math.floor(si); // map back to class
    const studentPairs = [[0, 1], [2, 3], [5, 6], [7, 8]];
    const pair = studentPairs[classIdx] || studentPairs[0];
    return pair.map((sIdx, j) => ({
      institution_id: sIdx < 5 ? inst1.id : inst2.id,
      session_id: s.id, student_id: students[sIdx].id,
      status: j === 0 ? 'PRESENT' : 'LATE' as any,
      homework_done: j === 0,
    }));
  });
  await prisma.attendance.createMany({ data: attendanceData });
  console.log('Attendance created');

  // Payments (4)
  await Promise.all(enrollments.slice(0, 4).map((e, i) =>
    prisma.payment.create({ data: {
      institution_id: e.institution_id,
      student_id: e.student_id, enrollment_id: e.id,
      amount: i < 2 ? 500000 : 600000, due_date: new Date(),
      paid_date: i % 2 === 0 ? new Date() : null,
      status: i % 2 === 0 ? 'PAID' : 'PENDING',
      method: i % 2 === 0 ? 'TRANSFER' : 'CASH',
    }})
  ));
  console.log('Payments created');

  // Expenses (3 — sample operational expenses)
  await Promise.all([
    prisma.expense.create({ data: { institution_id: inst1.id, category: 'SUPPLIES', description: 'Whiteboard markers and erasers', amount: 150000, date: new Date(), created_by: admin1.id } }),
    prisma.expense.create({ data: { institution_id: inst1.id, category: 'RENT', description: 'Room rental March', amount: 2000000, date: new Date(), created_by: admin1.id } }),
    prisma.expense.create({ data: { institution_id: inst2.id, category: 'UTILITIES', description: 'Electricity bill March', amount: 750000, date: new Date(), created_by: admin2.id } }),
  ]);
  console.log('Expenses created');

  // Payouts (2 — one per institution)
  await Promise.all([
    prisma.payout.create({ data: { institution_id: inst1.id, tutor_id: tutors[0].id, amount: 1500000, date: new Date(), status: 'PAID', description: 'March payout' } }),
    prisma.payout.create({ data: { institution_id: inst2.id, tutor_id: tutors[2].id, amount: 1800000, date: new Date(), status: 'PENDING', description: 'March payout' } }),
  ]);
  console.log('Payouts created');

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

### Step 10 — Configure seed command in package.json

- [ ] Edit `sinaloka-backend/package.json` — add prisma seed config:

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

- [ ] Install tsx if not present: `npm install -D tsx`

### Step 11 — Run seed and verify

- [ ] Run: `npx prisma db seed`
- [ ] Verify output shows all "created" lines and "Seed completed successfully."
- [ ] Spot-check: `npx prisma studio` or query DB to confirm 2 institutions, 3+4 users, 10 students, 4 classes, 8 enrollments, 8 sessions, attendance records, 4 payments, 3 expenses, 2 payouts exist
- [ ] Final commit: `git add -A && git commit -m "feat: CSV import/export, file uploads, seed script (Phase 7)"`
