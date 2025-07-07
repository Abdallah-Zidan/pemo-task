# PEMO Task - Payment Processing System

A comprehensive payment processing system built with NestJS and Nx, designed to handle multi-processor payment transactions with event-driven architecture, queue processing, and microservices communication.

## 🏗️ Architecture Overview

PEMO Task is a modular payment processing system that supports multiple payment processors through a pluggable adapter architecture. The system consists of:

- **Gateway Service**: API gateway for external payment processor webhooks
- **Transactions Service**: Core transaction processing and data management
- **Processor Adapters**: Pluggable adapters for different payment processors
- **Shared Libraries**: Common types, interfaces, and utilities

## 📦 Project Structure

```
pemo-task/
├── apps/
│   ├── gateway/              # API Gateway service
│   ├── transactions/         # Core transaction processing service
│   └── gateway-e2e/          # End-to-end tests
├── libs/
│   ├── shared-types/         # Common types and interfaces
│   ├── processor-adapter-manager/ # Adapter management system
│   ├── processor-one-adapter/    # First payment processor adapter
│   └── processor-two-adapter/    # Second payment processor adapter
├── shared-proto/             # Protocol buffer definitions
└── scratches/               # Development utilities
```

## 🚀 Features

### Core Features
- **Multi-Processor Support**: Pluggable architecture for different payment processors
- **Event-Driven Architecture**: Asynchronous event handling with BullMQ
- **gRPC Communication**: Inter-service communication using Protocol Buffers
- **Database Integration**: PostgreSQL with Sequelize ORM
- **Queue Processing**: Background job processing with Redis
- **Signature Verification**: Secure webhook signature validation

### Payment Processing
- **Authorization Transactions**: Handle payment authorization requests
- **Clearing Transactions**: Process payment clearing and settlement
- **Transaction Correlation**: Link authorization and clearing transactions
- **Event Handling**: Process transaction events and notifications
- **Analytics Integration**: Send transaction data to analytics services

### Developer Experience
- **TypeScript**: Full type safety across the entire system
- **Nx Monorepo**: Efficient development and build tooling
- **Modular Architecture**: Reusable libraries and services
- **Comprehensive Testing**: Unit and integration tests
- **ESLint & Prettier**: Code quality and formatting

## 🛠️ Technology Stack

- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Sequelize
- **Queue**: BullMQ + Redis
- **Communication**: gRPC
- **Validation**: Zod + class-validator
- **Testing**: Jest
- **Build Tool**: Nx
- **Container**: Docker support

## 🏃‍♂️ Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis
- pnpm (recommended)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd pemo-task
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up the database:
```bash
# Run database migrations
cd apps/transactions
npx sequelize-cli db:migrate
```

5. Start the development servers:
```bash
# Start the gateway service
npx nx serve gateway

# Start the transactions service
npx nx serve transactions
```

## 🔧 Development

### Running Services

```bash
# Development mode
npx nx serve gateway          # Gateway service (port 3000)
npx nx serve transactions     # Transactions service (port 3001)

# Production build
npx nx build gateway
npx nx build transactions
```

### Testing

```bash
# Run all tests
npx nx test

# Run tests for specific project
npx nx test gateway
npx nx test transactions
npx nx test shared-types
npx nx test processor-adapter-manager

# Run e2e tests
npx nx test gateway-e2e
```

### Code Quality

```bash
# Lint all projects
npx nx lint

# Format code
npx nx format:write

# Type check
npx nx run-many --target=type-check
```

## 📚 API Documentation

### Gateway Endpoints

- `POST /webhook/processor-one` - Processor One webhook endpoint
- `POST /webhook/processor-two` - Processor Two webhook endpoint  
- `GET /health` - Health check endpoint

### Transaction Processing Flow

1. **Webhook Receipt**: Gateway receives webhook from payment processor
2. **Validation**: Signature verification and payload validation
3. **Processing**: Transaction data parsing and normalization
4. **Storage**: Transaction persistence in database
5. **Events**: Event emission for downstream processing
6. **Queues**: Background job processing for notifications and analytics

## 🔌 Processor Adapters

The system supports multiple payment processors through a pluggable adapter architecture:

### Creating a New Processor Adapter

```typescript
import { Injectable } from '@nestjs/common';
import { ProcessorAdapter, IProcessorAdapter } from '@pemo-task/processor-adapter-manager';
import { ITransactionDetails, Result } from '@pemo-task/shared-types';

@Injectable()
@ProcessorAdapter('my-processor')
export class MyProcessorAdapter implements IProcessorAdapter {
  async validateAndParseTransaction(data: unknown): Promise<Result<ITransactionDetails, string[]>> {
    // Implement validation and parsing logic
  }

  async authorizeTransaction(data: unknown, headers: RequestHeaders): Promise<Result<unknown, string>> {
    // Implement authorization logic
  }
}
```

### Existing Adapters

- **Processor One Adapter**: SHA256 signature verification with custom parsing
- **Processor Two Adapter**: Alternative processor implementation

## 📊 Database Schema

### Core Tables

- **transactions**: Main transaction records
- **cards**: Card information and metadata
- **transaction_events**: Event tracking and audit trail

### Migrations

Database migrations are located in `apps/transactions/db/migrations/`:

```bash
# Create new migration
npx sequelize-cli migration:generate --name migration-name

# Run migrations
npx sequelize-cli db:migrate

# Rollback migration
npx sequelize-cli db:migrate:undo
```

## 🔄 Event Processing

The system uses an event-driven architecture with the following event types:

- `AUTHORIZATION_TRANSACTION_PROCESSED`
- `CLEARING_TRANSACTION_PROCESSED`
- `AUTHORIZATION_EVENT_HANDLED`
- `CLEARING_EVENT_HANDLED`
- `CARDHOLDER_NOTIFIED`
- `ANALYTICS_SENT`

### Event Handlers

Events are processed by dedicated handlers in the transactions service:

```typescript
@OnEvent('AUTHORIZATION_TRANSACTION_PROCESSED')
async handleAuthorizationEvent(payload: ITransactionDetails) {
  // Process authorization event
}
```

## 🚀 Deployment

### Docker

```bash
# Build Docker images
docker build -t pemo-task-gateway -f apps/gateway/Dockerfile .
docker build -t pemo-task-transactions -f apps/transactions/Dockerfile .

# Run with docker-compose
docker-compose up -d
```

### Environment Variables

Required environment variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/pemo_task

# Redis
REDIS_URL=redis://localhost:6379

# Service URLs
GATEWAY_URL=http://localhost:3000
TRANSACTIONS_URL=http://localhost:3001

# Processor Configuration
PROCESSOR_ONE_SECRET=your-secret-key
PROCESSOR_TWO_SECRET=your-secret-key
```

## 📈 Monitoring & Observability

- **Health Checks**: Built-in health check endpoints
- **Logging**: Structured logging with configurable levels
- **Metrics**: Application metrics and performance monitoring
- **Error Tracking**: Comprehensive error handling and reporting

## 🧪 Testing Strategy

### Unit Tests
- Service layer testing
- Adapter testing
- Utility function testing

### Integration Tests
- Database integration
- Queue processing
- Inter-service communication

### End-to-End Tests
- Complete workflow testing
- API endpoint testing
- Error scenario testing

## 🔐 Security

- **Signature Verification**: Webhook signature validation
- **Input Validation**: Comprehensive request validation
- **Type Safety**: TypeScript for compile-time safety
- **Environment Configuration**: Secure configuration management

## 🛣️ Roadmap

- [ ] Additional payment processor adapters
- [ ] Real-time transaction monitoring
- [ ] Enhanced analytics and reporting
- [ ] API rate limiting and throttling
- [ ] Comprehensive logging and audit trails
- [ ] Performance optimization and caching

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes and add tests
4. Ensure all tests pass: `npx nx test`
5. Commit your changes: `git commit -m 'Add my feature'`
6. Push to the branch: `git push origin feature/my-feature`
7. Submit a pull request

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation for new features
- Follow the existing code style
- Use conventional commit messages

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For questions or support:

- Create an issue in the repository
- Check the documentation in individual library README files
- Review the code examples and tests

---

Built with ❤️ using [NestJS](https://nestjs.com/) and [Nx](https://nx.dev/)