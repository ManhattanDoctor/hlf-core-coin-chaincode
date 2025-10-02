import { UID, TransformUtil, ILogger } from '@ts-core/common';
import { CoinAccountManager } from './CoinAccountManager';
import { Coin, ICoin, ICoinAccount, CoinUtil, CoinAccountUtil } from '@hlf-core/coin';
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

        await this.accountSet(toAccount);
        await this.accountSet(fromAccount);
        await this.save(coin);
        return { from: fromAccount, to: toAccount };
    }

    public async transferFromHeld(coin: T | string, from: string, to: string, amount: string): Promise<ICoinTransfer> {
        coin = await this.coinGet(coin);
        let toAccount = await this.accountGet(coin, to);
        let fromAccount = await this.accountGet(coin, from);

        await this._transferFromHeld(coin, fromAccount, toAccount, amount);

        await this.accountSet(toAccount);
        await this.accountSet(fromAccount);
        await this.save(coin);
        return { from: fromAccount, to: toAccount };
    }

    public async transferToHeld(coin: T | string, from: string, to: string, amount: string): Promise<ICoinTransfer> {
        coin = await this.coinGet(coin);
        let toAccount = await this.accountGet(coin, to);
        let fromAccount = await this.accountGet(coin, from);

        await this._transferToHeld(coin, fromAccount, toAccount, amount);

        await this.accountSet(toAccount);
        await this.accountSet(fromAccount);
        await this.save(coin);
        return { from: fromAccount, to: toAccount };
    }

    public async transferFromToHeld(coin: T | string, from: string, to: string, amount: string): Promise<ICoinTransfer> {
        coin = await this.coinGet(coin);
        let toAccount = await this.accountGet(coin, to);
        let fromAccount = await this.accountGet(coin, from);

        await this._transferFromToHeld(coin, fromAccount, toAccount, amount);

        await this.accountSet(toAccount);
        await this.accountSet(fromAccount);
        await this.save(coin);
        return { from: fromAccount, to: toAccount };
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

    protected async _emit(item: ICoinAccountDetails<T>, amount: string): Promise<void> {
        let { coin, account } = item;
        coin.balance.add(amount);
        account.add(amount);
    }

    protected async _emitHeld(item: ICoinAccountDetails<T>, amount: string): Promise<void> {
        let { coin, account } = item;
        account.addHeld(amount);
        coin.balance.addHeld(amount);
    }

    protected async _burn(item: ICoinAccountDetails<T>, amount: string): Promise<void> {
        let { coin, account } = item;
        account.remove(amount);
        coin.balance.remove(amount);
    }

    protected async _burnHeld(item: ICoinAccountDetails<T>, amount: string): Promise<void> {
        let { coin, account } = item;
        coin.balance.removeHeld(amount);
        account.removeHeld(amount);
    }

    protected async _hold(item: ICoinAccountDetails<T>, amount: string): Promise<void> {
        let { coin, account } = item;
        account.hold(amount);
        coin.balance.hold(amount);
    }

    protected async _unhold(item: ICoinAccountDetails<T>, amount: string): Promise<void> {
        let { coin, account } = item;
        account.unhold(amount);
        coin.balance.unhold(amount);
    }

    protected async _transfer(coin: T, from: ICoinAccount, to: ICoinAccount, amount: string): Promise<void> {
        to.add(amount);
        from.remove(amount);
        coin.balance.transfer(amount);
    }

    protected async _transferFromHeld(coin: T, from: ICoinAccount, to: ICoinAccount, amount: string): Promise<void> {
        to.add(amount);
        from.removeHeld(amount);
        coin.balance.transferFromHeld(amount);
    }

    protected async _transferToHeld(coin: T, from: ICoinAccount, to: ICoinAccount, amount: string): Promise<void> {
        to.addHeld(amount);
        from.remove(amount);
        coin.balance.transferToHeld(amount);
    }

    protected async _transferFromToHeld(coin: T, from: ICoinAccount, to: ICoinAccount, amount: string): Promise<void> {
        to.addHeld(amount);
        from.removeHeld(amount);
        coin.balance.transferFromToHeld(amount);
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
