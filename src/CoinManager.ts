import { UID, TransformUtil, ILogger } from '@ts-core/common';
import { CoinAccountManager } from './CoinAccountManager';
import { Coin, ICoin, ICoinAccount, CoinUtil, CoinAccountUtil } from '@hlf-core/coin';
import { ICoinManager, ICoinMovement, ICoinNullify, ICoinTransfer } from './ICoinManager';
import { EntityManagerImpl, IStub } from '@hlf-core/chaincode';
import * as _ from 'lodash';

export class CoinManager<T extends ICoin = ICoin> extends EntityManagerImpl<T> implements ICoinManager<T> {
    // --------------------------------------------------------------------------
    //
    //  Properties
    //
    // --------------------------------------------------------------------------

    protected account: CoinAccountManager;

    // --------------------------------------------------------------------------
    //
    //  Constructor
    //
    // --------------------------------------------------------------------------

    constructor(logger: ILogger, stub: IStub) {
        super(logger, stub)
        this.account = new CoinAccountManager(logger, stub);
    }

    // --------------------------------------------------------------------------
    //
    //  Emit / Burn Methods
    //
    // --------------------------------------------------------------------------

    public async emit(coinUid: T | string, account: string, value: string): Promise<ICoinMovement> {
        let item = await this.loadAccountDetails(coinUid, account);
        await this._emit(item, value);
        return this.saveAccountDetails(item);
    }

    public async emitHeld(coinUid: T | string, account: string, value: string): Promise<ICoinMovement> {
        let item = await this.loadAccountDetails(coinUid, account);
        await this._emitHeld(item, value);
        return this.saveAccountDetails(item);
    }

    public async burn(coinUid: T | string, account: string, value: string): Promise<ICoinMovement> {
        let item = await this.loadAccountDetails(coinUid, account);
        await this._burn(item, value);
        return this.saveAccountDetails(item);
    }

    public async burnHeld(coinUid: T | string, account: string, value: string): Promise<ICoinMovement> {
        let item = await this.loadAccountDetails(coinUid, account);
        await this._burnHeld(item, value);
        return this.saveAccountDetails(item);
    }

    public async hold(coinUid: T | string, account: string, value: string): Promise<ICoinMovement> {
        let item = await this.loadAccountDetails(coinUid, account);
        await this._hold(item, value);
        await this.saveAccountDetails(item);
        return item;
    }

    public async unhold(coinUid: T | string, account: string, value: string): Promise<ICoinMovement> {
        let item = await this.loadAccountDetails(coinUid, account);
        await this._unhold(item, value);
        await this.saveAccountDetails(item);
        return item;
    }

    public async nullify(coinUid: T | string, account: string): Promise<ICoinNullify> {
        let item = await this.loadAccountDetails(coinUid, account);
        let value = await this._nullify(item);
        let { coin } = await this.saveAccountDetails(item);
        return { coin, value };
    }

    public async nullifyHeld(coinUid: T | string, account: string): Promise<ICoinNullify> {
        let item = await this.loadAccountDetails(coinUid, account);
        let value = await this._nullifyHeld(item);
        let { coin } = await this.saveAccountDetails(item);
        return { coin, value };
    }

    public async transfer(coin: T | string, object: string, target: string, value: string): Promise<ICoinTransfer> {
        coin = await this.coinGet(coin);
        let targetAccount = await this.accountGet(coin, target);
        let objectAccount = await this.accountGet(coin, object);

        await this._transfer(coin, objectAccount, targetAccount, value);

        await this.accountSet(targetAccount);
        await this.accountSet(objectAccount);
        await this.save(coin);
        return { object: objectAccount, target: targetAccount };
    }

    public async transferFromHeld(coin: T | string, object: string, target: string, value: string): Promise<ICoinTransfer> {
        coin = await this.coinGet(coin);
        let targetAccount = await this.accountGet(coin, target);
        let objectAccount = await this.accountGet(coin, object);

        await this._transferFromHeld(coin, objectAccount, targetAccount, value);

        await this.accountSet(targetAccount);
        await this.accountSet(objectAccount);
        await this.save(coin);
        return { object: objectAccount, target: targetAccount };
    }

    public async transferToHeld(coin: T | string, object: string, target: string, value: string): Promise<ICoinTransfer> {
        coin = await this.coinGet(coin);
        let targetAccount = await this.accountGet(coin, target);
        let objectAccount = await this.accountGet(coin, object);

        await this._transferToHeld(coin, objectAccount, targetAccount, value);

        await this.accountSet(targetAccount);
        await this.accountSet(objectAccount);
        await this.save(coin);
        return { object: objectAccount, target: targetAccount };
    }

    public async transferFromToHeld(coin: T | string, object: string, target: string, value: string): Promise<ICoinTransfer> {
        coin = await this.coinGet(coin);
        let targetAccount = await this.accountGet(coin, target);
        let objectAccount = await this.accountGet(coin, object);

        await this._transferFromToHeld(coin, objectAccount, targetAccount, value);

        await this.accountSet(targetAccount);
        await this.accountSet(objectAccount);
        await this.save(coin);
        return { object: objectAccount, target: targetAccount };
    }

    // --------------------------------------------------------------------------
    //
    //  Protected Methods
    //
    // --------------------------------------------------------------------------

    protected async coinGet(coin: T | string): Promise<T> {
        return !_.isString(coin) ? coin : this.get(coin);
    }

    protected async loadAccountDetails(coin: T | string, account: UID): Promise<ICoinAccountDetails<T>> {
        coin = await this.coinGet(coin);
        return { coin, account: await this.accountGet(coin, account) };
    }

    protected async saveAccountDetails(item: ICoinAccountDetails<T>): Promise<ICoinAccountDetails<T>> {
        await this.save(item.coin);
        await this.accountSet(item.account);
        return item;
    }

    protected async accountsRemove(coin: UID): Promise<void> {
        let kv = await this.getKV(CoinAccountUtil.createUid(coin));
        await Promise.all(kv.map(item => this.account.remove(item.key)));
    }

    // --------------------------------------------------------------------------
    //
    //  Protected Methods To Override
    //
    // --------------------------------------------------------------------------

    protected async _emit(item: ICoinAccountDetails<T>, value: string): Promise<void> {
        let { coin, account } = item;
        coin.balance.add(value);
        account.add(value);
    }

    protected async _emitHeld(item: ICoinAccountDetails<T>, value: string): Promise<void> {
        let { coin, account } = item;
        account.addHeld(value);
        coin.balance.addHeld(value);
    }

    protected async _burn(item: ICoinAccountDetails<T>, value: string): Promise<void> {
        let { coin, account } = item;
        account.remove(value);
        coin.balance.remove(value);
    }

    protected async _burnHeld(item: ICoinAccountDetails<T>, value: string): Promise<void> {
        let { coin, account } = item;
        coin.balance.removeHeld(value);
        account.removeHeld(value);
    }

    protected async _nullify(item: ICoinAccountDetails<T>): Promise<string> {
        let { coin, account } = item;
        let value = account.nullify();
        coin.balance.nullify();
        return value;
    }

    protected async _nullifyHeld(item: ICoinAccountDetails<T>): Promise<string> {
        let { coin, account } = item;
        let value = coin.balance.nullifyHeld();
        account.nullifyHeld();
        return value;
    }

    protected async _hold(item: ICoinAccountDetails<T>, value: string): Promise<void> {
        let { coin, account } = item;
        account.hold(value);
        coin.balance.hold(value);
    }

    protected async _unhold(item: ICoinAccountDetails<T>, value: string): Promise<void> {
        let { coin, account } = item;
        account.unhold(value);
        coin.balance.unhold(value);
    }

    protected async _transfer(coin: T, object: ICoinAccount, target: ICoinAccount, value: string): Promise<void> {
        target.add(value);
        object.remove(value);
        coin.balance.transfer(value);
    }

    protected async _transferFromHeld(coin: T, object: ICoinAccount, target: ICoinAccount, value: string): Promise<void> {
        target.add(value);
        object.removeHeld(value);
        coin.balance.transferFromHeld(value);
    }

    protected async _transferToHeld(coin: T, object: ICoinAccount, target: ICoinAccount, value: string): Promise<void> {
        target.addHeld(value);
        object.remove(value);
        coin.balance.transferToHeld(value);
    }

    protected async _transferFromToHeld(coin: T, object: ICoinAccount, target: ICoinAccount, value: string): Promise<void> {
        target.addHeld(value);
        object.removeHeld(value);
        coin.balance.transferFromToHeld(value);
    }

    // --------------------------------------------------------------------------
    //
    //  Public Methods
    //
    // --------------------------------------------------------------------------

    public create(coinId: string, decimals: number, owner: UID): T {
        return CoinUtil.create(Coin, coinId, decimals, owner) as T;
    }

    public toEntity(item: any): T {
        return TransformUtil.toClass(Coin, item) as T;
    }

    public async remove(item: UID): Promise<void> {
        await this.accountsRemove(item);
        await this.stub.removeState(CoinAccountUtil.createUid(item));
        await super.remove(item);
    }

    public destroy(): void {
        if (this.isDestroyed) {
            return;
        }
        super.destroy();

        this.account.destroy();
        this.account = null;
    }

    // --------------------------------------------------------------------------
    //
    //  Account Methods
    //
    // --------------------------------------------------------------------------

    public async accountGet(coin: T, object: UID): Promise<ICoinAccount> {
        let item = await this.account.get(CoinAccountUtil.createUid(coin, object));
        if (_.isNil(item)) {
            item = CoinAccountUtil.create(coin, object);
        }
        return item;
    }

    public async accountSet(item: ICoinAccount): Promise<ICoinAccount> {
        return this.account.save(item);
    }

    public async accountList(coin: T): Promise<Array<ICoinAccount>> {
        return this.account.list(coin);
    }

    // --------------------------------------------------------------------------
    //
    //  Public Properties
    //
    // --------------------------------------------------------------------------

    public get prefix(): string {
        return CoinUtil.PREFIX;
    }
}

export interface ICoinAccountDetails<T extends ICoin = ICoin> {
    coin: T;
    account: ICoinAccount;
}
