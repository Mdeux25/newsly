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

# Install backend dependencies
COPY backend/package*.json ./
RUN npm install --production

# Copy backend code
COPY backend/ ./

# Copy built frontend from stage 1
COPY --from=frontend-build /app/frontend/dist ./public

# Expose port
EXPOSE 3001

# Set environment to production
ENV NODE_ENV=production

# Start the backend server (which will also serve frontend static files)
CMD ["node", "server.js"]
