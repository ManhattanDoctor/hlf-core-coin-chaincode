**English** · [Русский](./README.ru.md)

# @hlf-core/coin-chaincode

> TypeScript library for chaincode-side token management: accounts, emission, transfers, holds

[![npm version](https://img.shields.io/npm/v/@hlf-core/coin-chaincode.svg)](https://www.npmjs.com/package/@hlf-core/coin-chaincode)
[![Docs](https://img.shields.io/badge/docs-hlf.gnosisai.ru-1f6feb)](https://hlf.gnosisai.ru/docs/packages/coin-chaincode)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

Full documentation: https://hlf.gnosisai.ru/docs/packages/coin-chaincode

A module for managing tokens (coins) and their accounts in the Hyperledger Fabric blockchain environment. It implements a complete set of operations for creating, emitting, transferring, holding, and burning digital assets, with event support and strict typing.

## Features

- **Complete token lifecycle**: creation, emission, burning, transfer
- **Hold system**: temporary locking of funds with the ability to release them
- **Flexible architecture**: modular structure with extensibility in mind
- **Strict typing**: full TypeScript support
- **Event model**: automatic event generation for integration
- **Error handling**: custom exceptions with detailed information
- **Atomic operations**: guaranteed data consistency

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [API Documentation](#api-documentation)
- [Usage Examples](#usage-examples)
- [DTO Interfaces](#dto-interfaces)
- [Events](#events)
- [Project Structure](#project-structure)
- [Development](#development)

## Installation

```bash
npm install @hlf-core/coin-chaincode
```

### Dependencies

```json
{
  "@hlf-core/coin": "~3.2.33",
  "@hlf-core/chaincode": "~3.6.4"
}
```

Pulled in transitively are `@ts-core/common` (v3.x, via `@hlf-core/chaincode`/`@hlf-core/coin`), `@hlf-core/common`, `fabric-shim`, `reflect-metadata`, and `lodash`.

## Quick Start

```typescript
import { CoinService, CoinManager } from '@hlf-core/coin-chaincode';
import { ILogger, IStub } from '@ts-core/common';

// Create the service
const logger: ILogger = /* your logger */;
const service = new CoinService(logger);

// Create the manager
const stub: IStub = /* your stub */;
const manager = new CoinManager(logger, stub);

// Create a coin
const coin = manager.create('MYCOIN', 18, 'owner-uid');

// Emit tokens
await manager.emit(coin, 'user-uid', '1000');

// Transfer between users
await manager.transfer(coin, 'user-uid', 'another-user-uid', '100');
```

## Architecture

### Core Components

#### 1. **CoinManager** - Main coin manager
```typescript
class CoinManager<T extends ICoin = ICoin> extends EntityManagerImpl<T>
```
- Manages the coin lifecycle
- Implements all token operations
- Works with CoinAccountManager to manage accounts

#### 2. **CoinAccountManager** - Account manager
```typescript
class CoinAccountManager extends EntityManagerImpl<CoinAccount>
```
- Manages user accounts for each coin
- Automatically removes empty accounts
- Provides methods for working with balances

#### 3. **CoinService** - Service layer
```typescript
class CoinService<H extends IStubHolder = IStubHolder> extends LoggerWrapper
```
- Facade for business logic
- Validation of input parameters
- Event dispatching
- Error handling

#### 4. **Error Classes** - Error system
```typescript
class CoinNotFoundError extends Error<string>
class CoinObjectNotFoundError extends Error<string>
class CoinFromToEqualsError extends Error<string>
```

### Architecture Diagram

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CoinService   │────│   CoinManager    │────│ CoinAccountMgr  │
│                 │    │                  │    │                 │
│ • Validation    │    │ • Coin CRUD      │    │ • Account CRUD  │
│ • Events        │    │ • Operations     │    │ • Balances      │
│ • Errors        │    │ • Transfers      │    │ • Holds         │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   IStub/State   │
                    │                 │
                    │ • Blockchain    │
                    │ • Persistence   │
                    └─────────────────┘
```

### Storing Accounts in State

A coin and its accounts are separate state records. The coin is stored under its own `uid`, while each account is stored under a composite key: "namespace + coin + owner + account":

```
coin_owner1_8_BTC                              ← the coin itself
→coin~account:coin_owner1_8_BTC~user1~OWNER    ← user1's primary account
→coin~account:coin_owner1_8_BTC~user1~PAYOUT   ← a second account of the same owner
→coin~account:coin_owner1_8_BTC~user2~OWNER    ← user2's account
```

The last part of the key is the account identifier. A single owner may have several accounts with different purposes for the same coin; the manager distinguishes between them but knows nothing about the meaning of those values — the vocabulary is defined by the application.

This scheme was chosen because Hyperledger Fabric state has no search by fields: a record can be found only by an exact key or by a range query over the start of the key. The order of the parts is chosen to fit the queries: coin before owner — all accounts of one coin are stored contiguously and selected by a single range query; owner before account — likewise, all accounts of one party are stored contiguously.

Keys are assembled by `CoinAccountUtil` from `@hlf-core/coin`; the managers do not concatenate strings themselves:

```typescript
// exact key of a single account — used in accountGet
CoinAccountUtil.createUid(coinUid, ownerUid, id);      // →coin~account:coin_owner1_8_BTC~user1~OWNER

// prefix of all accounts of a coin — used in accountList and accountsRemove
CoinAccountUtil.createPrefix(coinUid);                 // →coin~account:coin_owner1_8_BTC~

// prefix of all accounts of a single owner — used in accountList with an owner
CoinAccountUtil.createPrefix(coinUid, ownerUid);       // →coin~account:coin_owner1_8_BTC~user1~
```

The prefix must end with a separator: without it, a range query would capture accounts of coins whose identifier starts the same way (`BTC` and `BTC2`, a base coin and its serial issues).

#### Empty Accounts Are Not Stored

`CoinAccountManager.save` removes an account instead of writing it if it is empty:

```typescript
public async save(item: CoinAccount): Promise<CoinAccount> {
    if (item.isEmpty()) {
        await this.remove(item);
        return item;
    }
    return super.save(item);
}
```

As a result, the state is not cluttered with zero-balance accounts, and `accountList` returns only accounts that have a balance. The flip side: for an address with no tokens, `accountGet` will not find a record and will return a new empty account rather than `null` — it enters the state only after the first operation with a non-zero amount.

#### Removing a Coin

`CoinManager.remove` removes a coin together with all of its accounts:

```typescript
public async remove(item: UID): Promise<void> {
    await this.accountsRemove(item);   // all accounts of the coin by prefix
    await super.remove(item);          // the coin itself
}
```

Accounts are removed in a single transaction, without splitting it into parts. For a coin with a large number of holders, the volume of changes grows linearly and may hit Fabric's limits on the size of the write set or the endorsement time — in that case, removing the coin will fail entirely rather than partially.

## API Documentation

### CoinManager

#### Core Operations

```typescript
// Create a coin
create(coinId: string, decimals: number, owner: UID): T

// Get a coin
get(item: UID, details?: Array<keyof ICoin>): Promise<T>

// Save a coin
save(item: T): Promise<T>

// Remove a coin and all related accounts
remove(item: UID): Promise<void>
```

#### Token Operations

```typescript
// Emit tokens
emit(coin: T | string, object: ICoinAccountObject, value: string): Promise<ICoinMovement>
emitHeld(coin: T | string, object: ICoinAccountObject, value: string): Promise<ICoinMovement>

// Burn tokens
burn(coin: T | string, object: ICoinAccountObject, value: string): Promise<ICoinMovement>
burnHeld(coin: T | string, object: ICoinAccountObject, value: string): Promise<ICoinMovement>

// Hold tokens
hold(coin: T | string, object: ICoinAccountObject, value: string): Promise<ICoinMovement>
unhold(coin: T | string, object: ICoinAccountObject, value: string): Promise<ICoinMovement>

// Nullification (zeroing the balance)
nullify(coin: T | string, object: ICoinAccountObject): Promise<ICoinNullify>
nullifyHeld(coin: T | string, object: ICoinAccountObject): Promise<ICoinNullify>

// Transfers
transfer(coin: T | string, object: ICoinAccountObject, target: ICoinAccountObject, value: string): Promise<ICoinTransfer>
transferToHeld(coin: T | string, object: ICoinAccountObject, target: ICoinAccountObject, value: string): Promise<ICoinTransfer>
transferFromHeld(coin: T | string, object: ICoinAccountObject, target: ICoinAccountObject, value: string): Promise<ICoinTransfer>
transferFromToHeld(coin: T | string, object: ICoinAccountObject, target: ICoinAccountObject, value: string): Promise<ICoinTransfer>
```

**Parameters:**
- `coin` - the coin's UID or the coin object
- `object` - the address of the account the operation is performed on: `{ ownerUid, id }`
- `target` - the recipient account address (for transfer operations)
- `value` - the operation amount in string format

An account address is a pair "owner + account identifier". In transfers there are two of them in a row, and the object distinguishes the sides by its structure: positional strings here would be easy to swap by mistake, and the compiler would stay silent.

#### Working with Accounts

```typescript
// Get an account
accountGet(coin: UID, object: ICoinAccountObject): Promise<ICoinAccount>

// Save an account
accountSet(item: ICoinAccount): Promise<ICoinAccount>

// List a coin's accounts, or only the accounts of a single owner
accountList(coin: UID, owner?: UID): Promise<Array<ICoinAccount>>
```

### CoinService

#### Core Methods

```typescript
// Emission with validation and events
emit(holder: H, params: ICoinEmitDto, isDispatchEvent: boolean): Promise<void>
emitHeld(holder: H, params: ICoinEmitDto, isDispatchEvent: boolean): Promise<void>

// Burning with validation and events
burn(holder: H, params: ICoinBurnDto, isDispatchEvent: boolean): Promise<void>
burnHeld(holder: H, params: ICoinBurnDto, isDispatchEvent: boolean): Promise<void>

// Nullification with validation and events
nullify(holder: H, params: ICoinNullifyDto, isDispatchEvent: boolean): Promise<void>
nullifyHeld(holder: H, params: ICoinNullifyDto, isDispatchEvent: boolean): Promise<void>

// Hold with validation and events
hold(holder: H, params: ICoinHoldDto, isDispatchEvent: boolean): Promise<void>
unhold(holder: H, params: ICoinUnholdDto, isDispatchEvent: boolean): Promise<void>

// Transfers with validation and events
transfer(holder: H, params: ICoinTransferDto, isDispatchEvent: boolean): Promise<void>
transferToHeld(holder: H, params: ICoinTransferDto, isDispatchEvent: boolean): Promise<void>
transferFromHeld(holder: H, params: ICoinTransferDto, isDispatchEvent: boolean): Promise<void>
transferFromToHeld(holder: H, params: ICoinTransferDto, isDispatchEvent: boolean): Promise<void>

// Retrieving information
get<T extends ICoin>(holder: H, params: ICoinGetDto): Promise<T>
balanceGet(holder: H, params: ICoinBalanceGetDto): Promise<ICoinBalanceGetDtoResponse>
```

**Parameters:**
- `holder` - an object with access to the stub (IStubHolder)
- `params` - a DTO with the operation parameters
- `isDispatchEvent` - whether to emit events

## Usage Examples

### Creating and Configuring a Token

```typescript
import { CoinService, CoinManager } from '@hlf-core/coin-chaincode';

const service = new CoinService(logger);
const manager = new CoinManager(logger, stub);

// Create a token with 18 decimal places
const token = manager.create('USDT', 18, 'issuer-uid');
await manager.save(token);

console.log(`Created token: ${token.id}, owner: ${token.owner}`);
```

### Token Emission and Distribution

```typescript
// Emit 1,000,000 tokens to the issuer's account
await service.emit(holder, {
    coinUid: token.uid,
    object: { ownerUid: 'issuer-uid', id: 'OWNER' },
    value: '1000000'
}, true);

// Distribute tokens to users
const users = ['user1', 'user2', 'user3'];
for (const user of users) {
    await service.transfer(holder, {
        coinUid: token.uid,
        object: { ownerUid: 'issuer-uid', id: 'OWNER' },
        target: { ownerUid: user, id: 'OWNER' },
        value: '1000',
        initiatorUid: 'issuer-uid'
    }, true);
}
```

### Hold System (escrow)

```typescript
// Hold 100 tokens on a user's account
await service.hold(holder, {
    coinUid: token.uid,
    object: { ownerUid: 'user1', id: 'OWNER' },
    value: '100',
    initiatorUid: 'escrow-service'
}, true);

// Check the balance (including held funds)
const balance = await service.balanceGet(holder, {
    coinUid: token.uid,
    object: { ownerUid: 'user1', id: 'OWNER' }
});

console.log(`Available: ${balance.inUse}, held: ${balance.held}, total: ${balance.total}`);

// Release the held funds
await service.unhold(holder, {
    coinUid: token.uid,
    object: { ownerUid: 'user1', id: 'OWNER' },
    value: '100',
    initiatorUid: 'escrow-service'
}, true);
```

### Complex Transfers

```typescript
// Transfer from held funds to regular funds
await service.transferFromHeld(holder, {
    coinUid: token.uid,
    object: { ownerUid: 'user1', id: 'OWNER' },
    target: { ownerUid: 'user2', id: 'OWNER' },
    value: '50',
    initiatorUid: 'payment-service'
}, true);

// Transfer into a hold
await service.transferToHeld(holder, {
    coinUid: token.uid,
    object: { ownerUid: 'user2', id: 'OWNER' },
    target: { ownerUid: 'user3', id: 'OWNER' },
    value: '25',
    initiatorUid: 'escrow-service'
}, true);

// Transfer from the sender's hold to the recipient's hold
await service.transferFromToHeld(holder, {
    coinUid: token.uid,
    object: { ownerUid: 'user3', id: 'OWNER' },
    target: { ownerUid: 'user1', id: 'OWNER' },
    value: '10',
    initiatorUid: 'escrow-service'
}, true);
```

### Nullifying Balances

```typescript
// Zero out a user's regular balance
await service.nullify(holder, {
    coinUid: token.uid,
    object: { ownerUid: 'user1', id: 'OWNER' }
}, true);

// Zero out the held balance
await service.nullifyHeld(holder, {
    coinUid: token.uid,
    object: { ownerUid: 'user1', id: 'OWNER' }
}, true);
```

### Error Handling

```typescript
import { CoinNotFoundError, CoinFromToEqualsError } from '@hlf-core/coin-chaincode';

try {
    await service.transfer(holder, {
        coinUid: 'non-existent-coin',
        object: { ownerUid: 'user1', id: 'OWNER' },
        target: { ownerUid: 'user2', id: 'OWNER' },
        value: '100',
        initiatorUid: 'user1'
    }, true);
} catch (error) {
    if (CoinNotFoundError.instanceOf(error)) {
        console.error('Coin not found:', error.details);
    } else if (CoinFromToEqualsError.instanceOf(error)) {
        console.error('Sender and recipient are the same:', error.details);
    } else {
        console.error('Unknown error:', error);
    }
}
```

## DTO Interfaces

### ICoinTransferDto
```typescript
interface ICoinTransferDto {
    coinUid: string;        // the coin's UID
    object: ICoinAccountObject;  // the sender's account address
    target: ICoinAccountObject;  // the recipient's account address
    value: string;          // the transfer amount
    initiatorUid?: string;  // the UID of the operation initiator
}
```

### ICoinEmitDto / ICoinBurnDto
```typescript
interface ICoinEmitDto {
    coinUid: string;        // the coin's UID
    object: ICoinAccountObject;  // the account address: the recipient for emit, the sender for burn
    value: string;          // the emission/burning amount
    initiatorUid?: string;  // the UID of the operation initiator
}
```

### ICoinHoldDto / ICoinUnholdDto
```typescript
interface ICoinHoldDto {
    coinUid: string;        // the coin's UID
    object: ICoinAccountObject;  // the account address where funds are held
    value: string;          // the hold/release amount
    initiatorUid?: string;  // the UID of the operation initiator
}
```

### ICoinNullifyDto
```typescript
interface ICoinNullifyDto {
    coinUid: string;        // the coin's UID
    object: ICoinAccountObject;  // the account address
}
```

### ICoinBalanceGetDto
```typescript
interface ICoinBalanceGetDto {
    coinUid: string;        // the coin's UID
    object: ICoinAccountObject;  // the account address
}
```

### ICoinBalanceGetDtoResponse
```typescript
interface ICoinBalanceGetDtoResponse {
    inUse: string;          // the available balance
    held: string;           // the held balance
    total: string;          // the total balance (inUse + held)
}
```

## Events

The library emits events for integration with external systems:

### CoinEmittedEvent
Emitted when tokens are emitted (emit/emitHeld).
```typescript
{
    coinUid: string;
    object: ICoinAccountObject;
    value: string;
}
```

### CoinBurnedEvent
Emitted when tokens are burned (burn/burnHeld).
```typescript
{
    coinUid: string;
    object: ICoinAccountObject;
    value: string;
}
```

### CoinTransferredEvent
Emitted when tokens are transferred.
```typescript
{
    coinUid: string;
    object: ICoinAccountObject;
    target: ICoinAccountObject;
    value: string;
    initiatorUid?: string;
}
```

### CoinHoldedEvent
Emitted when funds are held.
```typescript
{
    coinUid: string;
    object: ICoinAccountObject;
    value: string;
    initiatorUid?: string;
}
```

### CoinUnholdedEvent
Emitted when held funds are released.
```typescript
{
    coinUid: string;
    object: ICoinAccountObject;
    value: string;
    initiatorUid?: string;
}
```

### CoinNullifiedEvent
Emitted when a balance is nullified.
```typescript
{
    coinUid: string;
    object: ICoinAccountObject;
}
```

## Project Structure

```
src/
├── CoinManager.ts          # Main coin manager
├── CoinAccountManager.ts   # Account manager
├── CoinService.ts          # Service layer
├── ICoinManager.ts         # Manager interface
├── Error.ts                # Custom errors
└── public-api.ts           # Public API
```

### Main Files

- **CoinManager.ts** - Implementation of all coin operations
- **CoinAccountManager.ts** - Management of user accounts
- **CoinService.ts** - Business logic with validation and events
- **ICoinManager.ts** - Contract for the coin manager
- **Error.ts** - Error-handling system

## Development

### Installing Dependencies

```bash
npm install
```

### Build

```bash
npm run build
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
```

## Important Notes

### Security
- The library does not check access rights - this is the responsibility of the calling code
- All operations must pass through the endorsement policy of the Hyperledger Fabric network
- Validation of amount/value is performed at the CoinAccount level

### Atomicity
- Transfer operations perform multiple read/write operations
- Consistency is guaranteed through Hyperledger Fabric's read-write sets mechanism
- Concurrent transactions may lead to MVCC_READ_CONFLICT

### Performance
- Transfer methods perform 6+ state operations
- Batching operations is recommended where possible
- Empty accounts are automatically removed to save space
- `accountList` and coin removal traverse all of a coin's accounts within a single transaction — the cost is linear in the number of holders and, for large issues, hits Fabric's limits

## License

ISC

## Author

**Renat Gubaev**
- Email: renat.gubaev@gmail.com
- GitHub: [@ManhattanDoctor](https://github.com/ManhattanDoctor)

## Links

- [GitHub Repository](https://github.com/ManhattanDoctor/hlf-core-coin-chaincode)
- [NPM Package](https://www.npmjs.com/package/@hlf-core/coin-chaincode)
- [Issue Tracker](https://github.com/ManhattanDoctor/hlf-core-coin-chaincode/issues)
- [Hyperledger Fabric Documentation](https://hyperledger-fabric.readthedocs.io/)

## Support

If you have found a bug or have a suggestion for improvement, please open an issue in [GitHub Issues](https://github.com/ManhattanDoctor/hlf-core-coin-chaincode/issues).
