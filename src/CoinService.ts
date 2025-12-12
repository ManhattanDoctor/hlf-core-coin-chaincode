import { ILogger, LoggerWrapper, MathUtil } from '@ts-core/common';
import { ICoinEmitDto, CoinTransferredEvent, CoinEmittedEvent, CoinBurnedEvent, ICoinHoldDto, CoinHoldedEvent, CoinUnholdedEvent, ICoinTransferDto, ICoinBalanceGetDto, ICoin, ICoinGetDto, ICoinBurnDto, ICoinUnholdDto, ICoinBalanceGetDtoResponse, ICoinNullifyDto, CoinNullifiedEvent } from '@hlf-core/coin';
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
        let { objectUid, target, coinUid } = params;
        if (objectUid === target) {
            throw new CoinFromToEqualsError(objectUid);
        }
        if (await holder.stub.hasNotState(coinUid)) {
            throw new CoinNotFoundError(coinUid);
        }
        if (await holder.stub.hasNotState(target)) {
            throw new CoinObjectNotFoundError(target);
        }
        if (await holder.stub.hasNotState(objectUid)) {
            throw new CoinObjectNotFoundError(objectUid);
        }
    }

    // --------------------------------------------------------------------------
    //
    //  Emit / Burn Methods
    //
    // --------------------------------------------------------------------------

    public async emit(holder: H, params: ICoinEmitDto, isDispatchEvent: boolean): Promise<void> {
        let { coinUid, value, objectUid } = params;
        if (await holder.stub.hasNotState(coinUid)) {
            throw new CoinNotFoundError(coinUid);
        }
        if (await holder.stub.hasNotState(objectUid)) {
            throw new CoinObjectNotFoundError(objectUid);
        }
        await this.getManager(holder.stub, coinUid).emit(coinUid, objectUid, value);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinEmittedEvent(params));
        }
    }

    public async emitHeld(holder: H, params: ICoinEmitDto, isDispatchEvent: boolean): Promise<void> {
        let { coinUid, value, objectUid } = params;
        if (await holder.stub.hasNotState(coinUid)) {
            throw new CoinNotFoundError(coinUid);
        }
        if (await holder.stub.hasNotState(objectUid)) {
            throw new CoinObjectNotFoundError(objectUid);
        }
        await this.getManager(holder.stub, coinUid).emitHeld(coinUid, objectUid, value);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinEmittedEvent(params));
        }
    }

    public async burn(holder: H, params: ICoinBurnDto, isDispatchEvent: boolean): Promise<void> {
        let { coinUid, value, objectUid } = params;
        if (await holder.stub.hasNotState(coinUid)) {
            throw new CoinNotFoundError(coinUid);
        }
        if (await holder.stub.hasNotState(objectUid)) {
            throw new CoinObjectNotFoundError(objectUid);
        }
        await this.getManager(holder.stub, coinUid).burn(coinUid, objectUid, value);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinBurnedEvent(params));
        }
    }

    public async burnHeld(holder: H, params: ICoinBurnDto, isDispatchEvent: boolean): Promise<void> {
        let { coinUid, value, objectUid } = params;
        if (await holder.stub.hasNotState(coinUid)) {
            throw new CoinNotFoundError(coinUid);
        }
        if (await holder.stub.hasNotState(objectUid)) {
            throw new CoinObjectNotFoundError(objectUid);
        }
        await this.getManager(holder.stub, coinUid).burnHeld(coinUid, objectUid, value);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinBurnedEvent(params));
        }
    }

    public async nullify(holder: H, params: ICoinNullifyDto, isDispatchEvent: boolean): Promise<void> {
        let { coinUid, objectUid } = params;
        if (await holder.stub.hasNotState(coinUid)) {
            throw new CoinNotFoundError(coinUid);
        }
        if (await holder.stub.hasNotState(objectUid)) {
            throw new CoinObjectNotFoundError(objectUid);
        }
        let { value } = await this.getManager(holder.stub, coinUid).nullify(coinUid, objectUid);
        if (isDispatchEvent && !MathUtil.equals(value, '0')) {
            await holder.stub.dispatch(new CoinNullifiedEvent(params));
        }
    }

    public async nullifyHeld(holder: H, params: ICoinNullifyDto, isDispatchEvent: boolean): Promise<void> {
        let { coinUid, objectUid } = params;
        if (await holder.stub.hasNotState(coinUid)) {
            throw new CoinNotFoundError(coinUid);
        }
        if (await holder.stub.hasNotState(objectUid)) {
            throw new CoinObjectNotFoundError(objectUid);
        }
        let { value } = await this.getManager(holder.stub, coinUid).nullifyHeld(coinUid, objectUid);
        if (isDispatchEvent && !MathUtil.equals(value, '0')) {
            await holder.stub.dispatch(new CoinNullifiedEvent(params));
        }
    }

    // --------------------------------------------------------------------------
    //
    //  Hold Methods
    //
    // --------------------------------------------------------------------------

    public async hold(holder: H, params: ICoinHoldDto, isDispatchEvent: boolean): Promise<void> {
        let { coinUid, value, objectUid, initiatorUid } = params;
        if (await holder.stub.hasNotState(coinUid)) {
            throw new CoinNotFoundError(coinUid);
        }
        if (await holder.stub.hasNotState(objectUid)) {
            throw new CoinObjectNotFoundError(objectUid);
        }
        await this.getManager(holder.stub, coinUid).hold(coinUid, objectUid, value);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinHoldedEvent({ objectUid, coinUid, value, initiatorUid }));
        }
    }

    public async unhold(holder: H, params: ICoinUnholdDto, isDispatchEvent: boolean): Promise<void> {
        let { coinUid, value, objectUid, initiatorUid } = params;
        if (await holder.stub.hasNotState(coinUid)) {
            throw new CoinNotFoundError(coinUid);
        }
        if (await holder.stub.hasNotState(objectUid)) {
            throw new CoinObjectNotFoundError(objectUid);
        }
        await this.getManager(holder.stub, coinUid).unhold(coinUid, objectUid, value);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinUnholdedEvent({ objectUid, coinUid, value, initiatorUid }));
        }
    }

    // --------------------------------------------------------------------------
    //
    //  Transfer Methods
    //
    // --------------------------------------------------------------------------

    public async transfer(holder: H, params: ICoinTransferDto, isDispatchEvent: boolean): Promise<void> {
        let { coinUid, value, objectUid, target, initiatorUid } = params;
        await this.validateTransfer(holder, params);
        await this.getManager(holder.stub, coinUid).transfer(coinUid, objectUid, target, value);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinTransferredEvent({ coinUid, objectUid, target, value, initiatorUid }));
        }
    }

    public async transferToHeld(holder: H, params: ICoinTransferDto, isDispatchEvent: boolean): Promise<void> {
        let { coinUid, value, objectUid, target, initiatorUid } = params;
        await this.validateTransfer(holder, params);
        await this.getManager(holder.stub, coinUid).transferToHeld(coinUid, objectUid, target, value);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinTransferredEvent({ coinUid, objectUid, target, value, initiatorUid }));
            await holder.stub.dispatch(new CoinHoldedEvent({ objectUid: params.target, coinUid, value, initiatorUid }));
        }
    }

    public async transferFromHeld(holder: H, params: ICoinTransferDto, isDispatchEvent: boolean): Promise<void> {
        let { coinUid, value, objectUid, target, initiatorUid } = params;
        await this.validateTransfer(holder, params);
        await this.getManager(holder.stub, coinUid).transferFromHeld(coinUid, objectUid, target, value);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinUnholdedEvent({ coinUid, objectUid, value, initiatorUid }));
            await holder.stub.dispatch(new CoinTransferredEvent({ coinUid, objectUid, target, value, initiatorUid }));
        }
    }

    public async transferFromToHeld(holder: H, params: ICoinTransferDto, isDispatchEvent: boolean): Promise<void> {
        let { coinUid, value, objectUid, target, initiatorUid } = params;
        await this.validateTransfer(holder, params);
        await this.getManager(holder.stub, coinUid).transferFromToHeld(coinUid, objectUid, target, value);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinUnholdedEvent({ coinUid, objectUid, value, initiatorUid }));
            await holder.stub.dispatch(new CoinTransferredEvent({ coinUid, objectUid, target, value, initiatorUid }));
            await holder.stub.dispatch(new CoinHoldedEvent({ objectUid: params.target, coinUid, value, initiatorUid }));
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