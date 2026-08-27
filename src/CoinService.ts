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
        let { object, target, coinUid } = params;
        if (object.ownerUid === target.ownerUid && object.id === target.id) {
            throw new CoinFromToEqualsError(object.ownerUid);
        }
        if (await holder.stub.hasNotState(coinUid)) {
            throw new CoinNotFoundError(coinUid);
        }
        if (await holder.stub.hasNotState(target.ownerUid)) {
            throw new CoinObjectNotFoundError(target.ownerUid);
        }
        if (await holder.stub.hasNotState(object.ownerUid)) {
            throw new CoinObjectNotFoundError(object.ownerUid);
        }
    }

    // --------------------------------------------------------------------------
    //
    //  Emit / Burn Methods
    //
    // --------------------------------------------------------------------------

    public async emit(holder: H, params: ICoinEmitDto, isDispatchEvent: boolean): Promise<void> {
        let { coinUid, value, object } = params;
        if (await holder.stub.hasNotState(coinUid)) {
            throw new CoinNotFoundError(coinUid);
        }
        if (await holder.stub.hasNotState(object.ownerUid)) {
            throw new CoinObjectNotFoundError(object.ownerUid);
        }
        await this.getManager(holder.stub, coinUid).emit(coinUid, object, value);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinEmittedEvent(params));
        }
    }

    public async emitHeld(holder: H, params: ICoinEmitDto, isDispatchEvent: boolean): Promise<void> {
        let { coinUid, value, object } = params;
        if (await holder.stub.hasNotState(coinUid)) {
            throw new CoinNotFoundError(coinUid);
        }
        if (await holder.stub.hasNotState(object.ownerUid)) {
            throw new CoinObjectNotFoundError(object.ownerUid);
        }
        await this.getManager(holder.stub, coinUid).emitHeld(coinUid, object, value);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinEmittedEvent(params));
        }
    }

    public async burn(holder: H, params: ICoinBurnDto, isDispatchEvent: boolean): Promise<void> {
        let { coinUid, value, object } = params;
        if (await holder.stub.hasNotState(coinUid)) {
            throw new CoinNotFoundError(coinUid);
        }
        if (await holder.stub.hasNotState(object.ownerUid)) {
            throw new CoinObjectNotFoundError(object.ownerUid);
        }
        await this.getManager(holder.stub, coinUid).burn(coinUid, object, value);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinBurnedEvent(params));
        }
    }

    public async burnHeld(holder: H, params: ICoinBurnDto, isDispatchEvent: boolean): Promise<void> {
        let { coinUid, value, object } = params;
        if (await holder.stub.hasNotState(coinUid)) {
            throw new CoinNotFoundError(coinUid);
        }
        if (await holder.stub.hasNotState(object.ownerUid)) {
            throw new CoinObjectNotFoundError(object.ownerUid);
        }
        await this.getManager(holder.stub, coinUid).burnHeld(coinUid, object, value);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinBurnedEvent(params));
        }
    }

    public async nullify(holder: H, params: ICoinNullifyDto, isDispatchEvent: boolean): Promise<void> {
        let { coinUid, object } = params;
        if (await holder.stub.hasNotState(coinUid)) {
            throw new CoinNotFoundError(coinUid);
        }
        if (await holder.stub.hasNotState(object.ownerUid)) {
            throw new CoinObjectNotFoundError(object.ownerUid);
        }
        let { value } = await this.getManager(holder.stub, coinUid).nullify(coinUid, object);
        if (isDispatchEvent && !MathUtil.equals(value, '0')) {
            await holder.stub.dispatch(new CoinNullifiedEvent(params));
        }
    }

    public async nullifyHeld(holder: H, params: ICoinNullifyDto, isDispatchEvent: boolean): Promise<void> {
        let { coinUid, object } = params;
        if (await holder.stub.hasNotState(coinUid)) {
            throw new CoinNotFoundError(coinUid);
        }
        if (await holder.stub.hasNotState(object.ownerUid)) {
            throw new CoinObjectNotFoundError(object.ownerUid);
        }
        let { value } = await this.getManager(holder.stub, coinUid).nullifyHeld(coinUid, object);
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
        let { coinUid, value, object, initiatorUid } = params;
        if (await holder.stub.hasNotState(coinUid)) {
            throw new CoinNotFoundError(coinUid);
        }
        if (await holder.stub.hasNotState(object.ownerUid)) {
            throw new CoinObjectNotFoundError(object.ownerUid);
        }
        await this.getManager(holder.stub, coinUid).hold(coinUid, object, value);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinHoldedEvent({ object, coinUid, value, initiatorUid }));
        }
    }

    public async unhold(holder: H, params: ICoinUnholdDto, isDispatchEvent: boolean): Promise<void> {
        let { coinUid, value, object, initiatorUid } = params;
        if (await holder.stub.hasNotState(coinUid)) {
            throw new CoinNotFoundError(coinUid);
        }
        if (await holder.stub.hasNotState(object.ownerUid)) {
            throw new CoinObjectNotFoundError(object.ownerUid);
        }
        await this.getManager(holder.stub, coinUid).unhold(coinUid, object, value);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinUnholdedEvent({ object, coinUid, value, initiatorUid }));
        }
    }

    // --------------------------------------------------------------------------
    //
    //  Transfer Methods
    //
    // --------------------------------------------------------------------------

    public async transfer(holder: H, params: ICoinTransferDto, isDispatchEvent: boolean): Promise<void> {
        let { coinUid, value, object, target, initiatorUid } = params;
        await this.validateTransfer(holder, params);
        await this.getManager(holder.stub, coinUid).transfer(coinUid, object, target, value);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinTransferredEvent({ coinUid, object, target, value, initiatorUid }));
        }
    }

    public async transferToHeld(holder: H, params: ICoinTransferDto, isDispatchEvent: boolean): Promise<void> {
        let { coinUid, value, object, target, initiatorUid } = params;
        await this.validateTransfer(holder, params);
        await this.getManager(holder.stub, coinUid).transferToHeld(coinUid, object, target, value);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinTransferredEvent({ coinUid, object, target, value, initiatorUid }));
            await holder.stub.dispatch(new CoinHoldedEvent({ object: params.target, coinUid, value, initiatorUid }));
        }
    }

    public async transferFromHeld(holder: H, params: ICoinTransferDto, isDispatchEvent: boolean): Promise<void> {
        let { coinUid, value, object, target, initiatorUid } = params;
        await this.validateTransfer(holder, params);
        await this.getManager(holder.stub, coinUid).transferFromHeld(coinUid, object, target, value);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinUnholdedEvent({ coinUid, object, value, initiatorUid }));
            await holder.stub.dispatch(new CoinTransferredEvent({ coinUid, object, target, value, initiatorUid }));
        }
    }

    public async transferFromToHeld(holder: H, params: ICoinTransferDto, isDispatchEvent: boolean): Promise<void> {
        let { coinUid, value, object, target, initiatorUid } = params;
        await this.validateTransfer(holder, params);
        await this.getManager(holder.stub, coinUid).transferFromToHeld(coinUid, object, target, value);
        if (isDispatchEvent) {
            await holder.stub.dispatch(new CoinUnholdedEvent({ coinUid, object, value, initiatorUid }));
            await holder.stub.dispatch(new CoinTransferredEvent({ coinUid, object, target, value, initiatorUid }));
            await holder.stub.dispatch(new CoinHoldedEvent({ object: params.target, coinUid, value, initiatorUid }));
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
        let { coinUid, object } = params;
        if (await holder.stub.hasNotState(coinUid)) {
            throw new CoinNotFoundError(coinUid);
        }
        if (await holder.stub.hasNotState(object.ownerUid)) {
            throw new CoinObjectNotFoundError(object.ownerUid);
        }
        let account = await this.getManager(holder.stub, coinUid).accountGet(coinUid, object);
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