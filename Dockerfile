# Multi-stage Dockerfile for News Aggregator

# Stage 1: Build frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Setup backend and serve
FROM node:18-alpine
WORKDIR /app

# Install actual MySQL client (not MariaDB) for migrations
RUN apk add --no-cache mysql-client --repository=http://dl-cdn.alpinelinux.org/alpine/edge/community

# Install backend dependencies
COPY backend/package*.json ./
RUN npm install --production

# Copy backend code
COPY backend/ ./

# Copy built frontend from stage 1
COPY --from=frontend-build /app/frontend/dist ./public

# Make startup script executable
RUN chmod +x /app/start.sh

# Expose port
EXPOSE 3001

# Set environment to production
ENV NODE_ENV=production

# Start with migration script
CMD ["/bin/sh", "/app/start.sh"]
