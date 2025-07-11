FROM node:18-alpine AS base

RUN npm install -g pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm nx build transactions --prod

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install postgresql-client for pg_isready and pnpm for migrations
RUN apk add --no-cache postgresql-client
RUN npm install -g pnpm

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=builder /app/dist/apps/transactions ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/nx.json ./
COPY --from=builder /app/apps/transactions ./apps/transactions
COPY --from=builder /app/shared-proto ../shared-proto
COPY apps/transactions/entrypoint.sh ./entrypoint.sh

# Make entrypoint executable and give ownership to nestjs user
RUN chmod +x ./entrypoint.sh && \
    chown nestjs:nodejs ./entrypoint.sh && \
    chown -R nestjs:nodejs /app

USER nestjs

CMD ["./entrypoint.sh"]
