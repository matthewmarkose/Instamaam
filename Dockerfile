# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with production flag
RUN npm install --omit=dev

# Runtime stage
FROM node:22-alpine

WORKDIR /app

# Copy only production dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy only necessary server files
COPY server.js ./

# Expose the port the server runs on
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production

# Command to run the server
CMD ["node", "server.js"] 