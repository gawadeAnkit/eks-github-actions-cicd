# ========================================================
# Production Microservice Container Image
# Base Image: Lightweight Alpine Linux with Node.js LTS
# ========================================================
FROM node:20-alpine

# Set working directory inside container
WORKDIR /usr/src/app

# Set container environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Copy application source code and descriptors
COPY app/package.json ./
COPY app/src ./src

# Security Best Practice: Run application as non-root user
USER node

# Expose application port
EXPOSE 3000

# Container-level health check matching Kubernetes liveness endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Default container startup command
CMD ["node", "src/server.js"]
