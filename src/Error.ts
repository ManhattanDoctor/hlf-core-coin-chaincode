import { ExtendedError, UID, getUid } from '@ts-core/common';
import * as _ from 'lodash';

export class Error<T = void> extends ExtendedError<T, ErrorCode> {
    // --------------------------------------------------------------------------
    //
    //  Static Methods
    //
    // --------------------------------------------------------------------------

    public static instanceOf(item: any): item is Error {
        return item instanceof Error || Object.values(ErrorCode).includes(item.code);
    }

    // --------------------------------------------------------------------------
    //
    //  Constructor
    //
    // --------------------------------------------------------------------------

    constructor(code: ErrorCode, public details: T, public status: number = ExtendedError.HTTP_CODE_BAD_REQUEST) {
        super('', code, details);
        this.message = this.constructor.name;
    }
}
// Coin
export class CoinNotFoundError extends Error<string> {
    constructor(item: UID) {
        super(ErrorCode.COIN_NOT_FOUND, getUid(item));
    }
}
export class CoinObjectNotFoundError extends Error<string> {
    constructor(item: UID) {
        super(ErrorCode.COIN_OBJECT_NOT_FOUND, getUid(item));
    }
}
export class CoinFromToEqualsError extends Error<string> {
    constructor(item: UID) {
        super(ErrorCode.COIN_FROM_TO_EQUALS, getUid(item));
    }
}

export enum ErrorCode {
    COIN_NOT_FOUND = 'HLF_COIN_NOT_FOUND',
    COIN_FROM_TO_EQUALS = 'HLF_COIN_FROM_TO_EQUALS',
    COIN_OBJECT_NOT_FOUND = 'HLF_COIN_OBJECT_NOT_FOUND'
}
