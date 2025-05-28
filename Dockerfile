# Use Node.js LTS version (recommended for stability)
FROM node:20-alpine AS build

# Create app directory
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
# This layer only changes if dependencies change
COPY package*.json ./

# Install production dependencies only (for smaller image size)
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# --- Start of a new stage for the final, lean image ---
FROM node:20-alpine AS final

WORKDIR /app

# Copy only the necessary files from the build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/server.js ./

# Expose the port the server runs on
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production

# Command to run the server
CMD ["node", "server.js"]