import {
  Controller,
  Get,
  Post,
  Query,
  Inject,
  Body,
  Param,
  HttpStatus,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { ApiBadRequestResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CONTROLLER_CONSTANTS,
  URL_CONSTANTS,
} from 'src/common/constants/api.constant';
import { MODULE_REQUEST, SERVICE_INTERFACE } from 'src/module.config';
import { ITransactionService } from 'src/services/transaction.service';

@Controller(CONTROLLER_CONSTANTS.TRANSACTION)
@ApiTags(CONTROLLER_CONSTANTS.TRANSACTION)
export class TransactionController {
  public readonly _logger = new Logger(TransactionController.name);

  constructor(
    @Inject(SERVICE_INTERFACE.ITRANSACTION_SERVICE)
    private transactionService: ITransactionService,
  ) {}

  @Post(URL_CONSTANTS.CREATE)
  @ApiOperation({ summary: 'Create multisig transaction' })
  @ApiBadRequestResponse({ description: 'Error: Bad Request', schema: {} })
  @HttpCode(HttpStatus.OK)
  async createTransaction(
    @Body() request: MODULE_REQUEST.CreateTransactionRequest,
  ) {
    this._logger.log('========== Create multisig transaction ==========');
    return await this.transactionService.createTransaction(request);
  }

  @Post(URL_CONSTANTS.CONFIRM_TRANSACTION)
  @ApiOperation({ summary: 'owner confirm their transaction' })
  async confirmTransaction(
    @Body() request: MODULE_REQUEST.ConfirmTransactionRequest,
  ) {
    return await this.transactionService.confirmTransaction(request);
  }

  @Post(URL_CONSTANTS.REJECT_TRANSACTION)
  @ApiOperation({ summary: 'owner reject their transaction' })
  async rejectTransaction(
    @Body() request: MODULE_REQUEST.RejectTransactionParam,
  ) {
    return await this.transactionService.rejectTransaction(request);
  }

  @Post(URL_CONSTANTS.GET_ALL_TXS)
  @ApiOperation({
    summary: 'Returns a paginated list of transactions for a Safe',
  })
  async getAllTxs(
    @Body() request: MODULE_REQUEST.GetAllTransactionsRequest,
  ) {
    this._logger.log('========== Get All Transactions ==========');
    return await this.transactionService.getTransactionHistory(request);
  }

  @Get(URL_CONSTANTS.SIGNATURES)
  @ApiOperation({
    summary: 'Get the list of signatures for a multisig transaction',
  })
  async getSignaturesOfMultisigTx(
    @Param() param: MODULE_REQUEST.GetMultisigSignaturesParam
  ) {
    this._logger.log('========== Get Signatures of Multisig Transaction ==========');
    return await this.transactionService.getListMultisigConfirmById(
      param,
    );
  }

  @Post(URL_CONSTANTS.SEND)
  @ApiOperation({ summary: 'Send transaction to AURA' })
  @ApiBadRequestResponse({ description: 'Error: Bad Request', schema: {} })
  @HttpCode(HttpStatus.OK)
  async sendTransaction(
    @Body() request: MODULE_REQUEST.SendTransactionRequest,
  ) {
    this._logger.log('========== Send transaction to AURA ==========');
    return await this.transactionService.sendTransaction(request);
  }

  @Get(URL_CONSTANTS.TRANSACTION_DETAILS)
  @ApiOperation({
    summary: 'Get details of a transaction',
  })
  async getTransactionDetails(
    @Param() param: MODULE_REQUEST.GetTransactionDetailsParam
  ) {
    this._logger.log('========== Get details of a Transaction ==========');
    return await this.transactionService.getTransactionDetails(
      param,
    );
  }
}
