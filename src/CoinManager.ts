import { UID, TransformUtil, ILogger } from '@ts-core/common';
import { CoinAccountManager } from './CoinAccountManager';
import { Coin, CoinBalance, CoinAccount, ICoin, ICoinAccount, CoinUtil } from '@hlf-core/coin';
import { ICoinManager, ICoinMovement, ICoinTransfer } from './ICoinManager';
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

    public async emit(coinUid: T | string, account: string, amount: string): Promise<ICoinMovement> {
        let item = await this.loadAccountDetails(coinUid, account);
        await this._emit(item, amount);
        return this.saveAccountDetails(item);
    }

    public async emitHeld(coinUid: T | string, account: string, amount: string): Promise<ICoinMovement> {
        let item = await this.loadAccountDetails(coinUid, account);
        await this._emitHeld(item, amount);
        return this.saveAccountDetails(item);
    }

    public async burn(coinUid: T | string, account: string, amount: string): Promise<ICoinMovement> {
        let item = await this.loadAccountDetails(coinUid, account);
        await this._burn(item, amount);
        return this.saveAccountDetails(item);
    }

    public async burnHeld(coinUid: T | string, account: string, amount: string): Promise<ICoinMovement> {
        let item = await this.loadAccountDetails(coinUid, account);
        await this._burnHeld(item, amount);
        return this.saveAccountDetails(item);
    }

    public async hold(coinUid: T | string, account: string, amount: string): Promise<ICoinMovement> {
        let item = await this.loadAccountDetails(coinUid, account);
        await this._hold(item, amount);
        await this.saveAccountDetails(item);
        return item;
    }

    public async unhold(coinUid: T | string, account: string, amount: string): Promise<ICoinMovement> {
        let item = await this.loadAccountDetails(coinUid, account);
        await this._unhold(item, amount);
        await this.saveAccountDetails(item);
        return item;
    }

    public async transfer(coin: T | string, from: string, to: string, amount: string): Promise<ICoinTransfer> {
        coin = await this.coinGet(coin);
        let toAccount = await this.accountGet(coin, to);
        let fromAccount = await this.accountGet(coin, from);

        await this._transfer(coin, fromAccount, toAccount, amount);

        await this.accountSave(toAccount);
        await this.accountSave(fromAccount);
        return { from: fromAccount, to: toAccount };
    }

    public async transferFromHeld(coin: T | string, from: string, to: string, amount: string): Promise<ICoinTransfer> {
        coin = await this.coinGet(coin);
        let toAccount = await this.accountGet(coin, to);
        let fromAccount = await this.accountGet(coin, from);

        await this._transferFromHeld(coin, fromAccount, toAccount, amount);

        await this.accountSave(toAccount);
        await this.accountSave(fromAccount);
        return { from: fromAccount, to: toAccount };
    }

    public async transferToHeld(coin: T | string, from: string, to: string, amount: string): Promise<ICoinTransfer> {
        coin = await this.coinGet(coin);
        let toAccount = await this.accountGet(coin, to);
        let fromAccount = await this.accountGet(coin, from);

        await this._transferToHeld(coin, fromAccount, toAccount, amount);

        await this.accountSave(toAccount);
        await this.accountSave(fromAccount);
        return { from: fromAccount, to: toAccount };
    }

    public async transferFromToHeld(coin: T | string, from: string, to: string, amount: string): Promise<ICoinTransfer> {
        coin = await this.coinGet(coin);
        let toAccount = await this.accountGet(coin, to);
        let fromAccount = await this.accountGet(coin, from);

        await this._transferFromToHeld(coin, fromAccount, toAccount, amount);

        await this.accountSave(toAccount);
        await this.accountSave(fromAccount);
        return { from: fromAccount, to: toAccount };
    }

    // --------------------------------------------------------------------------
    //
    //  Common Methods
    //
    // --------------------------------------------------------------------------

    public create(coinId: string, decimals: number, owner: UID): T {
        return CoinUtil.create(Coin, coinId, decimals, owner) as T;
    }

    public toEntity(item: any): T {
        return TransformUtil.toClass(Coin, item) as T;
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
        await this.accountSave(item.account);
        return item;
    }

    protected async accountSave(item: ICoinAccount): Promise<void> {
        await this.account.save(item);
    }

    protected async accountsRemove(coin: UID): Promise<void> {
        let kv = await this.getKV(CoinAccount.createUid(coin));
        await Promise.all(kv.map(item => this.account.remove(item.key)));
    }

    // --------------------------------------------------------------------------
    //
    //  Protected Methods To Override
    //
    // --------------------------------------------------------------------------

    protected async _emit(item: ICoinAccountDetails<T>, amount: string): Promise<void> {
        let { coin, account } = item;
        coin.balance.emit(amount);
        account.emit(amount);
    }

    protected async _emitHeld(item: ICoinAccountDetails<T>, amount: string): Promise<void> {
        let { coin, account } = item;
        coin.balance.emitHeld(amount);
        account.emitHeld(amount);
    }

    protected async _burn(item: ICoinAccountDetails<T>, amount: string): Promise<void> {
        let { coin, account } = item;
        coin.balance.burn(amount);
        account.burn(amount);
    }

    protected async _burnHeld(item: ICoinAccountDetails<T>, amount: string): Promise<void> {
        let { coin, account } = item;
        coin.balance.burnHeld(amount);
        account.burnHeld(amount);
    }

    protected async _hold(item: ICoinAccountDetails<T>, amount: string): Promise<void> {
        let { coin, account } = item;
        coin.balance.hold(amount);
        account.hold(amount);
    }

    protected async _unhold(item: ICoinAccountDetails<T>, amount: string): Promise<void> {
        let { coin, account } = item;
        coin.balance.unhold(amount);
        account.unhold(amount);
    }

    protected async _transfer(coin: T, from: ICoinAccount, to: ICoinAccount, amount: string): Promise<void> {
        to.emit(amount);
        from.burn(amount);
    }

    protected async _transferFromHeld(coin: T, from: ICoinAccount, to: ICoinAccount, amount: string): Promise<void> {
        to.emit(amount);
        from.burnHeld(amount);
    }

    protected async _transferToHeld(coin: T, from: ICoinAccount, to: ICoinAccount, amount: string): Promise<void> {
        to.emitHeld(amount);
        from.burn(amount);
    }

    protected async _transferFromToHeld(coin: T, from: ICoinAccount, to: ICoinAccount, amount: string): Promise<void> {
        to.emitHeld(amount);
        from.burnHeld(amount);
    }

    // --------------------------------------------------------------------------
    //
    //  Public Methods
    //
    // --------------------------------------------------------------------------

    public async remove(item: UID): Promise<void> {
        await this.accountsRemove(item);
        await this.stub.removeState(CoinBalance.createUid(item));
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
        let item = await this.account.get(CoinAccount.createUid(coin, object));
        if (_.isNil(item)) {
            item = CoinAccount.create(coin, object);
        }
        return item;
    }

    // --------------------------------------------------------------------------
    //
    //  Public Properties
    //
    // --------------------------------------------------------------------------

    public get prefix(): string {
        return Coin.PREFIX;
    }
}

export interface ICoinAccountDetails<T extends ICoin = ICoin> {
    coin: T;
    account: ICoinAccount;
}
