FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
# Install app dependencies (including dev for build)
RUN apk add --no-cache python3 make g++ curl

# Install npm deps
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove devDependencies to keep image slim
RUN npm prune --production

# Create runtime directories
RUN mkdir -p /app/uploads /app/logs

# Expose port
EXPOSE 5000

# Healthcheck uses curl
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:5000/health || exit 1

# Start the compiled application
CMD ["node", "dist/app.js"]
