#!/bin/sh
set -e

# Wait for Postgres to be ready
until pg_isready -h db -p 5432 -U postgres; do
  echo 'Waiting for database...'
  sleep 2
done

# Apply enum type migrations that prisma db push cannot execute automatically.
# This script is fully idempotent — safe to run on every container start.
echo 'Applying pre-push enum migrations...'
psql "$DATABASE_URL" -f /app/scripts/init-enums.sql

# Sync remaining schema changes and start the server
npx prisma db push --skip-generate --accept-data-loss
exec node src/index.js
