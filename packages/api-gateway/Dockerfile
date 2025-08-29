FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/api-gateway/package*.json ./packages/api-gateway/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY packages/api-gateway ./packages/api-gateway
COPY packages/shared ./packages/shared

# Build shared package
WORKDIR /app/packages/shared
RUN npm run build

# Build api-gateway
WORKDIR /app/packages/api-gateway
RUN npm run build

EXPOSE 4000

CMD ["npm", "start"]