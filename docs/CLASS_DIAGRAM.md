# PEMO Payment Processing System - Class Diagrams

## Gateway Service Class Diagram

```mermaid
classDiagram
direction TB
    class GatewayController {
	    -gatewayService: GatewayService
	    +handleWebhook(processorId: string, body: unknown, headers: RequestHeaders): Promise~ProcessResponse~
	    +getTransactions(query: GetTransactionsQuery) : Promise~TransactionsResponse~
    }

    class GatewayService {
	    -transactionProcessingService: TransactionProcessingService 
	    -transactionQueryService: TransactionQueryService
	    +handleWebhook(processorId: string, data: unknown, headers: RequestHeaders) : Promise~ProcessResult~
	    +getTransactions(query: GetTransactionsQuery) : Result~TransactionsResult~
    }

    class TransactionQueryService {
	    -transactionsClient: ClientGrpc
	    +getTransactions(query: GetTransactionsQuery) : Promise~TransactionsResult~
    }

    class TransactionProcessingService {
        -processorAdapterManager: ProcessorAdapterManager
        -transactionsClient: ClientGrpc
        -validateAndParseTransaction(processorId: string, body: unknown): Promise~ITransactionDetails~
        -authorizeTransaction(processorId: string, data: unknown, headers: RequestHeaders): Promise~any~
        +processTransaction(processorId: string, body: unknown, headers: RequestHeaders):Promise~ProcessResult~
    }
    
    class ProcessorAdapterManager {
	    -adapters: Map
	    +getProcessorAdapter(processorId: string) : Promise~IProcessorAdapter~
        +getProcessorAdapterOrThrow(processorId: string) : Promise~IProcessorAdapter~
	    +getProcessorIds():Promise~string[]~
        -discoverProcessorAdapters():Promise~any~
	    -validateProcessorAdapter(instance: unknown, processorId: string) : Promise~any~
	    -validateHasMethods() : void
    }

    class IProcessorAdapter {
	    +validateAndParseTransaction(data: unknown) : Promise~Result~
	    +authorizeTransaction(data: unknown, headers: RequestHeaders) : Promise~Result~
    }

    class ProcessorOneAdapter {
	    -signatureService: SignatureVerificationService
	    +validateAndParseTransaction(data: unknown) : Promise~Result~
	    +authorizeTransaction(data: unknown, headers: RequestHeaders) : Promise~Result~
    }

    class ProcessorTwoAdapter {
	    -decryptionService: DecryptionService
	    +validateAndParseTransaction(data: unknown) : Promise~Result~
	    +authorizeTransaction(data: unknown, headers: RequestHeaders) : Promise~Result~
    }

    class SignatureVerificationService {
	    +verifySignature(data: string, signature: string, publicKey: string, algorithm: string) : Promise~boolean~
    }

    class DecryptionService {
	    +privateDecrypt(encryptedData: string, privateKey: string) : Promise~string~
    }

    class ClientGrpc {

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