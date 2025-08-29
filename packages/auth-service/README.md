# Authentication Service

The Authentication Service provides OAuth 2.0 authentication, JWT token management, and multi-factor authentication for the Focus Training Academy platform.

## Features

- **OAuth 2.0 Integration**: Support for Google, Microsoft, Facebook, and Apple
- **JWT Token Management**: Access and refresh token generation and validation
- **Multi-Factor Authentication**: TOTP-based MFA for admin accounts
- **Role-Based Access Control**: Admin and user role management
- **Security**: Rate limiting, HTTPS enforcement, and comprehensive error handling

## Setup

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Server Configuration
PORT=3001
BASE_URL=https://localhost:3001
FRONTEND_URL=https://localhost:3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=focus_academy
DB_USER=postgres
DB_PASSWORD=password

# OAuth Provider Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
# ... other OAuth providers
```

### OAuth Provider Setup

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add redirect URI: `https://localhost:3001/auth/google/callback`

#### Microsoft OAuth
1. Go to [Azure Portal](https://portal.azure.com/)
2. Register a new application
3. Add redirect URI: `https://localhost:3001/auth/microsoft/callback`
4. Generate client secret

#### Facebook OAuth
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Add redirect URI: `https://localhost:3001/auth/facebook/callback`

#### Apple OAuth
1. Go to [Apple Developer](https://developer.apple.com/)
2. Create App ID and Service ID
3. Generate private key
4. Add redirect URI: `https://localhost:3001/auth/apple/callback`

### Installation

```bash
npm install
```

### Database Setup

```bash
# Run migrations
npm run migrate

# For development with Docker
docker-compose up -d postgres redis
```

## Usage

### Starting the Service

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### API Endpoints

#### OAuth Authentication

```bash
# Initiate OAuth flow
GET /auth/google
GET /auth/microsoft
GET /auth/facebook
GET /auth/apple

# OAuth callbacks (handled automatically)
GET /auth/google/callback
GET /auth/microsoft/callback
GET /auth/facebook/callback
GET /auth/apple/callback
```

#### Token Management

```bash
# Refresh access token
POST /auth/refresh
Content-Type: application/json
{
  "refreshToken": "your-refresh-token"
}

# Validate token
POST /auth/validate
Content-Type: application/json
{
  "token": "your-access-token"
}

# Get current user
GET /auth/me
Authorization: Bearer your-access-token

# Logout
POST /auth/logout
Authorization: Bearer your-access-token
```

#### Multi-Factor Authentication (Admin Only)

```bash
# Setup MFA
POST /mfa/setup
Authorization: Bearer admin-access-token

# Enable MFA
POST /mfa/enable
Authorization: Bearer admin-access-token
Content-Type: application/json
{
  "token": "123456"
}

# Verify MFA token
POST /mfa/verify
Authorization: Bearer admin-access-token
Content-Type: application/json
{
  "token": "123456"
}

# Get MFA status
GET /mfa/status
Authorization: Bearer admin-access-token

# Disable MFA
POST /mfa/disable
Authorization: Bearer admin-access-token
Content-Type: application/json
{
  "token": "123456"
}

# Regenerate backup codes
POST /mfa/backup-codes/regenerate
Authorization: Bearer admin-access-token
Content-Type: application/json
{
  "token": "123456"
}
```

## Testing

```bash
# Run all tests
npm test

# Run unit tests only
npx jest --selectProjects unit

# Run integration tests only
npx jest --selectProjects integration

# Run with coverage
npm run test:coverage
```

## Security Features

### HTTPS Enforcement
- All OAuth callbacks require HTTPS
- Local development uses mkcert for SSL certificates
- Production enforces TLS 1.3

### Rate Limiting
- 100 requests per 15 minutes per IP
- Configurable limits for different endpoints

### Token Security
- JWT tokens with configurable expiration
- Refresh token rotation
- Token replay attack prevention for MFA

### MFA Security
- TOTP-based authentication using speakeasy
- Backup codes for recovery
- Admin-only access requirement
- Token reuse prevention

## Architecture

### Database Schema

```sql
-- Users table (from api-gateway)
users (id, email, oauth_provider, oauth_id, organization_id, subscription_tier, ...)

-- Roles and permissions
roles (id, name, description)
permissions (id, name, resource, action, description)
role_permissions (role_id, permission_id)
user_roles (user_id, role_id)

-- MFA
user_mfa (id, user_id, secret, backup_codes, is_enabled)
```

### Service Dependencies

- **PostgreSQL**: User data and authentication state
- **Redis**: Session storage and token caching
- **External OAuth Providers**: Google, Microsoft, Facebook, Apple

## Error Handling

The service implements comprehensive error handling:

- **4xx Errors**: Client errors (authentication, validation)
- **5xx Errors**: Server errors (database, external services)
- **Circuit Breaker**: Prevents cascade failures
- **Retry Logic**: Exponential backoff for transient failures

## Monitoring

- **Health Check**: `GET /health`
- **Structured Logging**: Winston with JSON format
- **Metrics**: Request/response times, error rates
- **Alerts**: Failed authentication attempts, service outages

## Development

### Adding New OAuth Providers

1. Install provider-specific Passport strategy
2. Add configuration in `src/config/passport.ts`
3. Add routes in `src/routes/auth.ts`
4. Update environment variables
5. Add tests

### Extending MFA

1. Implement new MFA method in `src/services/mfa-service.ts`
2. Add API endpoints in `src/routes/mfa.ts`
3. Update database schema if needed
4. Add comprehensive tests

## Deployment

### Docker

```bash
# Build image
docker build -t focus-academy/auth-service .

# Run container
docker run -p 3001:3001 --env-file .env focus-academy/auth-service
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
      - name: auth-service
        image: focus-academy/auth-service:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        # ... other environment variables
```

## Contributing

1. Follow TypeScript strict mode
2. Maintain 90% test coverage
3. Use conventional commits
4. Update documentation for API changes
5. Security review for authentication changes