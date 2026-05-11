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
RUN tr -d '\r' < entrypoint.sh > entrypoint.tmp \
    && mv entrypoint.tmp entrypoint.sh \
    && chmod +x entrypoint.sh

EXPOSE 5000

# entrypoint.sh: waits for Postgres and starts the server.
# Database updates are opt-in only via AUTO_APPLY_DB_CHANGES=true.
CMD ["sh", "/app/entrypoint.sh"]
