# PEMO Processing System - Sequence Diagrams

## Authorization Transaction Flow

```mermaid
sequenceDiagram
    participant PP as Payment Processor
    participant GW as Gateway Service
    participant AM as Adapter Manager
    participant PA as Processor Adapter
    participant TS as Transaction Service
    participant Q as Queue
    participant JP as Job Processor
    participant EH as Event Handler
    participant DB as Database
    participant CS as Card Service

    Note over PP,GW: Authorization Transaction Processing Flow

    PP->>GW: POST /webhook/processor-one
    Note over PP: Authorization webhook payload

    GW->>AM: getAdapter(processorId)
    AM-->>GW: ProcessorAdapter instance

    GW->>PA: validateAndParseTransaction(data)
    PA->>PA: Validate schema
    PA->>PA: Parse to transaction details
    PA-->>GW: Parsed transaction details
    GW->> PA: authorizeTransaction(data)
    PA->>PA: Validate signature and/or check api key and perform any logic
    PA->> GW: transaction authorized

    alt Validation success
        GW->>TS: processTransaction(details)
        TS->>Q: Add job to queue
        Q-->>TS: Job queued
        TS-->>GW: Success
        GW-->>PP: 202 Accepted

        Note over Q,CS: Async Processing

        Q->>JP: Process job
        JP->>TS: processAuthorizationTransaction(data)
        
        TS->>DB: Begin transaction
        TS->>DB: findOrCreate transaction
        TS->>DB: Create transaction event
        TS-->>DB: Commit transaction

        TS->>EH: Emit transaction.AUTHORIZATION
        EH->>CS: Calculate card utilization

        CS->>DB: SELECT FOR UPDATE card
        CS->>DB: Update balances
        CS-->>DB: Commit update

        EH->>DB: Log event handled
        EH->>DB: Log cardholder notified
        EH-->>TS: Done

        TS-->>JP: Done
        JP-->>Q: Job completed
    else Validation failed
        GW-->>PP: 400 Bad Request
        Note over GW: Validation errors returned
    end

```

## Clearing Transaction Flow

```mermaid
sequenceDiagram
    participant PP as Payment Processor
    participant GW as Gateway Service
    participant AM as Adapter Manager
    participant PA as Processor Adapter
    participant TS as Transaction Service
    participant Q as Queue
    participant JP as Job Processor
    participant EH as Event Handler
    participant DB as Database
    participant CS as Card Service
    participant NS as Notifcation Service
    participant AS Analytics Service

    Note over PP,GW: Clearing Transaction Processing Flow

    PP->>GW: POST /webhook/processor-one
    Note over PP: Clearing webhook payload

    GW->>AM: getAdapter(processorId)
    AM-->>GW: ProcessorAdapter instance

    GW->>PA: validateAndParseTransaction(data)
    PA->>PA: Validate schema
    PA->>PA: Parse to transaction details
    PA-->>GW: Parsed transaction details
    GW->> PA: authorizeTransaction(data)
    PA->>PA: Validate signature and/or check api key and perform any logic
    PA->> GW: transaction authorized

    alt Validation success
        GW->>TS: processTransaction(details)
        TS->>Q: Add job to queue
        Q-->>TS: Job queued
        TS-->>GW: Success
        GW-->>PP: 202 Accepted

        Note over Q,CS: Async Processing

        Q->>JP: Process job
        JP->>TS: processClearingTransaction(data)
        
        TS->>DB: Begin transaction
        TS->>DB: findOne transaction (for update)
        TS->>DB: update transaction
        TS->>DB: Create transaction event
        TS-->>DB: Commit transaction

        TS->>EH: Emit transaction.CLEARING
        EH->>CS: Calculate card utilization
        EH->>AS: Log analytics

        CS->>DB: SELECT FOR UPDATE card
        CS->>DB: Update balances
        CS-->>DB: Commit update

        EH->>DB: Log event handled
        EH->>DB: Log analytics sent
        EH-->>TS: Done

        TS-->>JP: Done
        JP-->>Q: Job completed
    else Validation failed
        GW-->>PP: 400 Bad Request
        Note over GW: Validation errors returned
    end

```

## Transaction Query Flow

```mermaid
sequenceDiagram
    participant Client as API Client
    participant GW as Gateway Service
    participant TS as Transaction gRPC Service
    participant QS as Query Service
    participant DB as Database

    Note over Client,DB: Transaction Query Flow

    Client->>+GW: GET /transactions?cardId=123&limit=10&page=1
    
    GW->>GW: Validate query parameters
    GW->>+TS: getTransactions(query) via gRPC
    
    TS->>+QS: getTransactions(query)
    QS->>QS: Build WHERE clause
    QS->>QS: Calculate pagination offset
    
    QS->>+DB: findAndCountAll transactions
    DB->>-QS: {rows: Transaction[], count: number}
    
    QS->>QS: Format transaction responses
    QS->>QS: Map billing amounts
    QS->>QS: Format timestamps
    
    QS->>-TS: IGetTransactionResponse
    TS->>-GW: Transaction response
    
    GW->>GW: Transform to HTTP response
    GW->>-Client: 200 OK with transaction data

    Note over Client: Response includes:<br/>- transactions[]<br/>- total count<br/>- pagination info
```

## Multi-Processor Adapter Flow

```mermaid
sequenceDiagram
    participant PP1 as Processor One
    participant PP2 as Processor Two
    participant GW as Gateway Service
    participant AM as Adapter Manager
    participant PA1 as Processor One Adapter
    participant PA2 as Processor Two Adapter
    participant SV as Signature Service
    participant DS as Decryption Service

    Note over PP1,DS: Multi-Processor Support Flow

    par Processor One Transaction
        PP1->>+GW: POST /webhook/processor-one
        GW->>+AM: getAdapter('processor-one')
        AM->>-GW: ProcessorOneAdapter
        
        GW->>+PA1: validateAndParseTransaction(data)
        PA1->>+SV: verifySignature(data, signature, secret)
        SV->>-PA1: signature valid
        PA1->>PA1: Validate Zod schema
        PA1->>PA1: Parse processor-specific fields
        PA1->>-GW: ITransactionDetails
        
        GW->>GW: Forward to transaction service
        GW->>-PP1: 202 Accepted

    and Processor Two Transaction
        PP2->>+GW: POST /webhook/processor-two
        GW->>+AM: getAdapter('processor-two')
        AM->>-GW: ProcessorTwoAdapter
        
        GW->>+PA2: validateAndParseTransaction(data)
        PA2->>+DS: decrypt(encryptedData, key)
        DS->>-PA2: decrypted payload
        PA2->>PA2: Validate event schema
        PA2->>PA2: Extract transaction from event
        PA2->>-GW: ITransactionDetails
        
        GW->>GW: Forward to transaction service
        GW->>-PP2: 202 Accepted
    end

    Note over GW: Both processors use same<br/>downstream processing pipeline
```

## Error Handling and Retry Flow

```mermaid
sequenceDiagram
    participant PP as Payment Processor
    participant GW as Gateway Service
    participant PA as Processor Adapter
    participant TS as Transaction Service
    participant Q as Queue (BullMQ)
    participant JP as Job Processor
    participant DB as Database

    Note over PP,DB: Error Handling and Retry Flow

    PP->>+GW: POST/webhook/processor-one
    
    GW->>+PA: validateAndParseTransaction(data)
    PA->>-GW: Validation error
    
    GW->>-PP: 422 Unprocessable Entity
    Note right of GW: Early validation failure

    PP->>+GW: POST /webhook/processor-one (retry)
    GW->>+PA: validateAndParseTransaction(data)
    PA->>-GW: Success - ITransactionDetails
    
    GW->>+TS: processTransaction(data)
    TS->>+Q: Add job with retry config
    Note right of Q: attempts: 3<br/>backoff: exponential<br/>delay: 2000ms
    Q->>-TS: Job queued
    GW->>-PP: 200 OK

    Q->>+JP: Process job (attempt 1)
    JP->>+TS: processTransaction(data)
    TS->>+DB: Database operation
    DB->>-TS: Connection timeout
    TS->>-JP: Database error
    JP->>-Q: Job failed (attempt 1)

    Note over Q: Wait for backoff delay

    Q->>+JP: Process job (attempt 2)
    JP->>+TS: processTransaction(data)
    TS->>+DB: Database operation
    DB->>-TS: Constraint violation (duplicate)
    TS->>TS: Handle gracefully (idempotent)
    TS->>-JP: Success (already processed)
    JP->>-Q: Job completed

    Note over Q,DB: Job succeeded on retry<br/>with idempotent handling
```

## Event-Driven Processing Flow

```mermaid
sequenceDiagram
    participant TS as Transaction Service
    participant EM as Event Emitter
    participant AEH as Authorization Event Handler
    participant CEH as Clearing Event Handler
    participant NS as Notification Service
    participant AS as Analytics Service
    participant DB as Database

    Note over TS,AS: Event-Driven Processing Flow

    TS->>+EM: emit('transaction.AUTHORIZATION', transaction)
    
    EM->>+AEH: handleAuthorizationEvent(transaction)
    AEH->>+DB: Begin transaction
    
    par Card Utilization
        AEH->>DB: Calculate and update card utilization
        AEH->>DB: Create AUTHORIZATION_EVENT_HANDLED event
    and Cardholder Notification
        AEH->>+NS: Send notification (mock)
        NS->>-AEH: Notification queued
        AEH->>DB: Create CARDHOLDER_NOTIFIED event
    end
    
    AEH->>+DB: Commit transaction
    DB->>-AEH: Transaction committed
    AEH->>-EM: Authorization handling complete
    
    Note over EM: Later, for clearing...
    
    TS->>+EM: emit('transaction.CLEARING', transaction)
    
    EM->>+CEH: handleClearingEvent(transaction)
    CEH->>+DB: Begin transaction
    
    par Card Balance Update
        CEH->>DB: Update card settled/pending balances
        CEH->>DB: Create CLEARING_EVENT_HANDLED event
    and Analytics Event
        CEH->>+AS: Send analytics data (mock)
        AS->>-CEH: Analytics sent
        CEH->>DB: Create ANALYTICS_SENT event
    end
    
    CEH->>+DB: Commit transaction
    DB->>-CEH: Transaction committed
    CEH->>-EM: Clearing handling complete

    Note over TS,AS: All events are processed<br/>asynchronously and atomically
```
---
This sequence diagram documentation illustrates the key workflows and interactions within the PEMO  processing system, covering:

1. **Authorization Transaction Flow**: Complete webhook processing to database persistence
2. **Clearing Transaction Flow**: Settlement processing and card balance updates
3. **Transaction Query Flow**: API querying with pagination
4. **Multi-Processor Flow**: Adapter pattern implementation for different processors
5. **Error Handling**: Retry mechanisms and graceful error handling
6. **Event-Driven Processing**: Asynchronous event handling

Each diagram demonstrates the system's robust architecture, error handling, and data consistency mechanisms.