import { execSync } from 'child_process';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import pg from 'pg';
import { DB_URL } from '../helpers/constants.js';

const ROOT = resolve(import.meta.dirname, '..');
const BACKEND = resolve(ROOT, '../sinaloka-backend');

async function waitForPostgres(maxRetries = 30): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const client = new pg.Client({ connectionString: DB_URL });
      await client.connect();
      await client.end();
      return;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error('PostgreSQL not ready after 30s');
}

export default async function globalSetup() {
  console.log('[global-setup] Starting Docker container...');
  execSync('docker compose up -d', { cwd: ROOT, stdio: 'inherit' });

  console.log('[global-setup] Waiting for PostgreSQL...');
  await waitForPostgres();

  console.log('[global-setup] Generating Prisma client...');
  execSync(`DATABASE_URL=${DB_URL} npx prisma generate`, { cwd: BACKEND, stdio: 'inherit' });

  console.log('[global-setup] Running migrations...');
  execSync(`DATABASE_URL=${DB_URL} npx prisma migrate deploy`, { cwd: BACKEND, stdio: 'inherit' });

  console.log('[global-setup] Seeding database...');
  execSync(`DATABASE_URL=${DB_URL} npx prisma db seed`, { cwd: BACKEND, stdio: 'inherit' });

  console.log('[global-setup] Applying post-seed overlay...');
  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();
  const sql = readFileSync(resolve(ROOT, 'scripts/post-seed.sql'), 'utf-8');
  await client.query(sql);
  await client.end();

  console.log('[global-setup] Done.');
}
