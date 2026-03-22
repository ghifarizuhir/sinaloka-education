#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
DB_URL="postgresql://postgres:postgres@localhost:5435/sinaloka_test"

echo "Starting PostgreSQL container..."
docker compose up -d --wait

echo "Generating Prisma client..."
cd ../sinaloka-backend
DATABASE_URL=$DB_URL npx prisma generate

echo "Running migrations..."
DATABASE_URL=$DB_URL npx prisma migrate deploy

echo "Seeding database..."
DATABASE_URL=$DB_URL npx prisma db seed

echo "Applying post-seed overlay..."
cd ../e2e-integration
npx tsx -e "
import pg from 'pg';
import { readFileSync } from 'fs';
const c = new pg.Client({ connectionString: '$DB_URL' });
await c.connect();
await c.query(readFileSync('scripts/post-seed.sql', 'utf-8'));
await c.end();
"

echo "Setup complete."
