
# PEMO Payment Processing System - API Documentation

  

## Table of Contents

1.  [API Overview](#api-overview)

2.  [Authentication & Security](#authentication--security)

3.  [Gateway Service Endpoints](#gateway-service-endpoints)

4.  [Error Handling](#error-handling)

  

## API Overview

  

The PEMO Processing System exposes two primary API surfaces:

  

-  **Gateway Service**: HTTP/REST API for external integrations and queries

-  **Transaction Service**: gRPC API for internal service communication ( exposed to gateway service only not to external consumers )

  

### Base URLs

-  **Gateway Service**: `http://localhost:3000` (development env and port configurable via GATEWAY_PORT)  

-  **Transaction Service**: `grpc://localhost:50052` (configurable via TRANSACTIONS_GRPC_URL)
-   

## Authentication & Security

  

### Webhook Authentication

Payment processor webhooks are authenticated using different methods based on the payment processor specifications:

  

```http

POST /gateway/webhook/processor-one

Content-Type: application/json

x-message-signature: sha256=<HMAC-SHA256-signature>  

{

"id": "..."

}

```

  

### Sample Signature Verification Process

1. Extract signature from `x-message-signature` header

2. Concatenate payload to sign based on processor specs

3. Generate HMAC-SHA256 using processor secret

4. Compare signatures using timing-safe comparison

  

### Internal Service Authentication ( to be implemented )

- gRPC services would use mutual TLS (mTLS) for secure communication

- Service-to-service authentication via JWT tokens

- Network isolation within private subnets

### User Authentication ( to be implemented ) 
- Many approcahes can be used one of them is using oauth with a self hosted identity server like keycloak or cloud services like auth0

  

## Gateway Service Endpoints

  

### Webhook Endpoints

  

#### Process Processor Webhook

Receives and processes webhooks from payment processors.

  

```http

POST /webhook/{processorId}

```

  

**Path Parameters:**

-  `processorId` (string, required): Identifier for the payment processor (`processor-one`, `processor-two`)

  

**Headers:**

-  `Content-Type: application/json`

-  `x-message-signature (string, required): HMAC signature for request verification


  

**Request Body:**

Processor-specific JSON payload (varies by processor)

  

**Responses:**

  

Success Response:

```http

HTTP/1.1 202 Accepted

Content-Type: application/json

  

{

"success": true,

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

curl  -X  POST  http://localhost:3000/gateway/webhook/processor-one  \

-H "Content-Type: application/json" \

-H  "X-Message-Signature: sha256=abc123..."  \

-H "X-Api-Key: Bearer processor-api-key" \

-d  '{

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

GET /transactions

```

  

**Query Parameters:**

-  `cardId` (string, optional): Filter by card ID

-  `processorId` (string, optional): Filter by processor ID

-  `status` (string, optional): Filter by transaction status (`PENDING`, `SETTLED``)

-  `page` (integer, required): Page number (1-based)

-  `limit` (integer, required): Number of transactions per page (1-100)

  

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

curl  -X  GET  "http://localhost:3000/gateway/transactions?cardId=21407f60-ff6d-40b9-9798-3c77496982f6&page=1&limit=10"  \

-H "Accept: application/json"

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

"success":  false,

"error":  "ERROR_CODE",

"message":  "Human-readable error description",

"details":  [

"Specific validation error 1",

"Specific validation error 2"

],

"timestamp":  "2024-01-15T10:30:00.000Z",

"requestId":  "req_123456789"

}

```

  

### Common Error Codes

  

| Error Code | HTTP Status | Description |

|------------|-------------|-------------|

|  `VALIDATION_ERROR`  | 400 | Request data validation failed |

|  `INVALID_SIGNATURE`  | 401 | Webhook signature verification failed |

|  `PROCESSOR_NOT_FOUND`  | 404 | Unknown processor ID |

|  `TRANSACTION_NOT_FOUND`  | 404 | Transaction not found |

|  `DUPLICATE_TRANSACTION`  | 422 | Transaction already exists |

|  `INVALID_TRANSACTION_STATE`  | 422 | Invalid state transition |

|  `RATE_LIMIT_EXCEEDED`  | 429 | Too many requests |

|  `DATABASE_ERROR`  | 500 | Database operation failed |

|  `QUEUE_ERROR`  | 500 | Queue operation failed |

|  `INTERNAL_ERROR`  | 500 | Unexpected system error |

  ---
# You can refer to [gatewayServiceUrl]/api-docs for interactive api docs.