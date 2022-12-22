import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { IsNumber, IsString } from 'class-validator';
import { CommonUtil } from 'src/utils/common.util';

export class TxMessageResponse {
  @Expose()
  @IsString()
  @ApiProperty({
    example: '/cosmos.staking.v1beta1.MsgDelegate',
  })
  typeUrl: string;

  @Expose()
  @IsString()
  @ApiProperty({
    example: 'aura1522aavcagyrahayuspe47ndje7s694dkzcup6x',
  })
  fromAddress: string;

  @Expose()
  @IsString()
  @ApiProperty({
    example: 'aura1522aavcagyrahayuspe47ndje7s694dkzcup6x',
  })
  toAddress: string;

  @Expose()
  @IsString()
  @ApiProperty({
    example: 'aura1522aavcagyrahayuspe47ndje7s694dkzcup6x',
  })
  amount: string;

  @Expose()
  @IsString()
  @ApiProperty({
    example: 'aura1522aavcagyrahayuspe47ndje7s694dkzcup6x',
  })
  delegatorAddress: string;

  @Expose()
  @IsString()
  @ApiProperty({
    example: 'aura1522aavcagyrahayuspe47ndje7s694dkzcup6x',
  })
  validatorAddress: string;

  @Expose()
  @IsString()
  @ApiProperty({
    example: 'aura1522aavcagyrahayuspe47ndje7s694dkzcup6x',
  })
  validatorSrcAddress: string;

  @Expose()
  @IsString()
  @ApiProperty({
    example: 'aura1522aavcagyrahayuspe47ndje7s694dkzcup6x',
  })
  validatorDstAddress: string;

  @Expose()
  @IsNumber()
  @Type(() => Number)
  @ApiProperty({ example: 1 })
  voteOption: number;

  @Expose()
  @IsNumber()
  @Type(() => Number)
  @ApiProperty({ example: 140 })
  proposalId: number;

  @Expose()
  @IsString()
  @ApiProperty({ example: 'aura1uyzpt9r0lmxwrrd73swnlxtqa8dj4jjy4qe2gy' })
  voter: string;

  @Expose()
  @ApiProperty({
    example: [
      {
        address: 'aura1qc4y4awjmx9zjzqapucr66tdzf34zq0uxjraf7',
        coins: [
          {
            denom: 'utaura',
            amount: '50000',
          },
        ],
      },
    ],
  })
  @Transform(CommonUtil.parseJson, { toClassOnly: true })
  inputs: any;

  @Expose()
  @ApiProperty({ example: '' })
  @Transform(CommonUtil.parseJson, { toClassOnly: true })
  outputs: string;
}
