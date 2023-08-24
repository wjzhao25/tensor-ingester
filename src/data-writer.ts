import {ConfirmedSignatureInfo} from '@solana/web3.js';

export abstract class DataWriter{

  abstract writeToFile(
    filename: string,
    sigs: ConfirmedSignatureInfo[],
    sigWriteSize: number,
    append: boolean,
    checkpoint: boolean,
  ): boolean

  abstract readNthLastSig(
    filename: string,
    n?: number,
  ): string | undefined 

  abstract writeTxnLog(
    filename: string,
    bytes: number
  ): void 

  abstract readTxnLog(
    filename: string
  ): number | undefined 

  abstract truncate(
    filename: string,
    targetSize : number,
  ): void

}

