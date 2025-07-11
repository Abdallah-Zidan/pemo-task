# Processor Two Adapter

A sophisticated payment processor adapter for integrating with Processor Two's encrypted webhook system, featuring RSA decryption, API key validation, and SHA512 signature verification.

## Overview

This adapter implements the `IProcessorAdapter` interface to handle encrypted webhook transactions from Processor Two. It provides multi-layered security with RSA decryption, API key validation, SHA512 signature verification, and comprehensive data validation using Zod schemas.

## Features

- **RSA Payload Decryption**: Decrypts incoming webhook payloads using RSA private keys
- **API Key Authentication**: Validates API keys for webhook authorization
- **SHA512 Signature Verification**: Validates webhook authenticity using public key cryptography
- **Event-Based Processing**: Handles account transaction events (CREATED/POSTED)
- **Complex Schema Validation**: Type-safe validation for nested transaction structures
- **Automatic Status Mapping**: Maps processor-specific statuses to internal transaction statuses

## Architecture

```typescript
@ProcessorAdapter('processor-two')
export class ProcessorTwoAdapter implements IProcessorAdapter
```

### Key Components

1. **Payload Decryption**: RSA private key decryption of encrypted webhook data
2. **Multi-Layer Security**: API key + signature verification
3. **Event Processing**: Handles transaction lifecycle events
4. **Schema Validation**: Complex nested object validation
5. **Data Transformation**: Maps processor events to standardized transaction format

## Configuration

### Module Options

```typescript
interface IModuleOptions {
  decryptionPrivateKeyBase64: string;           // Base64-encoded RSA private key
  signatureVerificationPublicKeyBase64: string; // Base64-encoded public key for signature verification
  apiKey: string;                               // API key for webhook authentication
  logger?: ILogger;                             // Optional custom logger instance
}
```

### Environment Variables

```bash
PROCESSOR_TWO_DECRYPTION_PRIVATE_KEY_BASE64=your_base64_encoded_private_key
PROCESSOR_TWO_SIGNATURE_VERIFICATION_PUBLIC_KEY_BASE64=your_base64_encoded_public_key
PROCESSOR_TWO_API_KEY=your_processor_two_api_key
```

## Usage

### Module Registration

```typescript
import { ProcessorTwoAdapterModule } from '@pemo-task/processor-two-adapter';

@Module({
  imports: [
    ProcessorTwoAdapterModule.forRoot({
      decryptionPrivateKeyBase64: process.env.PROCESSOR_TWO_DECRYPTION_PRIVATE_KEY_BASE64,
      signatureVerificationPublicKeyBase64: process.env.PROCESSOR_TWO_SIGNATURE_VERIFICATION_PUBLIC_KEY_BASE64,
      apiKey: process.env.PROCESSOR_TWO_API_KEY,
    }),
  ],
})
export class AppModule {}
```

### Transaction Processing

The adapter handles account transaction events:

#### Authorization Transaction (ACCOUNT_TRANSACTION_CREATED)
```json
{
  "data": "encrypted_payload_containing_transaction_data"
}
```

**Decrypted Payload:**
```json
{
  "id": "7caacd90-73f8-4e47-bd1f-9d8d89458ef9",
  "type": "ACCOUNT_TRANSACTION_CREATED",
  "transaction": {
    "id": "f3dbd518-87da-40ea-b3fb-522cba86afa6",
    "type": "CARD_MASTERCARD_E_COMMERCE",
    "status": "PENDING",
    "amount": "3124",
    "account_id": "a3c2a78b-587a-4052-a354-47bea047d12c",
    "reference": "2465530403729673400",
    "details": {
      "scheme_mcc": "9399",
      "scheme_billing_amount": "3064",
      "scheme_billing_currency": "682",
      "paymentology_tid": "2465530403729673400"
    }
  }
}
```

#### Clearing Transaction (ACCOUNT_TRANSACTION_POSTED)
```json
{
  "id": "683931c5-02cd-4cf8-b157-1ec62e27b9b1",
  "type": "ACCOUNT_TRANSACTION_POSTED",
  "created_at": "2023-10-04T00:00:05.481116Z",
  "transaction": {
    "id": "f3dbd518-87da-40ea-b3fb-522cba86afa6",
    "status": "POSTED",
    "posted_at": "2023-10-04T00:00:05.481116Z",
    "details": {
      "scheme_reconciliation_date": "2023-10-03",
      "interchange_fee_amount": "87"
    }
  }
}
```

## Implementation Details

### Security Flow

1. **API Key Validation**: Validates `x-api-key` header
2. **Payload Decryption**: Decrypts RSA-encrypted webhook data
3. **Signature Verification**: Validates SHA512 signature of decrypted payload
4. **Schema Validation**: Validates decrypted data structure

### Signature Verification

```typescript
// Payload construction for signature verification
const payloadToSign = `${data.id}|${data.type}|${data.transaction.details.scheme_billing_amount}|${data.transaction.details.scheme_billing_currency}|${data.transaction.status}`;

// Expected headers:
// x-api-key: API key for authentication
// x-message-signature: SHA512 signature of the payload
```

### Transaction Correlation Logic

- **Both transaction types use the same transaction ID**: `transaction.id`
- **Authorization Event**: `ACCOUNT_TRANSACTION_CREATED` → `PENDING`
- **Clearing Event**: `ACCOUNT_TRANSACTION_POSTED` → `SETTLED`
- **Success Criteria**: Status is `PENDING` or `POSTED`

### Status Mapping

```typescript
enum ProcessorTransactionStatus {
  PENDING = 'PENDING',
  POSTED = 'POSTED', 
  REJECTED = 'REJECTED'
}

enum ProcessorTransactionType {
  ACCOUNT_TRANSACTION_CREATED = 'ACCOUNT_TRANSACTION_CREATED',
  ACCOUNT_TRANSACTION_POSTED = 'ACCOUNT_TRANSACTION_POSTED'
}
```

## API Reference

### Methods

#### `validateAndParseTransaction(body: unknown): Promise<Result<ITransactionDetails, string[]>>`

Validates, decrypts, and transforms processor webhook data into standardized transaction format.

**Input Format:**
```typescript
{ data: "base64_encrypted_payload" }
```

**Returns:**
- `Result.success(ITransactionDetails)` - Successfully parsed transaction
- `Result.error(string[])` - Validation or decryption errors

#### `authorizeTransaction(data: ProcessorRequestData, headers: RequestHeaders): Result<{isSignatureValid: boolean}, string>`

Validates API key and webhook signature.

**Headers Required:**
- `x-api-key`: API key for authentication
- `x-message-signature`: SHA512 signature of the payload

**Returns:**
- `Result.success({isSignatureValid: true})` - Valid authorization
- `Result.error(string)` - Authorization failure reason

## Schema Validation

### Event Schema Structure

The adapter validates against a union of event types:

```typescript
const processorRequestSchema = z.union([
  authorizationRequestSchema, // ACCOUNT_TRANSACTION_CREATED
  clearingRequestSchema,      // ACCOUNT_TRANSACTION_POSTED
]);
```

### Transaction Details Schema

Complex nested validation for transaction details:

```typescript
const detailsSchema = z.object({
  scheme_mcc: z.string(),
  scheme_billing_amount: z.string().transform(Number),
  scheme_billing_currency: z.string(),
  paymentology_tid: z.string(),
  // ... additional fields
});
```

### Required Fields

- **Event Level**: `id`, `type`, `transaction`
- **Transaction Level**: `id`, `type`, `status`, `amount`, `account_id`, `reference`, `details`
- **Details Level**: `scheme_mcc`, `scheme_billing_amount`, `scheme_billing_currency`

## Error Handling

The adapter provides comprehensive error handling:

```typescript
// Decryption error
Result.error(["Invalid data"]) // Failed to decrypt payload

// Validation errors
Result.error([
  "transaction.details.scheme_billing_amount: Required",
  "transaction.status: Invalid enum value"
])

// Authorization errors  
Result.error("Invalid API key")
Result.error("Invalid signature")
```

## Testing

```bash
# Run adapter tests
npx nx test processor-two-adapter

# Run with coverage
npx nx test processor-two-adapter --coverage
```

## Security Considerations

- **Multi-Layer Security**: API key + RSA decryption + signature verification
- **RSA Key Management**: Store private keys securely with proper access controls
- **API Key Rotation**: Implement regular API key rotation procedures
- **Encrypted Transport**: All sensitive data is encrypted in transit
- **Error Handling**: Cryptographic failures are logged but not exposed in responses

## Dependencies

- `@pemo-task/process-adapter-manager` - Adapter framework
- `@pemo-task/shared-types` - Common types and interfaces
- `@pemo-task/shared-utilities` - Cryptographic services (DecryptionService, SignatureVerificationService)
- `zod` - Schema validation
- `@nestjs/common` - NestJS framework

## Constants

- **Processor ID**: `processor-two`
- **Encryption Algorithm**: `SHA512` for signature verification
- **Success Statuses**: `PENDING`, `POSTED`
- **Supported Event Types**: `ACCOUNT_TRANSACTION_CREATED`, `ACCOUNT_TRANSACTION_POSTED`

## Advanced Features

### Async Schema Validation

The adapter supports asynchronous schema validation for complex validation rules:

```typescript
const validatedResult = await processorRequestSchema.safeParseAsync(data);
```

### Flexible Amount Parsing

Automatic conversion of string amounts to numbers with validation:

```typescript
scheme_billing_amount: z.string()
  .refine((val) => !isNaN(Number(val)) && isFinite(Number(val)))
  .transform((val) => Number(val))
```

This adapter provides enterprise-grade security and reliability for processing encrypted webhook transactions from Processor Two while maintaining seamless integration with the PEMO payment processing architecture.