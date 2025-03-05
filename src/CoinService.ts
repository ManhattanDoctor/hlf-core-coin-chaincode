import { ILogger, LoggerWrapper } from '@ts-core/common';
import { ICoinEmitDto, CoinTransferredEvent, CoinEmittedEvent, CoinBurnedEvent, ICoinHoldDto, CoinHoldedEvent, CoinUnholdedEvent, ICoinTransferDto, ICoinBalanceGetDto, ICoin, ICoinGetDto, ICoinBurnDto, ICoinUnholdDto, ICoinBalanceGetDtoResponse } from '@hlf-core/coin';
import { CoinNotFoundError, CoinObjectNotFoundError } from './Error';
import { IStub, IStubHolder } from '@hlf-core/chaincode';
import { ICoinManager } from './ICoinManager';
import { CoinManager } from './CoinManager';
import * as _ from 'lodash';

export class CoinService<H extends IStubHolder = IStubHolder> extends LoggerWrapper {
    // --------------------------------------------------------------------------
    //
    //  Constructor
    //
    // --------------------------------------------------------------------------

    constructor(logger: ILogger) {
        super(logger);
    }

    // --------------------------------------------------------------------------
    //
    //  Emit / Burn Methods
    //
    // --------------------------------------------------------------------------

    public async emit(holder: H, params: ICoinEmitDto, isDispatchEvent: boolean): Promise<void> {
        if (await holder.stub.hasNotState(params.coinUid)) {
            throw new CoinNotFoundError(params.coinUid);
        }
        if (await holder.stub.hasNotState(params.objectUid)) {
            throw new CoinObjectNotFoundError(params.objectUid);
        }
        await this.getManager(holder.stub, params.coinUid).emit(params.coinUid, params.objectUid, params.amount);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinEmittedEvent(params));
        }
    }

    public async emitHeld(holder: H, params: ICoinEmitDto, isDispatchEvent: boolean): Promise<void> {
        if (await holder.stub.hasNotState(params.coinUid)) {
            throw new CoinNotFoundError(params.coinUid);
        }
        if (await holder.stub.hasNotState(params.objectUid)) {
            throw new CoinObjectNotFoundError(params.objectUid);
        }
        await this.getManager(holder.stub, params.coinUid).emitHeld(params.coinUid, params.objectUid, params.amount);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinEmittedEvent(params));
        }
    }

    public async burn(holder: H, params: ICoinBurnDto, isDispatchEvent: boolean): Promise<void> {
        if (await holder.stub.hasNotState(params.coinUid)) {
            throw new CoinNotFoundError(params.coinUid);
        }
        if (await holder.stub.hasNotState(params.objectUid)) {
            throw new CoinObjectNotFoundError(params.objectUid);
        }
        await this.getManager(holder.stub, params.coinUid).burn(params.coinUid, params.objectUid, params.amount);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinBurnedEvent(params));
        }
    }

    public async burnHeld(holder: H, params: ICoinBurnDto, isDispatchEvent: boolean): Promise<void> {
        if (await holder.stub.hasNotState(params.coinUid)) {
            throw new CoinNotFoundError(params.coinUid);
        }
        if (await holder.stub.hasNotState(params.objectUid)) {
            throw new CoinObjectNotFoundError(params.objectUid);
        }
        await this.getManager(holder.stub, params.coinUid).burnHeld(params.coinUid, params.objectUid, params.amount);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinBurnedEvent(params));
        }
    }

    // --------------------------------------------------------------------------
    //
    //  Hold Methods
    //
    // --------------------------------------------------------------------------

    public async hold(holder: H, params: ICoinHoldDto, isDispatchEvent: boolean): Promise<void> {
        if (await holder.stub.hasNotState(params.coinUid)) {
            throw new CoinNotFoundError(params.coinUid);
        }
        if (await holder.stub.hasNotState(params.from)) {
            throw new CoinObjectNotFoundError(params.from);
        }
        await this.getManager(holder.stub, params.coinUid).hold(params.coinUid, params.from, params.amount);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinHoldedEvent({ coinUid: params.coinUid, amount: params.amount, objectUid: params.from, initiatorUid: params.initiatorUid }));
        }
    }

    public async unhold(holder: H, params: ICoinUnholdDto, isDispatchEvent: boolean): Promise<void> {
        if (await holder.stub.hasNotState(params.coinUid)) {
            throw new CoinNotFoundError(params.coinUid);
        }
        if (await holder.stub.hasNotState(params.from)) {
            throw new CoinObjectNotFoundError(params.from);
        }
        await this.getManager(holder.stub, params.coinUid).unhold(params.coinUid, params.from, params.amount);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinUnholdedEvent({ coinUid: params.coinUid, amount: params.amount, objectUid: params.from, initiatorUid: params.initiatorUid }));
        }
    }

    // --------------------------------------------------------------------------
    //
    //  Transfer Methods
    //
    // --------------------------------------------------------------------------

    public async transfer(holder: H, params: ICoinTransferDto, isDispatchEvent: boolean): Promise<void> {
        if (await holder.stub.hasNotState(params.coinUid)) {
            throw new CoinNotFoundError(params.coinUid);
        }
        if (await holder.stub.hasNotState(params.to)) {
            throw new CoinObjectNotFoundError(params.to);
        }
        if (await holder.stub.hasNotState(params.from)) {
            throw new CoinObjectNotFoundError(params.from);
        }
        await this.getManager(holder.stub, params.coinUid).transfer(params.coinUid, params.from, params.to, params.amount);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinTransferredEvent({ coinUid: params.coinUid, from: params.from, to: params.to, amount: params.amount, initiatorUid: params.initiatorUid }));
        }
    }

    public async transferToHeld(holder: H, params: ICoinTransferDto, isDispatchEvent: boolean): Promise<void> {
        if (await holder.stub.hasNotState(params.coinUid)) {
            throw new CoinNotFoundError(params.coinUid);
        }
        if (await holder.stub.hasNotState(params.to)) {
            throw new CoinObjectNotFoundError(params.to);
        }
        if (await holder.stub.hasNotState(params.from)) {
            throw new CoinObjectNotFoundError(params.from);
        }
        await this.getManager(holder.stub, params.coinUid).transferToHeld(params.coinUid, params.from, params.to, params.amount);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinTransferredEvent({ coinUid: params.coinUid, from: params.from, to: params.to, amount: params.amount, initiatorUid: params.initiatorUid }));
        }
    }

    public async transferFromHeld(holder: H, params: ICoinTransferDto, isDispatchEvent: boolean): Promise<void> {
        if (await holder.stub.hasNotState(params.coinUid)) {
            throw new CoinNotFoundError(params.coinUid);
        }
        if (await holder.stub.hasNotState(params.to)) {
            throw new CoinObjectNotFoundError(params.to);
        }
        if (await holder.stub.hasNotState(params.from)) {
            throw new CoinObjectNotFoundError(params.from);
        }
        await this.getManager(holder.stub, params.coinUid).transferFromHeld(params.coinUid, params.from, params.to, params.amount);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinTransferredEvent({ coinUid: params.coinUid, from: params.from, to: params.to, amount: params.amount, initiatorUid: params.initiatorUid }));
        }
    }

    public async transferFromToHeld(holder: H, params: ICoinTransferDto, isDispatchEvent: boolean): Promise<void> {
        if (await holder.stub.hasNotState(params.coinUid)) {
            throw new CoinNotFoundError(params.coinUid);
        }
        if (await holder.stub.hasNotState(params.to)) {
            throw new CoinObjectNotFoundError(params.to);
        }
        if (await holder.stub.hasNotState(params.from)) {
            throw new CoinObjectNotFoundError(params.from);
        }
        await this.getManager(holder.stub, params.coinUid).transferFromToHeld(params.coinUid, params.from, params.to, params.amount);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinTransferredEvent({ coinUid: params.coinUid, from: params.from, to: params.to, amount: params.amount, initiatorUid: params.initiatorUid }));
        }
    }

    // --------------------------------------------------------------------------
    //
    //  Other Methods
    //
    // --------------------------------------------------------------------------

    public async get<T extends ICoin>(holder: H, params: ICoinGetDto): Promise<T> {
        if (await holder.stub.hasNotState(params.uid)) {
            throw new CoinNotFoundError(params.uid);
        }
        return this.getManager<T>(holder.stub, params.uid).get(params.uid, params.details);
    }

    public async balanceGet(holder: H, params: ICoinBalanceGetDto): Promise<ICoinBalanceGetDtoResponse> {
        if (await holder.stub.hasNotState(params.coinUid)) {
            throw new CoinNotFoundError(params.coinUid);
        }
        if (await holder.stub.hasNotState(params.objectUid)) {
            throw new CoinObjectNotFoundError(params.objectUid);
        }
        let account = await this.getManager(holder.stub, params.coinUid).accountGet(params.coinUid, params.objectUid);
        return { held: account.held, inUse: account.inUse, total: account.getTotal() }
    }

    // --------------------------------------------------------------------------
    //
    //  Protected Methods
    //
    // --------------------------------------------------------------------------

    protected getManager<T extends ICoin>(stub: IStub, coinUid: string): ICoinManager<T> {
        return new CoinManager<T>(this.logger, stub);
    }
}