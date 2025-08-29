# Technology Stack & Development Guidelines

## Architecture
**Microservices-based** cloud-native platform with privacy-first design principles.

## Frontend Stack
- **Framework**: React 18 with TypeScript
- **State Management**: Zustand for lightweight state management
- **UI/Styling**: Tailwind CSS + Headless UI
- **Real-time**: Socket.io client for live features
- **Biometric Processing**: TensorFlow.js + WebAssembly (client-side only)
- **PWA**: Service workers for offline capability

## Backend Stack
- **API Gateway**: Apollo Server (GraphQL) with authentication/rate limiting
- **Services**: Node.js with TypeScript and Express
- **Authentication**: Passport.js with OAuth 2.0 (Google, Microsoft, Apple, Meta)
- **Real-time**: Socket.io server for WebSocket connections
- **AI Service**: Python FastAPI with GPU acceleration for Kiro AI

## Data & Infrastructure
- **Primary Database**: PostgreSQL 15 with read replicas
- **Caching**: Redis 7 for sessions, real-time data, API caching
- **File Storage**: AWS S3 for static assets
- **CDN**: CloudFlare for global delivery and DDoS protection
- **Deployment**: Docker containers on Kubernetes with auto-scaling
- **Monitoring**: DataDog for APM and alerting

## Development Environment
- **HTTPS Required**: Local development must use HTTPS (mkcert) for OAuth testing
- **Containerized**: Docker development environment with PostgreSQL, Redis
- **Monorepo**: Separate packages for frontend, backend services, shared types

## Common Commands

### Development Setup
```bash
# Install dependencies
npm install

# Start development environment with HTTPS
npm run dev:https

# Run database migrations
npm run db:migrate

# Start all services in Docker
docker-compose up -d
```

### Testing
```bash
# Run all tests
npm test

# Unit tests with coverage (target: 90%)
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests with Playwright
npm run test:e2e

# Security scanning
npm run security:scan
```

### Database Operations
```bash
# Create new migration
npm run db:migration:create <name>

# Run migrations
npm run db:migrate

# Rollback migration
npm run db:rollback

# Seed test data
npm run db:seed
```

## Code Quality Standards
- **TypeScript**: Strict mode enabled, no `any` types
- **ESLint + Prettier**: Enforced via pre-commit hooks
- **Test Coverage**: 90% minimum for business logic
- **Security**: OWASP compliance, automated vulnerability scanning

## Performance Requirements
- API response time: < 200ms (95th percentile)
- Database queries: < 50ms average
- Page load time: < 2 seconds first contentful paint
- WebSocket latency: < 100ms

## Privacy & Security
- **Client-side Processing**: All biometric data processed locally with TensorFlow.js
- **Zero Raw Data**: No biometric raw data transmitted or stored
- **Encryption**: TLS 1.3 in transit, AES-256 at rest
- **Compliance**: GDPR/CCPA with automated data purging (30 days for biometric insights)