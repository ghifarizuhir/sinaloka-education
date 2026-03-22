import { execSync } from 'child_process';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import pg from 'pg';
import { DB_URL } from './constants.js';

const BACKEND_DIR = resolve(import.meta.dirname, '../../sinaloka-backend');
const POST_SEED_SQL = resolve(import.meta.dirname, '../scripts/post-seed.sql');

export async function resetDatabase(): Promise<void> {
  execSync(`DATABASE_URL=${DB_URL} npx prisma migrate reset --force --skip-generate`, {
    cwd: BACKEND_DIR,
    stdio: 'pipe',
  });

  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();
  const sql = readFileSync(POST_SEED_SQL, 'utf-8');
  await client.query(sql);
  await client.end();
}

export async function runSql(sql: string): Promise<void> {
  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();
  await client.query(sql);
  await client.end();
}
