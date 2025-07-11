# PEMO Payment Processing System - Class Diagrams

## Gateway Service Class Diagram

```mermaid
classDiagram
direction TB

class GatewayController {
    - gatewayService: GatewayService
    + handleWebhook(processorId: string, body: unknown, headers: RequestHeaders)
    + getTransactions(query: GetTransactionsQuery)
}

class GatewayService {
    - transactionProcessingService: TransactionProcessingService 
    - transactionQueryService: TransactionQueryService
    + handleWebhook(processorId: string, data: unknown, headers: RequestHeaders)
    + getTransactions(query: GetTransactionsQuery)
}

class TransactionQueryService {
    - transactionsClient: ClientGrpc
    + getTransactions(query: GetTransactionsQuery)
}

class TransactionProcessingService {
    - processorAdapterManager: ProcessorAdapterManager
    - transactionsClient: ClientGrpc
    - validateAndParseTransaction(processorId: string, body: unknown)
    - authorizeTransaction(processorId: string, data: unknown, headers: RequestHeaders)
    + processTransaction(processorId: string, body: unknown, headers: RequestHeaders)
}

class ProcessorAdapterManager {
    - adapters: Map
    + getProcessorAdapter(processorId: string)
    + getProcessorAdapterOrThrow(processorId: string)
    + getProcessorIds()
    - discoverProcessorAdapters()
    - validateProcessorAdapter(instance: unknown, processorId: string)
    - validateHasMethods()
}

class IProcessorAdapter {
    + validateAndParseTransaction(data: unknown)
    + authorizeTransaction(data: unknown, headers: RequestHeaders)
}

class ProcessorOneAdapter {
    - signatureService: SignatureVerificationService
    + validateAndParseTransaction(data: unknown)
    + authorizeTransaction(data: unknown, headers: RequestHeaders)
}

class ProcessorTwoAdapter {
    - decryptionService: DecryptionService
    + validateAndParseTransaction(data: unknown)
    + authorizeTransaction(data: unknown, headers: RequestHeaders)
}

class SignatureVerificationService {
    + verifySignature(data: string, signature: string, publicKey: string, algorithm: string)
}

class DecryptionService {
    + privateDecrypt(encryptedData: string, privateKey: string)
}

class ClientGrpc {
    # placeholder
}

class ITransactionDetails {
    # placeholder
}

<<interface>> IProcessorAdapter
<<interface>> ITransactionDetails

GatewayController --> GatewayService
GatewayService --> TransactionQueryService
GatewayService --> TransactionProcessingService
TransactionProcessingService --> ProcessorAdapterManager
TransactionProcessingService --> ClientGrpc
TransactionQueryService --> ClientGrpc
ProcessorAdapterManager --> IProcessorAdapter
ProcessorOneAdapter ..|> IProcessorAdapter
ProcessorTwoAdapter ..|> IProcessorAdapter
ProcessorOneAdapter --> SignatureVerificationService
ProcessorTwoAdapter --> DecryptionService
ProcessorTwoAdapter --> SignatureVerificationService
```

## Transaction Service Class Diagram

```mermaid
classDiagram
    class TransactionsGrpcController {
        - transactionsGrpcService: TransactionsGrpcService
        + processTransaction(data: ITransactionDetails): Promise<ProcessResult>
        + getTransactions(query: IGetTransactionsRequest): Promise<TransactionsResult>
    }

    class TransactionsGrpcService {
        - queue: Queue
        - transactionsQueryService: TransactionQueryService
        + processTransaction(data: ITransactionDetails): Promise<ProcessResult>
        + getTransactions(query: IGetTransactionsRequest): Promise<TransactionsResult>
    }

    class TransactionQueryService {
        - transactionModel:  Transaction
        + getTransactions(query: IGetTransactionsRequest): Promise<TransactionsResult>
    }

    class TransactionsJobProcessor {
        - transactionsService:TransactionService
        +process(job: Job<ITransactionDetails>) : void
    }

    class TransactionService {
         - transactionModel:  Transaction
         - transactionEventModel:  TransactionEvent
         - sequelize: Sequelize
         - eventEmitter: EventEmitter2

         +processAuthorizationTransaction(data: ITransactionDetails):void
         +processClearingTransaction(data: ITransactionDetails):void

    }

    class AuthorizationEventHandler {
         - cardModel:  Card
         - transactionEventModel:  TransactionEvent
         - sequelize: Sequelize

         +handleAuthorizationEvent(transaction: Transaction):void
    }

    class ClearingEventHandler {
         - cardModel:  Card
         - transactionEventModel:  TransactionEvent
         - sequelize: Sequelize

         +handleClearingEvent(transaction: Transaction):void
    }

    class Queue {
      
    }

    class Transaction {
      
    }

    class Card {
      
    }

    class TransactionEvent {
        
    }
    class Sequelize {

    }
    class EventEmitter2 {

    }


    TransactionsGrpcController --> TransactionsGrpcService
    TransactionsGrpcService --> TransactionQueryService
    TransactionsGrpcService --> Queue
    TransactionQueryService --> Transaction
    TransactionQueryService --> TransactionEvent
    TransactionsJobProcessor --> TransactionService
    TransactionService --> Transaction
    TransactionService --> TransactionEvent
    TransactionService --> Sequelize
    TransactionService --> EventEmitter2
    AuthorizationEventHandler --> Card
    AuthorizationEventHandler --> TransactionEvent
    AuthorizationEventHandler --> Sequelize 
    ClearingEventHandler --> Card
    ClearingEventHandler --> TransactionEvent
    ClearingEventHandler --> Sequelize 

```

## Transaction service class diagram
This comprehensive class diagram documentation provides a detailed view of the PEMO payment processing system's class structure, including:

1. **Gateway System Classes**: Main controllers, services, and their relationships
2. **Transaction System Classes**: Main controllers, services, and their relationships