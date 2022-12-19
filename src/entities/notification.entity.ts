import { plainToInstance } from 'class-transformer';
import {
  NotificationEventType,
  NotificationStatus,
} from 'src/common/constants/app.constant';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntityAutoId } from './base/base.entity';

@Entity({ name: 'Notification' })
export class Notification extends BaseEntityAutoId {
  @Column({ name: 'UserId' })
  @Index()
  userId: number;

  @Column({ name: 'EventType', enum: NotificationEventType })
  eventType: string;

  @Column({ name: 'SafeId', nullable: true })
  safeId: number;

  @Column({ name: 'SafeCreatorAddress', nullable: true })
  safeCreatorAddress: string;

  @Column({ name: 'SafeAddress', nullable: true })
  safeAddress: string;

  @Column({ name: 'TotalOwner', nullable: true })
  totalOwner: number;

  @Column({ name: 'TxId', nullable: true })
  txId: number;

  @Column({ name: 'TxCreatorAddress', nullable: true })
  txCreatorAddress: string;

  @Column({ name: 'TxSequence', nullable: true })
  sequence: number;

  @Column({ name: 'ProposalNumber', nullable: true })
  proposalNumber: number;

  @Column({ name: 'ProposalName', nullable: true })
  proposalName: string;

  @Column({ name: 'ProposalEndDate', nullable: true })
  proposalEndDate: Date;

  @Column({ name: 'Status', enum: NotificationStatus })
  status: string;

  static newWaitAllowSafeNotification(
    userId: number,
    safeId: number,
    safeCreatorAddress: string,
    totalOwner: number,
  ): Notification {
    return plainToInstance(Notification, {
      userId,
      eventType: NotificationEventType.WAIT_ALLOW_SAFE,
      safeId,
      safeCreatorAddress,
      totalOwner,
      status: NotificationStatus.UNREAD,
    });
  }

  static newSafeCreatedNotification(
    userId: number,
    safeId: number,
    safeAddress: string,
  ): Notification {
    return plainToInstance(Notification, {
      eventType: NotificationEventType.SAFE_CREATED,
      status: NotificationStatus.UNREAD,
      userId,
      safeId,
      safeAddress,
    });
  }
}
