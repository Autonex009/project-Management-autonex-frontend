# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for efficient layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the source code and build the production assets
COPY . .
RUN npm run build

# Stage 2: Serve the production assets using a lightweight runner
FROM node:20-alpine

WORKDIR /app

# Install the lightweight static server globally
RUN npm install -g serve

# Only copy the compiled static assets from the builder stage
COPY --from=builder /app/dist ./dist

# Expose the internal port for the container
EXPOSE 3000

# Serve the build folder on port 3000
CMD ["npx", "serve", "-s", "dist/client", "-l", "3000"]