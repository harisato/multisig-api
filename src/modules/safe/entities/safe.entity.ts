import { Column, Entity } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { BaseEntityAutoId } from '../../../common/entities';
import { SafeStatus } from '../../../common/constants/app.constant';
import { CommonUtil } from '../../../utils/common.util';

@Entity({ name: 'Safe' })
export class Safe extends BaseEntityAutoId {
  @Column({ name: 'SafeAddress', unique: true, nullable: true })
  safeAddress: string;

  @Column({ name: 'AccountNumber', unique: true, nullable: true })
  accountNumber: string;

  @Column('varchar', { name: 'SafePubkey', nullable: true, length: 800 })
  safePubkey: string;

  @Column({ name: 'CreatorAddress' })
  creatorAddress: string;

  @Column({ name: 'CreatorPubkey' })
  creatorPubkey: string;

  @Column({ name: 'Threshold' })
  threshold: number;

  @Column({ name: 'Status' })
  status: string;

  @Column({ name: 'Sequence', nullable: true })
  sequence: string;

  @Column({ name: 'NextQueueSeq', nullable: true })
  nextQueueSeq: string;

  @Column({ name: 'AddressHash' })
  addressHash: string;

  @Column({ name: 'InternalChainId' })
  internalChainId: number;

  @Column({ name: 'TxHistoryTag', nullable: true })
  txHistoryTag: string;

  @Column({ name: 'TxQueuedTag', nullable: true })
  txQueuedTag: string;

  /**
   * Build safe entity.
   * If safe does not have enough confirmation of owner, return pending status.
   * Else, generate address and return created status
   *
   * @param ownerPubKeys
   * @param totalOwners
   * @param threshold
   * @param prefix
   * @returns
   */
  static buildSafe(
    ownerPubKeys: string[],
    totalOwners: number,
    threshold: number,
    prefix: string,
  ): Safe {
    // if safe does not have enough confirmation of owner, return pending status
    if (ownerPubKeys.length !== totalOwners) {
      return plainToInstance(Safe, {
        threshold,
        status: SafeStatus.PENDING,
      });
    }

    // if safe has enough confirmation of owner, generate address and return created status
    const { address, pubkey } = CommonUtil.createSafeAddressAndPubkey(
      ownerPubKeys,
      threshold,
      prefix,
    );
    return plainToInstance(Safe, {
      safeAddress: address,
      safePubkey: pubkey,
      threshold,
      status: SafeStatus.CREATED,
    });
  }

  setAddressAndPubkey(ownerPubKeys: string[], prefix: string): void {
    const { address, pubkey } = CommonUtil.createSafeAddressAndPubkey(
      ownerPubKeys,
      this.threshold,
      prefix,
    );

    this.safeAddress = address;
    this.safePubkey = pubkey;
  }
}
