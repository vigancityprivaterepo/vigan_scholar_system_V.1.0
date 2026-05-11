#!/bin/sh
set -e

# Wait for Postgres to be ready
until pg_isready -h db -p 5432 -U postgres; do
  echo 'Waiting for database...'
  sleep 2
done

# Automatic DB changes are disabled by default so normal deploys do not
# touch the live database. Enable explicitly only when you intend to apply
# schema updates.
if [ "$AUTO_APPLY_DB_CHANGES" = "true" ]; then
  echo 'AUTO_APPLY_DB_CHANGES=true, applying database updates...'
  psql "$DATABASE_URL" -f /app/scripts/init-enums.sql
  npx prisma db push --skip-generate --accept-data-loss
else
  echo 'Skipping automatic database changes.'
fi

exec node src/index.js
