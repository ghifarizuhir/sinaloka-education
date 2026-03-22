import { execSync } from 'child_process';
import { resolve } from 'path';

export default async function globalTeardown() {
  const ROOT = resolve(import.meta.dirname, '..');
  console.log('[global-teardown] Stopping Docker container...');
  execSync('docker compose down -v', { cwd: ROOT, stdio: 'inherit' });
  console.log('[global-teardown] Done.');
}
