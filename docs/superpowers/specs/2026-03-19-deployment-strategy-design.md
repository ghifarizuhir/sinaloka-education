# Deployment Strategy: Railway Backend + Cloudflare Pages Frontends

## Problem

The Sinaloka multi-tenant platform needs a deployment strategy that works for staging/demo now and scales safely to production. Previous ad-hoc deployment attempts failed due to missing env vars, broken Prisma migrations, and incorrect build paths. A documented, repeatable strategy is needed.

## Solution

Deploy the backend (NestJS + Postgres) on Railway with GitHub-based auto-deploys, and the three frontend apps (platform, tutors, parent) on Cloudflare Pages with CDN-backed static hosting. Use custom subdomains under `sinaloka.com` (DNS managed via Hostinger).

## Architecture

```
                    Hostinger DNS (sinaloka.com)
                    ┌─────────────────────────────┐
                    │ api.sinaloka.com      → Railway
                    │ platform.sinaloka.com → Cloudflare Pages
                    │ tutors.sinaloka.com   → Cloudflare Pages
                    │ parent.sinaloka.com   → Cloudflare Pages
                    └─────────────────────────────┘
                          │                │
              ┌───────────┘                └──────────┐
              ▼                                       ▼
    Railway (backend + db)                 Cloudflare Pages (frontends)
    ┌──────────────────┐                  ┌────────────────────┐
    │ sinaloka-backend │◄─── HTTPS ──────│ sinaloka-platform  │
    │   port 5000      │                  │ sinaloka-tutors    │
    │   /api prefix    │                  │ sinaloka-parent    │
    ├──────────────────┤                  └────────────────────┘
    │ Postgres         │                  (Vite static builds,
    │   + Volume       │                   CDN-backed, free tier)
    └──────────────────┘
```

## 1. Backend Deployment (Railway)

### Service: sinaloka-backend

**Source:** GitHub repo `ghifarizuhir/sinaloka-education`, root directory `/sinaloka-backend`, branch `master`.

**Builder:** Dockerfile.

**Dockerfile:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && \
    node -e "require('fs').writeFileSync('generated/prisma/package.json', JSON.stringify({name:'@generated/prisma',type:'module',main:'./client.js',types:'./client.ts'}, null, 2))"
RUN npm run build
RUN mkdir -p uploads
EXPOSE 5000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
```

**railway.toml:**
```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/api"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

**.dockerignore:**
```
node_modules
dist
.env
.env.*
uploads
```

**Persistent storage:** Railway Volume mounted at `/app/uploads` for file uploads (student photos, invoices, payout slips).

### Environment Variables

All required — app crashes if missing (intentional, matches `EmailService` behavior).

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Railway reference variable |
| `JWT_SECRET` | (generated) | `openssl rand -base64 32` |
| `JWT_REFRESH_SECRET` | (generated) | `openssl rand -base64 32` |
| `JWT_EXPIRY` | `15m` | |
| `JWT_REFRESH_EXPIRY` | `7d` | |
| `PORT` | `5000` | |
| `UPLOAD_DIR` | `./uploads` | Matches volume mount |
| `UPLOAD_MAX_SIZE` | `5242880` | 5MB |
| `RESEND_API_KEY` | (from local .env) | Real key required |
| `EMAIL_FROM` | `Sinaloka <noreply@sinaloka.com>` | |
| `TUTOR_PORTAL_URL` | `https://tutors.sinaloka.com` | Used in email templates |
| `PARENT_PORTAL_URL` | `https://parent.sinaloka.com` | Used in email templates |
| `CORS_ORIGINS` | `https://platform.sinaloka.com,https://tutors.sinaloka.com,https://parent.sinaloka.com` | Comma-separated allowed origins |

### Custom Domain

- Add `api.sinaloka.com` as custom domain on the Railway backend service
- Railway provides a CNAME target
- Add CNAME record in Hostinger: `api` → Railway target

### CORS

Backend must allow these origins:
- `https://platform.sinaloka.com`
- `https://tutors.sinaloka.com`
- `https://parent.sinaloka.com`

Use a `CORS_ORIGINS` environment variable (comma-separated) to configure allowed origins. Read it in `main.ts` and pass to `app.enableCors({ origin })`. This avoids hardcoding and makes it easy to adjust per environment.

Add to Railway env vars: `CORS_ORIGINS=https://platform.sinaloka.com,https://tutors.sinaloka.com,https://parent.sinaloka.com`

### Auto-deploy

Railway watches `master` branch. Root directory `/sinaloka-backend` ensures only backend changes trigger deploys.

### Deploy Flow

On push to `master` (backend files changed):
1. Railway detects change, starts build
2. Docker build: `npm ci` → `prisma generate` → `npm run build`
3. Deploy: `prisma migrate deploy` (applies pending migrations) → `node dist/src/main`
4. Healthcheck hits `/api` — if it responds, deploy goes live
5. If healthcheck fails for 5 minutes, deploy is rolled back

## 2. Frontend Deployment (Cloudflare Pages)

### Three Projects

Each frontend is a separate Cloudflare Pages project connected to the same GitHub repo.

| Project | Root Dir | Build Command | Output Dir | Custom Domain |
|---------|----------|---------------|------------|---------------|
| sinaloka-platform | `/sinaloka-platform` | `npm run build` | `dist` | `platform.sinaloka.com` |
| sinaloka-tutors | `/sinaloka-tutors` | `npm run build` | `dist` | `tutors.sinaloka.com` |
| sinaloka-parent | `/sinaloka-parent` | `npm run build` | `dist` | `parent.sinaloka.com` |

### Environment Variables

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://api.sinaloka.com` |
| `NODE_VERSION` | `20` |

### SPA Routing

Each frontend needs a `public/_redirects` file for client-side routing:
```
/* /index.html 200
```

Without this, direct URL access or browser refresh on routes like `/students` returns 404.

### Auto-deploy

- Cloudflare Pages watches `master` branch
- Root directory scoping ensures only changes to the specific app trigger its deploy
- PRs get automatic preview deployments (free)

## 3. DNS Setup (Hostinger)

Add these CNAME records in the Hostinger DNS panel:

| Type | Name | Target | TTL |
|------|------|--------|-----|
| CNAME | `api` | (Railway-provided domain) | Auto |
| CNAME | `platform` | (Cloudflare Pages domain, e.g. `sinaloka-platform.pages.dev`) | Auto |
| CNAME | `tutors` | (Cloudflare Pages domain, e.g. `sinaloka-tutors.pages.dev`) | Auto |
| CNAME | `parent` | (Cloudflare Pages domain, e.g. `sinaloka-parent.pages.dev`) | Auto |

SSL/HTTPS is automatic on both Railway and Cloudflare Pages — no manual certificate management.

## 4. Code Changes Required

### Backend

1. **Fix Prisma migration SQL** — remove `COMMIT;BEGIN;` from `20260318032839_add_subject_table_and_relations/migration.sql` (already done)
2. **CORS lockdown** — read `CORS_ORIGINS` env var in `main.ts`, pass as `origin` array to `app.enableCors()`
3. **Dockerfile** — already exists and working

### Frontends

1. **Add `public/_redirects`** — one file per app, single line: `/* /index.html 200`
2. **Verify `VITE_API_URL` usage** — ensure no hardcoded `localhost` references remain in API calls

## 5. Setup Order

Execute in this order to minimize issues:

1. **Backend first** — fix CORS, verify Dockerfile works, set all env vars, attach volume, deploy
2. **DNS for api.sinaloka.com** — add CNAME in Hostinger, verify SSL
3. **Frontends** — create Cloudflare Pages projects, connect repo, set env vars, deploy
4. **DNS for frontend subdomains** — add CNAMEs in Hostinger
5. **End-to-end test** — login via platform, create institution, verify all flows

## 6. Production Readiness TODOs

Items to address before going to production (not built now):

| Item | Why | Priority |
|------|-----|----------|
| Cloud storage (S3/R2) for uploads | Railway Volume is single-server, no CDN, no backup | High |
| Rate limiting | Prevent API abuse | High |
| Postgres automated backups | Data safety | High |
| Railway staging environment | Separate staging from production | Medium |
| Monitoring/alerting | Know when things break | Medium |
| Log aggregation | Debug production issues | Medium |
| CDN for uploaded files | Performance for images/PDFs | Low |

## Out of Scope

- Database seeding (start empty, create manually)
- WhatsApp Cloud API setup (optional, no-op when unconfigured)
- Midtrans payment gateway production keys
- CI pipeline changes (already have GitHub Actions)
