# Deployment Guide & Frontend Auto-Deploy

## Problem

The Sinaloka platform is live in production but has no deployment documentation. The backend auto-deploys via Railway on push to master, but the three frontend apps require manual `npx wrangler pages deploy` commands. There's no documented checklist, rollback procedure, or migration safety guide. Both the developer and Claude Code need a clear reference to deploy safely.

## Solution

Two deliverables:

1. **`DEPLOYMENT.md`** in the repo root — comprehensive deployment guide covering architecture, checklists, deploy flows, rollback procedures, and emergency procedures
2. **Complete the existing `deploy-frontend.yml` workflow** — `.github/workflows/deploy-frontend.yml` already exists with stub deploy steps (`echo "Deploy platform..."`). Replace the stubs with actual wrangler Cloudflare Pages deploy commands. Use `${{ vars.API_URL }}` (existing GitHub Actions variable) instead of hardcoding the URL.

## Audience

The developer (Ghifari) and Claude Code. The guide must be precise enough for an AI agent to follow step-by-step.

## Deliverable 1: DEPLOYMENT.md

### Section 1: Architecture Overview

Document the current production setup:

| Service | Platform | URL | Auto-deploy |
|---------|----------|-----|-------------|
| Backend (NestJS) | Railway (Docker) | https://api.sinaloka.com | Push to master (backend files) |
| Postgres | Railway | Internal only | N/A |
| Platform (React) | Cloudflare Pages | https://platform.sinaloka.com | GitHub Actions (new) |
| Tutors (React) | Cloudflare Pages | https://tutors.sinaloka.com | GitHub Actions (new) |
| Parent (React) | Cloudflare Pages | https://parent.sinaloka.com | GitHub Actions (new) |

How auto-deploy works:
- Push to `master` triggers deploys for changed apps only
- Backend: Railway detects changes in `/sinaloka-backend`, builds Docker image, runs migrations, starts app, healthcheck at `/api/health`
- Frontends: GitHub Actions detects changes in each app directory, builds with `VITE_API_URL`, deploys via wrangler to Cloudflare Pages

### Section 2: Pre-Deployment Checklist

Mandatory CI gates — all must pass before merging to master:

**Backend changes:**
- [ ] ESLint passes (`npm run lint`)
- [ ] Unit tests pass (`npm run test -- --ci`)
- [ ] Build succeeds (`npm run build`)
- [ ] If Prisma schema changed: migration created (`npx prisma migrate dev`)
- [ ] If new env vars: added to `.env.example` and documented in PR

**Frontend changes:**
- [ ] TypeScript type check passes (`npm run lint` / `tsc --noEmit`)
- [ ] Build succeeds (`npm run build`)
- [ ] No hardcoded `localhost` URLs in API calls

**All changes:**
- [ ] PR created with conventional commit title
- [ ] CI checks pass (automated)
- [ ] PR reviewed/approved
- [ ] Merge to master (triggers auto-deploy)

### Section 3: Backend Deployment (Railway)

**Normal deploy flow:**
1. Merge PR to master
2. Railway detects changes in `/sinaloka-backend`
3. Docker build: `npm ci` → `prisma generate` → `npm run build`
4. Deploy: `npx prisma migrate deploy` → `node dist/src/main`
5. Healthcheck at `/api/health` — if passes, deploy goes live
6. If healthcheck fails for 5 minutes, deploy is rolled back automatically

**Environment variables:** Complete reference table of all backend env vars with descriptions.

**Database migration safety:**
- Migrations run automatically on deploy via `prisma migrate deploy`
- Only applies pending migrations — never destructive
- If a migration fails, the deploy fails and previous deployment stays live
- To fix a failed migration: use `prisma migrate resolve` via public Postgres URL
- Never run `prisma migrate reset` on production (destroys all data)
- Test migrations locally first: `npx prisma migrate dev`

**Rollback:**
- Railway dashboard: Deployments → select previous successful deploy → Rollback
- Database migrations are NOT rolled back — fix forward with a new migration

**Logs:**
- CLI: `railway logs` (must be linked to the service first via `railway link`)
- Dashboard: sinaloka-backend → Deployments → View logs
- For error filtering, use the Railway dashboard log viewer (CLI does not support filtering)

### Section 4: Frontend Deployment (Cloudflare Pages)

**Normal deploy flow:**
1. Merge PR to master
2. GitHub Actions detects changes in the app directory
3. Builds with `VITE_API_URL=https://api.sinaloka.com`
4. Deploys via `npx wrangler pages deploy dist --project-name=<project>`
5. Live within seconds (CDN propagation)

**Manual deploy (emergency/override):**
```bash
cd sinaloka-platform
VITE_API_URL=https://api.sinaloka.com npm run build
npx wrangler pages deploy dist --project-name=sinaloka-platform --commit-dirty=true
```

**Rollback:**
- List deployments: `npx wrangler pages deployments list --project-name=sinaloka-platform`
- Rollback: via Cloudflare dashboard → Deployments → select previous → Rollback
- Or redeploy from a previous commit

### Section 5: Emergency Procedures

**Backend is down (502/503):**
1. Check logs: `railway logs --service sinaloka-backend`
2. Check deployment status: `railway service status`
3. If bad deploy: rollback in Railway dashboard
4. If database issue: check Postgres logs in Railway dashboard
5. If Railway is down: check https://status.railway.com

**Frontend shows blank page or errors:**
1. Check browser console for errors
2. Check if `api.sinaloka.com` is responding
3. If bad deploy: rollback in Cloudflare dashboard
4. If CORS error: verify `CORS_ORIGINS` env var on Railway backend

**Database migration failed:**
1. Deploy will fail automatically — previous version stays live
2. Check deploy logs for the error
3. Fix the migration SQL locally
4. If DB is in stuck state: `prisma migrate resolve --rolled-back <migration_name>` via public Postgres URL
5. Push fix, Railway auto-deploys

### Section 6: Environment Variables Reference

Enumerate all env vars from these sources:
- Backend: `sinaloka-backend/.env.example` (DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, JWT_EXPIRY, JWT_REFRESH_EXPIRY, PORT, CORS_ORIGINS, UPLOAD_DIR, UPLOAD_MAX_SIZE, RESEND_API_KEY, EMAIL_FROM, TUTOR_PORTAL_URL, PARENT_PORTAL_URL, WHATSAPP_* vars)
- Frontends: `VITE_API_URL` (set via GitHub Actions variable `${{ vars.API_URL }}`)
- Railway-provided: DATABASE_URL (reference var from Postgres service)

Table format: Variable | Service | Platform | Required | Description

## Deliverable 2: Complete Existing deploy-frontend.yml

### File to modify: `.github/workflows/deploy-frontend.yml`

This file already exists with the correct trigger, change detection, and per-app job structure. The deploy steps are stubs (`echo "Deploy platform..."`). Replace each stub with actual wrangler deploy commands.

### GitHub Secrets Required

| Secret | Where to get it |
|--------|----------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens → Create Token → Edit Cloudflare Workers (Pages) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → any page → right sidebar → Account ID |

### Deploy Step Pattern (per app)

Replace each app's stub deploy step with:

```yaml
- run: npx wrangler pages deploy dist --project-name=sinaloka-platform
  working-directory: sinaloka-platform
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

Use `${{ vars.API_URL }}` for `VITE_API_URL` (existing GitHub Actions variable) instead of hardcoding the URL in the build step.

## Out of Scope

- Staging environment setup (no budget yet)
- Monitoring/alerting (production TODO)
- Backup automation (production TODO)
- Custom CI pipeline changes (existing CI is sufficient)
