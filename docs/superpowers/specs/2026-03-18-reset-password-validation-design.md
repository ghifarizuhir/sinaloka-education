# Reset Password Validation & UX Improvements — Design Spec

> Date: 2026-03-18
> Scope: Improve forgot password UX in sinaloka-tutors and sinaloka-parent with email validation, secure messaging, and resend with cooldown
> Approach: Frontend-only changes (Approach B)

---

## Problem

The forgot password pages in both the tutor and parent apps have UX gaps:

1. No frontend email format validation beyond HTML5 `type="email"`
2. Success message says "Link reset password telah dikirim ke email kamu" — implies it was definitely sent, even if the email doesn't exist in the database
3. No way for users to verify they typed the right email
4. No resend option if the email doesn't arrive

The backend already implements secure email enumeration protection — it returns the same generic success response whether the email exists or not (auth.service.ts lines 214-250). No backend changes are needed.

## Design Decisions

- **No backend changes** — the `POST /api/auth/forgot-password` endpoint already handles everything correctly
- **Secure messaging** — success message uses "if registered" qualifier to be honest without leaking information
- **Email display on success** — shows the email the user typed so they can verify typos
- **Resend with cooldown** — 60-second timer prevents spam while allowing retry

---

## Changes (Applied to Both Apps)

### Files

| File | Change |
|------|--------|
| `sinaloka-tutors/src/pages/ForgotPasswordPage.tsx` | Add email validation, improve success screen, add resend with cooldown |
| `sinaloka-parent/src/pages/ForgotPasswordPage.tsx` | Same changes |

### 1. Email Format Validation (Before Submit)

Add a simple email regex check before calling the API:

```typescript
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
```

In `handleSubmit`, before the API call:
```typescript
if (!isValidEmail(email)) {
  setError('Format email tidak valid');
  setLoading(false);
  return;
}
```

### 2. Success Screen — Improved Messaging

Change the success message from:
```
Link reset password telah dikirim ke email kamu. Periksa inbox atau folder spam.
```

To (with the email displayed bold):
```
Jika {email} terdaftar, link reset password akan dikirim. Periksa inbox atau folder spam.
```

The `{email}` value comes from the component's existing `email` state variable, displayed in a `<strong>` tag.

### 3. Resend Button with 60-Second Cooldown

Add to the success screen:

**State:**
```typescript
const [cooldown, setCooldown] = useState(60);
```

**Countdown effect** (runs when `sent` becomes true):
```typescript
useEffect(() => {
  if (!sent) return;
  setCooldown(60);
  const interval = setInterval(() => {
    setCooldown((prev) => {
      if (prev <= 1) { clearInterval(interval); return 0; }
      return prev - 1;
    });
  }, 1000);
  return () => clearInterval(interval);
}, [sent]);
```

**Button UI:**
- During cooldown: disabled, shows "Kirim Ulang (45s)"
- After cooldown: enabled, shows "Kirim Ulang"
- On click: calls the same `handleSubmit` flow (re-sends POST with the same email)
- Resets cooldown to 60 on successful resend

**Resend handler:**
```typescript
const handleResend = async () => {
  setLoading(true);
  try {
    await axios.post('/api/auth/forgot-password', { email });
    setCooldown(60);
  } catch (err: any) {
    setError(err?.response?.data?.message || 'Terjadi kesalahan. Coba lagi.');
    setSent(false);
  } finally {
    setLoading(false);
  }
};
```

### 4. Differences Between Tutor and Parent Versions

| Aspect | Tutors | Parent |
|--------|--------|--------|
| Navigation back | `<Link to="/login">` (React Router) | `onBack` prop callback |
| Placeholder | "tutor@example.com" | "parent@example.com" |
| All other changes | Identical | Identical |

## Files NOT Changed

- `sinaloka-backend/` — no backend changes needed
- `sinaloka-platform/` — no forgot password page exists
- `ResetPasswordPage.tsx` in either app — not part of this scope
