import { Coin, CoinAccount, ICoin, ICoinAccount, ICoinAccountObject } from '@hlf-core/coin';
import { UID } from '@ts-core/common';
import * as _ from 'lodash';

export interface ICoinManager<T extends ICoin = ICoin> {
    get(item: UID, details?: Array<keyof ICoin>): Promise<T>;
    save(item: T): Promise<T>
    create(coinId: string, decimals: number, owner: UID): T;
    remove(item: UID): Promise<void>;

    accountGet(coin: UID, object: ICoinAccountObject): Promise<ICoinAccount>;
    accountSet(item: ICoinAccount): Promise<ICoinAccount>;
    accountList(coin: UID, owner?: UID): Promise<Array<ICoinAccount>>;

    emit(coin: T | string, object: ICoinAccountObject, value: string): Promise<ICoinMovement>;
    emitHeld(coin: T | string, object: ICoinAccountObject, value: string): Promise<ICoinMovement>;

    burn(coin: T | string, object: ICoinAccountObject, value: string): Promise<ICoinMovement>;
    burnHeld(coin: T | string, object: ICoinAccountObject, value: string): Promise<ICoinMovement>;

    nullify(coin: T | string, object: ICoinAccountObject): Promise<ICoinNullify>;
    nullifyHeld(coin: T | string, object: ICoinAccountObject): Promise<ICoinNullify>;

    hold(coin: T | string, object: ICoinAccountObject, value: string): Promise<ICoinMovement>;
    unhold(coin: T | string, object: ICoinAccountObject, value: string): Promise<ICoinMovement>

    transfer(coin: T | string, object: ICoinAccountObject, target: ICoinAccountObject, value: string): Promise<ICoinTransfer>;
    transferToHeld(coin: T | string, object: ICoinAccountObject, target: ICoinAccountObject, value: string): Promise<ICoinTransfer>;
    transferFromHeld(coin: T | string, object: ICoinAccountObject, target: ICoinAccountObject, value: string): Promise<ICoinTransfer>;
    transferFromToHeld(coin: T | string, object: ICoinAccountObject, target: ICoinAccountObject, value: string): Promise<ICoinTransfer>;
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