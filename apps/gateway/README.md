# Gateway Service

The Gateway Service is the public-facing API layer of the PEMO payment processing system. It handles incoming webhook requests from payment processors and provides query endpoints for transaction data.

## 🎯 Purpose

- **Webhook Processing**: Receive and validate webhooks from multiple payment processors
- **API Gateway**: Provide RESTful endpoints for transaction queries
- **Request Routing**: Route validated requests to the Transaction Service via gRPC
- **Security Layer**: Implement webhook signature verification and request validation

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Payment       │    │   Payment       │    │   Payment       │
│   Processor 1   │    │   Processor 2   │    │   Processor N   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │ HTTP Webhooks        │ HTTP Webhooks        │ HTTP Webhooks
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    Gateway Service      │
                    │                         │
                    │  ┌─────────────────┐    │
                    │  │ Controllers     │    │
                    │  │ - Webhook       │    │
                    │  │ - Query         │    │
                    │  │ - Health        │    │
                    │  └─────────────────┘    │
                    │                         │
                    │  ┌─────────────────┐    │
                    │  │ Services        │    │
                    │  │ - Gateway       │    │
                    │  │ - Validation    │    │
                    │  └─────────────────┘    │
                    │                         │
                    │  ┌─────────────────┐    │
                    │  │ Adapters        │    │
                    │  │ - Processor One │    │
                    │  │ - Processor Two │    │
                    │  └─────────────────┘    │
                    └────────────┬────────────┘
                                 │ gRPC
                    ┌────────────▼────────────┐
                    │  Transaction Service    │
                    └─────────────────────────┘
```

## 🚀 Features

### Webhook Processing
- **Multi-Processor Support**: Handle webhooks from unlimited payment processors
- **Signature Verification**: Secure webhook authentication using HMAC signatures
- **Schema Validation**: Validate incoming payloads against processor-specific schemas
- **Async Processing**: Queue transactions for background processing

### Transaction Queries
- **RESTful API**: Standard HTTP endpoints for transaction retrieval
- **Filtering**: Support for card ID, processor ID, and status filtering
- **Pagination**: Efficient pagination for large transaction datasets
- **Response Formatting**: Consistent JSON response formats

### Security & Validation
- **Request Validation**: Comprehensive input validation using DTOs
- **Error Handling**: Standardized error responses with detailed messages
- **Rate Limiting**: Protection against abuse and overload

## 📁 Project Structure

```
src/
├── app/
│   ├── gateway/
│   │   ├── controllers/
│   │   │   ├── gateway.controller.ts       # Main webhook and query endpoints
│   │   │   ├── health.controller.ts        # Health check endpoints
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── gateway.service.ts          # Core gateway business logic
│   │   │   └── index.ts
│   │   ├── dtos/
│   │   │   ├── request/
│   │   │   │   ├── get-transactions.query.ts
│   │   │   │   └── index.ts
│   │   │   └── response/
│   │   │       ├── get-transaction.response.dto.ts
│   │   │       ├── pagination-meta.dto.ts
│   │   │       ├── transaction-details.response.dto.ts
│   │   │       └── index.ts
│   │   └── gateway.module.ts
│   ├── transactions/
│   │   ├── services/
│   │   │   ├── transactions-processing.service.ts  # gRPC client
│   │   │   ├── transactions-query.service.ts       # Query service
│   │   │   └── index.ts
│   │   ├── constants/
│   │   │   ├── grpc-client.constants.ts
│   │   │   └── index.ts
│   │   └── transactions.module.ts
│   └── app.module.ts
├── main.ts
└── assets/
```
