# ========================================================
# Stage 1: Verification & Build Stage
# ========================================================
FROM node:20-alpine AS builder

WORKDIR /build

COPY app/package.json ./
COPY app/src ./src
COPY app/test ./test

# Execute unit tests inside build stage as an additional safety gate
RUN node --test test/app.test.js

# ========================================================
# Stage 2: Minimal Hardened Production Runtime
# ========================================================
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production \
    PORT=3000

# Copy only runtime artifacts with non-root ownership
COPY --chown=node:node --from=builder /build/package.json ./
COPY --chown=node:node --from=builder /build/src ./src

# Run as unprivileged non-root user
USER node

EXPOSE 3000

# Container-level health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "src/server.js"]
