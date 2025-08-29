FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/auth-service/package*.json ./packages/auth-service/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY packages/auth-service ./packages/auth-service
COPY packages/shared ./packages/shared

# Build shared package
WORKDIR /app/packages/shared
RUN npm run build

# Build auth-service
WORKDIR /app/packages/auth-service
RUN npm run build

EXPOSE 4001

CMD ["npm", "start"]