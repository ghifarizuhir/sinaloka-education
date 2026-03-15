# Forgot Password Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add forgot password / reset password flow to sinaloka-tutors using Resend email.

**Architecture:** New Prisma model for reset tokens, 3 new public auth endpoints, 1 new email template, 2 new frontend pages, login page update.

**Tech Stack:** NestJS, Prisma, Resend, React, React Router

**Spec:** `docs/superpowers/specs/2026-03-16-tutor-forgot-password-design.md`

---

## Task 1: Add PasswordResetToken Prisma model

- Add model to `sinaloka-backend/prisma/schema.prisma`
- Add relation to User model
- Run `prisma db push`

## Task 2: Add backend DTOs, service methods, controller endpoints

- Add `ForgotPasswordSchema` and `ResetPasswordSchema` to `auth.dto.ts`
- Add `forgotPassword()`, `validateResetToken()`, `resetPassword()` to `auth.service.ts`
- Add 3 `@Public()` endpoints to `auth.controller.ts`
- Import EmailService in AuthModule

## Task 3: Add password reset email template

- Add `sendPasswordReset()` to `email.service.ts`

## Task 4: Add frontend pages + wire routes

- Create `ForgotPasswordPage.tsx`
- Create `ResetPasswordPage.tsx`
- Update `LoginPage.tsx` with "Lupa Password?" link and reset success message
- Add routes in `App.tsx`

## Task 5: Verify build + tests
