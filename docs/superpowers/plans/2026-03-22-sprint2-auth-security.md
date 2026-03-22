# Sprint 2: Auth & Security — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add SuperAdmin password reset for admin users, forgot password info on login page, and fix impersonation identity display.

**Architecture:** Backend extends existing `update` method to handle password reset with `must_change_password` flag and refresh token revocation. Frontend adds reset UI, login info panel, and fixes Dashboard institution name for impersonation.

**Tech Stack:** NestJS + Prisma + bcrypt (backend), React + TanStack Query + TailwindCSS + i18n (frontend)

**Spec:** `docs/superpowers/specs/2026-03-22-sprint2-auth-security-design.md`

---

## Task 1: Backend — Extend User Update for Password Reset

**Files:**
- Modify: `sinaloka-backend/src/modules/user/user.service.ts` (update method, lines 153-191)

- [ ] **Step 1: Add must_change_password + refresh token revocation when password is provided**

In `user.service.ts`, find the `update` method. After the existing password hashing block (lines 169-171):

```typescript
if (dto.password !== undefined) {
  data.password_hash = await bcrypt.hash(dto.password, 10);
}
```

Replace with:

```typescript
if (dto.password !== undefined) {
  data.password_hash = await bcrypt.hash(dto.password, 10);
  data.must_change_password = true;
}
```

Then, after the `this.prisma.user.update(...)` call, add refresh token revocation. Replace:

```typescript
return this.prisma.user.update({
  where: { id },
  data,
  select: {
    id: true,
    name: true,
    email: true,
    role: true,
    is_active: true,
    institution_id: true,
    created_at: true,
    updated_at: true,
  },
});
```

With:

```typescript
const updatedUser = await this.prisma.user.update({
  where: { id },
  data,
  select: {
    id: true,
    name: true,
    email: true,
    role: true,
    is_active: true,
    institution_id: true,
    created_at: true,
    updated_at: true,
  },
});

// Revoke all refresh tokens when password is reset — forces re-login on all devices
if (dto.password !== undefined) {
  await this.prisma.refreshToken.deleteMany({
    where: { user_id: id },
  });
}

return updatedUser;
```

- [ ] **Step 2: Build and verify**

Run: `cd sinaloka-backend && npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add sinaloka-backend/src/modules/user/user.service.ts
git commit -m "fix(backend): set must_change_password and revoke tokens on password reset"
```

---

## Task 2: Frontend — SuperAdmin Reset Password UI

**Files:**
- Modify: `sinaloka-platform/src/pages/SuperAdmin/Users.tsx`

- [ ] **Step 1: Add reset password state variables**

After the existing edit modal state (lines 53-58), add:

```typescript
const [resetPassword, setResetPassword] = useState('');
const [showResetConfirm, setShowResetConfirm] = useState(false);
```

- [ ] **Step 2: Add password validation logic**

After the state declarations, add validation helpers (same pattern as Settings > Security tab):

```typescript
const passwordChecks = {
  minLength: resetPassword.length >= 8,
  uppercase: /[A-Z]/.test(resetPassword),
  digit: /[0-9]/.test(resetPassword),
};
const isPasswordValid = passwordChecks.minLength && passwordChecks.uppercase && passwordChecks.digit;
```

- [ ] **Step 3: Add handleResetPassword function**

After the existing `handleEdit` function (line ~130), add:

```typescript
const handleResetPassword = async () => {
  if (!editUser || !isPasswordValid) return;
  try {
    await updateUser.mutateAsync({
      id: editUser.id,
      data: { password: resetPassword },
    });
    toast.success(t('superAdmin.toast.passwordReset', { defaultValue: 'Password reset successfully. Admin must change password on next login.' }));
    setResetPassword('');
    setShowResetConfirm(false);
  } catch {
    toast.error(t('superAdmin.toast.passwordResetError', { defaultValue: 'Failed to reset password' }));
  }
};
```

- [ ] **Step 4: Add Reset Password section to Edit Modal JSX**

In the Edit Admin Modal (line ~401), after the Active switch `</div>` (line ~426) and before the button row `<div className="flex justify-end gap-2 pt-2">` (line ~427), add:

```tsx
{/* Reset Password Section */}
<div className="border-t border-border pt-4 mt-4 space-y-3">
  <p className="text-sm font-medium text-foreground">{t('superAdmin.editUserModal.resetPassword', { defaultValue: 'Reset Password' })}</p>
  <div className="space-y-1.5">
    <PasswordInput
      placeholder={t('superAdmin.editUserModal.newPasswordPlaceholder', { defaultValue: 'New password' })}
      value={resetPassword}
      onChange={(e) => setResetPassword(e.target.value)}
    />
  </div>

  {resetPassword && (
    <div className="space-y-1 text-xs">
      <p className={passwordChecks.minLength ? 'text-emerald-600' : 'text-muted-foreground'}>
        {passwordChecks.minLength ? '✓' : '○'} {t('settings.security.minLength', { defaultValue: 'Minimum 8 characters' })}
      </p>
      <p className={passwordChecks.uppercase ? 'text-emerald-600' : 'text-muted-foreground'}>
        {passwordChecks.uppercase ? '✓' : '○'} {t('settings.security.uppercase', { defaultValue: 'At least 1 uppercase letter' })}
      </p>
      <p className={passwordChecks.digit ? 'text-emerald-600' : 'text-muted-foreground'}>
        {passwordChecks.digit ? '✓' : '○'} {t('settings.security.digit', { defaultValue: 'At least 1 digit' })}
      </p>
    </div>
  )}

  {!showResetConfirm ? (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => setShowResetConfirm(true)}
      disabled={!isPasswordValid || updateUser.isPending}
    >
      {t('superAdmin.editUserModal.resetPasswordBtn', { defaultValue: 'Reset Password' })}
    </Button>
  ) : (
    <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 space-y-2">
      <p className="text-sm text-amber-700 dark:text-amber-400">
        {t('superAdmin.editUserModal.resetPasswordConfirm', { defaultValue: 'Password will be reset. Admin must change it on next login.' })}
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setShowResetConfirm(false)}>
          {t('common.cancel')}
        </Button>
        <Button type="button" size="sm" onClick={handleResetPassword} disabled={updateUser.isPending}>
          {t('common.confirm', { defaultValue: 'Confirm' })}
        </Button>
      </div>
    </div>
  )}
</div>
```

- [ ] **Step 5: Reset state when modal opens/closes**

Note: `PasswordInput` is already imported via `'../../components/UI'` (line 19) — no additional import needed.

In the `openEditModal` function (line ~103), add after `setShowEditModal(true)`:

```typescript
setResetPassword('');
setShowResetConfirm(false);
```

Add the same resets in **both** close handlers:
- The modal `onClose` prop (line ~404): `onClose={() => { setShowEditModal(false); setEditUser(null); setResetPassword(''); setShowResetConfirm(false); }}`
- The Cancel button `onClick` (line ~431): same resets added

- [ ] **Step 6: Build and verify**

Run: `cd sinaloka-platform && npm run build`
Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add sinaloka-platform/src/pages/SuperAdmin/Users.tsx
git commit -m "feat(platform): add password reset UI in SuperAdmin edit user modal"
```

---

## Task 3: Frontend — Forgot Password Info on Login Page

**Files:**
- Modify: `sinaloka-platform/src/pages/Login.tsx`
- Modify: `sinaloka-platform/src/locales/en.json`
- Modify: `sinaloka-platform/src/locales/id.json`

- [ ] **Step 1: Add i18n keys**

In `sinaloka-platform/src/locales/en.json`, inside the `"login"` section (before the `"copyright"` key, after `"defaultError"`), add:

```json
"forgotPassword": "Forgot password?",
"forgotPasswordInfo": "Contact your system administrator to reset your password."
```

In `sinaloka-platform/src/locales/id.json`, same location:

```json
"forgotPassword": "Lupa kata sandi?",
"forgotPasswordInfo": "Hubungi administrator sistem Anda untuk mereset kata sandi."
```

- [ ] **Step 2: Add toggle state in Login.tsx**

In `Login.tsx`, after the existing state declarations (email, password, error, isSubmitting), add:

```typescript
const [showForgotInfo, setShowForgotInfo] = useState(false);
```

- [ ] **Step 3: Add forgot password link + info panel in JSX**

After the password field `</div>` (line ~95) and before the error block `{error && (` (line ~97), add:

```tsx
<div className="flex justify-end">
  <button
    type="button"
    onClick={() => setShowForgotInfo(prev => !prev)}
    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
  >
    {t('login.forgotPassword')}
  </button>
</div>

{showForgotInfo && (
  <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 px-4 py-3 flex items-start gap-2">
    <Info size={14} className="text-muted-foreground mt-0.5 shrink-0" />
    <p className="text-xs text-muted-foreground">
      {t('login.forgotPasswordInfo')}
    </p>
  </div>
)}
```

- [ ] **Step 4: Import Info icon if needed**

Check if `Info` is imported from lucide-react. If not, add it to the existing lucide imports.

- [ ] **Step 5: Build and verify**

Run: `cd sinaloka-platform && npm run build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add sinaloka-platform/src/pages/Login.tsx sinaloka-platform/src/locales/en.json sinaloka-platform/src/locales/id.json
git commit -m "feat(platform): add forgot password info link on login page"
```

---

## Task 4: Frontend — Impersonation Institution Name Fix

**Files:**
- Modify: `sinaloka-platform/src/pages/Dashboard.tsx`

- [ ] **Step 1: Fix institution name to use impersonated institution**

In `Dashboard.tsx`, find line ~69:

```typescript
const institutionName = auth?.user?.institution?.name ?? 'Dashboard';
```

Replace with:

```typescript
const institutionName = auth?.isImpersonating
  ? auth.impersonatedInstitution?.name ?? 'Dashboard'
  : auth?.user?.institution?.name ?? 'Dashboard';
```

- [ ] **Step 2: Build and verify**

Run: `cd sinaloka-platform && npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/src/pages/Dashboard.tsx
git commit -m "fix(platform): show impersonated institution name on dashboard"
```

---

## Task 5: Final Verification & PR

- [ ] **Step 1: Full build check**

```bash
cd sinaloka-backend && npm run build
cd ../sinaloka-platform && npm run build && npm run lint
```

Expected: Both apps build clean.

- [ ] **Step 2: Create PR**

```bash
gh pr create --title "feat: sprint 2 auth & security — password reset, forgot password, impersonation fix" --body "$(cat <<'EOF'
## Summary
- **SuperAdmin Password Reset**: admin users can have their password reset by SuperAdmin via Edit User modal. Sets `must_change_password = true` and revokes all refresh tokens (forces re-login). Includes live password validation checklist and confirmation dialog.
- **Forgot Password on Login**: added "Forgot password?" link that shows info panel directing admin to contact SuperAdmin. No automated reset flow — intentional security decision.
- **Impersonation Identity Fix**: Dashboard now shows impersonated institution name instead of SuperAdmin's own institution (which is null).

## Security considerations
- Password hashed with bcrypt (existing pattern)
- `must_change_password` set server-side only — not client-settable via DTO
- All refresh tokens revoked on password reset — forces re-login on all devices
- No automated password reset flow — admin must contact SuperAdmin directly

## Test plan
- [ ] SuperAdmin resets admin password → admin's sessions invalidated
- [ ] Admin logs in with new password → forced to change password (Security tab)
- [ ] Password validation: min 8 chars, 1 uppercase, 1 digit — all enforced client-side
- [ ] Confirm dialog appears before reset, toast on success
- [ ] Login page: "Forgot password?" link toggles info panel (ID/EN)
- [ ] Dashboard: impersonated institution name shows correctly
- [ ] Dashboard: normal admin sees their own institution name

Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
