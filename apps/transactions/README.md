# Transaction Service

The Transaction Service is the core processing engine of the PEMO payment processing system. It handles transaction persistence, event processing, card utilization management, and provides gRPC endpoints for internal service communication.

## 🎯 Purpose

- **Transaction Processing**: Core logic for authorization and clearing transactions
- **Event Handling**: Process transaction events and trigger downstream actions
- **Card Management**: Calculate and update card utilization and balances
- **Data Persistence**: Manage transaction and card data in PostgreSQL
- **Queue Processing**: Handle background job processing with BullMQ

## 🏗️ Architecture

```
┌─────────────────┐
│  Gateway Service│
└─────────┬───────┘
          │ gRPC
┌─────────▼───────┐    ┌─────────────────┐    ┌─────────────────┐
│ Transaction     │    │    BullMQ       │    │   PostgreSQL    │
│ gRPC Service    │◄──►│    Queue        │    │   Database      │
└─────────┬───────┘    └─────────────────┘    └─────────────────┘
          │
┌─────────▼───────┐
│ Transaction     │
│ Processing      │
│ Service         │
└─────────┬───────┘
          │ Events
┌─────────▼───────┐    ┌─────────────────┐
│ Event Handlers  │    │  Card Service   │
│ - Authorization │◄──►│ - Utilization   │
│ - Clearing      │    │ - Balance Mgmt  │
└─────────────────┘    └─────────────────┘
```

## 🚀 Features

### Transaction Processing
- **Authorization Handling**: Process payment authorization requests
- **Clearing Processing**: Handle payment clearing and settlement
- **Transaction Correlation**: Link authorization and clearing transactions
- **Duplicate Prevention**: Ensure idempotent transaction processing

### Event-Driven Architecture
- **Async Processing**: Background event handling with BullMQ
- **Event Types**: Support for authorization, clearing, notification, and analytics events
- **Event Persistence**: Complete audit trail of all transaction events
- **Error Recovery**: Retry mechanisms for failed event processing

### Card Management
- **Balance Calculations**: Real-time card balance and utilization updates
- **Credit Limits**: Enforce card credit limits and calculate available credit
- **Race Condition Prevention**: Use SELECT FOR UPDATE for data consistency
- **Utilization Tracking**: Monitor card utilization percentages

### Data Management
- **ACID Compliance**: Ensure data consistency with database transactions
- **Schema Evolution**: Support for database migrations and schema changes
- **Query Optimization**: Efficient queries with proper indexing
- **Data Validation**: Comprehensive validation at all layers

## 📁 Project Structure

```
src/
├── app/
│   ├── models/
│   │   ├── transaction.model.ts           # Transaction entity
│   │   ├── card.model.ts                  # Card entity
│   │   ├── transaction-event.model.ts     # Event entity
│   │   └── index.ts
│   ├── transactions/
│   │   ├── controllers/
│   │   │   ├── transactions-grpc.controller.ts  # gRPC endpoints
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── transactions-processing.service.ts  # Core processing
│   │   │   ├── transactions-grpc.service.ts       # gRPC service
│   │   │   ├── transaction-query.service.ts       # Query service
│   │   │   └── index.ts
│   │   ├── job-processors/
│   │   │   ├── transactions-job.processor.ts      # Queue processing
│   │   │   └── index.ts
│   │   ├── constants/
│   │   │   ├── queues.constants.ts
│   │   │   └── index.ts
│   │   └── transactions.module.ts
│   ├── events/
│   │   ├── handlers/
│   │   │   ├── authorization-event.handler.ts     # Authorization events
│   │   │   ├── clearing-event.handler.ts          # Clearing events
│   │   │   └── index.ts
│   │   ├── constants/
│   │   │   ├── card-limit.constant.ts
│   │   │   └── index.ts
│   │   └── event.module.ts
│   └── app.module.ts
├── main.ts
└── assets/
```
