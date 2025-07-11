# Shared Types

A comprehensive TypeScript library containing shared types, interfaces, enums, and utility functions for the PEMO Task payment processing system. This library provides a centralized source of truth for common data structures and type definitions used across multiple modules.

## Overview

The Shared Types library ensures type consistency and code reusability across the entire PEMO Task application. It includes transaction-related types, result handling patterns, logging interfaces, and utility functions that are essential for payment processing operations.

## Features

- **Transaction Types**: Complete type definitions for payment transactions
- **Result Pattern**: Functional programming approach to error handling
- **Enums**: Standardized constants for transaction states and types
- **Interfaces**: Common contracts for services and data structures
- **Utility Functions**: Helper functions for type checking and validation
- **Full TypeScript Support**: Complete type safety and IntelliSense support

## Installation

```bash
npm install @pemo-task/shared-types
```

## Usage

### Importing Types

```typescript
import {
  ITransactionDetails,
  ITransactionDetailsResponse,
  IGetTransactionResponse,
  IGetTransactionsRequest,
  TransactionStatus,
  TransactionType,
  TransactionEventType,
  Result,
  RequestHeaders,
  ILogger,
  hasProperty,
  isObject,
  isString
} from '@pemo-task/shared-types';
```

### Transaction Details

Use the `ITransactionDetails` interface for standardized transaction data:

```typescript
import { ITransactionDetails, TransactionType, TransactionStatus } from '@pemo-task/shared-types';

const transaction: ITransactionDetails = {
  authorizationTransactionId: 'auth_123456',
  clearingTransactionId: 'clear_789012',
  transactionCorrelationId: 'corr_345678',
  processorId: 'visa_001',
  type: TransactionType.AUTHORIZATION,
  status: TransactionStatus.PENDING,
  billingAmount: 10000, // Amount in cents
  billingCurrency: 'USD',
  cardId: 'card_abc123',
  userId: 'user_xyz789',
  metadata: {
    merchantName: 'Example Store',
    location: 'New York, NY'
  },
  isSuccessful: true,
  processorName: 'Visa',
  mcc: '5411',
  referenceNumber: 'REF123456789'
};
```

### Result Pattern

Use the `Result` type for consistent error handling:

```typescript
import { Result } from '@pemo-task/shared-types';

// Function that returns a Result
async function processPayment(amount: number): Promise<Result<string, string>> {
  try {
    if (amount <= 0) {
      return Result.error('Amount must be positive');
    }
    
    // Process payment logic
    const transactionId = await processTransaction(amount);
    
    return Result.success(transactionId);
  } catch (error) {
    return Result.error('Payment processing failed');
  }
}

// Using the Result
const result = await processPayment(100);

if (result.success) {
  console.log('Transaction ID:', result.data);
} else {
  console.error('Error:', result.error);
}
```

### Transaction Enums

Use the provided enums for consistency:

```typescript
import { 
  TransactionType, 
  TransactionStatus, 
  TransactionEventType 
} from '@pemo-task/shared-types';

// Transaction types
const authTransaction = TransactionType.AUTHORIZATION;
const clearingTransaction = TransactionType.CLEARING;

// Transaction statuses
const pendingStatus = TransactionStatus.PENDING;
const settledStatus = TransactionStatus.SETTLED;

// Transaction events
const authProcessedEvent = TransactionEventType.AUTHORIZATION_TRANSACTION_PROCESSED;
const clearingProcessedEvent = TransactionEventType.CLEARING_TRANSACTION_PROCESSED;
```

### Logger Interface

Implement consistent logging across services:

```typescript
import { ILogger } from '@pemo-task/shared-types';

class PaymentService {
  constructor(private readonly logger: ILogger) {}

  async processPayment(amount: number): Promise<void> {
    this.logger.log('Processing payment for amount:', amount);
    
    try {
      // Payment logic
      this.logger.debug('Payment processed successfully');
    } catch (error) {
      this.logger.error('Payment processing failed:', error);
      throw error;
    }
  }
}
```

### Request Headers

Handle HTTP headers consistently:

```typescript
import { RequestHeaders } from '@pemo-task/shared-types';

function extractAuthToken(headers: RequestHeaders): string | undefined {
  const authHeader = headers.authorization;
  
  if (typeof authHeader === 'string') {
    return authHeader.replace('Bearer ', '');
  }
  
  return undefined;
}
```

### Type Predicates and Utility Functions

Use the provided type guards and utility functions:

```typescript
import { isObject, isString, hasProperty } from '@pemo-task/shared-types';

function validateWebhookData(data: unknown): boolean {
  // Check if data is an object
  if (!isObject(data)) {
    return false;
  }
  
  // Check if required properties exist
  if (!hasProperty(data, 'id') || !hasProperty(data, 'amount')) {
    return false;
  }
  
  // Type-safe access to properties
  if (!isString(data.id)) {
    return false;
  }
  
  return true;
}

// Advanced usage with type guards
function processTransactionData(payload: unknown) {
  if (hasProperty(payload, 'transaction') && isObject(payload.transaction)) {
    // TypeScript now knows payload.transaction exists and is an object
    if (hasProperty(payload.transaction, 'id') && isString(payload.transaction.id)) {
      console.log('Transaction ID:', payload.transaction.id);
    }
  }
}
```

## API Reference

### Interfaces

#### ITransactionDetails<T>

Core interface for transaction data.

**Properties:**
- `authorizationTransactionId: string` - Unique authorization transaction identifier
- `clearingTransactionId?: string` - Optional clearing transaction identifier
- `transactionCorrelationId: string` - Correlation ID for transaction tracking
- `processorId: string` - Payment processor identifier
- `type: TransactionType` - Transaction type (AUTHORIZATION or CLEARING)
- `status: TransactionStatus` - Current transaction status
- `billingAmount: number` - Transaction amount in cents
- `billingCurrency: string` - Currency code (e.g., 'USD')
- `cardId: string` - Associated card identifier
- `userId: string` - User identifier
- `metadata: T` - Generic metadata object
- `isSuccessful: boolean` - Transaction success flag
- `processorName: string` - Human-readable processor name
- `mcc: string` - Merchant Category Code
- `referenceNumber: string` - Reference number for tracking

#### ITransactionsGrpcService

Interface for gRPC transaction service.

**Methods:**
- `ProcessTransaction(data: ITransactionDetails): Observable<{ success: boolean }>`

#### ILogger

Standard logging interface.

**Methods:**
- `debug(message: string, ...args: any[]): void`
- `error(message: string, ...args: any[]): void`
- `log(message: string, ...args: any[]): void`
- `warn(message: string, ...args: any[]): void`

### Enums

#### TransactionType

```typescript
{
  AUTHORIZATION: 'AUTHORIZATION',
  CLEARING: 'CLEARING'
}
```

#### TransactionStatus

```typescript
{
  PENDING: 'PENDING',
  SETTLED: 'SETTLED'
}
```

#### TransactionEventType

```typescript
{
  AUTHORIZATION_TRANSACTION_PROCESSED: 'AUTHORIZATION_TRANSACTION_PROCESSED',
  CLEARING_TRANSACTION_PROCESSED: 'CLEARING_TRANSACTION_PROCESSED',
  AUTHORIZATION_EVENT_HANDLED: 'AUTHORIZATION_EVENT_HANDLED',
  CLEARING_EVENT_HANDLED: 'CLEARING_EVENT_HANDLED',
  CARDHOLDER_NOTIFIED: 'CARDHOLDER_NOTIFIED',
  ANALYTICS_SENT: 'ANALYTICS_SENT'
}
```

### Types

#### Result<T, E>

Functional programming pattern for error handling.

**Structure:**
```typescript
type Result<T, E> = 
  | { success: true; data: T }
  | { success: false; error: E }
```

**Helper methods:**
- `Result.success<T>(data: T): Result<T, never>`
- `Result.error<E>(error: E): Result<never, E>`

#### RequestHeaders

Type for HTTP request headers.

```typescript
type RequestHeaders = Record<string, string | string[] | undefined>
```

### Type Predicates and Utility Functions

#### isObject(value: unknown): value is object

Type guard function to check if a value is an object.

**Parameters:**
- `value: unknown` - Value to check

**Returns:**
- `boolean` - True if value is an object, false otherwise

#### isString(value: unknown): value is string

Type guard function to check if a value is a string.

**Parameters:**
- `value: unknown` - Value to check

**Returns:**
- `boolean` - True if value is a string, false otherwise

#### hasProperty<T extends object, K extends string>(obj: unknown, key: K): obj is T & Record<K, unknown>

Type guard function to check if an object has a specific property.

**Parameters:**
- `obj: unknown` - Object to check
- `key: K` - Property key to check for

**Returns:**
- `boolean` - True if object has the property, false otherwise

**Example:**
```typescript
if (hasProperty(data, 'id')) {
  // TypeScript now knows data.id exists
  console.log(data.id);
}
```

## Examples

### Complete Payment Processing Example

```typescript
import {
  ITransactionDetails,
  TransactionType,
  TransactionStatus,
  Result,
  RequestHeaders,
  isObject,
  hasProperty,
  isString
} from '@pemo-task/shared-types';

class PaymentProcessor {
  async validateTransaction(
    data: unknown,
    headers: RequestHeaders
  ): Promise<Result<ITransactionDetails, string[]>> {
    const errors: string[] = [];
    
    if (!isObject(data)) {
      return Result.error(['Invalid transaction data format']);
    }
    
    // Validate required properties exist
    if (!hasProperty(data, 'id') || !isString(data.id)) {
      errors.push('Missing or invalid transaction ID');
    }
    
    if (!hasProperty(data, 'amount') || typeof data.amount !== 'number') {
      errors.push('Missing or invalid amount');
    }
    
    // Additional validation logic here
    
    if (errors.length > 0) {
      return Result.error(errors);
    }
    
    const transaction: ITransactionDetails = {
      authorizationTransactionId: 'auth_123',
      transactionCorrelationId: 'corr_456',
      processorId: 'visa_001',
      type: TransactionType.AUTHORIZATION,
      status: TransactionStatus.PENDING,
      billingAmount: 10000,
      billingCurrency: 'USD',
      cardId: 'card_789',
      userId: 'user_012',
      metadata: data,
      isSuccessful: true,
      processorName: 'Visa',
      mcc: '5411',
      referenceNumber: 'REF123456789'
    };
    
    return Result.success(transaction);
  }
}
```

## Building

Run `nx build shared-types` to build the library.

## Contributing

When contributing to this library:

1. **Maintain Type Safety**: All exports should be fully typed
2. **Follow Naming Conventions**: Use clear, descriptive names
3. **Document New Types**: Add comprehensive documentation for new types
4. **Update Examples**: Include usage examples for new functionality
5. **Consider Breaking Changes**: Use semantic versioning for breaking changes

## Best Practices

- **Use Result Pattern**: Prefer `Result<T, E>` for operations that can fail
- **Leverage Enums**: Use provided enums instead of magic strings
- **Type Guards**: Use `isObject` and similar utilities for runtime type checking
- **Generic Interfaces**: Use generic parameters for flexible type definitions
- **Consistent Naming**: Follow established naming patterns for new types

## License

This library is part of the PEMO Task project.