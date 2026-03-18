# ────────────────────────────────────────────
# Stage 1 — Build
# ────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder
RUN apt-get update -y && apt-get install -y openssl
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# ────────────────────────────────────────────
# Stage 2 — Production runner
# ────────────────────────────────────────────
FROM node:20-bookworm-slim AS runner
RUN apt-get update -y && apt-get install -y openssl
WORKDIR /app

ENV NODE_ENV=production

# Security: run as a dedicated non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid 1001 nextjs

# Copy only what is needed at runtime
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy startup script
COPY --from=builder /app/start.sh ./start.sh

# Own the app directory as the non-root user
RUN chmod +x /app/start.sh && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["/app/start.sh"]
