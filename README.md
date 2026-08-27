# @hlf-core/coin-chaincode

> TypeScript библиотека управления токенами на стороне chaincode: счета, эмиссия, переводы, удержание

[![npm version](https://img.shields.io/npm/v/@hlf-core/coin-chaincode.svg)](https://www.npmjs.com/package/@hlf-core/coin-chaincode)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

Модуль для управления токенами (монетами) и их счетами в блокчейн-среде Hyperledger Fabric. Реализует полный набор операций для создания, эмиссии, перевода, удержания и сжигания цифровых активов с поддержкой событий и строгой типизацией.

## 🚀 Возможности

- **Полный жизненный цикл токенов**: создание, эмиссия, сжигание, перевод
- **Система удержания (hold)**: временная блокировка средств с возможностью разблокировки
- **Гибкая архитектура**: модульная структура с возможностью расширения
- **Строгая типизация**: полная поддержка TypeScript
- **Событийная модель**: автоматическая генерация событий для интеграции
- **Обработка ошибок**: кастомные исключения с детальной информацией
- **Атомарные операции**: гарантия консистентности данных

## 📋 Содержание

- [Установка](#установка)
- [Быстрый старт](#быстрый-старт)
- [Архитектура](#архитектура)
- [API Документация](#api-документация)
- [Примеры использования](#примеры-использования)
- [DTO Интерфейсы](#dto-интерфейсы)
- [События](#события)
- [Структура проекта](#структура-проекта)
- [Разработка](#разработка)

## 🛠 Установка

```bash
npm install @hlf-core/coin-chaincode
```

### Зависимости

```json
{
  "@hlf-core/coin": "~3.2.33",
  "@hlf-core/chaincode": "~3.6.4"
}
```

Транзитивно подтягиваются `@ts-core/common` (v3.x, через `@hlf-core/chaincode`/`@hlf-core/coin`), `@hlf-core/common`, `fabric-shim`, `reflect-metadata` и `lodash`.

## 🚀 Быстрый старт

```typescript
import { CoinService, CoinManager } from '@hlf-core/coin-chaincode';
import { ILogger, IStub } from '@ts-core/common';

// Создание сервиса
const logger: ILogger = /* ваш логгер */;
const service = new CoinService(logger);

// Создание менеджера
const stub: IStub = /* ваш stub */;
const manager = new CoinManager(logger, stub);

// Создание монеты
const coin = manager.create('MYCOIN', 18, 'owner-uid');

// Эмиссия токенов
await manager.emit(coin, 'user-uid', '1000');

// Перевод между пользователями
await manager.transfer(coin, 'user-uid', 'another-user-uid', '100');
```

## 🏗 Архитектура

### Основные компоненты

#### 1. **CoinManager** - Основной менеджер монет
```typescript
class CoinManager<T extends ICoin = ICoin> extends EntityManagerImpl<T>
```
- Управляет жизненным циклом монет
- Реализует все операции с токенами
- Работает с CoinAccountManager для управления счетами

#### 2. **CoinAccountManager** - Менеджер счетов
```typescript
class CoinAccountManager extends EntityManagerImpl<CoinAccount>
```
- Управляет счетами пользователей для каждой монеты
- Автоматически удаляет пустые счета
- Предоставляет методы для работы с балансами

#### 3. **CoinService** - Сервисный слой
```typescript
class CoinService<H extends IStubHolder = IStubHolder> extends LoggerWrapper
```
- Фасад для бизнес-логики
- Валидация входных параметров
- Диспатчинг событий
- Обработка ошибок

#### 4. **Error Classes** - Система ошибок
```typescript
class CoinNotFoundError extends Error<string>
class CoinObjectNotFoundError extends Error<string>
class CoinFromToEqualsError extends Error<string>
```

### Диаграмма архитектуры

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CoinService   │────│   CoinManager    │────│ CoinAccountMgr  │
│                 │    │                  │    │                 │
│ • Валидация     │    │ • CRUD монет     │    │ • CRUD счетов   │
│ • События       │    │ • Операции       │    │ • Балансы       │
│ • Ошибки        │    │ • Переводы       │    │ • Удержания     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   IStub/State   │
                    │                 │
                    │ • Блокчейн      │
                    │ • Персистентность│
                    └─────────────────┘
```

### Хранение счетов в состоянии

Монета и её счета — разные записи состояния. Монета лежит по собственному `uid`, а каждый счёт — по составному ключу «пространство имён + монета + владелец + счёт»:

```
coin_owner1_8_BTC                              ← сама монета
→coin~account:coin_owner1_8_BTC~user1~OWNER    ← основной счёт user1
→coin~account:coin_owner1_8_BTC~user1~PAYOUT   ← второй счёт того же владельца
→coin~account:coin_owner1_8_BTC~user2~OWNER    ← счёт user2
```

Последняя часть ключа — идентификатор счёта. У одного владельца по одной монете может быть несколько счетов с разным назначением; менеджер их различает, но о смысле значений не знает — словарь задаёт приложение.

Такая схема выбрана потому, что в состоянии Hyperledger Fabric нет поиска по полям: найти запись можно только по точному ключу либо диапазонным запросом по началу ключа. Порядок частей выбран под запросы: монета перед владельцем — все счета одной монеты лежат подряд и выбираются одним диапазонным запросом; владелец перед счётом — так же подряд лежат все счета одного лица.

Ключи собирает `CoinAccountUtil` из `@hlf-core/coin`, менеджеры не склеивают строки самостоятельно:

```typescript
// точный ключ одного счёта — используется в accountGet
CoinAccountUtil.createUid(coinUid, ownerUid, id);      // →coin~account:coin_owner1_8_BTC~user1~OWNER

// префикс всех счетов монеты — используется в accountList и accountsRemove
CoinAccountUtil.createPrefix(coinUid);                 // →coin~account:coin_owner1_8_BTC~

// префикс всех счетов одного владельца — используется в accountList с владельцем
CoinAccountUtil.createPrefix(coinUid, ownerUid);       // →coin~account:coin_owner1_8_BTC~user1~
```

Префикс обязательно заканчивается разделителем: без него диапазонный запрос захватил бы счета монет, чей идентификатор начинается так же (`BTC` и `BTC2`, базовая монета и её серийные выпуски).

#### Пустые счета не хранятся

`CoinAccountManager.save` удаляет счёт вместо записи, если он пуст:

```typescript
public async save(item: CoinAccount): Promise<CoinAccount> {
    if (item.isEmpty()) {
        await this.remove(item);
        return item;
    }
    return super.save(item);
}
```

Поэтому состояние не засоряется нулевыми счетами, а `accountList` возвращает только те счета, где есть баланс. Обратная сторона: `accountGet` для адреса без токенов не найдёт записи и вернёт новый пустой счёт, а не `null` — он попадёт в состояние только после первой операции с ненулевой суммой.

#### Удаление монеты

`CoinManager.remove` удаляет монету вместе со всеми её счетами:

```typescript
public async remove(item: UID): Promise<void> {
    await this.accountsRemove(item);   // все счета монеты по префиксу
    await super.remove(item);          // сама монета
}
```

Счета удаляются одной транзакцией, без разбиения на части. Для монеты с большим числом держателей объём изменений растёт линейно и может упереться в ограничения Fabric на размер набора записей или время подтверждения — в таком случае удаление монеты не пройдёт целиком, а не частично.

## 📚 API Документация

### CoinManager

#### Основные операции

```typescript
// Создание монеты
create(coinId: string, decimals: number, owner: UID): T

// Получение монеты
get(item: UID, details?: Array<keyof ICoin>): Promise<T>

// Сохранение монеты
save(item: T): Promise<T>

// Удаление монеты и всех связанных счетов
remove(item: UID): Promise<void>
```

#### Операции с токенами

```typescript
// Эмиссия токенов
emit(coin: T | string, object: ICoinAccountObject, value: string): Promise<ICoinMovement>
emitHeld(coin: T | string, object: ICoinAccountObject, value: string): Promise<ICoinMovement>

// Сжигание токенов
burn(coin: T | string, object: ICoinAccountObject, value: string): Promise<ICoinMovement>
burnHeld(coin: T | string, object: ICoinAccountObject, value: string): Promise<ICoinMovement>

// Удержание токенов (hold)
hold(coin: T | string, object: ICoinAccountObject, value: string): Promise<ICoinMovement>
unhold(coin: T | string, object: ICoinAccountObject, value: string): Promise<ICoinMovement>

// Нулификация (обнуление баланса)
nullify(coin: T | string, object: ICoinAccountObject): Promise<ICoinNullify>
nullifyHeld(coin: T | string, object: ICoinAccountObject): Promise<ICoinNullify>

// Переводы
transfer(coin: T | string, object: ICoinAccountObject, target: ICoinAccountObject, value: string): Promise<ICoinTransfer>
transferToHeld(coin: T | string, object: ICoinAccountObject, target: ICoinAccountObject, value: string): Promise<ICoinTransfer>
transferFromHeld(coin: T | string, object: ICoinAccountObject, target: ICoinAccountObject, value: string): Promise<ICoinTransfer>
transferFromToHeld(coin: T | string, object: ICoinAccountObject, target: ICoinAccountObject, value: string): Promise<ICoinTransfer>
```

**Параметры:**
- `coin` - UID монеты или объект монеты
- `object` - адрес счёта, с которым выполняется операция: `{ ownerUid, id }`
- `target` - адрес счёта получателя (для transfer операций)
- `value` - Сумма операции в строковом формате

Адрес счёта — пара «владелец + идентификатор счёта». В переводах их два подряд, и объект различает стороны структурой: позиционные строки здесь легко переставить местами, а компилятор бы промолчал.

#### Работа со счетами

```typescript
// Получение счета
accountGet(coin: UID, object: ICoinAccountObject): Promise<ICoinAccount>

// Сохранение счета
accountSet(item: ICoinAccount): Promise<ICoinAccount>

// Список счетов монеты, либо только счета одного владельца
accountList(coin: UID, owner?: UID): Promise<Array<ICoinAccount>>
```

### CoinService

#### Основные методы

```typescript
// Эмиссия с валидацией и событиями
emit(holder: H, params: ICoinEmitDto, isDispatchEvent: boolean): Promise<void>
emitHeld(holder: H, params: ICoinEmitDto, isDispatchEvent: boolean): Promise<void>

// Сжигание с валидацией и событиями
burn(holder: H, params: ICoinBurnDto, isDispatchEvent: boolean): Promise<void>
burnHeld(holder: H, params: ICoinBurnDto, isDispatchEvent: boolean): Promise<void>

// Нулификация с валидацией и событиями
nullify(holder: H, params: ICoinNullifyDto, isDispatchEvent: boolean): Promise<void>
nullifyHeld(holder: H, params: ICoinNullifyDto, isDispatchEvent: boolean): Promise<void>

// Удержание с валидацией и событиями
hold(holder: H, params: ICoinHoldDto, isDispatchEvent: boolean): Promise<void>
unhold(holder: H, params: ICoinUnholdDto, isDispatchEvent: boolean): Promise<void>

// Переводы с валидацией и событиями
transfer(holder: H, params: ICoinTransferDto, isDispatchEvent: boolean): Promise<void>
transferToHeld(holder: H, params: ICoinTransferDto, isDispatchEvent: boolean): Promise<void>
transferFromHeld(holder: H, params: ICoinTransferDto, isDispatchEvent: boolean): Promise<void>
transferFromToHeld(holder: H, params: ICoinTransferDto, isDispatchEvent: boolean): Promise<void>

// Получение информации
get<T extends ICoin>(holder: H, params: ICoinGetDto): Promise<T>
balanceGet(holder: H, params: ICoinBalanceGetDto): Promise<ICoinBalanceGetDtoResponse>
```

**Параметры:**
- `holder` - Объект с доступом к stub (IStubHolder)
- `params` - DTO с параметрами операции
- `isDispatchEvent` - Генерировать ли события

## 💡 Примеры использования

### Создание и настройка токена

```typescript
import { CoinService, CoinManager } from '@hlf-core/coin-chaincode';

const service = new CoinService(logger);
const manager = new CoinManager(logger, stub);

// Создание токена с 18 знаками после запятой
const token = manager.create('USDT', 18, 'issuer-uid');
await manager.save(token);

console.log(`Создан токен: ${token.id}, владелец: ${token.owner}`);
```

### Эмиссия и распределение токенов

```typescript
// Эмиссия 1,000,000 токенов на счет эмитента
await service.emit(holder, {
    coinUid: token.uid,
    object: { ownerUid: 'issuer-uid', id: 'OWNER' },
    value: '1000000'
}, true);

// Распределение токенов пользователям
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

### Система удержания (escrow)

```typescript
// Удержание 100 токенов на счете пользователя
await service.hold(holder, {
    coinUid: token.uid,
    object: { ownerUid: 'user1', id: 'OWNER' },
    value: '100',
    initiatorUid: 'escrow-service'
}, true);

// Проверка баланса (включая удержанные средства)
const balance = await service.balanceGet(holder, {
    coinUid: token.uid,
    object: { ownerUid: 'user1', id: 'OWNER' }
});

console.log(`Доступно: ${balance.inUse}, удержано: ${balance.held}, всего: ${balance.total}`);

// Разблокировка удержанных средств
await service.unhold(holder, {
    coinUid: token.uid,
    object: { ownerUid: 'user1', id: 'OWNER' },
    value: '100',
    initiatorUid: 'escrow-service'
}, true);
```

### Сложные переводы

```typescript
// Перевод из удержанных средств в обычные
await service.transferFromHeld(holder, {
    coinUid: token.uid,
    object: { ownerUid: 'user1', id: 'OWNER' },
    target: { ownerUid: 'user2', id: 'OWNER' },
    value: '50',
    initiatorUid: 'payment-service'
}, true);

// Перевод в удержание
await service.transferToHeld(holder, {
    coinUid: token.uid,
    object: { ownerUid: 'user2', id: 'OWNER' },
    target: { ownerUid: 'user3', id: 'OWNER' },
    value: '25',
    initiatorUid: 'escrow-service'
}, true);

// Перевод из удержания отправителя в удержание получателя
await service.transferFromToHeld(holder, {
    coinUid: token.uid,
    object: { ownerUid: 'user3', id: 'OWNER' },
    target: { ownerUid: 'user1', id: 'OWNER' },
    value: '10',
    initiatorUid: 'escrow-service'
}, true);
```

### Нулификация балансов

```typescript
// Обнулить обычный баланс пользователя
await service.nullify(holder, {
    coinUid: token.uid,
    object: { ownerUid: 'user1', id: 'OWNER' }
}, true);

// Обнулить удержанный баланс
await service.nullifyHeld(holder, {
    coinUid: token.uid,
    object: { ownerUid: 'user1', id: 'OWNER' }
}, true);
```

### Обработка ошибок

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
        console.error('Монета не найдена:', error.details);
    } else if (CoinFromToEqualsError.instanceOf(error)) {
        console.error('Отправитель и получатель одинаковые:', error.details);
    } else {
        console.error('Неизвестная ошибка:', error);
    }
}
```

## 📦 DTO Интерфейсы

### ICoinTransferDto
```typescript
interface ICoinTransferDto {
    coinUid: string;        // UID монеты
    object: ICoinAccountObject;  // адрес счёта отправителя
    target: ICoinAccountObject;  // адрес счёта получателя
    value: string;          // Сумма перевода
    initiatorUid?: string;  // UID инициатора операции
}
```

### ICoinEmitDto / ICoinBurnDto
```typescript
interface ICoinEmitDto {
    coinUid: string;        // UID монеты
    object: ICoinAccountObject;  // адрес счёта: получателя для emit, отправителя для burn
    value: string;          // Сумма эмиссии/сжигания
    initiatorUid?: string;  // UID инициатора операции
}
```

### ICoinHoldDto / ICoinUnholdDto
```typescript
interface ICoinHoldDto {
    coinUid: string;        // UID монеты
    object: ICoinAccountObject;  // адрес счёта, где удерживаются средства
    value: string;          // Сумма удержания/разблокировки
    initiatorUid?: string;  // UID инициатора операции
}
```

### ICoinNullifyDto
```typescript
interface ICoinNullifyDto {
    coinUid: string;        // UID монеты
    object: ICoinAccountObject;  // адрес счёта
}
```

### ICoinBalanceGetDto
```typescript
interface ICoinBalanceGetDto {
    coinUid: string;        // UID монеты
    object: ICoinAccountObject;  // адрес счёта
}
```

### ICoinBalanceGetDtoResponse
```typescript
interface ICoinBalanceGetDtoResponse {
    inUse: string;          // Доступный баланс
    held: string;           // Удержанный баланс
    total: string;          // Общий баланс (inUse + held)
}
```

## 📡 События

Библиотека генерирует события для интеграции с внешними системами:

### CoinEmittedEvent
Генерируется при эмиссии токенов (emit/emitHeld).
```typescript
{
    coinUid: string;
    object: ICoinAccountObject;
    value: string;
}
```

### CoinBurnedEvent
Генерируется при сжигании токенов (burn/burnHeld).
```typescript
{
    coinUid: string;
    object: ICoinAccountObject;
    value: string;
}
```

### CoinTransferredEvent
Генерируется при переводе токенов.
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
Генерируется при удержании средств.
```typescript
{
    coinUid: string;
    object: ICoinAccountObject;
    value: string;
    initiatorUid?: string;
}
```

### CoinUnholdedEvent
Генерируется при разблокировке удержанных средств.
```typescript
{
    coinUid: string;
    object: ICoinAccountObject;
    value: string;
    initiatorUid?: string;
}
```

### CoinNullifiedEvent
Генерируется при нулификации баланса.
```typescript
{
    coinUid: string;
    object: ICoinAccountObject;
}
```

## 📁 Структура проекта

```
src/
├── CoinManager.ts          # Основной менеджер монет
├── CoinAccountManager.ts   # Менеджер счетов
├── CoinService.ts          # Сервисный слой
├── ICoinManager.ts         # Интерфейс менеджера
├── Error.ts                # Кастомные ошибки
└── public-api.ts           # Публичный API
```

### Основные файлы

- **CoinManager.ts** - Реализация всех операций с монетами
- **CoinAccountManager.ts** - Управление счетами пользователей
- **CoinService.ts** - Бизнес-логика с валидацией и событиями
- **ICoinManager.ts** - Контракт для менеджера монет
- **Error.ts** - Система обработки ошибок

## 🔧 Разработка

### Установка зависимостей

```bash
npm install
```

### Сборка

```bash
npm run build
```

### Тестирование

```bash
npm test
```

### Линтинг

```bash
npm run lint
```

## ⚠️ Важные замечания

### Безопасность
- Библиотека не проверяет права доступа - это ответственность вызывающего кода
- Все операции должны проходить через endorsement policy сети Hyperledger Fabric
- Валидация amount/value выполняется на уровне CoinAccount

### Атомарность
- Операции transfer выполняют множественные read/write операции
- Консистентность гарантируется через read-write sets механизм Hyperledger Fabric
- Параллельные транзакции могут привести к MVCC_READ_CONFLICT

### Производительность
- Методы transfer делают 6+ операций с state
- Рекомендуется батчинг операций где возможно
- Пустые счета автоматически удаляются для экономии места
- `accountList` и удаление монеты обходят все счета монеты в одной транзакции — стоимость линейна по числу держателей и на крупных выпусках упирается в лимиты Fabric

## Лицензия

ISC

## Автор

**Ренат Губаев**
- Email: renat.gubaev@gmail.com
- GitHub: [@ManhattanDoctor](https://github.com/ManhattanDoctor)

## Ссылки

- [GitHub Repository](https://github.com/ManhattanDoctor/hlf-core-coin-chaincode)
- [NPM Package](https://www.npmjs.com/package/@hlf-core/coin-chaincode)
- [Issue Tracker](https://github.com/ManhattanDoctor/hlf-core-coin-chaincode/issues)
- [Hyperledger Fabric Documentation](https://hyperledger-fabric.readthedocs.io/)

## Поддержка

Если вы нашли баг или у вас есть предложение по улучшению, пожалуйста, создайте issue в [GitHub Issues](https://github.com/ManhattanDoctor/hlf-core-coin-chaincode/issues).
