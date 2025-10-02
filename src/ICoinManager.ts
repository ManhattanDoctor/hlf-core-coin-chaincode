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

    emit(coin: T | string, to: string, amount: string): Promise<ICoinMovement>;
    emitHeld(coin: T | string, to: string, amount: string): Promise<ICoinMovement>;

    burn(coin: T | string, from: string, amount: string): Promise<ICoinMovement>;
    burnHeld(coin: T | string, from: string, amount: string): Promise<ICoinMovement>;

    hold(coin: T | string, from: string, amount: string): Promise<ICoinMovement>;
    unhold(coin: T | string, from: string, amount: string): Promise<ICoinMovement>

    transfer(coin: T | string, from: string, to: string, amount: string): Promise<ICoinTransfer>;
    transferToHeld(coin: T | string, from: string, to: string, amount: string): Promise<ICoinTransfer>;
    transferFromHeld(coin: T | string, from: string, to: string, amount: string): Promise<ICoinTransfer>;
    transferFromToHeld(coin: T | string, from: string, to: string, amount: string): Promise<ICoinTransfer>;
}

export interface ICoinMovement {
    coin: Coin;
    account: CoinAccount;
}
export interface ICoinTransfer {
    to: CoinAccount;
    from: CoinAccount;
}