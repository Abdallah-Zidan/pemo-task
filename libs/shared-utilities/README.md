# Shared Utilities Library

A comprehensive collection of reusable utilities, services, and helpers for the PEMO payment processing system. This library provides common functionality used across multiple services and applications.

## 🎯 Purpose

- **Cryptographic Services**: Signature verification and decryption utilities
- **Error Handling**: Global exception filters and error formatting
- **Logging Configuration**: Structured logging with Pino
- **Utility Functions**: Common helper functions for data manipulation
- **Shared Configuration**: Reusable configuration patterns

## 📦 What's Included

### 🔐 Security Services

#### Signature Verification Service
Provides cryptographic signature verification for webhook security.

```typescript
import { SignatureVerificationService } from '@pemo-task/shared-utilities';

@Injectable()
export class MyService {
  constructor(private signatureService: SignatureVerificationService) {}

  async verifyWebhook(data: string, signature: string, publicKey: string): Promise<boolean> {
    return this.signatureService.verifySignature({
      data,
      signature,
      publicKey,
      algorithm: 'SHA256' // Optional: SHA256, SHA384, SHA512
    });
  }
}
```

**Features:**
- Support for SHA256, SHA384, and SHA512 algorithms
- RSA signature verification with public keys
- Base64 signature format support
- Graceful error handling

#### Decryption Service
Handles RSA private key decryption for secure data processing.

```typescript
import { DecryptionService } from '@pemo-task/shared-utilities';

@Injectable()
export class MyService {
  constructor(private decryptionService: DecryptionService) {}

  decryptPayload(encryptedData: string, privateKey: string): string {
    return this.decryptionService.privateDecrypt({
      data: encryptedData,
      privateKey,
      algorithm: 'SHA256' // Optional
    });
  }
}
```

**Features:**
- RSA-OAEP padding for secure decryption
- Multiple hash algorithm support
- Base64 encoded input/output
- UTF-8 string conversion

### 🚨 Error Handling

#### Global Exception Filter
Comprehensive error handling and formatting for consistent API responses.

```typescript
import { GlobalExceptionFilter } from '@pemo-task/shared-utilities';

// In your main.ts or module
app.useGlobalFilters(new GlobalExceptionFilter());
```

**Features:**
- Standardized error response format
- Request context logging
- Sensitive data sanitization
- Validation error formatting
- HTTP status code mapping
- Request ID tracking

**Error Response Format:**
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/transactions",
  "requestId": "abc123-550e8400-e29b-41d4-a716-446655440000"
}
```

### 📊 Logging Configuration

#### Pino Logger Options
Pre-configured Pino logging setup with best practices.

```typescript
import { buildPinoOptions } from '@pemo-task/shared-utilities';
import { ConfigService } from '@nestjs/config';

// In your module
LoggerModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => buildPinoOptions(config),
}),
```

**Features:**
- Environment-specific formatting (pretty in dev, JSON in prod)
- Automatic request ID generation
- Sensitive data redaction
- Health endpoint exclusion
- Customizable log levels
- Request body logging (configurable)

**Environment Variables:**
```bash
NODE_ENV=development          # Controls log formatting
LOG_LEVEL=info               # Log level (debug, info, warn, error)
LOG_REQUEST_BODY=false       # Include request body in logs
```

### 🛠️ Utility Functions

#### Object Utilities
Helper functions for object manipulation.

```typescript
import { flattenObject } from '@pemo-task/shared-utilities';

const nested = {
  user: {
    profile: {
      name: 'John',
      age: 30
    },
    settings: {
      theme: 'dark'
    }
  }
};

const flattened = flattenObject(nested);
// Result: {
//   'user.profile.name': 'John',
//   'user.profile.age': 30,
//   'user.settings.theme': 'dark'
// }
```

#### Header Utilities
Consistent header extraction for HTTP requests.

```typescript
import { extractSingleHeader } from '@pemo-task/shared-utilities';
import { RequestHeaders } from '@pemo-task/shared-types';

const headers: RequestHeaders = {
  'x-signature': ['sig1', 'sig2'], // Array format
  'content-type': 'application/json' // String format
};

const signature = extractSingleHeader(headers, 'x-signature'); // Returns 'sig1'
const contentType = extractSingleHeader(headers, 'content-type'); // Returns 'application/json'
```

## 🏗️ Module Structure

```
src/
├── config/
│   ├── index.ts                      # Configuration exports
│   └── pino-logger-options.ts        # Pino logging configuration
├── filters/
│   ├── index.ts                      # Filter exports
│   └── global-exception.filter.ts    # Global error handling
├── functions/
│   ├── index.ts                      # Function exports
│   ├── headers.ts                    # Header utility functions
│   └── objects.ts                    # Object manipulation functions
├── services/
│   ├── index.ts                      # Service exports
│   ├── signature-verification.service.ts  # Signature verification
│   ├── signature-verification.service.spec.ts
│   ├── decryption.service.ts         # Decryption utilities
│   └── decryption.service.spec.ts
├── index.ts                          # Main library exports
└── shared-utilities.module.ts        # NestJS module definition
```

## 🚀 Installation & Usage

### In Your NestJS Application

```typescript
import { Module } from '@nestjs/common';
import { SharedUtilitiesModule } from '@pemo-task/shared-utilities';

@Module({
  imports: [SharedUtilitiesModule],
  // Your module configuration
})
export class AppModule {}
```

### Individual Imports

```typescript
// Import specific services
import { 
  SignatureVerificationService, 
  DecryptionService,
  GlobalExceptionFilter,
  buildPinoOptions,
  flattenObject,
  extractSingleHeader
} from '@pemo-task/shared-utilities';
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npx nx test shared-utilities

# Run tests with coverage
npx nx test shared-utilities --coverage

# Run tests in watch mode
npx nx test shared-utilities --watch
```

### Test Coverage

The library includes comprehensive unit tests for all services and utilities:

- **Signature Verification Service**: 12 test cases covering various scenarios
- **Decryption Service**: Error handling and decryption validation
- **Utility Functions**: Edge cases and data transformation
- **Configuration**: Environment-specific behavior

### Example Test Usage

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { SignatureVerificationService } from '@pemo-task/shared-utilities';

describe('SignatureVerificationService', () => {
  let service: SignatureVerificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SignatureVerificationService],
    }).compile();

    service = module.get<SignatureVerificationService>(SignatureVerificationService);
  });

  it('should verify valid signatures', () => {
    const result = service.verifySignature({
      data: 'test data',
      signature: 'valid-signature',
      publicKey: 'public-key'
    });
    
    expect(result).toBeDefined();
  });
});
```

## 🔧 Configuration Examples

### Complete Application Setup

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { GlobalExceptionFilter } from '@pemo-task/shared-utilities';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  
  // Use Pino logger
  app.useLogger(app.get(Logger));
  
  // Use global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());
  
  await app.listen(3000);
}
bootstrap();
```

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { 
  SharedUtilitiesModule, 
  buildPinoOptions 
} from '@pemo-task/shared-utilities';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: buildPinoOptions,
    }),
    SharedUtilitiesModule,
  ],
})
export class AppModule {}
```

## 🛡️ Security Features

### Data Sanitization
- Automatically redacts sensitive fields in logs (`password`, `token`, `secret`, `apiKey`, `authorization`)
- Request body sanitization in error responses
- Header value masking for sensitive information

### Cryptographic Security
- Industry-standard RSA encryption/decryption
- Multiple hash algorithm support
- Secure random request ID generation
- Timing-safe comparisons where applicable

### Error Security
- No sensitive information leakage in error responses
- Structured error logging with context
- Request correlation for debugging

## 📈 Performance Considerations

### Logging Performance
- Pino is optimized for high-performance logging
- JSON format in production for parsing efficiency
- Configurable log levels to control verbosity
- Health endpoint exclusion to reduce noise

### Memory Management
- Efficient object flattening without deep cloning
- Minimal memory footprint for utility functions
- Proper error handling to prevent memory leaks

### Processing Efficiency
- Native Node.js crypto operations
- Minimal external dependencies
- Optimized for concurrent usage

## 🔍 Troubleshooting

### Common Issues

#### Signature Verification Fails
```typescript
// Ensure correct key format and algorithm
const isValid = signatureService.verifySignature({
  data: rawData,
  signature: base64Signature,
  publicKey: pemFormattedKey,
  algorithm: 'SHA256'
});
```

#### Logging Configuration Issues
```bash
# Check environment variables
LOG_LEVEL=debug
NODE_ENV=development
LOG_REQUEST_BODY=true
```
---
This shared utilities library provides a solid foundation of reusable functionality that ensures consistency, security, and maintainability across the entire PEMO  processing system.