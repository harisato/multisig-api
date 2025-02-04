import { Column, Entity } from 'typeorm';
import { BaseEntityAutoId } from '../../../common/entities';

@Entity({ name: 'Gas' })
export class Gas extends BaseEntityAutoId {
  @Column({ name: 'TypeUrl' })
  typeUrl: string;

  @Column({ name: 'GasAmount' })
  gasAmount: number;

  @Column({ name: 'ChainId' })
  chainId: string;

  @Column({ name: 'Multiplier' })
  multiplier: number;
}
