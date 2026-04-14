FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl postgresql-client && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
COPY scripts ./scripts
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

EXPOSE 5000

# entrypoint.sh: waits for Postgres, runs idempotent enum migrations that
# prisma db push cannot apply on its own (text→enum casts via USING clause),
# then calls prisma db push and starts the server.
CMD ["./entrypoint.sh"]
