import { Coin, CoinAccount, ICoin, ICoinAccount } from '@hlf-core/coin';
import { UID } from '@ts-core/common';
import * as _ from 'lodash';

export interface ICoinManager<T extends ICoin = ICoin> {
    get(item: UID, details?: Array<keyof ICoin>): Promise<T>;
    save(item: T): Promise<T>
    create(coinId: string, decimals: number, owner: UID): T;
    remove(item: UID): Promise<void>;

    accountGet(coin: UID, object: UID): Promise<ICoinAccount>;
    accountSet(item: ICoinAccount): Promise<ICoinAccount>;
    accountList(coin: UID): Promise<Array<ICoinAccount>>;

    emit(coin: T | string, objectUid: string, value: string): Promise<ICoinMovement>;
    emitHeld(coin: T | string, objectUid: string, value: string): Promise<ICoinMovement>;

    burn(coin: T | string, objectUid: string, value: string): Promise<ICoinMovement>;
    burnHeld(coin: T | string, objectUid: string, value: string): Promise<ICoinMovement>;

    nullify(coin: T | string, objectUid: string): Promise<ICoinNullify>;
    nullifyHeld(coin: T | string, objectUid: string): Promise<ICoinNullify>;

    hold(coin: T | string, objectUid: string, value: string): Promise<ICoinMovement>;
    unhold(coin: T | string, objectUid: string, value: string): Promise<ICoinMovement>

    transfer(coin: T | string, objectUid: string, targetUid: string, value: string): Promise<ICoinTransfer>;
    transferToHeld(coin: T | string, objectUid: string, targetUid: string, value: string): Promise<ICoinTransfer>;
    transferFromHeld(coin: T | string, objectUid: string, targetUid: string, value: string): Promise<ICoinTransfer>;
    transferFromToHeld(coin: T | string, objectUid: string, targetUid: string, value: string): Promise<ICoinTransfer>;
}

export interface ICoinNullify {
    coin: Coin;
    value: string;
}
export interface ICoinMovement {
    coin: Coin;
    account: CoinAccount;
}
export interface ICoinTransfer {
    object: CoinAccount;
    target: CoinAccount;
}