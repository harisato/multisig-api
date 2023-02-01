import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { ObjectLiteral, Repository } from 'typeorm';
import { TRANSACTION_STATUS } from '../../common/constants/app.constant';
import { MultisigTransactionHistoryResponse } from '../../dtos/responses';
import { TransactionHistory } from '../../entities/transaction-history.entity';
import { ENTITIES_CONFIG } from '../../module.config';
import { ITransactionHistoryRepository } from '../itx-history.repository';
import { BaseRepository } from './base.repository';

@Injectable()
export class TransactionHistoryRepository
  extends BaseRepository
  implements ITransactionHistoryRepository
{
  private readonly _logger = new Logger(TransactionHistoryRepository.name);
  constructor(
    @InjectRepository(ENTITIES_CONFIG.TX_HISTORY)
    private readonly repos: Repository<ObjectLiteral>,
  ) {
    super(repos);
    this._logger.log(
      '============== Constructor Transaction History Repository ==============',
    );
  }

  async saveTxHistory(
    internalChainId: number,
    safeAddress: string,
    txHash: string,
    createdAt: string,
  ): Promise<TransactionHistory> {
    return this.repos.save(
      new TransactionHistory(internalChainId, safeAddress, txHash, createdAt),
    );
  }

  async getTxHistoryBySafeAddress(
    safeAddress: string,
    internalChainId: number,
    pageIndex: number,
    limit: number,
  ) {
    const offset = limit * (pageIndex - 1);
    // query transactions from aura_tx
    // set direction of transaction

    const result: any[] = await this.repos.query(
      `
      SELECT AT.Id as AuraTxId, MT.Id as MultisigTxId, AT.TxHash as TxHash, MT.TypeUrl as TypeUrl, AT.FromAddress as FromAddress, AT.Amount as AuraTxAmount, AT.RewardAmount as AuraTxRewardAmount, MT.Amount as MultisigTxAmount, AT.Code as Status, MT.Sequence as Sequence, AT.CreatedAt as CreatedAt, AT.UpdatedAt as UpdatedAt 
      FROM TransactionHistory TH
        INNER JOIN AuraTx AT on TH.TxHash = AT.TxHash
        LEFT JOIN MultisigTransaction MT on TH.TxHash = MT.TxHash
        WHERE TH.InternalChainId = ?
        AND  TH.SafeAddress = ?
      UNION
      SELECT NULL as AuraTxId,  MT.ID as MultisigTxId, MT.TxHash as TxHash, MT.TypeUrl as TypeUrl, MT.FromAddress as FromAddress, NULL as AuraTxAmount,NULL as AuraTxRewardAmount, MT.Amount as MultisigTxAmount, MT.Status, MT.Sequence as Sequence, MT.CreatedAt as CreatedAt, MT.UpdatedAt as UpdateAt  FROM MultisigTransaction MT
        WHERE MT.InternalChainId = ?
        AND MT.FromAddress = ?
        AND Status In(?,?,?,?,?)
        AND TxHash IS NULL
      ORDER BY UpdatedAt DESC
      LIMIT ? OFFSET ?;
      `,
      [
        internalChainId,
        safeAddress,
        internalChainId,
        safeAddress,
        TRANSACTION_STATUS.CANCELLED,
        TRANSACTION_STATUS.SUCCESS,
        TRANSACTION_STATUS.FAILED,
        TRANSACTION_STATUS.REPLACED,
        TRANSACTION_STATUS.DELETED,
        limit,
        offset,
      ],
    );

    const txs = plainToInstance(MultisigTransactionHistoryResponse, result);
    return txs;
  }
}
