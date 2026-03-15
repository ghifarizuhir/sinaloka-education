import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnvFile(envPath: string): Record<string, string> {
  const content = fs.readFileSync(envPath, 'utf-8');
  const vars: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    vars[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
  }
  return vars;
}

export default async function globalSetup() {
  const backendDir = path.resolve(__dirname, '../../sinaloka-backend');
  const backendEnv = loadEnvFile(path.join(backendDir, '.env'));
  const env = { ...process.env, ...backendEnv, PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'yes please' };

  console.log('[global-setup] Resetting database...');
  execSync('npx prisma db push --force-reset --accept-data-loss', {
    cwd: backendDir,
    stdio: 'inherit',
    env,
  });

  console.log('[global-setup] Seeding database...');
  execSync('npx tsx prisma/seed.ts', {
    cwd: backendDir,
    stdio: 'inherit',
    env,
  });

  console.log('[global-setup] Database ready.');
}
