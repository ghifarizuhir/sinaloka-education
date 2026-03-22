#!/bin/bash
set -euo pipefail
DB_URL="postgresql://postgres:postgres@localhost:5435/sinaloka_test"

cd "$(dirname "$0")/../../sinaloka-backend"
DATABASE_URL=$DB_URL npx prisma migrate reset --force --skip-generate 2>/dev/null

cd ../e2e-integration
npx tsx -e "
import pg from 'pg';
import { readFileSync } from 'fs';
const c = new pg.Client({ connectionString: '$DB_URL' });
await c.connect();
await c.query(readFileSync('scripts/post-seed.sql', 'utf-8'));
await c.end();
" 2>/dev/null
