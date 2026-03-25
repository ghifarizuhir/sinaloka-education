# Deployment Strategy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy sinaloka-backend on Railway with Postgres, and three frontend apps on Cloudflare Pages, all with custom subdomains under sinaloka.com.

**Architecture:** Backend + Postgres on Railway (Docker-based, auto-deploy from GitHub). Three frontend SPAs on Cloudflare Pages (static builds, CDN-backed). DNS via Hostinger with CNAME records for each subdomain.

**Tech Stack:** Railway, Cloudflare Pages, Docker, NestJS, Prisma, Vite, Hostinger DNS

**Spec:** `docs/superpowers/specs/2026-03-19-deployment-strategy-design.md`

---

## File Structure

### Backend Changes

| File | Action | Responsibility |
|------|--------|---------------|
| `sinaloka-backend/src/main.ts` | Modify | Add CORS configuration from env var |
| `sinaloka-backend/Dockerfile` | Existing | Already correct (verified) |
| `sinaloka-backend/railway.toml` | Existing | Already correct (verified) |
| `sinaloka-backend/.dockerignore` | Existing | Already correct (verified) |
| `sinaloka-backend/.env.example` | Modify | Add CORS_ORIGINS, fix PORT default |

### Frontend Changes

| File | Action | Responsibility |
|------|--------|---------------|
| `sinaloka-tutors/src/api/client.ts` | Modify | Use VITE_API_URL instead of relative `/api` |
| `sinaloka-parent/src/api/client.ts` | Modify | Use VITE_API_URL instead of relative `/api` |
| `sinaloka-platform/public/_redirects` | Create | SPA routing for Cloudflare Pages |
| `sinaloka-tutors/public/_redirects` | Create | SPA routing for Cloudflare Pages |
| `sinaloka-parent/public/_redirects` | Create | SPA routing for Cloudflare Pages |
| `sinaloka-tutors/.env.example` | Modify | Add VITE_API_URL |

### Infrastructure (manual steps documented)

| Action | Platform |
|--------|----------|
| Set backend env vars | Railway dashboard/CLI |
| Attach volume to backend | Railway dashboard |
| Create 3 Cloudflare Pages projects | Cloudflare dashboard |
| Add 4 CNAME records | Hostinger DNS panel |
| Add custom domain to Railway | Railway dashboard |

---

## Task 1: Backend — CORS Configuration

**Files:**
- Modify: `sinaloka-backend/src/main.ts`
- Modify: `sinaloka-backend/.env.example`

- [ ] **Step 1: Update main.ts to read CORS_ORIGINS from env**

Replace the CORS line in `sinaloka-backend/src/main.ts`. Change:

```typescript
app.enableCors();
```

To:

```typescript
const corsOrigins = configService.get<string>('CORS_ORIGINS', '');
app.enableCors({
  origin: corsOrigins ? corsOrigins.split(',').map(o => o.trim()) : true,
  credentials: true,
});
```

This reads `CORS_ORIGINS` as a comma-separated list. If not set (local dev), it falls back to `true` (allow all) so local development isn't broken.

- [ ] **Step 2: Update .env.example**

Add `CORS_ORIGINS` and fix PORT in `sinaloka-backend/.env.example`:

```
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:5174
```

Also change `PORT=3000` to `PORT=5000` to match the actual backend port.

- [ ] **Step 3: Verify locally**

Run: `cd sinaloka-backend && npm run build`

Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add sinaloka-backend/src/main.ts sinaloka-backend/.env.example
git commit -m "feat(backend): add CORS_ORIGINS env var for production CORS lockdown"
```

---

## Task 2: Frontend — Fix API base URL in tutors and parent apps

**Files:**
- Modify: `sinaloka-tutors/src/api/client.ts`
- Modify: `sinaloka-parent/src/api/client.ts`
- Modify: `sinaloka-tutors/.env.example`

Both apps currently use `baseURL: '/api'` which relies on Vite's dev proxy. In production (Cloudflare Pages), there's no proxy — the API is on a different domain. They need to use `VITE_API_URL` like the platform app does.

- [ ] **Step 1: Fix sinaloka-tutors/src/api/client.ts**

Change line 4-6 from:

```typescript
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});
```

To:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});
```

Also fix the hardcoded `/api/auth/refresh` call inside `refreshAccessToken()` — change:

```typescript
const response = await axios.post('/api/auth/refresh', {
```

To:

```typescript
const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
```

- [ ] **Step 2: Fix sinaloka-parent/src/api/client.ts**

Same changes as tutors. Change line 4-6 from:

```typescript
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});
```

To:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});
```

Also fix the hardcoded `/api/auth/refresh` call — change:

```typescript
const response = await axios.post('/api/auth/refresh', { refresh_token: refreshToken });
```

To:

```typescript
const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, { refresh_token: refreshToken });
```

- [ ] **Step 3: Replace tutors .env.example**

The existing `sinaloka-tutors/.env.example` contains stale AI Studio boilerplate. Replace the entire file contents with:

```
VITE_API_URL=http://localhost:5000
```

- [ ] **Step 3b: Fix platform fallback URL (consistency)**

In `sinaloka-platform/src/lib/api.ts`, the fallback is `http://localhost:3000` but the backend runs on port 5000. Change line 3:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
```

- [ ] **Step 4: Verify both apps build**

Run: `cd sinaloka-tutors && npm run build && cd ../sinaloka-parent && npm run build`

Expected: Both builds succeed

- [ ] **Step 5: Commit**

```bash
git add sinaloka-tutors/src/api/client.ts sinaloka-parent/src/api/client.ts sinaloka-tutors/.env.example sinaloka-platform/src/lib/api.ts
git commit -m "fix(frontend): use VITE_API_URL for API base URL across all apps"
```

---

## Task 3: Frontend — Add SPA redirect files for Cloudflare Pages

**Files:**
- Create: `sinaloka-platform/public/_redirects`
- Create: `sinaloka-tutors/public/_redirects`
- Create: `sinaloka-parent/public/_redirects`

Cloudflare Pages serves static files. Without a redirect rule, refreshing on `/students` returns 404. The `_redirects` file tells Cloudflare to serve `index.html` for all routes (SPA routing).

- [ ] **Step 1: Create _redirects for all three apps**

Create `sinaloka-platform/public/_redirects`:
```
/* /index.html 200
```

Create `sinaloka-tutors/public/_redirects`:
```
/* /index.html 200
```

Create `sinaloka-parent/public/_redirects`:
```
/* /index.html 200
```

- [ ] **Step 2: Verify files are included in build output**

Run: `cd sinaloka-platform && npm run build && cat dist/_redirects`

Expected: Output shows `/* /index.html 200`

- [ ] **Step 3: Commit**

```bash
git add sinaloka-platform/public/_redirects sinaloka-tutors/public/_redirects sinaloka-parent/public/_redirects
git commit -m "feat(frontend): add _redirects for Cloudflare Pages SPA routing"
```

---

## Task 4: Push code changes and deploy backend

This task covers pushing code, setting Railway env vars, and deploying.

- [ ] **Step 1: Push all changes to master**

```bash
git push origin master
```

Railway auto-deploys from master when `/sinaloka-backend` files change.

- [ ] **Step 2: Set remaining Railway env vars**

Using Railway CLI or MCP tools, set on the `sinaloka-backend` service:

```bash
# Read RESEND_API_KEY from local .env
RESEND_KEY=$(grep RESEND_API_KEY sinaloka-backend/.env | cut -d= -f2)

railway variables --service sinaloka-backend \
  --set "RESEND_API_KEY=$RESEND_KEY" \
  --set "EMAIL_FROM=Sinaloka <noreply@sinaloka.com>" \
  --set "TUTOR_PORTAL_URL=https://tutors.sinaloka.com" \
  --set "PARENT_PORTAL_URL=https://parent.sinaloka.com" \
  --set "CORS_ORIGINS=https://platform.sinaloka.com,https://tutors.sinaloka.com,https://parent.sinaloka.com"
```

- [ ] **Step 3: Attach Railway Volume for uploads**

In Railway dashboard:
1. Go to sinaloka-backend service → Settings
2. Scroll to "Volumes" section
3. Click "Add Volume"
4. Mount path: `/app/uploads`
5. Name: `backend-uploads`

- [ ] **Step 4: Reset database and verify deploy**

Since the database may have stale failed migration state, reset it.

First, get the public Postgres URL from Railway:

```bash
railway variables --service Postgres --kv | grep DATABASE_PUBLIC_URL
```

Then use that URL to reset:

```bash
DATABASE_URL="postgresql://postgres:PASSWORD@gondola.proxy.rlwy.net:PORT/railway" npx prisma migrate reset --force
```

Replace the URL with the actual `DATABASE_PUBLIC_URL` value from the command above.

Then redeploy:

```bash
railway redeploy --service sinaloka-backend --yes
```

- [ ] **Step 5: Monitor deploy logs**

```bash
railway logs --service sinaloka-backend
```

Expected output includes:
- `No pending migrations to apply.` (or migrations applied successfully)
- `[NestFactory] Starting Nest application...`
- `Application is running on: http://localhost:5000/api`
- Healthcheck passes (no "Healthcheck failed" message)

- [ ] **Step 6: Verify backend is live**

Visit: `https://sinaloka-backend-production.up.railway.app/api`

Expected: A response (404 or JSON) — not a connection error.

---

## Task 5: Add custom domain to Railway backend

- [ ] **Step 1: Add custom domain in Railway**

Using Railway CLI:

```bash
railway domain --service sinaloka-backend
```

Or in the dashboard: Settings → Networking → Custom Domain → add `api.sinaloka.com`

Railway will provide a CNAME target (e.g. `some-hash.up.railway.app`).

- [ ] **Step 2: Add CNAME record in Hostinger**

In Hostinger DNS panel:
- Type: CNAME
- Name: `api`
- Target: (the CNAME target Railway provided)
- TTL: Auto

- [ ] **Step 3: Wait for DNS propagation and verify**

DNS can take up to 24 hours but usually works within minutes.

Test: `curl https://api.sinaloka.com/api`

Expected: Response from the backend (not a DNS error).

---

## Task 6: Create Cloudflare Pages projects

This task is done in the Cloudflare dashboard. Create three projects, one per frontend app.

- [ ] **Step 1: Create sinaloka-platform project**

In Cloudflare Pages dashboard:
1. Create new project → Connect to Git → select `ghifarizuhir/sinaloka-education`
2. Project name: `sinaloka-platform`
3. Build settings:
   - Framework preset: None
   - Root directory: `/sinaloka-platform`
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Environment variables:
   - `VITE_API_URL` = `https://api.sinaloka.com`
   - `NODE_VERSION` = `20`
5. Deploy

- [ ] **Step 2: Create sinaloka-tutors project**

Same steps:
1. Project name: `sinaloka-tutors`
2. Root directory: `/sinaloka-tutors`
3. Build command: `npm run build`
4. Build output: `dist`
5. Env vars: `VITE_API_URL=https://api.sinaloka.com`, `NODE_VERSION=20`

- [ ] **Step 3: Create sinaloka-parent project**

Same steps:
1. Project name: `sinaloka-parent`
2. Root directory: `/sinaloka-parent`
3. Build command: `npm run build`
4. Build output: `dist`
5. Env vars: `VITE_API_URL=https://api.sinaloka.com`, `NODE_VERSION=20`

- [ ] **Step 4: Verify all three deploy successfully**

Each project should auto-build and deploy. Check Cloudflare Pages dashboard for green status on all three.

Test each `.pages.dev` URL:
- `https://sinaloka-platform.pages.dev` — should show login page
- `https://sinaloka-tutors.pages.dev` — should show tutor login page
- `https://sinaloka-parent.pages.dev` — should show parent login page

---

## Task 7: Add custom domains to Cloudflare Pages

- [ ] **Step 1: Add custom domains in Cloudflare Pages**

For each project in Cloudflare Pages dashboard → Custom Domains:
- sinaloka-platform: add `platform.sinaloka.com`
- sinaloka-tutors: add `tutors.sinaloka.com`
- sinaloka-parent: add `parent.sinaloka.com`

Cloudflare provides CNAME targets for each.

- [ ] **Step 2: Add CNAME records in Hostinger**

In Hostinger DNS panel, add three CNAME records:

| Type | Name | Target |
|------|------|--------|
| CNAME | `platform` | `sinaloka-platform.pages.dev` |
| CNAME | `tutors` | `sinaloka-tutors.pages.dev` |
| CNAME | `parent` | `sinaloka-parent.pages.dev` |

- [ ] **Step 3: Wait for DNS propagation and verify**

Test each URL:
- `https://platform.sinaloka.com` — login page
- `https://tutors.sinaloka.com` — tutor login page
- `https://parent.sinaloka.com` — parent login page

---

## Task 8: End-to-end verification

- [ ] **Step 1: Test backend health**

```bash
curl https://api.sinaloka.com/api
```

Expected: Response from NestJS (200 or 404, not connection error)

- [ ] **Step 2: Test login flow on platform**

1. Go to `https://platform.sinaloka.com`
2. Register or login with admin account
3. Verify dashboard loads
4. Verify API calls go to `api.sinaloka.com` (check browser Network tab)

- [ ] **Step 3: Test SPA routing**

1. Navigate to a deep route (e.g. `/students`)
2. Refresh the page
3. Expected: Page loads correctly (not 404)

- [ ] **Step 4: Test CORS**

In browser console on `platform.sinaloka.com`:
```javascript
fetch('https://api.sinaloka.com/api/auth/me', { credentials: 'include' })
  .then(r => console.log('CORS OK:', r.status))
  .catch(e => console.error('CORS FAIL:', e))
```

Expected: `CORS OK: 401` (unauthorized but no CORS error)

- [ ] **Step 5: Update CORS_ORIGINS if using Railway subdomain temporarily**

If custom domains aren't set up yet, temporarily add the `.pages.dev` and `.up.railway.app` URLs to `CORS_ORIGINS`:

```bash
railway variables --service sinaloka-backend \
  --set "CORS_ORIGINS=https://platform.sinaloka.com,https://tutors.sinaloka.com,https://parent.sinaloka.com,https://sinaloka-platform.pages.dev,https://sinaloka-tutors.pages.dev,https://sinaloka-parent.pages.dev"
```
