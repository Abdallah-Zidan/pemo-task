# PEMO Payment Processing System - Design Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Design](#architecture-design)
3. [Core Components](#core-components)
4. [Database Design](#database-design)
5. [Design Patterns & Principles](#design-patterns--principles)
6. [Scalability & Performance](#scalability--performance)
7. [Security & Data Integrity](#security--data-integrity)
8. [Event-Driven Architecture](#event-driven-architecture)
9. [Processor Adapter Architecture](#processor-adapter-architecture)
10. [API Design](#api-design)

## System Overview

PEMO is a comprehensive processing system designed to handle transactions from multiple payment processors through a scalable, event-driven microservices architecture. The system emphasizes modularity, extensibility, and robust transaction processing.

### Key Objectives
- **Multi-Processor Support**: Seamlessly accommodate unlimited payment processors
- **Scalability**: Handle high transaction volumes with horizontal scaling
- **Data Integrity**: Ensure ACID compliance and prevent race conditions
- **Event-Driven Processing**: Asynchronous transaction processing and notifications
- **Modular Architecture**: Pluggable processor adapters and reusable components

### System Boundaries
- **Input**: Payment processor webhooks (HTTP/HTTPS)
- **Processing**: Transaction validation, parsing, persistence, and event handling
- **Output**: Transaction data, notifications, analytics events
- **External Integrations**: Payment processors, notification services, analytics platforms

## Architecture Design

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Payment       │    │   Payment       │    │   Payment       │
│   Processor 1   │    │   Processor 2   │    │   Processor N   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │ Webhooks             │ Webhooks             │ Webhooks
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    Gateway Service      │
                    │   (HTTP1.1 Endpoints)  │
                    │   - Webhook Processing  │
                    │   - Signature Validation│
                    │   - Transaction Query   │
                    └────────────┬────────────┘
                                 │ gRPC
                    ┌────────────▼────────────┐
                    │  Transaction Service    │
                    │   - Transaction Processing│
                    │   - Event Handling      │
                    │   - Background Jobs     │
                    │   - Database Management │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │     PostgreSQL          │
                    │   - Transactions        │
                    │   - Cards               │
                    │   - Transaction Events  │
                    └─────────────────────────┘
```

### Microservices Architecture

The system follows a microservices pattern with two primary services:

1. **Gateway Service**: Public-facing API gateway
2. **Transaction Service**: Core transaction processing engine

### Communication Patterns

- **Synchronous**: gRPC between Gateway and Transaction services
- **Asynchronous**: Event-driven processing with BullMQ
- **External**: HTTP webhooks from payment processors

## Core Components

### 1. Gateway Service

**Responsibilities:**
- Receive webhook requests from payment processors
- Route requests to appropriate processor adapters
- Validate webhook requests
- Validate webhook signatures for security
- Forward transaction data to Transaction Service via gRPC
- Provide transaction query endpoints

**Key Classes:**
```typescript
@Controller('gateway')
export class GatewayController {
  @Post('webhook/:processorId')
  @HttpCode(202)
  handleWebhook(@Param('processorId') processorId: string, @Body() body: unknown, @Headers() headers: RequestHeaders)
  
  @Get('transactions')
  async getTransactions(@Query() query: GetTransactionsQuery): Promise<GetTransactionResponseDto>
}

@Injectable()
export class GatewayService {
  async processTransaction(processorId: string, data: unknown, headers: RequestHeaders): Promise<Result<unknown, string>>
}
```

### 2. Transaction Service

**Responsibilities:**
- Process and persist transaction data
- Handle background job processing
- Emit transaction events
- Manage card utilization calculations
- Handle authorization and clearing logic
- Log analytics and notify cardholder

**Key Classes:**
```typescript
@Injectable()
export class TransactionService {
  async processAuthorizationTransaction(data: ITransactionDetails): Promise<void>
  async processClearingTransaction(data: ITransactionDetails): Promise<void>
}

@Injectable()
export class AuthorizationEventHandler {
  @OnEvent('transaction.AUTHORIZATION')
  async handleAuthorizationEvent(transaction: Transaction): Promise<void>
}

@Injectable()
export class ClearingEventHandler {
  @OnEvent('transaction.CLEARING')
  async handleClearingEvent(transaction: Transaction): Promise<void>
}
```

### 3. Processor Adapter Manager

**Responsibilities:**
- Manage processor adapter lifecycle
- Provide adapter discovery and registration
- Route requests to appropriate adapters

**Key Classes:**
```typescript
@Injectable()
export class ProcessorAdapterManager {
  async getAdapter(processorId: string): Promise<IProcessorAdapter>
  registerAdapter(processorId: string, adapter: IProcessorAdapter): void
}

export interface IProcessorAdapter {
  validateAndParseTransaction(data: unknown): Promise<Result<ITransactionDetails, string[]>>
  authorizeTransaction(data: unknown, headers: RequestHeaders): Promise<Result<unknown, string>>
}
```

### 4. Shared Libraries

**Components:**
- **shared-types**: Common interfaces, enums, and type definitions
- **shared-utilities**: Reusable utility functions and services
- **processor-adapters**: Individual processor implementations

## Database Design

### Entity Relationship Diagram

```
┌─────────────────-┐    ┌─────────────────-┐    ┌─────────────────-┐
│     Cards       │    │  Transactions   │    │TransactionEvents│
├─────────────────-┤    ├─────────────────-┤    ├─────────────────-┤
│ id (UUID) PK    │    │ id (UUID) PK    │    │ id (UUID) PK    │
│ cardId (String) │◄───┤ cardId (String) │    │ transactionId   │◄──┐
│ userId (String) │    │ userId (String) │    │ eventType       │   │
│ creditLimit     │    │ processorId     │    │ data (JSONB)    │   │
│ availableCredit │    │ status          │    │ createdAt       │   │
│ settledBalance  │    │ type            │    └─────────────────-┘   │
│ pendingBalance  │    │ authAmount      │                          │
│ currentUtilization   │ clearingAmount  │                          │
│ createdAt       │    │ currency        │                          │
│ updatedAt       │    │ metadata (JSONB)│                          │
└─────────────────-┘    │ createdAt       │                          │
                       │ updatedAt       │────────────────────────---┘
                       └─────────────────-┘
```
### Database Design Principles

1. **Normalization**: Tables are normalized to 3NF to reduce data redundancy
2. **JSONB Fields**: Flexible metadata storage for varying processor data structures
3. **Indexing**: Strategic indexes on frequently queried fields
4. **Constraints**: Unique constraints prevent duplicate transactions
5. **Audit Trail**: Complete event history for transaction lifecycle

## Design Patterns & Principles

### 1. Adapter Pattern
**Implementation**: Processor adapters that normalize different payment processor data formats
```typescript
interface IProcessorAdapter {
  validateAndParseTransaction(data: unknown): Promise<Result<ITransactionDetails, string[]>>
}

@ProcessorAdapter('processor-one')
export class ProcessorOneAdapter implements IProcessorAdapter {
  // Processor-specific implementation
}
```

### 2. Strategy Pattern
**Implementation**: Different validation and processing strategies per processor
```typescript
@Injectable()
export class ProcessorAdapterManager {
  private adapters = new Map<string, IProcessorAdapter>()
  
  async processTransaction(processorId: string, data: unknown): Promise<Result<any, string>> {
    const adapter = this.getAdapter(processorId)
    return adapter.validateAndParseTransaction(data)
  }
}
```

### 3. Observer Pattern
**Implementation**: Event-driven architecture with event handlers
```typescript
@OnEvent('transaction.AUTHORIZATION')
async handleAuthorizationEvent(transaction: Transaction): Promise<void> {
  await this.calculateCardUtilization(transaction)
  await this.notifyCardholder(transaction)
}
```

### 4. Repository Pattern
**Implementation**: Data access abstraction through Sequelize models
```typescript
@Injectable()
export class TransactionService {
  constructor(
    @InjectModel(Transaction) private transactionModel: typeof Transaction
  ) {}
  
  async findTransaction(id: string): Promise<Transaction> {
    return this.transactionModel.findByPk(id)
  }
}
```


### SOLID Principles Application

1. **Single Responsibility**: Each service has a single, well-defined purpose
2. **Open/Closed**: System is open for extension (new processors) but closed for modification
3. **Liskov Substitution**: All processor adapters are interchangeable through common interface
4. **Interface Segregation**: Minimal, focused interfaces for specific concerns
5. **Dependency Inversion**: High-level modules depend on abstractions, not concrete implementations

## Scalability & Performance

### Horizontal Scaling Strategies

1. **Stateless Services**: All services are stateless, enabling horizontal scaling
2. **Asynchronous Processing**: Use event-driven architecture for background processing

### Queue Processing

```typescript
@Processor(TRANSACTIONS_PROCESSING_QUEUE)
export class TransactionJobProcessor {
  @Process('process-transaction')
  async processTransaction(job: Job<ITransactionDetails>): Promise<void> {
    // Background processing with retry logic
  }
}
```

### Performance Optimizations

1. **Connection Pooling**: Database connection pooling for efficient resource usage
2. **Async Processing**: Non-blocking event handling and queue processing
3. **Database Indexing**: Optimized indexes for common query patterns

## Security & Data Integrity

### Race Condition Prevention

1. **Pessimistic Locking**: SELECT FOR UPDATE for card balance calculations
```typescript
const card = await this.cardModel.findOne({
  where: { cardId: transaction.cardId },
  lock: dbTransaction.LOCK.UPDATE,
  transaction: dbTransaction
})
```

2. **Database Transactions**: ACID compliance for all critical operations
3. **Unique Constraints**: Prevent duplicate transaction processing
4. **Idempotency**: Safe retry mechanisms for failed operations

### Data Integrity Strategies

1. **Transaction Deduplication**: Unique constraint on (correlation_id, processor_id)
2. **Event Sourcing**: Complete audit trail through transaction events
3. **Validation Layers**: Multiple validation points (gateway, adapter, service)
4. **Error Handling**: Comprehensive error handling with proper rollback

### Security Measures

1. **Signature Verification**: Webhook signature validation using processor secrets
```typescript
async verifySignature(data: string, signature: string, secret: string): Promise<boolean> {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
}
```

2. **Input Validation**: Zod schema validation for all inputs
3. **Environment Security**: Secure configuration management

## Event-Driven Architecture

### Event Flow

```
Authorization Request → Authorization Processing → Authorization Event → 
Card Utilization Update → Cardholder Notification

Clearing Request → Clearing Processing → Clearing Event → 
Card Balance Update → Analytics Event
```

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

```typescript
@Injectable()
export class AuthorizationEventHandler {
  @OnEvent(`transaction.${TransactionType.AUTHORIZATION}`)
  async handleAuthorizationEvent(transaction: Transaction): Promise<void> {
    await this.sequelize.transaction(async (t) => {
      await this.calculateCardUtilization(transaction, t)
      await this.sendCardholderNotification(transaction, t)
      await this.createEventRecord(transaction, t)
    })
  }
}
```

## Processor Adapter Architecture

### Adapter Interface

```typescript
export interface IProcessorAdapter {
  validateAndParseTransaction(data: unknown): Promise<Result<ITransactionDetails, string[]>>
  authorizeTransaction(data: unknown, headers: RequestHeaders): Promise<Result<unknown, string>>
}
```

### Adapter Registration

```typescript
@ProcessorAdapter('processor-one')
export class ProcessorOneAdapter implements IProcessorAdapter {
  async validateAndParseTransaction(data: unknown): Promise<Result<ITransactionDetails, string[]>> {
    // Processor-specific validation and parsing
    const validationResult = this.validateProcessorOneData(data)
    if (!validationResult.success) {
      return { success: false, error: validationResult.error }
    }
    
    const transactionDetails = this.parseToTransactionDetails(validationResult.data)
    return { success: true, data: transactionDetails }
  }
}
```

### Dynamic Adapter Loading

The adapter manager dynamically loads and manages processor adapters:

```typescript
@Injectable()
export class ProcessorAdapterManager {
  private adapters = new Map<string, IProcessorAdapter>()
  
  async getAdapter(processorId: string): Promise<IProcessorAdapter> {
    return this.adapters.get(processorId)!
  }
}
```

## API Design

### RESTful Endpoints

```typescript
// Gateway Service Endpoints
POST /webhook/{processorId}     // Process processor webhook
GET  /transactions              // Query transactions
GET  /health                    // Health check

// Transaction Service (gRPC)
rpc ProcessTransaction(TransactionRequest) returns (TransactionResponse)
rpc GetTransactions(GetTransactionsRequest) returns (GetTransactionsResponse)
```

### Request/Response Models

```typescript
interface ITransactionDetails {
  authorizationTransactionId: string
  clearingTransactionId?: string
  transactionCorrelationId: string
  processorId: string
  type: TransactionType
  status: TransactionStatus
  billingAmount: number
  billingCurrency: string
  cardId: string
  userId: string
  metadata: unknown
  isSuccessful: boolean
  processorName: string
  mcc: string
  referenceNumber: string
}
```

### Error Handling

```typescript
interface Result<T, E> {
  success: boolean
  data?: T
  error?: E
}

```

## Conclusion

This design documentation provides a comprehensive overview of the PEMO processing system architecture. The system is built with scalability, maintainability, and extensibility as core principles, utilizing proven design patterns and modern technologies to deliver a robust  processing solution.

The modular architecture, combined with the adapter pattern for processor integration, ensures that the system can efficiently handle unlimited payment processors while maintaining code quality and system performance.