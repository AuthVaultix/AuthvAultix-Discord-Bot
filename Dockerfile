FROM node:20-alpine AS builder

# Install build tools required by native better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine

WORKDIR /app

# Copy production node_modules with prebuilt better-sqlite3 binaries
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY . .

# Run as non-root user for security
USER node

CMD ["node", "index.js"]
