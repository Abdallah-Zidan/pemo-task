# PEMO Payment Processing System - API Documentation

## Table of Contents
1. [API Overview](#api-overview)
2. [Authentication & Security](#authentication--security)
3. [Gateway Service Endpoints](#gateway-service-endpoints)
4. [Transaction Service (gRPC)](#transaction-service-grpc)
5. [Error Handling](#error-handling)
6. [Request/Response Models](#requestresponse-models)
7. [Webhook Processing](#webhook-processing)
8. [Rate Limiting & Throttling](#rate-limiting--throttling)

## API Overview

The PEMO Payment Processing System exposes two primary API surfaces:

- **Gateway Service**: HTTP/REST API for external integrations and queries
- **Transaction Service**: gRPC API for internal service communication

### Base URLs
- **Gateway Service**: `http://localhost:3000` (development)
- **Transaction Service**: `grpc://localhost:50052` (configurable via TRANSACTIONS_GRPC_URL)

### API Versioning
- REST API: Version specified in URL path (`/v1/`)
- gRPC API: Version specified in protocol buffer package (`pemo.transactions.v1`)

## Authentication & Security

### Webhook Authentication
Payment processor webhooks are authenticated using signature verification:

```http
POST /gateway/webhook/processor-one
Content-Type: application/json
X-Signature: sha256=<HMAC-SHA256-signature>
Authorization: Bearer <processor-api-key>

{
  "transaction_data": "..."
}
```

### Signature Verification Process
1. Extract signature from `X-Signature` header
2. Concatenate request body with timestamp
3. Generate HMAC-SHA256 using processor secret
4. Compare signatures using timing-safe comparison

### Internal Service Authentication
- gRPC services use mutual TLS (mTLS) for secure communication
- Service-to-service authentication via JWT tokens
- Network isolation within private subnets

## Gateway Service Endpoints

### Webhook Endpoints

#### Process Processor Webhook
Receives and processes webhooks from payment processors.

```http
POST /gateway/webhook/{processorId}
```

**Path Parameters:**
- `processorId` (string, required): Identifier for the payment processor (`processor-one`, `processor-two`)

**Headers:**
- `Content-Type: application/json`
- `X-Signature` (string, required): HMAC signature for request verification
- `X-Timestamp` (string, required): Unix timestamp of request

**Request Body:**
Processor-specific JSON payload (varies by processor)

**Responses:**

Success Response:
```http
HTTP/1.1 202 Accepted
Content-Type: application/json

{
  "success": true,
  "message": "Transaction queued for processing"
}
```

Error Response:
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Invalid transaction data",
  "details": [
    "Missing required field: billing_amount",
    "Invalid currency code: XYZ"
  ]
}
```

**Example Request (Processor One):**
```bash
curl -X POST http://localhost:3000/gateway/webhook/processor-one \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=abc123..." \
  -H "Authorization: Bearer processor-api-key" \
  -d '{
    "id": "2035ed99-38ab-4a42-8125-fcbd906dba7a",
    "message_type": "AUTHORIZATION",
    "billing_amount": 2425,
    "billing_currency": "AED",
    "card_id": "21407f60-ff6d-40b9-9798-3c77496982f6",
    "user_id": "7398d3a1-cf56-469b-ade8-cb86263560b2"
  }'
```

### Query Endpoints

#### Get Transactions
Retrieves a paginated list of transactions with optional filtering.

```http
GET /gateway/transactions
```

**Query Parameters:**
- `cardId` (string, optional): Filter by card ID
- `processorId` (string, optional): Filter by processor ID
- `status` (string, optional): Filter by transaction status (`PENDING`, `SETTLED`, `FAILED`, `CANCELLED`)
- `page` (integer, required): Page number (1-based)
- `limit` (integer, required): Number of transactions per page (1-100)

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "transactions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "authorizationTransactionId": "auth-123",
      "clearingTransactionId": "clear-456",
      "transactionCorrelationId": "corr-789",
      "processorId": "processor-one",
      "processorName": "Processor One",
      "type": "AUTHORIZATION",
      "status": "PENDING",
      "billingAmount": 2425,
      "billingCurrency": "AED",
      "cardId": "21407f60-ff6d-40b9-9798-3c77496982f6",
      "userId": "7398d3a1-cf56-469b-ade8-cb86263560b2",
      "mcc": "5734",
      "referenceNumber": "REF123456",
      "metadata": {
        "merchant_name": "SP SOFTWARESTORE",
        "merchant_city": "+18773574498"
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 10
}
```

**Example Request:**
```bash
curl -X GET "http://localhost:3000/gateway/transactions?cardId=21407f60-ff6d-40b9-9798-3c77496982f6&page=1&limit=10" \
  -H "Accept: application/json"
```

### Health Check Endpoint

#### System Health Check
Returns the health status of the system and its dependencies.

```http
GET /health
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "database": {
      "status": "healthy",
      "responseTime": "12ms"
    },
    "queue": {
      "status": "healthy",
      "responseTime": "5ms"
    },
    "transactionService": {
      "status": "healthy",
      "responseTime": "8ms"
    }
  },
  "version": "1.0.0"
}
```

Unhealthy Response:
```http
HTTP/1.1 503 Service Unavailable
Content-Type: application/json

{
  "status": "unhealthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "database": {
      "status": "unhealthy",
      "error": "Connection timeout",
      "responseTime": "5000ms"
    }
  }
}
```

## Transaction Service (gRPC)

### Protocol Buffer Definition

```protobuf
syntax = "proto3";

package pemo.transactions.v1;

service TransactionService {
  rpc ProcessTransaction(ProcessTransactionRequest) returns (ProcessTransactionResponse);
  rpc GetTransactions(GetTransactionsRequest) returns (GetTransactionsResponse);
  rpc GetTransactionById(GetTransactionByIdRequest) returns (GetTransactionByIdResponse);
}

message ProcessTransactionRequest {
  string authorization_transaction_id = 1;
  string clearing_transaction_id = 2;
  string transaction_correlation_id = 3;
  string processor_id = 4;
  TransactionType type = 5;
  TransactionStatus status = 6;
  double billing_amount = 7;
  string billing_currency = 8;
  string card_id = 9;
  string user_id = 10;
  google.protobuf.Struct metadata = 11;
  bool is_successful = 12;
  string processor_name = 13;
  string mcc = 14;
  string reference_number = 15;
}

message ProcessTransactionResponse {
  bool success = 1;
  string message = 2;
  string transaction_id = 3;
}

enum TransactionType {
  TRANSACTION_TYPE_UNSPECIFIED = 0;
  TRANSACTION_TYPE_AUTHORIZATION = 1;
  TRANSACTION_TYPE_CLEARING = 2;
}

enum TransactionStatus {
  TRANSACTION_STATUS_UNSPECIFIED = 0;
  TRANSACTION_STATUS_PENDING = 1;
  TRANSACTION_STATUS_SETTLED = 2;
  TRANSACTION_STATUS_FAILED = 3;
  TRANSACTION_STATUS_CANCELLED = 4;
}
```

### gRPC Service Methods

#### ProcessTransaction
Processes a transaction asynchronously through the queue system.

**Request:**
```json
{
  "authorizationTransactionId": "auth-123",
  "transactionCorrelationId": "corr-789",
  "processorId": "processor-one",
  "type": "TRANSACTION_TYPE_AUTHORIZATION",
  "status": "TRANSACTION_STATUS_PENDING",
  "billingAmount": 2425.0,
  "billingCurrency": "AED",
  "cardId": "21407f60-ff6d-40b9-9798-3c77496982f6",
  "userId": "7398d3a1-cf56-469b-ade8-cb86263560b2",
  "isSuccessful": true,
  "processorName": "Processor One",
  "mcc": "5734",
  "referenceNumber": "REF123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transaction queued for processing",
  "transactionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### GetTransactions
Retrieves transactions with filtering and pagination.

**Request:**
```json
{
  "cardId": "21407f60-ff6d-40b9-9798-3c77496982f6",
  "processorId": "processor-one",
  "status": "TRANSACTION_STATUS_PENDING",
  "page": 1,
  "limit": 10
}
```

**Response:**
```json
{
  "transactions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "authorizationTransactionId": "auth-123",
      "type": "TRANSACTION_TYPE_AUTHORIZATION",
      "status": "TRANSACTION_STATUS_PENDING",
      "billingAmount": 2425.0,
      "billingCurrency": "AED",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 10
}
```

## Error Handling

### HTTP Status Codes

| Status Code | Description | Usage |
|-------------|-------------|-------|
| 200 OK | Success | Successful requests |
| 400 Bad Request | Client Error | Invalid request data |
| 401 Unauthorized | Authentication Error | Missing or invalid credentials |
| 403 Forbidden | Authorization Error | Insufficient permissions |
| 404 Not Found | Resource Not Found | Requested resource doesn't exist |
| 422 Unprocessable Entity | Validation Error | Valid syntax but invalid data |
| 429 Too Many Requests | Rate Limit Exceeded | Client exceeded rate limits |
| 500 Internal Server Error | Server Error | Unexpected server error |
| 502 Bad Gateway | Gateway Error | Upstream service error |
| 503 Service Unavailable | Service Unavailable | Service temporarily unavailable |

### Error Response Format

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error description",
  "details": [
    "Specific validation error 1",
    "Specific validation error 2"
  ],
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "req_123456789"
}
```

### Common Error Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request data validation failed |
| `INVALID_SIGNATURE` | 401 | Webhook signature verification failed |
| `PROCESSOR_NOT_FOUND` | 404 | Unknown processor ID |
| `TRANSACTION_NOT_FOUND` | 404 | Transaction not found |
| `DUPLICATE_TRANSACTION` | 422 | Transaction already exists |
| `INVALID_TRANSACTION_STATE` | 422 | Invalid state transition |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `QUEUE_ERROR` | 500 | Queue operation failed |
| `INTERNAL_ERROR` | 500 | Unexpected system error |

### gRPC Error Handling

gRPC errors use standard gRPC status codes:

```json
{
  "code": "INVALID_ARGUMENT",
  "message": "Invalid transaction data",
  "details": [
    {
      "@type": "type.googleapis.com/google.rpc.BadRequest",
      "fieldViolations": [
        {
          "field": "billing_amount",
          "description": "Must be greater than 0"
        }
      ]
    }
  ]
}
```

## Request/Response Models

### Transaction Data Models

#### ITransactionDetails
```typescript
interface ITransactionDetails {
  authorizationTransactionId: string;
  clearingTransactionId?: string;
  transactionCorrelationId: string;
  processorId: string;
  type: TransactionType;
  status: TransactionStatus;
  billingAmount: number;
  billingCurrency: string;
  cardId: string;
  userId: string;
  metadata: unknown;
  isSuccessful: boolean;
  processorName: string;
  mcc: string;
  referenceNumber: string;
}
```

#### ITransactionDetailsResponse
```typescript
interface ITransactionDetailsResponse extends Omit<ITransactionDetails, 'isSuccessful'> {
  id: string;
  createdAt: string;
  updatedAt: string;
}
```

#### IGetTransactionsRequest
```typescript
interface IGetTransactionsRequest {
  cardId?: string;
  processorId?: string;
  status?: TransactionStatus;
  page: number;
  limit: number;
}
```

#### IGetTransactionResponse
```typescript
interface IGetTransactionResponse {
  transactions: ITransactionDetailsResponse[];
  total: number;
  page: number;
  limit: number;
}
```

### Enumeration Types

#### TransactionType
```typescript
enum TransactionType {
  AUTHORIZATION = 'AUTHORIZATION',
  CLEARING = 'CLEARING'
}
```

#### TransactionStatus
```typescript
enum TransactionStatus {
  PENDING = 'PENDING',
  SETTLED = 'SETTLED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}
```

#### TransactionEventType
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

## Webhook Processing

### Processor One Webhook Format

#### Authorization Transaction
```json
{
  "id": "2035ed99-38ab-4a42-8125-fcbd906dba7a",
  "mcc": "5734",
  "card_id": "21407f60-ff6d-40b9-9798-3c77496982f6",
  "user_id": "7398d3a1-cf56-469b-ade8-cb86263560b2",
  "message_type": "AUTHORIZATION",
  "merchant_name": "SP SOFTWARESTORE",
  "billing_amount": 2425,
  "billing_currency": "AED",
  "status_code": "0000",
  "status_description": "Transaction approved",
  "transaction_timestamp": "2024-06-04T08:27:44.410Z"
}
```

#### Clearing Transaction
```json
{
  "id": "6c568520-ef8e-439c-8d2f-539c4ac3f065",
  "mcc": "5734",
  "card_id": "21407f60-ff6d-40b9-9798-3c77496982f6",
  "user_id": "7398d3a1-cf56-469b-ade8-cb86263560b2",
  "message_type": "CLEARING",
  "merchant_name": "SP SOFTWARESTORE",
  "billing_amount": 245,
  "billing_currency": "AED",
  "parent_transaction_id": "2035ed99-38ab-4a42-8125-fcbd906dba7a",
  "settlement_status": "MATCHED",
  "transaction_timestamp": "2024-06-05T03:27:12.632Z"
}
```

### Processor Two Webhook Format

#### Authorization Event
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
      "scheme_billing_currency": "682"
    }
  }
}
```

#### Clearing Event
```json
{
  "id": "683931c5-02cd-4cf8-b157-1ec62e27b9b1",
  "type": "ACCOUNT_TRANSACTION_POSTED",
  "transaction": {
    "id": "f3dbd518-87da-40ea-b3fb-522cba86afa6",
    "status": "POSTED",
    "amount": "3124",
    "posted_at": "2023-10-04T00:00:05.481116Z"
  }
}
```

### Webhook Validation Rules

1. **Signature Verification**: All webhooks must include valid HMAC signatures
2. **Timestamp Validation**: Requests older than 5 minutes are rejected
3. **Idempotency**: Duplicate transactions are handled gracefully
4. **Schema Validation**: Request payloads must match processor-specific schemas
5. **Required Fields**: All mandatory fields must be present and valid

## Rate Limiting & Throttling

### Rate Limits

| Endpoint | Rate Limit | Window |
|----------|------------|--------|
| `POST /webhook/*` | 1000 req/min | Per processor |
| `GET /transactions` | 100 req/min | Per client |
| `GET /health` | 1000 req/min | Global |

### Throttling Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995260
Retry-After: 60
```

### Rate Limit Exceeded Response

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995260
Retry-After: 60

{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Rate limit exceeded. Try again in 60 seconds.",
  "retryAfter": 60
}
```

## SDK Examples

### Node.js SDK Usage

```typescript
import { PemoClient } from '@pemo/sdk';

const client = new PemoClient({
  baseUrl: 'https://api.pemo.com/v1',
  apiKey: 'your-api-key'
});

// Query transactions
const transactions = await client.transactions.list({
  cardId: '21407f60-ff6d-40b9-9798-3c77496982f6',
  page: 1,
  limit: 10
});

// Process webhook
app.post('/webhook/processor-one', async (req, res) => {
  try {
    const result = await client.webhooks.verify(req.body, req.headers);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});
```

### Python SDK Usage

```python
from pemo_sdk import PemoClient

client = PemoClient(
    base_url='https://api.pemo.com/v1',
    api_key='your-api-key'
)

# Query transactions
transactions = client.transactions.list(
    card_id='21407f60-ff6d-40b9-9798-3c77496982f6',
    page=1,
    limit=10
)

# Process webhook
@app.route('/webhook/processor-one', methods=['POST'])
def process_webhook():
    try:
        result = client.webhooks.verify(request.json, request.headers)
        return {'success': True}
    except Exception as error:
        return {'success': False, 'error': str(error)}, 400
```

This comprehensive API documentation provides developers with all the information needed to integrate with the PEMO payment processing system, including detailed endpoint specifications, error handling, and practical SDK examples.