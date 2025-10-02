# HLF Core Coin Chaincode

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Hyperledger Fabric](https://img.shields.io/badge/Hyperledger%20Fabric-2F4F4F?style=flat-square&logo=hyperledger&logoColor=white)](https://hyperledger-fabric.readthedocs.io/)

Модуль для управления токенами (монетами) и их счетами в блокчейн-среде Hyperledger Fabric. Реализует полный набор операций для создания, эмиссии, перевода, удержания и сжигания цифровых активов с поддержкой событий и строгой типизацией.

## 🚀 Возможности

- **Полный жизненный цикл токенов**: создание, эмиссия, сжигание, перевод
- **Система удержания**: временная блокировка средств с возможностью разблокировки
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
- [Структура проекта](#структура-проекта)
- [Разработка](#разработка)

## 🛠 Установка

```bash
npm install @hlf-core/coin-chaincode
```

### Зависимости

```json
{
  "@hlf-core/coin": "^1.0.0",
  "@hlf-core/chaincode": "^1.0.0",
  "@ts-core/common": "^1.0.0",
  "lodash": "^4.17.21"
}
```

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
emit(coin: T | string, to: string, amount: string): Promise<ICoinMovement>
emitHeld(coin: T | string, to: string, amount: string): Promise<ICoinMovement>

// Сжигание токенов
burn(coin: T | string, from: string, amount: string): Promise<ICoinMovement>
burnHeld(coin: T | string, from: string, amount: string): Promise<ICoinMovement>

// Удержание токенов
hold(coin: T | string, from: string, amount: string): Promise<ICoinMovement>
unhold(coin: T | string, from: string, amount: string): Promise<ICoinMovement>

// Переводы
transfer(coin: T | string, from: string, to: string, amount: string): Promise<ICoinTransfer>
transferToHeld(coin: T | string, from: string, to: string, amount: string): Promise<ICoinTransfer>
transferFromHeld(coin: T | string, from: string, to: string, amount: string): Promise<ICoinTransfer>
transferFromToHeld(coin: T | string, from: string, to: string, amount: string): Promise<ICoinTransfer>
```

#### Работа со счетами

```typescript
// Получение счета
accountGet(coin: UID, object: UID): Promise<ICoinAccount>

// Сохранение счета
accountSet(item: ICoinAccount): Promise<ICoinAccount>

// Список счетов монеты
accountList(coin: UID): Promise<Array<ICoinAccount>>
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
    objectUid: 'issuer-uid',
    amount: '1000000'
}, true);

// Распределение токенов пользователям
const users = ['user1', 'user2', 'user3'];
for (const user of users) {
    await service.transfer(holder, {
        coinUid: token.uid,
        from: 'issuer-uid',
        to: user,
        amount: '1000',
        initiatorUid: 'issuer-uid'
    }, true);
}
```

### Система удержания (escrow)

```typescript
// Удержание 100 токенов на счете пользователя
await service.hold(holder, {
    coinUid: token.uid,
    from: 'user1',
    amount: '100',
    initiatorUid: 'escrow-service'
}, true);

// Проверка баланса (включая удержанные средства)
const balance = await service.balanceGet(holder, {
    coinUid: token.uid,
    objectUid: 'user1'
});

console.log(`Доступно: ${balance.inUse}, удержано: ${balance.held}, всего: ${balance.total}`);

// Разблокировка удержанных средств
await service.unhold(holder, {
    coinUid: token.uid,
    from: 'user1',
    amount: '100',
    initiatorUid: 'escrow-service'
}, true);
```

### Сложные переводы

```typescript
// Перевод из удержанных средств в обычные
await service.transferFromHeld(holder, {
    coinUid: token.uid,
    from: 'user1',
    to: 'user2',
    amount: '50',
    initiatorUid: 'payment-service'
}, true);

// Перевод в удержание
await service.transferToHeld(holder, {
    coinUid: token.uid,
    from: 'user2',
    to: 'user3',
    amount: '25',
    initiatorUid: 'escrow-service'
}, true);
```

### Обработка ошибок

```typescript
import { CoinNotFoundError, CoinFromToEqualsError } from '@hlf-core/coin-chaincode';

try {
    await service.transfer(holder, {
        coinUid: 'non-existent-coin',
        from: 'user1',
        to: 'user2',
        amount: '100',
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

## 📄 Лицензия

Этот проект лицензирован под MIT License - см. файл [LICENSE](LICENSE) для деталей.

## 🆘 Поддержка

Если у вас есть вопросы или проблемы:

1. Проверьте [Issues](../../issues) на наличие похожих проблем
2. Создайте новый Issue с подробным описанием
3. Обратитесь к команде разработки

## 👨‍💻 Автор

**Renat Gubaev**  
📧 Email: [renat.gubaev@gmail.com](mailto:renat.gubaev@gmail.com)  
🐙 GitHub: [@ManhattanDoctor](https://github.com/ManhattanDoctor)

---

**Сделано с ❤️ для Hyperledger Fabric сообщества**