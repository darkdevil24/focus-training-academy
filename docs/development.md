# Development Guide

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose
- mkcert (for HTTPS development)
- Python 3.11+ (for AI service)

### Quick Setup

1. **Run the setup script:**
   ```bash
   npm run setup
   ```

2. **Set up HTTPS certificates:**
   ```bash
   npm run setup:https
   ```

3. **Start the development environment:**
   ```bash
   # Start database services
   npm run docker:up
   
   # Start development servers with HTTPS
   npm run dev:https
   ```

### Manual Setup

If you prefer to set up manually:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Copy environment file:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up HTTPS certificates:**
   ```bash
   # Install mkcert first (see README.md for platform-specific instructions)
   mkcert -install
   mkcert -key-file certs/localhost-key.pem -cert-file certs/localhost.pem localhost 127.0.0.1 ::1
   ```

4. **Start services:**
   ```bash
   # Start database services
   docker-compose up -d
   
   # Start development servers
   npm run dev:https
   ```

## Development Workflow

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e
```

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

### Database Operations

```bash
# Run migrations
npm run db:migrate

# Rollback migration
npm run db:rollback

# Seed test data
npm run db:seed

# Create new migration
npm run db:migration:create <migration_name>
```

### Docker Commands

```bash
# Start all services
npm run docker:up

# Stop all services
npm run docker:down

# View logs
npm run docker:logs
```

## Project Structure

The project follows a monorepo structure with separate packages for different services:

- `packages/frontend/` - React web application
- `packages/api-gateway/` - GraphQL API gateway
- `packages/auth-service/` - Authentication service
- `packages/kiro-ai-service/` - AI coaching service (Python)
- `packages/shared/` - Shared types and utilities

## Environment Variables

Key environment variables you need to configure:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing secret
- OAuth provider credentials (Google, Microsoft, Apple, Meta)
- `FRONTEND_URL` - Frontend application URL (https://localhost:3000)

## HTTPS Development

HTTPS is required for OAuth testing and biometric features. The setup script will:

1. Install mkcert local CA
2. Generate SSL certificates for localhost
3. Configure Vite to use HTTPS in development

## Troubleshooting

### Common Issues

1. **Port conflicts**: Make sure ports 3000, 4000, 4001, 5432, 6379, 8001 are available
2. **SSL certificate errors**: Run `npm run setup:https` to regenerate certificates
3. **Docker issues**: Ensure Docker is running and you have sufficient permissions
4. **Node version**: Ensure you're using Node.js 18 or higher

### Getting Help

- Check the [README.md](../README.md) for general information
- Review the [API documentation](./api.md) for GraphQL schema details
- Join our Discord community for support