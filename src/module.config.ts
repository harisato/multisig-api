import { CreateMultisigWalletRequest } from './dtos/requests/multisig-wallet/create-multisig-wallet.request';
import { SimulatingMultisigRequest } from './dtos/requests/simulating/simulating-multisig.request';
import { BroadcastTransactionRequest } from './dtos/requests/transaction/broadcast-transaction.request';
import { CreateTransactionRequest } from './dtos/requests/transaction/create-transaction.request';
import { SingleSignTransactionRequest } from './dtos/requests/transaction/single-sign-transaction.request';
import { Safe } from './entities/safe.entity';

export const ENTITIES_CONFIG = {
  SAFE: Safe,
};

export const REQUEST_CONFIG = {
  SIMULATING_MULTISIG_REQUEST: SimulatingMultisigRequest,
  CREATE_MULTISIG_WALLET_REQUEST: CreateMultisigWalletRequest,
  CREATE_TRANSACTION_REQUEST: CreateTransactionRequest,
  SINGLE_SIGN_TRANSACTION_REQUEST: SingleSignTransactionRequest,
  BROADCAST_TRANSACTION_REQUEST: BroadcastTransactionRequest,
};

export module MODULE_REQUEST {
  export abstract class SimulatingMultisigRequest extends REQUEST_CONFIG.SIMULATING_MULTISIG_REQUEST {}
  export abstract class CreateMultisigWalletRequest extends REQUEST_CONFIG.CREATE_MULTISIG_WALLET_REQUEST {}
  export abstract class CreateTransactionRequest extends REQUEST_CONFIG.CREATE_TRANSACTION_REQUEST {}
  export abstract class SingleSignTransactionRequest extends REQUEST_CONFIG.SINGLE_SIGN_TRANSACTION_REQUEST {}
  export abstract class BroadcastTransactionRequest extends REQUEST_CONFIG.BROADCAST_TRANSACTION_REQUEST {}
}

export const SERVICE_INTERFACE = {
  ISIMULATING_SERVICE: 'ISimulatingService',
  IMULTISIG_WALLET_SERVICE: 'IMultisigWalletService',
  ITRANSACTION_SERVICE: 'ITransactionService',
};

export const REPOSITORY_INTERFACE = {
  IMULTISIG_WALLET_REPOSITORY: 'IMultisigWalletRepository',
};

export const PROVIDER_INTERFACE = {};
