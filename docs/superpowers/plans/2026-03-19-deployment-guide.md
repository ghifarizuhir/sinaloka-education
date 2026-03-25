# Deployment Guide & Auto-Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a comprehensive DEPLOYMENT.md guide and enable frontend auto-deploy to Cloudflare Pages via GitHub Actions.

**Architecture:** Write DEPLOYMENT.md in the repo root covering the full deployment lifecycle. Complete the existing `deploy-frontend.yml` workflow stubs with wrangler Cloudflare Pages deploy commands. Set up required GitHub secrets and variables.

**Tech Stack:** GitHub Actions, Cloudflare Wrangler CLI, Railway, Markdown

**Spec:** `docs/superpowers/specs/2026-03-19-deployment-guide-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `DEPLOYMENT.md` | Create | Comprehensive deployment guide |
| `.github/workflows/deploy-frontend.yml` | Modify | Replace stub deploy steps with wrangler commands |

### Manual setup (not files):
- GitHub Actions secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- GitHub Actions variables: `API_URL`, `PLATFORM_URL`, `TUTORS_URL`, `PARENT_URL`

---

## Task 1: Write DEPLOYMENT.md

**Files:**
- Create: `DEPLOYMENT.md`

- [ ] **Step 1: Create DEPLOYMENT.md**

Create `DEPLOYMENT.md` in the repo root with the following complete content:

```markdown
# Sinaloka Deployment Guide

This guide covers how to deploy the Sinaloka platform safely. It is written for both human developers and Claude Code.

## Architecture

| Service | Platform | URL | Auto-deploy |
|---------|----------|-----|-------------|
| Backend (NestJS) | Railway (Docker) | https://api.sinaloka.com | Push to master (Railway native) |
| Postgres | Railway | Internal only | N/A |
| Platform (React) | Cloudflare Pages | https://platform.sinaloka.com | Push to master (GitHub Actions) |
| Tutors (React) | Cloudflare Pages | https://tutors.sinaloka.com | Push to master (GitHub Actions) |
| Parent (React) | Cloudflare Pages | https://parent.sinaloka.com | Push to master (GitHub Actions) |

### How auto-deploy works

Push to `master` triggers deploys for changed apps only:

- **Backend:** Railway's native GitHub integration detects changes in `/sinaloka-backend`, builds the Docker image, runs `prisma migrate deploy`, starts the app, and checks `/api/health`. If healthcheck passes, the new deploy goes live. If it fails for 5 minutes, the deploy is rolled back automatically.
- **Frontends:** GitHub Actions (`deploy-frontend.yml`) detects changes per app directory, builds with `VITE_API_URL`, and deploys to Cloudflare Pages via `wrangler pages deploy`.
- **Path filters:** Only changes within an app's directory trigger its deploy. Docs, specs, and plans do NOT trigger deploys.

## Pre-Deployment Checklist

All CI checks must pass before merging to master. This is enforced by GitHub branch protection.

### Backend changes

- [ ] ESLint passes: `cd sinaloka-backend && npm run lint`
- [ ] Unit tests pass: `cd sinaloka-backend && npm run test -- --ci`
- [ ] Build succeeds: `cd sinaloka-backend && npm run build`
- [ ] If Prisma schema changed: migration created with `npx prisma migrate dev`
- [ ] If new env vars added: updated `.env.example` and noted in PR description

### Frontend changes

- [ ] TypeScript type check passes: `cd <app> && npm run lint`
- [ ] Build succeeds: `cd <app> && npm run build`
- [ ] No hardcoded `localhost` URLs in API calls

### All changes

- [ ] PR created with conventional commit title (e.g. `feat(backend): add billing`)
- [ ] CI checks pass (automated via GitHub Actions)
- [ ] Merge to master triggers auto-deploy

## Backend Deployment (Railway)

### Normal deploy flow

1. Create PR, CI passes, merge to master
2. Railway detects changes in `/sinaloka-backend`
3. Docker build: `npm ci` → `prisma generate` → `npm run build`
4. Deploy starts: `npx prisma migrate deploy` → `node dist/src/main`
5. Healthcheck at `/api/health` — if 200, deploy goes live
6. If healthcheck fails for 5 minutes, deploy is rolled back automatically

### Database migration safety

- Migrations run automatically on deploy via `prisma migrate deploy`
- Only applies pending migrations — never destructive
- If a migration fails, the deploy fails and the previous deployment stays live
- **Never run `prisma migrate reset` on production** — this destroys all data
- Always test migrations locally first: `npx prisma migrate dev`

### Fixing a failed migration

1. The deploy fails automatically — previous version stays live, no downtime
2. Check deploy logs in Railway dashboard or CLI: `railway logs`
3. Fix the migration SQL locally
4. If the database has a stuck migration state:
   ```bash
   # Get the public Postgres URL from Railway
   railway variables --service Postgres --kv | grep DATABASE_PUBLIC_URL
   # Mark the failed migration as rolled back
   DATABASE_URL="<public-url>" npx prisma migrate resolve --rolled-back <migration_name>
   ```
5. Push the fix to master, Railway auto-deploys

### Rollback

- **Railway dashboard:** Deployments tab → select previous successful deploy → Rollback
- Database migrations are NOT automatically rolled back — fix forward with a new migration

### Logs

- **CLI:** `railway logs` (must be linked to the service via `railway link`)
- **Dashboard:** sinaloka-backend service → Deployments → View logs
- For error filtering, use the Railway dashboard log viewer

## Frontend Deployment (Cloudflare Pages)

### Normal deploy flow

1. Create PR, CI passes, merge to master
2. GitHub Actions detects changes in the app directory
3. Builds with `VITE_API_URL` from GitHub Actions variables
4. Deploys via `npx wrangler pages deploy dist --project-name=<project>`
5. Live within seconds (CDN propagation)

### Manual deploy (emergency)

If GitHub Actions is down or you need to deploy without pushing:

```bash
cd sinaloka-platform  # or sinaloka-tutors / sinaloka-parent
VITE_API_URL=https://api.sinaloka.com npm run build
npx wrangler pages deploy dist --project-name=sinaloka-platform --commit-dirty=true
```

Replace `sinaloka-platform` with the appropriate project name.

### Rollback

- **Cloudflare dashboard:** Workers & Pages → select project → Deployments → select previous deploy → Rollback
- Or redeploy from a previous commit via manual deploy

## Emergency Procedures

### Backend is down (502/503)

1. Check if Railway is up: https://status.railway.com
2. Check logs: `railway logs` or Railway dashboard
3. If bad deploy: rollback in Railway dashboard → Deployments → previous deploy → Rollback
4. If database issue: check Postgres service logs in Railway dashboard

### Frontend shows blank page or errors

1. Check browser console (F12) for errors
2. Verify backend is responding: `curl https://api.sinaloka.com/api/health`
3. If CORS error: check `CORS_ORIGINS` env var on Railway backend service
4. If bad deploy: rollback in Cloudflare dashboard

### Database migration failed

1. Deploy fails automatically — previous version stays live (no downtime)
2. Check deploy logs for the specific SQL error
3. Fix the migration locally, push to master
4. If DB has stuck migration state: use `prisma migrate resolve` (see "Fixing a failed migration" above)

## Environment Variables Reference

### Backend (Railway)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Railway reference: `${{Postgres.DATABASE_URL}}`) |
| `JWT_SECRET` | Yes | Secret for signing JWT access tokens |
| `JWT_REFRESH_SECRET` | Yes | Secret for signing JWT refresh tokens |
| `JWT_EXPIRY` | Yes | Access token expiry (e.g. `15m`) |
| `JWT_REFRESH_EXPIRY` | Yes | Refresh token expiry (e.g. `7d`) |
| `PORT` | Yes | Backend port (`5000`) |
| `CORS_ORIGINS` | Yes | Comma-separated allowed origins |
| `UPLOAD_DIR` | Yes | Upload directory path (`./uploads`) |
| `UPLOAD_MAX_SIZE` | Yes | Max upload size in bytes (`5242880`) |
| `RESEND_API_KEY` | Yes | Resend email API key |
| `EMAIL_FROM` | Yes | Email sender address |
| `TUTOR_PORTAL_URL` | Yes | Tutor app URL for email links |
| `PARENT_PORTAL_URL` | Yes | Parent app URL for email links |
| `WHATSAPP_PHONE_NUMBER_ID` | No | WhatsApp Cloud API (no-op if not set) |
| `WHATSAPP_ACCESS_TOKEN` | No | WhatsApp Cloud API |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | No | WhatsApp Cloud API |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | No | WhatsApp Cloud API |
| `WHATSAPP_APP_SECRET` | No | WhatsApp Cloud API |

### Frontends (GitHub Actions → Cloudflare Pages)

| Variable | Where | Description |
|----------|-------|-------------|
| `VITE_API_URL` | GitHub Actions variable (`API_URL`) | Backend API URL |
| `CLOUDFLARE_API_TOKEN` | GitHub Actions secret | Cloudflare API token with Pages permissions |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub Actions secret | Cloudflare account ID |

### Dashboard access

| Platform | URL |
|----------|-----|
| Railway | https://railway.com (project: sinaloka-education) |
| Cloudflare | https://dash.cloudflare.com (Workers & Pages) |
| GitHub Actions | https://github.com/ghifarizuhir/sinaloka-education/actions |
| Hostinger DNS | https://hpanel.hostinger.com (domain: sinaloka.com) |
```

- [ ] **Step 2: Verify the file renders correctly**

Run: `cat DEPLOYMENT.md | head -5`

Expected: Shows the title and first few lines.

- [ ] **Step 3: Commit**

```bash
git add DEPLOYMENT.md
git commit -m "docs: add comprehensive deployment guide"
```

---

## Task 2: Complete deploy-frontend.yml with wrangler deploy

**Files:**
- Modify: `.github/workflows/deploy-frontend.yml`

- [ ] **Step 1: Replace the platform deploy stub**

In `.github/workflows/deploy-frontend.yml`, replace lines 84-88:

```yaml
      # -------------------------------------------------------
      # Replace with your hosting deployment (Vercel, Netlify, S3, etc.)
      # -------------------------------------------------------
      - name: Deploy platform
        run: echo "🚀 Deploy platform to ${{ github.event.inputs.environment || 'staging' }}"
```

With:

```yaml
      - name: Deploy platform to Cloudflare Pages
        run: npx wrangler pages deploy dist --project-name=sinaloka-platform
        working-directory: sinaloka-platform
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

- [ ] **Step 2: Replace the tutors deploy stub**

Replace lines 118-119:

```yaml
      - name: Deploy tutors
        run: echo "🚀 Deploy tutors to ${{ github.event.inputs.environment || 'staging' }}"
```

With:

```yaml
      - name: Deploy tutors to Cloudflare Pages
        run: npx wrangler pages deploy dist --project-name=sinaloka-tutors
        working-directory: sinaloka-tutors
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

- [ ] **Step 3: Replace the parent deploy stub**

Replace lines 149-150:

```yaml
      - name: Deploy parent
        run: echo "🚀 Deploy parent to ${{ github.event.inputs.environment || 'staging' }}"
```

With:

```yaml
      - name: Deploy parent to Cloudflare Pages
        run: npx wrangler pages deploy dist --project-name=sinaloka-parent
        working-directory: sinaloka-parent
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy-frontend.yml
git commit -m "ci(frontend): add Cloudflare Pages wrangler deploy to frontend workflow"
```

---

## Task 3: Set up GitHub secrets and variables

This task requires manual steps in the GitHub repository settings or via `gh` CLI.

- [ ] **Step 1: Get Cloudflare credentials**

Get your Cloudflare Account ID:
- Cloudflare dashboard → any page → right sidebar shows **Account ID**

Create a Cloudflare API Token:
- Cloudflare dashboard → My Profile → API Tokens → Create Token
- Use template: **Edit Cloudflare Workers** (includes Pages permissions)
- Copy the token

- [ ] **Step 2: Set GitHub secrets**

```bash
gh secret set CLOUDFLARE_API_TOKEN
# Paste the API token when prompted

gh secret set CLOUDFLARE_ACCOUNT_ID
# Paste the account ID when prompted
```

- [ ] **Step 3: Set GitHub Actions variables**

```bash
gh variable set API_URL --body "https://api.sinaloka.com"
gh variable set PLATFORM_URL --body "https://platform.sinaloka.com"
gh variable set TUTORS_URL --body "https://tutors.sinaloka.com"
gh variable set PARENT_URL --body "https://parent.sinaloka.com"
```

- [ ] **Step 4: Verify secrets and variables are set**

```bash
gh secret list
gh variable list
```

Expected: Shows `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` in secrets, and `API_URL`, `PLATFORM_URL`, `TUTORS_URL`, `PARENT_URL` in variables.

---

## Task 4: Test auto-deploy end-to-end

- [ ] **Step 1: Push all changes to master**

```bash
git push origin master
```

This should trigger the `deploy-frontend.yml` workflow since frontend files haven't changed — but we can trigger it manually.

- [ ] **Step 2: Trigger manual deploy to verify workflow**

```bash
gh workflow run "Deploy — Frontend" -f app=all -f environment=staging
```

- [ ] **Step 3: Monitor the workflow**

```bash
gh run list --workflow="Deploy — Frontend" --limit=1
gh run watch
```

Expected: All 3 deploy jobs succeed.

- [ ] **Step 4: Verify all sites are live**

```bash
curl -s -o /dev/null -w "%{http_code}" https://platform.sinaloka.com && echo " platform"
curl -s -o /dev/null -w "%{http_code}" https://tutors.sinaloka.com && echo " tutors"
curl -s -o /dev/null -w "%{http_code}" https://parent.sinaloka.com && echo " parent"
curl -s https://api.sinaloka.com/api/health
```

Expected: All return 200, backend returns `{"status":"ok"}`.

- [ ] **Step 5: Commit verification note**

No code change needed. If all checks pass, the deployment pipeline is fully operational.
