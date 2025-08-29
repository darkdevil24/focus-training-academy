# Project Structure & Organization

## Monorepo Layout
```
focus-training-academy/
├── packages/
│   ├── frontend/           # React web application
│   ├── api-gateway/        # GraphQL API gateway
│   ├── auth-service/       # Authentication & authorization
│   ├── user-service/       # User profiles & preferences
│   ├── challenge-service/  # Challenge engine & sessions
│   ├── kiro-ai-service/    # AI coaching & training plans
│   ├── gamification-service/ # Points, badges, achievements
│   ├── analytics-service/  # Progress tracking & reporting
│   ├── billing-service/    # Subscriptions & payments
│   ├── notification-service/ # Email & push notifications
│   └── shared/             # Shared types & utilities
├── infrastructure/         # Docker, K8s, deployment configs
├── docs/                  # API docs & developer guides
└── scripts/               # Build, test, deployment scripts
```

## Service Architecture Patterns

### Microservices Organization
- **Domain-driven design**: Each service owns its data and business logic
- **API-first**: All services expose GraphQL or REST APIs
- **Event-driven**: Services communicate via Redis pub/sub for async operations
- **Database per service**: Each service has its own PostgreSQL schema

### Frontend Structure
```
packages/frontend/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── auth/         # Authentication components
│   │   ├── challenges/   # Challenge-related UI
│   │   ├── dashboard/    # User dashboard components
│   │   ├── gamification/ # Badges, streaks, progress
│   │   └── common/       # Shared UI components
│   ├── pages/            # Route-level components
│   ├── hooks/            # Custom React hooks
│   ├── store/            # Zustand state management
│   ├── services/         # API client & GraphQL queries
│   ├── utils/            # Helper functions
│   └── types/            # TypeScript type definitions
├── public/               # Static assets
└── tests/                # Component & integration tests
```

### Backend Service Structure
```
packages/[service-name]/
├── src/
│   ├── controllers/      # HTTP request handlers
│   ├── services/         # Business logic layer
│   ├── repositories/     # Data access layer
│   ├── models/           # Data models & validation
│   ├── middleware/       # Authentication, logging, etc.
│   ├── utils/            # Helper functions
│   └── types/            # TypeScript interfaces
├── migrations/           # Database schema migrations
├── seeds/                # Test data seeds
├── tests/                # Unit & integration tests
└── Dockerfile           # Container configuration
```

## Database Schema Organization

### Schema Naming Convention
- `auth_*`: Authentication & authorization tables
- `users_*`: User profiles & preferences
- `challenges_*`: Challenge definitions & sessions
- `gamification_*`: Points, badges, achievements
- `billing_*`: Subscriptions & payment data
- `analytics_*`: Aggregated metrics & reports

### Key Entity Relationships
- **Users** → **UserProfiles** (1:1)
- **Users** → **ChallengeSessions** (1:many)
- **Users** → **Achievements** (many:many)
- **Organizations** → **Users** (1:many)
- **Challenges** → **ChallengeSessions** (1:many)
- **TrainingPlans** → **Challenges** (many:many)

## Configuration Management

### Environment-Specific Configs
- **Development**: `.env.development` with HTTPS localhost URLs
- **Staging**: `.env.staging` with staging domain
- **Production**: `.env.production` with production domain
- **Testing**: `.env.test` with test database

### Service Discovery
- Services register with API gateway on startup
- Health check endpoints for monitoring
- Circuit breaker patterns for resilience

## File Naming Conventions

### TypeScript Files
- **Components**: PascalCase (`UserProfile.tsx`)
- **Hooks**: camelCase with `use` prefix (`useAuth.ts`)
- **Services**: camelCase (`authService.ts`)
- **Types**: PascalCase (`UserProfile.types.ts`)
- **Utils**: camelCase (`dateUtils.ts`)

### Database Files
- **Migrations**: timestamp + description (`20240101_create_users_table.sql`)
- **Seeds**: descriptive name (`users_seed.sql`)

## Import/Export Patterns

### Barrel Exports
```typescript
// src/components/index.ts
export { UserProfile } from './UserProfile'
export { ChallengeCard } from './ChallengeCard'
export { ProgressChart } from './ProgressChart'
```

### Absolute Imports
```typescript
// Use absolute imports from src root
import { UserProfile } from '@/components'
import { useAuth } from '@/hooks'
import { authService } from '@/services'
```

## Testing Organization
- **Unit tests**: Co-located with source files (`*.test.ts`)
- **Integration tests**: `tests/integration/` directory
- **E2E tests**: `tests/e2e/` directory
- **Test utilities**: `tests/utils/` for shared test helpers

## Documentation Structure
- **API docs**: Auto-generated from GraphQL schema
- **Component docs**: Storybook for UI components
- **Architecture docs**: High-level system design
- **Deployment docs**: Infrastructure & deployment guides