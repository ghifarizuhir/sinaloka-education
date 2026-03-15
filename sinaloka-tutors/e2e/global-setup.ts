import { execSync } from 'child_process';
import path from 'path';

export default async function globalSetup() {
  const backendDir = path.resolve(__dirname, '../../sinaloka-backend');

  console.log('[global-setup] Resetting database...');
  execSync('npx prisma db push --force-reset --accept-data-loss', {
    cwd: backendDir,
    stdio: 'inherit',
    env: { ...process.env },
  });

  console.log('[global-setup] Seeding database...');
  execSync('npx prisma db seed', {
    cwd: backendDir,
    stdio: 'inherit',
    env: { ...process.env },
  });

  console.log('[global-setup] Database ready.');
}
