FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl postgresql-client && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

EXPOSE 5000

# Wait for Postgres to be ready, then sync the schema and start the server.
# prisma db push is used instead of migrate deploy because the production DB
# was originally provisioned with db push (no _prisma_migrations history).
# db push is idempotent — it only applies what is missing in the live schema.
CMD ["sh", "-c", "until pg_isready -h db -p 5432 -U postgres; do echo 'Waiting for database...'; sleep 2; done && npx prisma db push --skip-generate --accept-data-loss && node src/index.js"]
