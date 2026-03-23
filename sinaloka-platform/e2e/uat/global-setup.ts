import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { writeState, clearTokenCache, readTokenCache, writeTokenCache, type TokenEntry } from './state/uat-state';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_DIR = path.resolve(__dirname, '../../../sinaloka-backend');

// Load backend .env so DATABASE_URL is available for prisma commands
const backendEnvPath = path.resolve(BACKEND_DIR, '.env');
if (fs.existsSync(backendEnvPath)) {
  const envContent = fs.readFileSync(backendEnvPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
}
const MAX_RETRIES = 15;
const RETRY_DELAY_MS = 3000;

async function waitForUrl(url: string, label: string): Promise<void> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        console.log(`[uat-setup] ${label} ready`);
        return;
      }
    } catch {
      // retry
    }
    if (attempt === MAX_RETRIES) {
      throw new Error(`[uat-setup] ${label} not reachable at ${url} after ${MAX_RETRIES} attempts`);
    }
    console.log(`[uat-setup] Waiting for ${label} (${attempt}/${MAX_RETRIES})...`);
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  }
}

async function prefetchToken(email: string, password: string): Promise<void> {
  const res = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    console.warn(`[uat-setup] Warning: could not prefetch token for ${email}: ${res.status}`);
    return;
  }

  const data = await res.json();
  const cache = readTokenCache();
  cache.set(email, {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    obtained_at: Date.now(),
  });
  writeTokenCache(cache);
  console.log(`[uat-setup] Token cached for ${email}`);
}

export default async function globalSetup(): Promise<void> {
  const execEnv = {
    ...process.env,
    PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'yes',
  };

  console.log('[uat-setup] Resetting database...');
  execSync('npx prisma migrate reset --force', {
    cwd: BACKEND_DIR,
    stdio: 'inherit',
    env: execEnv,
  });

  // Seed separately with tsx (prisma.config.ts uses bun which may not be available)
  console.log('[uat-setup] Seeding database...');
  execSync('npx tsx prisma/seed.ts', {
    cwd: BACKEND_DIR,
    stdio: 'inherit',
    env: execEnv,
  });

  // Backend connection pool may need to reconnect after DB reset
  await waitForUrl('http://localhost:5000/api/health', 'Backend API');
  await waitForUrl('http://localhost:3000', 'Frontend');

  // Clear stale token cache (DB was reset, old tokens are invalid)
  clearTokenCache();

  // Pre-fetch super admin token (uses 1 of 5 allowed login attempts)
  await prefetchToken('super@sinaloka.com', 'password');

  writeState({
    superAdmin: { email: 'super@sinaloka.com', password: 'password' },
    phase0: null,
    phase1: null,
    phase2: null,
    phase3: null,
  });
  console.log('[uat-setup] Ready.');
}
