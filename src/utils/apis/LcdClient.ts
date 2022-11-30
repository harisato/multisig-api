import { SimulateResponse } from 'src/dtos/responses/simulate';
import { ConfigService } from 'src/shared/services/config.service';
import { CommonUtil } from '../common.util';

export class LcdClient {
  private configService: ConfigService = new ConfigService();
  lcdUrl: string;
  request = CommonUtil.requestAPI;

  constructor(lcdUrl?: string) {
    this.lcdUrl = lcdUrl || this.configService.get('LCD_URL');
  }

  async simulate(txBytesBase64: string): Promise<SimulateResponse> {
    const url = new URL(`cosmos/tx/v1beta1/simulate`, this.lcdUrl);
    const simulateRes = await this.request(url.href, 'POST', {
      tx_bytes: txBytesBase64,
    });
    return {
      gasUsed: simulateRes.gas_info?.gas_used || 0,
    };
  }
}
