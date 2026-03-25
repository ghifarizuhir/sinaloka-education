# Public Registration Form — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public registration form on the landing site where students and tutors can self-register for an institution, with admin review/approve/reject workflow on the platform dashboard.

**Architecture:** New `Registration` model stores submissions as PENDING. Public endpoints on a new `RegisterController` (no auth) handle form submissions with rate limiting. Admin endpoints on `RegistrationController` handle listing/approve/reject. Landing site gets React Router + Axios for the form page. Platform gets a new `/registrations` page and settings toggle.

**Tech Stack:** NestJS, Prisma, PostgreSQL, React, React Router, Axios, TanStack Query, TailwindCSS v4, Zod, i18n

**Spec:** `docs/superpowers/specs/2026-03-20-public-registration-form-design.md`

---

## File Structure

### Backend — New Files
- `src/common/guards/rate-limit.guard.ts` — Simple in-memory IP rate limiter guard
- `src/modules/registration/registration.module.ts` — Registration module
- `src/modules/registration/registration.controller.ts` — Admin endpoints (CRUD, approve, reject)
- `src/modules/registration/registration.service.ts` — Registration business logic
- `src/modules/registration/registration.dto.ts` — Zod schemas
- `src/modules/registration/register.controller.ts` — Public endpoints (form submission)

### Backend — Modified Files
- `prisma/schema.prisma` — Add `RegistrationType`, `RegistrationStatus` enums, `Registration` model, relation on `Institution`
- `src/app.module.ts` — Register `RegistrationModule`
- `src/modules/settings/settings.service.ts` — Add `getRegistration()` and `updateRegistration()` methods
- `src/modules/settings/settings.controller.ts` — Add registration settings endpoints
- `src/modules/settings/settings.dto.ts` — Add `UpdateRegistrationSettingsSchema`

### Landing — New Files
- `src/pages/LandingPage.tsx` — Extracted from current App.tsx
- `src/pages/RegisterPage.tsx` — Registration form page
- `src/lib/api.ts` — Axios instance
- `public/_redirects` — Cloudflare SPA routing

### Landing — Modified Files
- `package.json` — Add `react-router-dom`, `axios`
- `src/main.tsx` — Wrap with BrowserRouter
- `src/App.tsx` — Add route definitions

### Platform — New Files
- `src/pages/Registrations.tsx` — Admin registration management page
- `src/services/registration.service.ts` — API calls
- `src/hooks/useRegistrations.ts` — TanStack Query hooks
- `src/types/registration.ts` — TypeScript types

### Platform — Modified Files
- `src/components/Layout.tsx` — Add "Pendaftaran" sidebar nav item with badge
- `src/App.tsx` — Add `/registrations` route
- `src/pages/Settings/index.tsx` — Add registration settings tab
- `src/locales/en.json` — Add registration i18n strings
- `src/locales/id.json` — Add registration i18n strings (Indonesian)

---

## Task 1: Database Schema & Migration

**Files:**
- Modify: `sinaloka-backend/prisma/schema.prisma`

- [ ] **Step 1: Add Registration enums and model**

Add enums after existing enums:

```prisma
enum RegistrationType {
  STUDENT
  TUTOR
}

enum RegistrationStatus {
  PENDING
  APPROVED
  REJECTED
}
```

Add `registrations Registration[]` relation to `Institution` model.

Add new model:

```prisma
model Registration {
  id               String             @id @default(uuid())
  institution_id   String
  institution      Institution        @relation(fields: [institution_id], references: [id])
  type             RegistrationType
  status           RegistrationStatus @default(PENDING)
  name             String
  email            String?
  phone            String?
  grade            String?
  parent_name      String?
  parent_phone     String?
  parent_email     String?
  subject_names    String[]
  experience_years Int?
  rejected_reason  String?
  reviewed_at      DateTime?
  reviewed_by      String?
  created_at       DateTime           @default(now())
  updated_at       DateTime           @updatedAt

  @@index([institution_id])
  @@index([status])
  @@index([type])
  @@map("registrations")
}
```

- [ ] **Step 2: Run migration**

```bash
cd sinaloka-backend
npx prisma migrate dev --name add-registrations
npm run prisma:generate
```

- [ ] **Step 3: Commit**

```bash
git add prisma/
git commit -m "feat(backend): add Registration model with enums for public registration form"
```

---

## Task 2: Rate Limit Guard

**Files:**
- Create: `sinaloka-backend/src/common/guards/rate-limit.guard.ts`

- [ ] **Step 1: Create in-memory rate limit guard**

```ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

const RATE_LIMIT_KEY = 'rate_limit';

import { SetMetadata } from '@nestjs/common';

export const RateLimit = (maxRequests: number, windowMs: number) =>
  SetMetadata(RATE_LIMIT_KEY, { maxRequests, windowMs });

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const ipMap = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of ipMap) {
    if (entry.resetAt <= now) ipMap.delete(key);
  }
}, 10 * 60 * 1000);

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const config = this.reflector.get<{ maxRequests: number; windowMs: number }>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!config) return true;

    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    const key = `${ip}:${context.getHandler().name}`;
    const now = Date.now();

    const entry = ipMap.get(key);

    if (!entry || entry.resetAt <= now) {
      ipMap.set(key, { count: 1, resetAt: now + config.windowMs });
      return true;
    }

    if (entry.count >= config.maxRequests) {
      throw new HttpException(
        'Terlalu banyak percobaan. Silakan coba lagi nanti.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    entry.count++;
    return true;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/common/guards/rate-limit.guard.ts
git commit -m "feat(backend): add simple in-memory rate limit guard"
```

---

## Task 3: Registration DTOs

**Files:**
- Create: `sinaloka-backend/src/modules/registration/registration.dto.ts`

- [ ] **Step 1: Create registration DTOs**

```ts
import { z } from 'zod';

export const StudentRegistrationSchema = z.object({
  name: z.string().min(1).max(255),
  grade: z.string().min(1).max(50),
  parent_name: z.string().min(1).max(255),
  parent_phone: z.string().min(1).max(20),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  parent_email: z.string().email().optional(),
});

export type StudentRegistrationDto = z.infer<typeof StudentRegistrationSchema>;

export const TutorRegistrationSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  subject_names: z.array(z.string().min(1)).min(1),
  experience_years: z.coerce.number().min(0).optional(),
});

export type TutorRegistrationDto = z.infer<typeof TutorRegistrationSchema>;

export const RejectRegistrationSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type RejectRegistrationDto = z.infer<typeof RejectRegistrationSchema>;

export const RegistrationQuerySchema = z.object({
  type: z.enum(['STUDENT', 'TUTOR']).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type RegistrationQueryDto = z.infer<typeof RegistrationQuerySchema>;
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/registration/registration.dto.ts
git commit -m "feat(backend): add registration Zod DTOs"
```

---

## Task 4: Registration Service

**Files:**
- Create: `sinaloka-backend/src/modules/registration/registration.service.ts`

- [ ] **Step 1: Create registration service**

The service handles:
- `getInstitutionInfo(slug)` — public, return institution name/logo + registration settings
- `submitStudentRegistration(slug, dto)` — public, create PENDING registration
- `submitTutorRegistration(slug, dto)` — public, create PENDING registration
- `findAll(institutionId, query)` — admin, paginated list with filters
- `findOne(institutionId, id)` — admin, single registration
- `getPendingCount(institutionId)` — admin, count for badge
- `approve(institutionId, id, userId)` — admin, approve + create Student or trigger invite
- `reject(institutionId, id, userId, dto)` — admin, reject with optional reason

Key logic for `approve`:
- Student: inline PlanLimit check → `prisma.student.create()` → update registration status. Wrap in `$transaction` for atomicity.
- Tutor: inline PlanLimit check → check email not already a User → `invitationService.invite(institutionId, { email, name, subject_ids: [], experience_years })` → update registration status

**IMPORTANT — `InviteTutorDto.subject_ids` has `.min(1)` validation.** Before calling `invite()`, modify `sinaloka-backend/src/modules/invitation/invitation.dto.ts` to change `subject_ids` from `.min(1)` to `.default([])` (or `.optional()`), since registration-approved tutors won't have subject IDs yet. Alternatively, use a type assertion to bypass. The DTO change is cleaner.

Key logic for duplicate check on submit:
- **Only check when email is provided** (students may not have email). If `dto.email` is present, check for PENDING registration with same email + institution + type → 409 Conflict. Skip check if email is absent.

The service needs `PrismaService`, `InvitationService` injected. Import `PLAN_LIMITS` from constants.

- [ ] **Step 2: Commit**

```bash
git add src/modules/registration/registration.service.ts
git commit -m "feat(backend): add RegistrationService with submit, approve, reject logic"
```

---

## Task 5: Public Register Controller

**Files:**
- Create: `sinaloka-backend/src/modules/registration/register.controller.ts`

- [ ] **Step 1: Create public controller**

```ts
import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { RateLimitGuard, RateLimit } from '../../common/guards/rate-limit.guard.js';
import { RegistrationService } from './registration.service.js';
import { StudentRegistrationSchema, TutorRegistrationSchema } from './registration.dto.js';
import type { StudentRegistrationDto, TutorRegistrationDto } from './registration.dto.js';

@Controller('register')
@Public()
@UseGuards(RateLimitGuard)
export class RegisterController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Get(':slug')
  async getInstitutionInfo(@Param('slug') slug: string) {
    return this.registrationService.getInstitutionInfo(slug);
  }

  @Post(':slug/student')
  @RateLimit(5, 60 * 60 * 1000) // 5 per hour
  async registerStudent(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(StudentRegistrationSchema)) dto: StudentRegistrationDto,
  ) {
    return this.registrationService.submitStudentRegistration(slug, dto);
  }

  @Post(':slug/tutor')
  @RateLimit(5, 60 * 60 * 1000) // 5 per hour
  async registerTutor(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(TutorRegistrationSchema)) dto: TutorRegistrationDto,
  ) {
    return this.registrationService.submitTutorRegistration(slug, dto);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/registration/register.controller.ts
git commit -m "feat(backend): add public RegisterController for form submissions"
```

---

## Task 6: Admin Registration Controller

**Files:**
- Create: `sinaloka-backend/src/modules/registration/registration.controller.ts`

- [ ] **Step 1: Create admin controller**

Route: `admin/registrations`. `@Roles(Role.SUPER_ADMIN, Role.ADMIN)`.

Endpoints (in this order — `count` BEFORE `:id`):
- `GET /` — `findAll(institutionId, query)`
- `GET /count` — `getPendingCount(institutionId)`
- `GET /:id` — `findOne(institutionId, id)`
- `PATCH /:id/approve` — `approve(institutionId, id, userId)`
- `PATCH /:id/reject` — `reject(institutionId, id, userId, dto)`

- [ ] **Step 2: Commit**

```bash
git add src/modules/registration/registration.controller.ts
git commit -m "feat(backend): add admin RegistrationController with approve/reject"
```

---

## Task 7: Registration Module & App Integration

**Files:**
- Create: `sinaloka-backend/src/modules/registration/registration.module.ts`
- Modify: `sinaloka-backend/src/app.module.ts`

- [ ] **Step 1: Create module**

Import `InvitationModule` (for `InvitationService`). Register both controllers and service.

```ts
import { Module } from '@nestjs/common';
import { RegistrationController } from './registration.controller.js';
import { RegisterController } from './register.controller.js';
import { RegistrationService } from './registration.service.js';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard.js';
import { InvitationModule } from '../invitation/invitation.module.js';

@Module({
  imports: [InvitationModule],
  controllers: [RegistrationController, RegisterController],
  providers: [RegistrationService, RateLimitGuard],
})
export class RegistrationModule {}
```

- [ ] **Step 2: Register in app.module.ts**

Add `RegistrationModule` to imports.

- [ ] **Step 3: Commit**

```bash
git add src/modules/registration/ src/app.module.ts
git commit -m "feat(backend): register RegistrationModule in app"
```

---

## Task 8: Registration Settings

**Files:**
- Modify: `sinaloka-backend/src/modules/settings/settings.service.ts`
- Modify: `sinaloka-backend/src/modules/settings/settings.controller.ts`
- Modify: `sinaloka-backend/src/modules/settings/settings.dto.ts`

- [ ] **Step 1: Add settings DTO**

In `settings.dto.ts`, add:

```ts
export const UpdateRegistrationSettingsSchema = z.object({
  student_enabled: z.boolean().optional(),
  tutor_enabled: z.boolean().optional(),
});

export type UpdateRegistrationSettingsDto = z.infer<typeof UpdateRegistrationSettingsSchema>;
```

- [ ] **Step 2: Add settings service methods**

In `settings.service.ts`, add `REGISTRATION_DEFAULTS`:

```ts
const REGISTRATION_DEFAULTS = {
  student_enabled: false,
  tutor_enabled: false,
};
```

Add `getRegistration(institutionId)` and `updateRegistration(institutionId, dto)` methods following the same pattern as `getBilling`/`updateBilling`.

- [ ] **Step 3: Add settings controller endpoints**

In `settings.controller.ts`, add `GET registration` and `PATCH registration` endpoints.

- [ ] **Step 4: Verify backend compiles**

```bash
cd sinaloka-backend && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/modules/settings/
git commit -m "feat(backend): add registration settings (student/tutor enabled toggles)"
```

---

## Task 9: Landing — Dependencies & Routing Setup

**Files:**
- Modify: `sinaloka-landing/package.json`
- Create: `sinaloka-landing/public/_redirects`
- Modify: `sinaloka-landing/src/main.tsx`
- Modify: `sinaloka-landing/src/App.tsx`
- Create: `sinaloka-landing/src/pages/LandingPage.tsx`
- Create: `sinaloka-landing/src/lib/api.ts`

- [ ] **Step 1: Install dependencies**

```bash
cd sinaloka-landing && npm install react-router-dom axios
```

- [ ] **Step 2: Create `_redirects` for Cloudflare SPA routing**

Create `sinaloka-landing/public/_redirects`:

```
/* /index.html 200
```

- [ ] **Step 3: Create Axios instance**

Create `sinaloka-landing/src/lib/api.ts`:

```ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

export default api;
```

- [ ] **Step 4: Extract existing landing content to LandingPage**

Create `sinaloka-landing/src/pages/LandingPage.tsx` with the current `App.tsx` content (all the sections: Navbar, Hero, ProblemSection, etc.).

- [ ] **Step 5: Update App.tsx with Router**

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import RegisterPage from './pages/RegisterPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register/:slug" element={<RegisterPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 6: Update main.tsx** (remove BrowserRouter if added here, keep StrictMode)

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat(landing): add react-router, axios, SPA routing setup, extract LandingPage"
```

---

## Task 10: Landing — Registration Form Page

**Files:**
- Create: `sinaloka-landing/src/pages/RegisterPage.tsx`

- [ ] **Step 1: Create RegisterPage component**

The page:
1. Reads `:slug` from URL params
2. Calls `GET /api/register/:slug` on mount
3. Shows loading skeleton → then either:
   - 404 if institution not found
   - "Pendaftaran sedang ditutup" if both toggles off
   - Role selection cards (if both enabled) or direct form (if only one enabled)
4. Student form: name*, grade*, parent_name*, parent_phone*, email?, phone?, parent_email?
5. Tutor form: name*, email*, phone?, subject_names* (comma-separated input or tag-style), experience_years?
6. Submit → POST to API → success message or error (duplicate, rate limit)

Use existing TailwindCSS classes and Motion for animations. Style consistent with landing site aesthetic (Plus Jakarta Sans font, accent/teal colors).

- [ ] **Step 2: Verify landing builds**

```bash
cd sinaloka-landing && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/RegisterPage.tsx
git commit -m "feat(landing): add public registration form page with student and tutor forms"
```

---

## Task 11: Platform — Types, Service, Hooks

**Files:**
- Create: `sinaloka-platform/src/types/registration.ts`
- Create: `sinaloka-platform/src/services/registration.service.ts`
- Create: `sinaloka-platform/src/hooks/useRegistrations.ts`

- [ ] **Step 1: Create types**

```ts
export type RegistrationType = 'STUDENT' | 'TUTOR';
export type RegistrationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Registration {
  id: string;
  institution_id: string;
  type: RegistrationType;
  status: RegistrationStatus;
  name: string;
  email: string | null;
  phone: string | null;
  grade: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  parent_email: string | null;
  subject_names: string[];
  experience_years: number | null;
  rejected_reason: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RegistrationSettings {
  student_enabled: boolean;
  tutor_enabled: boolean;
}
```

- [ ] **Step 2: Create service**

Methods: `getRegistrations(params)`, `getRegistration(id)`, `getPendingCount()`, `approveRegistration(id)`, `rejectRegistration(id, reason?)`, `getRegistrationSettings()`, `updateRegistrationSettings(data)`.

- [ ] **Step 3: Create hooks**

`useRegistrations(params)`, `useRegistration(id)`, `usePendingRegistrationCount()`, `useApproveRegistration()`, `useRejectRegistration()`, `useRegistrationSettings()`, `useUpdateRegistrationSettings()`.

- [ ] **Step 4: Commit**

```bash
cd sinaloka-platform
git add src/types/registration.ts src/services/registration.service.ts src/hooks/useRegistrations.ts
git commit -m "feat(platform): add registration types, service, and hooks"
```

---

## Task 12: Platform — i18n Strings

**Files:**
- Modify: `sinaloka-platform/src/locales/en.json`
- Modify: `sinaloka-platform/src/locales/id.json`

- [ ] **Step 1: Add registration strings**

Add `"registration"` key to both locale files with all strings from the spec:

English: title, student, tutor, pending, approved, rejected, approve, reject, approveStudentConfirm, approveTutorConfirm, rejectReason, noRegistrations, submitted, closed, alreadyRegistered, settings, studentEnabled, tutorEnabled, copyLink, linkCopied.

Indonesian: Pendaftaran, Murid, Tutor, Menunggu, Disetujui, Ditolak, Setujui, Tolak, etc.

Also add `"nav.registrations"` key for sidebar.

- [ ] **Step 2: Commit**

```bash
git add src/locales/
git commit -m "feat(platform): add registration i18n strings"
```

---

## Task 13: Platform — Registrations Page

**Files:**
- Create: `sinaloka-platform/src/pages/Registrations.tsx`
- Modify: `sinaloka-platform/src/App.tsx`
- Modify: `sinaloka-platform/src/components/Layout.tsx`

- [ ] **Step 1: Create Registrations page**

Page with:
- PageHeader: "Pendaftaran"
- Tab filters: Semua / Murid / Tutor
- Status filters: Pending / Approved / Rejected
- Table: Name, Type badge, Email/Phone, Date, Status badge, Actions
- Approve modal (confirm text varies by type)
- Reject modal with textarea
- Uses `useRegistrations()`, `useApproveRegistration()`, `useRejectRegistration()`
- Error handling for plan limit reached and email already exists

- [ ] **Step 2: Add route in App.tsx**

```tsx
import { Registrations } from './pages/Registrations';
// Add inside Layout routes:
<Route path="/registrations" element={<Registrations />} />
```

- [ ] **Step 3: Add sidebar nav item in Layout.tsx**

Add a "Pendaftaran" nav item with ClipboardList icon in the "Academics" section (after Enrollments or as a new section). Include pending count badge using `usePendingRegistrationCount()`.

Import `ClipboardList` from `lucide-react`.

**Note:** The existing `SidebarItem` component does not support a badge prop. Either extend it with an optional `badge?: number` prop, or create a custom inline nav entry for Pendaftaran that includes the badge count.

- [ ] **Step 4: Verify frontend builds**

```bash
cd sinaloka-platform && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/Registrations.tsx src/App.tsx src/components/Layout.tsx
git commit -m "feat(platform): add Registrations page with approve/reject and sidebar nav"
```

---

## Task 14: Platform — Registration Settings Tab

**Files:**
- Create: `sinaloka-platform/src/pages/Settings/tabs/RegistrationTab.tsx`
- Modify: `sinaloka-platform/src/pages/Settings/index.tsx`

**Requires:** Task 11 hooks to be complete.

- [ ] **Step 1: Create RegistrationTab component and add to Settings**

Create `RegistrationTab.tsx` following the pattern of existing tabs (`BillingTab.tsx`, `GeneralTab.tsx`). Add a new tab/section "Pendaftaran" with:
- Toggle: "Buka pendaftaran murid" (student_enabled)
- Toggle: "Buka pendaftaran tutor" (tutor_enabled)
- Preview link: `sinaloka.com/register/<slug>` with copy button
- Uses `useRegistrationSettings()` and `useUpdateRegistrationSettings()`

Follow existing Settings tab pattern (scroll-spy sections).

- [ ] **Step 2: Commit**

```bash
git add src/pages/Settings/
git commit -m "feat(platform): add registration settings toggle with link preview"
```

---

## Task 15: Build Verification

**Files:** None (verification only)

- [ ] **Step 1: Backend build**

```bash
cd sinaloka-backend && npm run build
```

- [ ] **Step 2: Platform build**

```bash
cd sinaloka-platform && npm run build
```

- [ ] **Step 3: Landing build**

```bash
cd sinaloka-landing && npm run build
```

- [ ] **Step 4: Commit fixes if needed**

```bash
git add -A
git commit -m "fix: resolve build issues from registration form implementation"
```

---

## Task 16: Deployment Configuration

**Files:** None (environment/config changes)

- [ ] **Step 1: CORS — Add landing site origin**

On Railway, add `https://sinaloka.com` and `https://www.sinaloka.com` to `CORS_ORIGINS` environment variable (comma-separated with existing origins).

- [ ] **Step 2: Landing site `VITE_API_URL`**

Add `VITE_API_URL=https://api.sinaloka.com` as a build variable in the landing site's deploy pipeline (GitHub Actions or Cloudflare Pages build settings). Without this, the production landing form will call `localhost:5000`.

- [ ] **Step 3: Verify `_redirects` is deployed**

After deploy, verify direct access to `https://sinaloka.com/register/test-slug` returns the SPA (not a 404). The `public/_redirects` file must be present in the build output.
