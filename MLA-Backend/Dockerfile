FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
# Install app dependencies (including dev for build)
# RUN apk add --no-cache python3 make g++ curl

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

# SECURITY: Healthcheck using Node instead of curl (curl not available in Alpine)
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:5000/health', (res) => { if (res.statusCode === 200) process.exit(0); else process.exit(1); }).on('error', () => process.exit(1));"

# Start the compiled application
CMD ["node", "dist/app.js"]
