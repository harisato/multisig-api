import * as _ from 'lodash';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  MULTISIG_CONFIRM_STATUS,
  TRANSACTION_STATUS,
  TRANSFER_DIRECTION,
  TX_TYPE_URL,
} from '../../common/constants/app.constant';
import { CustomError } from '../../common/customError';
import { ErrorMap } from '../../common/error.map';
import {
  MultisigTransactionHistoryResponse,
  ResponseDto,
} from '../../dtos/responses';
import { MODULE_REQUEST, REPOSITORY_INTERFACE } from '../../module.config';
import { IMessageRepository } from '../../repositories';
import { IMultisigConfirmRepository } from '../../repositories/imultisig-confirm.repository';
import { IMultisigTransactionsRepository } from '../../repositories/imultisig-transaction.repository';
import { IMultisigWalletRepository } from '../../repositories/imultisig-wallet.repository';
import { ITransactionRepository } from '../../repositories/itransaction.repository';
import { ITransactionService } from '../transaction.service';
import { BaseService } from './base.service';

@Injectable()
export class TransactionService
  extends BaseService
  implements ITransactionService
{
  private readonly _logger = new Logger(TransactionService.name);

  constructor(
    @Inject(REPOSITORY_INTERFACE.IMULTISIG_TRANSACTION_REPOSITORY)
    private multisigTransactionRepos: IMultisigTransactionsRepository,
    @Inject(REPOSITORY_INTERFACE.IMULTISIG_CONFIRM_REPOSITORY)
    private multisigConfirmRepos: IMultisigConfirmRepository,
    @Inject(REPOSITORY_INTERFACE.ITRANSACTION_REPOSITORY)
    private transRepos: ITransactionRepository,
    @Inject(REPOSITORY_INTERFACE.IMULTISIG_WALLET_REPOSITORY)
    private safeRepos: IMultisigWalletRepository,
    @Inject(REPOSITORY_INTERFACE.IMESSAGE_REPOSITORY)
    private messageRepos: IMessageRepository,
  ) {
    super(transRepos);
    this._logger.log(
      '============== Constructor Transaction Service ==============',
    );
  }

  async getListMultisigConfirmById(
    param: MODULE_REQUEST.GetMultisigSignaturesParam,
    status?: string,
  ): Promise<ResponseDto> {
    const { id } = param;
    try {
      const multisig = await this.multisigTransactionRepos.findOne(id);
      if (!multisig) throw new CustomError(ErrorMap.TRANSACTION_NOT_EXIST);

      const result =
        await this.multisigConfirmRepos.getListConfirmMultisigTransaction(
          id,
          undefined,
          status,
        );
      return ResponseDto.response(ErrorMap.SUCCESSFUL, result);
    } catch (error) {
      return ResponseDto.responseError(TransactionService.name, error);
    }
  }

  async getTransactionHistory(
    request: MODULE_REQUEST.GetAllTransactionsRequest,
  ): Promise<ResponseDto> {
    const { safeAddress, isHistory, pageSize, pageIndex, internalChainId } =
      request;

    try {
      const safe = await this.safeRepos.findByCondition({ safeAddress });
      if (safe.length === 0) throw new CustomError(ErrorMap.NO_SAFES_FOUND);

      let result: MultisigTransactionHistoryResponse[];
      if (isHistory)
        result = await this.transRepos.getAuraTx(
          safeAddress,
          internalChainId,
          pageIndex,
          pageSize,
        );
      else {
        result = await this.multisigTransactionRepos.getQueueTransaction(
          safeAddress,
          internalChainId,
          pageIndex,
          pageSize,
        );
        result = await this.getConfirmationStatus(result, safe[0].threshold);
      }
      const response = result.map((item) => {
        if (item.TypeUrl === null) item.TypeUrl = TX_TYPE_URL.RECEIVE;

        item.Direction = this.getDirection(
          item.TypeUrl,
          item.FromAddress,
          safeAddress,
        );

        item.FinalAmount = item.MultisigTxAmount || item.AuraTxAmount;

        if (!Number.isNaN(Number(item.Status))) {
          item.Status =
            Number(item.Status) === 0
              ? (item.Status = TRANSACTION_STATUS.SUCCESS)
              : TRANSACTION_STATUS.FAILED;
        }
        return item;
      });
      return ResponseDto.response(ErrorMap.SUCCESSFUL, response);
    } catch (error) {
      return ResponseDto.responseError(TransactionService.name, error);
    }
  }

  async getConfirmationStatus(
    txs: MultisigTransactionHistoryResponse[],
    threshold: number,
  ) {
    const result = await Promise.all(
      txs.map(async (tx) => {
        const confirmations: any[] =
          await this.multisigConfirmRepos.getListConfirmMultisigTransaction(
            tx.MultisigTxId,
            tx.TxHash,
          );
        tx.Confirmations = confirmations.filter(
          (x) => x.status === MULTISIG_CONFIRM_STATUS.CONFIRM,
        ).length;
        tx.Rejections = confirmations.length - tx.Confirmations;

        tx.ConfirmationsRequired = threshold;
        return tx;
      }),
    );
    return result;
  }

  getDirection(typeUrl: string, from: string, safeAddress: string): string {
    switch (typeUrl) {
      case TX_TYPE_URL.SEND:
        return from === safeAddress
          ? TRANSFER_DIRECTION.OUTGOING
          : TRANSFER_DIRECTION.INCOMING;
      case TX_TYPE_URL.MULTI_SEND:
      case TX_TYPE_URL.DELEGATE:
      case TX_TYPE_URL.REDELEGATE:
      case TX_TYPE_URL.VOTE:
        return TRANSFER_DIRECTION.OUTGOING;
      case TX_TYPE_URL.UNDELEGATE:
      case TX_TYPE_URL.WITHDRAW_REWARD:
      default:
        return TRANSFER_DIRECTION.INCOMING;
    }
  }

  async getTransactionDetails(
    // param: MODULE_REQUEST.GetTransactionDetailsParam,
    query: MODULE_REQUEST.GetTxDetailQuery,
  ): Promise<ResponseDto> {
    const { multisigTxId, auraTxId, safeAddress } = query;
    try {
      const txDetail = multisigTxId
        ? await this.multisigTransactionRepos.getMultisigTxDetail(multisigTxId)
        : await this.transRepos.getAuraTxDetail(auraTxId);
      if (!txDetail) throw new CustomError(ErrorMap.TRANSACTION_NOT_EXIST);

      // get signed info
      const threshold = await this.safeRepos.getThreshold(safeAddress);
      // const owner = await this.safeOwnerRepos.getOwners(safeAddress);

      
      if (!txDetail.MultisigTxId) {
        // case: receive token - msgSend tx
        const messages = await this.messageRepos.getMsgsByAuraTxId(
          txDetail.AuraTxId,
        );
        txDetail.Messages = messages.map((msg) => _.omitBy(msg, _.isNil));

        txDetail.Status =
            Number(txDetail.Status) === 0
              ? (txDetail.Status = TRANSACTION_STATUS.SUCCESS)
              : TRANSACTION_STATUS.FAILED;
      } else {

        // get confirmations
        const confirmations =
          await this.multisigConfirmRepos.getListConfirmMultisigTransaction(
            txDetail.MultisigTxId,
            null,
            MULTISIG_CONFIRM_STATUS.CONFIRM,
          );

        // get rejections
        const rejections =
          await this.multisigConfirmRepos.getListConfirmMultisigTransaction(
            txDetail.MultisigTxId,
            null,
            MULTISIG_CONFIRM_STATUS.REJECT,
          );

        // get execution info
        const executors =
          await this.multisigConfirmRepos.getListConfirmMultisigTransaction(
            txDetail.MultisigTxId,
            null,
            MULTISIG_CONFIRM_STATUS.SEND,
          );

        // get messages & auto claim amount
        const messages = await this.messageRepos.getMsgsByTxId(
          txDetail.MultisigTxId,
        );
        const autoClaimAmount = txDetail.AuraTxId
          ? await this.messageRepos.getMsgsByAuraTxId(txDetail.AuraTxId)
          : [];

        // set data
        txDetail.Messages = messages.map((msg) => {
          // Remove a null or undefined value
          msg = _.omitBy(msg, _.isNil);

          // get amount from auraTx tbl when msg type is withdraw reward
          // TODO: Need mapping msg of auraTx with msg of multisigTx
          if (msg.typeUrl === TX_TYPE_URL.WITHDRAW_REWARD) {
            const withdrawMsg = autoClaimAmount.filter(
              (x) =>
                x.typeUrl === TX_TYPE_URL.WITHDRAW_REWARD &&
                x.fromAddress === msg.validatorAddress,
            );
            if (withdrawMsg.length > 0) msg.amount = withdrawMsg[0].amount;
          }
          return msg;
        });

        txDetail.Confirmations = confirmations;
        txDetail.Rejectors = rejections;
        txDetail.Executor = executors[0];

        txDetail.AutoClaimAmount = autoClaimAmount.reduce(
          (totalAmount, item) => {
            const ignoreTypeUrl = [
              TX_TYPE_URL.SEND.toString(),
              TX_TYPE_URL.MULTI_SEND.toString(),
              TX_TYPE_URL.WITHDRAW_REWARD.toString(),
            ];
            if (ignoreTypeUrl.includes(item.typeUrl)) {
              return totalAmount;
            }
            return Number(totalAmount + item.amount);
          },
          0,
        );
      }

      txDetail.ConfirmationsRequired = threshold.ConfirmationsRequired;

      return ResponseDto.response(ErrorMap.SUCCESSFUL, txDetail);
    } catch (error) {
      return ResponseDto.responseError(TransactionService.name, error);
    }
  }
}
