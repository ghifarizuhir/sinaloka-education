# Tutor Invitation System — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace admin-set-password tutor creation with an email invitation flow using Resend, where tutors accept and set their own password via the tutor portal.

**Architecture:** New `Invitation` Prisma model + `InvitationModule` (public endpoints) + `EmailModule` (Resend). Admin invites via TutorController, tutor accepts via InvitationController. Tutor portal gets React Router + AcceptInvitePage.

**Tech Stack:** NestJS, Prisma, Resend, React, React Router, TanStack Query, Zod

**Spec:** `docs/superpowers/specs/2026-03-15-tutor-invitation-system-design.md`

---

## Chunk 1: Database Schema & Migration (Tasks 1–2)

### Task 1: Make password_hash Nullable + Add Invitation Model

**Files:**
- Modify: `sinaloka-backend/prisma/schema.prisma`

- [ ] **Step 1: Make password_hash nullable**

In the `User` model, change:
```prisma
password_hash String
```
to:
```prisma
password_hash String?
```

- [ ] **Step 2: Add InvitationStatus enum and Invitation model**

Add after the existing enums:

```prisma
enum InvitationStatus {
  PENDING
  ACCEPTED
  EXPIRED
  CANCELLED
}

model Invitation {
  id             String           @id @default(uuid())
  email          String
  token          String           @unique
  institution_id String
  institution    Institution      @relation(fields: [institution_id], references: [id])
  tutor_id       String
  tutor          Tutor            @relation(fields: [tutor_id], references: [id], onDelete: Cascade)
  status         InvitationStatus @default(PENDING)
  expires_at     DateTime
  created_at     DateTime         @default(now())
  updated_at     DateTime         @updatedAt

  @@map("invitations")
}
```

- [ ] **Step 3: Add relation fields to existing models**

In the `Institution` model, add:
```prisma
invitations Invitation[]
```

In the `Tutor` model, add:
```prisma
invitation Invitation?
```

- [ ] **Step 4: Run migration**

```bash
cd sinaloka-backend && npx prisma migrate dev --name add-invitation-model
```

- [ ] **Step 5: Regenerate Prisma client**

```bash
cd sinaloka-backend && npm run prisma:generate
```

- [ ] **Step 6: Commit**

```bash
git add sinaloka-backend/prisma/
git commit -m "feat(db): add Invitation model and make password_hash nullable"
```

---

### Task 2: Guard Auth Login Against Null password_hash

**Files:**
- Modify: `sinaloka-backend/src/modules/auth/auth.service.ts`

- [ ] **Step 1: Add null password_hash guard in login method**

In `AuthService.login()`, after finding the user by email and BEFORE the `is_active` check, add:

```ts
if (!user.password_hash) {
  throw new UnauthorizedException('Please accept your invitation first');
}
```

This must come BEFORE the existing `!user.is_active` check (line 40), because invited tutors have `is_active: false` AND `password_hash: null`. Without this ordering, they'd see the generic "User account is inactive" message instead of the invitation-specific one.

- [ ] **Step 2: Run existing auth tests**

```bash
cd sinaloka-backend && npm run test -- --testPathPattern=auth
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-backend/src/modules/auth/auth.service.ts
git commit -m "fix(auth): guard login against null password_hash for invited tutors"
```

---

## Chunk 2: Email Module (Task 3)

### Task 3: Create Email Module with Resend

**Files:**
- Create: `sinaloka-backend/src/modules/email/email.module.ts`
- Create: `sinaloka-backend/src/modules/email/email.service.ts`
- Modify: `sinaloka-backend/src/app.module.ts`
- Modify: `sinaloka-backend/.env.example`
- Modify: `sinaloka-backend/package.json`

- [ ] **Step 1: Install Resend**

```bash
cd sinaloka-backend && npm install resend
```

- [ ] **Step 2: Add env vars to .env.example**

Append:
```
RESEND_API_KEY=
TUTOR_PORTAL_URL=http://localhost:5173
EMAIL_FROM=Sinaloka <noreply@sinaloka.com>
```

- [ ] **Step 3: Create email.service.ts**

```ts
// sinaloka-backend/src/modules/email/email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly from: string;
  private readonly tutorPortalUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
    this.from = this.configService.get<string>('EMAIL_FROM') || 'Sinaloka <noreply@sinaloka.com>';
    this.tutorPortalUrl = this.configService.get<string>('TUTOR_PORTAL_URL') || 'http://localhost:5173';
  }

  async sendTutorInvitation(params: {
    to: string;
    tutorName: string;
    institutionName: string;
    inviteToken: string;
  }): Promise<{ success: boolean; error?: string }> {
    const inviteUrl = `${this.tutorPortalUrl}/accept-invite?token=${params.inviteToken}`;

    try {
      await this.resend.emails.send({
        from: this.from,
        to: params.to,
        subject: `You're invited to join ${params.institutionName} as a tutor`,
        html: this.buildInvitationHtml({
          tutorName: params.tutorName,
          institutionName: params.institutionName,
          inviteUrl,
        }),
      });
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send invitation email to ${params.to}`, error);
      return { success: false, error: 'Failed to send email' };
    }
  }

  private buildInvitationHtml(params: {
    tutorName: string;
    institutionName: string;
    inviteUrl: string;
  }): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #18181b;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 24px; font-weight: 700; margin: 0;">${params.institutionName}</h1>
  </div>
  <p style="font-size: 16px; line-height: 1.6;">Hi ${params.tutorName},</p>
  <p style="font-size: 16px; line-height: 1.6;">You've been invited to join <strong>${params.institutionName}</strong> as a tutor. Click the button below to set up your account.</p>
  <div style="text-align: center; margin: 32px 0;">
    <a href="${params.inviteUrl}" style="display: inline-block; background: #18181b; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Accept Invitation</a>
  </div>
  <p style="font-size: 14px; color: #71717a; line-height: 1.5;">This link expires in 48 hours. If you didn't expect this invitation, you can safely ignore this email.</p>
</body>
</html>`;
  }
}
```

- [ ] **Step 4: Create email.module.ts**

```ts
// sinaloka-backend/src/modules/email/email.module.ts
import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service.js';

@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
```

- [ ] **Step 5: Register EmailModule in app.module.ts**

Add `EmailModule` to the `imports` array in `sinaloka-backend/src/app.module.ts`.

- [ ] **Step 6: Commit**

```bash
git add sinaloka-backend/src/modules/email/ sinaloka-backend/src/app.module.ts sinaloka-backend/.env.example sinaloka-backend/package.json sinaloka-backend/package-lock.json
git commit -m "feat(email): add EmailModule with Resend integration for tutor invitations"
```

---

## Chunk 3: Invitation Module — Backend (Tasks 4–5)

### Task 4: Create Invitation Module (DTOs, Service, Controller)

**Files:**
- Create: `sinaloka-backend/src/modules/invitation/invitation.module.ts`
- Create: `sinaloka-backend/src/modules/invitation/invitation.service.ts`
- Create: `sinaloka-backend/src/modules/invitation/invitation.controller.ts`
- Create: `sinaloka-backend/src/modules/invitation/invitation.dto.ts`
- Modify: `sinaloka-backend/src/app.module.ts`

- [ ] **Step 1: Create invitation.dto.ts**

```ts
// sinaloka-backend/src/modules/invitation/invitation.dto.ts
import { z } from 'zod';

export const InviteTutorSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255).optional(),
  subjects: z.array(z.string().min(1)).min(1),
  experience_years: z.number().int().min(0).default(0),
});

export type InviteTutorDto = z.infer<typeof InviteTutorSchema>;

export const AcceptInviteSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(255).optional(),
  bank_name: z.string().max(255).optional(),
  bank_account_number: z.string().max(50).optional(),
  bank_account_holder: z.string().max(255).optional(),
});

export type AcceptInviteDto = z.infer<typeof AcceptInviteSchema>;
```

This follows the same pattern as `tutor.dto.ts` — plain Zod schemas with inferred types, validated via `ZodValidationPipe` in the controller.

- [ ] **Step 2: Create invitation.service.ts**

```ts
// sinaloka-backend/src/modules/invitation/invitation.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  GoneException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { EmailService } from '../email/email.service.js';
import { InviteTutorDto, AcceptInviteDto } from './invitation.dto.js';

@Injectable()
export class InvitationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async invite(institutionId: string, dto: InviteTutorDto) {
    // Check email uniqueness
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const token = randomBytes(32).toString('hex');
    const name = dto.name || dto.email.split('@')[0];

    // Create User + Tutor + Invitation in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          password_hash: null,
          name,
          role: 'TUTOR',
          institution_id: institutionId,
          is_active: false,
        },
      });

      const tutor = await tx.tutor.create({
        data: {
          user_id: user.id,
          institution_id: institutionId,
          subjects: dto.subjects,
          experience_years: dto.experience_years ?? 0,
          is_verified: false,
        },
      });

      const invitation = await tx.invitation.create({
        data: {
          email: dto.email,
          token,
          institution_id: institutionId,
          tutor_id: tutor.id,
          expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000),
        },
      });

      return { user, tutor, invitation };
    });

    // Send email (outside transaction — if fails, admin can resend)
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
    });

    const emailResult = await this.email.sendTutorInvitation({
      to: dto.email,
      tutorName: name,
      institutionName: institution?.name || 'Sinaloka',
      inviteToken: token,
    });

    return {
      ...result,
      email_sent: emailResult.success,
      email_error: emailResult.error,
    };
  }

  async resendInvite(institutionId: string, tutorId: string) {
    const tutor = await this.prisma.tutor.findFirst({
      where: { id: tutorId, institution_id: institutionId },
      include: { user: true, invitation: true },
    });

    if (!tutor) throw new NotFoundException('Tutor not found');
    if (tutor.user.is_active) throw new BadRequestException('This tutor is already active');
    if (!tutor.invitation) throw new NotFoundException('No invitation found for this tutor');

    const newToken = randomBytes(32).toString('hex');

    await this.prisma.invitation.update({
      where: { id: tutor.invitation.id },
      data: {
        token: newToken,
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000),
        status: 'PENDING',
      },
    });

    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
    });

    const emailResult = await this.email.sendTutorInvitation({
      to: tutor.invitation.email,
      tutorName: tutor.user.name,
      institutionName: institution?.name || 'Sinaloka',
      inviteToken: newToken,
    });

    return { email_sent: emailResult.success, email_error: emailResult.error };
  }

  async cancelInvite(institutionId: string, tutorId: string) {
    const tutor = await this.prisma.tutor.findFirst({
      where: { id: tutorId, institution_id: institutionId },
      include: { user: true },
    });

    if (!tutor) throw new NotFoundException('Tutor not found');
    if (tutor.user.is_active) throw new BadRequestException('This tutor is already active');

    // Delete in order: invitation → tutor → refresh tokens → user
    // (no onDelete: Cascade on Tutor→User, matching existing TutorService.delete pattern)
    await this.prisma.$transaction(async (tx) => {
      await tx.invitation.deleteMany({ where: { tutor_id: tutor.id } });
      await tx.tutor.delete({ where: { id: tutor.id } });
      await tx.refreshToken.deleteMany({ where: { user_id: tutor.user_id } });
      await tx.user.delete({ where: { id: tutor.user_id } });
    });

    return { deleted: true };
  }

  async validateToken(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: {
        institution: { select: { name: true, id: true } },
        tutor: { include: { user: { select: { name: true } } } },
      },
    });

    if (!invitation) throw new NotFoundException('Invalid invitation link');

    if (invitation.status === 'ACCEPTED') {
      throw new ConflictException('This invitation has already been accepted');
    }

    if (invitation.status === 'CANCELLED') {
      throw new GoneException('This invitation was cancelled');
    }

    // Validate institution is still active (spec requirement)
    if (!invitation.institution) {
      throw new ForbiddenException('This institution is no longer active');
    }

    if (invitation.expires_at < new Date() || invitation.status === 'EXPIRED') {
      // Auto-update status if expired by time
      if (invitation.status !== 'EXPIRED') {
        await this.prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: 'EXPIRED' },
        });
      }
      throw new GoneException('Invitation expired — contact your admin to resend');
    }

    return {
      email: invitation.email,
      name: invitation.tutor.user.name,
      institution_name: invitation.institution.name,
      expires_at: invitation.expires_at,
    };
  }

  async acceptInvite(dto: AcceptInviteDto) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token: dto.token },
      include: {
        tutor: { include: { user: true } },
        institution: true,
      },
    });

    if (!invitation) throw new NotFoundException('Invalid invitation link');
    if (invitation.status === 'ACCEPTED') throw new ConflictException('Already accepted');
    if (invitation.status === 'CANCELLED') throw new GoneException('Invitation cancelled');
    if (invitation.expires_at < new Date()) throw new GoneException('Invitation expired');
    if (!invitation.institution) throw new ForbiddenException('This institution is no longer active');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    await this.prisma.$transaction(async (tx) => {
      // Activate user and set password
      await tx.user.update({
        where: { id: invitation.tutor.user_id },
        data: {
          password_hash: passwordHash,
          is_active: true,
          ...(dto.name ? { name: dto.name } : {}),
        },
      });

      // Update tutor bank details if provided
      const tutorUpdate: Record<string, string> = {};
      if (dto.bank_name) tutorUpdate.bank_name = dto.bank_name;
      if (dto.bank_account_number) tutorUpdate.bank_account_number = dto.bank_account_number;
      if (dto.bank_account_holder) tutorUpdate.bank_account_holder = dto.bank_account_holder;

      if (Object.keys(tutorUpdate).length > 0) {
        await tx.tutor.update({
          where: { id: invitation.tutor_id },
          data: tutorUpdate,
        });
      }

      // Mark invitation as accepted
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      });
    });

    return { success: true };
  }
}
```

- [ ] **Step 3: Create invitation.controller.ts**

```ts
// sinaloka-backend/src/modules/invitation/invitation.controller.ts
import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { InvitationService } from './invitation.service.js';
import { AcceptInviteSchema, type AcceptInviteDto } from './invitation.dto.js';

@Controller('invitation')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Public()
  @Get(':token')
  async validateToken(@Param('token') token: string) {
    return this.invitationService.validateToken(token);
  }

  @Public()
  @Post('accept')
  async acceptInvite(
    @Body(new ZodValidationPipe(AcceptInviteSchema)) dto: AcceptInviteDto,
  ) {
    return this.invitationService.acceptInvite(dto);
  }
}
```

**Note:** The spec has an internal inconsistency — the endpoint table says `/api/invitation/:token` but the data flow section references `/api/auth/invitation/{token}`. This plan uses `/api/invitation/` (the endpoint table version), which keeps invitation logic out of the auth module.

- [ ] **Step 4: Create invitation.module.ts**

```ts
// sinaloka-backend/src/modules/invitation/invitation.module.ts
import { Module } from '@nestjs/common';
import { InvitationController } from './invitation.controller.js';
import { InvitationService } from './invitation.service.js';

@Module({
  controllers: [InvitationController],
  providers: [InvitationService],
  exports: [InvitationService],
})
export class InvitationModule {}
```

- [ ] **Step 5: Register InvitationModule in app.module.ts**

Add `InvitationModule` to the `imports` array in `sinaloka-backend/src/app.module.ts`.

- [ ] **Step 6: Commit**

```bash
git add sinaloka-backend/src/modules/invitation/ sinaloka-backend/src/app.module.ts
git commit -m "feat(invitation): add InvitationModule with service, controller, and DTOs"
```

---

### Task 5: Add Invite/Resend/Cancel Endpoints to TutorController

**Files:**
- Modify: `sinaloka-backend/src/modules/tutor/tutor.controller.ts`
- Modify: `sinaloka-backend/src/modules/tutor/tutor.module.ts`

- [ ] **Step 1: Import InvitationModule in TutorModule**

In `sinaloka-backend/src/modules/tutor/tutor.module.ts`, add `InvitationModule` to imports so `InvitationService` is available.

- [ ] **Step 2: Add invite, resend, cancel endpoints to TutorController**

Add these methods to the existing `TutorController`:

```ts
import { InvitationService } from '../invitation/invitation.service.js';
import { InviteTutorSchema, type InviteTutorDto } from '../invitation/invitation.dto.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

// In the constructor, add InvitationService:
constructor(
  private readonly tutorService: TutorService,
  private readonly invitationService: InvitationService,
) {}

// New endpoints (add BEFORE the :id routes to prevent route conflicts):

@Post('invite')
async invite(
  @CurrentUser() user: JwtPayload,
  @Body(new ZodValidationPipe(InviteTutorSchema)) dto: InviteTutorDto,
) {
  return this.invitationService.invite(user.institutionId!, dto);
}

@Post(':id/resend-invite')
async resendInvite(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
  return this.invitationService.resendInvite(user.institutionId!, id);
}

@Post(':id/cancel-invite')
async cancelInvite(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
  return this.invitationService.cancelInvite(user.institutionId!, id);
}
```

Note: `@Roles` is already applied at class level on TutorController, so no need to repeat on each method.

**IMPORTANT:** Place the `invite` route BEFORE any `@Get(':id')` or `@Patch(':id')` routes, otherwise NestJS will treat "invite" as an `:id` parameter.

- [ ] **Step 3: Verify backend compiles**

```bash
cd sinaloka-backend && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/modules/tutor/
git commit -m "feat(tutor): add invite, resend-invite, cancel-invite endpoints"
```

---

## Chunk 4: Admin Platform Changes (Tasks 6–7)

### Task 6: Add Invitation Service Methods to Platform

**Files:**
- Modify: `sinaloka-platform/src/services/tutors.service.ts`
- Modify: `sinaloka-platform/src/hooks/useTutors.ts`

- [ ] **Step 1: Add invite, resendInvite, cancelInvite to tutorsService**

In `sinaloka-platform/src/services/tutors.service.ts`, add:

```ts
invite: (data: { email: string; name?: string; subjects: string[]; experience_years?: number }) =>
  api.post<any>('/api/admin/tutors/invite', data).then((r) => r.data),
resendInvite: (id: string) =>
  api.post<any>(`/api/admin/tutors/${id}/resend-invite`).then((r) => r.data),
cancelInvite: (id: string) =>
  api.post<any>(`/api/admin/tutors/${id}/cancel-invite`).then((r) => r.data),
```

- [ ] **Step 2: Add mutation hooks in useTutors.ts**

```ts
export function useInviteTutor() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: tutorsService.invite, onSuccess: () => qc.invalidateQueries({ queryKey: ['tutors'] }) });
}
export function useResendInvite() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: tutorsService.resendInvite, onSuccess: () => qc.invalidateQueries({ queryKey: ['tutors'] }) });
}
export function useCancelInvite() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: tutorsService.cancelInvite, onSuccess: () => qc.invalidateQueries({ queryKey: ['tutors'] }) });
}
```

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/services/tutors.service.ts sinaloka-platform/src/hooks/useTutors.ts
git commit -m "feat(platform): add invitation service methods and hooks"
```

---

### Task 7: Update Tutors Page UI for Invitations

**Files:**
- Modify: `sinaloka-platform/src/pages/Tutors.tsx`

- [ ] **Step 1: Import new hooks and icons**

Add imports:
```ts
import { useInviteTutor, useResendInvite, useCancelInvite } from '@/src/hooks/useTutors';
import { Mail } from 'lucide-react';  // if not already imported
```

- [ ] **Step 2: Add mutation hooks in component**

```ts
const inviteTutor = useInviteTutor();
const resendInvite = useResendInvite();
const cancelInvite = useCancelInvite();
```

- [ ] **Step 3: Modify TutorForm for invite mode**

When `isEditing` is false (creating new):
- Remove `password` field entirely
- Remove `rating` slider and `is_verified` toggle
- Keep: email, name, subjects, experience_years, bank details
- Change submit button text from "Register Tutor" to "Send Invitation"

- [ ] **Step 4: Change handleAddTutor to use invite**

Replace the `handleAddTutor` function:
```ts
const handleAddTutor = (data: any) => {
  inviteTutor.mutate(
    { email: data.email, name: data.name, subjects: data.subjects, experience_years: data.experience_years },
    {
      onSuccess: (result) => {
        if (result.email_sent) {
          toast.success('Invitation sent successfully');
        } else {
          toast.success('Tutor created but email failed to send. Use "Resend Invite" to try again.');
        }
        setShowForm(false);
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.message || 'Failed to send invitation';
        toast.error(msg);
      },
    }
  );
};
```

- [ ] **Step 5: Add resend and cancel handlers**

```ts
const handleResendInvite = (tutorId: string) => {
  resendInvite.mutate(tutorId, {
    onSuccess: (result) => {
      if (result.email_sent) toast.success('Invitation resent');
      else toast.success('Token refreshed but email failed. Try again.');
    },
    onError: () => toast.error('Failed to resend invitation'),
  });
};

const handleCancelInvite = (tutorId: string) => {
  if (!confirm('Cancel this invitation? The tutor record will be deleted.')) return;
  cancelInvite.mutate(tutorId, {
    onSuccess: () => toast.success('Invitation cancelled'),
    onError: () => toast.error('Failed to cancel invitation'),
  });
};
```

- [ ] **Step 6: Update tutor badge display**

Modify `getAvailabilityBadge` to check `user.is_active`:

```ts
const getAvailabilityBadge = (tutor: Tutor) => {
  const isActive = (tutor as any).user?.is_active !== false;
  if (!isActive) {
    return <Badge variant="warning" className="flex items-center gap-1"><Clock size={10} /> Pending Invite</Badge>;
  }
  if (!tutor.is_verified) {
    return <Badge variant="default" className="flex items-center gap-1"><XCircle size={10} /> Unverified</Badge>;
  }
  return <Badge variant="success" className="flex items-center gap-1"><CheckCircle2 size={10} /> Verified</Badge>;
};
```

- [ ] **Step 7: Update action menus for pending vs active tutors**

In the grid view card action menu, conditionally render based on `user.is_active`:

```tsx
{(tutor as any).user?.is_active === false ? (
  <>
    <button onClick={() => handleResendInvite(tutor.id)} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors">
      <Mail size={14} /> Resend Invite
    </button>
    <button onClick={() => handleCancelInvite(tutor.id)} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors text-rose-600">
      <XCircle size={14} /> Cancel Invite
    </button>
  </>
) : (
  <>
    <button onClick={() => { setEditingTutor(tutor); setShowForm(true); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors">
      <FileText size={14} /> Edit Profile
    </button>
    <button onClick={() => handleDeleteTutor(tutor.id)} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors text-rose-600">
      <XCircle size={14} /> Delete Tutor
    </button>
  </>
)}
```

Apply the same pattern to the list view row action.

- [ ] **Step 8: Verify the page loads correctly**

Start the dev server and navigate to the Tutors page. Verify:
- "Add Tutor" opens a form without password/rating/verified fields
- Submit button says "Send Invitation"

- [ ] **Step 9: Commit**

```bash
git add sinaloka-platform/src/pages/Tutors.tsx
git commit -m "feat(platform): update Tutors page with invitation flow and pending badges"
```

---

## Chunk 5: Tutor Portal Changes (Tasks 8–9)

### Task 8: Install React Router in Tutor Portal

**Files:**
- Modify: `sinaloka-tutors/package.json`
- Modify: `sinaloka-tutors/src/App.tsx`
- Modify: `sinaloka-tutors/src/main.tsx`

- [ ] **Step 1: Install react-router-dom**

```bash
cd sinaloka-tutors && npm install react-router-dom
```

- [ ] **Step 2: Wrap app with BrowserRouter in main.tsx**

In `sinaloka-tutors/src/main.tsx`, wrap the `<App />` with `<BrowserRouter>`:

```tsx
import { BrowserRouter } from 'react-router-dom';

// In the render:
<BrowserRouter>
  <App />
</BrowserRouter>
```

- [ ] **Step 3: Convert App.tsx to use Routes**

Replace the current conditional rendering (LoginPage vs main app) with React Router:

```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { AcceptInvitePage } from './pages/AcceptInvitePage';

// In the component return:
<Routes>
  <Route path="/accept-invite" element={<AcceptInvitePage />} />
  <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />} />
  <Route path="/*" element={isAuthenticated ? <MainApp /> : <Navigate to="/login" />} />
</Routes>
```

Extract the current authenticated app content into a `MainApp` component (or inline it). The existing tab-based navigation stays inside `MainApp` — only the top-level routing changes.

- [ ] **Step 4: Update LoginPage to use useNavigate**

If LoginPage currently relies on auth state to hide itself, update it to use `useNavigate()` to redirect after login:

```ts
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();
// After successful login:
navigate('/');
```

- [ ] **Step 5: Verify login still works**

Start the tutor dev server and verify:
- `/login` shows the login page
- After login, redirects to `/`
- Unauthenticated users redirect to `/login`

- [ ] **Step 6: Commit**

```bash
git add sinaloka-tutors/
git commit -m "feat(tutors): add React Router with /login and /accept-invite routes"
```

---

### Task 9: Create AcceptInvitePage

**Files:**
- Create: `sinaloka-tutors/src/pages/AcceptInvitePage.tsx`

- [ ] **Step 1: Create AcceptInvitePage component**

```tsx
// sinaloka-tutors/src/pages/AcceptInvitePage.tsx
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

// Use /api prefix — Vite proxy forwards to backend (matches existing api/client.ts pattern)
const API_URL = '';

interface InvitationInfo {
  email: string;
  name: string;
  institution_name: string;
  expires_at: string;
}

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    password: '',
    confirmPassword: '',
    name: '',
    bank_name: '',
    bank_account_number: '',
    bank_account_holder: '',
  });

  useEffect(() => {
    if (!token) { setError('No invitation token provided'); setLoading(false); return; }

    axios.get(`${API_URL}/api/invitation/${token}`)
      .then((res) => {
        setInvitation(res.data);
        setForm((prev) => ({ ...prev, name: res.data.name || '' }));
      })
      .catch((err) => {
        const status = err.response?.status;
        if (status === 409) { navigate('/login'); return; }
        setError(err.response?.data?.message || 'Invalid invitation link');
      })
      .finally(() => setLoading(false));
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }

    setSubmitting(true);
    setError('');

    try {
      await axios.post(`${API_URL}/api/invitation/accept`, {
        token,
        password: form.password,
        name: form.name || undefined,
        bank_name: form.bank_name || undefined,
        bank_account_number: form.bank_account_number || undefined,
        bank_account_holder: form.bank_account_holder || undefined,
      });
      navigate('/login?invited=true');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to accept invitation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-500">Validating invitation...</p>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold dark:text-zinc-100">{error}</h1>
          <p className="text-zinc-500 text-sm">Contact your administrator for a new invitation link.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 py-12">
      <div className="max-w-lg w-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold dark:text-zinc-100">Join {invitation?.institution_name}</h1>
          <p className="text-zinc-500 text-sm mt-2">Set up your tutor account for <strong>{invitation?.email}</strong></p>
        </div>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium dark:text-zinc-200">Full Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm dark:text-zinc-100"
              placeholder="Your full name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium dark:text-zinc-200">Password *</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm dark:text-zinc-100"
                placeholder="Min 8 characters"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium dark:text-zinc-200">Confirm Password *</label>
              <input
                type="password"
                required
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm dark:text-zinc-100"
                placeholder="Repeat password"
              />
            </div>
          </div>

          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-5">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">Bank Details (Optional)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input type="text" value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} className="h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm dark:text-zinc-100" placeholder="Bank name" />
              <input type="text" value={form.bank_account_number} onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })} className="h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm dark:text-zinc-100" placeholder="Account number" />
              <input type="text" value={form.bank_account_holder} onChange={(e) => setForm({ ...form, bank_account_holder: e.target.value })} className="h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm dark:text-zinc-100" placeholder="Account holder" />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-11 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg font-semibold text-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Setting up...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Handle ?invited=true on LoginPage**

In `LoginPage.tsx`, check for `?invited=true` query param and show a success toast or message:

```ts
import { useSearchParams } from 'react-router-dom';

const [searchParams] = useSearchParams();
useEffect(() => {
  if (searchParams.get('invited') === 'true') {
    // Show success message — either a toast or inline message
    setSuccessMessage('Account created! Please log in.');
  }
}, [searchParams]);
```

- [ ] **Step 3: Verify the full flow**

1. In the admin platform, invite a tutor with an email
2. Check the backend logs for the invitation token (or check the DB)
3. Navigate to `http://localhost:5173/accept-invite?token={token}`
4. Fill in the form and submit
5. Verify redirect to login page with success message
6. Login with the email and password you set

- [ ] **Step 4: Commit**

```bash
git add sinaloka-tutors/src/
git commit -m "feat(tutors): add AcceptInvitePage for tutor invitation acceptance"
```

---

## Summary

| Chunk | Tasks | Description |
|-------|-------|-------------|
| 1 | 1–2 | Database: Invitation model, nullable password_hash, auth guard |
| 2 | 3 | Email: Resend integration with EmailModule |
| 3 | 4–5 | Backend: InvitationModule + TutorController invite endpoints |
| 4 | 6–7 | Admin Platform: invite form, pending badges, resend/cancel |
| 5 | 8–9 | Tutor Portal: React Router + AcceptInvitePage |
