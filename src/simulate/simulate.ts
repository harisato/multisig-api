import { makeCosmoshubPath, Secp256k1HdWallet } from '@cosmjs/amino';
import { fromBase64, toBase64 } from '@cosmjs/encoding';
import { SafeSimulate } from './safe.simulate';
import { OwnerSimulate } from './owner.simulate';
import { SimulateUtils } from './utils';
import { LcdClient } from 'src/utils/apis/LcdClient';
import { SimulateResponse } from 'src/dtos/responses/simulate';

export class Simulate {
  safeOwnerMap = new Map<number, SafeSimulate>();
  ownerWallets: OwnerSimulate[] = [];

  constructor(mnemonic: string, public prefix: string) {
    this.initialize(mnemonic);
  }

  /**
   * init system safes for simulate tx
   * @param mnemonic
   */
  async initialize(mnemonic: string): Promise<void> {
    // generate owners
    for (let i = 0; i < 20; i += 1) {
      // create wallet
      const wallet = await Secp256k1HdWallet.fromMnemonic(mnemonic, {
        hdPaths: [makeCosmoshubPath(i)],
        prefix: this.prefix,
      });

      // create account
      const accounts = await wallet.getAccounts();

      // create owner
      const ownerWallet = new OwnerSimulate(wallet, accounts[0], this.prefix);
      this.ownerWallets.push(ownerWallet);
    }

    // create safe with owner from 1 -> 20
    for (let i = 1; i <= 20; i += 1) {
      const safe = new SafeSimulate(
        this.ownerWallets.slice(0, i),
        i,
        this.prefix,
      );

      // save to map
      this.safeOwnerMap.set(i, safe);
    }
  }

  /**
   *
   * @param messages
   * @param totalOwner
   */
  async simulate(
    messages: any[],
    totalOwner: number,
  ): Promise<SimulateResponse> {
    // get safe from map
    const safe = this.safeOwnerMap.get(totalOwner);
    if (!safe) {
      throw new Error('safe not found');
    }

    // initialize system safe to generate auth info, signature
    await safe.initialize();

    // build bodyByte
    const bodyBytes = SimulateUtils.makeBodyBytes(messages);

    // build txBytes
    const txBytes = SimulateUtils.makeTxBytes(
      bodyBytes,
      fromBase64(safe.authInfo),
      fromBase64(safe.signature),
    );

    // call simulate api
    const lcdClient = new LcdClient('https://lcd.dev.aura.network/');
    const result = await lcdClient.simulate(toBase64(txBytes));
    console.log(result);
    return result;
  }

  /**
   * getAddresses
   * @returns
   */
  getAddresses(): string[] {
    return Array.from(this.safeOwnerMap.values()).map((safe) => safe.address);
  }

  /**
   * getAllOwnerAddresses
   * @returns
   */
  getAllOwnerAddresses(): string[] {
    return this.ownerWallets.map((owner) => owner.address);
  }
}
