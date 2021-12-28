import { ApiProperty } from '@nestjs/swagger';

export class SingleSignTransactionRequest {
  @ApiProperty()
  multisigAddress: string;

  @ApiProperty()
  mnemonic: string;

  @ApiProperty()
  transactionId: string;
}