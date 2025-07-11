# PEMO Task - Payment Processing System

A scalable payment processing system built with NestJS and Nx monorepo, designed to handle multi-processor payment transactions through pluggable adapters with event-driven architecture, background queue processing, and secure microservices communication.

## 📋 Table of Contents

- [System Overview](#-system-overview)
- [Documentation](#-documentation)
- [Quick Start](#-quick-start)
- [Environment Configuration](#-environment-configuration)
- [Development](#-development)
- [API Reference](#-api-reference)
- [Deployment](#-deployment)

## 🏗️ System Overview

PEMO Task implements a comprehensive payment processing system that handles authorization and clearing transactions from multiple payment processors. The system uses a microservices architecture with the following key components:

### Core Services
- **Gateway Service** (Port 3000): HTTP API gateway for external webhooks and transaction queries
- **Transactions Service** (gRPC): Internal microservice for transaction processing and data persistence

### Shared Libraries
- **Processor Adapter Manager**: Plugin system for payment processor integrations
- **Processor One Adapter**: SHA256 signature verification adapter
- **Processor Two Adapter**: RSA decryption and API key verification adapter
- **Shared Types**: Common interfaces, enums, and type definitions
- **Shared Utilities**: Cryptographic services and common utilities

### Infrastructure
- **Database**: PostgreSQL with Sequelize ORM
- **Queue System**: BullMQ with Redis for async processing
- **Communication**: gRPC for inter-service communication
- **Security**: Rate limiting, signature verification, and request validation

## 📚 Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[Design Documentation](docs/DESIGN_DOCUMENTATION.md)** - System architecture, patterns, and design decisions
- **[Class Diagrams](docs/CLASS_DIAGRAM.md)** - Visual representation of system components and relationships
- **[Sequence Diagrams](docs/SEQUENCE_DIAGRAMS.md)** - Transaction processing flows and interactions
- **[API Documentation](docs/API_DOCUMENTATION.md)** - Complete REST and gRPC API reference

### Service Documentation
- **[Gateway Service](apps/gateway/README.md)** - API gateway implementation details
- **[Transactions Service](apps/transactions/README.md)** - Core transaction processing service
- **[Shared Utilities](libs/shared-utilities/README.md)** - Common utilities and security services

## 🚀 Key Features

- **Multi-Processor Support**: Pluggable adapter architecture supporting unlimited payment processors
- **Secure Processing**: Signature verification, API key validation, and request encryption/decryption
- **Event-Driven Architecture**: Asynchronous transaction processing with event handlers
- **Credit Management**: Real-time card utilization tracking with race condition protection
- **Scalable Design**: Microservices with gRPC communication and background queue processing
- **Comprehensive Testing**: Unit tests covering validation, processing, and integration scenarios

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

## 🏃‍♂️ Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- pnpm (recommended) or npm

### Installation

1. **Clone and Install**:
```bash
git clone <repository-url>
cd pemo-task
pnpm install
```

2. **Environment Setup**:
```bash
cp .env.example .env
# Edit .env with your configuration (see Environment Configuration section)
```

3. **Database Setup**:
```bash
# Start PostgreSQL and Redis services
# Run database migrations
cd apps/transactions
npx sequelize-cli db:migrate
```

4. **Start Services**:
```bash
# Start both services in parallel
npx nx run-many --target=serve --projects=gateway,transactions --parallel=true

# Or start individually
npx nx serve gateway      # Port 3000
npx nx serve transactions # gRPC port from TRANSACTIONS_GRPC_URL
```

5. **Verify Installation**:
```bash
# Check gateway health
curl http://localhost:3000/health

# Check API documentation
open http://localhost:3000/api-docs
```

## ⚙️ Environment Configuration

The system requires several environment variables. Copy `.env.example` to `.env` and configure:

### Required Configuration

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=pemo_task

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Service Configuration
TRANSACTIONS_GRPC_URL=0.0.0.0:50052
NODE_ENV=development
GATEWAY_PORT=3000

# Rate Limiting
THROTTLE_TTL_MS=60000
THROTTLE_LIMIT=100

# Processor One Configuration (Base64 encoded)
PROCESSOR_ONE_PUBLIC_KEY_BASE64=your_base64_encoded_public_key

# Processor Two Configuration (Base64 encoded)
PROCESSOR_TWO_DECRYPTION_PRIVATE_KEY_BASE64=your_base64_private_key
PROCESSOR_TWO_SIGNATURE_VERIFICATION_PUBLIC_KEY_BASE64=your_base64_public_key
PROCESSOR_TWO_API_KEY=your_processor_two_api_key
```

### Environment Variable Details

- **TRANSACTIONS_GRPC_URL**: gRPC server endpoint for inter-service communication
- **NODE_ENV**: Environment mode (development, staging, production)
- **PROCESSOR_*_PUBLIC_KEY_BASE64**: Base64-encoded public keys for signature verification
- **PROCESSOR_TWO_DECRYPTION_PRIVATE_KEY_BASE64**: RSA private key for payload decryption
- **THROTTLE_***: Rate limiting configuration for API endpoints

## 🔧 Development

### Development Commands

```bash
# Start services in development mode
npx nx serve gateway           # API Gateway on port 3000
npx nx serve transactions      # gRPC service

# Build for production
npx nx build gateway
npx nx build transactions

# Run all services in parallel
npx nx run-many --target=serve --projects=gateway,transactions --parallel=true
```

### Testing

```bash
# Run all tests
npx nx test

# Run tests for specific projects
npx nx test gateway
npx nx test transactions
npx nx test processor-one-adapter
npx nx test processor-two-adapter
npx nx test shared-utilities

# Run tests with coverage
npx nx test gateway --coverage
```

### Code Quality

```bash
# Lint all projects
npx nx lint

# Format code
npx nx format:write

# Type checking
npx nx run-many --target=typecheck
```

## 📖 API Reference

### Gateway REST API

**Base URL**: `http://localhost:3000`

#### Webhook Endpoints
```http
POST /gateway/webhook/{processorId}
Content-Type: application/json
Authorization: Bearer <processor-specific-auth>

# Process payment processor webhooks
# Returns: 202 Accepted (async processing)
```

#### Transaction Query
```http
GET /gateway/transactions?page=1&limit=10&status=PENDING
Authorization: Bearer <auth-token>

# Query transactions with pagination and filtering
# Returns: Paginated transaction list
```

#### Health Check
```http
GET /health

# System health status
# Returns: 200 OK with service status
```

### gRPC API

**Service**: `transactions.TransactionsService`
**Endpoint**: Configured via `TRANSACTIONS_GRPC_URL`

```protobuf
// Process incoming transaction
rpc ProcessTransaction(TransactionProcessingRequest) returns (ProcessTransactionResponse);

// Query transactions
rpc GetTransactions(GetTransactionsRequest) returns (GetTransactionsResponse);
```

For complete API documentation with request/response schemas, see [API Documentation](docs/API_DOCUMENTATION.md).

## 🚀 Deployment

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Build individual services
docker build -t pemo-gateway -f apps/gateway/Dockerfile .
docker build -t pemo-transactions -f apps/transactions/Dockerfile .
```

### Production Environment

```bash
# Set production environment
NODE_ENV=production

# Build production artifacts
npx nx build gateway --prod
npx nx build transactions --prod

# Run production builds
node dist/apps/gateway/main.js
node dist/apps/transactions/main.js
```

### Database Migrations in Production

```bash
# Run migrations before deployment
cd apps/transactions
NODE_ENV=production npx sequelize-cli db:migrate
```

## 🔧 System Architecture

### Transaction Processing Flow

1. **Webhook Receipt**: Payment processor sends webhook to gateway
2. **Authentication**: Signature verification and request validation
3. **Queue Processing**: Transaction queued for async processing
4. **Adapter Processing**: Processor-specific parsing and validation
5. **Database Storage**: Transaction persistence with correlation
6. **Event Emission**: Authorization/clearing events triggered
7. **Card Management**: Credit utilization calculations
8. **Notifications**: Cardholder and analytics events

### Database Schema

**Transactions Table**:
- Unique constraint on `[transaction_correlation_id, processor_id]`
- Support for both authorization and clearing transaction types
- JSONB metadata for processor-specific fields

**Cards Table**:
- Real-time credit utilization tracking
- Race condition protection with database locks
- Automatic card creation on first transaction

**Transaction Events Table**:
- Audit trail for all transaction events
- Event data stored as JSONB for flexibility

## 🔐 Security Features

- **Webhook Security**: SHA256/RSA signature verification for all processors
- **Rate Limiting**: Redis-backed throttling with configurable limits
- **Input Validation**: Comprehensive request validation with Zod schemas
- **Type Safety**: Full TypeScript coverage for compile-time safety
- **Secure Configuration**: Environment-based configuration management
- **Database Security**: SQL injection prevention with Sequelize ORM

## 🧪 Testing Coverage

The system includes comprehensive unit tests covering:

- **Adapter Validation**: Transaction parsing and signature verification
- **Service Logic**: Business logic and error handling
- **Event Handlers**: Authorization and clearing event processing
- **Database Operations**: Transaction correlation and card management
- **Queue Processing**: Background job execution
- **API Endpoints**: Request/response validation
