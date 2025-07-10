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
- **Health Monitoring**: Health check endpoints for system monitoring

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

## 🔌 API Endpoints

### Webhook Endpoints

#### Process Webhook
```http
POST /webhook/{processorId}
Content-Type: application/json
X-Signature: sha256=<signature>
X-Timestamp: <timestamp>

{
  "transaction_data": "..."
}
```

**Path Parameters:**
- `processorId`: Identifier for the payment processor

**Headers:**
- `X-Signature`: HMAC-SHA256 signature for verification
- `X-Timestamp`: Request timestamp for replay protection

**Response:**
```json
{
  "success": true,
  "message": "Transaction processed successfully",
  "transactionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Query Endpoints

#### Get Transactions
```http
GET /transactions?cardId=123&processorId=processor-one&page=1&limit=10
```

**Query Parameters:**
- `cardId` (optional): Filter by card ID
- `processorId` (optional): Filter by processor ID
- `status` (optional): Filter by transaction status
- `page` (required): Page number (1-based)
- `limit` (required): Items per page (1-100)

**Response:**
```json
{
  "transactions": [...],
  "total": 150,
  "page": 1,
  "limit": 10
}
```

### Health Endpoints

#### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "transactionService": {
      "status": "healthy",
      "responseTime": "8ms"
    }
  }
}
```

## 🔧 Configuration

### Environment Variables

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# gRPC Configuration
TRANSACTIONS_GRPC_URL=localhost:50051

# Processor Configuration
PROCESSOR_ONE_SECRET=your-secret-key
PROCESSOR_TWO_SECRET=your-secret-key

# Logging
LOG_LEVEL=info
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
    GatewayModule,
    TransactionsModule,
    ProcessorAdapterManagerModule,
    ProcessorOneAdapterModule.register({
      secret: process.env.PROCESSOR_ONE_SECRET,
    }),
    ProcessorTwoAdapterModule.register({
      secret: process.env.PROCESSOR_TWO_SECRET,
    }),
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
npx nx serve gateway
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
npx nx test gateway
```

### Building

```bash
# Build for production
npm run build

# Using Nx
npx nx build gateway
```

## 🔍 Request/Response Flow

### Webhook Processing Flow

1. **Request Reception**: Gateway receives webhook from payment processor
2. **Processor Identification**: Extract processor ID from URL path
3. **Adapter Resolution**: Get appropriate processor adapter from manager
4. **Signature Verification**: Validate webhook signature using processor secret
5. **Schema Validation**: Validate payload against processor-specific schema
6. **Data Transformation**: Parse and normalize transaction data
7. **gRPC Forwarding**: Send normalized data to Transaction Service
8. **Response**: Return success/error response to processor

### Query Processing Flow

1. **Request Validation**: Validate query parameters using DTOs
2. **gRPC Call**: Forward query to Transaction Service
3. **Data Formatting**: Transform response data for HTTP API
4. **Response**: Return paginated transaction data

## 🛡️ Security

### Webhook Security
- **Signature Verification**: HMAC-SHA256 signature validation
- **Timestamp Validation**: Reject requests older than 5 minutes
- **Secret Management**: Secure storage of processor secrets

### API Security
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: Protection against API abuse
- **Error Handling**: Secure error messages without information leakage

### Network Security
- **HTTPS Only**: All external communication over HTTPS
- **Internal Communication**: Secure gRPC with mTLS
- **CORS Configuration**: Proper cross-origin request handling

## 📊 Monitoring & Observability

### Health Checks
- **Service Health**: Monitor gateway service status
- **Dependency Health**: Check gRPC connection to Transaction Service
- **Custom Metrics**: Track request rates, response times, error rates

### Logging
- **Structured Logging**: JSON-formatted logs with correlation IDs
- **Request Logging**: Log all incoming requests with sanitized data
- **Error Logging**: Detailed error logging for debugging

### Metrics
- **Request Metrics**: Count, duration, status codes
- **Business Metrics**: Transaction volumes, processor success rates
- **System Metrics**: Memory usage, CPU usage, connection pools

## 🔧 Troubleshooting

### Common Issues

#### Webhook Signature Verification Failed
```
Error: Invalid signature
Solution: Verify processor secret configuration and signature format
```

#### gRPC Connection Failed
```
Error: Connection to Transaction Service failed
Solution: Check TRANSACTIONS_GRPC_URL and service availability
```

#### Transaction Not Found
```
Error: Transaction not found
Solution: Verify transaction ID and check Transaction Service logs
```

### Debug Commands

```bash
# Check service health
curl http://localhost:3000/health

# Test webhook endpoint
curl -X POST http://localhost:3000/webhook/processor-one \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=..." \
  -d '{"test": "data"}'

# Query transactions
curl "http://localhost:3000/transactions?page=1&limit=10"
```

## 🚀 Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gateway-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: gateway-service
  template:
    metadata:
      labels:
        app: gateway-service
    spec:
      containers:
      - name: gateway
        image: pemo/gateway:latest
        ports:
        - containerPort: 3000
        env:
        - name: TRANSACTIONS_GRPC_URL
          value: "transaction-service:50051"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

The Gateway Service provides a robust, secure, and scalable entry point for the PEMO payment processing system, handling webhook processing and transaction queries with comprehensive validation and monitoring capabilities.