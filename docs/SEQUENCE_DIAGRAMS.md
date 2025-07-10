# PEMO Payment Processing System - Sequence Diagrams

## Authorization Transaction Flow

```mermaid
sequenceDiagram
    participant PP as Payment Processor
    participant GW as Gateway Service
    participant AM as Adapter Manager
    participant PA as Processor Adapter
    participant TS as Transaction Service
    participant Q as Queue (BullMQ)
    participant JP as Job Processor
    participant EH as Event Handler
    participant DB as Database
    participant Card as Card Service

    Note over PP,Card: Authorization Transaction Processing Flow

    PP->>+GW: POST /webhook/processor-one
    Note right of PP: Authorization webhook payload

    GW->>+AM: getAdapter(processorId)
    AM->>-GW: ProcessorAdapter instance

    GW->>+PA: validateAndParseTransaction(data)
    PA->>PA: Validate signature
    PA->>PA: Validate schema
    PA->>PA: Parse to ITransactionDetails
    PA->>-GW: Result<ITransactionDetails>

    alt Validation Success
        GW->>+TS: processTransaction(transactionDetails)
        TS->>+Q: Add job to queue
        Q->>-TS: Job queued successfully
        TS->>-GW: {success: true}
        GW->>-PP: 200 OK

        Note over Q,Card: Async Processing

        Q->>+JP: Process job
        JP->>+TS: processAuthorizationTransaction(data)
        
        TS->>+DB: Begin transaction
        TS->>DB: findOrCreate transaction
        TS->>DB: Create transaction event
        TS->>-DB: Commit transaction

        TS->>+EH: Emit 'transaction.AUTHORIZATION' event
        EH->>+Card: Calculate card utilization
        
        Card->>+DB: SELECT FOR UPDATE card
        Card->>DB: Update card balances
        Card->>-DB: Commit card update

        EH->>DB: Create AUTHORIZATION_EVENT_HANDLED event
        EH->>DB: Create CARDHOLDER_NOTIFIED event
        EH->>-TS: Event processing complete

        TS->>-JP: Transaction processed
        JP->>-Q: Job completed

    else Validation Failed
        GW->>-PP: 400 Bad Request
        Note right of GW: Validation errors returned
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
    participant Q as Queue (BullMQ)
    participant JP as Job Processor
    participant EH as Event Handler
    participant DB as Database
    participant Card as Card Service

    Note over PP,Card: Clearing Transaction Processing Flow

    PP->>+GW: POST /webhook/processor-one
    Note right of PP: Clearing webhook payload

    GW->>+AM: getAdapter(processorId)
    AM->>-GW: ProcessorAdapter instance

    GW->>+PA: validateAndParseTransaction(data)
    PA->>PA: Validate signature
    PA->>PA: Parse clearing data
    PA->>PA: Extract parent transaction ID
    PA->>-GW: Result<ITransactionDetails>

    alt Validation Success
        GW->>+TS: processTransaction(transactionDetails)
        TS->>+Q: Add clearing job to queue
        Q->>-TS: Job queued successfully
        TS->>-GW: {success: true}
        GW->>-PP: 200 OK

        Note over Q,Card: Async Clearing Processing

        Q->>+JP: Process clearing job
        JP->>+TS: processClearingTransaction(data)
        
        TS->>+DB: Begin transaction
        TS->>DB: Find pending transaction (SELECT FOR UPDATE)
        
        alt Transaction Found
            TS->>DB: Update transaction with clearing data
            TS->>DB: Create clearing event
            TS->>-DB: Commit transaction

            TS->>+EH: Emit 'transaction.CLEARING' event
            EH->>+Card: Update card utilization
            
            Card->>+DB: SELECT FOR UPDATE card
            Card->>Card: Calculate new balances
            Note right of Card: settled_balance += auth_amount<br/>pending_balance -= auth_amount
            Card->>DB: Update card balances
            Card->>-DB: Commit card update

            EH->>DB: Create CLEARING_EVENT_HANDLED event
            EH->>DB: Create ANALYTICS_SENT event
            EH->>-TS: Clearing processing complete

        else Transaction Not Found
            TS->>DB: Rollback transaction
            TS->>-EH: Log error and handle gracefully
        end

        TS->>-JP: Clearing processed
        JP->>-Q: Job completed

    else Validation Failed
        GW->>-PP: 400 Bad Request
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
        GW->>-PP1: 200 OK

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
        GW->>-PP2: 200 OK
    end

    Note over GW: Both processors use same<br/>downstream processing pipeline
```

## Error Handling and Retry Flow

```mermaid
sequenceDiagram
    participant PP as Payment Processor
    participant GW as Gateway Service
    participant PA as Processor Adapter
    participant Q as Queue (BullMQ)
    participant JP as Job Processor
    participant TS as Transaction Service
    participant DB as Database

    Note over PP,DB: Error Handling and Retry Flow

    PP->>+GW: POST /webhook/processor-one
    
    GW->>+PA: validateAndParseTransaction(data)
    PA->>-GW: Validation error
    
    GW->>-PP: 400 Bad Request
    Note right of GW: Early validation failure

    PP->>+GW: POST /webhook/processor-one (retry)
    GW->>+PA: validateAndParseTransaction(data)
    PA->>-GW: Success - ITransactionDetails
    
    GW->>+Q: Add job with retry config
    Note right of Q: attempts: 3<br/>backoff: exponential<br/>delay: 2000ms
    Q->>-GW: Job queued
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

## Card Utilization Update Flow

```mermaid
sequenceDiagram
    participant EH as Event Handler
    participant CM as Card Model
    participant DB as Database
    participant Logger as Logger

    Note over EH,Logger: Card Utilization Update with Race Condition Prevention

    EH->>+DB: Begin transaction
    
    EH->>+CM: findOne with SELECT FOR UPDATE
    Note right of CM: Prevents concurrent modifications
    CM->>+DB: SELECT * FROM cards WHERE card_id = ? FOR UPDATE
    DB->>-CM: Card record (locked)
    CM->>-EH: Card instance

    alt Card Found
        EH->>EH: Calculate new balances
        Note right of EH: For Authorization:<br/>pendingBalance += authAmount<br/><br/>For Clearing:<br/>settledBalance += authAmount<br/>pendingBalance -= authAmount
        
        EH->>EH: Calculate utilization
        Note right of EH: utilization = <br/>(settled + pending) / limit * 100
        
        EH->>+CM: update(newBalances)
        CM->>+DB: UPDATE cards SET ... WHERE id = ?
        DB->>-CM: Update successful
        CM->>-EH: Updated card

        alt Utilization > 100%
            EH->>+Logger: Log over-limit warning
            Logger->>-EH: Warning logged
        end

        EH->>+DB: Commit transaction
        DB->>-EH: Transaction committed

    else Card Not Found
        EH->>+Logger: Log card not found warning
        Logger->>-EH: Warning logged
        
        EH->>+DB: Rollback transaction
        DB->>-EH: Transaction rolled back
    end

    Note over EH,DB: Row-level locking ensures<br/>data consistency across<br/>concurrent transactions
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

## System Health Check Flow

```mermaid
sequenceDiagram
    participant LB as Load Balancer
    participant GW as Gateway Service
    participant TS as Transaction Service
    participant DB as Database
    participant Redis as Redis Queue

    Note over LB,Redis: System Health Check Flow

    LB->>+GW: GET /health
    
    par Gateway Health Check
        GW->>GW: Check service status
        GW->>+TS: Health check via gRPC
        TS->>TS: Check service status
        TS->>+DB: SELECT 1 (DB health)
        DB->>-TS: DB responsive
        TS->>+Redis: Ping (Queue health)
        Redis->>-TS: Queue responsive
        TS->>-GW: {status: 'healthy', services: {...}}
    end
    
    GW->>GW: Aggregate health status
    GW->>-LB: 200 OK {status: 'healthy'}

    Note over LB: Load balancer routes traffic<br/>based on health status

    alt Unhealthy Service
        GW->>+TS: Health check via gRPC
        TS->>+DB: SELECT 1
        DB-->>-TS: Connection timeout
        TS->>-GW: {status: 'unhealthy', error: 'DB_TIMEOUT'}
        GW->>-LB: 503 Service Unavailable
        
        Note over LB: Load balancer removes<br/>unhealthy instance from pool
    end
```

## Database Transaction Isolation Flow

```mermaid
sequenceDiagram
    participant T1 as Transaction 1
    participant T2 as Transaction 2
    participant DB as Database
    participant Lock as Row Lock Manager

    Note over T1,Lock: Concurrent Card Update Prevention

    par Transaction 1 (Authorization)
        T1->>+DB: BEGIN TRANSACTION
        T1->>+Lock: SELECT * FROM cards WHERE card_id = 'card-123' FOR UPDATE
        Lock->>Lock: Acquire row lock on card-123
        Lock->>-T1: Card data (locked)
        
        Note over T1: Calculate new balances<br/>pendingBalance += 1000
        
    and Transaction 2 (Clearing)
        T2->>+DB: BEGIN TRANSACTION
        T2->>+Lock: SELECT * FROM cards WHERE card_id = 'card-123' FOR UPDATE
        Lock->>Lock: Wait for lock release...
        Note right of Lock: Transaction 2 blocks<br/>waiting for lock
    end

    T1->>+DB: UPDATE cards SET pending_balance = 1500 WHERE card_id = 'card-123'
    DB->>-T1: Update successful
    
    T1->>+DB: COMMIT TRANSACTION
    DB->>Lock: Release row lock on card-123
    DB->>-T1: Transaction committed

    Note over Lock: Lock released, Transaction 2 can proceed

    Lock->>-T2: Card data (locked) - with updated balances
    
    Note over T2: Calculate new balances based on<br/>latest data from Transaction 1<br/>settledBalance += 1000<br/>pendingBalance -= 1000

    T2->>+DB: UPDATE cards SET settled_balance = 1000, pending_balance = 500 WHERE card_id = 'card-123'
    DB->>-T2: Update successful
    
    T2->>+DB: COMMIT TRANSACTION
    DB->>-T2: Transaction committed

    Note over T1,T2: Race condition prevented<br/>Data consistency maintained
```

This comprehensive sequence diagram documentation illustrates the key workflows and interactions within the PEMO payment processing system, covering:

1. **Authorization Transaction Flow**: Complete webhook processing to database persistence
2. **Clearing Transaction Flow**: Settlement processing and card balance updates
3. **Transaction Query Flow**: API querying with pagination
4. **Multi-Processor Flow**: Adapter pattern implementation for different processors
5. **Error Handling**: Retry mechanisms and graceful error handling
6. **Card Utilization**: Race condition prevention with database locking
7. **Event-Driven Processing**: Asynchronous event handling
8. **Health Checks**: System monitoring and load balancer integration
9. **Database Isolation**: Concurrent transaction safety

Each diagram demonstrates the system's robust architecture, error handling, and data consistency mechanisms.