import { ILogger, TransformUtil } from '@ts-core/common';
import { EntityManagerImpl, IStub } from '@hlf-core/chaincode';
import { CoinAccount, CoinAccountUtil } from '@hlf-core/coin';

export class CoinAccountManager extends EntityManagerImpl<CoinAccount> {
    // --------------------------------------------------------------------------
    //
    //  Constructor
    //
    // --------------------------------------------------------------------------

    constructor(logger: ILogger, stub: IStub) {
        super(logger, stub);
    }

    // --------------------------------------------------------------------------
    //
    //  Public Methods
    //
    // --------------------------------------------------------------------------

    public toEntity(item: any): CoinAccount {
        return TransformUtil.toClass(CoinAccount, item);
    }
    
    public async save(item: CoinAccount): Promise<CoinAccount> {
        if (item.isEmpty()) {
            await this.remove(item);
            return item;
        }
        return super.save(item);
    }

    // --------------------------------------------------------------------------
    //
    //  Public Properties
    //
    // --------------------------------------------------------------------------

    public get prefix(): string {
        return CoinAccountUtil.PREFIX;
    }
}
