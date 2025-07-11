# Processor One Adapter

A pluggable payment processor adapter for integrating with Processor One's webhook system, featuring SHA256 signature verification and comprehensive transaction parsing.

## Overview

This adapter implements the `IProcessorAdapter` interface to handle webhook transactions from Processor One. It provides secure signature verification, comprehensive data validation using Zod schemas, and transaction normalization for the PEMO payment processing system.

## Features

- **SHA256 Signature Verification**: Validates webhook authenticity using public key cryptography
- **Comprehensive Schema Validation**: Type-safe validation with Zod for authorization and clearing transactions
- **Transaction Correlation**: Intelligent correlation between authorization and clearing transactions
- **Status Mapping**: Maps processor-specific status codes to internal transaction statuses
- **Metadata Preservation**: Maintains all processor-specific fields as flattened metadata

## Architecture

```typescript
@ProcessorAdapter('processor-one')
export class ProcessorOneAdapter implements IProcessorAdapter<ProcessorRequestData>
```

### Key Components

1. **Transaction Validation**: Zod-based schema validation for webhook payloads
2. **Signature Verification**: SHA256 public key signature validation
3. **Data Transformation**: Maps processor data to standardized transaction format
4. **Status Resolution**: Intelligent transaction status determination

## Configuration

### Module Options

```typescript
interface IModuleOptions {
  publicKeyBase64: string;  // Base64-encoded public key for signature verification
  logger?: ILogger;         // Optional custom logger instance
}
```

### Environment Variables

```bash
PROCESSOR_ONE_PUBLIC_KEY_BASE64=your_base64_encoded_public_key
```

## Usage

### Module Registration

```typescript
import { ProcessorOneAdapterModule } from '@pemo-task/processor-one-adapter';

@Module({
  imports: [
    ProcessorOneAdapterModule.forRoot({
      publicKeyBase64: process.env.PROCESSOR_ONE_PUBLIC_KEY_BASE64,
    }),
  ],
})
export class AppModule {}
```

### Transaction Processing

The adapter handles two types of transactions:

#### Authorization Transactions
```json
{
  "id": "2035ed99-38ab-4a42-8125-fcbd906dba7a",
  "message_type": "AUTHORIZATION",
  "billing_amount": 2425,
  "billing_currency": "AED",
  "card_id": "21407f60-ff6d-40b9-9798-3c77496982f6",
  "user_id": "7398d3a1-cf56-469b-ade8-cb86263560b2",
  "status_code": "0000",
  "mcc": "5734",
  "rrn": "060400875949"
}
```

#### Clearing Transactions
```json
{
  "id": "6c568520-ef8e-439c-8d2f-539c4ac3f065",
  "message_type": "CLEARING",
  "parent_transaction_id": "2035ed99-38ab-4a42-8125-fcbd906dba7a",
  "billing_amount": 245,
  "billing_currency": "AED",
  "settlement_status": "MATCHED",
  "status_code": "0000"
}
```

## Implementation Details

### Signature Verification

The adapter implements a specific signature verification scheme:

```typescript
// Payload construction for signature verification
const payloadToSign = `${data.id}|${data.message_type}|${data.user_id}|${data.card_id}|${data.billing_amount}|${data.billing_currency}|${data.status_code}`;

// Expected header: x-message-signature
```

### Transaction Correlation Logic

- **Authorization**: Uses transaction ID as correlation ID
- **Clearing**: Uses `parent_transaction_id` as correlation ID to link with authorization
- **Status Mapping**: 
  - Authorization → `PENDING`
  - Clearing → `SETTLED`
  - Success determined by status code `"0000"`

### Schema Structure

The adapter validates against a discriminated union schema:

```typescript
const processorRequestSchema = z.discriminatedUnion('message_type', [
  authorizationRequestSchema,  // AUTHORIZATION specific fields
  clearingRequestSchema,       // CLEARING specific fields
]);
```

## API Reference

### Methods

#### `validateAndParseTransaction(data: unknown): Result<ITransactionDetails, string[]>`

Validates and transforms processor webhook data into standardized transaction format.

**Returns:**
- `Result.success(ITransactionDetails)` - Successfully parsed transaction
- `Result.error(string[])` - Validation errors array

#### `authorizeTransaction(data: ProcessorRequestData, headers: RequestHeaders): Result<{isSignatureValid: boolean}, string>`

Validates webhook signature and authorization.

**Headers Required:**
- `x-message-signature`: SHA256 signature of the payload

**Returns:**
- `Result.success({isSignatureValid: true})` - Valid signature
- `Result.error(string)` - Authorization failure reason

## Schema Validation

### Base Schema Fields

All transactions include these required fields:

- `id`, `mcc`, `rrn`, `card_id`, `user_id`
- `billing_amount`, `billing_currency`, `status_code`
- `merchant_id`, `merchant_name`, `merchant_city`
- `transaction_amount`, `transaction_currency`
- `network_transaction_id`, `transaction_timestamp`

### Authorization-Specific Fields

- `acquirer_id`
- `date_time_acquirer`

### Clearing-Specific Fields

- `parent_transaction_id` (required for correlation)
- `settlement_status`
- `clearing_id`
- `fee_amount`

## Error Handling

The adapter provides detailed validation errors:

```typescript
// Example validation error response
Result.error([
  "billing_amount: Required",
  "billing_currency: Invalid currency code",
  "status_code: Expected string, received number"
])
```

## Testing

```bash
# Run adapter tests
npx nx test processor-one-adapter

# Run with coverage
npx nx test processor-one-adapter --coverage
```

## Security Considerations

- **Signature Verification**: All webhook requests must include valid SHA256 signatures
- **Public Key Security**: Store public keys securely and rotate regularly
- **Input Validation**: Comprehensive schema validation prevents malformed data processing
- **Error Handling**: Sensitive information is not exposed in error messages

## Dependencies

- `@pemo-task/process-adapter-manager` - Adapter framework
- `@pemo-task/shared-types` - Common types and interfaces
- `@pemo-task/shared-utilities` - Cryptographic services
- `zod` - Schema validation
- `@nestjs/common` - NestJS framework

## Constants

- **Processor ID**: `processor-one`
- **Success Status Code**: `"0000"`
- **Supported Message Types**: `AUTHORIZATION`, `CLEARING`

This adapter provides a robust, secure, and type-safe integration with Processor One's payment processing system while maintaining compatibility with the broader PEMO architecture.