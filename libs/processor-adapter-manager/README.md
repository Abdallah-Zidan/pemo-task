# Processor Adapter Manager

A NestJS library for managing and discovering payment processor adapters in a modular architecture. This library provides a centralized way to register, discover, and manage different payment processor implementations.

## Overview

The Processor Adapter Manager uses NestJS's reflection capabilities to automatically discover and register processor adapters at runtime. It provides a unified interface for managing multiple payment processor implementations through a decorator-based approach.

## Features

- **Automatic Discovery**: Automatically discovers processor adapters decorated with `@ProcessorAdapter`
- **Runtime Registration**: Registers adapters during module initialization
- **Validation**: Ensures all adapters implement required methods
- **Type Safety**: Full TypeScript support with proper interfaces
- **Error Handling**: Comprehensive validation and error reporting

## Installation

```bash
npm install @pemo-task/processor-adapter-manager
```

## Usage

### 1. Module Import

Import the `ProcessorAdapterManagerModule` in your application module:

```typescript
import { Module } from '@nestjs/common';
import { ProcessorAdapterManagerModule } from '@pemo-task/processor-adapter-manager';

@Module({
  imports: [ProcessorAdapterManagerModule],
  // ... other module configuration
})
export class AppModule {}
```

### 2. Creating a Processor Adapter

Create a processor adapter by implementing the `IProcessorAdapter` interface and decorating it with `@ProcessorAdapter`:

```typescript
import { Injectable } from '@nestjs/common';
import { ProcessorAdapter, IProcessorAdapter } from '@pemo-task/processor-adapter-manager';
import { ITransactionDetails, RequestHeaders, Result } from '@pemo-task/shared-types';

@ProcessorAdapter('visa')
export class VisaAdapter implements IProcessorAdapter {
  async validateAndParseTransaction(data: unknown): Promise<Result<ITransactionDetails, string[]>> {
    // Implementation for validating and parsing Visa transactions
    // Return success or error result
  }

  async authorizeTransaction(
    data: unknown,
    headers: RequestHeaders
  ): Promise<Result<unknown, string>> {
    // Implementation for authorizing Visa transactions
    // Return success or error result
  }
}
```

### 3. Using the Processor Adapter Manager

Inject the `ProcessorAdapterManager` service to access registered adapters:

```typescript
import { Injectable } from '@nestjs/common';
import { ProcessorAdapterManager } from '@pemo-task/processor-adapter-manager';

@Injectable()
export class PaymentService {
  constructor(private readonly processorManager: ProcessorAdapterManager) {}

  async processPayment(processorId: string, transactionData: unknown, headers: RequestHeaders) {
    // Get the specific processor adapter
    const adapter = this.processorManager.getProcessorAdapterOrThrow(processorId);
    
    // Validate and parse the transaction
    const parseResult = await adapter.validateAndParseTransaction(transactionData);
    if (!parseResult.success) {
      throw new Error('Transaction validation failed');
    }
    
    // Authorize the transaction
    const authResult = await adapter.authorizeTransaction(parseResult.data, headers);
    if (!authResult.success) {
      throw new Error('Transaction authorization failed');
    }
    
    return authResult.data;
  }

  getAvailableProcessors(): string[] {
    return this.processorManager.getProcessorIds();
  }
}
```

## API Reference

### ProcessorAdapterManager

The main service for managing processor adapters.

#### Methods

- `getProcessorAdapter(processorId: string): IProcessorAdapter | undefined`
  - Returns the processor adapter for the given ID, or undefined if not found

- `getProcessorAdapterOrThrow(processorId: string): IProcessorAdapter`
  - Returns the processor adapter for the given ID, or throws an error if not found

- `getProcessorIds(): string[]`
  - Returns an array of all registered processor IDs

### IProcessorAdapter Interface

Interface that all processor adapters must implement.

#### Methods

- `validateAndParseTransaction(data: unknown): Promise<Result<ITransactionDetails, string[]>> | Result<ITransactionDetails, string[]>`
  - Validates and parses transaction data
  - Returns a Result object with either parsed transaction details or validation errors

- `authorizeTransaction(data: T, headers: RequestHeaders): Promise<Result<unknown, string>> | Result<unknown, string>`
  - Authorizes a transaction with the processor
  - Returns a Result object with either authorization data or error message

### @ProcessorAdapter Decorator

Decorator used to mark a class as a processor adapter.

#### Parameters

- `processorId: string` - Unique identifier for the processor

#### Example

```typescript
@ProcessorAdapter('mastercard')
export class MastercardAdapter implements IProcessorAdapter {
  // Implementation
}
```

## Error Handling

The library provides comprehensive error handling:

- **Validation Errors**: Throws errors if adapters don't implement required methods
- **Not Found Errors**: `NotImplementedException` when requesting non-existent adapters
- **Type Errors**: Compile-time type checking ensures proper implementation

## Testing

Run the unit tests:

```bash
nx test processor-adapter-manager
```

## Architecture

The library follows these patterns:

- **Dependency Injection**: Uses NestJS's DI container
- **Reflection**: Leverages NestJS's reflection capabilities for discovery
- **Interface Segregation**: Clear separation of concerns with focused interfaces
- **Single Responsibility**: Each adapter handles one processor type

## Contributing

When adding new processor adapters:

1. Implement the `IProcessorAdapter` interface
2. Add the `@ProcessorAdapter` decorator with a unique processor ID
3. Ensure proper error handling and validation
4. Add comprehensive tests

## License

This library is part of the PEMO Task project.