# ---- TEGS-Learning Backend ----
# Multi-stage build for minimal production image

# Stage 1: Install dependencies
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Stage 2: Production image
FROM node:24-alpine AS runner
WORKDIR /app

# Security: non-root user
RUN addgroup -S tegs && adduser -S tegs -G tegs

# Copy dependencies and source
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY public ./public

# Create uploads directory (+ /data/modules : simulations synchronisees d'un noeud TEGS-Edge)
RUN mkdir -p public/uploads /data/modules && chown -R tegs:tegs /app /data/modules

USER tegs

EXPOSE 3000

# Health check Docker (Cloud Run l'ignore). 127.0.0.1 et non localhost : sur Alpine,
# localhost resout d'abord en ::1, or le serveur n'ecoute qu'en IPv4.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "src/server.js"]
