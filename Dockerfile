FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and build the SSR application
COPY . .
RUN npm run build

EXPOSE 3000

# Boot the Express server in production mode
ENV NODE_ENV=production
CMD ["node", "server.js"]