# ============================================
# MLA-Backend: Multi-stage Production Dockerfile
# ============================================
# 
# Architecture: Modular Monolith for Smart Grievance Management
# Stages:
#   1. BUILD: Compiles TypeScript, installs all dependencies
#   2. RUNTIME: Slim production image with only compiled code + prod deps
#
# Optimizations:
#   - Multi-stage build (reduces final image size by ~60%)
#   - Non-root user for security
#   - Efficient layer caching
#   - Minimal attack surface
#   - Proper signal handling for graceful shutdown

# ============================================
# STAGE 1: BUILD
# ============================================
FROM node:20-alpine AS builder

WORKDIR /build

# Install build tools for native modules (if needed)
# Comment out if not needed - reduces layer size
RUN apk add --no-cache python3 make g++

# Copy npm configuration FIRST (stable layer)
COPY .npmrc ./

# Copy package files (before source code)
COPY package*.json ./

# Install ALL dependencies (including dev for build)
# .npmrc handles cloudinary peer dependency resolution
RUN npm ci --include=optional

# Copy source code
COPY . .

# Run TypeScript compilation with optimized settings
RUN npm run build

# Verify build output
RUN test -d dist && echo "✓ Build successful" || exit 1

# ============================================
# STAGE 2: RUNTIME
# ============================================
FROM node:20-alpine

LABEL maintainer="MLA-Backend Team"
LABEL description="Enterprise Smart Grievance Management System API"
LABEL version="1.0.0"

WORKDIR /app

# Create non-root user for security (principle of least privilege)
# This prevents container from running as root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    mkdir -p /app/uploads /app/logs && \
    chown -R nodejs:nodejs /app

# Copy npm configuration for consistency
COPY .npmrc ./

# Copy production package files
COPY package*.json ./

# Install ONLY production dependencies (no dev tools)
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy compiled application from builder stage
COPY --from=builder --chown=nodejs:nodejs /build/dist ./dist

# Copy essential configuration files
COPY --chown=nodejs:nodejs tsconfig.json ./
COPY --chown=nodejs:nodejs src/config src/config

# Create directories with proper ownership
RUN mkdir -p uploads && \
    chown -R nodejs:nodejs uploads

# Switch to non-root user
USER nodejs

# Expose application port
EXPOSE 5000

# Environment defaults (override via docker-compose or environment variables)
ENV NODE_ENV=production \
    PORT=5000 \
    NODE_OPTIONS="--max-old-space-size=512"

# HEALTHCHECK: Verify application is responding
# Uses Node.js HTTP client (no external dependencies)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => { \
    if (r.statusCode === 200) process.exit(0); \
    else process.exit(1); \
  }).on('error', (e) => { \
    console.error('Health check failed:', e.message); \
    process.exit(1); \
  }).setTimeout(4000);"

# Start application with proper signal handling
# Using exec form ensures signals (SIGTERM) are properly handled
CMD ["node", "dist/app.js"]
