import { Injectable, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ResponseDto } from '../../common/dtos/response.dto';
import { ErrorMap } from '../../common/error.map';
import { CommonUtil } from '../../utils/common.util';
import { ProposalStatus } from '../../common/constants/app.constant';
import { ChainRepository } from '../chain/chain.repository';
import {
  GetProposalByIdDto,
  GetProposalDepositsDto,
  GetProposalsParamDto,
  GetProposalsResponseDto,
  GetProposalsTally,
  GetProposalsTurnout,
  GetValidatorVotesByProposalIdResponseDto,
  GetValidatorVotesDto,
  GetVotesByProposalIdParamDto,
  GetVotesByProposalIdQueryDto,
  GetVotesByProposalIdResponseDto,
  ProposalDepositResponseDto,
  ProposalDetailDto,
} from './dto';
import { Chain } from '../chain/entities/chain.entity';
import { IndexerClient } from '../../shared/services/indexer.service';
import { IProposal, ITransaction } from '../../interfaces';

@Injectable()
export class GovService {
  private readonly logger = new Logger(GovService.name);

  private commonUtil: CommonUtil = new CommonUtil();

  auraChain: Chain;

  constructor(
    private chainRepo: ChainRepository,
    private indexer: IndexerClient,
  ) {
    this.logger.log('============== Constructor Gov Service ==============');
  }

  async getProposals(
    param: GetProposalsParamDto,
  ): Promise<ResponseDto<GetProposalsResponseDto>> {
    const { internalChainId } = param;
    try {
      const chain = await this.chainRepo.findChain(internalChainId);
      const result = await this.indexer.getProposals(chain.chainId);

      const proposals = result.map((proposal) => this.mapProposal(proposal));

      return ResponseDto.response(
        ErrorMap.SUCCESSFUL,
        plainToInstance(GetProposalsResponseDto, {
          proposals,
        }),
      );
    } catch (error) {
      return ResponseDto.responseError(GovService.name, error);
    }
  }

  async getProposalById(
    param: GetProposalByIdDto,
  ): Promise<ResponseDto<ProposalDetailDto>> {
    const { internalChainId, proposalId } = param;
    try {
      const chain = await this.chainRepo.findChain(internalChainId);
      const proposal = await this.indexer.getProposal(
        chain.chainId,
        proposalId,
      );

      // add additional properties for proposal details page
      const networkStatus = await this.indexer.getNetwork(chain.chainId);
      const bondedTokens = networkStatus.pool.bonded_tokens;

      const result = {
        id: proposal.proposal_id,
        title: proposal.content.title,
        proposer: proposal.proposer_address,
        status: proposal.status,
        votingStart: proposal.voting_start_time,
        votingEnd: proposal.voting_end_time,
        submitTime: proposal.submit_time,
        totalDeposit: proposal.total_deposit,
        tally: this.calculateProposalTally(proposal),
        description: proposal.content.description,
        type: proposal.content['@type'],
        depositEndTime: proposal.deposit_end_time,
        turnout: this.calculateProposalTurnout(proposal, bondedTokens),
      };

      return ResponseDto.response(
        ErrorMap.SUCCESSFUL,
        plainToInstance(ProposalDetailDto, result),
      );
    } catch (error) {
      return ResponseDto.responseError(GovService.name, error);
    }
  }

  async getVotesByProposalId(
    param: GetVotesByProposalIdParamDto,
    query: GetVotesByProposalIdQueryDto,
  ): Promise<ResponseDto<GetVotesByProposalIdResponseDto>> {
    const { internalChainId, proposalId } = param;
    const {
      answer,
      nextKey,
      pageOffset = 0,
      pageLimit = 45,
      reverse = false,
    } = query;
    try {
      const chain = await this.chainRepo.findChain(internalChainId);
      const { votes, nextKey: newNextKey } =
        await this.indexer.getVotesByProposalId(
          chain.chainId,
          proposalId,
          answer,
          nextKey,
          pageOffset,
          pageLimit,
          reverse,
        );
      const results: GetVotesByProposalIdResponseDto = {
        votes: votes.map((vote) => ({
          voter: vote.voter_address,
          txHash: vote.txhash,
          answer: vote.answer,
          time: vote.timestamp,
        })),
        nextKey: newNextKey,
      };
      return ResponseDto.response(ErrorMap.SUCCESSFUL, results);
    } catch (error) {
      return ResponseDto.responseError(GovService.name, error);
    }
  }

  async getValidatorVotesByProposalId(
    param: GetValidatorVotesDto,
  ): Promise<ResponseDto<GetValidatorVotesByProposalIdResponseDto>> {
    const { internalChainId, proposalId } = param;
    try {
      const chain = await this.chainRepo.findChain(internalChainId);

      /** Example data
       * {
          "rank": "1",
          "percent_voting_power": 2.771891,
          "validator_address": "aura1etx55kw7tkmnjqz0k0mups4ewxlr324twrzdul",
          "operator_address": "auravaloper1etx55kw7tkmnjqz0k0mups4ewxlr324t43n9yp",
          "validator_identity": "94EFE192B2C52424",
          "validator_name": "NodeStake",
          "answer": "VOTE_OPTION_YES",
          "tx_hash": "F41AAA9488DFC7DDD7A19956C072123699DD74C2BECE28A8193517FE492C7646",
          "timestamp": "2022-09-07T12:06:49.000Z"
        },
       */
      const validatorVotes = await this.indexer.getValidatorVotesByProposalId(
        chain.chainId,
        proposalId,
      );

      return ResponseDto.response(
        ErrorMap.SUCCESSFUL,
        plainToInstance(
          GetValidatorVotesByProposalIdResponseDto,
          validatorVotes,
        ),
      );
    } catch (error) {
      return ResponseDto.responseError(GovService.name, error);
    }
  }

  async getProposalDepositById(
    param: GetProposalDepositsDto,
  ): Promise<ResponseDto<ProposalDepositResponseDto[]>> {
    const { internalChainId, proposalId } = param;
    try {
      const chain = await this.chainRepo.findChain(internalChainId);

      // Get proposal deposit txs
      const proposalDepositTxs: ITransaction[] =
        await this.indexer.getProposalDepositByProposalId(
          chain.chainId,
          proposalId,
        );
      const response: ProposalDepositResponseDto[] = proposalDepositTxs.map(
        (tx) => {
          const proposalDepositEvent = tx.tx_response.logs[0].events.find(
            (x) => x.type === 'proposal_deposit',
          );

          const proposalDepositResponse: ProposalDepositResponseDto = {
            proposal_id: Number(
              proposalDepositEvent?.attributes.find(
                (x) => x.key === 'proposal_id',
              )?.value,
            ),
            depositor: tx.tx_response.tx.body.messages[0].proposer,
            tx_hash: tx.tx_response.txhash,
            amount: Number(
              tx.tx_response.tx.body.messages[0].initial_deposit[0]?.amount ||
                tx.tx_response.tx.body.messages[0].amount[0]?.amount ||
                0,
            ),

            timestamp: tx.tx_response.timestamp,
          };
          return proposalDepositResponse;
        },
      );

      return ResponseDto.response(ErrorMap.SUCCESSFUL, response);
    } catch (error) {
      return ResponseDto.responseError(GovService.name, error);
    }
  }

  mapProposal(proposal: IProposal): ProposalDetailDto {
    const result: ProposalDetailDto = {
      id: proposal.proposal_id,
      title: proposal.content.title,
      proposer: proposal.proposer_address,
      status: proposal.status,
      votingStart: proposal.voting_start_time,
      votingEnd: proposal.voting_end_time,
      submitTime: proposal.submit_time,
      totalDeposit: proposal.total_deposit,
      tally: this.calculateProposalTally(proposal),
    };
    return result;
  }

  calculateProposalTally(proposal: IProposal): GetProposalsTally {
    // default to final result of tally property
    let tally = proposal.final_tally_result;
    if (proposal.status === ProposalStatus.VOTING_PERIOD) {
      tally = proposal.tally;
    }
    // default mostVoted to yes
    let mostVotedOptionKey = Object.keys(tally)[0];
    // calculate sum to determine percentage
    let sum = 0;
    for (const key in tally) {
      if (Object.prototype.hasOwnProperty.call(tally, key)) {
        if (+tally[key] > +tally[mostVotedOptionKey]) {
          mostVotedOptionKey = key;
        }
        sum += +tally[key];
      }
    }

    const result: GetProposalsTally = {
      yes: {
        number: tally.yes,
        percent: this.getPercentage(tally.yes, sum),
      },
      abstain: {
        number: tally.abstain,
        percent: this.getPercentage(tally.abstain, sum),
      },
      no: {
        number: tally.no,
        percent: this.getPercentage(tally.no, sum),
      },
      noWithVeto: {
        number: tally.no_with_veto,
        percent: this.getPercentage(tally.no_with_veto, sum),
      },
      mostVotedOn: {
        name: mostVotedOptionKey,
        percent: this.getPercentage(tally[mostVotedOptionKey] as string, sum),
      },
    };
    return result;
  }

  calculateProposalTurnout(proposal: IProposal, bondedTokens: string) {
    // default to final result of tally property
    let tally = proposal.final_tally_result;
    if (proposal.status === ProposalStatus.VOTING_PERIOD) {
      tally = proposal.tally;
    }
    const numberOfVoted = +tally.yes + +tally.no + +tally.no_with_veto;
    const numberOfNotVoted = +bondedTokens - numberOfVoted - +tally.abstain;
    const result: GetProposalsTurnout = {
      voted: {
        number: numberOfVoted.toString(),
        percent: this.getPercentage(numberOfVoted, bondedTokens),
      },
      votedAbstain: {
        number: tally.abstain,
        percent: this.getPercentage(tally.abstain, bondedTokens),
      },
      didNotVote: {
        number: numberOfNotVoted.toString(),
        percent: this.getPercentage(numberOfNotVoted, bondedTokens),
      },
    };
    return result;
  }

  getPercentage(value: number | string, total: number | string): string {
    const convertedValue = Number(value);
    const convertedTotal = Number(total);
    if (convertedValue === 0) {
      return '0';
    }
    return ((+convertedValue * 100) / convertedTotal).toFixed(2);
  }
}
