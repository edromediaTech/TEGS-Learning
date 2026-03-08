# ---- TEGS-Learning Frontend (Nuxt 3) ----
# Multi-stage build for Firebase Hosting (SSG) or standalone Nitro

# Stage 1: Install all deps + build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .

# Build args for API URL (injected at build time)
ARG NUXT_PUBLIC_API_BASE=https://tegs-backend-746425674533.us-central1.run.app/api
ENV NUXT_PUBLIC_API_BASE=${NUXT_PUBLIC_API_BASE}

RUN npm run build

# Stage 2: Production image (only .output/)
FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup -S tegs && adduser -S tegs -G tegs

# Nuxt 3 outputs a standalone Nitro server in .output/
COPY --from=builder /app/.output ./.output

RUN chown -R tegs:tegs /app
USER tegs

EXPOSE 3002
ENV PORT=3002
ENV HOST=0.0.0.0

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3002/ || exit 1

CMD ["node", ".output/server/index.mjs"]
