import { ILogger, LoggerWrapper } from '@ts-core/common';
import { ICoinEmitDto, CoinTransferredEvent, CoinEmittedEvent, CoinBurnedEvent, ICoinHoldDto, CoinHoldedEvent, CoinUnholdedEvent, ICoinTransferDto, ICoinBalanceGetDto, ICoin, ICoinGetDto, ICoinBurnDto, ICoinUnholdDto, ICoinBalanceGetDtoResponse } from '@hlf-core/coin';
import { CoinFromToEqualsError, CoinNotFoundError, CoinObjectNotFoundError } from './Error';
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
    //  Protected Methods
    //
    // --------------------------------------------------------------------------

    protected async validateTransfer(holder: H, params: ICoinTransferDto): Promise<void> {
        let { from, to, coinUid } = params;
        if (from === to) {
            throw new CoinFromToEqualsError(from);
        }
        if (await holder.stub.hasNotState(coinUid)) {
            throw new CoinNotFoundError(coinUid);
        }
        if (await holder.stub.hasNotState(to)) {
            throw new CoinObjectNotFoundError(to);
        }
        if (await holder.stub.hasNotState(from)) {
            throw new CoinObjectNotFoundError(from);
        }
    }

    // --------------------------------------------------------------------------
    //
    //  Emit / Burn Methods
    //
    // --------------------------------------------------------------------------

    public async emit(holder: H, params: ICoinEmitDto, isDispatchEvent: boolean): Promise<void> {
        let { coinUid, amount, objectUid } = params;
        if (await holder.stub.hasNotState(coinUid)) {
            throw new CoinNotFoundError(coinUid);
        }
        if (await holder.stub.hasNotState(objectUid)) {
            throw new CoinObjectNotFoundError(objectUid);
        }
        await this.getManager(holder.stub, coinUid).emit(coinUid, objectUid, amount);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinEmittedEvent(params));
        }
    }

    public async emitHeld(holder: H, params: ICoinEmitDto, isDispatchEvent: boolean): Promise<void> {
        let { coinUid, amount, objectUid } = params;
        if (await holder.stub.hasNotState(coinUid)) {
            throw new CoinNotFoundError(coinUid);
        }
        if (await holder.stub.hasNotState(objectUid)) {
            throw new CoinObjectNotFoundError(objectUid);
        }
        await this.getManager(holder.stub, coinUid).emitHeld(coinUid, objectUid, amount);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinEmittedEvent(params));
        }
    }

    public async burn(holder: H, params: ICoinBurnDto, isDispatchEvent: boolean): Promise<void> {
        let { coinUid, amount, objectUid } = params;
        if (await holder.stub.hasNotState(coinUid)) {
            throw new CoinNotFoundError(coinUid);
        }
        if (await holder.stub.hasNotState(objectUid)) {
            throw new CoinObjectNotFoundError(objectUid);
        }
        await this.getManager(holder.stub, coinUid).burn(coinUid, objectUid, amount);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinBurnedEvent(params));
        }
    }

    public async burnHeld(holder: H, params: ICoinBurnDto, isDispatchEvent: boolean): Promise<void> {
        let { coinUid, amount, objectUid } = params;
        if (await holder.stub.hasNotState(coinUid)) {
            throw new CoinNotFoundError(coinUid);
        }
        if (await holder.stub.hasNotState(objectUid)) {
            throw new CoinObjectNotFoundError(objectUid);
        }
        await this.getManager(holder.stub, coinUid).burnHeld(coinUid, objectUid, amount);
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
        let { coinUid, amount, from, initiatorUid } = params;
        if (await holder.stub.hasNotState(coinUid)) {
            throw new CoinNotFoundError(coinUid);
        }
        if (await holder.stub.hasNotState(from)) {
            throw new CoinObjectNotFoundError(from);
        }
        await this.getManager(holder.stub, coinUid).hold(coinUid, from, amount);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinHoldedEvent({ objectUid: from, coinUid, amount, initiatorUid }));
        }
    }

    public async unhold(holder: H, params: ICoinUnholdDto, isDispatchEvent: boolean): Promise<void> {
        let { coinUid, amount, from, initiatorUid } = params;
        if (await holder.stub.hasNotState(coinUid)) {
            throw new CoinNotFoundError(coinUid);
        }
        if (await holder.stub.hasNotState(from)) {
            throw new CoinObjectNotFoundError(from);
        }
        await this.getManager(holder.stub, coinUid).unhold(coinUid, from, amount);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinUnholdedEvent({ objectUid: from, coinUid, amount, initiatorUid }));
        }
    }

    // --------------------------------------------------------------------------
    //
    //  Transfer Methods
    //
    // --------------------------------------------------------------------------

    public async transfer(holder: H, params: ICoinTransferDto, isDispatchEvent: boolean): Promise<void> {
        let { coinUid, amount, from, to, initiatorUid } = params;
        await this.validateTransfer(holder, params);
        await this.getManager(holder.stub, coinUid).transfer(coinUid, from, to, amount);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinTransferredEvent({ coinUid, from, to, amount, initiatorUid }));
        }
    }

    public async transferToHeld(holder: H, params: ICoinTransferDto, isDispatchEvent: boolean): Promise<void> {
        let { coinUid, amount, from, to, initiatorUid } = params;
        await this.validateTransfer(holder, params);
        await this.getManager(holder.stub, coinUid).transferToHeld(coinUid, from, to, amount);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinTransferredEvent({ coinUid, from, to, amount, initiatorUid }));
            await holder.stub.dispatch(new CoinHoldedEvent({ objectUid: params.to, coinUid, amount, initiatorUid }));
        }
    }

    public async transferFromHeld(holder: H, params: ICoinTransferDto, isDispatchEvent: boolean): Promise<void> {
        let { coinUid, amount, from, to, initiatorUid } = params;
        await this.validateTransfer(holder, params);
        await this.getManager(holder.stub, coinUid).transferFromHeld(coinUid, from, to, amount);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinUnholdedEvent({ objectUid: params.from, coinUid, amount, initiatorUid }));
            await holder.stub.dispatch(new CoinTransferredEvent({ coinUid, from, to, amount, initiatorUid }));
        }
    }

    public async transferFromToHeld(holder: H, params: ICoinTransferDto, isDispatchEvent: boolean): Promise<void> {
        let { coinUid, amount, from, to, initiatorUid } = params;
        await this.validateTransfer(holder, params);
        await this.getManager(holder.stub, coinUid).transferFromToHeld(coinUid, from, to, amount);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinUnholdedEvent({ objectUid: params.from, coinUid, amount, initiatorUid }));
            await holder.stub.dispatch(new CoinTransferredEvent({ coinUid, from, to, amount, initiatorUid }));
            await holder.stub.dispatch(new CoinHoldedEvent({ objectUid: params.to, coinUid, amount, initiatorUid }));
        }
    }

    // --------------------------------------------------------------------------
    //
    //  Other Methods
    //
    // --------------------------------------------------------------------------

    public async get<T extends ICoin>(holder: H, params: ICoinGetDto): Promise<T> {
        let { uid, details } = params;
        if (await holder.stub.hasNotState(uid)) {
            throw new CoinNotFoundError(uid);
        }
        return this.getManager<T>(holder.stub, uid).get(uid, details);
    }

    public async balanceGet(holder: H, params: ICoinBalanceGetDto): Promise<ICoinBalanceGetDtoResponse> {
        let { coinUid, objectUid } = params;
        if (await holder.stub.hasNotState(coinUid)) {
            throw new CoinNotFoundError(coinUid);
        }
        if (await holder.stub.hasNotState(objectUid)) {
            throw new CoinObjectNotFoundError(objectUid);
        }
        let account = await this.getManager(holder.stub, coinUid).accountGet(coinUid, objectUid);
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