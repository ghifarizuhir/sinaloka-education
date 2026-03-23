import { execSync } from 'child_process';
import * as path from 'path';
import { writeState } from './state/uat-state';

const BACKEND_DIR = path.resolve(__dirname, '../../../sinaloka-backend');
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

export default async function globalSetup(): Promise<void> {
  console.log('[uat-setup] Resetting database...');
  execSync('npx prisma migrate reset --force', {
    cwd: BACKEND_DIR,
    stdio: 'inherit',
    env: { ...process.env },
  });

  // Backend connection pool may need to reconnect after DB reset
  await waitForUrl('http://localhost:5000/api/health', 'Backend API');
  await waitForUrl('http://localhost:3000', 'Frontend');

  writeState({
    superAdmin: { email: 'super@sinaloka.com', password: 'password' },
    phase0: null,
    phase1: null,
    phase2: null,
    phase3: null,
  });
  console.log('[uat-setup] Ready.');
}
