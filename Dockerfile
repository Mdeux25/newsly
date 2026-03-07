# Multi-stage Dockerfile for News Aggregator (PostgreSQL)

# Stage 1: Build frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
# VITE_* vars are baked in at build time — pass via --build-arg or docker-compose args
ARG VITE_AD_ENABLED=false
ARG VITE_ADSENSE_CLIENT=ca-pub-7094371363598928
ENV VITE_AD_ENABLED=$VITE_AD_ENABLED
ENV VITE_ADSENSE_CLIENT=$VITE_ADSENSE_CLIENT
RUN npm run build

# Stage 2: Setup backend and serve
FROM node:18-alpine
WORKDIR /app

# Install backend dependencies
COPY backend/package*.json ./
RUN npm install --production

# Copy backend code
COPY backend/ ./

# Copy built frontend from stage 1
COPY --from=frontend-build /app/frontend/dist ./public

# Make startup script executable
RUN chmod +x /app/start.sh

# Render uses PORT=10000 (set via render.yaml); falls back to 3001 for local dev
EXPOSE 10000

# Set environment to production
ENV NODE_ENV=production

# Start with migration script
CMD ["/bin/sh", "/app/start.sh"]
