# Focus Training Academy

A gamified web platform that helps adults develop sustained focus skills through science-driven micro-lessons, personalized challenges, and AI-powered coaching.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose
- mkcert (for HTTPS development)
- Python 3.11+ (for AI service)

### Development Setup

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/darkdevil24/focus-training-academy.git
   cd focus-training-academy
   npm install
   ```

2. **Set up HTTPS certificates:**
   ```bash
   node scripts/setup-https.js
   ```

3. **Copy environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development environment:**
   ```bash
   # Start all services with Docker
   npm run docker:up
   
   # Start development servers with HTTPS
   npm run dev:https
   ```

5. **Run database migrations:**
   ```bash
   npm run db:migrate
   ```

The application will be available at:
- Frontend: https://localhost:3000
- API Gateway: https://localhost:4000
- Auth Service: https://localhost:4001
- Kiro AI Service: http://localhost:8001

## 🏗️ Architecture

### Monorepo Structure

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

### Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Zustand
- **Backend**: Node.js, Express, GraphQL (Apollo Server)
- **AI Service**: Python, FastAPI, PyTorch, Transformers
- **Database**: PostgreSQL 15, Redis 7
- **Infrastructure**: Docker, Kubernetes, GitHub Actions

## 🧪 Testing

```bash
# Run all tests
npm test

# Unit tests with coverage
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Security scanning
npm run security:scan
```

## 🔒 Security & Privacy

- **Privacy-First**: All biometric processing occurs client-side
- **Zero Raw Data**: No biometric raw data transmitted or stored
- **Enterprise Security**: TLS 1.3, AES-256 encryption, OAuth 2.0
- **Compliance**: GDPR/CCPA compliant with automated data purging

## 📚 Documentation

- [OAuth Setup Guide](./docs/oauth-setup-guide.md)
- [Development Guide](./docs/development.md)
- [API Documentation](./docs/api.md)
- [Deployment Guide](./docs/deployment.md)
- [Security Guide](./docs/security.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'feat: add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@focustrainingacademy.com or join our [Discord community](https://discord.gg/focus-academy).
