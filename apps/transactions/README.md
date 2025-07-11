# Transaction Service

The Transaction Service is the core processing engine of the PEMO payment processing system. It handles transaction persistence, event processing, card utilization management, and provides gRPC endpoints for internal service communication.

## 🎯 Purpose

- **Transaction Processing**: Core logic for authorization and clearing transactions
- **Event Handling**: Process transaction events and trigger downstream actions
- **Card Management**: Calculate and update card utilization and balances
- **Data Persistence**: Manage transaction and card data in PostgreSQL
- **Queue Processing**: Handle background job processing with BullMQ

## 🏗️ Architecture

```
┌─────────────────┐
│  Gateway Service│
└─────────┬───────┘
          │ gRPC
┌─────────▼───────┐    ┌─────────────────┐    ┌─────────────────┐
│ Transaction     │    │    BullMQ       │    │   PostgreSQL    │
│ gRPC Service    │◄──►│    Queue        │    │   Database      │
└─────────┬───────┘    └─────────────────┘    └─────────────────┘
          │
┌─────────▼───────┐
│ Transaction     │
│ Processing      │
│ Service         │
└─────────┬───────┘
          │ Events
┌─────────▼───────┐    ┌─────────────────┐
│ Event Handlers  │    │  Card Service   │
│ - Authorization │◄──►│ - Utilization   │
│ - Clearing      │    │ - Balance Mgmt  │
└─────────────────┘    └─────────────────┘
```

## 🚀 Features

### Transaction Processing
- **Authorization Handling**: Process payment authorization requests
- **Clearing Processing**: Handle payment clearing and settlement
- **Transaction Correlation**: Link authorization and clearing transactions
- **Duplicate Prevention**: Ensure idempotent transaction processing

### Event-Driven Architecture
- **Async Processing**: Background event handling with BullMQ
- **Event Types**: Support for authorization, clearing, notification, and analytics events
- **Event Persistence**: Complete audit trail of all transaction events
- **Error Recovery**: Retry mechanisms for failed event processing

### Card Management
- **Balance Calculations**: Real-time card balance and utilization updates
- **Credit Limits**: Enforce card credit limits and calculate available credit
- **Race Condition Prevention**: Use SELECT FOR UPDATE for data consistency
- **Utilization Tracking**: Monitor card utilization percentages

### Data Management
- **ACID Compliance**: Ensure data consistency with database transactions
- **Schema Evolution**: Support for database migrations and schema changes
- **Query Optimization**: Efficient queries with proper indexing
- **Data Validation**: Comprehensive validation at all layers

## 📁 Project Structure

```
src/
├── app/
│   ├── models/
│   │   ├── transaction.model.ts           # Transaction entity
│   │   ├── card.model.ts                  # Card entity
│   │   ├── transaction-event.model.ts     # Event entity
│   │   └── index.ts
│   ├── transactions/
│   │   ├── controllers/
│   │   │   ├── transactions-grpc.controller.ts  # gRPC endpoints
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── transactions-processing.service.ts  # Core processing
│   │   │   ├── transactions-grpc.service.ts       # gRPC service
│   │   │   ├── transaction-query.service.ts       # Query service
│   │   │   └── index.ts
│   │   ├── job-processors/
│   │   │   ├── transactions-job.processor.ts      # Queue processing
│   │   │   └── index.ts
│   │   ├── constants/
│   │   │   ├── queues.constants.ts
│   │   │   └── index.ts
│   │   └── transactions.module.ts
│   ├── events/
│   │   ├── handlers/
│   │   │   ├── authorization-event.handler.ts     # Authorization events
│   │   │   ├── clearing-event.handler.ts          # Clearing events
│   │   │   └── index.ts
│   │   ├── constants/
│   │   │   ├── card-limit.constant.ts
│   │   │   └── index.ts
│   │   └── event.module.ts
│   └── app.module.ts
├── main.ts
└── assets/
```

## 🗄️ Database Schema

### Core Tables

#### Transactions Table
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processor_id VARCHAR(255) NOT NULL,
  processor_name VARCHAR(255) NOT NULL,
  transaction_correlation_id VARCHAR(255) NOT NULL,
  authorization_transaction_id VARCHAR(255) NOT NULL,
  clearing_transaction_id VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL,
  auth_amount DECIMAL(19,4) NOT NULL,
  clearing_amount DECIMAL(19,4),
  currency VARCHAR(3) NOT NULL,
  mcc VARCHAR(255) NOT NULL,
  card_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  reference_number VARCHAR(255) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(transaction_correlation_id, processor_id)
);
```

#### Cards Table
```sql
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id VARCHAR(255) UNIQUE NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  credit_limit DECIMAL(19,4) DEFAULT 0,
  available_credit DECIMAL(19,4) DEFAULT 0,
  settled_balance DECIMAL(19,4) DEFAULT 0,
  pending_balance DECIMAL(19,4) DEFAULT 0,
  current_utilization DECIMAL(19,4) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Transaction Events Table
```sql
CREATE TABLE transaction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id),
  event_type VARCHAR(100) NOT NULL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Pending Clearing Transactions Table
```sql
CREATE TABLE pending_clearing_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processor_id VARCHAR(255) NOT NULL,
  transaction_correlation_id VARCHAR(255) NOT NULL,
  transaction_data JSONB NOT NULL,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(transaction_correlation_id, processor_id)
);
```

### Database Migrations

```bash
# Create new migration
npx sequelize-cli migration:generate --name add-new-column

# Run migrations
npx sequelize-cli db:migrate

# Rollback migration
npx sequelize-cli db:migrate:undo
```

## 🔧 Configuration

### Environment Variables

```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/pemo_transactions
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=pemo_user
DB_PASSWORD=secure_password
DB_DATABASE=pemo_transactions

# Redis Configuration (BullMQ)
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# gRPC Configuration
GRPC_PORT=50051

# Application Configuration
NODE_ENV=production
LOG_LEVEL=info

# Card Configuration
DEFAULT_CARD_LIMIT=10000
```

### NestJS Configuration

```typescript
// app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    SequelizeModule.forRoot({
      dialect: 'postgres',
      url: process.env.DATABASE_URL,
      models: [Transaction, Card, TransactionEvent],
      logging: false,
    }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
      },
    }),
    EventEmitterModule.forRoot(),
    TransactionsModule,
    EventModule,
  ],
})
export class AppModule {}
```

## 🚀 Development

### Running the Service

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod

# Using Nx
npx nx serve transactions
```

### Database Setup

```bash
# Run migrations
npx nx db:migrate transactions

# Seed data (if available)
npx nx db:seed transactions

# Reset database
npx nx db:reset transactions
```

### Testing

```bash
# Unit tests
npm run test

# Integration tests
npm run test:e2e

# Test coverage
npm run test:cov

# Using Nx
npx nx test transactions
```

## 🔄 Transaction Processing Flow

### Authorization Transaction Flow

1. **Request Reception**: Receive transaction data via gRPC
2. **Validation**: Validate transaction data and business rules
3. **Persistence**: Create or update transaction record
4. **Event Emission**: Emit authorization event for async processing
5. **Queue Processing**: Add job to processing queue
6. **Card Processing**: Calculate and update card utilization
7. **Notification**: Send cardholder notification event
8. **Audit Trail**: Create transaction event records

### Clearing Transaction Flow

1. **Request Reception**: Receive clearing data via gRPC
2. **Transaction Lookup**: Find corresponding authorization transaction
3. **Out-of-Order Handling**: If authorization not found, store as pending clearing transaction
4. **Validation**: Validate clearing amount and transaction state
5. **Update**: Update transaction with clearing information
6. **Event Emission**: Emit clearing event for async processing
7. **Balance Update**: Update card settled and pending balances
8. **Analytics**: Send analytics event for reporting
9. **Completion**: Mark transaction as settled

#### Out-of-Order Transaction Processing

The system handles the critical edge case where clearing transactions arrive before their corresponding authorization transactions:

**Problem**: In distributed payment processing systems, transaction ordering cannot be guaranteed. Clearing transactions may arrive before authorization transactions, causing processing failures.

**Solution**: Pending Clearing Transaction mechanism that:

1. **Stores Orphaned Clearings**: When a clearing transaction arrives without a corresponding authorization, it's stored in the `pending_clearing_transactions` table
2. **Automatic Processing**: When the authorization transaction arrives, the system automatically processes any pending clearing transactions for that correlation ID
3. **Expiration Handling**: Pending clearing transactions expire after 24 hours and are automatically cleaned up
4. **Retry Logic**: Failed processing attempts are tracked with retry counts

**Implementation Details**:
```typescript
// When clearing arrives before authorization
if (!pendingTransaction) {
  await this.storePendingClearingTransaction(data, t);
  return; // Don't throw error, store for later
}

// When authorization is processed, check for pending clearings
setImmediate(async () => {
  await this.processPendingClearingTransactions(
    data.transactionCorrelationId,
    data.processorId,
  );
});
```

**Database Schema**:
```sql
CREATE TABLE pending_clearing_transactions (
  id UUID PRIMARY KEY,
  processor_id VARCHAR(255) NOT NULL,
  transaction_correlation_id VARCHAR(255) NOT NULL,
  transaction_data JSONB NOT NULL,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(transaction_correlation_id, processor_id)
);
```

**Background Cleanup**: A scheduled job runs every hour to remove expired pending clearing transactions, preventing storage bloat and maintaining system performance.

## 📊 Event Processing

### Event Types

```typescript
enum TransactionEventType {
  AUTHORIZATION_TRANSACTION_PROCESSED = 'AUTHORIZATION_TRANSACTION_PROCESSED',
  CLEARING_TRANSACTION_PROCESSED = 'CLEARING_TRANSACTION_PROCESSED',
  AUTHORIZATION_EVENT_HANDLED = 'AUTHORIZATION_EVENT_HANDLED',
  CLEARING_EVENT_HANDLED = 'CLEARING_EVENT_HANDLED',
  CARDHOLDER_NOTIFIED = 'CARDHOLDER_NOTIFIED',
  ANALYTICS_SENT = 'ANALYTICS_SENT'
}
```

### Event Handlers

#### Authorization Event Handler
```typescript
@Injectable()
export class AuthorizationEventHandler {
  @OnEvent(`transaction.${TransactionType.AUTHORIZATION}`)
  async handleAuthorizationEvent(transaction: Transaction): Promise<void> {
    await this.sequelize.transaction(async (t) => {
      // Calculate card utilization
      await this.calculateCardUtilization(transaction, t);
      
      // Send cardholder notification
      await this.sendCardholderNotification(transaction, t);
      
      // Create audit events
      await this.createEventRecords(transaction, t);
    });
  }
}
```

#### Clearing Event Handler
```typescript
@Injectable()
export class ClearingEventHandler {
  @OnEvent(`transaction.${TransactionType.CLEARING}`)
  async handleClearingEvent(transaction: Transaction): Promise<void> {
    await this.sequelize.transaction(async (t) => {
      // Update card balances
      await this.updateCardUtilization(transaction, t);
      
      // Send analytics event
      await this.sendAnalyticsEvent(transaction, t);
      
      // Create audit events
      await this.createEventRecords(transaction, t);
    });
  }
}
```

## 🎯 Queue Processing

### Job Configuration

```typescript
// Queue configuration
const queueConfig = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: false,
  removeOnFail: false,
  deduplication: {
    id: `${data.type}-${data.processorId}-${data.transactionCorrelationId}`,
  },
};
```

### Job Processor

```typescript
@Processor(TRANSACTIONS_PROCESSING_QUEUE)
export class TransactionJobProcessor {
  @Process('process-transaction')
  async processTransaction(job: Job<ITransactionDetails>): Promise<void> {
    const { data } = job;
    
    try {
      if (data.type === TransactionType.AUTHORIZATION) {
        await this.transactionService.processAuthorizationTransaction(data);
      } else if (data.type === TransactionType.CLEARING) {
        await this.transactionService.processClearingTransaction(data);
      }
    } catch (error) {
      this.logger.error(`Job processing failed: ${error.message}`, error.stack);
      throw error; // Let BullMQ handle retries
    }
  }
}
```

## 🛡️ Data Integrity & Race Conditions

### Pessimistic Locking

```typescript
// Prevent race conditions with SELECT FOR UPDATE
const card = await this.cardModel.findOne({
  where: { cardId: transaction.cardId },
  lock: dbTransaction.LOCK.UPDATE,
  transaction: dbTransaction,
});
```

### Transaction Deduplication

```typescript
// Prevent duplicate transactions
const [transaction, isNew] = await this.transactionModel.findOrCreate({
  where: {
    transactionCorrelationId: data.transactionCorrelationId,
    processorId: data.processorId,
  },
  defaults: { /* transaction data */ },
  transaction: dbTransaction,
});

if (!isNew) {
  this.logger.warn('Duplicate transaction detected');
  return; // Idempotent handling
}
```

### Balance Calculations

```typescript
// Atomic balance updates
const newSettledBalance = Number(card.settledBalance) + transaction.authAmount;
const newPendingBalance = Number(card.pendingBalance) - transaction.authAmount;
const newAvailableCredit = Number(card.creditLimit) - newSettledBalance - newPendingBalance;
const newUtilization = ((newSettledBalance + newPendingBalance) / Number(card.creditLimit)) * 100;

await card.update({
  settledBalance: newSettledBalance,
  pendingBalance: newPendingBalance,
  availableCredit: newAvailableCredit,
  currentUtilization: newUtilization,
}, { transaction: dbTransaction });
```

## 📊 Monitoring & Observability

### Health Checks

```typescript
@Controller('health')
export class HealthController {
  @Get()
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.pingCheck('redis'),
    ]);
  }
}
```

### Metrics

- **Transaction Metrics**: Processing rates, success rates, error rates
- **Queue Metrics**: Job processing times, queue depths, failure rates
- **Database Metrics**: Connection pool usage, query performance
- **Card Metrics**: Utilization distributions, limit breaches

### Logging

```typescript
// Structured logging with correlation IDs
this.logger.log('Processing authorization transaction', {
  transactionId: transaction.id,
  cardId: transaction.cardId,
  amount: transaction.authAmount,
  processorId: transaction.processorId,
});
```

## 🚀 Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 50051
CMD ["node", "dist/main.js"]
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: transaction-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: transaction-service
  template:
    metadata:
      labels:
        app: transaction-service
    spec:
      containers:
      - name: transactions
        image: pemo/transactions:latest
        ports:
        - containerPort: 50051
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secrets
              key: url
        - name: REDIS_URL
          value: "redis://redis-service:6379"
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

## 🔧 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database connectivity
npx sequelize-cli db:migrate:status

# Test connection
npx nx test:db transactions
```

#### Queue Processing Issues
```bash
# Check Redis connectivity
redis-cli ping

# Monitor queue status
npx nx queue:status transactions
```

#### Transaction Processing Errors
```bash
# Check logs for specific transaction
npx nx logs:transaction <transaction-id>

# Monitor event processing
npx nx events:status
```

The Transaction Service provides the robust core processing capabilities needed for a scalable payment processing system, with comprehensive event handling, data integrity measures, and monitoring capabilities.