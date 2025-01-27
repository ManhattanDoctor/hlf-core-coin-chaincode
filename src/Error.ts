import { ExtendedError, UID, getUid } from '@ts-core/common';
import * as _ from 'lodash';

class Error<C, D = any> extends ExtendedError<D, C | ErrorCode> {
    constructor(code: C | ErrorCode, message: string = '', details?: D) {
        super(message, code, details);
    }
}
// Coin
export class CoinNotFoundError extends Error<void> {
    constructor(item: UID) {
        super(ErrorCode.COIN_NOT_FOUND, `Unable to find "${getUid(item)}" coin`);
    }
}
export class CoinObjectNotFoundError extends Error<void> {
    constructor(item: UID) {
        super(ErrorCode.COIN_OBJECT_NOT_FOUND, `Unable to find "${getUid(item)}" coin object`);
    }
}
export class CoinAlreadyExistsError extends Error<void> {
    constructor(item: UID) {
        super(ErrorCode.COIN_ALREADY_EXISTS, `Coin "${getUid(item)}" already exists`);
    }
}
export class CoinTransferForbiddenError extends Error<void> {
    constructor(item: UID) {
        super(ErrorCode.COIN_TRANSFER_FORBIDDEN, `Coin transfer for "${getUid(item)}" forbidden`);
    }
}

export enum ErrorCode {
    COIN_NOT_FOUND = 'COIN_NOT_FOUND',
    COIN_ALREADY_EXISTS = 'COIN_ALREADY_EXISTS',
    COIN_OBJECT_NOT_FOUND = 'COIN_OBJECT_NOT_FOUND',
    COIN_TRANSFER_FORBIDDEN = 'COIN_TRANSFER_FORBIDDEN',
}
